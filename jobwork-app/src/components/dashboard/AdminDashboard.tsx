import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../../store';
import type { Batch, User } from '../../types';
import { DEPARTMENT_LABELS } from '../../types';
import { getActiveBatches, getActiveUsers, getAllAccountingSummary, getPeriodStatistics } from '../../database/operations';
import { formatCurrency } from '../../utils/helpers';
import { WidgetCard, PillTabs, SegmentedProgress, PageHeader } from '../common/Widgets';
import { Package, Users, TrendingUp, ArrowRight, ChevronRight, BarChart3 } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
  const { currentUser } = useSelector((s: RootState) => s.auth);
  const navigate = useNavigate();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [accounting, setAccounting] = useState<Awaited<ReturnType<typeof getAllAccountingSummary>>>([]);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getPeriodStatistics>> | null>(null);
  const [dashTab, setDashTab] = useState('overview');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [b, u, a, s] = await Promise.all([
      getActiveBatches(), getActiveUsers(), getAllAccountingSummary(), getPeriodStatistics('month'),
    ]);
    setBatches(b); setUsers(u); setAccounting(a); setStats(s);
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
      <PageHeader
        title={`Welcome in, ${currentUser?.firstName}`}
        subtitle="Here's your workforce overview"
        action={
          <button
            onClick={() => navigate('/batches')}
            className="hidden md:flex items-center gap-2 px-5 py-2.5 bg-[#2d2d2d] text-white rounded-full text-sm font-medium hover:bg-[#1a1a1a] transition-all"
          >
            <Package size={16} /> New Batch
          </button>
        }
      />

      {/* Quick Stat Pills */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="pill-tab active">
          <Package size={12} className="mr-1.5" />
          Active {activeBatches.length}
        </div>
        <div className="pill-tab active" style={{ background: '#34c759' }}>
          Completed {completedBatches.length}
        </div>
        <div className="pill-tab" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a' }}>
          Collect {formatCurrency(totalOwedToAdmin)}
        </div>
        <div className="pill-tab" style={{ background: '#fff7ed', border: '1px solid #fed7aa', color: '#ea580c' }}>
          Pay {formatCurrency(totalOwedByAdmin)}
        </div>
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

      {/* Dashboard Tabs */}
      <PillTabs
        tabs={[
          { key: 'overview', label: 'Overview' },
          { key: 'finance', label: 'Finance' },
          { key: 'batches', label: 'Batches', count: batches.length },
        ]}
        active={dashTab}
        onChange={setDashTab}
      />

      {dashTab === 'overview' && (
        <>
          {/* Batch Progress */}
          <WidgetCard title="Batch Progress" onNavigate={() => navigate('/batches')}>
            <SegmentedProgress
              segments={[
                { label: 'Active', value: activeBatches.length, color: '#c9a227' },
                { label: 'Completed', value: completedBatches.length, color: '#34c759' },
              ]}
              total={totalBatches || 1}
            />
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-gray-400">Completion Rate</span>
              <span className="text-2xl font-extrabold text-gray-900">{completionRate.toFixed(0)}%</span>
            </div>
          </WidgetCard>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Batch Donut */}
            <WidgetCard title="Batch Overview" onNavigate={() => navigate('/batches')}>
              {batchStatusData.length > 0 ? (
                <div className="flex items-center gap-4">
                  <div className="w-28 h-28">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={batchStatusData} cx="50%" cy="50%" innerRadius={30} outerRadius={48} paddingAngle={4} dataKey="value">
                          {batchStatusData.map((entry, i) => <Cell key={i} fill={entry.color} strokeWidth={0} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2">
                    {batchStatusData.map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-xs text-gray-500">{item.name}</span>
                        <span className="text-xs font-bold text-gray-800">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-28 flex items-center justify-center text-gray-300 text-sm">No batches yet</div>
              )}
            </WidgetCard>

            {/* This Month Stats */}
            <WidgetCard title="This Month" onNavigate={() => navigate('/statistics')}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">Batches</span>
                  <span className="text-xl font-extrabold text-gray-900">{stats?.batchCount || 0}</span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#c9a227] rounded-full" style={{ width: `${Math.min((stats?.batchCount || 0) * 10, 100)}%` }} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">Pieces</span>
                  <span className="text-xl font-extrabold text-gray-900">{stats?.totalPieces || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">Consumer</span>
                  <span className="text-lg font-bold text-[#5ac8fa]">{formatCurrency(stats?.totalConsumerCost || 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">Service</span>
                  <span className="text-lg font-bold text-[#ff9f0a]">{formatCurrency(stats?.totalServiceCost || 0)}</span>
                </div>
              </div>
            </WidgetCard>

            {/* Financial Card */}
            <WidgetCard title="Financial Overview" onNavigate={() => navigate('/accounting')}>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">To Collect</p>
                  <p className="text-2xl font-extrabold text-[#34c759] mt-1">{formatCurrency(totalOwedToAdmin)}</p>
                </div>
                <div className="h-px bg-gray-100" />
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">To Pay</p>
                  <p className="text-2xl font-extrabold text-[#ff9f0a] mt-1">{formatCurrency(totalOwedByAdmin)}</p>
                </div>
              </div>
            </WidgetCard>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <WidgetCard title="Users by Department" onNavigate={() => navigate('/users')}>
              {deptData.length > 0 ? (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={deptData} barSize={24}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0ead6" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#999' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#999' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
                    <Bar dataKey="users" fill="#c9a227" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-40 flex items-center justify-center text-gray-300 text-sm">No users yet</div>
              )}
            </WidgetCard>

            <WidgetCard title="HOD Accounting" onNavigate={() => navigate('/accounting')}>
              {accountingChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={accountingChartData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0ead6" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#999' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#999' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} formatter={(value) => formatCurrency(Number(value))} />
                    <Bar dataKey="owes" name="To Collect" fill="#34c759" radius={[6, 6, 0, 0]} barSize={16} />
                    <Bar dataKey="owed" name="To Pay" fill="#ff9f0a" radius={[6, 6, 0, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-40 flex items-center justify-center text-gray-300 text-sm">No data yet</div>
              )}
            </WidgetCard>
          </div>
        </>
      )}

      {dashTab === 'finance' && (
        <>
          {/* HOD Balances - Dark Card */}
          <WidgetCard title="HOD Balances" dark onNavigate={() => navigate('/accounting')}>
            {accounting.length === 0 ? (
              <p className="text-white/40 text-sm">No HODs created yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left">
                      <th className="pb-3 text-[10px] font-semibold text-white/40 uppercase tracking-wider">HOD</th>
                      <th className="pb-3 text-[10px] font-semibold text-white/40 uppercase tracking-wider text-right">Collect</th>
                      <th className="pb-3 text-[10px] font-semibold text-white/40 uppercase tracking-wider text-right">Pay</th>
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
          </WidgetCard>
        </>
      )}

      {dashTab === 'batches' && (
        <>
          {/* Recent Batches as Accordion items */}
          {batches.length === 0 ? (
            <div className="warm-card p-12 text-center">
              <Package size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-400">No batches created yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {batches.slice(0, 8).map(batch => (
                <div
                  key={batch.id}
                  className="warm-card p-4 hover-lift cursor-pointer"
                  onClick={() => navigate(`/batches/${batch.id}`)}
                >
                  <div className="flex items-center justify-between">
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
                </div>
              ))}

              <button
                onClick={() => navigate('/batches')}
                className="w-full py-3 border border-[#e8e2d4] rounded-2xl text-sm font-medium text-gray-500 hover:bg-white transition-colors flex items-center justify-center gap-2"
              >
                See All Batches <ArrowRight size={14} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
