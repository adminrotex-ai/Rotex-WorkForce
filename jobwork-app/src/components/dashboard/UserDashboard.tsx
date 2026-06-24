import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../../store';
import { DEPARTMENT_LABELS } from '../../types';
import { BarChart3, Wallet } from 'lucide-react';

export default function UserDashboard() {
  const { currentUser } = useSelector((s: RootState) => s.auth);
  const navigate = useNavigate();

  if (!currentUser) return null;

  return (
    <div>
      <h1 className="text-2xl font-light text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <button onClick={() => navigate('/statistics')} className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 text-left cursor-pointer hover:bg-white/80 transition-colors">
          <BarChart3 size={24} className="text-blue-500 mb-3" />
          <p className="text-sm font-medium text-gray-900">Statistics</p>
          <p className="text-[11px] text-gray-400 mt-1">View reports and analytics</p>
        </button>
        <button onClick={() => navigate('/accounting')} className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 text-left cursor-pointer hover:bg-white/80 transition-colors">
          <Wallet size={24} className="text-emerald-500 mb-3" />
          <p className="text-sm font-medium text-gray-900">Accounting</p>
          <p className="text-[11px] text-gray-400 mt-1">View financial details</p>
        </button>
      </div>

      <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6">
        <p className="text-sm text-gray-600">Role: <strong className="capitalize">{currentUser.role}</strong></p>
        <p className="text-sm text-gray-600 mt-1">Department: <strong>{DEPARTMENT_LABELS[currentUser.department] || currentUser.department}</strong></p>
      </div>
    </div>
  );
}
