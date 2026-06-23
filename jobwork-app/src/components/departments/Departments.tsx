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
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Departments</h1>
          <p className="text-gray-500 text-sm">Manage built-in and custom departments</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 text-white rounded-2xl text-sm font-medium hover:opacity-90"
          style={{ backgroundColor: '#2d2d2d' }}
        >
          <Plus size={16} /> Add Department
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {departments.map(d => (
          <div key={d.key} className="warm-card p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#c9a227]/10 flex items-center justify-center">
                <Building2 size={20} className="text-[#c9a227]" />
              </div>
              <div>
                <p className="font-medium text-sm">{d.label}</p>
                <p className="text-xs text-gray-400">
                  {d.custom ? 'Custom' : 'Built-in'} &middot; key: {d.key}
                </p>
              </div>
            </div>
            {d.custom ? (
              <button
                onClick={() => setShowDelete({ key: d.key, label: d.label })}
                className="p-2 rounded-2xl hover:bg-red-50 text-red-500"
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

      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-xs text-blue-700">
        Built-in departments ({Object.values(DEFAULT_DEPARTMENT_LABELS).join(', ')}) are part of the production workflow and cannot be deleted. Custom departments are available everywhere users and accounting are tracked.
      </div>

      <Modal isOpen={showAdd} onClose={() => { setShowAdd(false); setError(''); setName(''); }} title="Add Department">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Quality Control"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-2xl text-sm focus:outline-none focus:border-[#c9a227]"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button onClick={handleAdd} className="w-full py-2.5 text-white rounded-2xl text-sm font-medium" style={{ backgroundColor: '#2d2d2d' }}>
            Create Department
          </button>
        </div>
      </Modal>

      <Modal isOpen={!!showDelete} onClose={() => { setShowDelete(null); setReason(''); setAdminPassword(''); setError(''); }} title="Delete Department">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Delete <strong>{showDelete?.label}</strong>?</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason (required)</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-2xl text-sm"
              placeholder="Enter reason"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Admin Password (required)</label>
            <input
              type="password"
              value={adminPassword}
              onChange={e => setAdminPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-2xl text-sm"
              placeholder="Enter admin password"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button onClick={handleDelete} className="w-full py-2.5 bg-red-500 text-white rounded-2xl text-sm font-medium">Delete</button>
        </div>
      </Modal>
    </div>
  );
}
