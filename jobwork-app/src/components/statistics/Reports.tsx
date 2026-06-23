import { useState, useEffect } from 'react';
import { getPeriodStatistics, getBatchStatistics, getActiveBatches } from '../../database/operations';
import { formatCurrency } from '../../utils/helpers';
import type { Batch } from '../../types';
import { STAGE_LABELS, type BatchStage } from '../../types';

export default function Reports() {
  const [period, setPeriod] = useState<'week' | 'month' | 'year' | 'all'>('month');
  const [stats, setStats] = useState<any>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [batchStats, setBatchStats] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [period]);

  useEffect(() => {
    if (selectedBatch) {
      getBatchStatistics(selectedBatch).then(setBatchStats);
    }
  }, [selectedBatch]);

  const loadData = async () => {
    const [s, b] = await Promise.all([
      getPeriodStatistics(period),
      getActiveBatches(),
    ]);
    setStats(s);
    setBatches(b);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-light text-gray-900">Reports</h1>
        <p className="text-sm text-gray-400 mt-1">Generate detailed reports</p>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2 mb-6">
        {(['week', 'month', 'year', 'all'] as const).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 text-sm rounded-xl cursor-pointer ${
              period === p ? 'bg-[#2a2a2a] text-white' : 'bg-white/60 text-gray-600'
            }`}
          >
            {p === 'all' ? 'All Time' : p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {/* Period Summary */}
      {stats && (
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            {period === 'all' ? 'All Time' : period.charAt(0).toUpperCase() + period.slice(1)} Report
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <p className="text-[11px] text-gray-400">Batches</p>
              <p className="text-xl font-light text-gray-900">{stats.batchCount}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400">Total Pieces</p>
              <p className="text-xl font-light text-gray-900">{stats.totalPieces}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400">Accepted / Rejected</p>
              <p className="text-xl font-light">
                <span className="text-emerald-600">{stats.totalAccepted}</span> / <span className="text-red-500">{stats.totalRejected}</span>
              </p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400">Total Cost</p>
              <p className="text-xl font-light text-gray-900">{formatCurrency(stats.totalConsumerCost + stats.totalServiceCost)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-[11px] text-blue-600 uppercase font-medium">Consumer Goods Cost</p>
              <p className="text-lg font-light text-blue-700">{formatCurrency(stats.totalConsumerCost)}</p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <p className="text-[11px] text-emerald-600 uppercase font-medium">Service Cost</p>
              <p className="text-lg font-light text-emerald-700">{formatCurrency(stats.totalServiceCost)}</p>
            </div>
          </div>

          {/* Raw Material vs Finished Product */}
          <div className="mt-6 p-4 rounded-xl bg-gold-300/20 border border-gold-400/20">
            <h3 className="text-sm font-semibold text-dark-800 mb-3">Raw Material to Finished Product Ratio</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-[11px] text-gray-400">Raw Material (from Foundry)</p>
                <p className="text-lg font-light text-gray-900">{stats.totalPieces} pcs</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400">Accepted Output</p>
                <p className="text-lg font-light text-emerald-600">{stats.totalAccepted} pcs</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400">Yield Rate</p>
                <p className="text-lg font-light text-gray-900">
                  {stats.totalPieces > 0 ? ((stats.totalAccepted / stats.totalPieces) * 100).toFixed(1) : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch-wise Report */}
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Batch-wise Report</h2>
        <select
          value={selectedBatch}
          onChange={e => setSelectedBatch(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 mb-4"
        >
          <option value="">Select a batch</option>
          {batches.map(b => (
            <option key={b.id} value={b.id}>{b.batchNumber} - {b.totalPieces} pcs ({b.status})</option>
          ))}
        </select>

        {batchStats && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-white/40 rounded-xl">
                <p className="text-[11px] text-gray-400">Total Pieces</p>
                <p className="text-lg font-light text-gray-900">{batchStats.batch?.totalPieces}</p>
              </div>
              <div className="p-3 bg-white/40 rounded-xl">
                <p className="text-[11px] text-gray-400">Current Stage</p>
                <p className="text-sm font-medium text-gray-900">{STAGE_LABELS[batchStats.batch?.currentStage as BatchStage]}</p>
              </div>
              <div className="p-3 bg-white/40 rounded-xl">
                <p className="text-[11px] text-gray-400">Consumer Goods</p>
                <p className="text-lg font-light text-blue-600">{formatCurrency(batchStats.totalConsumerCost)}</p>
              </div>
              <div className="p-3 bg-white/40 rounded-xl">
                <p className="text-[11px] text-gray-400">Service Cost</p>
                <p className="text-lg font-light text-emerald-600">{formatCurrency(batchStats.totalServiceCost)}</p>
              </div>
            </div>

            {/* Cost by department */}
            {Object.entries(batchStats.costBreakdown).length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-2">Cost by Department</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-200">
                      <th className="pb-2 font-medium">Department</th>
                      <th className="pb-2 font-medium text-right">Consumer Goods</th>
                      <th className="pb-2 font-medium text-right">Service Cost</th>
                      <th className="pb-2 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(batchStats.costBreakdown).map(([dept, costs]: [string, any]) => (
                      <tr key={dept} className="border-b border-gray-50">
                        <td className="py-2 capitalize">{dept}</td>
                        <td className="py-2 text-right">{formatCurrency(costs.consumerGoods)}</td>
                        <td className="py-2 text-right">{formatCurrency(costs.serviceCost)}</td>
                        <td className="py-2 text-right font-medium">{formatCurrency(costs.consumerGoods + costs.serviceCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Consumer goods detail for the batch */}
            {batchStats.consumerUsages.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-2">Consumer Goods Detail</h3>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-200">
                      <th className="pb-2 font-medium">Department</th>
                      <th className="pb-2 font-medium text-right">Qty</th>
                      <th className="pb-2 font-medium text-right">Price/Unit</th>
                      <th className="pb-2 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchStats.consumerUsages.map((u: any) => (
                      <tr key={u.id} className="border-b border-gray-50">
                        <td className="py-1.5 capitalize">{u.department}</td>
                        <td className="py-1.5 text-right">{u.quantity}</td>
                        <td className="py-1.5 text-right">{formatCurrency(u.pricePerUnit)}</td>
                        <td className="py-1.5 text-right font-medium">{formatCurrency(u.totalCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Service costs detail */}
            {batchStats.serviceCosts.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-2">Service Costs Detail</h3>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-200">
                      <th className="pb-2 font-medium">Department</th>
                      <th className="pb-2 font-medium">Size</th>
                      <th className="pb-2 font-medium text-right">Cost/Piece</th>
                      <th className="pb-2 font-medium text-right">Pieces</th>
                      <th className="pb-2 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchStats.serviceCosts.map((s: any) => (
                      <tr key={s.id} className="border-b border-gray-50">
                        <td className="py-1.5 capitalize">{s.department}</td>
                        <td className="py-1.5">{s.size || 'All'}</td>
                        <td className="py-1.5 text-right">{formatCurrency(s.costPerPiece)}</td>
                        <td className="py-1.5 text-right">{s.totalPieces}</td>
                        <td className="py-1.5 text-right font-medium">{formatCurrency(s.totalCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
