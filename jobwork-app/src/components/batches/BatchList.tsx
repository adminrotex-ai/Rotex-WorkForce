import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../../store';
import type { Batch } from '../../types';
import { STAGE_LABELS } from '../../types';
import { getActiveBatches, createBatch, deleteBatch, getHodBatchesInProgress } from '../../database/operations';
import { formatDate } from '../../utils/helpers';
import Modal from '../common/Modal';
import { Plus, Trash2, Eye, Package } from 'lucide-react';

export default function BatchList() {
  const { currentUser } = useSelector((s: RootState) => s.auth);
  const navigate = useNavigate();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showDelete, setShowDelete] = useState<Batch | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({ totalPieces: '', sizes: '' });
  const [filter, setFilter] = useState<'all' | 'created' | 'in_progress' | 'completed'>('all');

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
    try {
      await deleteBatch(showDelete.id, deleteReason, currentUser!.id, currentUser!.firstName);
      setShowDelete(null);
      setDeleteReason('');
      loadBatches();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const filtered = filter === 'all' ? batches : batches.filter(b => b.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" >Batches</h1>
          <p className="text-gray-500 text-sm">{batches.length} total batches</p>
        </div>
        {canCreateBatch && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 text-white rounded-2xl hover:opacity-90"
            style={{ backgroundColor: '#009688',  }}
          >
            <Plus size={18} /><span className="text-sm font-medium">Create Batch</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'created', 'in_progress', 'completed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-2xl text-sm font-medium transition-colors ${
              filter === f ? 'text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
            style={filter === f ? { backgroundColor: '#009688' } : {}}
          >
            {f === 'all' ? 'All' : f.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </button>
        ))}
      </div>

      {/* Batch List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
          <Package size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-400">No batches found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(batch => (
            <div
              key={batch.id}
              className="bg-white rounded-2xl p-4 border border-gray-100 hover:shadow-sm transition-shadow cursor-pointer"
             
              onClick={() => navigate(`/batches/${batch.id}`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-r from-[#009688] to-[#00796b]">
                    <Package size={22} className="text-white" />
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
                      batch.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
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
              className="w-full px-3 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:border-[#009688] text-sm"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:border-[#009688] text-sm"
              placeholder="e.g. Small, Medium, Large"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            onClick={handleCreate}
            className="w-full py-2 text-white font-medium rounded-2xl hover:opacity-90 text-sm"
            style={{ backgroundColor: '#009688',  }}
          >
            Create Batch
          </button>
        </div>
      </Modal>

      {/* Delete Batch Modal */}
      <Modal isOpen={!!showDelete} onClose={() => { setShowDelete(null); setDeleteReason(''); }} title="Delete Batch">
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
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-3">
            <button onClick={() => { setShowDelete(null); setDeleteReason(''); }} className="flex-1 py-2 border border-gray-300 rounded-2xl text-sm">Cancel</button>
            <button onClick={handleDelete} className="flex-1 py-2 bg-red-500 text-white rounded-2xl text-sm hover:bg-red-600">Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
