import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Cloud,
  Clock,
  Download,
  EyeOff,
  File as FileIcon,
  FileArchive,
  FileCode,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Loader2,
  Lock,
  Moon,
  Music,
  ShieldCheck,
  Sun,
  Video,
} from 'lucide-react';
import { publicShareApi } from '../services/api';
import { useThemeStore } from '../store/theme-store';

const CARD = 'rounded-2xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 shadow-card';
const PRIMARY_BTN =
  'w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white bg-primary-600 hover:bg-primary-500 shadow-glow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98] transition-all';

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function describeFile(mimeType, name) {
  const mime = (mimeType || '').toLowerCase();
  const ext = (name || '').includes('.') ? name.split('.').pop().toLowerCase() : '';

  const imageExt = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'heic', 'avif'];
  const videoExt = ['mp4', 'mov', 'mkv', 'webm', 'avi', 'm4v'];
  const audioExt = ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'];
  const archiveExt = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'];
  const sheetExt = ['xls', 'xlsx', 'csv', 'ods'];
  const codeExt = ['js', 'jsx', 'ts', 'tsx', 'json', 'html', 'css', 'py', 'rb', 'go', 'java', 'sh', 'yml', 'yaml'];

  if (mime.startsWith('image/') || imageExt.includes(ext)) return { icon: ImageIcon, tone: 'text-blue-500', label: ext || 'Image' };
  if (mime.startsWith('video/') || videoExt.includes(ext)) return { icon: Video, tone: 'text-purple-500', label: ext || 'Video' };
  if (mime.startsWith('audio/') || audioExt.includes(ext)) return { icon: Music, tone: 'text-pink-500', label: ext || 'Audio' };
  if (mime === 'application/pdf' || ext === 'pdf') return { icon: FileText, tone: 'text-red-500', label: 'PDF' };
  if (archiveExt.includes(ext) || mime.includes('zip') || mime.includes('compressed')) return { icon: FileArchive, tone: 'text-amber-500', label: ext || 'Archive' };
  if (sheetExt.includes(ext)) return { icon: FileSpreadsheet, tone: 'text-primary-600', label: ext || 'Spreadsheet' };
  if (codeExt.includes(ext)) return { icon: FileCode, tone: 'text-sky-500', label: ext || 'Code' };
  return { icon: FileIcon, tone: 'text-ink-500', label: ext || 'File' };
}

// Error bodies arrive as JSON for metadata requests, but as a Blob when the
// request used responseType: 'blob' (downloads). Normalize both to a message.
async function extractError(error, fallback) {
  const data = error?.response?.data;
  if (data && typeof Blob !== 'undefined' && data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text());
      if (parsed?.error) return parsed.error;
    } catch {
      // Not JSON; fall through to the fallback message.
    }
    return fallback;
  }
  if (data && typeof data === 'object' && typeof data.error === 'string') return data.error;
  return fallback;
}

function ShareAccess() {
  const { token } = useParams();
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  // status: 'loading' | 'password' | 'ready' | 'error'
  const [status, setStatus] = useState('loading');
  const [file, setFile] = useState(null);
  const [share, setShare] = useState(null);
  const [fileName, setFileName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  const requestShare = useCallback(
    async (providedPassword, isActive = () => true) => {
      try {
        const response = await publicShareApi.get(token, providedPassword);
        if (!isActive()) return;

        const body = response.data || {};

        // Password gate — note `requiresPassword` sits at the top level.
        if (body.requiresPassword) {
          setFileName(body.data?.fileName || '');
          setStatus('password');
          return;
        }

        const data = body.data || {};
        setFile(data.file || null);
        setShare({
          expiresAt: data.expiresAt || null,
          allowDownload: data.allowDownload !== false,
          usedDownloads: data.usedDownloads ?? 0,
          downloadLimit: data.downloadLimit ?? null,
        });
        setPasswordError('');
        setStatus('ready');
      } catch (error) {
        if (!isActive()) return;

        // 401 means a wrong password was supplied — keep the visitor on the
        // password form with an inline error, never redirect.
        if (error.response?.status === 401) {
          setStatus('password');
          setPasswordError('Incorrect password');
          return;
        }

        const message = await extractError(error, 'This shared link is not available.');
        if (!isActive()) return;
        setErrorMessage(message);
        setStatus('error');
      }
    },
    [token],
  );

  // Initial metadata fetch. The `active` flag guards against React StrictMode's
  // double-invocation of the mount effect (and against token changes).
  useEffect(() => {
    let active = true;
    setStatus('loading');
    requestShare(undefined, () => active);
    return () => {
      active = false;
    };
  }, [requestShare]);

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    if (!password || submitting) return;
    setSubmitting(true);
    setPasswordError('');
    await requestShare(password);
    setSubmitting(false);
  };

  const handleDownload = async () => {
    setDownloading(true);
    setDownloadError('');
    try {
      const response = await publicShareApi.download(token, password || undefined);
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = file?.displayFilename || file?.originalFilename || 'download';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      // Give the browser a moment to start the save before releasing the URL.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setDownloadError(await extractError(error, 'Download failed. Please try again.'));
    } finally {
      setDownloading(false);
    }
  };

  const visual = describeFile(file?.mimeType, file?.displayFilename || file?.originalFilename);
  const VisualIcon = visual.icon;
  const uploadedLabel = formatDate(file?.uploadedAt);
  const displayName = file?.displayFilename || file?.originalFilename || 'Shared file';

  const metaParts = [];
  if (share?.downloadLimit) metaParts.push(`${share.usedDownloads} of ${share.downloadLimit} downloads used`);
  if (share?.expiresAt) metaParts.push(`Link expires ${formatDate(share.expiresAt)}`);
  const metaNote = metaParts.join(' · ');

  return (
    <div className="min-h-[100dvh] bg-ink-50 dark:bg-ink-950 text-ink-900 dark:text-ink-100 font-sans flex flex-col">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-24 w-[28rem] h-[28rem] rounded-full bg-primary-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-grid-light dark:bg-grid-dark [background-size:32px_32px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)] opacity-60" />
      </div>

      {/* Header */}
      <header className="relative z-10">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary-500 grid place-items-center shadow-glow">
              <Cloud className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight">Teldock</span>
          </Link>
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="w-9 h-9 grid place-items-center rounded-lg text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">
          {status === 'loading' && (
            <div className={`${CARD} p-10 grid place-items-center`}>
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
              <p className="mt-4 text-sm text-ink-500 dark:text-ink-400">Preparing your file…</p>
            </div>
          )}

          {status === 'password' && (
            <div className={`${CARD} p-6 sm:p-8 animate-fade-up`}>
              <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-950/40 border border-primary-100 dark:border-primary-900/60 grid place-items-center text-primary-600 dark:text-primary-400">
                <Lock className="w-6 h-6" />
              </div>
              <h1 className="mt-5 font-display font-bold text-xl text-ink-900 dark:text-white">
                This file is protected
              </h1>
              <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">
                Enter the password you were given to open{' '}
                <span className="font-medium text-ink-900 dark:text-white break-words">{fileName || 'this file'}</span>.
              </p>

              <form className="mt-6 space-y-4" onSubmit={handlePasswordSubmit}>
                <div>
                  <label htmlFor="share-password" className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-ink-400" />
                    <input
                      id="share-password"
                      type="password"
                      autoComplete="off"
                      autoFocus
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-11 pr-3 py-3 rounded-xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 text-ink-900 dark:text-white placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                      placeholder="Enter password"
                    />
                  </div>
                </div>

                {passwordError && (
                  <p role="alert" className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    {passwordError}
                  </p>
                )}

                <button type="submit" disabled={submitting || !password} className={PRIMARY_BTN}>
                  {submitting ? (
                    <>
                      <Loader2 className="animate-spin h-5 w-5" />
                      Checking…
                    </>
                  ) : (
                    'Unlock file'
                  )}
                </button>
              </form>
            </div>
          )}

          {status === 'ready' && (
            <div className={`${CARD} overflow-hidden animate-fade-up`}>
              <div className="p-6 sm:p-8">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-ink-50 dark:bg-ink-950/60 border border-ink-100 dark:border-ink-800 grid place-items-center flex-shrink-0">
                    <VisualIcon className={`w-7 h-7 ${visual.tone}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-mono font-semibold uppercase tracking-[0.14em] text-ink-400">
                      {visual.label}
                    </p>
                    <h1 className="mt-1 font-display font-bold text-lg text-ink-900 dark:text-white break-words leading-snug">
                      {displayName}
                    </h1>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-500 dark:text-ink-400">
                  <span className="font-mono">{formatFileSize(file?.fileSize)}</span>
                  {uploadedLabel && (
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      {uploadedLabel}
                    </span>
                  )}
                  {file?.isEncrypted && (
                    <span className="inline-flex items-center gap-1.5 text-primary-600 dark:text-primary-400">
                      <ShieldCheck className="w-4 h-4" />
                      Encrypted
                    </span>
                  )}
                </div>

                {metaNote && <p className="mt-4 text-xs text-ink-400">{metaNote}</p>}

                <div className="mt-6">
                  {share?.allowDownload ? (
                    <button onClick={handleDownload} disabled={downloading} className={PRIMARY_BTN}>
                      {downloading ? (
                        <>
                          <Loader2 className="animate-spin h-5 w-5" />
                          Downloading…
                        </>
                      ) : (
                        <>
                          <Download className="h-5 w-5" />
                          Download
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 rounded-xl border border-ink-200 dark:border-ink-800 bg-ink-50 dark:bg-ink-950/60 px-4 py-3 text-sm text-ink-500 dark:text-ink-400">
                      <EyeOff className="w-4 h-4 flex-shrink-0" />
                      The owner disabled downloads for this link.
                    </div>
                  )}

                  {downloadError && (
                    <p role="alert" className="mt-3 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      {downloadError}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className={`${CARD} p-6 sm:p-8 animate-fade-up text-center`}>
              <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 grid place-items-center">
                <AlertTriangle className="w-6 h-6 text-amber-500" />
              </div>
              <h1 className="mt-5 font-display font-bold text-xl text-ink-900 dark:text-white">
                This link can't be opened
              </h1>
              <p className="mt-2 text-sm text-ink-500 dark:text-ink-400 leading-relaxed">
                {errorMessage}
              </p>
              <Link
                to="/"
                className="mt-6 inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-ink-700 dark:text-ink-200 border border-ink-200 dark:border-ink-800 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to home
              </Link>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10">
        <div className="max-w-3xl mx-auto px-6 py-6 text-center">
          <p className="text-xs text-ink-400">
            Shared securely via{' '}
            <Link
              to="/"
              className="font-semibold text-ink-500 dark:text-ink-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              Teldock
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}

export default ShareAccess;
