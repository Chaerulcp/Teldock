import { useState, useEffect, useCallback } from 'react';
import { 
  ChevronRight, Folder, FileText, Image as ImageIcon, Video, Music, UploadCloud, Plus, Search, MoreVertical, ArrowLeft, Star, Trash2, Move, Tag, Clock, Grid, List, Menu, X, Download, Share2, Settings, Home 
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuthStore } from '../store/auth-store';
import { fileApi, folderApi } from '../services/api';

function MobileDashboard() {
  const user = useAuthStore((state) => state.user);
  const [activeTab, setActiveTab] = useState('home');
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  const loadContent = useCallback(async () => {
    setIsLoading(true);
    try {
      if (searchQuery.trim()) {
        const res = await fileApi.search(searchQuery, { limit: 50 });
        setFiles(res.data.data.files || []);
        setFolders([]);
        return;
      }

      const parentId = selectedFolder?.id ?? null;
      const [filesRes, foldersRes] = await Promise.all([
        fileApi.list({ limit: 100, folderId: parentId || undefined }),
        folderApi.list(parentId),
      ]);
      setFiles(filesRes.data.data.files || []);
      setFolders(foldersRes.data.data.folders || []);
    } catch (error) {
      console.error('Failed to load content:', error);
      toast.error('Failed to load files');
    } finally {
      setIsLoading(false);
    }
  }, [selectedFolder, searchQuery]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  const deleteFile = async (fileId) => {
    try {
      await fileApi.delete(fileId);
      toast.success('File deleted successfully');
      loadContent();
    } catch (error) {
      toast.error('Failed to delete file');
    }
  };

  const getFileIcon = (mimeType) => {
    if (mimeType.startsWith('image/')) return <ImageIcon className="w-6 h-6 text-green-500" />;
    if (mimeType.startsWith('video/')) return <Video className="w-6 h-6 text-purple-500" />;
    if (mimeType.startsWith('audio/')) return <Music className="w-6 h-6 text-yellow-500" />;
    return <FileText className="w-6 h-6 text-blue-500" />;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const navigateToFolder = (folder) => {
    setSelectedFolder(folder);
    setActiveTab('browse');
  };

  const goBackToRoot = () => {
    setSelectedFolder(null);
    setActiveTab('home');
  };

  return (
    <div className="min-h-[100dvh] bg-ink-50 dark:bg-ink-950 pb-20 md:pb-0">
      {/* Header */}
      <header className="bg-white dark:bg-ink-900 border-b border-ink-200/70 dark:border-ink-800/70 sticky top-0 z-20">
        <div className="px-4 py-3 flex items-center justify-between">
          <button 
            onClick={() => setShowSidebar(true)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex-1 px-2">
            {selectedFolder ? (
              <button 
                onClick={goBackToRoot}
                className="flex items-center text-gray-700 hover:text-primary-600"
              >
                <ArrowLeft className="w-5 h-5 mr-1" />
                <span className="text-sm font-medium truncate">{selectedFolder.name}</span>
              </button>
            ) : (
              <h1 className="text-lg font-bold text-gray-900">Cloud Storage</h1>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <Search className="w-5 h-5" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar (on mobile) */}
        <div className="px-4 pb-3">
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <>
            {/* Folders Section */}
            {folders.length > 0 && (
              <section className="mb-6">
                <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Folders</h2>
                <div className={`space-y-2 ${viewMode === 'grid' ? '' : ''}`}>
                  {folders.map((folder) => (
                    <div
                      key={folder.id}
                      onClick={() => navigateToFolder(folder)}
                      onPointerDown={() => {}} // Prepare for long press
                      className="flex items-center p-3 bg-white border border-gray-200 rounded-lg active:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <Folder className="w-8 h-8 text-yellow-500 mr-3 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{folder.name}</p>
                        <p className="text-xs text-gray-500">{folder.createdAt ? new Date(folder.createdAt).toLocaleDateString() : ''}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Files Section */}
            <section>
              <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Files ({files.length})</h2>
              <div className={`space-y-2 ${viewMode === 'grid' ? 'grid grid-cols-2 gap-3' : ''}`}>
                {files.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="mx-auto w-12 h-12 text-gray-300 mb-2" />
                    <p>No files in this folder</p>
                  </div>
                ) : (
                  files.map((file) => (
                    <div
                      key={file.id}
                      className="bg-white border border-gray-200 rounded-lg overflow-hidden"
                    >
                      <div className={`p-3 ${viewMode === 'list' ? 'flex items-center space-x-3' : ''}`}>
                        <div className={`${viewMode === 'list' ? 'flex-shrink-0' : 'w-full aspect-square'} bg-gray-100 flex items-center justify-center`}>
                          {getFileIcon(file.mimeType)}
                        </div>
                        {viewMode === 'list' && (
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{file.displayFilename}</p>
                            <p className="text-xs text-gray-500">{formatFileSize(file.fileSize)}</p>
                          </div>
                        )}
                      </div>
                      <div className="px-3 py-2 bg-gray-50 flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {file.createdAt ? new Date(file.createdAt).toLocaleDateString() : ''}
                        </span>
                        <button 
                          className="p-1 hover:bg-gray-200 rounded"
                          onClick={() => window.open(fileApi.download(file.id), '_blank')}
                        >
                          <Download className="w-4 h-4 text-primary-600" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t md:hidden z-10">
        <div className="flex justify-around py-3">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center ${activeTab === 'home' ? 'text-primary-600' : 'text-gray-500'}`}
          >
            <Home className="w-6 h-6" />
            <span className="text-xs mt-1">Home</span>
          </button>
          
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex flex-col items-center ${activeTab === 'upload' ? 'text-primary-600' : 'text-gray-500'}`}
          >
            <UploadCloud className="w-6 h-6" />
            <span className="text-xs mt-1">Upload</span>
          </button>
          
          <button
            onClick={() => setActiveTab('browse')}
            className={`flex flex-col items-center ${activeTab === 'browse' ? 'text-primary-600' : 'text-gray-500'}`}
          >
            <Folder className="w-6 h-6" />
            <span className="text-xs mt-1">Browse</span>
          </button>
          
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center ${activeTab === 'profile' ? 'text-primary-600' : 'text-gray-500'}`}
          >
            <Settings className="w-6 h-6" />
            <span className="text-xs mt-1">Profile</span>
          </button>
        </div>
      </nav>

      {/* Sidebar Overlay */}
      {showSidebar && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-30"
            onClick={() => setShowSidebar(false)}
          />
          <div className="fixed left-0 top-0 h-full w-80 bg-white z-40 shadow-xl transform transition-transform">
            <div className="p-4 border-b">
              <h2 className="text-xl font-bold text-gray-900">Menu</h2>
            </div>
            
            <div className="p-4 space-y-2">
              {[
                { name: 'My Files', icon: <Folder />, action: () => setActiveTab('browse'), badge: files.length },
                { name: 'Recent', icon: <Clock />, action: () => {} },
                { name: 'Favorites', icon: <Star />, action: () => {} },
                { name: 'Shared', icon: <Share2 />, action: () => {} },
                { name: 'Trash', icon: <Trash2 />, action: () => {} }
              ].map((item) => (
                <button
                  key={item.name}
                  onClick={item.action}
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-100 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-gray-600">{item.icon}</div>
                    <span className="font-medium">{item.name}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className="bg-primary-600 text-white text-xs px-2 py-1 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
              
              <hr className="my-4" />
              
              <button className="w-full flex items-center space-x-3 p-3 hover:bg-gray-100 rounded-lg">
                <Settings className="w-5 h-5 text-gray-600" />
                <span className="font-medium">Settings</span>
              </button>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
              <div className="text-xs text-gray-500">
                Storage used: {((user?.storageUsedBytes || 0) / 1024 / 1024).toFixed(0)} MB
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default MobileDashboard;
