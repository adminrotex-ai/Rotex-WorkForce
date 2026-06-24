import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import type { User, ServiceCost } from '../../types';
import { DEPARTMENT_LABELS } from '../../types';
import { getUserById, getUsersByCreator, getServiceCosts, getAccountingForHod } from '../../database/operations';
import { formatCurrency } from '../../utils/helpers';
import { ArrowLeft, DollarSign, BarChart3 } from 'lucide-react';

export default function UserStatReport() {
  const { userId } = useParams<{ userId: string }>();
  const { currentUser } = useSelector((s: RootState) => s.auth);
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [subUsers, setSubUsers] = useState<User[]>([]);
  const [serviceCosts, setServiceCosts] = useState<ServiceCost[]>([]);
  const [accounting, setAccounting] = useState<{ hodOwesAdmin: number; adminOwesHod: number } | null>(null);

  useEffect(() => {
    if (userId) loadData();
  }, [userId]);

  const loadData = async () => {
    if (!userId) return;
    const [u, subs] = await Promise.all([
      getUserById(userId),
      getUsersByCreator(userId),
    ]);
    setUser(u || null);
    setSubUsers(subs);
    if (u) {
      const [costs, acc] = await Promise.all([
        getServiceCosts({ department: u.department }),
        u.role === 'hod' ? getAccountingForHod(u.id) : Promise.resolve(null),
      ]);
      setServiceCosts(costs.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      setAccounting(acc);
    }
  };

  if (!user) return null;

  const totalServiceCost = serviceCosts.reduce((s, c) => s + c.totalCost, 0);

  return (
    <div>
      <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-700 mb-4 cursor-pointer flex items-center gap-1">
        <ArrowLeft size={14} /> Back
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-light text-gray-900">{user.firstName}'s Report</h1>
        <p className="text-sm text-gray-400 mt-1">
          {user.role.toUpperCase()} · {DEPARTMENT_LABELS[user.department] || user.department}
          {currentUser?.role === 'admin' && user.username && ` · Username: ${user.username}`}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-200 flex items-center justify-center shrink-0"><DollarSign size={20} className="text-dark-800" /></div>
          <div>
            <p className="text-2xl font-light text-emerald-600">{formatCurrency(totalServiceCost)}</p>
            <p className="text-sm text-gray-600">Service Costs</p>
          </div>
        </div>
        {accounting && (
          <>
            <div className="bg-emerald-50 rounded-2xl p-5">
              <p className="text-sm text-emerald-600 mb-1">To Collect</p>
              <p className="text-2xl font-light text-emerald-700">{formatCurrency(accounting.adminOwesHod)}</p>
              <p className="text-[11px] text-emerald-500">Admin owes HOD</p>
            </div>
            <div className="bg-red-50 rounded-2xl p-5">
              <p className="text-sm text-red-500 mb-1">To Pay</p>
              <p className="text-2xl font-light text-red-600">{formatCurrency(accounting.hodOwesAdmin)}</p>
              <p className="text-[11px] text-red-400">HOD owes admin</p>
            </div>
          </>
        )}
      </div>

      {serviceCosts.length > 0 && (
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Service Cost History</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Size</th>
                  <th className="pb-2 font-medium text-right">Cost/Piece</th>
                  <th className="pb-2 font-medium text-right">Pieces</th>
                  <th className="pb-2 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {serviceCosts.map(sc => (
                  <tr key={sc.id} className="border-b border-gray-50">
                    <td className="py-2 text-[11px] text-gray-400">{new Date(sc.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                    <td className="py-2 text-gray-500">{sc.size || '—'}</td>
                    <td className="py-2 text-right">{formatCurrency(sc.costPerPiece)}</td>
                    <td className="py-2 text-right">{sc.totalPieces}</td>
                    <td className="py-2 text-right font-medium text-gray-900">{formatCurrency(sc.totalCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {user.role === 'hod' && subUsers.length > 0 && (
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Team Members</h2>
          <div className="space-y-3">
            {subUsers.map(u => (
              <div key={u.id} className="flex items-center justify-between p-3 hover:bg-white/40 rounded-xl border border-gray-100">
                <div>
                  <p className="font-medium text-sm text-gray-900">{u.firstName}</p>
                  <p className="text-[11px] text-gray-400">{u.role}</p>
                </div>
                <button
                  onClick={() => navigate(`/statistics/user/${u.id}`)}
                  className="text-[11px] px-3 py-1 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer"
                >
                  <BarChart3 size={12} className="inline mr-1" />View Report
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
