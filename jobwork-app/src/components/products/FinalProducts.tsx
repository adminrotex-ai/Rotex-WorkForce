import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import type { FinalProduct, FinalProductType, FinalProductStockEntry } from '../../types';
import {
  getActiveFinalProducts, createFinalProduct, addFinalProductStock,
  getFinalProductStockEntries, getFinalProductStockTotal,
  getActiveFinalProductTypes, createFinalProductType, deleteFinalProduct,
} from '../../database/operations';
import Modal from '../common/Modal';
import { Boxes, Plus, Package, ChevronRight, FolderOpen, Trash2, Layers, Ruler } from 'lucide-react';

interface ProductGroup {
  name: string;
  types: TypeGroup[];
  totalStock: number;
}

interface TypeGroup {
  typeId: string;
  typeName: string;
  sizes: SizeGroup[];
  totalStock: number;
}

interface SizeGroup {
  product: FinalProduct;
  entries: FinalProductStockEntry[];
  totalStock: number;
}

export default function FinalProducts() {
  const { currentUser } = useSelector((s: RootState) => s.auth);
  const [products, setProducts] = useState<FinalProduct[]>([]);
  const [productTypes, setProductTypes] = useState<FinalProductType[]>([]);
  const [stockTotals, setStockTotals] = useState<Record<string, number>>({});
  const [entries, setEntries] = useState<FinalProductStockEntry[]>([]);
  const [expandedName, setExpandedName] = useState<string | null>(null);
  const [expandedType, setExpandedType] = useState<string | null>(null);
  const [expandedSize, setExpandedSize] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showAddType, setShowAddType] = useState(false);
  const [showStock, setShowStock] = useState<FinalProduct | null>(null);
  const [productForm, setProductForm] = useState({ productTypeId: '', size: '', unit: 'pcs' });
  const [typeName, setTypeName] = useState('');
  const [stockForm, setStockForm] = useState({ quantity: '', isOpening: false });
  const [showDeleteProduct, setShowDeleteProduct] = useState<FinalProduct | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [error, setError] = useState('');

  const isAdmin = currentUser?.role === 'admin';
  const isStoreHod = currentUser?.role === 'hod' && currentUser.department === 'store';
  const canManage = isAdmin || isStoreHod;
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const list = await getActiveFinalProducts();
    setProducts(list);
    setProductTypes(await getActiveFinalProductTypes());
    setEntries(await getFinalProductStockEntries());
    const totals: Record<string, number> = {};
    for (const p of list) totals[p.id] = await getFinalProductStockTotal(p.id);
    setStockTotals(totals);
    setLoaded(true);
  };

  const buildGroups = (): ProductGroup[] => {
    const nameMap = new Map<string, FinalProduct[]>();
    for (const p of products) {
      const list = nameMap.get(p.name) || [];
      list.push(p);
      nameMap.set(p.name, list);
    }

    const groups: ProductGroup[] = [];
    for (const [name, prods] of nameMap) {
      const typeMap = new Map<string, FinalProduct[]>();
      for (const p of prods) {
        const typeKey = p.productTypeId || '__none__';
        const list = typeMap.get(typeKey) || [];
        list.push(p);
        typeMap.set(typeKey, list);
      }

      const types: TypeGroup[] = [];
      for (const [typeKey, typeProds] of typeMap) {
        const pt = typeKey !== '__none__' ? productTypes.find(t => t.id === typeKey) : undefined;
        const sizes: SizeGroup[] = typeProds.map(p => ({
          product: p,
          entries: entries.filter(e => e.productId === p.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
          totalStock: stockTotals[p.id] ?? 0,
        }));
        types.push({
          typeId: typeKey,
          typeName: pt?.name || 'General',
          sizes,
          totalStock: sizes.reduce((s, sg) => s + sg.totalStock, 0),
        });
      }

      groups.push({
        name,
        types,
        totalStock: types.reduce((s, tg) => s + tg.totalStock, 0),
      });
    }

    return groups;
  };

  const groups = buildGroups();

  const handleAddProduct = async () => {
    if (!currentUser) return;
    setError('');
    if (!productForm.productTypeId) { setError('Select a product type'); return; }
    const selectedPt = productTypes.find(pt => pt.id === productForm.productTypeId);
    if (!selectedPt) { setError('Invalid product type'); return; }
    try {
      await createFinalProduct(selectedPt.name, productForm.unit, currentUser.id, currentUser.firstName, productForm.size, productForm.productTypeId);
      setShowAdd(false);
      setProductForm({ productTypeId: '', size: '', unit: 'pcs' });
      load();
    } catch (e: any) { setError(e.message); }
  };

  const handleAddType = async () => {
    if (!currentUser) return;
    setError('');
    try {
      await createFinalProductType(typeName, currentUser.id, currentUser.firstName);
      setShowAddType(false);
      setTypeName('');
      load();
    } catch (e: any) { setError(e.message); }
  };

  const handleDeleteProduct = async () => {
    if (!currentUser || !showDeleteProduct) return;
    setError('');
    try {
      await deleteFinalProduct(showDeleteProduct.id, deleteReason, currentUser.id, currentUser.firstName, deletePassword);
      setShowDeleteProduct(null);
      setDeleteReason('');
      setDeletePassword('');
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

  const toggleName = (name: string) => {
    if (expandedName === name) {
      setExpandedName(null);
      setExpandedType(null);
      setExpandedSize(null);
    } else {
      setExpandedName(name);
      setExpandedType(null);
      setExpandedSize(null);
    }
  };

  const toggleType = (key: string) => {
    if (expandedType === key) {
      setExpandedType(null);
      setExpandedSize(null);
    } else {
      setExpandedType(key);
      setExpandedSize(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-light text-gray-900">Final Products</h1>
          <p className="text-sm text-gray-400 mt-1">Track finished product stock</p>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowAddType(true)}
              className="flex items-center gap-2 bg-[#2a2a2a] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#1a1a1a] cursor-pointer"
            >
              <FolderOpen size={16} /> Add Product Type
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 cursor-pointer"
            >
              <Plus size={16} /> Add Product
            </button>
          </div>
        )}
      </div>

      {loaded && groups.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Boxes size={40} className="mx-auto mb-3 opacity-40" />
          <p>No final products yet</p>
        </div>
      ) : groups.length > 0 ? (
        <div className="space-y-3">
          {groups.map(group => {
            const isNameExp = expandedName === group.name;
            return (
              <div key={group.name} className="bg-white/60 backdrop-blur-sm rounded-2xl overflow-hidden">
                <button
                  onClick={() => toggleName(group.name)}
                  className="w-full flex items-center justify-between p-4 hover:bg-white/40 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gold-300 flex items-center justify-center">
                      <Package size={20} className="text-dark-800" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-sm text-gray-900">{group.name}</p>
                      <p className="text-[11px] text-gray-400">
                        {group.types.length} {group.types.length === 1 ? 'type' : 'types'} · Total stock: <span className="font-semibold text-emerald-600">{group.totalStock}</span>
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={16} className={`text-gray-400 transition-transform ${isNameExp ? 'rotate-90' : ''}`} />
                </button>

                {isNameExp && (
                  <div className="border-t border-gray-100 p-3 space-y-2">
                    {group.types.map(typeGroup => {
                      const typeKey = `${group.name}::${typeGroup.typeId}`;
                      const isTypeExp = expandedType === typeKey;
                      return (
                        <div key={typeGroup.typeId} className="border border-gray-100 rounded-xl overflow-hidden">
                          <button
                            onClick={() => toggleType(typeKey)}
                            className="w-full flex items-center justify-between p-3 hover:bg-white/40 cursor-pointer"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                                <Layers size={16} className="text-blue-700" />
                              </div>
                              <div className="text-left">
                                <p className="font-medium text-sm text-gray-900">{typeGroup.typeName}</p>
                                <p className="text-[11px] text-gray-400">
                                  {typeGroup.sizes.length} {typeGroup.sizes.length === 1 ? 'size' : 'sizes'} · Stock: <span className="font-semibold text-emerald-600">{typeGroup.totalStock}</span>
                                </p>
                              </div>
                            </div>
                            <ChevronRight size={16} className={`text-gray-400 transition-transform ${isTypeExp ? 'rotate-90' : ''}`} />
                          </button>

                          {isTypeExp && (
                            <div className="border-t border-gray-100 p-3 space-y-2">
                              {typeGroup.sizes.map(sizeGroup => {
                                const sizeKey = `${typeKey}::${sizeGroup.product.id}`;
                                const isSizeExp = expandedSize === sizeKey;
                                const p = sizeGroup.product;
                                return (
                                  <div key={p.id} className="border border-gray-100 rounded-xl overflow-hidden">
                                    <div className="flex items-center justify-between p-3">
                                      <button
                                        onClick={() => setExpandedSize(isSizeExp ? null : sizeKey)}
                                        className="flex items-center gap-3 flex-1 text-left cursor-pointer"
                                      >
                                        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                                          <Ruler size={14} className="text-amber-700" />
                                        </div>
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <p className="font-medium text-sm text-gray-900">{p.size || 'No Size'}</p>
                                            <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">{p.unit}</span>
                                          </div>
                                          <p className="text-[11px] text-gray-400">
                                            Stock: <span className="font-semibold text-emerald-600">{sizeGroup.totalStock} {p.unit}</span>
                                          </p>
                                        </div>
                                      </button>
                                      <div className="flex items-center gap-2">
                                        {canManage && (
                                          <>
                                            <button
                                              onClick={() => { setShowStock(p); setStockForm({ quantity: '', isOpening: false }); }}
                                              className="px-3 py-1.5 text-[11px] font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-full cursor-pointer"
                                            >
                                              + Stock
                                            </button>
                                            <button
                                              onClick={() => { setShowDeleteProduct(p); setError(''); setDeleteReason(''); setDeletePassword(''); }}
                                              className="p-1.5 text-red-400 hover:text-red-600 cursor-pointer"
                                            >
                                              <Trash2 size={14} />
                                            </button>
                                          </>
                                        )}
                                        <ChevronRight size={14} className={`text-gray-400 transition-transform ${isSizeExp ? 'rotate-90' : ''}`} />
                                      </div>
                                    </div>

                                    {isSizeExp && (
                                      <div className="border-t border-gray-100 p-3">
                                        {sizeGroup.entries.length === 0 ? (
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
                                              {sizeGroup.entries.map(e => (
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
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      <Modal isOpen={showAdd} onClose={() => { setShowAdd(false); setError(''); }} title="Add Final Product">
        <div className="space-y-4">
          {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Type</label>
            <select
              value={productForm.productTypeId}
              onChange={e => setProductForm({ ...productForm, productTypeId: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
            >
              <option value="">Select product type</option>
              {productTypes.map(pt => (
                <option key={pt.id} value={pt.id}>{pt.name}</option>
              ))}
            </select>
            {productTypes.length === 0 && (
              <p className="text-[11px] text-amber-600 mt-1">No product types yet. Add one first using "Add Product Type".</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Size <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              type="text"
              value={productForm.size}
              onChange={e => setProductForm({ ...productForm, size: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              placeholder="e.g. 12 inch, Large, 500ml"
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

      <Modal isOpen={showAddType} onClose={() => { setShowAddType(false); setError(''); }} title="Add Product Type">
        <div className="space-y-4">
          {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type Name</label>
            <input
              type="text"
              value={typeName}
              onChange={e => setTypeName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              placeholder="e.g. Stainless Steel Utensil, Copper Fitting"
            />
          </div>
          <button onClick={handleAddType} className="w-full bg-[#2a2a2a] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#1a1a1a] cursor-pointer">
            Add Type
          </button>
        </div>
      </Modal>

      <Modal isOpen={!!showStock} onClose={() => { setShowStock(null); setError(''); }} title={`Add Stock - ${showStock?.name || ''}${showStock?.size ? ` (${showStock.size})` : ''}`}>
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

      <Modal isOpen={!!showDeleteProduct} onClose={() => { setShowDeleteProduct(null); setError(''); }} title="Delete Final Product">
        <div className="space-y-4">
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-[11px] text-red-700">
            This will deactivate <strong>{showDeleteProduct?.name}{showDeleteProduct?.size ? ` (${showDeleteProduct.size})` : ''}</strong> and hide it from the product list.
          </div>
          {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Deletion *</label>
            <textarea
              value={deleteReason}
              onChange={e => setDeleteReason(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              rows={2}
              placeholder="Why is this product being deleted?"
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
          <button onClick={handleDeleteProduct} className="w-full bg-red-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-red-700 cursor-pointer">
            Delete Product
          </button>
        </div>
      </Modal>
    </div>
  );
}
