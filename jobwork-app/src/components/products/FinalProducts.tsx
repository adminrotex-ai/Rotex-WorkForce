import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import type { FinalProduct, FinalProductStockEntry } from '../../types';
import {
  getActiveFinalProducts, createFinalProduct, addFinalProductStock,
  getFinalProductStockEntries, getFinalProductStockTotal,
} from '../../database/operations';
import { formatDate } from '../../utils/helpers';
import Modal from '../common/Modal';
import { PageHeader, Accordion } from '../common/Widgets';
import { Boxes, Plus, Package } from 'lucide-react';

export default function FinalProducts() {
  const { currentUser } = useSelector((s: RootState) => s.auth);
  const [products, setProducts] = useState<FinalProduct[]>([]);
  const [stockTotals, setStockTotals] = useState<Record<string, number>>({});
  const [entries, setEntries] = useState<FinalProductStockEntry[]>([]);
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
    <div className="space-y-10">
      <PageHeader
        title="Final Products"
        subtitle="Track finished product stock"
        action={canManage ? (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-white rounded-2xl text-sm font-medium hover:opacity-90"
            style={{ backgroundColor: '#2d2d2d' }}
          >
            <Plus size={16} /> Add Product
          </button>
        ) : undefined}
      />

      {products.length === 0 ? (
        <div className="warm-card p-12 text-center">
          <Boxes size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-400">No final products yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {products.map(p => {
            const total = stockTotals[p.id] ?? 0;
            const productEntries = entries.filter(e => e.productId === p.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
            return (
              <Accordion
                key={p.id}
                title={p.name}
                subtitle={`Stock: ${total} ${p.unit}`}
                icon={<Package size={20} className="text-[#c9a227]" />}
              >
                <div className="p-4">
                  {canManage && (
                    <button
                      onClick={() => { setShowStock(p); setStockForm({ quantity: '', isOpening: false }); }}
                      className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-2xl mb-3"
                    >
                      + Add Stock
                    </button>
                  )}
                  {productEntries.length === 0 ? (
                    <p className="text-xs text-gray-400">No stock entries</p>
                  ) : (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-gray-500 border-b">
                          <th className="pb-2 font-medium">Date (IST)</th>
                          <th className="pb-2 font-medium text-right">Added</th>
                          <th className="pb-2 font-medium text-right">Remaining</th>
                          <th className="pb-2 font-medium">Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productEntries.map(e => (
                          <tr key={e.id} className="border-b border-gray-50">
                            <td className="py-2">{formatDate(e.createdAt)}</td>
                            <td className="py-2 text-right">{e.quantity} {p.unit}</td>
                            <td className="py-2 text-right font-medium text-green-600">{e.remainingQuantity} {p.unit}</td>
                            <td className="py-2">{e.isOpening ? <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] rounded-full">Opening</span> : 'Stock'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </Accordion>
            );
          })}
        </div>
      )}

      <Modal isOpen={showAdd} onClose={() => { setShowAdd(false); setError(''); }} title="Add Final Product">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
            <input
              type="text"
              value={productForm.name}
              onChange={e => setProductForm({ ...productForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-2xl text-sm"
              placeholder="e.g. Steel Bracket A"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
            <input
              type="text"
              value={productForm.unit}
              onChange={e => setProductForm({ ...productForm, unit: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-2xl text-sm"
              placeholder="pcs, kg, units..."
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button onClick={handleAddProduct} className="w-full py-2.5 text-white rounded-2xl text-sm font-medium" style={{ backgroundColor: '#2d2d2d' }}>
            Add Product
          </button>
        </div>
      </Modal>

      <Modal isOpen={!!showStock} onClose={() => { setShowStock(null); setError(''); }} title={`Add Stock - ${showStock?.name || ''}`}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity ({showStock?.unit})</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={stockForm.quantity}
              onChange={e => setStockForm({ ...stockForm, quantity: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-2xl text-sm"
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
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button onClick={handleAddStock} className="w-full py-2.5 text-white rounded-2xl text-sm font-medium" style={{ backgroundColor: '#2d2d2d' }}>
            Add Stock
          </button>
        </div>
      </Modal>
    </div>
  );
}
