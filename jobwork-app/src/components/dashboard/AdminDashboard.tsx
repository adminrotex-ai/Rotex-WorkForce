import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../../store';
import type { Batch, User } from '../../types';
import { DEPARTMENT_LABELS } from '../../types';
import { getActiveBatches, getActiveUsers, getAllAccountingSummary, getPeriodStatistics } from '../../database/operations';
import { formatCurrency } from '../../utils/helpers';
import { Package, Users, TrendingUp, ArrowRight, ChevronRight, BarChart3, DollarSign } from 'lucide-react';
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
    { name: 'Active', value: activeBatches.length, color: '#c9a227' },
    { name: 'Completed', value: completedBatches.length, color: '#34c759' },
  ].filter(d => d.value > 0);

  const accountingChartData = accounting.map(a => ({
    name: a.hodName.split(' ')[0],
    owes: a.hodOwesAdmin,
    owed: a.adminOwesHod,
  }));

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Welcome in, {currentUser?.firstName}</h1>
          <p className="text-gray-400 text-sm mt-1">Here's your workforce overview</p>
        </div>
        <button
          onClick={() => navigate('/batches')}
          className="hidden md:flex items-center gap-2 px-5 py-2.5 bg-[#2d2d2d] text-white rounded-full text-sm font-medium hover:bg-[#1a1a1a] transition-all"
        >
          <Package size={16} />
          New Batch
        </button>
      </div>

      {/* Hero Stats Row */}
      <div className="flex items-center gap-8 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#c9a227]/10 flex items-center justify-center">
            <Package size={18} className="text-[#c9a227]" />
          </div>
          <div>
            <p className="stat-number text-gray-900">{activeBatches.length}</p>
            <p className="text-xs text-gray-400 font-medium">Active Batches</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#5ac8fa]/10 flex items-center justify-center">
            <Users size={18} className="text-[#5ac8fa]" />
          </div>
          <div>
            <p className="stat-number text-gray-900">{users.length}</p>
            <p className="text-xs text-gray-400 font-medium">Employees</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#34c759]/10 flex items-center justify-center">
            <TrendingUp size={18} className="text-[#34c759]" />
          </div>
          <div>
            <p className="stat-number text-gray-900">{hodUsers.length}</p>
            <p className="text-xs text-gray-400 font-medium">HODs</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#ff9f0a]/10 flex items-center justify-center">
            <BarChart3 size={18} className="text-[#ff9f0a]" />
          </div>
          <div>
            <p className="stat-number text-gray-900">{completedBatches.length}</p>
            <p className="text-xs text-gray-400 font-medium">Completed</p>
          </div>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Financial Summary Card */}
        <div className="warm-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-gray-800">Financial Overview</h3>
            <div className="p-2 rounded-xl bg-[#34c759]/10">
              <DollarSign size={14} className="text-[#34c759]" />
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">To Collect</p>
              <p className="text-2xl font-extrabold text-[#34c759] mt-1">{formatCurrency(totalOwedToAdmin)}</p>
              <p className="text-xs text-gray-400 mt-0.5">From all HODs</p>
            </div>
            <div className="h-px bg-gray-100" />
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">To Pay</p>
              <p className="text-2xl font-extrabold text-[#ff9f0a] mt-1">{formatCurrency(totalOwedByAdmin)}</p>
              <p className="text-xs text-gray-400 mt-0.5">To all HODs</p>
            </div>
          </div>
        </div>

        {/* Batch Overview Donut */}
        <div className="warm-card p-6">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Batch Overview</h3>
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
                    <span className="text-xs font-bold text-gray-800">{item.value}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-gray-100">
                  <span className="text-xs text-gray-400">Completion</span>
                  <p className="text-xl font-extrabold text-gray-900">{completionRate.toFixed(0)}%</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-gray-300 text-sm">No batches yet</div>
          )}
        </div>

        {/* This Month Stats */}
        <div className="warm-card p-6">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">This Month</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">Batches</span>
              <span className="text-xl font-extrabold text-gray-900">{stats?.batchCount || 0}</span>
            </div>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#c9a227] rounded-full" style={{ width: `${Math.min((stats?.batchCount || 0) * 10, 100)}%` }} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">Total Pieces</span>
              <span className="text-xl font-extrabold text-gray-900">{stats?.totalPieces || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">Consumer Cost</span>
              <span className="text-lg font-bold text-[#5ac8fa]">{formatCurrency(stats?.totalConsumerCost || 0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">Service Cost</span>
              <span className="text-lg font-bold text-[#ff9f0a]">{formatCurrency(stats?.totalServiceCost || 0)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Department Users Chart */}
        <div className="warm-card p-6">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Users by Department</h3>
          {deptData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={deptData} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0ead6" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#999' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#999' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                />
                <Bar dataKey="users" fill="#c9a227" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-gray-300 text-sm">No users yet</div>
          )}
        </div>

        {/* Accounting Chart */}
        {accountingChartData.length > 0 ? (
          <div className="warm-card p-6">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">HOD Accounting</h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={accountingChartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0ead6" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#999' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#999' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                  formatter={(value) => formatCurrency(Number(value))}
                />
                <Bar dataKey="owes" name="To Collect" fill="#34c759" radius={[6, 6, 0, 0]} barSize={16} />
                <Bar dataKey="owed" name="To Pay" fill="#ff9f0a" radius={[6, 6, 0, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="warm-card p-6">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">HOD Accounting</h3>
            <div className="h-40 flex items-center justify-center text-gray-300 text-sm">No accounting data yet</div>
          </div>
        )}
      </div>

      {/* HOD Balances - Dark Card */}
      <div className="dark-card p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold text-white/90">HOD Balances</h3>
          <button
            onClick={() => navigate('/accounting')}
            className="text-xs font-medium text-[#c9a227] hover:text-[#e8d48b] flex items-center gap-1 transition-colors"
          >
            View All <ArrowRight size={12} />
          </button>
        </div>
        {accounting.length === 0 ? (
          <p className="text-white/40 text-sm">No HODs created yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="pb-3 text-[10px] font-semibold text-white/40 uppercase tracking-wider">HOD</th>
                  <th className="pb-3 text-[10px] font-semibold text-white/40 uppercase tracking-wider text-right">To Collect</th>
                  <th className="pb-3 text-[10px] font-semibold text-white/40 uppercase tracking-wider text-right">To Pay</th>
                  <th className="pb-3 text-[10px] font-semibold text-white/40 uppercase tracking-wider text-right">Net</th>
                </tr>
              </thead>
              <tbody>
                {accounting.map(a => {
                  const net = a.hodOwesAdmin - a.adminOwesHod;
                  return (
                    <tr key={a.hodId} className="border-t border-white/10 hover:bg-white/5 cursor-pointer transition-colors" onClick={() => navigate(`/accounting/${a.hodId}`)}>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#c9a227]/20 flex items-center justify-center text-[#c9a227] text-xs font-bold">
                            {a.hodName[0]}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-white/90">{a.hodName}</p>
                            <p className="text-[10px] text-white/40">{DEPARTMENT_LABELS[a.department] || a.department}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-right text-xs font-medium text-[#34c759]">{formatCurrency(a.hodOwesAdmin)}</td>
                      <td className="py-3 text-right text-xs font-medium text-[#ff9f0a]">{formatCurrency(a.adminOwesHod)}</td>
                      <td className={`py-3 text-right text-xs font-bold ${net >= 0 ? 'text-[#34c759]' : 'text-[#ff3b30]'}`}>
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
      <div className="warm-card p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold text-gray-800">Recent Batches</h3>
          <button
            onClick={() => navigate('/batches')}
            className="text-xs font-medium text-[#c9a227] hover:text-[#a88520] flex items-center gap-1 transition-colors"
          >
            View All <ArrowRight size={12} />
          </button>
        </div>
        {batches.length === 0 ? (
          <p className="text-gray-300 text-sm">No batches created yet</p>
        ) : (
          <div className="space-y-2">
            {batches.slice(0, 5).map(batch => (
              <div
                key={batch.id}
                className="flex items-center justify-between p-3.5 rounded-2xl hover:bg-[#f5f0e5] cursor-pointer transition-colors"
                onClick={() => navigate(`/batches/${batch.id}`)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#c9a227]/10 flex items-center justify-center">
                    <Package size={16} className="text-[#c9a227]" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-800">{batch.batchNumber}</p>
                    <p className="text-[11px] text-gray-400">{batch.totalPieces} pieces &bull; {batch.sizes.join(', ')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[11px] px-3 py-1.5 rounded-full font-semibold ${
                    batch.status === 'completed' ? 'bg-[#34c759]/10 text-[#34c759]' :
                    batch.status === 'in_progress' ? 'bg-[#c9a227]/10 text-[#c9a227]' :
                    'bg-gray-100 text-gray-500'
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
