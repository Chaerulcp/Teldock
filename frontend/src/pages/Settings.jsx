import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, User, Cloud, Lock, CheckCircle2, AlertCircle, Bot, Trash2, Plus } from 'lucide-react';
import { useAuthStore } from '../store/auth-store';
import { botApi } from '../services/api';
import { toast } from 'react-toastify';

function Settings() {
  const user = useAuthStore((state) => state.user);
  const [activeTab, setActiveTab] = useState('telegram');
  const [isLoading, setIsLoading] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState(null);

  // Load telegram status on mount
  useEffect(() => {
    loadTelegramStatus();
  }, []);

  const loadTelegramStatus = async () => {
    try {
      const response = await fetch('/api/user/telegram/status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setTelegramStatus(data.data);
      }
    } catch (error) {
      console.error('Failed to load Telegram status:', error);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-ink-50 dark:bg-ink-950 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your account preferences</p>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('telegram')}
              className={`flex items-center px-6 py-4 font-medium transition-colors ${
                activeTab === 'telegram' 
                  ? 'text-primary-600 border-b-2 border-primary-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Cloud className="w-5 h-5 mr-2" />
              Telegram Integration
            </button>

            <button
              onClick={() => setActiveTab('bots')}
              className={`flex items-center px-6 py-4 font-medium transition-colors ${
                activeTab === 'bots'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Bot className="w-5 h-5 mr-2" />
              Bot Pool
            </button>
            
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center px-6 py-4 font-medium transition-colors ${
                activeTab === 'profile' 
                  ? 'text-primary-600 border-b-2 border-primary-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <User className="w-5 h-5 mr-2" />
              Account Profile
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {activeTab === 'telegram' && (
              <TelegramSetupTab 
                status={telegramStatus}
                onRefresh={loadTelegramStatus}
              />
            )}

            {activeTab === 'bots' && <BotPoolTab />}

            {activeTab === 'profile' && (
              <div className="text-center py-12 text-gray-500">
                <User className="mx-auto w-12 h-12 mb-4 text-gray-300" />
                <p>Account profile settings coming soon...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Bot Pool Tab - manage multiple bot tokens for faster parallel transfers
function BotPoolTab() {
  const [bots, setBots] = useState([]);
  const [token, setToken] = useState('');
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBots();
  }, []);

  const loadBots = async () => {
    try {
      const res = await botApi.list();
      setBots(res.data.data.bots || []);
    } catch (error) {
      console.error('Failed to load bots:', error);
    } finally {
      setLoading(false);
    }
  };

  const addBot = async () => {
    if (!token.trim()) return;
    setAdding(true);
    try {
      await botApi.add(token.trim());
      toast.success('Bot added to pool');
      setToken('');
      loadBots();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to add bot');
    } finally {
      setAdding(false);
    }
  };

  const removeBot = async (id) => {
    if (!confirm('Remove this bot from the pool?')) return;
    try {
      await botApi.remove(id);
      toast.success('Bot removed');
      loadBots();
    } catch (error) {
      toast.error('Failed to remove bot');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">Multi-Bot Pool</h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Add multiple bot tokens to spread uploads and downloads across bots for higher speed.
              Each bot must be an admin of your storage channel. 5–8 bots is a good target.
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Bot token from @BotFather"
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
        <button
          onClick={addBot}
          disabled={adding || !token.trim()}
          className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          {adding ? 'Adding…' : 'Add Bot'}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : bots.length === 0 ? (
        <p className="text-center text-gray-500 py-8">No bots in your pool yet.</p>
      ) : (
        <ul className="divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg">
          {bots.map((bot) => (
            <li key={bot.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <Bot className="w-5 h-5 text-primary-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {bot.botUsername ? `@${bot.botUsername}` : `Bot ${bot.botId}`}
                  </p>
                  <p className="text-xs text-gray-500">
                    {bot.isActive ? 'Active' : 'Inactive'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => removeBot(bot.id)}
                className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded"
                title="Remove"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Telegram Setup Tab Component
function TelegramSetupTab({ status, onRefresh }) {
  const [showConnect, setShowConnect] = useState(!status?.isConnected);
  const [formData, setFormData] = useState({
    botToken: '',
    chatId: '',
    chatType: 'channel',
    username: ''
  });
  const [isValidating, setIsValidating] = useState(false);

  const handleConnect = async () => {
    setIsValidating(true);

    try {
      const response = await fetch('/api/user/telegram/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify(formData)
      });
      const data = await response.json();

      if (!data.success) {
        toast.error(data.error || 'Failed to connect');
        return;
      }

      toast.success('Telegram connected successfully!');
      setShowConnect(false);
      onRefresh();
    } catch (error) {
      toast.error('Connection failed');
    } finally {
      setIsValidating(false);
    }
  };

  if (showConnect && !status?.isConnected) {
    return (
      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">Connect Your Telegram Bot</h3>
              <p className="text-sm text-blue-700">
                To upload files to Telegram, you need to connect your own Telegram bot. Follow these steps:
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bot Token <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.botToken}
              onChange={(e) => setFormData({...formData, botToken: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Enter your bot token from @BotFather"
            />
            <p className="mt-1 text-xs text-gray-500">
              Get your bot token from{' '}
              <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                @BotFather on Telegram
              </a>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Storage Chat/Channel ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.chatId}
              onChange={(e) => setFormData({...formData, chatId: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="-100xxxxxxxxxx"
            />
            <p className="mt-1 text-xs text-gray-500">
              Find this in a private chat with your bot or channel admin
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username (Optional)
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="@mybotname"
            />
          </div>

          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={handleConnect}
              disabled={isValidating || !formData.botToken || !formData.chatId}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isValidating ? 'Testing...' : 'Connect & Test'}
            </button>
            
            <button
              type="button"
              onClick={() => window.open('https://telegra.ph/Create-a-Bot-11-13', '_blank')}
              className="px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Learn how to create a bot"
            >
              ℹ️
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (status?.isConnected) {
    return (
      <div className="space-y-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start">
            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-green-900">Telegram Connected</h3>
              <p className="text-sm text-green-700">Your Telegram bot is successfully configured for file storage.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-1">Bot Name</p>
            <p className="font-semibold text-gray-900">{status.botName || 'Not set'}</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-1">Storage Channel</p>
            <p className="font-semibold text-gray-900">Connected privately</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-1">Chat Type</p>
            <p className="capitalize font-semibold text-gray-900">{status.chatType || 'N/A'}</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-1">Status</p>
            <span className="inline-block px-2 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded">
              Active
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center py-12">
      <Cloud className="mx-auto w-12 h-12 text-gray-300 mb-4" />
      <p className="text-gray-500">No connection established</p>
      <button
        onClick={() => setShowConnect(true)}
        className="mt-4 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
      >
        Connect Telegram
      </button>
    </div>
  );
}

export default Settings;
