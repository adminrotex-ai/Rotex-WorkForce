import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import type { User, ServiceCost, StockTransfer, ConsumerGoodReceipt, CostPaymentConfirmation } from '../../types';
import { DEPARTMENT_LABELS } from '../../types';
import {
  getUserById, getUsersByCreator, getServiceCostsForHod, getServiceCosts,
  getAccountingForHod, getTransfersForHod, getReceiptsForHod,
  getCostPaymentConfirmations,
} from '../../database/operations';
import { formatCurrency } from '../../utils/helpers';
import { ArrowLeft, DollarSign, BarChart3, ArrowRightLeft, ShoppingCart, CheckCircle } from 'lucide-react';

export default function UserStatReport() {
  const { userId } = useParams<{ userId: string }>();
  const { currentUser } = useSelector((s: RootState) => s.auth);
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [subUsers, setSubUsers] = useState<User[]>([]);
  const [serviceCosts, setServiceCosts] = useState<ServiceCost[]>([]);
  const [accounting, setAccounting] = useState<{ hodOwesAdmin: number; adminOwesHod: number } | null>(null);
  const [hodTransfers, setHodTransfers] = useState<StockTransfer[]>([]);
  const [receipts, setReceipts] = useState<ConsumerGoodReceipt[]>([]);
  const [confirmations, setConfirmations] = useState<CostPaymentConfirmation[]>([]);

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
      const isHod = u.role === 'hod';
      const [costs, acc, trans, recs, confs] = await Promise.all([
        isHod ? getServiceCostsForHod(u.id) : getServiceCosts({ department: u.department }),
        isHod ? getAccountingForHod(u.id) : Promise.resolve(null),
        isHod ? getTransfersForHod(u.id) : Promise.resolve([]),
        isHod ? getReceiptsForHod(u.id) : Promise.resolve([]),
        isHod ? getCostPaymentConfirmations(u.id) : Promise.resolve([]),
      ]);
      setServiceCosts(costs.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      setAccounting(acc);
      setHodTransfers(trans);
      setReceipts(recs.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      setConfirmations(confs);
    }
  };

  if (!user) return null;

  const totalServiceCost = serviceCosts.reduce((s, c) => s + c.totalCost, 0);
  const totalConsumerCost = receipts.reduce((s, r) => s + r.totalAmount, 0);
  const totalConfirmed = confirmations.reduce((s, c) => s + c.amount, 0);
  const netBalance = accounting ? (accounting.adminOwesHod - accounting.hodOwesAdmin) : 0;

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

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-200 flex items-center justify-center shrink-0"><DollarSign size={18} className="text-dark-800" /></div>
          <div>
            <p className="text-xl font-light text-emerald-600">{formatCurrency(totalServiceCost)}</p>
            <p className="text-[11px] text-gray-500">Service Costs</p>
          </div>
        </div>
        {user.role === 'hod' && (
          <>
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-200 flex items-center justify-center shrink-0"><ShoppingCart size={18} className="text-dark-800" /></div>
              <div>
                <p className="text-xl font-light text-orange-600">{formatCurrency(totalConsumerCost)}</p>
                <p className="text-[11px] text-gray-500">Consumer Goods</p>
              </div>
            </div>
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-200 flex items-center justify-center shrink-0"><ArrowRightLeft size={18} className="text-dark-800" /></div>
              <div>
                <p className="text-xl font-light text-gray-900">{hodTransfers.length}</p>
                <p className="text-[11px] text-gray-500">Transfers</p>
              </div>
            </div>
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-200 flex items-center justify-center shrink-0"><CheckCircle size={18} className="text-dark-800" /></div>
              <div>
                <p className="text-xl font-light text-violet-600">{formatCurrency(totalConfirmed)}</p>
                <p className="text-[11px] text-gray-500">Confirmed ({confirmations.length})</p>
              </div>
            </div>
          </>
        )}
        {accounting && (
          <div className={`rounded-2xl p-5 ${netBalance >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
            <p className="text-[11px] text-gray-500 mb-1">Net Balance</p>
            <p className={`text-xl font-light ${netBalance >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              {formatCurrency(Math.abs(netBalance))}
            </p>
            <p className="text-[11px] text-gray-400">{netBalance >= 0 ? 'Admin owes HOD' : 'HOD owes Admin'}</p>
          </div>
        )}
      </div>

      {/* Accounting Summary */}
      {accounting && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
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
        </div>
      )}

      {/* Service Cost History */}
      {serviceCosts.length > 0 && (
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Service Cost History</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Department</th>
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
                    <td className="py-2 text-gray-500">{DEPARTMENT_LABELS[sc.department] || sc.department}</td>
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

      {/* Transfer History (HOD only) */}
      {user.role === 'hod' && hodTransfers.length > 0 && (
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Transfer History</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">From</th>
                  <th className="pb-2 font-medium">To</th>
                  <th className="pb-2 font-medium">Size</th>
                  <th className="pb-2 font-medium text-right">Qty</th>
                  <th className="pb-2 font-medium">By</th>
                </tr>
              </thead>
              <tbody>
                {hodTransfers.map(t => (
                  <tr key={t.id} className="border-b border-gray-50">
                    <td className="py-2 text-[11px] text-gray-400">{new Date(t.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                    <td className="py-2">{DEPARTMENT_LABELS[t.fromDepartment] || t.fromDepartment}</td>
                    <td className="py-2">{DEPARTMENT_LABELS[t.toDepartment] || t.toDepartment}</td>
                    <td className="py-2 text-gray-500">{t.size || '—'}</td>
                    <td className="py-2 text-right font-medium">{t.quantity} {t.unit}</td>
                    <td className="py-2 text-gray-500">{t.transferredByName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Consumer Goods Receipts (HOD only) */}
      {user.role === 'hod' && receipts.length > 0 && (
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Consumer Goods Receipts</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Receipt #</th>
                  <th className="pb-2 font-medium">Items</th>
                  <th className="pb-2 font-medium">Issued By</th>
                  <th className="pb-2 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map(r => (
                  <tr key={r.id} className="border-b border-gray-50">
                    <td className="py-2 text-[11px] text-gray-400">{new Date(r.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                    <td className="py-2 font-medium">{r.receiptNumber}</td>
                    <td className="py-2 text-gray-500">{r.items.map(i => `${i.consumerGoodName} x${i.quantity}`).join(', ')}</td>
                    <td className="py-2 text-gray-500">{r.issuedByName}</td>
                    <td className="py-2 text-right font-medium text-orange-600">{formatCurrency(r.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment Confirmations (HOD only) */}
      {user.role === 'hod' && confirmations.length > 0 && (
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Payment Confirmations</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Confirmed By</th>
                  <th className="pb-2 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {confirmations.map(c => (
                  <tr key={c.id} className="border-b border-gray-50">
                    <td className="py-2 text-[11px] text-gray-400">{new Date(c.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                    <td className="py-2">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${c.type === 'service_cost' ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'}`}>
                        {c.type === 'service_cost' ? 'Service Cost' : 'Consumer Goods'}
                      </span>
                    </td>
                    <td className="py-2 text-gray-500">{c.confirmedByName}</td>
                    <td className="py-2 text-right font-medium text-violet-600">{formatCurrency(c.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Team Members */}
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
