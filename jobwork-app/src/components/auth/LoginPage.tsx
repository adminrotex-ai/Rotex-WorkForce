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
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #001f3f 0%, #003366 100%)' }}>
      <div className="animate-fade-in bg-white rounded-lg p-10 w-full max-w-md shadow-2xl" style={{ borderRadius: '8px' }}>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold" style={{ color: '#001f3f' }}>JOBWORK</h1>
          <p className="text-gray-500 mt-2 text-sm">Manufacturing Workflow Management</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#001f3f] transition-colors"
              placeholder="Enter username"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#001f3f] transition-colors"
              placeholder="Enter password"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 text-white font-semibold rounded-lg transition-all hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#001f3f', borderRadius: '8px' }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
