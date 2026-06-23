import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../../store';
import type { Batch, BatchStageRecord } from '../../types';
import { DEPARTMENT_LABELS } from '../../types';
import { getAccountingForHod, getHodBatchesInProgress, getUsersByCreator, getPieceEntriesByUser } from '../../database/operations';
import { formatCurrency } from '../../utils/helpers';
import { Package, Users, TrendingUp, TrendingDown } from 'lucide-react';

export default function HodDashboard() {
  const { currentUser } = useSelector((s: RootState) => s.auth);
  const navigate = useNavigate();
  const [myBatches, setMyBatches] = useState<{ batch: Batch; stageRecord: BatchStageRecord }[]>([]);
  const [accounting, setAccounting] = useState<{ hodOwesAdmin: number; adminOwesHod: number } | null>(null);
  const [userCount, setUserCount] = useState(0);
  const [stats, setStats] = useState({ totalPieces: 0, accepted: 0, rejected: 0, batchesHandled: 0 });

  useEffect(() => {
    if (currentUser) loadData();
  }, [currentUser]);

  const loadData = async () => {
    if (!currentUser) return;
    const [batches, acc, users, entries] = await Promise.all([
      getHodBatchesInProgress(currentUser.id),
      getAccountingForHod(currentUser.id),
      getUsersByCreator(currentUser.id),
      getPieceEntriesByUser(currentUser.id),
    ]);
    setMyBatches(batches);
    setAccounting(acc);
    setUserCount(users.length);
    const totalAccepted = entries.reduce((s, e) => s + e.acceptedPieces, 0);
    const totalRejected = entries.reduce((s, e) => s + e.rejectedPieces, 0);
    const total = totalAccepted + totalRejected;
    setStats({
      totalPieces: total,
      accepted: totalAccepted,
      rejected: totalRejected,
      batchesHandled: new Set(entries.map(e => e.batchId)).size,
    });
  };

  if (!currentUser) return null;

  const acceptRate = stats.totalPieces > 0 ? ((stats.accepted / stats.totalPieces) * 100).toFixed(0) : '0';
  const rejectRate = stats.totalPieces > 0 ? ((stats.rejected / stats.totalPieces) * 100).toFixed(0) : '0';

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-light text-gray-900">Welcome, {currentUser.firstName}</h1>
        <p className="text-sm text-gray-400 mt-1">HOD · {DEPARTMENT_LABELS[currentUser.department] || currentUser.department} Department</p>
      </div>

      <div className="grid grid-cols-4 gap-5 mb-8">
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gold-300 flex items-center justify-center"><Package size={22} className="text-dark-800" /></div>
          <div>
            <p className="text-2xl font-light text-gray-900">{myBatches.length}</p>
            <p className="text-sm text-gray-600">Active Batches</p>
          </div>
        </div>
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-200 flex items-center justify-center"><Users size={22} className="text-dark-800" /></div>
          <div>
            <p className="text-2xl font-light text-gray-900">{userCount}</p>
            <p className="text-sm text-gray-600">My Users</p>
          </div>
        </div>
        <div className="bg-emerald-50 rounded-2xl p-5">
          <p className="text-sm text-emerald-600 flex items-center gap-1 mb-1"><TrendingUp size={14} /> To Collect</p>
          <p className="text-2xl font-light text-emerald-700">{formatCurrency(accounting?.adminOwesHod || 0)}</p>
          <p className="text-[11px] text-emerald-500">Admin owes you</p>
        </div>
        <div className="bg-red-50 rounded-2xl p-5">
          <p className="text-sm text-red-500 flex items-center gap-1 mb-1"><TrendingDown size={14} /> To Pay</p>
          <p className="text-2xl font-light text-red-600">{formatCurrency(accounting?.hodOwesAdmin || 0)}</p>
          <p className="text-[11px] text-red-400">You owe admin</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5 mb-8">
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Active Batches</h2>
          <div className="space-y-3">
            {myBatches.map(({ batch, stageRecord }) => (
              <div key={batch.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-white/40 rounded-lg px-2 -mx-2" onClick={() => navigate(`/batches/${batch.id}`)}>
                <div>
                  <p className="text-sm font-medium text-gray-900">{batch.batchNumber}</p>
                  <p className="text-[11px] text-gray-400">{stageRecord.totalPiecesReceived} received · {stageRecord.acceptedPieces} accepted</p>
                </div>
                <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-gold-300 text-dark-800">{stageRecord.status.replace('_', ' ')}</span>
              </div>
            ))}
            {myBatches.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No active batches</p>}
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">My Performance</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-light text-gray-900">{stats.totalPieces}</p>
              <p className="text-[11px] text-gray-400">Pieces Handled</p>
            </div>
            <div>
              <p className="text-2xl font-light text-emerald-600">{acceptRate}%</p>
              <p className="text-[11px] text-gray-400">Accept Rate</p>
            </div>
            <div>
              <p className="text-2xl font-light text-red-500">{rejectRate}%</p>
              <p className="text-[11px] text-gray-400">Reject Rate</p>
            </div>
            <div>
              <p className="text-2xl font-light text-gray-900">{stats.batchesHandled}</p>
              <p className="text-[11px] text-gray-400">Batches Done</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
