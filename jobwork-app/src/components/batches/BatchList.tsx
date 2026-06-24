import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../../store';
import type { Batch } from '../../types';
import { STAGE_LABELS } from '../../types';
import { getActiveBatches, createBatch, deleteBatch, getHodBatchesInProgress } from '../../database/operations';
import Modal from '../common/Modal';
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
  const [filter, setFilter] = useState<'all' | 'created' | 'in_progress' | 'completed'>('all');
  const [loaded, setLoaded] = useState(false);

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
    setLoaded(true);
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-light text-gray-900">Batch Management</h1>
          <p className="text-sm text-gray-400 mt-1">{batches.length} batches</p>
        </div>
        {canCreateBatch && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-[#2a2a2a] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#1a1a1a] cursor-pointer"
          >
            <Plus size={16} /> Create Batch
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-6">
        {(['all', 'created', 'in_progress', 'completed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm rounded-xl cursor-pointer ${
              filter === f ? 'bg-[#2a2a2a] text-white' : 'bg-white/60 text-gray-600'
            }`}
          >
            {f === 'all' ? 'All' : f.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map(batch => (
          <div key={batch.id} className="bg-white/60 rounded-2xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-4 cursor-pointer" onClick={() => navigate(`/batches/${batch.id}`)}>
              <div className="w-12 h-12 rounded-xl bg-gold-300 flex items-center justify-center">
                <Package size={20} className="text-dark-800" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{batch.batchNumber}</p>
                <p className="text-[11px] text-gray-400">
                  {batch.totalPieces} pieces · Sizes: {batch.sizes.join(', ')} · {new Date(batch.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-[11px] font-medium px-3 py-1.5 rounded-full ${
                batch.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                batch.status === 'in_progress' ? 'bg-gold-300 text-dark-800' :
                'bg-gray-100 text-gray-600'
              }`}>
                {STAGE_LABELS[batch.currentStage]} · {batch.status.replace('_', ' ')}
              </span>
              <button onClick={() => navigate(`/batches/${batch.id}`)} className="p-2 text-gray-400 hover:text-gray-700 cursor-pointer">
                <Eye size={16} />
              </button>
              {canDeleteBatch && (
                <button onClick={() => setShowDelete(batch)} className="p-2 text-red-400 hover:text-red-600 cursor-pointer">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        ))}
        {loaded && filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Package size={40} className="mx-auto mb-3 opacity-40" />
            <p>No batches found</p>
          </div>
        )}
      </div>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create New Batch">
        <div className="space-y-4">
          {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Total Pieces</label>
            <input type="number" min="1" value={form.totalPieces} onChange={e => setForm({ ...form, totalPieces: e.target.value })} required className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sizes (comma-separated)</label>
            <input type="text" value={form.sizes} onChange={e => setForm({ ...form, sizes: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400" placeholder="e.g. Small, Medium, Large" />
          </div>
          <button onClick={handleCreate} className="w-full bg-[#2a2a2a] text-white py-2.5 rounded-xl text-sm font-medium cursor-pointer">Create Batch</button>
        </div>
      </Modal>

      <Modal
        isOpen={!!showDelete}
        onClose={() => { setShowDelete(null); setDeleteReason(''); setDeleteAdminPassword(''); setError(''); }}
        title="Delete Batch"
        maxWidth="28rem"
      >
        <div className="space-y-4">
          <p className="text-gray-600 mb-4">Delete {showDelete?.batchNumber}?</p>
          {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason (required)</label>
            <textarea value={deleteReason} onChange={e => setDeleteReason(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400" rows={3} placeholder="Enter reason for deletion..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Admin Password (required)</label>
            <input type="password" value={deleteAdminPassword} onChange={e => setDeleteAdminPassword(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400" placeholder="Enter admin password" />
          </div>
          <div className="flex gap-3 justify-end mt-4">
            <button onClick={() => { setShowDelete(null); setDeleteReason(''); setDeleteAdminPassword(''); setError(''); }} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer">Cancel</button>
            <button onClick={handleDelete} className="px-4 py-2 text-sm bg-red-500 text-white rounded-xl hover:bg-red-600 cursor-pointer">Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
