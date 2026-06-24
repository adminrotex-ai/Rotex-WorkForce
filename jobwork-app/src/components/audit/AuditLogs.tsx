import { useState, useEffect } from 'react';
import type { AuditLog } from '../../types';
import { getAuditLogs } from '../../database/operations';
import { ClipboardList, Filter } from 'lucide-react';

const CATEGORIES: Array<{ value: AuditLog['category'] | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'batch', label: 'Batches' },
  { value: 'user', label: 'Users' },
  { value: 'cost', label: 'Costs' },
  { value: 'transfer', label: 'Transfers' },
  { value: 'material', label: 'Materials' },
  { value: 'consumer_goods', label: 'Consumer Goods' },
  { value: 'payment', label: 'Payments' },
  { value: 'deletion', label: 'Delete History' },
  { value: 'general', label: 'General' },
];

const CATEGORY_COLORS: Record<string, string> = {
  batch: 'bg-blue-100 text-blue-700',
  user: 'bg-purple-100 text-purple-700',
  cost: 'bg-emerald-100 text-emerald-700',
  transfer: 'bg-cyan-100 text-cyan-700',
  material: 'bg-amber-100 text-amber-700',
  consumer_goods: 'bg-orange-100 text-orange-700',
  payment: 'bg-emerald-100 text-emerald-700',
  deletion: 'bg-red-100 text-red-700',
  general: 'bg-gray-100 text-gray-700',
};

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filter, setFilter] = useState<AuditLog['category'] | 'all'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadLogs();
  }, [filter]);

  const loadLogs = async () => {
    const filters = filter !== 'all' ? { category: filter } : undefined;
    setLogs(await getAuditLogs(filters));
  };

  const filtered = search
    ? logs.filter(l =>
        l.details.toLowerCase().includes(search.toLowerCase()) ||
        l.userName.toLowerCase().includes(search.toLowerCase()) ||
        l.action.toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-light text-gray-900">Audit Logs</h1>
        <p className="text-sm text-gray-400 mt-1">Complete audit trail of all actions</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center mb-6">
        <Filter size={16} className="text-gray-400" />
        {CATEGORIES.map(c => (
          <button
            key={c.value}
            onClick={() => setFilter(c.value)}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-medium cursor-pointer ${
              filter === c.value ? 'bg-[#2a2a2a] text-white' : 'bg-white/60 text-gray-600'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search audit logs..."
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 mb-6"
      />

      {/* Logs */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <ClipboardList size={40} className="mx-auto mb-3 opacity-40" />
            <p>No audit logs found</p>
          </div>
        ) : (
          filtered.map(log => (
            <div key={log.id} className="bg-white/60 backdrop-blur-sm rounded-2xl p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${CATEGORY_COLORS[log.category]}`}>
                      {log.category.replace('_', ' ')}
                    </span>
                    <span className="text-[11px] font-mono text-gray-400">{log.action}</span>
                  </div>
                  <p className="text-sm text-gray-700">{log.details}</p>
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400">
                    <span>By: {log.userName}</span>
                    <span>{new Date(log.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
