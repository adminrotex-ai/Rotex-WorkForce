import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../../store';
import type { PieceEntry } from '../../types';
import { DEPARTMENT_LABELS } from '../../types';
import { getPieceEntriesByUser } from '../../database/operations';
import StatCard from '../common/StatCard';
import { CheckCircle, XCircle, Package } from 'lucide-react';

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#001f3f' }}>Dashboard</h1>
        <p className="text-gray-500 text-sm">{currentUser.firstName} - {DEPARTMENT_LABELS[currentUser.department]}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Pieces Worked"
          value={total}
          icon={<Package size={20} style={{ color: '#001f3f' }} />}
        />
        <StatCard
          title="Accepted Pieces"
          value={totalAccepted}
          subtitle={total > 0 ? `${((totalAccepted / total) * 100).toFixed(1)}% rate` : ''}
          icon={<CheckCircle size={20} style={{ color: '#2ecc40' }} />}
          color="#2ecc40"
        />
        <StatCard
          title="Rejected Pieces"
          value={totalRejected}
          subtitle={total > 0 ? `${((totalRejected / total) * 100).toFixed(1)}% rate` : ''}
          icon={<XCircle size={20} style={{ color: '#ff4136' }} />}
          color="#ff4136"
        />
      </div>

      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100" style={{ borderRadius: '8px' }}>
        <h2 className="text-lg font-semibold mb-4" style={{ color: '#001f3f' }}>Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/batches')}
            className="p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-left"
          >
            <Package size={20} style={{ color: '#001f3f' }} />
            <p className="font-medium mt-2">View Batches</p>
            <p className="text-xs text-gray-400">Input piece data for assigned batches</p>
          </button>
          <button
            onClick={() => navigate('/statistics')}
            className="p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-left"
          >
            <CheckCircle size={20} style={{ color: '#0074d9' }} />
            <p className="font-medium mt-2">My Statistics</p>
            <p className="text-xs text-gray-400">View your performance statistics</p>
          </button>
        </div>
      </div>
    </div>
  );
}
