import { useState, useEffect } from 'react';
import { Outlet, useNavigate, NavLink, Link, useLocation } from 'react-router-dom';
import { File, LogOut, Cloud, Settings, Smartphone, Moon, Sun, HardDrive, AlertTriangle, Share2, BarChart3, Star, Tag as TagIcon } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuthStore } from '../store/auth-store';
import { useThemeStore } from '../store/theme-store';
import { userApi, tagApi, smartFolderApi } from '../services/api';
import TransferCenter from './TransferCenter';

function formatBytes(bytes) {
  const b = Number(bytes || 0);
  if (b === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${parseFloat((b / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const [tgConnected, setTgConnected] = useState(null); // null = loading
  const [tags, setTags] = useState([]);
  const [smartFolders, setSmartFolders] = useState([]);

  useEffect(() => {
    let active = true;
    userApi
      .telegramStatus()
      .then((res) => {
        if (active) setTgConnected(!!res.data?.data?.isConnected);
      })
      .catch(() => {
        if (active) setTgConnected(false);
      });
    tagApi.list()
      .then((res) => { if (active) setTags(res.data.data.tags || []); })
      .catch(() => {});
    smartFolderApi.list()
      .then((res) => { if (active) setSmartFolders(res.data.data.smartFolders || []); })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [location.pathname, location.search]);

  const smartFolderQuery = (criteria) => {
    const p = new URLSearchParams();
    if (criteria.favorite) p.set('favorite', 'true');
    if (criteria.tagId) p.set('tagId', criteria.tagId);
    return p.toString();
  };

  const handleLogout = () => {
    logout();
    toast.success('Signed out');
    navigate('/login');
  };

  const usedStorage = formatBytes(user?.storageUsedBytes);

  const navItems = [
    { to: '/dashboard', icon: File, label: 'All Files', end: true },
    { to: '/dashboard?favorite=true', icon: Star, label: 'Favorites' },
    { to: '/dashboard/mobile', icon: Smartphone, label: 'Browse' },
    { to: '/dashboard/shares', icon: Share2, label: 'Shared Links' },
    { to: '/dashboard/stats', icon: BarChart3, label: 'Storage Stats' },
    { to: '/dashboard/settings', icon: Settings, label: 'Settings' },
  ];

  const navClass = ({ isActive }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-colors ${
      isActive
        ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300'
        : 'text-ink-600 dark:text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800/60'
    }`;

  return (
    <div className="min-h-[100dvh] bg-ink-50 dark:bg-ink-950 font-sans">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white dark:bg-ink-900 border-r border-ink-200/70 dark:border-ink-800/70 hidden md:flex md:flex-col">
        <div className="p-5">
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-xl bg-primary-500 grid place-items-center shadow-glow">
              <Cloud className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight text-ink-900 dark:text-white">Teldock</span>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const favActive = item.to.includes('favorite=true') && location.pathname === '/dashboard' && location.search.includes('favorite=true');
              const allFilesActive = item.end && location.pathname === '/dashboard' && !location.search;
              const forceActive = favActive || allFilesActive;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={() => navClass({ isActive: forceActive })}
                >
                  <item.icon className="w-[18px] h-[18px]" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="mt-6">
              <p className="px-3.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400 mb-2">Tags</p>
              <div className="space-y-0.5 max-h-48 overflow-y-auto">
                {tags.map((t) => (
                  <Link
                    key={t.id}
                    to={`/dashboard?tagId=${t.id}`}
                    className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-sm font-medium text-ink-600 dark:text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800/60 transition-colors"
                  >
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                    <span className="truncate flex-1">{t.name}</span>
                    <span className="text-xs text-ink-400 font-mono">{t.fileCount}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Smart folders (saved filters) */}
          {smartFolders.length > 0 && (
            <div className="mt-6">
              <p className="px-3.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400 mb-2">Smart folders</p>
              <div className="space-y-0.5">
                {smartFolders.map((sf) => (
                  <Link
                    key={sf.id}
                    to={`/dashboard?${smartFolderQuery(sf.criteria)}`}
                    className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-sm font-medium text-ink-600 dark:text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800/60 transition-colors"
                  >
                    <Star className="w-[18px] h-[18px] text-primary-500" />
                    <span className="truncate flex-1">{sf.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-auto p-5 space-y-4">
          {/* Telegram connection / storage widget */}
          {tgConnected === false ? (
            <Link
              to="/dashboard/settings"
              className="block p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 hover:border-amber-300 dark:hover:border-amber-700 transition-colors"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Telegram not connected</span>
              </div>
              <p className="mt-1.5 text-xs text-amber-700/80 dark:text-amber-400/80 leading-relaxed">
                Connect a bot in Settings before uploading files.
              </p>
            </Link>
          ) : (
            <div className="p-4 rounded-2xl bg-ink-50 dark:bg-ink-950/60 border border-ink-100 dark:border-ink-800">
              <div className="flex items-center gap-2 mb-3">
                <HardDrive className="w-4 h-4 text-primary-500" />
                <span className="text-xs font-semibold text-ink-700 dark:text-ink-300">Storage used</span>
                <span className="ml-auto text-xs font-mono text-ink-400">
                  {tgConnected === null ? '…' : usedStorage}
                </span>
              </div>
              <p className="text-xs text-ink-400 leading-relaxed">
                Backed by your Telegram channel — capacity depends on Telegram, not a fixed quota.
              </p>
            </div>
          )}

          {/* User + actions */}
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-950/60 grid place-items-center text-primary-700 dark:text-primary-400 font-semibold text-sm flex-shrink-0">
              {(user?.username || user?.email || 'U')[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink-900 dark:text-white truncate">{user?.username || 'User'}</p>
              <p className="text-xs text-ink-400 truncate">{user?.email}</p>
            </div>
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="w-8 h-8 grid place-items-center rounded-lg text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-sm font-medium text-ink-600 dark:text-ink-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          >
            <LogOut className="w-[18px] h-[18px]" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="md:ml-64 min-h-[100dvh]">
        <main>
          <Outlet />
        </main>
      </div>

      <TransferCenter />
    </div>
  );
}

export default Layout;
