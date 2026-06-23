import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../../store';
import type { Batch } from '../../types';
import { STAGE_LABELS } from '../../types';
import { getActiveBatches, createBatch, deleteBatch, getHodBatchesInProgress } from '../../database/operations';
import { formatDate } from '../../utils/helpers';
import Modal from '../common/Modal';
import { PageHeader, PillTabs } from '../common/Widgets';
import { Plus, Trash2, Eye, Package } from 'lucide-react';

export default function BatchList() {
  const { currentUser } = useSelector((s: RootState) => s.auth);
  const navigate = useNavigate();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showDelete, setShowDelete] = useState<Batch | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteAdminPassword, setDeleteAdminPassword] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({ totalPieces: '', sizes: '' });
  const [filter, setFilter] = useState('all');

  const isAdmin = currentUser?.role === 'admin';
  const isStoreHod = currentUser?.role === 'hod' && currentUser.department === 'store';
  const canCreateBatch = isAdmin || isStoreHod;
  const canDeleteBatch = isAdmin || isStoreHod;

  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = async () => {
    if (!currentUser) return;
    if (isAdmin || isStoreHod) {
      setBatches(await getActiveBatches());
    } else if (currentUser.role === 'hod') {
      const inProgress = await getHodBatchesInProgress(currentUser.id);
      setBatches(inProgress.map(i => i.batch));
    } else {
      const allBatches = await getActiveBatches();
      setBatches(allBatches);
    }
  };

  const handleCreate = async () => {
    setError('');
    const pieces = parseInt(form.totalPieces);
    if (!pieces || pieces <= 0) { setError('Enter valid piece count'); return; }
    if (!form.sizes.trim()) { setError('Enter at least one size'); return; }

    try {
      const sizes = form.sizes.split(',').map(s => s.trim()).filter(Boolean);
      await createBatch(pieces, sizes, currentUser!.id, currentUser!.firstName);
      setShowCreate(false);
      setForm({ totalPieces: '', sizes: '' });
      loadBatches();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDelete = async () => {
    if (!showDelete || !deleteReason.trim()) { setError('Deletion reason is required'); return; }
    if (!deleteAdminPassword) { setError('Admin password is required'); return; }
    try {
      await deleteBatch(showDelete.id, deleteReason, currentUser!.id, currentUser!.firstName, deleteAdminPassword);
      setShowDelete(null);
      setDeleteReason('');
      setDeleteAdminPassword('');
      setError('');
      loadBatches();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const filtered = filter === 'all' ? batches : batches.filter(b => b.status === filter);

  const filterTabs = [
    { key: 'all', label: 'All', count: batches.length },
    { key: 'created', label: 'Created', count: batches.filter(b => b.status === 'created').length },
    { key: 'in_progress', label: 'In Progress', count: batches.filter(b => b.status === 'in_progress').length },
    { key: 'completed', label: 'Completed', count: batches.filter(b => b.status === 'completed').length },
  ];

  return (
    <div className="space-y-10">
      <PageHeader
        title="Batches"
        subtitle={`${batches.length} total batches`}
        action={canCreateBatch ? (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 text-white rounded-2xl hover:opacity-90"
            style={{ backgroundColor: '#2d2d2d' }}
          >
            <Plus size={18} /><span className="text-sm font-medium">Create Batch</span>
          </button>
        ) : undefined}
      />

      <PillTabs tabs={filterTabs} active={filter} onChange={setFilter} />

      {/* Batch List */}
      {filtered.length === 0 ? (
        <div className="warm-card p-12 text-center">
          <Package size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-400">No batches found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(batch => (
            <div
              key={batch.id}
              className="warm-card p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/batches/${batch.id}`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[#c9a227]/10">
                    <Package size={22} className="text-[#c9a227]" />
                  </div>
                  <div>
                    <p className="font-semibold">{batch.batchNumber}</p>
                    <p className="text-xs text-gray-400">
                      {batch.totalPieces} pieces | Sizes: {batch.sizes.join(', ')} | Created: {formatDate(batch.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      batch.status === 'completed' ? 'bg-green-100 text-green-700' :
                      batch.status === 'in_progress' ? 'bg-[#c9a227]/10 text-[#c9a227]' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {batch.status.replace('_', ' ')}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">{STAGE_LABELS[batch.currentStage]}</p>
                  </div>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => navigate(`/batches/${batch.id}`)}
                      className="p-2 rounded-2xl hover:bg-blue-50 text-blue-500"
                    >
                      <Eye size={16} />
                    </button>
                    {canDeleteBatch && (
                      <button
                        onClick={() => setShowDelete(batch)}
                        className="p-2 rounded-2xl hover:bg-red-50 text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Batch Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create New Batch">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Total Pieces</label>
            <input
              type="number"
              value={form.totalPieces}
              onChange={e => setForm({ ...form, totalPieces: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:border-[#c9a227] text-sm"
              placeholder="Enter total number of pieces"
              min="1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sizes (comma-separated)</label>
            <input
              type="text"
              value={form.sizes}
              onChange={e => setForm({ ...form, sizes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:border-[#c9a227] text-sm"
              placeholder="e.g. Small, Medium, Large"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            onClick={handleCreate}
            className="w-full py-2.5 text-white font-medium rounded-2xl hover:opacity-90 text-sm bg-[#2d2d2d]"
          >
            Create Batch
          </button>
        </div>
      </Modal>

      {/* Delete Batch Modal */}
      <Modal
        isOpen={!!showDelete}
        onClose={() => { setShowDelete(null); setDeleteReason(''); setDeleteAdminPassword(''); setError(''); }}
        title="Delete Batch"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Delete batch <strong>{showDelete?.batchNumber}</strong>?
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason (required)</label>
            <textarea
              value={deleteReason}
              onChange={e => setDeleteReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:border-red-500 text-sm"
              rows={3}
              placeholder="Enter reason for deletion"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Admin Password (required)</label>
            <input
              type="password"
              value={deleteAdminPassword}
              onChange={e => setDeleteAdminPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:border-red-500 text-sm"
              placeholder="Enter admin password to confirm"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-3">
            <button
              onClick={() => { setShowDelete(null); setDeleteReason(''); setDeleteAdminPassword(''); setError(''); }}
              className="flex-1 py-2.5 border border-gray-300 rounded-2xl text-sm"
            >
              Cancel
            </button>
            <button onClick={handleDelete} className="flex-1 py-2.5 bg-red-500 text-white rounded-2xl text-sm hover:bg-red-600">Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
