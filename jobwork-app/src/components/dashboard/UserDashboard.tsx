import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../../store';
import type { PieceEntry } from '../../types';
import { getPieceEntriesByUser } from '../../database/operations';

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
  const acceptRate = total > 0 ? ((totalAccepted / total) * 100).toFixed(0) : '0';
  const rejectRate = total > 0 ? ((totalRejected / total) * 100).toFixed(0) : '0';
  const batchesHandled = new Set(entries.map(e => e.batchId)).size;

  return (
    <div>
      <h1 className="text-2xl font-light text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 text-center">
          <p className="text-3xl font-light text-gray-900">{total}</p>
          <p className="text-sm text-gray-400">Total Pieces</p>
        </div>
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 text-center">
          <p className="text-3xl font-light text-emerald-600">{acceptRate}%</p>
          <p className="text-sm text-gray-400">Accept Rate</p>
        </div>
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 text-center">
          <p className="text-3xl font-light text-red-500">{rejectRate}%</p>
          <p className="text-sm text-gray-400">Reject Rate</p>
        </div>
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 text-center">
          <p className="text-3xl font-light text-gray-900">{batchesHandled}</p>
          <p className="text-sm text-gray-400">Batches</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 cursor-pointer hover:bg-white/80 transition-colors" onClick={() => navigate('/batches')}>
          <p className="text-2xl font-light text-gray-900">{totalAccepted}</p>
          <p className="text-sm text-gray-400">Pieces Accepted</p>
        </div>
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 cursor-pointer hover:bg-white/80 transition-colors" onClick={() => navigate('/statistics')}>
          <p className="text-2xl font-light text-gray-900">{totalRejected}</p>
          <p className="text-sm text-gray-400">Pieces Rejected</p>
        </div>
      </div>
    </div>
  );
}
