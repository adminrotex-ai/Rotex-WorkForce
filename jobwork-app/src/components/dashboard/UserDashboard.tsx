import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../../store';
import type { PieceEntry } from '../../types';
import { DEPARTMENT_LABELS } from '../../types';
import { getPieceEntriesByUser } from '../../database/operations';
import { XCircle, Package, BarChart3, CheckCircle } from 'lucide-react';

export default function UserDashboard() {
  const { currentUser } = useSelector((s: RootState) => s.auth);
  const navigate = useNavigate();
  const [entries, setEntries] = useState<PieceEntry[]>([]);

  useEffect(() => {
    if (currentUser) {
      getPieceEntriesByUser(currentUser.id).then(setEntries);
    }
  }, [currentUser]);

  if (!currentUser) return null;

  const totalAccepted = entries.reduce((sum, e) => sum + e.acceptedPieces, 0);
  const totalRejected = entries.reduce((sum, e) => sum + e.rejectedPieces, 0);
  const total = totalAccepted + totalRejected;
  const acceptRate = total > 0 ? (totalAccepted / total) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Welcome in, {currentUser.firstName}</h1>
        <p className="text-gray-400 text-sm mt-1">{DEPARTMENT_LABELS[currentUser.department]} Department</p>
      </div>

      {/* Hero Stats */}
      <div className="flex items-center gap-8 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#c9a227]/10 flex items-center justify-center">
            <Package size={18} className="text-[#c9a227]" />
          </div>
          <div>
            <p className="stat-number text-gray-900">{total}</p>
            <p className="text-xs text-gray-400 font-medium">Total Pieces</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#34c759]/10 flex items-center justify-center">
            <CheckCircle size={18} className="text-[#34c759]" />
          </div>
          <div>
            <p className="stat-number text-[#34c759]">{totalAccepted}</p>
            <p className="text-xs text-gray-400 font-medium">Accepted</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#ff3b30]/10 flex items-center justify-center">
            <XCircle size={18} className="text-[#ff3b30]" />
          </div>
          <div>
            <p className="stat-number text-[#ff3b30]">{totalRejected}</p>
            <p className="text-xs text-gray-400 font-medium">Rejected</p>
          </div>
        </div>
      </div>

      {/* Acceptance Rate */}
      <div className="warm-card p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-800">Acceptance Rate</h3>
          <span className="text-2xl font-extrabold text-gray-900">{acceptRate.toFixed(0)}%</span>
        </div>
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{
            width: `${acceptRate}%`,
            background: acceptRate >= 80 ? '#34c759' : acceptRate >= 50 ? '#ff9f0a' : '#ff3b30'
          }} />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-[11px] text-gray-400">{totalRejected} rejected</span>
          <span className="text-[11px] text-gray-400">{totalAccepted} accepted</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => navigate('/batches')}
          className="warm-card p-6 text-left hover-lift group"
        >
          <div className="w-12 h-12 rounded-2xl bg-[#c9a227]/10 flex items-center justify-center mb-4 group-hover:bg-[#c9a227]/20 transition-colors">
            <Package size={22} className="text-[#c9a227]" />
          </div>
          <p className="font-bold text-base text-gray-800">View Batches</p>
          <p className="text-xs text-gray-400 mt-1">Input piece data for assigned batches</p>
        </button>
        <button
          onClick={() => navigate('/statistics')}
          className="warm-card p-6 text-left hover-lift group"
        >
          <div className="w-12 h-12 rounded-2xl bg-[#5ac8fa]/10 flex items-center justify-center mb-4 group-hover:bg-[#5ac8fa]/20 transition-colors">
            <BarChart3 size={22} className="text-[#5ac8fa]" />
          </div>
          <p className="font-bold text-base text-gray-800">My Statistics</p>
          <p className="text-xs text-gray-400 mt-1">View your performance statistics</p>
        </button>
      </div>
    </div>
  );
}
