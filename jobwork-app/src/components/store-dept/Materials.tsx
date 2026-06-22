import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import type { MaterialType, MaterialEntry } from '../../types';
import {
  getActiveMaterialTypes, createMaterialType, addMaterialEntry, getMaterialEntries,
} from '../../database/operations';
import { formatCurrency, formatDate } from '../../utils/helpers';
import Modal from '../common/Modal';
import { Plus, FolderOpen, Package } from 'lucide-react';

export default function Materials() {
  const { currentUser } = useSelector((s: RootState) => s.auth);
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([]);
  const [entries, setEntries] = useState<MaterialEntry[]>([]);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [showAddType, setShowAddType] = useState(false);
  const [showAddEntry, setShowAddEntry] = useState(false);
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
    setMaterialTypes(await getActiveMaterialTypes());
    setEntries(await getMaterialEntries());
  };

  const handleAddType = async () => {
    if (!typeName.trim() || !currentUser) { setError('Enter type name'); return; }
    try {
      await createMaterialType(typeName, currentUser.id, currentUser.firstName);
      setShowAddType(false);
      setTypeName('');
      loadData();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleAddEntry = async () => {
    if (!currentUser) return;
    setError('');
    const price = parseFloat(entryForm.price);
    const quantity = parseFloat(entryForm.quantity);
    if (!entryForm.materialTypeId || !entryForm.supplierName || !price || !quantity) {
      setError('Fill all required fields');
      return;
    }
    try {
      await addMaterialEntry(
        entryForm.materialTypeId, entryForm.supplierName, price, quantity,
        entryForm.unit, currentUser.id, currentUser.firstName, entryForm.billPhoto || undefined
      );
      setShowAddEntry(false);
      setEntryForm({ materialTypeId: '', supplierName: '', price: '', quantity: '', unit: 'kg', billPhoto: '' });
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
        setEntryForm({ ...entryForm, billPhoto: ev.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const filteredEntries = selectedType ? entries.filter(e => e.materialTypeId === selectedType) : entries;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#001f3f' }}>Materials & Inventory</h1>
          <p className="text-gray-500 text-sm">Manage raw materials and supplier entries</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddType(true)}
            className="flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm hover:opacity-90"
            style={{ backgroundColor: '#001f3f', borderRadius: '8px' }}
          >
            <FolderOpen size={16} /> Add Material Type
          </button>
          <button
            onClick={() => setShowAddEntry(true)}
            className="flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm hover:opacity-90"
            style={{ backgroundColor: '#0074d9', borderRadius: '8px' }}
          >
            <Plus size={16} /> Add Entry
          </button>
        </div>
      </div>

      {/* Material Type Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedType(null)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium ${!selectedType ? 'text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
          style={!selectedType ? { backgroundColor: '#001f3f' } : {}}
        >
          All Types
        </button>
        {materialTypes.map(mt => (
          <button
            key={mt.id}
            onClick={() => setSelectedType(mt.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${selectedType === mt.id ? 'text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
            style={selectedType === mt.id ? { backgroundColor: '#001f3f' } : {}}
          >
            {mt.name}
          </button>
        ))}
      </div>

      {/* Entries */}
      {filteredEntries.length === 0 ? (
        <div className="bg-white rounded-lg p-12 text-center border border-gray-100" style={{ borderRadius: '8px' }}>
          <Package size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-400">No material entries found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEntries.map(entry => {
            const type = materialTypes.find(t => t.id === entry.materialTypeId);
            return (
              <div key={entry.id} className="bg-white rounded-lg p-4 border border-gray-100" style={{ borderRadius: '8px' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{type?.name || 'Unknown'}</p>
                    <p className="text-xs text-gray-400">Supplier: {entry.supplierName}</p>
                    <p className="text-xs text-gray-400">Qty: {entry.quantity} {entry.unit} | Price: {formatCurrency(entry.price)}</p>
                    <p className="text-xs text-gray-400">{formatDate(entry.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold" style={{ color: '#001f3f' }}>{formatCurrency(entry.price * entry.quantity)}</p>
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
      <Modal isOpen={showAddType} onClose={() => setShowAddType(false)} title="Add Material Type">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type Name</label>
            <input
              type="text"
              value={typeName}
              onChange={e => setTypeName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="e.g. Raw Steel, Copper Wire"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button onClick={handleAddType} className="w-full py-2 text-white rounded-lg text-sm" style={{ backgroundColor: '#001f3f', borderRadius: '8px' }}>
            Add Type
          </button>
        </div>
      </Modal>

      {/* Add Entry Modal */}
      <Modal isOpen={showAddEntry} onClose={() => setShowAddEntry(false)} title="Add Material Entry">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Material Type</label>
            <select
              value={entryForm.materialTypeId}
              onChange={e => setEntryForm({ ...entryForm, materialTypeId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input
                type="number"
                value={entryForm.quantity}
                onChange={e => setEntryForm({ ...entryForm, quantity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <select
                value={entryForm.unit}
                onChange={e => setEntryForm({ ...entryForm, unit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
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
              value={entryForm.price}
              onChange={e => setEntryForm({ ...entryForm, price: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bill Photo</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleBillUpload}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            {entryForm.billPhoto && (
              <img src={entryForm.billPhoto} alt="Bill" className="mt-2 rounded-lg max-h-32 object-cover" />
            )}
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button onClick={handleAddEntry} className="w-full py-2 text-white rounded-lg text-sm" style={{ backgroundColor: '#0074d9', borderRadius: '8px' }}>
            Add Entry
          </button>
        </div>
      </Modal>
    </div>
  );
}
