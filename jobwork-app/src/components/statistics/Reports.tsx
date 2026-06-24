import { useState, useEffect } from 'react';
import { getDepartmentStock, getStockTransfers, getServiceCosts, getActiveDepartments } from '../../database/operations';
import { formatCurrency } from '../../utils/helpers';
import type { DepartmentStock, StockTransfer, ServiceCost } from '../../types';
import { DEPARTMENT_LABELS } from '../../types';

export default function Reports() {
  const [allStock, setAllStock] = useState<DepartmentStock[]>([]);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [serviceCosts, setServiceCosts] = useState<ServiceCost[]>([]);
  const [departments, setDepartments] = useState<Array<{ key: string; label: string }>>([]);
  const [deptFilter, setDeptFilter] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [s, t, sc, depts] = await Promise.all([
      getDepartmentStock(),
      getStockTransfers(),
      getServiceCosts({}),
      getActiveDepartments(),
    ]);
    setAllStock(s);
    setTransfers(t.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    setServiceCosts(sc.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    setDepartments(depts);
    setLoaded(true);
  };

  const filteredTransfers = deptFilter
    ? transfers.filter(t => t.fromDepartment === deptFilter || t.toDepartment === deptFilter)
    : transfers;

  const filteredCosts = deptFilter
    ? serviceCosts.filter(c => c.department === deptFilter)
    : serviceCosts;

  const totalServiceCost = filteredCosts.reduce((s, c) => s + c.totalCost, 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-light text-gray-900">Reports</h1>
        <p className="text-sm text-gray-400 mt-1">Stock, transfers, and cost reports</p>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setDeptFilter('')}
          className={`px-4 py-2 text-sm rounded-xl cursor-pointer ${!deptFilter ? 'bg-[#2a2a2a] text-white' : 'bg-white/60 text-gray-600'}`}
        >
          All Departments
        </button>
        {departments.map(d => (
          <button
            key={d.key}
            onClick={() => setDeptFilter(d.key)}
            className={`px-4 py-2 text-sm rounded-xl cursor-pointer ${deptFilter === d.key ? 'bg-[#2a2a2a] text-white' : 'bg-white/60 text-gray-600'}`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Stock Summary */}
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Stock Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {departments.map(dept => {
            const deptItems = allStock.filter(s => s.department === dept.key);
            const total = deptItems.reduce((s, item) => s + item.quantity, 0);
            return (
              <div key={dept.key} className={`p-3 rounded-xl ${deptFilter === dept.key ? 'bg-gold-300/30 border border-gold-400/30' : 'bg-white/40'}`}>
                <p className="text-[11px] text-gray-400">{dept.label}</p>
                <p className="text-lg font-light text-gray-900">{total}</p>
                <p className="text-[11px] text-gray-400">{deptItems.length} entries</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Service Cost Summary */}
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Service Cost Report</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-4">
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
            <p className="text-[11px] text-emerald-600 uppercase font-medium">Total Service Cost</p>
            <p className="text-lg font-light text-emerald-700">{formatCurrency(totalServiceCost)}</p>
          </div>
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-[11px] text-blue-600 uppercase font-medium">Cost Entries</p>
            <p className="text-lg font-light text-blue-700">{filteredCosts.length}</p>
          </div>
        </div>

        {filteredCosts.length > 0 && (
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
                {filteredCosts.slice(0, 20).map(sc => (
                  <tr key={sc.id} className="border-b border-gray-50">
                    <td className="py-2 text-[11px] text-gray-400">{new Date(sc.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                    <td className="py-2 text-gray-900">{DEPARTMENT_LABELS[sc.department] || sc.department}</td>
                    <td className="py-2 text-gray-500">{sc.size || '—'}</td>
                    <td className="py-2 text-right">{formatCurrency(sc.costPerPiece)}</td>
                    <td className="py-2 text-right">{sc.totalPieces}</td>
                    <td className="py-2 text-right font-medium">{formatCurrency(sc.totalCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transfer History */}
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Transfer History</h2>
        {loaded && filteredTransfers.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No transfers found</p>
        ) : (
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
                  <th className="pb-2 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransfers.slice(0, 30).map(t => (
                  <tr key={t.id} className="border-b border-gray-50">
                    <td className="py-2 text-[11px] text-gray-400">{new Date(t.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                    <td className="py-2">{DEPARTMENT_LABELS[t.fromDepartment] || t.fromDepartment}</td>
                    <td className="py-2">{DEPARTMENT_LABELS[t.toDepartment] || t.toDepartment}</td>
                    <td className="py-2 text-gray-500">{t.size || '—'}</td>
                    <td className="py-2 text-right font-medium">{t.quantity} {t.unit}</td>
                    <td className="py-2 text-gray-500">{t.transferredByName}</td>
                    <td className="py-2 text-gray-400">{t.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
