import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../../store';
import type { Department, User, DepartmentStock, StockTransfer } from '../../types';
import { DEPARTMENT_LABELS } from '../../types';
import {
  getActiveUsers, getUsersByCreator, getDepartmentStock,
  getStockTransfers, getServiceCosts, getActiveDepartments,
  getConsumerGoodsCostTotal, getCostPaymentStats,
  getServiceCostsByHodBreakdown, getConsumerGoodsCostByDepartment,
  getPeriodStatistics,
} from '../../database/operations';
import { formatCurrency } from '../../utils/helpers';
import {
  BarChart3, Warehouse, ArrowRightLeft, DollarSign, Users,
  ChevronRight, ShoppingCart, CheckCircle, TrendingUp,
} from 'lucide-react';

export default function Statistics() {
  const { currentUser } = useSelector((s: RootState) => s.auth);
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [allStock, setAllStock] = useState<DepartmentStock[]>([]);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [totalServiceCost, setTotalServiceCost] = useState(0);
  const [consumerGoodsCost, setConsumerGoodsCost] = useState(0);
  const [paymentStats, setPaymentStats] = useState<{ totalConfirmed: number; totalPending: number; confirmedCount: number } | null>(null);
  const [hodBreakdown, setHodBreakdown] = useState<Array<{ hodId: string; hodName: string; department: Department; totalServiceCost: number; totalPieces: number }>>([]);
  const [consumerByDept, setConsumerByDept] = useState<Array<{ department: string; totalAmount: number; receiptCount: number }>>([]);
  const [productionStats, setProductionStats] = useState<{ batchCount: number; totalPieces: number } | null>(null);
  const [departments, setDepartments] = useState<Array<{ key: string; label: string }>>([]);
  const [expandedDept, setExpandedDept] = useState<Department | null>(null);
  const [expandedHod, setExpandedHod] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const isAdmin = currentUser?.role === 'admin';
  const isHod = currentUser?.role === 'hod';

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    if (!currentUser) return;
    const [u, s, t, costs, depts, cgCost, pStats, hodBrk, cgByDept, prodStats] = await Promise.all([
      isAdmin ? getActiveUsers() : getUsersByCreator(currentUser.id),
      getDepartmentStock(),
      getStockTransfers(),
      getServiceCosts({}),
      getActiveDepartments(),
      isAdmin ? getConsumerGoodsCostTotal() : Promise.resolve(0),
      isAdmin ? getCostPaymentStats() : Promise.resolve(null),
      isAdmin ? getServiceCostsByHodBreakdown() : Promise.resolve([]),
      isAdmin ? getConsumerGoodsCostByDepartment() : Promise.resolve([]),
      isAdmin ? getPeriodStatistics('all') : Promise.resolve(null),
    ]);
    setUsers(u);
    setAllStock(s);
    setTransfers(t);
    setTotalServiceCost(costs.reduce((sum, c) => sum + c.totalCost, 0));
    setConsumerGoodsCost(cgCost);
    setPaymentStats(pStats);
    setHodBreakdown(hodBrk);
    setConsumerByDept(cgByDept);
    setProductionStats(prodStats ? { batchCount: prodStats.batchCount, totalPieces: prodStats.totalPieces } : null);
    setDepartments(depts);
    setLoaded(true);
  };

  const hodsByDept = (dept: Department) =>
    users.filter(u => u.department === dept && u.role === 'hod' && u.id !== currentUser?.id);
  const usersByHod = (hodId: string) =>
    users.filter(u => u.createdBy === hodId && u.role === 'user');

  const totalStockQty = allStock.reduce((s, item) => s + item.quantity, 0);
  const deptsWithStock = new Set(allStock.map(s => s.department)).size;
  const activeHodCount = users.filter(u => u.role === 'hod').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-light text-gray-900">Statistics</h1>
          <p className="text-sm text-gray-400 mt-1">Comprehensive overview of stock, costs, and production</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gold-300 flex items-center justify-center shrink-0"><Warehouse size={20} className="text-dark-800" /></div>
          <div>
            <p className="text-2xl font-light text-gray-900">{totalStockQty}</p>
            <p className="text-sm text-gray-600">Total Stock</p>
            <p className="text-[11px] text-gray-400">{deptsWithStock} departments</p>
          </div>
        </div>
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-200 flex items-center justify-center shrink-0"><ArrowRightLeft size={20} className="text-dark-800" /></div>
          <div>
            <p className="text-2xl font-light text-gray-900">{transfers.length}</p>
            <p className="text-sm text-gray-600">Total Transfers</p>
          </div>
        </div>
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-200 flex items-center justify-center shrink-0"><DollarSign size={20} className="text-dark-800" /></div>
          <div>
            <p className="text-2xl font-light text-emerald-600">{formatCurrency(totalServiceCost)}</p>
            <p className="text-sm text-gray-600">Service Costs</p>
          </div>
        </div>
        {isAdmin && (
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-200 flex items-center justify-center shrink-0"><ShoppingCart size={20} className="text-dark-800" /></div>
            <div>
              <p className="text-2xl font-light text-orange-600">{formatCurrency(consumerGoodsCost)}</p>
              <p className="text-sm text-gray-600">Consumer Goods Cost</p>
            </div>
          </div>
        )}
        {isAdmin && paymentStats && (
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-violet-200 flex items-center justify-center shrink-0"><CheckCircle size={20} className="text-dark-800" /></div>
            <div>
              <p className="text-2xl font-light text-violet-600">{formatCurrency(paymentStats.totalConfirmed)}</p>
              <p className="text-sm text-gray-600">Confirmed Payments</p>
              <p className="text-[11px] text-gray-400">{paymentStats.confirmedCount} confirmations</p>
            </div>
          </div>
        )}
        {isAdmin && productionStats && (
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-200 flex items-center justify-center shrink-0"><TrendingUp size={20} className="text-dark-800" /></div>
            <div>
              <p className="text-2xl font-light text-gray-900">{productionStats.totalPieces}</p>
              <p className="text-sm text-gray-600">Total Production</p>
              <p className="text-[11px] text-gray-400">{productionStats.batchCount} batches</p>
            </div>
          </div>
        )}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-200 flex items-center justify-center shrink-0"><Users size={20} className="text-dark-800" /></div>
          <div>
            <p className="text-2xl font-light text-gray-900">{isAdmin ? activeHodCount : users.length}</p>
            <p className="text-sm text-gray-600">{isAdmin ? 'Active HODs' : 'Team Members'}</p>
          </div>
        </div>
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-200 flex items-center justify-center shrink-0"><BarChart3 size={20} className="text-dark-800" /></div>
          <div>
            <p className="text-2xl font-light text-gray-900">{allStock.length}</p>
            <p className="text-sm text-gray-600">Stock Entries</p>
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Stock by Department</h2>
            <div className="space-y-2">
              {departments.map(dept => {
                const deptItems = allStock.filter(s => s.department === dept.key);
                const total = deptItems.reduce((s, item) => s + item.quantity, 0);
                return (
                  <div key={dept.key} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <span className="text-sm text-gray-900">{dept.label}</span>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-emerald-600">{total}</span>
                      <span className="text-[11px] text-gray-400 ml-2">{deptItems.length} entries</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Recent Transfers</h2>
            <div className="space-y-2">
              {transfers.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8).map(t => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm text-gray-900">
                      {DEPARTMENT_LABELS[t.fromDepartment] || t.fromDepartment} → {DEPARTMENT_LABELS[t.toDepartment] || t.toDepartment}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      {t.targetHodName && `HOD: ${t.targetHodName} · `}{t.size && `${t.size} · `}{new Date(t.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}
                    </p>
                  </div>
                  <span className="text-sm font-medium">{t.quantity} {t.unit}</span>
                </div>
              ))}
              {loaded && transfers.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No transfers yet</p>}
            </div>
          </div>
        </div>
      )}

      {isAdmin && hodBreakdown.length > 0 && (
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">HOD-wise Service Cost Breakdown</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="pb-2 font-medium">HOD</th>
                  <th className="pb-2 font-medium">Department</th>
                  <th className="pb-2 font-medium text-right">Total Pieces</th>
                  <th className="pb-2 font-medium text-right">Total Service Cost</th>
                </tr>
              </thead>
              <tbody>
                {hodBreakdown.map(h => (
                  <tr key={h.hodId} className="border-b border-gray-50">
                    <td className="py-2.5 font-medium text-gray-900">{h.hodName}</td>
                    <td className="py-2.5 text-gray-500">{DEPARTMENT_LABELS[h.department] || h.department}</td>
                    <td className="py-2.5 text-right">{h.totalPieces}</td>
                    <td className="py-2.5 text-right font-semibold text-emerald-600">{formatCurrency(h.totalServiceCost)}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-gray-200">
                  <td className="py-2.5 font-semibold text-gray-900" colSpan={2}>Total</td>
                  <td className="py-2.5 text-right font-semibold">{hodBreakdown.reduce((s, h) => s + h.totalPieces, 0)}</td>
                  <td className="py-2.5 text-right font-semibold text-emerald-600">{formatCurrency(hodBreakdown.reduce((s, h) => s + h.totalServiceCost, 0))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isAdmin && consumerByDept.length > 0 && (
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Consumer Goods Cost by Department</h2>
          <div className="space-y-2">
            {consumerByDept.map(d => (
              <div key={d.department} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <span className="text-sm text-gray-900">{DEPARTMENT_LABELS[d.department] || d.department}</span>
                  <span className="text-[11px] text-gray-400 ml-2">{d.receiptCount} receipts</span>
                </div>
                <span className="text-sm font-semibold text-orange-600">{formatCurrency(d.totalAmount)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between py-2 border-t-2 border-gray-200">
              <span className="text-sm font-semibold text-gray-900">Total</span>
              <span className="text-sm font-semibold text-orange-600">{formatCurrency(consumerByDept.reduce((s, d) => s + d.totalAmount, 0))}</span>
            </div>
          </div>
        </div>
      )}

      {isAdmin && paymentStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          <div className="bg-emerald-50 rounded-2xl p-5">
            <p className="text-sm text-emerald-600 mb-1">Total Confirmed</p>
            <p className="text-2xl font-light text-emerald-700">{formatCurrency(paymentStats.totalConfirmed)}</p>
            <p className="text-[11px] text-emerald-500">{paymentStats.confirmedCount} payment confirmations</p>
          </div>
          <div className="bg-amber-50 rounded-2xl p-5">
            <p className="text-sm text-amber-600 mb-1">Pending Amount</p>
            <p className="text-2xl font-light text-amber-700">{formatCurrency(paymentStats.totalPending)}</p>
            <p className="text-[11px] text-amber-500">Across service costs & consumer goods</p>
          </div>
        </div>
      )}

      {(isAdmin || isHod) && (
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            {isAdmin ? 'Department Statistics' : 'Team Statistics'}
          </h2>

          {isAdmin ? (
            <div className="space-y-3">
              {departments.map(dept => {
                const deptHods = hodsByDept(dept.key);
                const isExpanded = expandedDept === dept.key;
                return (
                  <div key={dept.key} className="border border-gray-100 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedDept(isExpanded ? null : dept.key)}
                      className="w-full flex items-center justify-between p-4 hover:bg-white/40 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-gold-300">
                          <Users size={14} className="text-dark-800" />
                        </div>
                        <span className="font-medium text-sm text-gray-900">{dept.label}</span>
                        <span className="text-[11px] text-gray-400">({deptHods.length} HODs)</span>
                      </div>
                      <ChevronRight size={16} className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </button>
                    {isExpanded && (
                      <div className="border-t border-gray-100 p-3 space-y-2">
                        {deptHods.length === 0 ? (
                          <p className="text-gray-400 text-[11px] p-2">No HODs</p>
                        ) : deptHods.map(hod => {
                          const hodUsers = usersByHod(hod.id);
                          const hodCostData = hodBreakdown.find(h => h.hodId === hod.id);
                          return (
                            <div key={hod.id} className="border border-gray-100 rounded-xl">
                              <div className="flex items-center justify-between p-3">
                                <div>
                                  <span className="font-medium text-sm text-gray-900">{hod.firstName} (HOD)</span>
                                  {hodCostData && (
                                    <span className="text-[11px] text-emerald-600 ml-2">{formatCurrency(hodCostData.totalServiceCost)}</span>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => navigate(`/statistics/user/${hod.id}`)}
                                    className="text-[11px] px-3 py-1 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer"
                                  >
                                    <BarChart3 size={12} className="inline mr-1" />Report
                                  </button>
                                  <button
                                    onClick={() => setExpandedHod(expandedHod === hod.id ? null : hod.id)}
                                    className="text-[11px] px-3 py-1 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer"
                                  >
                                    Users ({hodUsers.length})
                                  </button>
                                </div>
                              </div>
                              {expandedHod === hod.id && (
                                <div className="border-t border-gray-100 p-3 space-y-1">
                                  {hodUsers.length === 0 ? (
                                    <p className="text-gray-400 text-[11px]">No users</p>
                                  ) : hodUsers.map(u => (
                                    <div key={u.id} className="flex items-center justify-between p-2 hover:bg-white/40 rounded-xl">
                                      <span className="text-sm text-gray-900">{u.firstName}</span>
                                      <button
                                        onClick={() => navigate(`/statistics/user/${u.id}`)}
                                        className="text-[11px] px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer"
                                      >
                                        <BarChart3 size={12} className="inline mr-1" />Report
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {users.map(u => (
                <div key={u.id} className="flex items-center justify-between p-3 hover:bg-white/40 rounded-xl border border-gray-100">
                  <span className="text-sm font-medium text-gray-900">{u.firstName}</span>
                  <button
                    onClick={() => navigate(`/statistics/user/${u.id}`)}
                    className="text-[11px] px-3 py-1 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer"
                  >
                    <BarChart3 size={12} className="inline mr-1" />Report
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
