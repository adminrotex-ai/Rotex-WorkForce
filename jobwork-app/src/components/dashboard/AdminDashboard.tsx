import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../../store';
import type { User, DepartmentStock } from '../../types';
import { DEPARTMENT_LABELS } from '../../types';
import { getActiveUsers, getAllAccountingSummary, getDepartmentStock, getActiveDepartments } from '../../database/operations';
import { formatCurrency } from '../../utils/helpers';
import { Warehouse, Users, Building2, Wallet, TrendingUp, TrendingDown } from 'lucide-react';

export default function AdminDashboard() {
  const { currentUser } = useSelector((s: RootState) => s.auth);
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [allStock, setAllStock] = useState<DepartmentStock[]>([]);
  const [departments, setDepartments] = useState<Array<{ key: string; label: string }>>([]);
  const [accounting, setAccounting] = useState<Awaited<ReturnType<typeof getAllAccountingSummary>>>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [u, a, s, depts] = await Promise.all([
      getActiveUsers(),
      getAllAccountingSummary(),
      getDepartmentStock(),
      getActiveDepartments(),
    ]);
    setUsers(u);
    setAccounting(a);
    setAllStock(s);
    setDepartments(depts);
  };

  const totalOwedToAdmin = accounting.reduce((sum, a) => sum + a.hodOwesAdmin, 0);
  const totalOwedByAdmin = accounting.reduce((sum, a) => sum + a.adminOwesHod, 0);
  const totalStockItems = allStock.reduce((sum, s) => sum + s.quantity, 0);
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
          <div className="w-12 h-12 rounded-xl bg-gold-300 flex items-center justify-center text-dark-800 shrink-0"><Warehouse size={22} /></div>
          <div>
            <p className="text-2xl font-light text-gray-900 leading-none">{totalStockItems}</p>
            <p className="text-sm text-gray-600 mt-1">Total Stock</p>
            <p className="text-[11px] text-gray-400">{allStock.length} entries</p>
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
          <h2 className="text-base font-semibold text-gray-900 mb-4">Stock by Department</h2>
          <div className="space-y-3">
            {departments.map(dept => {
              const deptItems = allStock.filter(s => s.department === dept.key);
              const total = deptItems.reduce((s, item) => s + item.quantity, 0);
              return (
                <div key={dept.key} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-white/40 rounded-lg px-2 -mx-2" onClick={() => navigate(`/stock/${dept.key}`)}>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{dept.label}</p>
                    <p className="text-[11px] text-gray-400">{deptItems.length} item{deptItems.length !== 1 ? 's' : ''}</p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600">{total > 0 ? total : '—'}</span>
                </div>
              );
            })}
            {departments.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">No departments found</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
