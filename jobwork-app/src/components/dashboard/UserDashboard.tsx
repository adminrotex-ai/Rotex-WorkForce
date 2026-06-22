import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../../store';
import type { PieceEntry } from '../../types';
import { DEPARTMENT_LABELS } from '../../types';
import { getPieceEntriesByUser } from '../../database/operations';
import StatCard from '../common/StatCard';
import { XCircle, Package, BarChart3 } from 'lucide-react';

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
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-0.5">{currentUser.firstName} &bull; {DEPARTMENT_LABELS[currentUser.department]}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Pieces Worked"
          value={total}
          icon={<Package size={20} className="text-[#1a237e]" />}
          color="#1a237e"
        />
        <StatCard
          title="Accepted Pieces"
          value={totalAccepted}
          progress={acceptRate}
          color="#4caf50"
        />
        <StatCard
          title="Rejected Pieces"
          value={totalRejected}
          subtitle={total > 0 ? `${((totalRejected / total) * 100).toFixed(1)}% rate` : ''}
          icon={<XCircle size={20} className="text-[#f44336]" />}
          color="#f44336"
        />
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100/80">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/batches')}
            className="p-5 rounded-xl border border-gray-100 hover:bg-gray-50/80 hover:border-[#1a237e]/20 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#1a237e]/8 flex items-center justify-center mb-3 group-hover:bg-[#1a237e]/15 transition-colors">
              <Package size={20} className="text-[#1a237e]" />
            </div>
            <p className="font-semibold text-sm text-gray-700">View Batches</p>
            <p className="text-xs text-gray-400 mt-1">Input piece data for assigned batches</p>
          </button>
          <button
            onClick={() => navigate('/statistics')}
            className="p-5 rounded-xl border border-gray-100 hover:bg-gray-50/80 hover:border-[#2196f3]/20 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#2196f3]/8 flex items-center justify-center mb-3 group-hover:bg-[#2196f3]/15 transition-colors">
              <BarChart3 size={20} className="text-[#2196f3]" />
            </div>
            <p className="font-semibold text-sm text-gray-700">My Statistics</p>
            <p className="text-xs text-gray-400 mt-1">View your performance statistics</p>
          </button>
        </div>
      </div>
    </div>
  );
}
