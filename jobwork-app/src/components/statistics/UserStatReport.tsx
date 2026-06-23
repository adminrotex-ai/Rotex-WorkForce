import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import type { User } from '../../types';
import { DEPARTMENT_LABELS } from '../../types';
import { getUserStatistics, getUsersByCreator, getUserById } from '../../database/operations';
import { formatCurrency } from '../../utils/helpers';
import { ArrowLeft, CheckCircle, XCircle, Package, BarChart3 } from 'lucide-react';

export default function UserStatReport() {
  const { userId } = useParams<{ userId: string }>();
  const { currentUser } = useSelector((s: RootState) => s.auth);
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [user, setUser] = useState<User | null>(null);
  const [subUsers, setSubUsers] = useState<User[]>([]);

  useEffect(() => {
    if (userId) loadData();
  }, [userId]);

  const loadData = async () => {
    if (!userId) return;
    const [s, u, subs] = await Promise.all([
      getUserStatistics(userId),
      getUserById(userId),
      getUsersByCreator(userId),
    ]);
    setStats(s);
    setUser(u || null);
    setSubUsers(subs);
  };

  if (!stats || !user) return <div className="flex items-center justify-center h-64"><p className="text-gray-400">Loading...</p></div>;

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div>
      <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-700 mb-4 cursor-pointer flex items-center gap-1">
        <ArrowLeft size={14} /> Back
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-light text-gray-900">{user.firstName}'s Report</h1>
        <p className="text-sm text-gray-400 mt-1">
          {user.role.toUpperCase()} · {DEPARTMENT_LABELS[user.department]}
          {isAdmin && ` · Username: ${user.username}`}
        </p>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gold-300 flex items-center justify-center shrink-0"><Package size={20} className="text-dark-800" /></div>
          <div>
            <p className="text-2xl font-light text-gray-900">{stats.totalPieces}</p>
            <p className="text-sm text-gray-600">Total Pieces</p>
          </div>
        </div>
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-200 flex items-center justify-center shrink-0"><CheckCircle size={20} className="text-dark-800" /></div>
          <div>
            <p className="text-2xl font-light text-emerald-600">{stats.totalAccepted}</p>
            <p className="text-sm text-gray-600">Accepted</p>
            <p className="text-[11px] text-gray-400">{stats.acceptanceRate.toFixed(1)}% rate</p>
          </div>
        </div>
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-200 flex items-center justify-center shrink-0"><XCircle size={20} className="text-dark-800" /></div>
          <div>
            <p className="text-2xl font-light text-red-500">{stats.totalRejected}</p>
            <p className="text-sm text-gray-600">Rejected</p>
            <p className="text-[11px] text-gray-400">{stats.rejectionRate.toFixed(1)}% rate</p>
          </div>
        </div>
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-200 flex items-center justify-center shrink-0"><Package size={20} className="text-dark-800" /></div>
          <div>
            <p className="text-2xl font-light text-gray-900">{stats.batchCount}</p>
            <p className="text-sm text-gray-600">Batches Worked</p>
          </div>
        </div>
      </div>

      {/* Cost Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5">
          <p className="text-[11px] text-gray-400 uppercase font-medium">Consumer Goods Used</p>
          <p className="text-2xl font-light text-orange-500 mt-1">{formatCurrency(stats.totalConsumerCost)}</p>
        </div>
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5">
          <p className="text-[11px] text-gray-400 uppercase font-medium">Service Cost</p>
          <p className="text-2xl font-light text-emerald-600 mt-1">{formatCurrency(stats.totalServiceCost)}</p>
        </div>
      </div>

      {/* Piece Entries */}
      {stats.pieceEntries.length > 0 && (
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Piece Entry History</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium text-right">Accepted</th>
                  <th className="pb-2 font-medium text-right">Rejected</th>
                  <th className="pb-2 font-medium text-right">Total</th>
                  <th className="pb-2 font-medium">Size</th>
                </tr>
              </thead>
              <tbody>
                {stats.pieceEntries.map((e: any) => (
                  <tr key={e.id} className="border-b border-gray-50">
                    <td className="py-2 text-[11px] text-gray-400">{new Date(e.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                    <td className="py-2 text-right text-emerald-600">{e.acceptedPieces}</td>
                    <td className="py-2 text-right text-red-500">{e.rejectedPieces}</td>
                    <td className="py-2 text-right font-medium text-gray-900">{e.totalPieces}</td>
                    <td className="py-2 text-gray-500">{e.size || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Consumer Goods Usage */}
      {stats.consumerUsages.length > 0 && (
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Consumer Goods Usage</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Department</th>
                  <th className="pb-2 font-medium text-right">Quantity</th>
                  <th className="pb-2 font-medium text-right">Price/Unit</th>
                  <th className="pb-2 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {stats.consumerUsages.map((u: any) => (
                  <tr key={u.id} className="border-b border-gray-50">
                    <td className="py-2 text-[11px] text-gray-400">{new Date(u.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                    <td className="py-2 capitalize text-gray-500">{u.department}</td>
                    <td className="py-2 text-right">{u.quantity}</td>
                    <td className="py-2 text-right">{formatCurrency(u.pricePerUnit)}</td>
                    <td className="py-2 text-right font-medium text-gray-900">{formatCurrency(u.totalCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Service Costs */}
      {stats.serviceCosts.length > 0 && (
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Service Costs</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Department</th>
                  <th className="pb-2 font-medium text-right">Cost/Piece</th>
                  <th className="pb-2 font-medium text-right">Pieces</th>
                  <th className="pb-2 font-medium text-right">Total</th>
                  <th className="pb-2 font-medium">Size</th>
                </tr>
              </thead>
              <tbody>
                {stats.serviceCosts.map((s: any) => (
                  <tr key={s.id} className="border-b border-gray-50">
                    <td className="py-2 text-[11px] text-gray-400">{new Date(s.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                    <td className="py-2 capitalize text-gray-500">{s.department}</td>
                    <td className="py-2 text-right">{formatCurrency(s.costPerPiece)}</td>
                    <td className="py-2 text-right">{s.totalPieces}</td>
                    <td className="py-2 text-right font-medium text-gray-900">{formatCurrency(s.totalCost)}</td>
                    <td className="py-2 text-gray-500">{s.size || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-Users (for HODs) */}
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
