import { useState, useEffect, useCallback } from 'react';
import { 
  ChevronRight, Folder, FileText, Image as ImageIcon, Video, Music, UploadCloud, Plus, Search, MoreVertical, ArrowLeft, Star, Trash2, Move, Tag, Clock, Grid, List, Menu, X, Download, Share2, Settings, Home 
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuthStore } from '../store/auth-store';
import { fileApi } from '../services/api';

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

  useEffect(() => {
    loadContent();
  }, [selectedFolder]);

  const loadContent = async () => {
    setIsLoading(true);
    
    try {
      if (selectedFolder) {
        const response = await fetch(`/api/files?folderId=${selectedFolder.id}&limit=100`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          setFiles(data.data.files || []);
          
          const foldersResponse = await fetch(`/api/folders?parentFolderId=${selectedFolder.id}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
          });
          
          if (foldersResponse.ok) {
            const folderData = await foldersResponse.json();
            setFolders(folderData.data.folders || []);
          }
        }
      } else {
        // Load all files and folders at root
        const filesRes = await fetch('/api/files?limit=100', {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
        });
        
        if (filesRes.ok) {
          const data = await filesRes.json();
          setFiles(data.data.files || []);
        }

        const foldersRes = await fetch('/api/folders?parentFolderId=null', {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
        });
        
        if (foldersRes.ok) {
          const folderData = await foldersRes.json();
          setFolders(folderData.data.folders || []);
        }
      }
      
      if (searchQuery.trim()) {
        const searchRes = await fetch(`/api/files/search?q=${searchQuery}&limit=50`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
        });
        
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          setFiles(searchData.data.files || []);
        }
      }
      
    } catch (error) {
      console.error('Failed to load content:', error);
      toast.error('Failed to load files');
    } finally {
      setIsLoading(false);
    }
  };

  // Touch gesture handlers
  const handleSwipe = useCallback((direction, item) => {
    switch (direction) {
      case 'left':
        // Favorite/Star toggle
        toggleFavorite(item);
        break;
      case 'right':
        // Delete confirmation
        showDeleteConfirmation(item);
        break;
      case 'down':
        // Show quick actions
        showQuickActions(item);
        break;
    }
  }, []);

  const toggleFavorite = async (item) => {
    // Implement favorite toggle logic
    toast.success(`${item.isFavorited ? 'Removed from favorites' : 'Added to favorites'}`);
  };

  const showDeleteConfirmation = (item) => {
    if (confirm(`Delete "${item.displayFilename}"?`)) {
      deleteFile(item.id);
    }
  };

  const deleteFile = async (fileId) => {
    try {
      await fileApi.delete(fileId);
      toast.success('File deleted successfully');
      loadContent();
    } catch (error) {
      toast.error('Failed to delete file');
    }
  };

  const showQuickActions = (item) => {
    // Show menu with download, share, rename options
    showToast('Quick actions menu coming soon');
  };

  const showToast = (message) => {
    toast.info(message);
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
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-20">
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
        {selectedFolder && (
          <div className="px-4 pb-3">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="p-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : selectedFolder ? (
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
        ) : (
          /* Root View - Quick Actions */
          <div className="space-y-4">
            {/* Upload Button */}
            <button className="w-full py-4 bg-primary-600 text-white rounded-lg font-semibold flex items-center justify-center space-x-2 shadow-lg hover:bg-primary-700 transition-colors">
              <UploadCloud className="w-6 h-6" />
              <span>Quick Upload</span>
            </button>

            {/* Quick Access Folders */}
            <section>
              <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Recent Folders</h2>
              <div className="space-y-2">
                {[
                  { name: 'Documents', count: 12, icon: <FileText /> },
                  { name: 'Images', count: 45, icon: <ImageIcon /> },
                  { name: 'Videos', count: 8, icon: <Video /> },
                  { name: 'Downloads', count: 23, icon: <Move /> }
                ].map((folder, index) => (
                  <div
                    key={index}
                    onClick={() => navigateToFolder({ name: folder.name, id: `temp-${index}` })}
                    className="flex items-center p-3 bg-white border border-gray-200 rounded-lg active:bg-gray-50 cursor-pointer"
                  >
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-primary-600 mr-3">
                      {folder.icon}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{folder.name}</p>
                      <p className="text-xs text-gray-500">{folder.count} items</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Recent Files */}
            <section>
              <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Recent Files</h2>
              <div className="space-y-2">
                {[1, 2, 3].map((_, index) => (
                  <div key={index} className="flex items-center p-3 bg-white border border-gray-200 rounded-lg">
                    <FileText className="w-10 h-10 text-blue-500 mr-3" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">File {index + 1}.pdf</p>
                      <p className="text-xs text-gray-500">2.5 MB • 2 hours ago</p>
                    </div>
                    <button className="p-2 hover:bg-gray-100 rounded">
                      <MoreVertical className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>
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
                Storage: {(user?.storageUsedBytes / 1024 / 1024).toFixed(0)} MB / {(user?.storageQuotaBytes / 1024 / 1024 / 1024).toFixed(2)} GB
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default MobileDashboard;
