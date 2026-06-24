import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../../store';
import { DEPARTMENT_LABELS } from '../../types';
import { getAccountingForHod, getUsersByCreator, getServiceCosts } from '../../database/operations';
import { formatCurrency } from '../../utils/helpers';
import { Users, TrendingUp, TrendingDown, DollarSign, Wallet } from 'lucide-react';

export default function HodDashboard() {
  const { currentUser } = useSelector((s: RootState) => s.auth);
  const navigate = useNavigate();
  const [accounting, setAccounting] = useState<{ hodOwesAdmin: number; adminOwesHod: number } | null>(null);
  const [userCount, setUserCount] = useState(0);
  const [totalServiceCost, setTotalServiceCost] = useState(0);

  useEffect(() => {
    if (currentUser) loadData();
  }, [currentUser]);

  const loadData = async () => {
    if (!currentUser) return;
    const [acc, users, costs] = await Promise.all([
      getAccountingForHod(currentUser.id),
      getUsersByCreator(currentUser.id),
      getServiceCosts({ department: currentUser.department }),
    ]);
    setAccounting(acc);
    setUserCount(users.length);
    setTotalServiceCost(costs.reduce((s, c) => s + c.totalCost, 0));
  };

  if (!currentUser) return null;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-light text-gray-900">Welcome, {currentUser.firstName}</h1>
        <p className="text-sm text-gray-400 mt-1">HOD · {DEPARTMENT_LABELS[currentUser.department] || currentUser.department} Department</p>
      </div>

      <div className="grid grid-cols-4 gap-5 mb-8">
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-200 flex items-center justify-center"><Users size={22} className="text-dark-800" /></div>
          <div>
            <p className="text-2xl font-light text-gray-900">{userCount}</p>
            <p className="text-sm text-gray-600">My Users</p>
          </div>
        </div>
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gold-300 flex items-center justify-center"><DollarSign size={22} className="text-dark-800" /></div>
          <div>
            <p className="text-2xl font-light text-gray-900">{formatCurrency(totalServiceCost)}</p>
            <p className="text-sm text-gray-600">Service Costs</p>
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

      <div className="grid grid-cols-2 gap-5">
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Quick Links</h2>
          <div className="space-y-3">
            <button onClick={() => navigate('/users')} className="w-full flex items-center justify-between py-3 px-3 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-white/40 rounded-lg">
              <span className="text-sm text-gray-900">My Users</span>
              <span className="text-[11px] text-gray-400">{userCount} users</span>
            </button>
            <button onClick={() => navigate('/accounting')} className="w-full flex items-center justify-between py-3 px-3 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-white/40 rounded-lg">
              <span className="text-sm text-gray-900">Accounting</span>
              <Wallet size={14} className="text-gray-400" />
            </button>
            <button onClick={() => navigate('/statistics')} className="w-full flex items-center justify-between py-3 px-3 cursor-pointer hover:bg-white/40 rounded-lg">
              <span className="text-sm text-gray-900">Statistics</span>
              <TrendingUp size={14} className="text-gray-400" />
            </button>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Department</h2>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">Department: <strong>{DEPARTMENT_LABELS[currentUser.department] || currentUser.department}</strong></p>
            <p className="text-sm text-gray-600">Role: <strong>Head of Department</strong></p>
            <p className="text-sm text-gray-600">Total Service Cost: <strong className="text-emerald-600">{formatCurrency(totalServiceCost)}</strong></p>
          </div>
        </div>
      </div>
    </div>
  );
}
