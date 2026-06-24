import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import type { MaterialType, MaterialEntry } from '../../types';
import {
  getActiveMaterialTypes, createMaterialType, addMaterialEntry, getMaterialEntries,
  deleteMaterialType, deleteMaterialEntry, updateMaterialEntry,
} from '../../database/operations';
import { formatCurrency } from '../../utils/helpers';
import Modal from '../common/Modal';
import { Plus, FolderOpen, Package, Boxes, Trash2, Pencil } from 'lucide-react';

export default function Materials() {
  const { currentUser } = useSelector((s: RootState) => s.auth);
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([]);
  const [entries, setEntries] = useState<MaterialEntry[]>([]);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [showAddType, setShowAddType] = useState(false);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [showOpening, setShowOpening] = useState(false);
  const [showDeleteType, setShowDeleteType] = useState<MaterialType | null>(null);
  const [showDeleteEntry, setShowDeleteEntry] = useState<MaterialEntry | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [showEditEntry, setShowEditEntry] = useState<MaterialEntry | null>(null);
  const [editEntryForm, setEditEntryForm] = useState({ supplierName: '', price: '', quantity: '', unit: 'kg', isRawMaterial: false, reason: '' });
  const [typeName, setTypeName] = useState('');
  const [error, setError] = useState('');

  const [entryForm, setEntryForm] = useState({
    materialTypeId: '',
    supplierName: '',
    price: '',
    quantity: '',
    unit: 'kg',
    billPhoto: '',
    isRawMaterial: false,
  });

  const [openingForm, setOpeningForm] = useState({
    materialTypeId: '',
    price: '',
    quantity: '',
    unit: 'kg',
    isRawMaterial: false,
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
        undefined, entryForm.isRawMaterial || undefined,
      );
      setShowAddEntry(false);
      setEntryForm({ materialTypeId: '', supplierName: '', price: '', quantity: '', unit: 'kg', billPhoto: '', isRawMaterial: false });
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
        openingForm.isRawMaterial || undefined,
      );
      setShowOpening(false);
      setOpeningForm({ materialTypeId: '', price: '', quantity: '', unit: 'kg', isRawMaterial: false });
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

  const handleDeleteType = async () => {
    if (!currentUser || !showDeleteType) return;
    setError('');
    try {
      await deleteMaterialType(showDeleteType.id, deleteReason, currentUser.id, currentUser.firstName, deletePassword);
      setShowDeleteType(null);
      setDeleteReason('');
      setDeletePassword('');
      if (selectedType === showDeleteType.id) setSelectedType(null);
      loadData();
    } catch (e: any) { setError(e.message); }
  };

  const handleDeleteEntry = async () => {
    if (!currentUser || !showDeleteEntry) return;
    setError('');
    try {
      await deleteMaterialEntry(showDeleteEntry.id, deleteReason, currentUser.id, currentUser.firstName, deletePassword);
      setShowDeleteEntry(null);
      setDeleteReason('');
      setDeletePassword('');
      loadData();
    } catch (e: any) { setError(e.message); }
  };

  const handleEditEntry = async () => {
    if (!currentUser || !showEditEntry) return;
    setError('');
    if (!editEntryForm.reason.trim()) { setError('Reason for edit is required'); return; }
    const price = parseFloat(editEntryForm.price);
    const quantity = parseFloat(editEntryForm.quantity);
    if (!Number.isFinite(price) || price <= 0) { setError('Price must be a positive number'); return; }
    if (!Number.isFinite(quantity) || quantity <= 0) { setError('Quantity must be a positive number'); return; }
    try {
      await updateMaterialEntry(
        showEditEntry.id,
        { supplierName: editEntryForm.supplierName, price, quantity, unit: editEntryForm.unit, isRawMaterial: editEntryForm.isRawMaterial },
        editEntryForm.reason, currentUser.id, currentUser.firstName,
      );
      setShowEditEntry(null);
      setEditEntryForm({ supplierName: '', price: '', quantity: '', unit: 'kg', isRawMaterial: false, reason: '' });
      loadData();
    } catch (e: any) { setError(e.message); }
  };

  const canManage = currentUser?.role === 'admin' || (currentUser?.role === 'hod' && currentUser?.department === 'store');

  const filteredEntries = (selectedType ? entries.filter(e => e.materialTypeId === selectedType) : entries)
    .slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-light text-gray-900">Materials & Inventory</h1>
          <p className="text-sm text-gray-400 mt-1">Manage raw materials, opening stock and supplier entries</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowAddType(true)}
            className="flex items-center gap-2 bg-[#2a2a2a] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#1a1a1a] cursor-pointer"
          >
            <FolderOpen size={16} /> Add Material Type
          </button>
          <button
            onClick={() => setShowOpening(true)}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-purple-700 cursor-pointer"
          >
            <Boxes size={16} /> Opening Stock
          </button>
          <button
            onClick={() => setShowAddEntry(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 cursor-pointer"
          >
            <Plus size={16} /> Add Entry
          </button>
        </div>
      </div>

      {/* Material Type Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setSelectedType(null)}
          className={`px-4 py-2 text-sm rounded-xl cursor-pointer ${!selectedType ? 'bg-[#2a2a2a] text-white' : 'bg-white/60 text-gray-600'}`}
        >
          All Types
        </button>
        {materialTypes.map(mt => (
          <div key={mt.id} className="flex items-center gap-0">
            <button
              onClick={() => setSelectedType(mt.id)}
              className={`px-4 py-2 text-sm rounded-xl cursor-pointer ${selectedType === mt.id ? 'bg-[#2a2a2a] text-white' : 'bg-white/60 text-gray-600'} ${canManage ? 'rounded-r-none' : ''}`}
            >
              {mt.name}
            </button>
            {canManage && (
              <button
                onClick={() => { setShowDeleteType(mt); setError(''); setDeleteReason(''); setDeletePassword(''); }}
                className={`px-2 py-2 text-sm rounded-xl rounded-l-none cursor-pointer ${selectedType === mt.id ? 'bg-[#2a2a2a] text-red-400 hover:text-red-300' : 'bg-white/60 text-red-400 hover:text-red-600'}`}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Entries Table */}
      {filteredEntries.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Package size={40} className="mx-auto mb-3 opacity-40" />
          <p>No material entries found</p>
        </div>
      ) : (
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-white/40">
                  <th className="text-left px-4 py-3 text-[11px] text-gray-500 uppercase font-semibold tracking-wider">Material</th>
                  <th className="text-left px-4 py-3 text-[11px] text-gray-500 uppercase font-semibold tracking-wider">Supplier</th>
                  <th className="text-right px-4 py-3 text-[11px] text-gray-500 uppercase font-semibold tracking-wider">Stock (Qty)</th>
                  <th className="text-right px-4 py-3 text-[11px] text-gray-500 uppercase font-semibold tracking-wider">Remaining</th>
                  <th className="text-right px-4 py-3 text-[11px] text-gray-500 uppercase font-semibold tracking-wider">Price/Unit</th>
                  <th className="text-right px-4 py-3 text-[11px] text-gray-500 uppercase font-semibold tracking-wider">Total Amount</th>
                  <th className="text-right px-4 py-3 text-[11px] text-gray-500 uppercase font-semibold tracking-wider">Date</th>
                  <th className="text-center px-4 py-3 text-[11px] text-gray-500 uppercase font-semibold tracking-wider">Bill</th>
                  {canManage && <th className="text-center px-4 py-3 text-[11px] text-gray-500 uppercase font-semibold tracking-wider"></th>}
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry, idx) => {
                  const type = materialTypes.find(t => t.id === entry.materialTypeId);
                  return (
                    <tr key={entry.id} className={`border-b border-gray-100 ${idx % 2 === 0 ? '' : 'bg-white/30'} hover:bg-gold-50/30`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{type?.name || 'Unknown'}</span>
                          {entry.isOpening && <span className="text-[10px] px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full font-medium whitespace-nowrap">Opening</span>}
                          {entry.isRawMaterial && <span className="text-[10px] px-2 py-0.5 bg-green-50 text-green-700 rounded-full font-medium whitespace-nowrap">Raw Material</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{entry.supplierName}</td>
                      <td className="px-4 py-3 text-right text-gray-900">{entry.quantity} {entry.unit}</td>
                      <td className="px-4 py-3 text-right text-gray-900">{entry.remainingQuantity !== undefined ? `${entry.remainingQuantity} ${entry.unit}` : '—'}</td>
                      <td className="px-4 py-3 text-right text-gray-900">{formatCurrency(entry.price)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gold-600">{formatCurrency(entry.price * entry.quantity)}</td>
                      <td className="px-4 py-3 text-right text-[11px] text-gray-400 whitespace-nowrap">{new Date(entry.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                      <td className="px-4 py-3 text-center">
                        {entry.billPhoto ? (
                          <button
                            onClick={() => window.open(entry.billPhoto, '_blank')}
                            className="text-[11px] text-blue-500 hover:underline cursor-pointer"
                          >
                            View
                          </button>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      {canManage && (
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                setShowEditEntry(entry);
                                setEditEntryForm({
                                  supplierName: entry.supplierName,
                                  price: String(entry.price),
                                  quantity: String(entry.quantity),
                                  unit: entry.unit,
                                  isRawMaterial: !!entry.isRawMaterial,
                                  reason: '',
                                });
                                setError('');
                              }}
                              className="text-blue-400 hover:text-blue-600 cursor-pointer"
                              title="Edit"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => { setShowDeleteEntry(entry); setError(''); setDeleteReason(''); setDeletePassword(''); }}
                              className="text-red-400 hover:text-red-600 cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Material Type Modal */}
      <Modal isOpen={showAddType} onClose={() => { setShowAddType(false); setError(''); }} title="Add Material Type">
        <div className="space-y-4">
          {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type Name</label>
            <input
              type="text"
              value={typeName}
              onChange={e => setTypeName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              placeholder="e.g. Raw Steel, Copper Wire"
            />
          </div>
          <button onClick={handleAddType} className="w-full bg-[#2a2a2a] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#1a1a1a] cursor-pointer">
            Add Type
          </button>
        </div>
      </Modal>

      {/* Opening Stock Modal */}
      <Modal isOpen={showOpening} onClose={() => { setShowOpening(false); setError(''); }} title="Add Opening Stock">
        <div className="space-y-4">
          <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl text-[11px] text-purple-700">
            Record material stock that existed before this system was put in place.
          </div>
          {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Material Type</label>
            <select
              value={openingForm.materialTypeId}
              onChange={e => setOpeningForm({ ...openingForm, materialTypeId: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
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
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <select
                value={openingForm.unit}
                onChange={e => setOpeningForm({ ...openingForm, unit: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
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
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
            />
          </div>
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div className={`relative w-10 h-5 rounded-full transition-colors ${openingForm.isRawMaterial ? 'bg-green-500' : 'bg-gray-300'}`}>
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${openingForm.isRawMaterial ? 'translate-x-5' : ''}`} />
              <input type="checkbox" checked={openingForm.isRawMaterial} onChange={e => setOpeningForm({ ...openingForm, isRawMaterial: e.target.checked })} className="sr-only" />
            </div>
            <span className="text-sm font-medium text-gray-700">Raw Material</span>
            <span className="text-[11px] text-gray-400">(adds to store stock)</span>
          </label>
          <button onClick={handleAddOpening} className="w-full bg-purple-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-purple-700 cursor-pointer">
            Save Opening Stock
          </button>
        </div>
      </Modal>

      {/* Delete Material Type Modal */}
      <Modal isOpen={!!showDeleteType} onClose={() => { setShowDeleteType(null); setError(''); }} title="Delete Material Type">
        <div className="space-y-4">
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-[11px] text-red-700">
            This will deactivate the material type <strong>{showDeleteType?.name}</strong>. Existing entries will remain but no new entries can be added to this type.
          </div>
          {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Deletion *</label>
            <textarea
              value={deleteReason}
              onChange={e => setDeleteReason(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              rows={2}
              placeholder="Why is this material type being deleted?"
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
          <button onClick={handleDeleteType} className="w-full bg-red-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-red-700 cursor-pointer">
            Delete Material Type
          </button>
        </div>
      </Modal>

      {/* Delete Material Entry Modal */}
      <Modal isOpen={!!showDeleteEntry} onClose={() => { setShowDeleteEntry(null); setError(''); }} title="Delete Material Entry">
        <div className="space-y-4">
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-[11px] text-red-700">
            This will permanently delete the entry for <strong>{materialTypes.find(t => t.id === showDeleteEntry?.materialTypeId)?.name || 'Unknown'}</strong> — {showDeleteEntry?.quantity} {showDeleteEntry?.unit} at {showDeleteEntry ? formatCurrency(showDeleteEntry.price) : ''}/unit.
          </div>
          {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Deletion *</label>
            <textarea
              value={deleteReason}
              onChange={e => setDeleteReason(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              rows={2}
              placeholder="Why is this entry being deleted?"
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
          <button onClick={handleDeleteEntry} className="w-full bg-red-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-red-700 cursor-pointer">
            Delete Entry
          </button>
        </div>
      </Modal>

      {/* Edit Material Entry Modal */}
      <Modal isOpen={!!showEditEntry} onClose={() => { setShowEditEntry(null); setError(''); }} title={`Edit Entry — ${materialTypes.find(t => t.id === showEditEntry?.materialTypeId)?.name || ''}`}>
        <div className="space-y-4">
          {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name</label>
            <input
              type="text"
              value={editEntryForm.supplierName}
              onChange={e => setEditEntryForm({ ...editEntryForm, supplierName: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
              <input
                type="number"
                min="0.01" step="0.01"
                value={editEntryForm.quantity}
                onChange={e => setEditEntryForm({ ...editEntryForm, quantity: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <select
                value={editEntryForm.unit}
                onChange={e => setEditEntryForm({ ...editEntryForm, unit: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Price per Unit (INR) *</label>
            <input
              type="number"
              min="0.01" step="0.01"
              value={editEntryForm.price}
              onChange={e => setEditEntryForm({ ...editEntryForm, price: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
            />
          </div>
          {editEntryForm.quantity && editEntryForm.price && (
            <p className="text-sm font-medium text-gray-900">
              Total value: {formatCurrency(parseFloat(editEntryForm.quantity) * parseFloat(editEntryForm.price))}
            </p>
          )}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div className={`relative w-10 h-5 rounded-full transition-colors ${editEntryForm.isRawMaterial ? 'bg-green-500' : 'bg-gray-300'}`}>
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${editEntryForm.isRawMaterial ? 'translate-x-5' : ''}`} />
              <input type="checkbox" checked={editEntryForm.isRawMaterial} onChange={e => setEditEntryForm({ ...editEntryForm, isRawMaterial: e.target.checked })} className="sr-only" />
            </div>
            <span className="text-sm font-medium text-gray-700">Raw Material</span>
            <span className="text-[11px] text-gray-400">(adds to store stock)</span>
          </label>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Edit *</label>
            <textarea
              value={editEntryForm.reason}
              onChange={e => setEditEntryForm({ ...editEntryForm, reason: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              rows={2}
              placeholder="Why is this entry being edited?"
            />
          </div>
          <button onClick={handleEditEntry} className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 cursor-pointer">
            Save Changes
          </button>
        </div>
      </Modal>

      {/* Add Entry Modal */}
      <Modal isOpen={showAddEntry} onClose={() => { setShowAddEntry(false); setError(''); }} title="Add Material Entry">
        <div className="space-y-4">
          {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Material Type</label>
            <select
              value={entryForm.materialTypeId}
              onChange={e => setEntryForm({ ...entryForm, materialTypeId: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
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
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
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
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <select
                value={entryForm.unit}
                onChange={e => setEntryForm({ ...entryForm, unit: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
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
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
            />
          </div>
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div className={`relative w-10 h-5 rounded-full transition-colors ${entryForm.isRawMaterial ? 'bg-green-500' : 'bg-gray-300'}`}>
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${entryForm.isRawMaterial ? 'translate-x-5' : ''}`} />
              <input type="checkbox" checked={entryForm.isRawMaterial} onChange={e => setEntryForm({ ...entryForm, isRawMaterial: e.target.checked })} className="sr-only" />
            </div>
            <span className="text-sm font-medium text-gray-700">Raw Material</span>
            <span className="text-[11px] text-gray-400">(adds to store stock)</span>
          </label>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bill Photo</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleBillUpload}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
            />
            {entryForm.billPhoto && (
              <img src={entryForm.billPhoto} alt="Bill" className="mt-2 rounded-xl max-h-32 object-cover" />
            )}
          </div>
          <button onClick={handleAddEntry} className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 cursor-pointer">
            Add Entry
          </button>
        </div>
      </Modal>
    </div>
  );
}
