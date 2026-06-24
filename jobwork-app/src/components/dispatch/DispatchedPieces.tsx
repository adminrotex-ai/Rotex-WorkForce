import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import type { DispatchEntry } from '../../types';
import { getDispatchEntries, deleteDispatchEntry } from '../../database/operations';
import Modal from '../common/Modal';
import { Truck, Trash2, Package } from 'lucide-react';

export default function DispatchedPieces() {
  const { currentUser } = useSelector((s: RootState) => s.auth);
  const [entries, setEntries] = useState<DispatchEntry[]>([]);
  const [showDelete, setShowDelete] = useState<DispatchEntry | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => { load(); }, []);

  const load = async () => {
    const list = await getDispatchEntries();
    setEntries(list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    setLoaded(true);
  };

  const handleDelete = async () => {
    if (!currentUser || !showDelete) return;
    setError('');
    try {
      await deleteDispatchEntry(showDelete.id, deleteReason, currentUser.id, currentUser.firstName, deletePassword);
      setShowDelete(null);
      setDeleteReason('');
      setDeletePassword('');
      load();
    } catch (e: any) { setError(e.message); }
  };

  const totalDispatched = entries.reduce((s, e) => s + e.quantity, 0);
  const uniqueParties = new Set(entries.map(e => e.partyName)).size;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-light text-gray-900">Dispatched Pieces</h1>
          <p className="text-sm text-gray-400 mt-1">Monitor pieces sold and dispatched to parties</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gold-300 flex items-center justify-center shrink-0">
            <Truck size={20} className="text-dark-800" />
          </div>
          <div>
            <p className="text-2xl font-light text-gray-900">{entries.length}</p>
            <p className="text-sm text-gray-600">Total Dispatches</p>
          </div>
        </div>
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-200 flex items-center justify-center shrink-0">
            <Package size={20} className="text-dark-800" />
          </div>
          <div>
            <p className="text-2xl font-light text-emerald-600">{totalDispatched}</p>
            <p className="text-sm text-gray-600">Pieces Dispatched</p>
          </div>
        </div>
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-200 flex items-center justify-center shrink-0">
            <Truck size={20} className="text-dark-800" />
          </div>
          <div>
            <p className="text-2xl font-light text-gray-900">{uniqueParties}</p>
            <p className="text-sm text-gray-600">Parties Served</p>
          </div>
        </div>
      </div>

      {loaded && entries.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Truck size={40} className="mx-auto mb-3 opacity-40" />
          <p>No dispatches yet</p>
          <p className="text-[11px] mt-1">Dispatch packed products from the Store stock management page</p>
        </div>
      ) : entries.length > 0 ? (
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200">
                <th className="px-4 py-3 font-medium">Date (IST)</th>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Size</th>
                <th className="px-4 py-3 font-medium">Party</th>
                <th className="px-4 py-3 font-medium text-right">Quantity</th>
                <th className="px-4 py-3 font-medium">Unit</th>
                <th className="px-4 py-3 font-medium">Dispatched By</th>
                <th className="px-4 py-3 font-medium">Notes</th>
                {isAdmin && <th className="px-4 py-3 font-medium text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.id} className="border-b border-gray-50 hover:bg-white/40">
                  <td className="px-4 py-3 text-xs">{new Date(e.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                  <td className="px-4 py-3">
                    <span className="text-[11px] px-2 py-0.5 bg-gold-100 text-gold-700 rounded-full font-medium">{e.productName}</span>
                  </td>
                  <td className="px-4 py-3">
                    {e.size ? (
                      <span className="text-[11px] px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-bold">{e.size}</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{e.partyName}</td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-600">{e.quantity}</td>
                  <td className="px-4 py-3 text-gray-500">{e.unit}</td>
                  <td className="px-4 py-3 text-gray-600">{e.dispatchedByName}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{e.notes || '—'}</td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => { setShowDelete(e); setError(''); setDeleteReason(''); setDeletePassword(''); }}
                        className="p-1.5 text-red-400 hover:text-red-600 cursor-pointer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <Modal isOpen={!!showDelete} onClose={() => { setShowDelete(null); setError(''); }} title="Delete Dispatch Entry">
        <div className="space-y-4">
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-[11px] text-red-700">
            This will delete the dispatch of <strong>{showDelete?.quantity} {showDelete?.unit}</strong> of{' '}
            <strong>{showDelete?.productName}{showDelete?.size ? ` (${showDelete.size})` : ''}</strong>{' '}
            to <strong>{showDelete?.partyName}</strong>.
            <br /><br />
            The stock will be returned to the Store department.
          </div>
          {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Deletion *</label>
            <textarea
              value={deleteReason}
              onChange={e => setDeleteReason(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              rows={2}
              placeholder="Why is this dispatch being reversed?"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Admin Password *</label>
            <input
              type="password"
              value={deletePassword}
              onChange={e => setDeletePassword(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              placeholder="Enter admin password to confirm"
            />
          </div>
          <button onClick={handleDelete} className="w-full bg-red-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-red-700 cursor-pointer">
            Delete & Return Stock
          </button>
        </div>
      </Modal>
    </div>
  );
}
