import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../../store';
import type { Batch, BatchStageRecord } from '../../types';
import { DEPARTMENT_LABELS } from '../../types';
import { getAccountingForHod, getHodBatchesInProgress, getUsersByCreator } from '../../database/operations';
import { formatCurrency } from '../../utils/helpers';
import StatCard from '../common/StatCard';
import { Package, Users, TrendingUp, TrendingDown } from 'lucide-react';

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
        <h1 className="text-2xl font-bold" style={{ color: '#001f3f' }}>HOD Dashboard</h1>
        <p className="text-gray-500 text-sm">{currentUser.firstName} - {DEPARTMENT_LABELS[currentUser.department]}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Batches"
          value={myBatches.length}
          icon={<Package size={20} style={{ color: '#001f3f' }} />}
        />
        <StatCard
          title="My Users"
          value={userCount}
          icon={<Users size={20} style={{ color: '#0074d9' }} />}
          color="#0074d9"
        />
        <StatCard
          title="Admin Owes You"
          value={formatCurrency(accounting?.adminOwesHod || 0)}
          subtitle="For services"
          icon={<TrendingUp size={20} style={{ color: '#2ecc40' }} />}
          color="#2ecc40"
        />
        <StatCard
          title="You Owe Admin"
          value={formatCurrency(accounting?.hodOwesAdmin || 0)}
          subtitle="For consumer goods"
          icon={<TrendingDown size={20} style={{ color: '#ff851b' }} />}
          color="#ff851b"
        />
      </div>

      {/* Current Batches */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100" style={{ borderRadius: '8px' }}>
        <h2 className="text-lg font-semibold mb-4" style={{ color: '#001f3f' }}>Batches In Progress</h2>
        {myBatches.length === 0 ? (
          <p className="text-gray-400 text-sm">No batches assigned to you currently</p>
        ) : (
          <div className="space-y-3">
            {myBatches.map(({ batch, stageRecord }) => (
              <div
                key={batch.id}
                className="flex items-center justify-between p-4 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => navigate(`/batches/${batch.id}`)}
              >
                <div>
                  <p className="font-medium">{batch.batchNumber}</p>
                  <p className="text-xs text-gray-400">
                    Received: {stageRecord.totalPiecesReceived} | Processed: {stageRecord.piecesProcessed} | Sent: {stageRecord.piecesSentForward}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium" style={{ color: '#001f3f' }}>
                    {stageRecord.totalPiecesReceived - stageRecord.piecesProcessed} pending
                  </p>
                  <p className="text-xs text-gray-400">
                    {stageRecord.acceptedPieces} accepted / {stageRecord.rejectedPieces} rejected
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Accounting Quick View */}
      {accounting && (
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100" style={{ borderRadius: '8px' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold" style={{ color: '#001f3f' }}>Accounting Summary</h2>
            <button
              onClick={() => navigate('/accounting')}
              className="text-sm font-medium hover:underline"
              style={{ color: '#0074d9' }}
            >
              View Details
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-green-50 border border-green-100">
              <p className="text-xs text-green-600 font-medium uppercase">Admin Owes You</p>
              <p className="text-2xl font-bold text-green-700">{formatCurrency(accounting.adminOwesHod)}</p>
              <p className="text-xs text-green-500 mt-1">For service costs</p>
            </div>
            <div className="p-4 rounded-lg bg-orange-50 border border-orange-100">
              <p className="text-xs text-orange-600 font-medium uppercase">You Owe Admin</p>
              <p className="text-2xl font-bold text-orange-700">{formatCurrency(accounting.hodOwesAdmin)}</p>
              <p className="text-xs text-orange-500 mt-1">For consumer goods</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
