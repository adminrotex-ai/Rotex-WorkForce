import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import type { MaterialType, MaterialEntry } from '../../types';
import {
  getActiveMaterialTypes, createMaterialType, addMaterialEntry, getMaterialEntries,
  getMaterialStockTotal,
} from '../../database/operations';
import { formatCurrency, formatDate } from '../../utils/helpers';
import Modal from '../common/Modal';
import { PageHeader, PillTabs, WidgetCard } from '../common/Widgets';
import { Plus, FolderOpen, Package, Boxes } from 'lucide-react';

export default function Materials() {
  const { currentUser } = useSelector((s: RootState) => s.auth);
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([]);
  const [entries, setEntries] = useState<MaterialEntry[]>([]);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [stockTotals, setStockTotals] = useState<Record<string, { totalQty: number; latestPrice: number; unit: string }>>({});
  const [showAddType, setShowAddType] = useState(false);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [showOpening, setShowOpening] = useState(false);
  const [typeName, setTypeName] = useState('');
  const [error, setError] = useState('');

  const [entryForm, setEntryForm] = useState({
    materialTypeId: '',
    supplierName: '',
    price: '',
    quantity: '',
    unit: 'kg',
    billPhoto: '',
  });

  const [openingForm, setOpeningForm] = useState({
    materialTypeId: '',
    price: '',
    quantity: '',
    unit: 'kg',
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedType) {
      getMaterialEntries(selectedType).then(setEntries);
    } else {
      getMaterialEntries().then(setEntries);
    }
  }, [selectedType]);

  const loadData = async () => {
    const types = await getActiveMaterialTypes();
    setMaterialTypes(types);
    setEntries(await getMaterialEntries());
    const totals: Record<string, { totalQty: number; latestPrice: number; unit: string }> = {};
    for (const t of types) totals[t.id] = await getMaterialStockTotal(t.id);
    setStockTotals(totals);
  };

  const handleAddType = async () => {
    if (!currentUser) return;
    setError('');
    try {
      await createMaterialType(typeName, currentUser.id, currentUser.firstName);
      setShowAddType(false);
      setTypeName('');
      loadData();
    } catch (e: any) { setError(e.message); }
  };

  const handleAddEntry = async () => {
    if (!currentUser) return;
    setError('');
    const price = parseFloat(entryForm.price);
    const quantity = parseFloat(entryForm.quantity);
    if (!entryForm.materialTypeId) { setError('Select a material type'); return; }
    if (!entryForm.supplierName.trim()) { setError('Supplier name is required'); return; }
    if (!Number.isFinite(price) || price <= 0) { setError('Price must be a positive number'); return; }
    if (!Number.isFinite(quantity) || quantity <= 0) { setError('Quantity must be a positive number'); return; }
    try {
      await addMaterialEntry(
        entryForm.materialTypeId, entryForm.supplierName, price, quantity,
        entryForm.unit, currentUser.id, currentUser.firstName, entryForm.billPhoto || undefined,
      );
      setShowAddEntry(false);
      setEntryForm({ materialTypeId: '', supplierName: '', price: '', quantity: '', unit: 'kg', billPhoto: '' });
      loadData();
    } catch (e: any) { setError(e.message); }
  };

  const handleAddOpening = async () => {
    if (!currentUser) return;
    setError('');
    const price = parseFloat(openingForm.price);
    const quantity = parseFloat(openingForm.quantity);
    if (!openingForm.materialTypeId) { setError('Select a material type'); return; }
    if (!Number.isFinite(price) || price <= 0) { setError('Price must be positive'); return; }
    if (!Number.isFinite(quantity) || quantity <= 0) { setError('Quantity must be positive'); return; }
    try {
      await addMaterialEntry(
        openingForm.materialTypeId, 'Opening Stock', price, quantity,
        openingForm.unit, currentUser.id, currentUser.firstName, undefined, true,
      );
      setShowOpening(false);
      setOpeningForm({ materialTypeId: '', price: '', quantity: '', unit: 'kg' });
      loadData();
    } catch (e: any) { setError(e.message); }
  };

  const handleBillUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setEntryForm({ ...entryForm, billPhoto: ev.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const filteredEntries = (selectedType ? entries.filter(e => e.materialTypeId === selectedType) : entries)
    .slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const filterTabs = [
    { key: 'all', label: 'All Types' },
    ...materialTypes.map(mt => ({ key: mt.id, label: mt.name })),
  ];

  return (
    <div className="space-y-10">
      <PageHeader
        title="Materials & Inventory"
        subtitle="Manage raw materials, opening stock and supplier entries"
        action={
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowAddType(true)}
              className="flex items-center gap-2 px-4 py-2.5 text-white rounded-2xl text-sm hover:opacity-90"
              style={{ backgroundColor: '#2d2d2d' }}
            >
              <FolderOpen size={16} /> Add Material Type
            </button>
            <button
              onClick={() => setShowOpening(true)}
              className="flex items-center gap-2 px-4 py-2.5 text-white rounded-2xl text-sm hover:opacity-90 bg-purple-600"
            >
              <Boxes size={16} /> Opening Stock
            </button>
            <button
              onClick={() => setShowAddEntry(true)}
              className="flex items-center gap-2 px-4 py-2.5 text-white rounded-2xl text-sm hover:opacity-90"
              style={{ backgroundColor: '#2196f3' }}
            >
              <Plus size={16} /> Add Entry
            </button>
          </div>
        }
      />

      {/* Stock Totals */}
      {materialTypes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {materialTypes.map(mt => {
            const s = stockTotals[mt.id];
            return (
              <WidgetCard key={mt.id} title={mt.name}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-[#c9a227]">{s?.totalQty || 0} <span className="text-sm text-gray-400 font-normal">{s?.unit || ''}</span></p>
                    {s && s.latestPrice > 0 && <p className="text-xs text-gray-400 mt-1">Latest: {formatCurrency(s.latestPrice)}/unit</p>}
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-[#c9a227]/10 flex items-center justify-center">
                    <Package size={22} className="text-[#c9a227]" />
                  </div>
                </div>
              </WidgetCard>
            );
          })}
        </div>
      )}

      {/* Material Type Filters */}
      <PillTabs
        tabs={filterTabs}
        active={selectedType || 'all'}
        onChange={key => setSelectedType(key === 'all' ? null : key)}
      />

      {/* Entries */}
      {filteredEntries.length === 0 ? (
        <div className="warm-card p-12 text-center">
          <Package size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-400">No material entries found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEntries.map(entry => {
            const type = materialTypes.find(t => t.id === entry.materialTypeId);
            return (
              <div key={entry.id} className="warm-card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{type?.name || 'Unknown'}</p>
                      {entry.isOpening && <span className="text-[10px] px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full font-medium">Opening Stock</span>}
                    </div>
                    <p className="text-xs text-gray-400">Supplier: {entry.supplierName}</p>
                    <p className="text-xs text-gray-400">
                      Qty: {entry.quantity} {entry.unit}
                      {entry.remainingQuantity !== undefined && ` | Remaining: ${entry.remainingQuantity}`}
                      {' '}| Price: {formatCurrency(entry.price)}
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(entry.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-[#c9a227]">{formatCurrency(entry.price * entry.quantity)}</p>
                    {entry.billPhoto && (
                      <button
                        onClick={() => window.open(entry.billPhoto, '_blank')}
                        className="text-xs text-blue-500 hover:underline mt-1"
                      >
                        View Bill
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Material Type Modal */}
      <Modal isOpen={showAddType} onClose={() => { setShowAddType(false); setError(''); }} title="Add Material Type">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type Name</label>
            <input
              type="text"
              value={typeName}
              onChange={e => setTypeName(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-2xl text-sm"
              placeholder="e.g. Raw Steel, Copper Wire"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button onClick={handleAddType} className="w-full py-2.5 text-white rounded-2xl text-sm" style={{ backgroundColor: '#2d2d2d' }}>
            Add Type
          </button>
        </div>
      </Modal>

      {/* Opening Stock Modal */}
      <Modal isOpen={showOpening} onClose={() => { setShowOpening(false); setError(''); }} title="Add Opening Stock">
        <div className="space-y-4">
          <div className="p-3 bg-purple-50 border border-purple-100 rounded-2xl text-xs text-purple-700">
            Record material stock that existed before this system was put in place.
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Material Type</label>
            <select
              value={openingForm.materialTypeId}
              onChange={e => setOpeningForm({ ...openingForm, materialTypeId: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-2xl text-sm"
            >
              <option value="">Select type</option>
              {materialTypes.map(mt => <option key={mt.id} value={mt.id}>{mt.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input
                type="number"
                min="0.01" step="0.01"
                value={openingForm.quantity}
                onChange={e => setOpeningForm({ ...openingForm, quantity: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-2xl text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <select
                value={openingForm.unit}
                onChange={e => setOpeningForm({ ...openingForm, unit: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-2xl text-sm"
              >
                <option value="kg">kg</option>
                <option value="pcs">pieces</option>
                <option value="liters">liters</option>
                <option value="meters">meters</option>
                <option value="units">units</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price per Unit (INR)</label>
            <input
              type="number"
              min="0.01" step="0.01"
              value={openingForm.price}
              onChange={e => setOpeningForm({ ...openingForm, price: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-2xl text-sm"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button onClick={handleAddOpening} className="w-full py-2.5 text-white rounded-2xl text-sm bg-purple-600">
            Save Opening Stock
          </button>
        </div>
      </Modal>

      {/* Add Entry Modal */}
      <Modal isOpen={showAddEntry} onClose={() => { setShowAddEntry(false); setError(''); }} title="Add Material Entry">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Material Type</label>
            <select
              value={entryForm.materialTypeId}
              onChange={e => setEntryForm({ ...entryForm, materialTypeId: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-2xl text-sm"
            >
              <option value="">Select type</option>
              {materialTypes.map(mt => <option key={mt.id} value={mt.id}>{mt.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name</label>
            <input
              type="text"
              value={entryForm.supplierName}
              onChange={e => setEntryForm({ ...entryForm, supplierName: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-2xl text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input
                type="number"
                min="0.01" step="0.01"
                value={entryForm.quantity}
                onChange={e => setEntryForm({ ...entryForm, quantity: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-2xl text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <select
                value={entryForm.unit}
                onChange={e => setEntryForm({ ...entryForm, unit: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-2xl text-sm"
              >
                <option value="kg">kg</option>
                <option value="pcs">pieces</option>
                <option value="liters">liters</option>
                <option value="meters">meters</option>
                <option value="units">units</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price per Unit (INR)</label>
            <input
              type="number"
              min="0.01" step="0.01"
              value={entryForm.price}
              onChange={e => setEntryForm({ ...entryForm, price: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-2xl text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bill Photo</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleBillUpload}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-2xl text-sm"
            />
            {entryForm.billPhoto && (
              <img src={entryForm.billPhoto} alt="Bill" className="mt-2 rounded-2xl max-h-32 object-cover" />
            )}
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button onClick={handleAddEntry} className="w-full py-2.5 text-white rounded-2xl text-sm" style={{ backgroundColor: '#2196f3' }}>
            Add Entry
          </button>
        </div>
      </Modal>
    </div>
  );
}
