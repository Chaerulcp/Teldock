import { Link } from 'react-router-dom';
import {
  Cloud, ArrowRight, ShieldCheck, Layers, FolderTree,
  Share2, Gauge, Lock, Github, Terminal, Server, Check, AlertTriangle, Code2, GitFork, Star, BookOpen, Users
} from 'lucide-react';
import { useThemeStore } from '../store/theme-store';
import { Moon, Sun } from 'lucide-react';

const REPO_URL = 'https://github.com/Chaerulcp/Teldock';

function Landing() {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  return (
    <div className="min-h-[100dvh] bg-ink-50 dark:bg-ink-950 text-ink-900 dark:text-ink-100 font-sans">
      {/* Policy notice bar */}
      <div className="bg-ink-900 text-ink-100 text-center text-xs sm:text-sm px-4 py-2 flex items-center justify-center gap-2">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
        <span>
          Educational open-source project. Using Telegram as file storage may breach{' '}
          <a href="https://telegram.org/tos" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">Telegram's ToS</a>
          {' '}— use responsibly, at your own risk.
        </span>
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-ink-50/80 dark:bg-ink-950/80 border-b border-ink-200/60 dark:border-ink-800/60">
        <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary-500 grid place-items-center shadow-glow">
              <Cloud className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight">Teldock</span>
            <span className="hidden sm:inline text-[10px] font-mono font-semibold text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800/60 rounded px-1.5 py-0.5 ml-1">
              OSS
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-ink-600 dark:text-ink-300">
            <a href="#features" className="hover:text-ink-900 dark:hover:text-white transition-colors">Features</a>
            <a href="#selfhost" className="hover:text-ink-900 dark:hover:text-white transition-colors">Self-host</a>
            <a href="#how" className="hover:text-ink-900 dark:hover:text-white transition-colors">How it works</a>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="w-9 h-9 grid place-items-center rounded-lg text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
            </button>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-ink-700 dark:text-ink-200 border border-ink-200 dark:border-ink-800 px-3 py-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors"
            >
              <Star className="w-4 h-4" /> Star
            </a>
            <Link to="/login" className="text-sm font-semibold text-ink-700 dark:text-ink-200 hover:text-ink-900 dark:hover:text-white transition-colors px-2">
              Sign in
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-light dark:bg-grid-dark [background-size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)] opacity-70" />
        <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-24 md:pt-24 md:pb-28 grid lg:grid-cols-2 gap-16 items-center">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800/60 rounded-full px-3 py-1.5">
              <Code2 className="w-3.5 h-3.5" />
              Open source · Self-hosted · MIT
            </span>
            <h1 className="mt-6 font-display font-bold text-4xl md:text-5xl lg:text-6xl leading-[1.05] tracking-tight">
              A self-hosted drive built on the{' '}
              <span className="text-primary-600 dark:text-primary-400">Telegram</span> Bot API.
            </h1>
            <p className="mt-6 text-lg text-ink-600 dark:text-ink-300 leading-relaxed max-w-[52ch]">
              Teldock is a free, open-source experiment that turns Telegram into a personal
              cloud drive. Self-host it once, and every account connects its own bot and channel —
              so a whole household can share one instance while keeping files separate.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-ink-900 dark:bg-white text-white dark:text-ink-900 font-semibold px-6 py-3.5 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all"
              >
                <Github className="w-[18px] h-[18px]" />
                View on GitHub
              </a>
              <a
                href="#selfhost"
                className="inline-flex items-center gap-2 font-semibold text-ink-700 dark:text-ink-200 px-6 py-3.5 rounded-xl border border-ink-200 dark:border-ink-800 hover:bg-ink-100 dark:hover:bg-ink-900 transition-colors"
              >
                <Terminal className="w-[18px] h-[18px]" />
                Self-host guide
              </a>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-500 dark:text-ink-400">
              <span className="inline-flex items-center gap-1.5"><Check className="w-4 h-4 text-primary-500" /> No vendor, no signup wall</span>
              <span className="inline-flex items-center gap-1.5"><Check className="w-4 h-4 text-primary-500" /> Bring your own bot</span>
              <span className="inline-flex items-center gap-1.5"><Check className="w-4 h-4 text-primary-500" /> Auditable code</span>
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
                  <span className="ml-3 text-xs font-mono text-ink-400">localhost:3000 / my drive</span>
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

      {/* Tech strip */}
      <section className="border-y border-ink-200/60 dark:border-ink-800/60 bg-white/50 dark:bg-ink-900/30">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-ink-400 dark:text-ink-500">
          <span className="text-xs font-semibold uppercase tracking-[0.16em]">Built with</span>
          {['Node.js', 'Express', 'React', 'MySQL', 'Rclone'].map((n) => (
            <span key={n} className="font-display font-semibold text-lg text-ink-500 dark:text-ink-400">{n}</span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24">
        <div className="max-w-2xl">
          <h2 className="font-display font-bold text-3xl md:text-4xl tracking-tight">
            What the code does
          </h2>
          <p className="mt-4 text-lg text-ink-600 dark:text-ink-300">
            Chunked uploads, streaming downloads, encryption, and organization — all backed by a Telegram bot you control.
          </p>
        </div>

        <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { icon: Layers, title: 'Chunked large files', body: 'Files are split into parts across Telegram messages, working around the 50 MB Bot API cap.' },
            { icon: Gauge, title: 'Multi-bot pool', body: 'Add several bot tokens and transfers spread round-robin for higher throughput.' },
            { icon: Lock, title: 'AES-256 encryption', body: 'Opt-in per-file encryption with a random salt and per-part IV. Keys stay on your instance.' },
            { icon: FolderTree, title: 'Real folders', body: 'Nested folders, move, rename, and organize like a native file manager.' },
            { icon: Share2, title: 'Signed sharing', body: 'Generate expiring, password-protected links with download limits.' },
            { icon: Users, title: 'Multi-account', body: 'One instance, many users — each connects their own bot and channel, fully isolated.' },
            { icon: Server, title: 'WebDAV + Rclone', body: 'Mount your instance as a remote and sync with the tools you already use.' },
          ].map((f) => (
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

      {/* Self-host */}
      <section id="selfhost" className="bg-white dark:bg-ink-900 border-y border-ink-200/60 dark:border-ink-800/60">
        <div className="max-w-7xl mx-auto px-6 py-24 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-primary-600 dark:text-primary-400 text-sm font-semibold">
              <Terminal className="w-5 h-5" /> Run it yourself
            </div>
            <h2 className="mt-4 font-display font-bold text-3xl md:text-4xl tracking-tight">
              Clone, configure, run
            </h2>
            <p className="mt-4 text-lg text-ink-600 dark:text-ink-300 leading-relaxed max-w-[52ch]">
              Teldock is self-hosted. There is no hosted service — you run it on your own machine or VPS.
              Then each user signs in and connects their own Telegram bot and channel from Settings.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-ink-700 dark:text-ink-200 border border-ink-200 dark:border-ink-800 px-4 py-2.5 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors">
                <GitFork className="w-4 h-4" /> Fork the repo
              </a>
              <a href={`${REPO_URL}#getting-started`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-ink-700 dark:text-ink-200 border border-ink-200 dark:border-ink-800 px-4 py-2.5 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors">
                <BookOpen className="w-4 h-4" /> Read the docs
              </a>
            </div>
          </div>

          {/* Terminal block */}
          <div className="rounded-2xl border border-ink-800 bg-ink-900 overflow-hidden shadow-card">
            <div className="flex items-center gap-2 px-4 h-10 border-b border-ink-800">
              <span className="w-3 h-3 rounded-full bg-red-400" />
              <span className="w-3 h-3 rounded-full bg-amber-400" />
              <span className="w-3 h-3 rounded-full bg-primary-400" />
              <span className="ml-2 text-xs font-mono text-ink-500">bash</span>
            </div>
            <pre className="p-5 text-sm font-mono text-ink-200 leading-relaxed overflow-x-auto">
<span className="text-ink-500"># clone & install</span>{'\n'}
<span className="text-primary-400">git</span> clone {REPO_URL}.git{'\n'}
<span className="text-primary-400">cd</span> Teldock/backend && <span className="text-primary-400">npm</span> install{'\n'}
<span className="text-primary-400">cp</span> .env.example .env   <span className="text-ink-500"># configure DB + secrets</span>{'\n'}
<span className="text-primary-400">npm</span> run migrate{'\n'}
<span className="text-primary-400">npm</span> run dev{'\n'}
{'\n'}
<span className="text-ink-500"># then the frontend</span>{'\n'}
<span className="text-primary-400">cd</span> ../frontend && <span className="text-primary-400">npm</span> install && <span className="text-primary-400">npm</span> run dev
            </pre>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="max-w-7xl mx-auto px-6 py-24">
        <div className="max-w-2xl">
          <h2 className="font-display font-bold text-3xl md:text-4xl tracking-tight">How it works</h2>
          <p className="mt-4 text-lg text-ink-600 dark:text-ink-300">Your instance talks directly to your bot — nothing passes through a third party.</p>
        </div>
        <div className="mt-14 grid md:grid-cols-3 gap-8">
          {[
            { n: '01', title: 'Self-host it', body: 'Clone the repo and run Teldock on your machine or VPS — one instance for your whole household.' },
            { n: '02', title: 'Each user connects a bot', body: 'Every account adds its own @BotFather bot and private channel in Settings. Files stay isolated per user.' },
            { n: '03', title: 'Upload & access anywhere', body: 'Files are chunked, optionally encrypted, streamed to each user\u2019s own channel — browse, share, or mount via WebDAV.' },
          ].map((s) => (
            <div key={s.n} className="relative">
              <span className="font-mono text-sm font-semibold text-primary-500">{s.n}</span>
              <h3 className="mt-3 font-display font-semibold text-xl">{s.title}</h3>
              <p className="mt-2 text-ink-600 dark:text-ink-400 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Data ownership band */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <div className="rounded-3xl bg-ink-900 dark:bg-ink-900 border border-ink-800 p-10 md:p-14 relative overflow-hidden">
          <div className="absolute -right-16 -top-16 w-64 h-64 bg-primary-500/20 blur-3xl rounded-full" />
          <div className="relative grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-primary-400 text-sm font-semibold">
                <ShieldCheck className="w-5 h-5" /> You own the stack
              </div>
              <h2 className="mt-4 font-display font-bold text-3xl md:text-4xl text-white tracking-tight">
                No middleman. You self-host everything.
              </h2>
              <p className="mt-4 text-ink-300 leading-relaxed max-w-[52ch]">
                There are no Teldock servers. Files move directly between your instance and each user's own
                Telegram bot. Credentials are encrypted at rest and encryption keys never leave your deployment.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { icon: Lock, label: 'AES-256-CTR encryption' },
                { icon: ShieldCheck, label: 'JWT auth + refresh' },
                { icon: Server, label: 'Self-hosted, no relay' },
                { icon: Code2, label: 'MIT licensed & auditable' },
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

      {/* Disclaimer callout */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <div className="rounded-2xl border border-amber-300/60 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/20 p-6 md:p-8">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 grid place-items-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-lg text-ink-900 dark:text-white">A note on responsible use</h3>
              <p className="mt-2 text-sm text-ink-700 dark:text-ink-300 leading-relaxed max-w-[75ch]">
                Teldock is a learning project, not a product. Using the Telegram Bot API as a general
                storage backend is <strong>not</strong> its intended use and may violate Telegram's Terms of Service.
                Bots or accounts can be rate-limited, suspended, or have data deleted. Use only with data you own,
                for educational purposes, and never treat this as reliable primary storage. Teldock is not affiliated with Telegram.
              </p>
            </div>
          </div>
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
            <span className="text-sm text-ink-400 ml-2">Open-source Telegram-backed storage</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-ink-500">
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-ink-900 dark:hover:text-white transition-colors"
            >
              <Github className="w-4 h-4" /> GitHub
            </a>
            <span>MIT License</span>
          </div>
        </div>
        <div className="border-t border-ink-200/60 dark:border-ink-800/60">
          <p className="max-w-7xl mx-auto px-6 py-4 text-xs text-ink-400 text-center">
            Not affiliated with, endorsed by, or connected to Telegram FZ-LLC. Use in accordance with Telegram's terms and your local laws.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
