import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import type { ConsumerGoodItem, ConsumerGoodInventory, ConsumerGoodReceipt, User } from '../../types';
import { DEPARTMENT_LABELS } from '../../types';
import {
  getActiveConsumerGoods, createConsumerGoodItem, updateConsumerGoodItem,
  deleteConsumerGoodItem, addConsumerGoodToInventory, getConsumerGoodInventory,
  getAvailableStockTotal, issueConsumerGoodsToHod, getAllReceipts,
  getReceiptsForHod, getActiveUsers,
} from '../../database/operations';
import { formatCurrency } from '../../utils/helpers';
import Modal from '../common/Modal';
import { Plus, Edit, Trash2, Package, ChevronRight, Send, FileText } from 'lucide-react';

export default function ConsumerGoods() {
  const { currentUser } = useSelector((s: RootState) => s.auth);
  const [items, setItems] = useState<ConsumerGoodItem[]>([]);
  const [inventory, setInventory] = useState<ConsumerGoodInventory[]>([]);
  const [receipts, setReceipts] = useState<ConsumerGoodReceipt[]>([]);
  const [hods, setHods] = useState<User[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState<ConsumerGoodItem | null>(null);
  const [showDelete, setShowDelete] = useState<ConsumerGoodItem | null>(null);
  const [showInventory, setShowInventory] = useState(false);
  const [showIssue, setShowIssue] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<ConsumerGoodReceipt | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [editName, setEditName] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [error, setError] = useState('');
  const [stockInfo, setStockInfo] = useState<Record<string, { totalQty: number; latestPrice: number }>>({});
  const [tab, setTab] = useState<'items' | 'receipts'>('items');

  const [invForm, setInvForm] = useState({
    goodId: '',
    quantity: '',
    pricePerUnit: '',
    supplierName: '',
    billPhoto: '',
    isOpening: false,
  });

  const [issueForm, setIssueForm] = useState({
    hodId: '',
    batchId: '',
    items: [] as Array<{ consumerGoodId: string; quantity: string; stockQty: number; price: number; name: string }>,
  });

  const isAdmin = currentUser?.role === 'admin';
  const isStoreHod = currentUser?.role === 'hod' && currentUser.department === 'store';
  const canManage = isAdmin || isStoreHod;
  const canAddStock = isAdmin || isStoreHod;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [itemsData, invData, hodsData] = await Promise.all([
      getActiveConsumerGoods(),
      getConsumerGoodInventory(),
      getActiveUsers(),
    ]);
    setItems(itemsData);
    setInventory(invData);
    setHods(hodsData.filter(u => u.role === 'hod' && u.department !== 'store'));

    if (isAdmin) {
      setReceipts(await getAllReceipts());
    } else if (currentUser?.role === 'hod') {
      setReceipts(await getReceiptsForHod(currentUser.id));
    }

    const info: Record<string, { totalQty: number; latestPrice: number }> = {};
    for (const item of itemsData) {
      info[item.id] = await getAvailableStockTotal(item.id);
    }
    setStockInfo(info);
  };

  const handleAdd = async () => {
    if (!name.trim() || !currentUser) { setError('Enter name'); return; }
    try {
      await createConsumerGoodItem(name, currentUser.id, currentUser.firstName);
      setShowAdd(false);
      setName('');
      setError('');
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
      setError('');
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
      setError('');
      loadData();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleAddInventory = async () => {
    if (!currentUser) return;
    setError('');
    const qty = parseFloat(invForm.quantity);
    const price = parseFloat(invForm.pricePerUnit);
    if (!invForm.goodId) { setError('Select an item'); return; }
    if (!Number.isFinite(qty) || qty <= 0) { setError('Quantity must be positive'); return; }
    if (!Number.isFinite(price) || price <= 0) { setError('Price must be positive'); return; }
    try {
      await addConsumerGoodToInventory(
        invForm.goodId, qty, price, currentUser.id, currentUser.firstName,
        invForm.supplierName || (invForm.isOpening ? 'Opening Stock' : undefined),
        invForm.billPhoto || undefined,
        invForm.isOpening,
      );
      setShowInventory(false);
      setInvForm({ goodId: '', quantity: '', pricePerUnit: '', supplierName: '', billPhoto: '', isOpening: false });
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

  const addIssueItem = async (goodId: string) => {
    if (issueForm.items.some(i => i.consumerGoodId === goodId)) return;
    const stock = stockInfo[goodId];
    const item = items.find(i => i.id === goodId);
    if (!stock || !item) return;
    setIssueForm({
      ...issueForm,
      items: [...issueForm.items, {
        consumerGoodId: goodId,
        quantity: '',
        stockQty: stock.totalQty,
        price: stock.latestPrice,
        name: item.name,
      }],
    });
  };

  const removeIssueItem = (goodId: string) => {
    setIssueForm({
      ...issueForm,
      items: issueForm.items.filter(i => i.consumerGoodId !== goodId),
    });
  };

  const updateIssueItemQty = (goodId: string, qty: string) => {
    setIssueForm({
      ...issueForm,
      items: issueForm.items.map(i =>
        i.consumerGoodId === goodId ? { ...i, quantity: qty } : i
      ),
    });
  };

  const handleIssue = async () => {
    if (!currentUser) return;
    setError('');
    if (!issueForm.hodId) { setError('Select an HOD'); return; }
    if (issueForm.items.length === 0) { setError('Add at least one item'); return; }

    const parsedItems = issueForm.items.map(i => ({
      consumerGoodId: i.consumerGoodId,
      quantity: parseFloat(i.quantity),
    }));
    for (const item of parsedItems) {
      if (!item.quantity || item.quantity <= 0) {
        setError('All quantities must be positive'); return;
      }
    }

    const hod = hods.find(h => h.id === issueForm.hodId);
    if (!hod) { setError('HOD not found'); return; }

    try {
      const receipt = await issueConsumerGoodsToHod(
        hod.id, hod.firstName, hod.department, parsedItems,
        currentUser.id, currentUser.firstName, issueForm.batchId || undefined
      );
      setShowIssue(false);
      setIssueForm({ hodId: '', batchId: '', items: [] });
      setSelectedReceipt(receipt);
      loadData();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const issueTotal = issueForm.items.reduce((sum, i) => {
    const qty = parseFloat(i.quantity) || 0;
    return sum + qty * i.price;
  }, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-light text-gray-900">Consumer Goods</h1>
          <p className="text-sm text-gray-400 mt-1">Manage consumer goods, stock, and issuance</p>
        </div>
        <div className="flex gap-2">
          {canManage && (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 bg-[#2a2a2a] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#1a1a1a] cursor-pointer"
            >
              <Plus size={16} /> Add Item
            </button>
          )}
          {canAddStock && (
            <button
              onClick={() => setShowInventory(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 cursor-pointer"
            >
              <Package size={16} /> Add Stock
            </button>
          )}
          {canAddStock && (
            <button
              onClick={() => { setShowIssue(true); setError(''); }}
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-700 cursor-pointer"
            >
              <Send size={16} /> Issue to HOD
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('items')}
          className={`px-4 py-2 text-sm rounded-xl cursor-pointer ${tab === 'items' ? 'bg-[#2a2a2a] text-white' : 'bg-white/60 text-gray-600'}`}
        >
          Items & Stock
        </button>
        <button
          onClick={() => setTab('receipts')}
          className={`px-4 py-2 text-sm rounded-xl cursor-pointer ${tab === 'receipts' ? 'bg-[#2a2a2a] text-white' : 'bg-white/60 text-gray-600'}`}
        >
          Receipts ({receipts.length})
        </button>
      </div>

      {tab === 'items' && (
        <div className="space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Package size={40} className="mx-auto mb-3 opacity-40" />
              <p>No consumer goods added yet</p>
            </div>
          ) : items.map(item => {
            const itemInv = inventory.filter(i => i.consumerGoodId === item.id);
            const stock = stockInfo[item.id];
            const totalQty = itemInv.reduce((s, i) => s + i.quantity, 0);
            const remainingQty = stock?.totalQty || 0;
            const isExpanded = expandedItem === item.id;

            return (
              <div key={item.id} className="bg-white/60 backdrop-blur-sm rounded-2xl overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 hover:bg-white/80 cursor-pointer"
                  onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-orange-100">
                      <Package size={18} className="text-orange-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-900">{item.name}</p>
                      <p className="text-[11px] text-gray-400">
                        Total purchased: {totalQty} · <span className={remainingQty > 0 ? 'text-emerald-600' : 'text-red-500'}>Available: {remainingQty}</span>
                        {stock?.latestPrice ? ` · Latest price: ${formatCurrency(stock.latestPrice)}/unit` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {canManage && (
                      <>
                        <button
                          onClick={e => { e.stopPropagation(); setShowEdit(item); setEditName(item.name); }}
                          className="p-1.5 rounded-xl hover:bg-blue-50 text-blue-500 cursor-pointer"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); setShowDelete(item); }}
                          className="p-1.5 rounded-xl hover:bg-red-50 text-red-400 cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                    <ChevronRight size={16} className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </div>
                </div>

                {isExpanded && itemInv.length > 0 && (
                  <div className="border-t border-gray-100 p-4">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-gray-500 border-b border-gray-200">
                          <th className="pb-2 font-medium">Date</th>
                          <th className="pb-2 font-medium">Supplier</th>
                          <th className="pb-2 font-medium text-right">Purchased</th>
                          <th className="pb-2 font-medium text-right">Remaining</th>
                          <th className="pb-2 font-medium text-right">Price/Unit</th>
                          <th className="pb-2 font-medium text-right">Total Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {itemInv.map(inv => (
                          <tr key={inv.id} className="border-b border-gray-50">
                            <td className="py-2">{new Date(inv.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                            <td className="py-2">{inv.supplierName || '-'}</td>
                            <td className="py-2 text-right">{inv.quantity}</td>
                            <td className="py-2 text-right">
                              <span className={inv.remainingQuantity > 0 ? 'text-emerald-600' : 'text-gray-400'}>
                                {inv.remainingQuantity}
                              </span>
                            </td>
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
      )}

      {tab === 'receipts' && (
        <div className="space-y-3">
          {receipts.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FileText size={40} className="mx-auto mb-3 opacity-40" />
              <p>No receipts yet</p>
            </div>
          ) : receipts.map(receipt => (
            <div
              key={receipt.id}
              className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 hover:bg-white/80 cursor-pointer transition-colors"
              onClick={() => setSelectedReceipt(receipt)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm text-gray-900">{receipt.receiptNumber}</p>
                  <p className="text-[11px] text-gray-400">
                    Issued to: {receipt.hodName} ({DEPARTMENT_LABELS[receipt.department]}) · {receipt.items.length} items
                  </p>
                  <p className="text-[11px] text-gray-400">{new Date(receipt.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} · By: {receipt.issuedByName}</p>
                </div>
                <p className="font-semibold text-sm text-gray-900">{formatCurrency(receipt.totalAmount)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Receipt Detail Modal */}
      <Modal isOpen={!!selectedReceipt} onClose={() => setSelectedReceipt(null)} title={`Receipt ${selectedReceipt?.receiptNumber || ''}`} maxWidth="36rem">
        {selectedReceipt && (
          <div className="space-y-4">
            <div className="bg-white/40 rounded-xl p-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[11px] text-gray-400">Receipt No.</p>
                  <p className="font-semibold text-gray-900">{selectedReceipt.receiptNumber}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400">Date</p>
                  <p className="font-medium text-gray-900">{new Date(selectedReceipt.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400">Issued To</p>
                  <p className="font-medium text-gray-900">{selectedReceipt.hodName} ({DEPARTMENT_LABELS[selectedReceipt.department]})</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400">Issued By</p>
                  <p className="font-medium text-gray-900">{selectedReceipt.issuedByName}</p>
                </div>
              </div>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="pb-2 font-medium">Item</th>
                  <th className="pb-2 font-medium">Supplier</th>
                  <th className="pb-2 font-medium text-right">Qty</th>
                  <th className="pb-2 font-medium text-right">Price/Unit</th>
                  <th className="pb-2 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {selectedReceipt.items.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-50">
                    <td className="py-2 font-medium text-gray-900">{item.consumerGoodName}</td>
                    <td className="py-2 text-gray-500">{item.supplierName || '-'}</td>
                    <td className="py-2 text-right">{item.quantity}</td>
                    <td className="py-2 text-right">{formatCurrency(item.pricePerUnit)}</td>
                    <td className="py-2 text-right font-medium">{formatCurrency(item.totalCost)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200">
                  <td colSpan={4} className="py-3 text-right font-semibold text-gray-900">Total Amount:</td>
                  <td className="py-3 text-right font-semibold text-lg text-gray-900">{formatCurrency(selectedReceipt.totalAmount)}</td>
                </tr>
              </tfoot>
            </table>

            <div className="p-3 bg-orange-50 border border-orange-100 rounded-xl text-[11px] text-orange-700">
              This amount ({formatCurrency(selectedReceipt.totalAmount)}) has been added to {selectedReceipt.hodName}'s account as owed to admin.
            </div>
          </div>
        )}
      </Modal>

      {/* Add Item Modal */}
      <Modal isOpen={showAdd} onClose={() => { setShowAdd(false); setError(''); }} title="Add Consumer Good Item">
        <div className="space-y-4">
          {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
            placeholder="Item name"
          />
          <button onClick={handleAdd} className="w-full bg-[#2a2a2a] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#1a1a1a] cursor-pointer">
            Add Item
          </button>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!showEdit} onClose={() => { setShowEdit(null); setError(''); }} title="Edit Consumer Good">
        <div className="space-y-4">
          {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <input
            type="text"
            value={editName}
            onChange={e => setEditName(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
          />
          <button onClick={handleEdit} className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 cursor-pointer">
            Update
          </button>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={!!showDelete} onClose={() => { setShowDelete(null); setDeleteReason(''); setError(''); }} title="Delete Consumer Good" maxWidth="28rem">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Delete <strong>{showDelete?.name}</strong>?</p>
          {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <textarea
            value={deleteReason}
            onChange={e => setDeleteReason(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
            rows={3}
            placeholder="Reason for deletion (required)"
          />
          <div className="flex gap-3 justify-end">
            <button onClick={() => { setShowDelete(null); setDeleteReason(''); setError(''); }} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer">Cancel</button>
            <button onClick={handleDelete} className="px-4 py-2 text-sm bg-red-500 text-white rounded-xl hover:bg-red-600 cursor-pointer">Delete</button>
          </div>
        </div>
      </Modal>

      {/* Add Stock Modal */}
      <Modal isOpen={showInventory} onClose={() => { setShowInventory(false); setError(''); }} title="Add Consumer Goods to Stock">
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-[11px] text-blue-700">
            Enter the supplier's price per unit. This exact price will be charged when goods are issued to department HODs.
          </div>
          {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={invForm.isOpening}
              onChange={e => setInvForm({ ...invForm, isOpening: e.target.checked })}
            />
            This is opening stock (existed before system was deployed)
          </label>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Consumer Good</label>
            <select
              value={invForm.goodId}
              onChange={e => setInvForm({ ...invForm, goodId: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
            >
              <option value="">Select item</option>
              {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input type="number" value={invForm.quantity} onChange={e => setInvForm({ ...invForm, quantity: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400" min="0.01" step="0.01" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Price/Unit</label>
              <input type="number" value={invForm.pricePerUnit} onChange={e => setInvForm({ ...invForm, pricePerUnit: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400" min="0.01" step="0.01" />
            </div>
          </div>
          {invForm.quantity && invForm.pricePerUnit && (
            <p className="text-sm font-medium text-gray-900">
              Total value: {formatCurrency(parseFloat(invForm.quantity) * parseFloat(invForm.pricePerUnit))}
            </p>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name</label>
            <input type="text" value={invForm.supplierName} onChange={e => setInvForm({ ...invForm, supplierName: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400" placeholder="Enter supplier name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bill Photo (optional)</label>
            <input type="file" accept="image/*" onChange={handleBillUpload} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
            {invForm.billPhoto && (
              <img src={invForm.billPhoto} alt="Bill" className="mt-2 rounded-xl max-h-32 object-cover" />
            )}
          </div>
          <button onClick={handleAddInventory} className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 cursor-pointer">
            Add to Stock
          </button>
        </div>
      </Modal>

      {/* Issue to HOD Modal */}
      <Modal isOpen={showIssue} onClose={() => { setShowIssue(false); setError(''); setIssueForm({ hodId: '', batchId: '', items: [] }); }} title="Issue Consumer Goods to HOD" maxWidth="36rem">
        <div className="space-y-4">
          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-[11px] text-emerald-700">
            Items will be issued at the exact supplier price. A receipt will be generated automatically.
          </div>
          {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Issue To (HOD)</label>
            <select
              value={issueForm.hodId}
              onChange={e => setIssueForm({ ...issueForm, hodId: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
            >
              <option value="">Select HOD</option>
              {hods.map(h => (
                <option key={h.id} value={h.id}>{h.firstName} - {DEPARTMENT_LABELS[h.department]}</option>
              ))}
            </select>
          </div>

          {/* Add items */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Add Items</label>
            <select
              onChange={e => { if (e.target.value) addIssueItem(e.target.value); e.target.value = ''; }}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
            >
              <option value="">Select consumer good to add</option>
              {items.filter(i => !issueForm.items.some(ii => ii.consumerGoodId === i.id)).map(i => {
                const s = stockInfo[i.id];
                return (
                  <option key={i.id} value={i.id} disabled={!s || s.totalQty <= 0}>
                    {i.name} (Available: {s?.totalQty || 0} | {formatCurrency(s?.latestPrice || 0)}/unit)
                  </option>
                );
              })}
            </select>
          </div>

          {/* Selected items */}
          {issueForm.items.length > 0 && (
            <div className="space-y-3">
              {issueForm.items.map(item => (
                <div key={item.consumerGoodId} className="flex items-center gap-3 p-3 bg-white/40 rounded-xl">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                    <p className="text-[11px] text-gray-400">
                      Available: {item.stockQty} · Price: {formatCurrency(item.price)}/unit
                    </p>
                  </div>
                  <div className="w-24">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={e => updateIssueItemQty(item.consumerGoodId, e.target.value)}
                      max={item.stockQty}
                      min="0.01"
                      step="0.01"
                      className="w-full border border-gray-200 rounded-xl px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-gold-400"
                      placeholder="Qty"
                    />
                  </div>
                  <p className="text-sm font-medium w-24 text-right text-gray-900">
                    {formatCurrency((parseFloat(item.quantity) || 0) * item.price)}
                  </p>
                  <button onClick={() => removeIssueItem(item.consumerGoodId)} className="p-1 text-red-400 hover:bg-red-50 rounded-lg cursor-pointer">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              <div className="flex justify-between items-center p-3 bg-white/60 rounded-xl">
                <span className="text-sm font-semibold text-gray-900">Total Amount:</span>
                <span className="text-lg font-light text-gray-900">{formatCurrency(issueTotal)}</span>
              </div>
            </div>
          )}

          <button
            onClick={handleIssue}
            disabled={issueForm.items.length === 0 || !issueForm.hodId}
            className="w-full bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
          >
            Issue Goods & Generate Receipt
          </button>
        </div>
      </Modal>
    </div>
  );
}
