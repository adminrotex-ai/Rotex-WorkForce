import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import type { FinalProduct, FinalProductStockEntry } from '../../types';
import {
  getActiveFinalProducts, createFinalProduct, addFinalProductStock,
  getFinalProductStockEntries, getFinalProductStockTotal,
} from '../../database/operations';
import Modal from '../common/Modal';
import { Boxes, Plus, Package, ChevronRight } from 'lucide-react';

export default function FinalProducts() {
  const { currentUser } = useSelector((s: RootState) => s.auth);
  const [products, setProducts] = useState<FinalProduct[]>([]);
  const [stockTotals, setStockTotals] = useState<Record<string, number>>({});
  const [entries, setEntries] = useState<FinalProductStockEntry[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showStock, setShowStock] = useState<FinalProduct | null>(null);
  const [productForm, setProductForm] = useState({ name: '', unit: 'pcs' });
  const [stockForm, setStockForm] = useState({ quantity: '', isOpening: false });
  const [error, setError] = useState('');

  const isAdmin = currentUser?.role === 'admin';
  const isStoreHod = currentUser?.role === 'hod' && currentUser.department === 'store';
  const canManage = isAdmin || isStoreHod;

  useEffect(() => { load(); }, []);

  const load = async () => {
    const list = await getActiveFinalProducts();
    setProducts(list);
    setEntries(await getFinalProductStockEntries());
    const totals: Record<string, number> = {};
    for (const p of list) totals[p.id] = await getFinalProductStockTotal(p.id);
    setStockTotals(totals);
  };

  const handleAddProduct = async () => {
    if (!currentUser) return;
    setError('');
    try {
      await createFinalProduct(productForm.name, productForm.unit, currentUser.id, currentUser.firstName);
      setShowAdd(false);
      setProductForm({ name: '', unit: 'pcs' });
      load();
    } catch (e: any) { setError(e.message); }
  };

  const handleAddStock = async () => {
    if (!currentUser || !showStock) return;
    setError('');
    const qty = parseFloat(stockForm.quantity);
    if (!Number.isFinite(qty) || qty <= 0) { setError('Enter a positive quantity'); return; }
    try {
      await addFinalProductStock(showStock.id, qty, currentUser.id, currentUser.firstName, undefined, stockForm.isOpening);
      setShowStock(null);
      setStockForm({ quantity: '', isOpening: false });
      load();
    } catch (e: any) { setError(e.message); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-light text-gray-900">Final Products</h1>
          <p className="text-sm text-gray-400 mt-1">Track finished product stock</p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-[#2a2a2a] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#1a1a1a] cursor-pointer"
          >
            <Plus size={16} /> Add Product
          </button>
        )}
      </div>

      {products.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Boxes size={40} className="mx-auto mb-3 opacity-40" />
          <p>No final products yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map(p => {
            const total = stockTotals[p.id] ?? 0;
            const isExp = expanded === p.id;
            const productEntries = entries.filter(e => e.productId === p.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
            return (
              <div key={p.id} className="bg-white/60 backdrop-blur-sm rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between p-4">
                  <button
                    onClick={() => setExpanded(isExp ? null : p.id)}
                    className="flex items-center gap-3 flex-1 text-left cursor-pointer"
                  >
                    <div className="w-11 h-11 rounded-xl bg-gold-300 flex items-center justify-center">
                      <Package size={20} className="text-dark-800" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-900">{p.name}</p>
                      <p className="text-[11px] text-gray-400">Stock available: <span className="font-semibold text-emerald-600">{total} {p.unit}</span></p>
                    </div>
                  </button>
                  <div className="flex items-center gap-2">
                    {canManage && (
                      <button
                        onClick={() => { setShowStock(p); setStockForm({ quantity: '', isOpening: false }); }}
                        className="px-3 py-1.5 text-[11px] font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-full cursor-pointer"
                      >
                        + Add Stock
                      </button>
                    )}
                    <ChevronRight size={16} className={`text-gray-400 transition-transform ${isExp ? 'rotate-90' : ''}`} />
                  </div>
                </div>

                {isExp && (
                  <div className="border-t border-gray-100 p-4">
                    {productEntries.length === 0 ? (
                      <p className="text-[11px] text-gray-400">No stock entries</p>
                    ) : (
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-gray-500 border-b border-gray-200">
                            <th className="pb-2 font-medium">Date (IST)</th>
                            <th className="pb-2 font-medium text-right">Added</th>
                            <th className="pb-2 font-medium text-right">Remaining</th>
                            <th className="pb-2 font-medium">Type</th>
                          </tr>
                        </thead>
                        <tbody>
                          {productEntries.map(e => (
                            <tr key={e.id} className="border-b border-gray-50">
                              <td className="py-2">{new Date(e.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                              <td className="py-2 text-right">{e.quantity} {p.unit}</td>
                              <td className="py-2 text-right font-medium text-emerald-600">{e.remainingQuantity} {p.unit}</td>
                              <td className="py-2">{e.isOpening ? <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] rounded-full">Opening</span> : 'Stock'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={showAdd} onClose={() => { setShowAdd(false); setError(''); }} title="Add Final Product">
        <div className="space-y-4">
          {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
            <input
              type="text"
              value={productForm.name}
              onChange={e => setProductForm({ ...productForm, name: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              placeholder="e.g. Steel Bracket A"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
            <input
              type="text"
              value={productForm.unit}
              onChange={e => setProductForm({ ...productForm, unit: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              placeholder="pcs, kg, units..."
            />
          </div>
          <button onClick={handleAddProduct} className="w-full bg-[#2a2a2a] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#1a1a1a] cursor-pointer">
            Add Product
          </button>
        </div>
      </Modal>

      <Modal isOpen={!!showStock} onClose={() => { setShowStock(null); setError(''); }} title={`Add Stock - ${showStock?.name || ''}`}>
        <div className="space-y-4">
          {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity ({showStock?.unit})</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={stockForm.quantity}
              onChange={e => setStockForm({ ...stockForm, quantity: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={stockForm.isOpening}
              onChange={e => setStockForm({ ...stockForm, isOpening: e.target.checked })}
            />
            Mark as opening stock
          </label>
          <button onClick={handleAddStock} className="w-full bg-[#2a2a2a] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#1a1a1a] cursor-pointer">
            Add Stock
          </button>
        </div>
      </Modal>
    </div>
  );
}
