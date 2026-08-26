import { useState, useEffect } from 'react';
import { Clock, Download, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-toastify';

function VersionHistory({ fileId, onVersionChanged }) {
  const [versions, setVersions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState(null);

  useEffect(() => {
    loadVersions();
  }, [fileId]);

  const loadVersions = async () => {
    try {
      const response = await fetch(`/api/files/${fileId}/versions`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setVersions(data.versions || []);
      }
    } catch (error) {
      console.error('Failed to load versions:', error);
      toast.error('Failed to load version history');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevert = (version) => {
    setSelectedVersion(version);
    setShowModal(true);
  };

  const confirmRevert = async () => {
    try {
      const response = await fetch(`/api/files/${fileId}/revert/${selectedVersion.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (response.ok) {
        toast.success('File reverted successfully!');
        setShowModal(false);
        loadVersions();
        
        if (onVersionChanged) {
          onVersionChanged();
        }
      } else {
        toast.error('Failed to revert file');
      }
    } catch (error) {
      toast.error('Error reverting file');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="version-history">
      <button
        onClick={() => setShowModal(!showModal)}
        className="flex items-center text-sm font-medium text-gray-700 hover:text-primary-600"
      >
        <Clock className="w-4 h-4 mr-1" />
        Versions ({versions.length})
      </button>

      {versions.length > 0 && (
        <div className="bg-white border rounded-lg mt-2 p-4 shadow-sm max-h-64 overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Version</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {versions.map((version) => (
                <tr key={version.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-sm font-semibold text-gray-900">
                    v{version.versionNumber}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-500">
                    {formatFileSize(version.fileSize)}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-500">
                    {new Date(version.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2 text-sm text-right">
                    <button
                      onClick={() => handleRevert(version)}
                      className="text-blue-600 hover:text-blue-800 font-medium ml-2"
                      title="Restore this version"
                    >
                      Restore
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirmation Modal */}
      {showModal && selectedVersion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <div className="flex items-center mb-4">
              <AlertCircle className="w-6 h-6 text-yellow-500 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Restore File Version?</h3>
            </div>
            
            <p className="text-gray-600 mb-4">
              You're about to restore this file to version{' '}
              <strong>v{selectedVersion.versionNumber}</strong> from{' '}
              {new Date(selectedVersion.createdAt).toLocaleString()}.
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
              <p className="text-sm text-blue-800">
                ⚠️ This will overwrite the current file version. The current version will be saved as a new history entry.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={confirmRevert}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Restore Version
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VersionHistory;
