import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../../store';
import type { Batch, User } from '../../types';
import { DEPARTMENT_LABELS } from '../../types';
import { getActiveBatches, getActiveUsers, getAllAccountingSummary, getPeriodStatistics } from '../../database/operations';
import { formatCurrency } from '../../utils/helpers';
import StatCard from '../common/StatCard';
import { Package, Users, TrendingUp, TrendingDown } from 'lucide-react';

export default function AdminDashboard() {
  const { currentUser } = useSelector((s: RootState) => s.auth);
  const navigate = useNavigate();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [accounting, setAccounting] = useState<Awaited<ReturnType<typeof getAllAccountingSummary>>>([]);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getPeriodStatistics>> | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [b, u, a, s] = await Promise.all([
      getActiveBatches(),
      getActiveUsers(),
      getAllAccountingSummary(),
      getPeriodStatistics('month'),
    ]);
    setBatches(b);
    setUsers(u);
    setAccounting(a);
    setStats(s);
  };

  const totalOwedToAdmin = accounting.reduce((sum, a) => sum + a.hodOwesAdmin, 0);
  const totalOwedByAdmin = accounting.reduce((sum, a) => sum + a.adminOwesHod, 0);
  const activeBatches = batches.filter(b => b.status !== 'completed');
  const completedBatches = batches.filter(b => b.status === 'completed');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#001f3f' }}>Admin Dashboard</h1>
          <p className="text-gray-500 text-sm">Welcome back, {currentUser?.firstName}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Batches"
          value={activeBatches.length}
          subtitle={`${completedBatches.length} completed`}
          icon={<Package size={20} style={{ color: '#001f3f' }} />}
        />
        <StatCard
          title="Total Users"
          value={users.length}
          subtitle={`${users.filter(u => u.role === 'hod').length} HODs`}
          icon={<Users size={20} style={{ color: '#0074d9' }} />}
          color="#0074d9"
        />
        <StatCard
          title="Owed to You"
          value={formatCurrency(totalOwedToAdmin)}
          subtitle="From all HODs"
          icon={<TrendingUp size={20} style={{ color: '#2ecc40' }} />}
          color="#2ecc40"
        />
        <StatCard
          title="You Owe"
          value={formatCurrency(totalOwedByAdmin)}
          subtitle="To all HODs"
          icon={<TrendingDown size={20} style={{ color: '#ff851b' }} />}
          color="#ff851b"
        />
      </div>

      {/* Monthly Stats */}
      {stats && (
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100" style={{ borderRadius: '8px' }}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: '#001f3f' }}>This Month's Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase">Batches</p>
              <p className="text-xl font-bold" style={{ color: '#001f3f' }}>{stats.batchCount}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Total Pieces</p>
              <p className="text-xl font-bold" style={{ color: '#001f3f' }}>{stats.totalPieces}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Consumer Goods Cost</p>
              <p className="text-xl font-bold" style={{ color: '#0074d9' }}>{formatCurrency(stats.totalConsumerCost)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Service Cost</p>
              <p className="text-xl font-bold" style={{ color: '#ff851b' }}>{formatCurrency(stats.totalServiceCost)}</p>
            </div>
          </div>
        </div>
      )}

      {/* HOD Accounting Summary */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100" style={{ borderRadius: '8px' }}>
        <h2 className="text-lg font-semibold mb-4" style={{ color: '#001f3f' }}>HOD Accounting</h2>
        {accounting.length === 0 ? (
          <p className="text-gray-400 text-sm">No HODs created yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-3 font-medium">HOD Name</th>
                  <th className="pb-3 font-medium">Department</th>
                  <th className="pb-3 font-medium text-right">Owes You</th>
                  <th className="pb-3 font-medium text-right">You Owe</th>
                  <th className="pb-3 font-medium text-right">Net</th>
                </tr>
              </thead>
              <tbody>
                {accounting.map(a => {
                  const net = a.hodOwesAdmin - a.adminOwesHod;
                  return (
                    <tr key={a.hodId} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/accounting/${a.hodId}`)}>
                      <td className="py-3 font-medium">{a.hodName}</td>
                      <td className="py-3 text-gray-500">{DEPARTMENT_LABELS[a.department]}</td>
                      <td className="py-3 text-right text-green-600">{formatCurrency(a.hodOwesAdmin)}</td>
                      <td className="py-3 text-right text-orange-500">{formatCurrency(a.adminOwesHod)}</td>
                      <td className={`py-3 text-right font-semibold ${net >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {net >= 0 ? '+' : ''}{formatCurrency(net)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Batches */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100" style={{ borderRadius: '8px' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: '#001f3f' }}>Recent Batches</h2>
          <button
            onClick={() => navigate('/batches')}
            className="text-sm font-medium hover:underline"
            style={{ color: '#0074d9' }}
          >
            View All
          </button>
        </div>
        {batches.length === 0 ? (
          <p className="text-gray-400 text-sm">No batches created yet</p>
        ) : (
          <div className="space-y-2">
            {batches.slice(0, 5).map(batch => (
              <div
                key={batch.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border border-gray-100"
                onClick={() => navigate(`/batches/${batch.id}`)}
              >
                <div>
                  <p className="font-medium text-sm">{batch.batchNumber}</p>
                  <p className="text-xs text-gray-400">{batch.totalPieces} pieces</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    batch.status === 'completed' ? 'bg-green-100 text-green-700' :
                    batch.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {batch.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
