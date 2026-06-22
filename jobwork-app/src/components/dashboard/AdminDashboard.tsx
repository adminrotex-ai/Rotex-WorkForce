import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../../store';
import type { Batch, User } from '../../types';
import { DEPARTMENT_LABELS } from '../../types';
import { getActiveBatches, getActiveUsers, getAllAccountingSummary, getPeriodStatistics } from '../../database/operations';
import { formatCurrency } from '../../utils/helpers';
import StatCard from '../common/StatCard';
import { Package, Users, TrendingUp, TrendingDown, ArrowRight, ChevronRight } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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

  const totalBatches = activeBatches.length + completedBatches.length;
  const completionRate = totalBatches > 0 ? (completedBatches.length / totalBatches) * 100 : 0;

  const hodUsers = users.filter(u => u.role === 'hod');
  const deptData = Object.entries(DEPARTMENT_LABELS).map(([key, label]) => ({
    name: label.replace(' Department', ''),
    users: users.filter(u => u.department === key).length,
  })).filter(d => d.users > 0);

  const batchStatusData = [
    { name: 'Active', value: activeBatches.length, color: '#1a237e' },
    { name: 'Completed', value: completedBatches.length, color: '#4caf50' },
  ].filter(d => d.value > 0);

  const accountingChartData = accounting.map(a => ({
    name: a.hodName.split(' ')[0],
    owes: a.hodOwesAdmin,
    owed: a.adminOwesHod,
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-0.5">Welcome back, {currentUser?.firstName}</p>
        </div>
        <button
          onClick={() => navigate('/batches')}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#1a237e] to-[#0d47a1] text-white rounded-xl text-sm font-medium hover:shadow-lg hover:shadow-indigo-200 transition-all"
        >
          <Package size={16} />
          New Batch
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Active Batches"
          value={activeBatches.length}
          subtitle={`${completedBatches.length} completed`}
          icon={<Package size={20} className="text-[#1a237e]" />}
          color="#1a237e"
        />
        <StatCard
          title="Total Users"
          value={users.length}
          subtitle={`${hodUsers.length} HODs`}
          icon={<Users size={20} className="text-[#2196f3]" />}
          color="#2196f3"
        />
        <StatCard
          title="Owed to You"
          value={formatCurrency(totalOwedToAdmin)}
          subtitle="From all HODs"
          icon={<TrendingUp size={20} className="text-[#4caf50]" />}
          color="#4caf50"
        />
        <StatCard
          title="You Owe"
          value={formatCurrency(totalOwedByAdmin)}
          subtitle="To all HODs"
          icon={<TrendingDown size={20} className="text-[#ff9800]" />}
          color="#ff9800"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Batch Status Donut */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100/80">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Batch Overview</h3>
          {batchStatusData.length > 0 ? (
            <div className="flex items-center gap-4">
              <div className="w-32 h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={batchStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={55}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {batchStatusData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} strokeWidth={0} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                {batchStatusData.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-gray-500">{item.name}</span>
                    <span className="text-xs font-bold text-gray-700">{item.value}</span>
                  </div>
                ))}
                <div className="pt-1 border-t border-gray-100">
                  <span className="text-xs text-gray-400">Completion</span>
                  <p className="text-lg font-bold text-[#1a237e]">{completionRate.toFixed(0)}%</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-gray-300 text-sm">No batches yet</div>
          )}
        </div>

        {/* Department Users Bar Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100/80">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Users by Department</h3>
          {deptData.length > 0 ? (
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={deptData} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9e9e9e' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9e9e9e' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                />
                <Bar dataKey="users" fill="#1a237e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-32 flex items-center justify-center text-gray-300 text-sm">No users yet</div>
          )}
        </div>

        {/* Monthly Summary */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100/80">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">This Month</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 uppercase tracking-wider">Batches</span>
              <span className="text-lg font-bold text-gray-800">{stats?.batchCount || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 uppercase tracking-wider">Total Pieces</span>
              <span className="text-lg font-bold text-gray-800">{stats?.totalPieces || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 uppercase tracking-wider">Consumer Cost</span>
              <span className="text-lg font-bold text-[#2196f3]">{formatCurrency(stats?.totalConsumerCost || 0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 uppercase tracking-wider">Service Cost</span>
              <span className="text-lg font-bold text-[#ff9800]">{formatCurrency(stats?.totalServiceCost || 0)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* HOD Accounting & Accounting Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Accounting Chart */}
        {accountingChartData.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100/80">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">HOD Accounting Overview</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={accountingChartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9e9e9e' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9e9e9e' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                  formatter={(value) => formatCurrency(Number(value))}
                />
                <Bar dataKey="owes" name="HOD Owes You" fill="#4caf50" radius={[4, 4, 0, 0]} barSize={16} />
                <Bar dataKey="owed" name="You Owe HOD" fill="#ff9800" radius={[4, 4, 0, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* HOD Accounting Table */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100/80">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">HOD Balances</h3>
            <button
              onClick={() => navigate('/accounting')}
              className="text-xs font-medium text-[#1a237e] hover:underline flex items-center gap-1"
            >
              View All <ArrowRight size={12} />
            </button>
          </div>
          {accounting.length === 0 ? (
            <p className="text-gray-300 text-sm">No HODs created yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="pb-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">HOD</th>
                    <th className="pb-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-right">Owes You</th>
                    <th className="pb-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-right">You Owe</th>
                    <th className="pb-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-right">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {accounting.map(a => {
                    const net = a.hodOwesAdmin - a.adminOwesHod;
                    return (
                      <tr key={a.hodId} className="border-t border-gray-50 hover:bg-gray-50/50 cursor-pointer" onClick={() => navigate(`/accounting/${a.hodId}`)}>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-[#1a237e]/10 flex items-center justify-center text-[#1a237e] text-xs font-bold">
                              {a.hodName[0]}
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-700">{a.hodName}</p>
                              <p className="text-[10px] text-gray-400">{DEPARTMENT_LABELS[a.department]}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 text-right text-xs font-medium text-green-600">{formatCurrency(a.hodOwesAdmin)}</td>
                        <td className="py-3 text-right text-xs font-medium text-orange-500">{formatCurrency(a.adminOwesHod)}</td>
                        <td className={`py-3 text-right text-xs font-bold ${net >= 0 ? 'text-green-600' : 'text-red-500'}`}>
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
      </div>

      {/* Recent Batches */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100/80">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">Recent Batches</h3>
          <button
            onClick={() => navigate('/batches')}
            className="text-xs font-medium text-[#1a237e] hover:underline flex items-center gap-1"
          >
            View All <ArrowRight size={12} />
          </button>
        </div>
        {batches.length === 0 ? (
          <p className="text-gray-300 text-sm">No batches created yet</p>
        ) : (
          <div className="space-y-3">
            {batches.slice(0, 5).map(batch => (
              <div
                key={batch.id}
                className="flex items-center justify-between p-3.5 rounded-xl hover:bg-gray-50/80 cursor-pointer transition-colors border border-gray-100/60"
                onClick={() => navigate(`/batches/${batch.id}`)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#1a237e]/8 flex items-center justify-center">
                    <Package size={16} className="text-[#1a237e]" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-gray-700">{batch.batchNumber}</p>
                    <p className="text-[11px] text-gray-400">{batch.totalPieces} pieces &bull; {batch.sizes.join(', ')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[11px] px-3 py-1 rounded-full font-medium ${
                    batch.status === 'completed' ? 'bg-green-50 text-green-600' :
                    batch.status === 'in_progress' ? 'bg-blue-50 text-blue-600' :
                    'bg-gray-50 text-gray-600'
                  }`}>
                    {batch.status.replace('_', ' ')}
                  </span>
                  <ChevronRight size={14} className="text-gray-300" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
