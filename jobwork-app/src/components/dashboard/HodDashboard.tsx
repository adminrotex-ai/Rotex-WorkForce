import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../../store';
import type { Batch, BatchStageRecord } from '../../types';
import { DEPARTMENT_LABELS } from '../../types';
import { getAccountingForHod, getHodBatchesInProgress, getUsersByCreator } from '../../database/operations';
import { formatCurrency } from '../../utils/helpers';
import { Package, Users, TrendingUp, TrendingDown, ChevronRight, ArrowRight } from 'lucide-react';

export default function HodDashboard() {
  const { currentUser } = useSelector((s: RootState) => s.auth);
  const navigate = useNavigate();
  const [myBatches, setMyBatches] = useState<{ batch: Batch; stageRecord: BatchStageRecord }[]>([]);
  const [accounting, setAccounting] = useState<{ hodOwesAdmin: number; adminOwesHod: number } | null>(null);
  const [userCount, setUserCount] = useState(0);

  useEffect(() => {
    if (currentUser) loadData();
  }, [currentUser]);

  const loadData = async () => {
    if (!currentUser) return;
    const [batches, acc, users] = await Promise.all([
      getHodBatchesInProgress(currentUser.id),
      getAccountingForHod(currentUser.id),
      getUsersByCreator(currentUser.id),
    ]);
    setMyBatches(batches);
    setAccounting(acc);
    setUserCount(users.length);
  };

  if (!currentUser) return null;

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Welcome in, {currentUser.firstName}</h1>
        <p className="text-gray-400 text-sm mt-1">{DEPARTMENT_LABELS[currentUser.department] || currentUser.department} Department</p>
      </div>

      {/* Hero Stats */}
      <div className="flex items-center gap-8 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#c9a227]/10 flex items-center justify-center">
            <Package size={18} className="text-[#c9a227]" />
          </div>
          <div>
            <p className="stat-number text-gray-900">{myBatches.length}</p>
            <p className="text-xs text-gray-400 font-medium">Active Batches</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#5ac8fa]/10 flex items-center justify-center">
            <Users size={18} className="text-[#5ac8fa]" />
          </div>
          <div>
            <p className="stat-number text-gray-900">{userCount}</p>
            <p className="text-xs text-gray-400 font-medium">My Users</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#34c759]/10 flex items-center justify-center">
            <TrendingUp size={18} className="text-[#34c759]" />
          </div>
          <div>
            <p className="stat-number text-gray-900">{formatCurrency(accounting?.adminOwesHod || 0)}</p>
            <p className="text-xs text-gray-400 font-medium">To Collect</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#ff9f0a]/10 flex items-center justify-center">
            <TrendingDown size={18} className="text-[#ff9f0a]" />
          </div>
          <div>
            <p className="stat-number text-gray-900">{formatCurrency(accounting?.hodOwesAdmin || 0)}</p>
            <p className="text-xs text-gray-400 font-medium">To Pay</p>
          </div>
        </div>
      </div>

      {/* Batches In Progress */}
      <div className="warm-card p-6">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">Batches In Progress</h3>
        {myBatches.length === 0 ? (
          <p className="text-gray-300 text-sm">No batches assigned to you currently</p>
        ) : (
          <div className="space-y-2">
            {myBatches.map(({ batch, stageRecord }) => (
              <div
                key={batch.id}
                className="flex items-center justify-between p-4 rounded-2xl hover:bg-[#f5f0e5] cursor-pointer transition-colors"
                onClick={() => navigate(`/batches/${batch.id}`)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#c9a227]/10 flex items-center justify-center">
                    <Package size={16} className="text-[#c9a227]" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-800">{batch.batchNumber}</p>
                    <p className="text-[11px] text-gray-400">
                      Received: {stageRecord.totalPiecesReceived} &bull; Processed: {stageRecord.piecesProcessed} &bull; Sent: {stageRecord.piecesSentForward}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-bold text-[#c9a227]">
                      {stageRecord.totalPiecesReceived - stageRecord.piecesProcessed} pending
                    </p>
                    <p className="text-[11px] text-gray-400">
                      {stageRecord.acceptedPieces} accepted / {stageRecord.rejectedPieces} rejected
                    </p>
                  </div>
                  <ChevronRight size={14} className="text-gray-300" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Accounting Summary */}
      {accounting && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="warm-card p-6" style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-green-500 font-semibold uppercase tracking-wider">To Collect from Admin</p>
              <button
                onClick={() => navigate('/accounting')}
                className="text-xs font-medium text-green-500 hover:text-green-600 flex items-center gap-1"
              >
                Details <ArrowRight size={12} />
              </button>
            </div>
            <p className="text-3xl font-extrabold text-[#34c759]">{formatCurrency(accounting.adminOwesHod)}</p>
            <p className="text-xs text-green-400 mt-1">For service costs</p>
          </div>
          <div className="warm-card p-6" style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-orange-500 font-semibold uppercase tracking-wider">To Pay Admin</p>
              <button
                onClick={() => navigate('/accounting')}
                className="text-xs font-medium text-orange-500 hover:text-orange-600 flex items-center gap-1"
              >
                Details <ArrowRight size={12} />
              </button>
            </div>
            <p className="text-3xl font-extrabold text-[#ff9f0a]">{formatCurrency(accounting.hodOwesAdmin)}</p>
            <p className="text-xs text-orange-400 mt-1">For consumer goods</p>
          </div>
        </div>
      )}
    </div>
  );
}
