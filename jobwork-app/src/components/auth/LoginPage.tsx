import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { login } from '../../store/slices/authSlice';
import { hashPassword } from '../../utils/crypto';
import { db } from '../../database/db';

export default function LoginPage() {
  const dispatch = useDispatch();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }
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
    <div className="min-h-screen bg-[#e8e0cc] flex items-center justify-center p-4">
      <div className="bg-[#f5f0e0] rounded-[2rem] w-full max-w-md p-10 shadow-xl">
        <div className="text-center mb-8">
          <div className="inline-block border border-gray-300/70 rounded-full px-6 py-2.5 mb-6">
            <span className="text-sm font-medium text-gray-800">Rotex WorkForce</span>
          </div>
          <h1 className="text-3xl font-light text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-400 text-sm">Sign in to your account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-white/60 border border-gray-200/50 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-transparent"
              placeholder="Enter your username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-white/60 border border-gray-200/50 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-transparent"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#2a2a2a] text-white py-3 rounded-xl text-sm font-medium hover:bg-[#1a1a1a] transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-8">
          Contact your admin for account access
        </p>
      </div>
    </div>
  );
}
