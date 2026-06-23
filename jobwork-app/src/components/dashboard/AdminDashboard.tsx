import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../../store';
import type { Batch, User } from '../../types';
import { DEPARTMENT_LABELS } from '../../types';
import { getActiveBatches, getActiveUsers, getAllAccountingSummary, getPeriodStatistics } from '../../database/operations';
import { formatCurrency } from '../../utils/helpers';
import { Package, Users, Building2, Wallet, TrendingUp, TrendingDown } from 'lucide-react';

export default function AdminDashboard() {
  const { currentUser } = useSelector((s: RootState) => s.auth);
  const navigate = useNavigate();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [accounting, setAccounting] = useState<Awaited<ReturnType<typeof getAllAccountingSummary>>>([]);
  const [monthStats, setMonthStats] = useState<Awaited<ReturnType<typeof getPeriodStatistics>> | null>(null);
  const [weekStats, setWeekStats] = useState<Awaited<ReturnType<typeof getPeriodStatistics>> | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [b, u, a, ms, ws] = await Promise.all([
      getActiveBatches(),
      getActiveUsers(),
      getAllAccountingSummary(),
      getPeriodStatistics('month'),
      getPeriodStatistics('week'),
    ]);
    setBatches(b);
    setUsers(u);
    setAccounting(a);
    setMonthStats(ms);
    setWeekStats(ws);
  };

  const totalOwedToAdmin = accounting.reduce((sum, a) => sum + a.hodOwesAdmin, 0);
  const totalOwedByAdmin = accounting.reduce((sum, a) => sum + a.adminOwesHod, 0);
  const activeBatches = batches.filter(b => b.status !== 'completed');
  const hodUsers = users.filter(u => u.role === 'hod');
  const deptCount = new Set(users.map(u => u.department)).size;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-light text-gray-900">Welcome back, {currentUser?.firstName}</h1>
        <p className="text-gray-400 text-sm mt-1">Admin Dashboard · Rotex WorkForce Management System</p>
      </div>

      <div className="grid grid-cols-4 gap-5 mb-8">
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gold-300 flex items-center justify-center text-dark-800 shrink-0"><Package size={22} /></div>
          <div>
            <p className="text-2xl font-light text-gray-900 leading-none">{batches.length}</p>
            <p className="text-sm text-gray-600 mt-1">Total Batches</p>
            <p className="text-[11px] text-gray-400">{activeBatches.length} active</p>
          </div>
        </div>
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-200 flex items-center justify-center text-dark-800 shrink-0"><Users size={22} /></div>
          <div>
            <p className="text-2xl font-light text-gray-900 leading-none">{users.length}</p>
            <p className="text-sm text-gray-600 mt-1">Total Users</p>
            <p className="text-[11px] text-gray-400">{hodUsers.length} HODs</p>
          </div>
        </div>
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-200 flex items-center justify-center text-dark-800 shrink-0"><Building2 size={22} /></div>
          <div>
            <p className="text-2xl font-light text-gray-900 leading-none">{deptCount}</p>
            <p className="text-sm text-gray-600 mt-1">Departments</p>
            <p className="text-[11px] text-gray-400">Active</p>
          </div>
        </div>
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-200 flex items-center justify-center text-dark-800 shrink-0"><Wallet size={22} /></div>
          <div>
            <p className="text-2xl font-light text-gray-900 leading-none">{formatCurrency(totalOwedToAdmin)}</p>
            <p className="text-sm text-gray-600 mt-1">To Collect</p>
            <p className="text-[11px] text-gray-400">{formatCurrency(totalOwedByAdmin)} to pay</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5 mb-8">
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">HOD Accounting</h2>
          <div className="space-y-3">
            {accounting.map(a => {
              return (
                <div key={a.hodId} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-white/40 rounded-lg px-2 -mx-2" onClick={() => navigate(`/accounting/${a.hodId}`)}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gold-300 flex items-center justify-center text-xs font-bold text-dark-800">
                      {a.hodName[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{a.hodName}</p>
                      <p className="text-[11px] text-gray-400">{DEPARTMENT_LABELS[a.department] || a.department}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {a.hodOwesAdmin > 0 && <p className="text-sm text-emerald-600 flex items-center gap-1"><TrendingUp size={12} /> To collect: {formatCurrency(a.hodOwesAdmin)}</p>}
                    {a.adminOwesHod > 0 && <p className="text-sm text-red-500 flex items-center gap-1"><TrendingDown size={12} /> To pay: {formatCurrency(a.adminOwesHod)}</p>}
                    {a.hodOwesAdmin === 0 && a.adminOwesHod === 0 && <p className="text-sm text-gray-400">Settled</p>}
                  </div>
                </div>
              );
            })}
            {accounting.length === 0 && (
              <p className="text-sm text-gray-400 py-4 text-center">No HODs created yet</p>
            )}
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Recent Batches</h2>
          <div className="space-y-3">
            {batches.slice(0, 5).map(batch => (
              <div key={batch.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-white/40 rounded-lg px-2 -mx-2" onClick={() => navigate(`/batches/${batch.id}`)}>
                <div>
                  <p className="text-sm font-medium text-gray-900">{batch.batchNumber}</p>
                  <p className="text-[11px] text-gray-400">{batch.totalPieces} pieces · {new Date(batch.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
                </div>
                <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${
                  batch.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                  batch.status === 'in_progress' ? 'bg-gold-300 text-dark-800' :
                  'bg-gray-100 text-gray-600'
                }`}>{batch.status.replace('_', ' ')}</span>
              </div>
            ))}
            {batches.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">No batches created yet</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-2">This Week</h2>
          <div className="flex gap-6 mt-3">
            <div><p className="text-2xl font-light text-gray-900">{weekStats?.batchCount || 0}</p><p className="text-[11px] text-gray-400">Batches</p></div>
            <div><p className="text-2xl font-light text-gray-900">{weekStats?.totalPieces || 0}</p><p className="text-[11px] text-gray-400">Pieces</p></div>
            <div><p className="text-2xl font-light text-gray-900">{formatCurrency((weekStats?.totalConsumerCost || 0) + (weekStats?.totalServiceCost || 0))}</p><p className="text-[11px] text-gray-400">Total Cost</p></div>
          </div>
        </div>
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-2">This Month</h2>
          <div className="flex gap-6 mt-3">
            <div><p className="text-2xl font-light text-gray-900">{monthStats?.batchCount || 0}</p><p className="text-[11px] text-gray-400">Batches</p></div>
            <div><p className="text-2xl font-light text-gray-900">{monthStats?.totalPieces || 0}</p><p className="text-[11px] text-gray-400">Pieces</p></div>
            <div><p className="text-2xl font-light text-gray-900">{formatCurrency((monthStats?.totalConsumerCost || 0) + (monthStats?.totalServiceCost || 0))}</p><p className="text-[11px] text-gray-400">Total Cost</p></div>
          </div>
        </div>
      </div>
    </div>
  );
}
