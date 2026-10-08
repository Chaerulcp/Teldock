import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Loader2, BrainCircuit, ArrowLeft, Sparkles } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuthStore } from '../store/auth-store';

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuthStore();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(formData);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] grid lg:grid-cols-2 bg-ink-50 dark:bg-ink-950 font-sans">
      {/* Left: brand panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-ink-900 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-purple-600/20 blur-[100px] rounded-full mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
        <Link to="/" className="relative flex items-center gap-2 text-white">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-500 to-purple-600 grid place-items-center shadow-[0_0_20px_rgba(168,85,247,0.3)]">
            <BrainCircuit className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight">Teldock AI</span>
        </Link>
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-primary-300 mb-6 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Powered by Claude Sonnet 5.5</span>
          </div>
          <h1 className="font-display font-bold text-4xl text-white leading-tight tracking-tight">
            Welcome back to your <br /> intelligent workspace.
          </h1>
          <p className="mt-4 text-ink-300 max-w-md leading-relaxed">
            The intelligent knowledge layer for your entire company. Stop searching. Start asking.
          </p>
        </div>
        <p className="relative text-sm text-ink-500 font-mono">© 2026 Teldock AI</p>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 dark:hover:text-white mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>

          <h2 className="font-display font-bold text-2xl text-ink-900 dark:text-white">Sign in</h2>
          <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">Access your cloud drive.</p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-1.5">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-ink-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-11 pr-3 py-3 rounded-xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 text-ink-900 dark:text-white placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-ink-400" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-11 pr-3 py-3 rounded-xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 text-ink-900 dark:text-white placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white bg-primary-600 hover:bg-primary-500 shadow-glow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-500 dark:text-ink-400">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-primary-600 dark:text-primary-400 hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
