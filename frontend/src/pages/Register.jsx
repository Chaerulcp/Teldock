import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, User, Lock, Loader2, Cloud, ArrowLeft, Check } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuthStore } from '../store/auth-store';

function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: ''
  });
  const [loading, setLoading] = useState(false);

  const { register } = useAuthStore();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await register({
        email: formData.email,
        password: formData.password,
        username: formData.username || undefined
      });
      toast.success('Account created!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full pl-11 pr-3 py-3 rounded-xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 text-ink-900 dark:text-white placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all';

  return (
    <div className="min-h-[100dvh] grid lg:grid-cols-2 bg-ink-50 dark:bg-ink-950 font-sans">
      {/* Left: brand panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-ink-900 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-primary-500/20 blur-3xl rounded-full" />
        <div className="absolute inset-0 bg-grid-dark [background-size:32px_32px] opacity-40" />
        <Link to="/" className="relative flex items-center gap-2 text-white">
          <div className="w-9 h-9 rounded-xl bg-primary-500 grid place-items-center">
            <Cloud className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-lg">Teldock</span>
        </Link>
        <div className="relative">
          <h1 className="font-display font-bold text-4xl text-white leading-tight tracking-tight">
            Start your private<br />Telegram drive.
          </h1>
          <ul className="mt-8 space-y-3">
            {[
              'Unlimited storage via your own bot',
              'No file size limits — files are chunked',
              'Optional AES-256 encryption',
              'Signed sharing with expiry & passwords',
            ].map((f) => (
              <li key={f} className="flex items-center gap-3 text-ink-200">
                <span className="w-5 h-5 rounded-full bg-primary-500/20 grid place-items-center flex-shrink-0">
                  <Check className="w-3 h-3 text-primary-400" />
                </span>
                <span className="text-sm">{f}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-ink-500 font-mono">MIT Licensed · Open Source</p>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 dark:hover:text-white mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>

          <h2 className="font-display font-bold text-2xl text-ink-900 dark:text-white">Create your account</h2>
          <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">Free forever. No credit card.</p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-1.5">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-ink-400" />
                <input id="email" name="email" type="email" autoComplete="email" required value={formData.email} onChange={handleChange} className={inputClass} placeholder="you@example.com" />
              </div>
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-1.5">Username <span className="text-ink-400 font-normal">(optional)</span></label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-ink-400" />
                <input id="username" name="username" type="text" value={formData.username} onChange={handleChange} className={inputClass} placeholder="yourname" />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-ink-400" />
                <input id="password" name="password" type="password" autoComplete="new-password" required value={formData.password} onChange={handleChange} className={inputClass} placeholder="Min. 6 characters" />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-1.5">Confirm password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-ink-400" />
                <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required value={formData.confirmPassword} onChange={handleChange} className={inputClass} placeholder="Repeat password" />
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
                  Creating account…
                </>
              ) : (
                'Create account'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-500 dark:text-ink-400">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-primary-600 dark:text-primary-400 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
