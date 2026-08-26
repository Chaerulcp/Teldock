import { useState, useEffect } from 'react';
import { UploadCloud, FileText, Image as ImageIcon, Video, Music, Download, Share2, MoreHorizontal, Folder, Lock } from 'lucide-react';
import { fileApi } from '../services/api';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

function Dashboard() {
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [encryptUploads, setEncryptUploads] = useState(false);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      const response = await fileApi.list({ limit: 100 });
      setFiles(response.data.data.files || []);
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file) => {
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('description', `Uploaded ${file.name}`);
    if (encryptUploads) formData.append('encrypt', 'true');

    try {
      await fileApi.upload(formData, (evt) => {
        if (evt.total) {
          setUploadProgress(Math.round((evt.loaded / evt.total) * 100));
        }
      });
      toast.success(`File "${file.name}" uploaded successfully!`);
      loadFiles();
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error(error.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      await fileApi.delete(id);
      toast.success('File deleted successfully');
      loadFiles();
    } catch (error) {
      toast.error('Failed to delete file');
    }
  };

  const handleShare = async (id, name) => {
    try {
      const response = await fileApi.share(id, { expiresIn: 86400, downloadLimit: 5 });
      const shortUrl = response.data.data.link.shortUrl;
      
      navigator.clipboard.writeText(shortUrl);
      toast.success('Link copied to clipboard!');
    } catch (error) {
      toast.error('Failed to create share link');
    }
  };

  const getFileIcon = (mimeType) => {
    if (mimeType.startsWith('image/')) return <ImageIcon className="w-6 h-6 text-green-500" />;
    if (mimeType.startsWith('video/')) return <Video className="w-6 h-6 text-purple-500" />;
    if (mimeType.startsWith('audio/')) return <Music className="w-6 h-6 text-yellow-500" />;
    return <FileText className="w-6 h-6 text-blue-500" />;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleUpload(e.target.files[0]);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
          dragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 bg-white hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          onChange={handleChange}
        />
        
        <div className="space-y-4">
          <UploadCloud className="mx-auto w-16 h-16 text-gray-400" />
          <p className="text-lg font-medium text-gray-900">
            Drag & drop files here or <label htmlFor="file-upload" className="text-primary-600 cursor-pointer hover:text-primary-500">browse</label>
          </p>
          <p className="text-sm text-gray-500">Large files are automatically split into parts — no 50MB limit</p>

          <label className="inline-flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={encryptUploads}
              onChange={(e) => setEncryptUploads(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <Lock className="w-4 h-4" />
            Encrypt this upload (AES-256)
          </label>

          {uploading && (
            <div className="mt-4 p-3 bg-primary-50 rounded-lg">
              <div className="w-full bg-primary-100 rounded-full h-2 overflow-hidden">
                <div
                  className="h-2 bg-primary-600 transition-all"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-primary-700 mt-2">Uploading… {uploadProgress}%</p>
            </div>
          )}
        </div>
      </div>

      {/* Files List */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Your Files</h3>
          <p className="text-sm text-gray-500">{files.length} files stored in Telegram Cloud</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : files.length === 0 ? (
          <div className="py-12 text-center">
            <Folder className="mx-auto w-12 h-12 text-gray-400 mb-4" />
            <p className="text-gray-500">No files yet. Upload your first file!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {files.map((file) => (
                  <tr key={file.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getFileIcon(file.mimeType)}
                        <span className="ml-3 text-sm font-medium text-gray-900 truncate max-w-md">{file.displayFilename}</span>
                        {file.isEncrypted && (
                          <Lock className="ml-2 w-3.5 h-3.5 text-gray-400" title="Encrypted" />
                        )}
                        {file.isChunked && (
                          <span className="ml-2 px-1.5 py-0.5 text-[10px] font-semibold text-primary-700 bg-primary-100 rounded" title={`${file.partCount} parts`}>
                            {file.partCount}×
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatFileSize(file.fileSize)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {file.mimeType.split('/')[1]?.toUpperCase() || 'FILE'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(file.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => window.open(fileApi.download(file.id), '_blank')}
                          className="text-primary-600 hover:text-primary-900 p-2 hover:bg-primary-50 rounded"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleShare(file.id, file.displayFilename)}
                          className="text-green-600 hover:text-green-900 p-2 hover:bg-green-50 rounded"
                          title="Share"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(file.id)}
                          className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <MoreHorizontal className="w-4 h-4 rotate-90" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
