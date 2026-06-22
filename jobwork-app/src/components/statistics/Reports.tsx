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
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold" >Reports</h1>
        <p className="text-gray-500 text-sm">Generate detailed reports</p>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2">
        {(['week', 'month', 'year', 'all'] as const).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-2xl text-sm font-medium transition-colors ${
              period === p ? 'text-white' : 'bg-white text-gray-600 border border-gray-200'
            }`}
            style={period === p ? { backgroundColor: '#1a237e' } : {}}
          >
            {p === 'all' ? 'All Time' : p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {/* Period Summary */}
      {stats && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <h2 className="text-lg font-semibold mb-4" >
            {period === 'all' ? 'All Time' : period.charAt(0).toUpperCase() + period.slice(1)} Report
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <p className="text-xs text-gray-500">Batches</p>
              <p className="text-xl font-bold">{stats.batchCount}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Pieces</p>
              <p className="text-xl font-bold">{stats.totalPieces}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Accepted / Rejected</p>
              <p className="text-xl font-bold">
                <span className="text-green-600">{stats.totalAccepted}</span> / <span className="text-red-500">{stats.totalRejected}</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Cost</p>
              <p className="text-xl font-bold" >{formatCurrency(stats.totalConsumerCost + stats.totalServiceCost)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
              <p className="text-xs text-blue-600 uppercase font-medium">Consumer Goods Cost</p>
              <p className="text-lg font-bold text-blue-700">{formatCurrency(stats.totalConsumerCost)}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
              <p className="text-xs text-green-600 uppercase font-medium">Service Cost</p>
              <p className="text-lg font-bold text-green-700">{formatCurrency(stats.totalServiceCost)}</p>
            </div>
          </div>

          {/* Raw Material vs Finished Product */}
          <div className="mt-6 p-4 rounded-2xl" style={{ backgroundColor: '#1a237e10', border: '1px solid #1a237e20' }}>
            <h3 className="text-sm font-semibold mb-3" >Raw Material to Finished Product Ratio</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-500">Raw Material (from Foundry)</p>
                <p className="text-lg font-bold">{stats.totalPieces} pcs</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Accepted Output</p>
                <p className="text-lg font-bold text-green-600">{stats.totalAccepted} pcs</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Yield Rate</p>
                <p className="text-lg font-bold" >
                  {stats.totalPieces > 0 ? ((stats.totalAccepted / stats.totalPieces) * 100).toFixed(1) : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch-wise Report */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100">
        <h2 className="text-lg font-semibold mb-4" >Batch-wise Report</h2>
        <select
          value={selectedBatch}
          onChange={e => setSelectedBatch(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-2xl text-sm mb-4"
        >
          <option value="">Select a batch</option>
          {batches.map(b => (
            <option key={b.id} value={b.id}>{b.batchNumber} - {b.totalPieces} pcs ({b.status})</option>
          ))}
        </select>

        {batchStats && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-gray-50 rounded-2xl">
                <p className="text-xs text-gray-500">Total Pieces</p>
                <p className="text-lg font-bold">{batchStats.batch?.totalPieces}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-2xl">
                <p className="text-xs text-gray-500">Current Stage</p>
                <p className="text-sm font-bold">{STAGE_LABELS[batchStats.batch?.currentStage as BatchStage]}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-2xl">
                <p className="text-xs text-gray-500">Consumer Goods</p>
                <p className="text-lg font-bold text-blue-600">{formatCurrency(batchStats.totalConsumerCost)}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-2xl">
                <p className="text-xs text-gray-500">Service Cost</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(batchStats.totalServiceCost)}</p>
              </div>
            </div>

            {/* Cost by department */}
            {Object.entries(batchStats.costBreakdown).length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-2">Cost by Department</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
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
                    <tr className="text-left text-gray-500 border-b">
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
                    <tr className="text-left text-gray-500 border-b">
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
