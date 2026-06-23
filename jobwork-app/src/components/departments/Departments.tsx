import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { DEFAULT_DEPARTMENT_LABELS } from '../../types';
import { db } from '../../database/db';
import {
  getActiveDepartments, createCustomDepartment, deleteCustomDepartment,
} from '../../database/operations';
import Modal from '../common/Modal';
import { Building2, Plus, Trash2, Lock } from 'lucide-react';

export default function Departments() {
  const { currentUser } = useSelector((s: RootState) => s.auth);
  const [departments, setDepartments] = useState<Array<{ key: string; label: string; custom: boolean }>>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showDelete, setShowDelete] = useState<{ key: string; label: string } | null>(null);
  const [name, setName] = useState('');
  const [reason, setReason] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [error, setError] = useState('');

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => { load(); }, []);

  const load = async () => setDepartments(await getActiveDepartments());

  const handleAdd = async () => {
    if (!currentUser) return;
    setError('');
    try {
      await createCustomDepartment(name, currentUser.id, currentUser.firstName);
      setShowAdd(false);
      setName('');
      load();
    } catch (e: any) { setError(e.message); }
  };

  const handleDelete = async () => {
    if (!currentUser || !showDelete) return;
    setError('');
    try {
      const custom = await db.customDepartments.where('key').equals(showDelete.key).first();
      if (!custom) throw new Error('Department not found');
      await deleteCustomDepartment(custom.id, reason, currentUser.id, currentUser.firstName, adminPassword);
      setShowDelete(null);
      setReason('');
      setAdminPassword('');
      load();
    } catch (e: any) { setError(e.message); }
  };

  if (!isAdmin) return <p className="text-gray-400">Access denied</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-light text-gray-900">Departments</h1>
          <p className="text-sm text-gray-400 mt-1">Manage built-in and custom departments</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-[#2a2a2a] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#1a1a1a] cursor-pointer"
        >
          <Plus size={16} /> Add Department
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
        {departments.map(d => (
          <div key={d.key} className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gold-300 flex items-center justify-center">
                <Building2 size={20} className="text-dark-800" />
              </div>
              <div>
                <p className="font-medium text-sm text-gray-900">{d.label}</p>
                <p className="text-[11px] text-gray-400">
                  {d.custom ? 'Custom' : 'Built-in'} · key: {d.key}
                </p>
              </div>
            </div>
            {d.custom ? (
              <button
                onClick={() => setShowDelete({ key: d.key, label: d.label })}
                className="p-2 rounded-xl hover:bg-red-50 text-red-400 cursor-pointer"
                title="Delete department"
              >
                <Trash2 size={16} />
              </button>
            ) : (
              <Lock size={14} className="text-gray-300" />
            )}
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-[11px] text-blue-700">
        Built-in departments ({Object.values(DEFAULT_DEPARTMENT_LABELS).join(', ')}) are part of the production workflow and cannot be deleted. Custom departments are available everywhere users and accounting are tracked.
      </div>

      <Modal isOpen={showAdd} onClose={() => { setShowAdd(false); setError(''); setName(''); }} title="Add Department">
        <div className="space-y-4">
          {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Quality Control"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
            />
          </div>
          <button onClick={handleAdd} className="w-full bg-[#2a2a2a] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#1a1a1a] cursor-pointer">
            Create Department
          </button>
        </div>
      </Modal>

      <Modal isOpen={!!showDelete} onClose={() => { setShowDelete(null); setReason(''); setAdminPassword(''); setError(''); }} title="Delete Department" maxWidth="28rem">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Delete <strong>{showDelete?.label}</strong>?</p>
          {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason (required)</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              placeholder="Enter reason"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Admin Password (required)</label>
            <input
              type="password"
              value={adminPassword}
              onChange={e => setAdminPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              placeholder="Enter admin password"
            />
          </div>
          <div className="flex gap-3 justify-end mt-4">
            <button onClick={() => { setShowDelete(null); setReason(''); setAdminPassword(''); setError(''); }} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer">Cancel</button>
            <button onClick={handleDelete} className="px-4 py-2 text-sm bg-red-500 text-white rounded-xl hover:bg-red-600 cursor-pointer">Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
