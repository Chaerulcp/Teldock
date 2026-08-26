import { useState, useEffect } from 'react';
import { Outlet, useNavigate, Link } from 'react-router-dom';
import { File, LogOut, Upload, Folder, Download, Share2, Cloud, Settings, Smartphone } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuthStore } from '../store/auth-store';

function Layout() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [storageUsed, setStorageUsed] = useState(0);

  useEffect(() => {
    if (user) {
      const percentage = ((user.storageUsedBytes / user.storageQuotaBytes) * 100).toFixed(2);
      setStorageUsed(parseFloat(percentage));
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 shadow-sm hidden md:block">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-8">
            <Cloud className="w-8 h-8 text-primary-500" />
            <h1 className="text-xl font-bold text-gray-900">Cloud Storage</h1>
          </div>

          {/* User Info */}
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700">{user?.username || user?.email}</p>
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Storage</span>
                <span>{storageUsed}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all ${
                    storageUsed > 80 ? 'bg-red-500' : storageUsed > 60 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${storageUsed}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {(user?.storageUsedBytes / 1024 / 1024).toFixed(0)} MB / {(user?.storageQuotaBytes / 1024 / 1024 / 1024).toFixed(2)} GB
              </p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-2">
            <Link to="/" className="flex items-center space-x-3 px-4 py-3 bg-primary-50 text-primary-700 rounded-lg font-medium">
              <File className="w-5 h-5" />
              <span>All Files</span>
            </Link>
            <Link to="/mobile" className="flex items-center space-x-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
              <Smartphone className="w-5 h-5" />
              <span>Browse (Mobile)</span>
            </Link>
            <Link to="/settings" className="flex items-center space-x-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </Link>
          </nav>
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 w-full p-6 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 w-full px-4 py-3 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="md:ml-64 min-h-screen">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Upload className="w-5 h-5 text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900">Your Files</h2>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </header>

        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;
