import { useState, useEffect } from 'react';
import type { AuditLog } from '../../types';
import { getAuditLogs } from '../../database/operations';
import { formatDate } from '../../utils/helpers';
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
  { value: 'deletion', label: 'Deletions' },
  { value: 'general', label: 'General' },
];

const CATEGORY_COLORS: Record<string, string> = {
  batch: 'bg-blue-100 text-blue-700',
  user: 'bg-purple-100 text-purple-700',
  cost: 'bg-green-100 text-green-700',
  transfer: 'bg-cyan-100 text-cyan-700',
  material: 'bg-yellow-100 text-yellow-700',
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#001f3f' }}>Audit Logs</h1>
        <p className="text-gray-500 text-sm">Complete audit trail of all actions</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter size={16} className="text-gray-400" />
        {CATEGORIES.map(c => (
          <button
            key={c.value}
            onClick={() => setFilter(c.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === c.value ? 'text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
            style={filter === c.value ? { backgroundColor: '#001f3f' } : {}}
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
        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#001f3f]"
      />

      {/* Logs */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center border border-gray-100" style={{ borderRadius: '8px' }}>
            <ClipboardList size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-400">No audit logs found</p>
          </div>
        ) : (
          filtered.map(log => (
            <div key={log.id} className="bg-white rounded-lg p-4 border border-gray-100 animate-fade-in" style={{ borderRadius: '8px' }}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${CATEGORY_COLORS[log.category]}`}>
                      {log.category.replace('_', ' ')}
                    </span>
                    <span className="text-xs font-mono text-gray-400">{log.action}</span>
                  </div>
                  <p className="text-sm text-gray-700">{log.details}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span>By: {log.userName}</span>
                    <span>{formatDate(log.createdAt)}</span>
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
