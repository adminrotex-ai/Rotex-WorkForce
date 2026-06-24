import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import type { DepartmentStock, StockTransfer, FinalProduct, User } from '../../types';
import { DEPARTMENT_LABELS } from '../../types';
import {
  getDepartmentStock, addStockToDepartment, editDepartmentStock,
  transferStock, getStockTransfers, getActiveFinalProducts,
  getActiveUsers, getActiveDepartments, deleteDepartmentStock,
} from '../../database/operations';
import Modal from '../common/Modal';
import {
  ArrowLeft, Plus, ArrowRightLeft, Pencil, Trash2,
  Package, Warehouse,
} from 'lucide-react';

export default function DepartmentStockDetail() {
  const { department } = useParams<{ department: string }>();
  const { currentUser } = useSelector((s: RootState) => s.auth);
  const navigate = useNavigate();

  const [stock, setStock] = useState<DepartmentStock[]>([]);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [products, setProducts] = useState<FinalProduct[]>([]);
  const [hods, setHods] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Array<{ key: string; label: string }>>([]);

  const [showAdd, setShowAdd] = useState(false);
  const [showTransfer, setShowTransfer] = useState<DepartmentStock | null>(null);
  const [showEdit, setShowEdit] = useState<DepartmentStock | null>(null);
  const [showDelete, setShowDelete] = useState<DepartmentStock | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const [addForm, setAddForm] = useState({ productId: '', size: '', quantity: '', unit: 'pcs' });
  const [transferForm, setTransferForm] = useState({ toDepartment: '', targetHodId: '', quantity: '', notes: '' });
  const [editForm, setEditForm] = useState({ quantity: '', reason: '', password: '' });
  const [deleteForm, setDeleteForm] = useState({ reason: '', password: '' });
  const [error, setError] = useState('');

  const isPressing = department === 'pressing';
  const isWelding = department === 'welding';
  const deptLabel = DEPARTMENT_LABELS[department || ''] || department || '';

  useEffect(() => { load(); }, [department]);

  const load = async () => {
    if (!department) return;
    const [s, t, p, users, depts] = await Promise.all([
      getDepartmentStock(department),
      getStockTransfers(),
      getActiveFinalProducts(),
      getActiveUsers(),
      getActiveDepartments(),
    ]);
    setStock(s);
    setTransfers(t.filter(tr => tr.fromDepartment === department || tr.toDepartment === department)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    setProducts(p);
    setHods(users.filter(u => u.role === 'hod'));
    setDepartments(depts.filter(d => d.key !== department));
  };

  const handleAdd = async () => {
    if (!currentUser || !department) return;
    setError('');
    const qty = parseFloat(addForm.quantity);
    if (!Number.isFinite(qty) || qty <= 0) { setError('Enter a positive quantity'); return; }
    if (isPressing && !addForm.productId) { setError('Select a product for pressing department'); return; }
    if (isPressing && !addForm.size) { setError('Size is compulsory for pressing department'); return; }
    try {
      await addStockToDepartment(
        department, qty, addForm.unit, currentUser.id, currentUser.firstName,
        addForm.productId || undefined, addForm.size || undefined,
      );
      setShowAdd(false);
      setAddForm({ productId: '', size: '', quantity: '', unit: 'pcs' });
      load();
    } catch (e: any) { setError(e.message); }
  };

  const handleTransfer = async () => {
    if (!currentUser || !showTransfer || !department) return;
    setError('');
    const qty = parseFloat(transferForm.quantity);
    if (!Number.isFinite(qty) || qty <= 0) { setError('Enter a positive quantity'); return; }
    if (!transferForm.toDepartment) { setError('Select destination department'); return; }
    if (!transferForm.targetHodId) { setError('Select target HOD'); return; }
    try {
      await transferStock(
        department, transferForm.toDepartment, transferForm.targetHodId,
        qty, currentUser.id, currentUser.firstName,
        showTransfer.productId, showTransfer.size,
        transferForm.notes || undefined,
      );
      setShowTransfer(null);
      setTransferForm({ toDepartment: '', targetHodId: '', quantity: '', notes: '' });
      load();
    } catch (e: any) { setError(e.message); }
  };

  const handleEdit = async () => {
    if (!currentUser || !showEdit) return;
    setError('');
    const qty = parseFloat(editForm.quantity);
    if (!Number.isFinite(qty) || qty < 0) { setError('Enter a valid quantity'); return; }
    try {
      await editDepartmentStock(showEdit.id, qty, editForm.reason, currentUser.id, currentUser.firstName, editForm.password);
      setShowEdit(null);
      setEditForm({ quantity: '', reason: '', password: '' });
      load();
    } catch (e: any) { setError(e.message); }
  };

  const handleDelete = async () => {
    if (!currentUser || !showDelete) return;
    setError('');
    try {
      await deleteDepartmentStock(showDelete.id, deleteForm.reason, currentUser.id, currentUser.firstName, deleteForm.password);
      setShowDelete(null);
      setDeleteForm({ reason: '', password: '' });
      load();
    } catch (e: any) { setError(e.message); }
  };

  const hodsForDept = (deptKey: string) => hods.filter(h => h.department === deptKey);
  const productName = (pid?: string) => products.find(p => p.id === pid)?.name || '';

  if (!currentUser || currentUser.role !== 'admin') return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/stock')} className="p-2 hover:bg-white/60 rounded-xl cursor-pointer">
            <ArrowLeft size={18} className="text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-light text-gray-900">{deptLabel}</h1>
            <p className="text-sm text-gray-400 mt-1">Stock in {deptLabel.toLowerCase()}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 bg-white/60 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-white/80 cursor-pointer"
          >
            <ArrowRightLeft size={16} /> Transfers
          </button>
          <button
            onClick={() => { setShowAdd(true); setError(''); setAddForm({ productId: '', size: '', quantity: '', unit: 'pcs' }); }}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 cursor-pointer"
          >
            <Plus size={16} /> Add Stock
          </button>
        </div>
      </div>

      {stock.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Warehouse size={40} className="mx-auto mb-3 opacity-40" />
          <p>No stock in this department</p>
        </div>
      ) : (
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200">
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Size</th>
                <th className="px-4 py-3 font-medium text-right">Quantity</th>
                <th className="px-4 py-3 font-medium">Unit</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {stock.map(s => (
                <tr key={s.id} className="border-b border-gray-50 hover:bg-white/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Package size={14} className="text-gray-400" />
                      <span>{s.productId ? productName(s.productId) : 'General Stock'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {s.size ? (
                      <span className="text-[11px] px-2 py-0.5 bg-gold-100 text-gold-700 rounded-full font-bold">{s.size}</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-600">{s.quantity}</td>
                  <td className="px-4 py-3 text-gray-500">{s.unit}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => {
                          setShowTransfer(s);
                          setError('');
                          setTransferForm({ toDepartment: '', targetHodId: '', quantity: '', notes: '' });
                        }}
                        className="px-2.5 py-1 text-[11px] font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-full cursor-pointer"
                      >
                        Transfer
                      </button>
                      <button
                        onClick={() => {
                          setShowEdit(s);
                          setError('');
                          setEditForm({ quantity: String(s.quantity), reason: '', password: '' });
                        }}
                        className="p-1.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => {
                          setShowDelete(s);
                          setError('');
                          setDeleteForm({ reason: '', password: '' });
                        }}
                        className="p-1.5 text-red-400 hover:text-red-600 cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showHistory && (
        <div className="mt-6">
          <h2 className="text-lg font-light text-gray-900 mb-3">Transfer History</h2>
          {transfers.length === 0 ? (
            <p className="text-sm text-gray-400">No transfers yet</p>
          ) : (
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="px-4 py-2 font-medium">Date (IST)</th>
                    <th className="px-4 py-2 font-medium">From</th>
                    <th className="px-4 py-2 font-medium">To</th>
                    <th className="px-4 py-2 font-medium">Product</th>
                    <th className="px-4 py-2 font-medium">Size</th>
                    <th className="px-4 py-2 font-medium text-right">Qty</th>
                    <th className="px-4 py-2 font-medium">By</th>
                    <th className="px-4 py-2 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.map(t => (
                    <tr key={t.id} className="border-b border-gray-50">
                      <td className="px-4 py-2">{new Date(t.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                      <td className="px-4 py-2">{DEPARTMENT_LABELS[t.fromDepartment] || t.fromDepartment}</td>
                      <td className="px-4 py-2">{DEPARTMENT_LABELS[t.toDepartment] || t.toDepartment}</td>
                      <td className="px-4 py-2">{t.productId ? productName(t.productId) : '—'}</td>
                      <td className="px-4 py-2">{t.size || '—'}</td>
                      <td className="px-4 py-2 text-right font-medium">{t.quantity} {t.unit}</td>
                      <td className="px-4 py-2">{t.transferredByName}</td>
                      <td className="px-4 py-2 text-gray-400">{t.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Stock Modal */}
      <Modal isOpen={showAdd} onClose={() => { setShowAdd(false); setError(''); }} title={`Add Stock — ${deptLabel}`}>
        <div className="space-y-4">
          {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          {isPressing && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product *</label>
              <select
                value={addForm.productId}
                onChange={e => {
                  const p = products.find(pr => pr.id === e.target.value);
                  setAddForm({
                    ...addForm,
                    productId: e.target.value,
                    size: p?.size || addForm.size,
                    unit: p?.unit || addForm.unit,
                  });
                }}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              >
                <option value="">Select product</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}{p.size ? ` (${p.size})` : ''}</option>
                ))}
              </select>
            </div>
          )}
          {!isPressing && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product <span className="text-gray-400 font-normal">(optional)</span></label>
              <select
                value={addForm.productId}
                onChange={e => {
                  const p = products.find(pr => pr.id === e.target.value);
                  setAddForm({
                    ...addForm,
                    productId: e.target.value,
                    size: p?.size || addForm.size,
                    unit: p?.unit || addForm.unit,
                  });
                }}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              >
                <option value="">None (general stock)</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}{p.size ? ` (${p.size})` : ''}</option>
                ))}
              </select>
            </div>
          )}
          {!isWelding && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Size {isPressing ? '*' : <span className="text-gray-400 font-normal">(optional)</span>}
            </label>
            <input
              type="text"
              value={addForm.size}
              onChange={e => setAddForm({ ...addForm, size: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              placeholder="e.g. 12 inch, Large, 500ml"
            />
          </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={addForm.quantity}
                onChange={e => setAddForm({ ...addForm, quantity: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <input
                type="text"
                value={addForm.unit}
                onChange={e => setAddForm({ ...addForm, unit: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
                placeholder="pcs"
              />
            </div>
          </div>
          <button onClick={handleAdd} className="w-full bg-[#2a2a2a] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#1a1a1a] cursor-pointer">
            Add Stock
          </button>
        </div>
      </Modal>

      {/* Transfer Modal */}
      <Modal isOpen={!!showTransfer} onClose={() => { setShowTransfer(null); setError(''); }} title={`Transfer Stock${showTransfer?.size ? ` (${showTransfer.size})` : ''}`}>
        <div className="space-y-4">
          {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          {showTransfer && (
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-[11px] text-blue-700">
              Available: <strong>{showTransfer.quantity} {showTransfer.unit}</strong>
              {showTransfer.productId && <> · {productName(showTransfer.productId)}</>}
              {showTransfer.size && <> · Size: {showTransfer.size}</>}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Destination Department *</label>
            <select
              value={transferForm.toDepartment}
              onChange={e => setTransferForm({ ...transferForm, toDepartment: e.target.value, targetHodId: '' })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
            >
              <option value="">Select department</option>
              {departments.map(d => (
                <option key={d.key} value={d.key}>{d.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target HOD *</label>
            <select
              value={transferForm.targetHodId}
              onChange={e => setTransferForm({ ...transferForm, targetHodId: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
            >
              <option value="">Select HOD</option>
              {transferForm.toDepartment && hodsForDept(transferForm.toDepartment).map(h => (
                <option key={h.id} value={h.id}>{h.firstName}</option>
              ))}
            </select>
            {transferForm.toDepartment && hodsForDept(transferForm.toDepartment).length === 0 && (
              <p className="text-[11px] text-amber-600 mt-1">No HODs in this department</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              max={showTransfer?.quantity}
              value={transferForm.quantity}
              onChange={e => setTransferForm({ ...transferForm, quantity: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              type="text"
              value={transferForm.notes}
              onChange={e => setTransferForm({ ...transferForm, notes: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              placeholder="Any notes about this transfer"
            />
          </div>
          <button onClick={handleTransfer} className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 cursor-pointer">
            Transfer Stock
          </button>
        </div>
      </Modal>

      {/* Edit Stock Modal */}
      <Modal isOpen={!!showEdit} onClose={() => { setShowEdit(null); setError(''); }} title="Edit Stock Quantity">
        <div className="space-y-4">
          {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          {showEdit && (
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-[11px] text-amber-700">
              Current: <strong>{showEdit.quantity} {showEdit.unit}</strong>
              {showEdit.productId && <> · {productName(showEdit.productId)}</>}
              {showEdit.size && <> · Size: {showEdit.size}</>}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Quantity *</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={editForm.quantity}
              onChange={e => setEditForm({ ...editForm, quantity: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
            <textarea
              value={editForm.reason}
              onChange={e => setEditForm({ ...editForm, reason: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              rows={2}
              placeholder="Why is this being adjusted?"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Admin Password *</label>
            <input
              type="password"
              value={editForm.password}
              onChange={e => setEditForm({ ...editForm, password: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              placeholder="Enter admin password to confirm"
            />
          </div>
          <button onClick={handleEdit} className="w-full bg-[#2a2a2a] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#1a1a1a] cursor-pointer">
            Update Stock
          </button>
        </div>
      </Modal>

      {/* Delete Stock Modal */}
      <Modal isOpen={!!showDelete} onClose={() => { setShowDelete(null); setError(''); }} title="Delete Stock Entry">
        <div className="space-y-4">
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-[11px] text-red-700">
            This will remove the stock entry for{' '}
            <strong>
              {showDelete?.productId ? productName(showDelete.productId) : 'General Stock'}
              {showDelete?.size ? ` (${showDelete.size})` : ''}
            </strong>{' '}
            with {showDelete?.quantity} {showDelete?.unit}.
          </div>
          {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
            <textarea
              value={deleteForm.reason}
              onChange={e => setDeleteForm({ ...deleteForm, reason: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              rows={2}
              placeholder="Why is this being deleted?"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Admin Password *</label>
            <input
              type="password"
              value={deleteForm.password}
              onChange={e => setDeleteForm({ ...deleteForm, password: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              placeholder="Enter admin password to confirm"
            />
          </div>
          <button onClick={handleDelete} className="w-full bg-red-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-red-700 cursor-pointer">
            Delete Stock Entry
          </button>
        </div>
      </Modal>
    </div>
  );
}
