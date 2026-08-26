import { Link } from 'react-router-dom';
import {
  Cloud, ArrowRight, ShieldCheck, Layers, Zap, FolderTree,
  Share2, Gauge, Lock, Github, Infinity as InfinityIcon, Server, Check
} from 'lucide-react';
import { useThemeStore } from '../store/theme-store';
import { Moon, Sun } from 'lucide-react';

function Landing() {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  return (
    <div className="min-h-[100dvh] bg-ink-50 dark:bg-ink-950 text-ink-900 dark:text-ink-100 font-sans">
      {/* Nav */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-ink-50/80 dark:bg-ink-950/80 border-b border-ink-200/60 dark:border-ink-800/60">
        <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary-500 grid place-items-center shadow-glow">
              <Cloud className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight">Teldock</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-ink-600 dark:text-ink-300">
            <a href="#features" className="hover:text-ink-900 dark:hover:text-white transition-colors">Features</a>
            <a href="#how" className="hover:text-ink-900 dark:hover:text-white transition-colors">How it works</a>
            <a href="#security" className="hover:text-ink-900 dark:hover:text-white transition-colors">Security</a>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="w-9 h-9 grid place-items-center rounded-lg text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
            </button>
            <Link to="/login" className="text-sm font-semibold text-ink-700 dark:text-ink-200 hover:text-ink-900 dark:hover:text-white transition-colors">
              Sign in
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-1.5 text-sm font-semibold bg-ink-900 dark:bg-white text-white dark:text-ink-900 px-4 py-2 rounded-lg hover:opacity-90 active:scale-[0.98] transition-all"
            >
              Get started
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-light dark:bg-grid-dark [background-size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)] opacity-70" />
        <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-24 md:pt-28 md:pb-32 grid lg:grid-cols-2 gap-16 items-center">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800/60 rounded-full px-3 py-1.5">
              <InfinityIcon className="w-3.5 h-3.5" />
              Unlimited by design
            </span>
            <h1 className="mt-6 font-display font-bold text-4xl md:text-5xl lg:text-6xl leading-[1.05] tracking-tight">
              Your files, stored on{' '}
              <span className="text-primary-600 dark:text-primary-400">Telegram</span>.
              Managed like a real drive.
            </h1>
            <p className="mt-6 text-lg text-ink-600 dark:text-ink-300 leading-relaxed max-w-[52ch]">
              Teldock turns a Telegram channel into a private cloud drive. Upload files of any size,
              stream media, encrypt on the fly, and share with signed links.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 bg-primary-600 text-white font-semibold px-6 py-3.5 rounded-xl shadow-glow hover:bg-primary-500 active:scale-[0.98] transition-all"
              >
                Start for free
                <ArrowRight className="w-[18px] h-[18px]" />
              </Link>
              <a
                href="#how"
                className="inline-flex items-center gap-2 font-semibold text-ink-700 dark:text-ink-200 px-6 py-3.5 rounded-xl border border-ink-200 dark:border-ink-800 hover:bg-ink-100 dark:hover:bg-ink-900 transition-colors"
              >
                See how it works
              </a>
            </div>
            <div className="mt-8 flex items-center gap-6 text-sm text-ink-500 dark:text-ink-400">
              <span className="inline-flex items-center gap-1.5"><Check className="w-4 h-4 text-primary-500" /> No storage cost</span>
              <span className="inline-flex items-center gap-1.5"><Check className="w-4 h-4 text-primary-500" /> Your own bot</span>
              <span className="inline-flex items-center gap-1.5"><Check className="w-4 h-4 text-primary-500" /> Open source</span>
            </div>
          </div>

          {/* Product mock */}
          <div className="animate-fade-up [animation-delay:120ms]">
            <div className="relative">
              <div className="absolute -inset-4 bg-primary-500/10 blur-3xl rounded-full" />
              <div className="relative rounded-2xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 shadow-card overflow-hidden">
                <div className="flex items-center gap-2 px-4 h-11 border-b border-ink-100 dark:border-ink-800">
                  <span className="w-3 h-3 rounded-full bg-red-400" />
                  <span className="w-3 h-3 rounded-full bg-amber-400" />
                  <span className="w-3 h-3 rounded-full bg-primary-400" />
                  <span className="ml-3 text-xs font-mono text-ink-400">Teldock / my drive</span>
                </div>
                <div className="p-5 space-y-3">
                  {[
                    { name: 'quarterly-report.pdf', size: '4.2 MB', tag: 'PDF', color: 'text-red-500' },
                    { name: 'launch-video.mp4', size: '1.8 GB', tag: '112×', color: 'text-purple-500' },
                    { name: 'design-system.fig', size: '86 MB', tag: 'FIG', color: 'text-blue-500' },
                    { name: 'backup-2026.zip', size: '3.4 GB', tag: 'LOCK', color: 'text-primary-500' },
                  ].map((f) => (
                    <div key={f.name} className="flex items-center gap-3 p-3 rounded-xl bg-ink-50 dark:bg-ink-950/60 border border-ink-100 dark:border-ink-800">
                      <div className="w-9 h-9 rounded-lg bg-white dark:bg-ink-800 grid place-items-center border border-ink-100 dark:border-ink-700">
                        <Layers className={`w-[18px] h-[18px] ${f.color}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{f.name}</p>
                        <p className="text-xs text-ink-400 font-mono">{f.size}</p>
                      </div>
                      <span className="text-[10px] font-mono font-semibold text-ink-400 bg-ink-100 dark:bg-ink-800 px-2 py-0.5 rounded">{f.tag}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2 text-xs text-ink-500">
                      <div className="w-32 h-1.5 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden">
                        <div className="h-full w-1/3 bg-primary-500 rounded-full" />
                      </div>
                      <span className="font-mono">33% of quota</span>
                    </div>
                    <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">4 files</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Logos / trust strip */}
      <section className="border-y border-ink-200/60 dark:border-ink-800/60 bg-white/50 dark:bg-ink-900/30">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-ink-400 dark:text-ink-500">
          <span className="text-xs font-semibold uppercase tracking-[0.16em]">Built on proven tech</span>
          {['Telegram', 'Node.js', 'React', 'MySQL', 'Rclone'].map((n) => (
            <span key={n} className="font-display font-semibold text-lg text-ink-500 dark:text-ink-400">{n}</span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24">
        <div className="max-w-2xl">
          <h2 className="font-display font-bold text-3xl md:text-4xl tracking-tight">
            Everything a modern drive needs
          </h2>
          <p className="mt-4 text-lg text-ink-600 dark:text-ink-300">
            Chunked uploads, streaming downloads, encryption, and organization — all backed by your Telegram account.
          </p>
        </div>

        <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { icon: InfinityIcon, title: 'No size limits', body: 'Large files are split into parts across Telegram messages, bypassing the 50 MB API cap.' },
            { icon: Gauge, title: 'Multi-bot speed', body: 'Add several bot tokens and transfers spread round-robin for higher throughput.' },
            { icon: Lock, title: 'AES-256 encryption', body: 'Opt-in per-file encryption with a random salt and per-part IV. Your keys, your data.' },
            { icon: FolderTree, title: 'Real folders', body: 'Nested folders, move, rename, and organize like a native file manager.' },
            { icon: Share2, title: 'Signed sharing', body: 'Create expiring, password-protected links with download limits.' },
            { icon: Server, title: 'WebDAV + Rclone', body: 'Mount your drive as a remote and sync with the tools you already use.' },
          ].map((f, i) => (
            <div
              key={f.title}
              className="group p-6 rounded-2xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 hover:shadow-card hover:-translate-y-0.5 transition-all"
            >
              <div className="w-11 h-11 rounded-xl bg-primary-50 dark:bg-primary-950/40 border border-primary-100 dark:border-primary-900/60 grid place-items-center text-primary-600 dark:text-primary-400 group-hover:scale-105 transition-transform">
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="mt-5 font-display font-semibold text-lg">{f.title}</h3>
              <p className="mt-2 text-sm text-ink-600 dark:text-ink-400 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-white dark:bg-ink-900 border-y border-ink-200/60 dark:border-ink-800/60">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <div className="max-w-2xl">
            <h2 className="font-display font-bold text-3xl md:text-4xl tracking-tight">Three steps to your own drive</h2>
            <p className="mt-4 text-lg text-ink-600 dark:text-ink-300">No servers to rent. No storage to pay for. Just connect a bot.</p>
          </div>
          <div className="mt-14 grid md:grid-cols-3 gap-8">
            {[
              { n: '01', title: 'Connect a bot', body: 'Create a bot with @BotFather and point it at a private channel you control.' },
              { n: '02', title: 'Upload anything', body: 'Drag files in — Teldock chunks, optionally encrypts, and streams them to Telegram.' },
              { n: '03', title: 'Access anywhere', body: 'Browse, stream, share, or mount via WebDAV from any device.' },
            ].map((s) => (
              <div key={s.n} className="relative">
                <span className="font-mono text-sm font-semibold text-primary-500">{s.n}</span>
                <h3 className="mt-3 font-display font-semibold text-xl">{s.title}</h3>
                <p className="mt-2 text-ink-600 dark:text-ink-400 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security band */}
      <section id="security" className="max-w-7xl mx-auto px-6 py-24">
        <div className="rounded-3xl bg-ink-900 dark:bg-ink-900 border border-ink-800 p-10 md:p-14 relative overflow-hidden">
          <div className="absolute -right-16 -top-16 w-64 h-64 bg-primary-500/20 blur-3xl rounded-full" />
          <div className="relative grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-primary-400 text-sm font-semibold">
                <ShieldCheck className="w-5 h-5" /> Security first
              </div>
              <h2 className="mt-4 font-display font-bold text-3xl md:text-4xl text-white tracking-tight">
                Your data never touches our servers
              </h2>
              <p className="mt-4 text-ink-300 leading-relaxed max-w-[52ch]">
                Files stream directly between you and your own Telegram bot. Credentials are encrypted at rest,
                sharing uses signed tokens, and encryption keys stay with you.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { icon: Lock, label: 'AES-256-CTR encryption' },
                { icon: ShieldCheck, label: 'JWT auth + refresh' },
                { icon: Zap, label: 'Rate limiting' },
                { icon: Server, label: 'No third-party relay' },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
                  <s.icon className="w-5 h-5 text-primary-400 flex-shrink-0" />
                  <span className="text-sm font-medium text-ink-100">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="font-display font-bold text-3xl md:text-4xl tracking-tight">
            Ready to reclaim your storage?
          </h2>
          <p className="mt-4 text-lg text-ink-600 dark:text-ink-300">
            Set up your private Telegram drive in minutes. Free and open source.
          </p>
          <Link
            to="/register"
            className="mt-8 inline-flex items-center gap-2 bg-primary-600 text-white font-semibold px-8 py-4 rounded-xl shadow-glow hover:bg-primary-500 active:scale-[0.98] transition-all"
          >
            Create your drive
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-ink-200/60 dark:border-ink-800/60">
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary-500 grid place-items-center">
              <Cloud className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-semibold">Teldock</span>
            <span className="text-sm text-ink-400 ml-2">Telegram Cloud Storage</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-ink-500">
            <a
              href="https://github.com/Chaerulcp/tele-storage-app"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-ink-900 dark:hover:text-white transition-colors"
            >
              <Github className="w-4 h-4" /> GitHub
            </a>
            <span>MIT License</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
