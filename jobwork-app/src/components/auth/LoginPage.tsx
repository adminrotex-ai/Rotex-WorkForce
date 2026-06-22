import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { login } from '../../store/slices/authSlice';
import { hashPassword } from '../../utils/crypto';
import { db } from '../../database/db';
import { Package, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const dispatch = useDispatch();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const hash = hashPassword(password);
      const user = await db.users.where('username').equals(username).first();

      if (!user || !user.isActive) {
        setError('Invalid username or account is deactivated');
        setLoading(false);
        return;
      }

      if (user.passwordHash !== hash) {
        setError('Invalid password');
        setLoading(false);
        return;
      }

      dispatch(login(user));
    } catch {
      setError('Login failed. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a237e 0%, #283593 50%, #0d47a1 100%)' }}>
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute top-1/2 left-1/4 w-64 h-64 rounded-full bg-white/3" />
      </div>

      <div className="animate-fade-in bg-white rounded-2xl p-10 w-full max-w-md shadow-2xl relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1a237e] to-[#0d47a1] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200">
            <Package size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Welcome Back</h1>
          <p className="text-gray-400 mt-1 text-sm">Sign in to JOBWORK Management</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm transition-all placeholder-gray-300"
              placeholder="Enter your username"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm transition-all placeholder-gray-300 pr-11"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-indigo-200 disabled:opacity-50 text-sm bg-gradient-to-r from-[#1a237e] to-[#0d47a1]"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Signing in...
              </span>
            ) : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-300 mt-6">JOBWORK Manufacturing Workflow v1.0</p>
      </div>
    </div>
  );
}
