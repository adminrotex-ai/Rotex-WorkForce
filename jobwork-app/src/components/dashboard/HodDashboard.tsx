import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../../store';
import type { Batch, BatchStageRecord } from '../../types';
import { DEPARTMENT_LABELS } from '../../types';
import { getAccountingForHod, getHodBatchesInProgress, getUsersByCreator } from '../../database/operations';
import { formatCurrency } from '../../utils/helpers';
import StatCard from '../common/StatCard';
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
      <div>
        <h1 className="text-2xl font-bold text-gray-800">HOD Dashboard</h1>
        <p className="text-gray-400 text-sm mt-0.5">{currentUser.firstName} &bull; {DEPARTMENT_LABELS[currentUser.department]}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Batches"
          value={myBatches.length}
          icon={<Package size={20} className="text-[#009688]" />}
          color="#009688"
        />
        <StatCard
          title="My Users"
          value={userCount}
          icon={<Users size={20} className="text-[#2196f3]" />}
          color="#2196f3"
        />
        <StatCard
          title="Admin Owes You"
          value={formatCurrency(accounting?.adminOwesHod || 0)}
          subtitle="For services"
          icon={<TrendingUp size={20} className="text-[#4caf50]" />}
          color="#4caf50"
        />
        <StatCard
          title="You Owe Admin"
          value={formatCurrency(accounting?.hodOwesAdmin || 0)}
          subtitle="For consumer goods"
          icon={<TrendingDown size={20} className="text-[#ff9800]" />}
          color="#ff9800"
        />
      </div>

      {/* Current Batches */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100/80">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Batches In Progress</h3>
        {myBatches.length === 0 ? (
          <p className="text-gray-300 text-sm">No batches assigned to you currently</p>
        ) : (
          <div className="space-y-2">
            {myBatches.map(({ batch, stageRecord }) => (
              <div
                key={batch.id}
                className="flex items-center justify-between p-4 rounded-xl border border-gray-100/60 hover:bg-gray-50/80 cursor-pointer transition-colors"
                onClick={() => navigate(`/batches/${batch.id}`)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#009688]/8 flex items-center justify-center">
                    <Package size={16} className="text-[#009688]" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-gray-700">{batch.batchNumber}</p>
                    <p className="text-[11px] text-gray-400">
                      Received: {stageRecord.totalPiecesReceived} &bull; Processed: {stageRecord.piecesProcessed} &bull; Sent: {stageRecord.piecesSentForward}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[#009688]">
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

      {/* Accounting Quick View */}
      {accounting && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100/80">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Accounting Summary</h3>
            <button
              onClick={() => navigate('/accounting')}
              className="text-xs font-medium text-[#009688] hover:underline flex items-center gap-1"
            >
              View Details <ArrowRight size={12} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-green-50/80 border border-green-100/50">
              <p className="text-[10px] text-green-500 font-semibold uppercase tracking-wider">Admin Owes You</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(accounting.adminOwesHod)}</p>
              <p className="text-[11px] text-green-400 mt-1">For service costs</p>
            </div>
            <div className="p-4 rounded-xl bg-orange-50/80 border border-orange-100/50">
              <p className="text-[10px] text-orange-500 font-semibold uppercase tracking-wider">You Owe Admin</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">{formatCurrency(accounting.hodOwesAdmin)}</p>
              <p className="text-[11px] text-orange-400 mt-1">For consumer goods</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
