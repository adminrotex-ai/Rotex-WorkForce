import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import type { ConsumerGoodItem, ConsumerGoodInventory } from '../../types';
import {
  getActiveConsumerGoods, createConsumerGoodItem, updateConsumerGoodItem,
  deleteConsumerGoodItem, addConsumerGoodToInventory, getConsumerGoodInventory,
} from '../../database/operations';
import { formatCurrency, formatDate } from '../../utils/helpers';
import Modal from '../common/Modal';
import { Plus, Edit, Trash2, Package, ChevronRight } from 'lucide-react';

export default function ConsumerGoods() {
  const { currentUser } = useSelector((s: RootState) => s.auth);
  const [items, setItems] = useState<ConsumerGoodItem[]>([]);
  const [inventory, setInventory] = useState<ConsumerGoodInventory[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState<ConsumerGoodItem | null>(null);
  const [showDelete, setShowDelete] = useState<ConsumerGoodItem | null>(null);
  const [showInventory, setShowInventory] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [editName, setEditName] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [error, setError] = useState('');

  const [invForm, setInvForm] = useState({
    goodId: '',
    quantity: '',
    pricePerUnit: '',
    supplierName: '',
    billPhoto: '',
  });

  const isAdmin = currentUser?.role === 'admin';
  const isStoreHod = currentUser?.role === 'hod' && currentUser.department === 'store';
  const canManage = isAdmin || isStoreHod;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setItems(await getActiveConsumerGoods());
    setInventory(await getConsumerGoodInventory());
  };

  const handleAdd = async () => {
    if (!name.trim() || !currentUser) { setError('Enter name'); return; }
    try {
      await createConsumerGoodItem(name, currentUser.id, currentUser.firstName);
      setShowAdd(false);
      setName('');
      loadData();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleEdit = async () => {
    if (!showEdit || !editName.trim() || !currentUser) { setError('Enter name'); return; }
    try {
      await updateConsumerGoodItem(showEdit.id, editName, currentUser.id, currentUser.firstName);
      setShowEdit(null);
      setEditName('');
      loadData();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDelete = async () => {
    if (!showDelete || !deleteReason.trim() || !currentUser) { setError('Reason is required'); return; }
    try {
      await deleteConsumerGoodItem(showDelete.id, deleteReason, currentUser.id, currentUser.firstName);
      setShowDelete(null);
      setDeleteReason('');
      loadData();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleAddInventory = async () => {
    if (!currentUser) return;
    const qty = parseFloat(invForm.quantity);
    const price = parseFloat(invForm.pricePerUnit);
    if (!invForm.goodId || !qty || !price) { setError('Fill all fields'); return; }
    try {
      await addConsumerGoodToInventory(
        invForm.goodId, qty, price, currentUser.id, currentUser.firstName,
        invForm.supplierName || undefined, invForm.billPhoto || undefined
      );
      setShowInventory(false);
      setInvForm({ goodId: '', quantity: '', pricePerUnit: '', supplierName: '', billPhoto: '' });
      loadData();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleBillUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setInvForm({ ...invForm, billPhoto: ev.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#001f3f' }}>Consumer Goods</h1>
          <p className="text-gray-500 text-sm">Manage consumer goods items and inventory</p>
        </div>
        <div className="flex gap-2">
          {canManage && (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm hover:opacity-90"
              style={{ backgroundColor: '#001f3f', borderRadius: '8px' }}
            >
              <Plus size={16} /> Add Item
            </button>
          )}
          <button
            onClick={() => setShowInventory(true)}
            className="flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm hover:opacity-90"
            style={{ backgroundColor: '#0074d9', borderRadius: '8px' }}
          >
            <Package size={16} /> Add to Inventory
          </button>
        </div>
      </div>

      {/* Items List */}
      <div className="space-y-3">
        {items.map(item => {
          const itemInv = inventory.filter(i => i.consumerGoodId === item.id);
          const totalQty = itemInv.reduce((s, i) => s + i.quantity, 0);
          const isExpanded = expandedItem === item.id;

          return (
            <div key={item.id} className="bg-white rounded-lg border border-gray-100 overflow-hidden" style={{ borderRadius: '8px' }}>
              <div
                className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => setExpandedItem(isExpanded ? null : item.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-orange-100">
                    <Package size={18} className="text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-gray-400">{itemInv.length} entries | Total: {totalQty} units</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {canManage && (
                    <>
                      <button
                        onClick={e => { e.stopPropagation(); setShowEdit(item); setEditName(item.name); }}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setShowDelete(item); }}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                  <ChevronRight size={16} className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </div>
              </div>

              {isExpanded && itemInv.length > 0 && (
                <div className="border-t border-gray-100 p-4 animate-fade-in">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-gray-500 border-b">
                        <th className="pb-2 font-medium">Date</th>
                        <th className="pb-2 font-medium">Supplier</th>
                        <th className="pb-2 font-medium text-right">Qty</th>
                        <th className="pb-2 font-medium text-right">Price/Unit</th>
                        <th className="pb-2 font-medium text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemInv.map(inv => (
                        <tr key={inv.id} className="border-b border-gray-50">
                          <td className="py-2">{formatDate(inv.createdAt)}</td>
                          <td className="py-2">{inv.supplierName || '-'}</td>
                          <td className="py-2 text-right">{inv.quantity}</td>
                          <td className="py-2 text-right">{formatCurrency(inv.pricePerUnit)}</td>
                          <td className="py-2 text-right font-medium">{formatCurrency(inv.quantity * inv.pricePerUnit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Item Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Consumer Good Item">
        <div className="space-y-4">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            placeholder="Item name"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button onClick={handleAdd} className="w-full py-2 text-white rounded-lg text-sm" style={{ backgroundColor: '#001f3f', borderRadius: '8px' }}>
            Add Item
          </button>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!showEdit} onClose={() => setShowEdit(null)} title="Edit Consumer Good">
        <div className="space-y-4">
          <input
            type="text"
            value={editName}
            onChange={e => setEditName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button onClick={handleEdit} className="w-full py-2 text-white rounded-lg text-sm" style={{ backgroundColor: '#0074d9', borderRadius: '8px' }}>
            Update
          </button>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={!!showDelete} onClose={() => { setShowDelete(null); setDeleteReason(''); }} title="Delete Consumer Good">
        <div className="space-y-4">
          <p className="text-sm">Delete <strong>{showDelete?.name}</strong>?</p>
          <textarea
            value={deleteReason}
            onChange={e => setDeleteReason(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            rows={3}
            placeholder="Reason for deletion (required)"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button onClick={handleDelete} className="w-full py-2 bg-red-500 text-white rounded-lg text-sm">Delete</button>
        </div>
      </Modal>

      {/* Add Inventory Modal */}
      <Modal isOpen={showInventory} onClose={() => setShowInventory(false)} title="Add to Inventory">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Consumer Good</label>
            <select
              value={invForm.goodId}
              onChange={e => setInvForm({ ...invForm, goodId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Select item</option>
              {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input type="number" value={invForm.quantity} onChange={e => setInvForm({ ...invForm, quantity: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price/Unit (INR)</label>
              <input type="number" value={invForm.pricePerUnit} onChange={e => setInvForm({ ...invForm, pricePerUnit: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
            <input type="text" value={invForm.supplierName} onChange={e => setInvForm({ ...invForm, supplierName: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bill Photo</label>
            <input type="file" accept="image/*" onChange={handleBillUpload} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button onClick={handleAddInventory} className="w-full py-2 text-white rounded-lg text-sm" style={{ backgroundColor: '#0074d9', borderRadius: '8px' }}>
            Add to Inventory
          </button>
        </div>
      </Modal>
    </div>
  );
}
