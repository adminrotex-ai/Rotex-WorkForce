import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../../store';
import type { User, Department } from '../../types';
import { DEPARTMENT_LABELS } from '../../types';
import { getActiveUsers, getUsersByCreator, createUser, deleteUser } from '../../database/operations';
import Modal from '../common/Modal';
import { Trash2, BarChart3, ChevronRight, Eye, Users, UserPlus } from 'lucide-react';

const DEPARTMENTS: Department[] = ['store', 'welding', 'pressing', 'buffing', 'packaging', 'dispatch'];

export default function UserManagement() {
  const { currentUser } = useSelector((s: RootState) => s.auth);
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showDelete, setShowDelete] = useState<User | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [error, setError] = useState('');
  const [expandedDept, setExpandedDept] = useState<Department | null>(null);
  const [expandedHod, setExpandedHod] = useState<string | null>(null);

  const [form, setForm] = useState({
    username: '',
    password: '',
    firstName: '',
    role: 'user' as 'hod' | 'user',
    department: 'store' as Department,
    phone: '',
  });

  const isAdmin = currentUser?.role === 'admin';
  const isHod = currentUser?.role === 'hod';

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    if (!currentUser) return;
    if (isAdmin) {
      setUsers(await getActiveUsers());
    } else if (isHod) {
      setUsers(await getUsersByCreator(currentUser.id));
    }
  };

  const handleCreate = async () => {
    setError('');
    if (!form.username || !form.password || !form.firstName) {
      setError('All fields are required');
      return;
    }
    if (form.role === 'hod' && !form.phone) {
      setError('Phone number is required for HOD');
      return;
    }
    try {
      await createUser(
        form.username, form.password, form.firstName,
        form.role, isHod ? currentUser!.department : form.department,
        currentUser!.id, currentUser!.firstName, form.phone
      );
      setShowCreate(false);
      setForm({ username: '', password: '', firstName: '', role: 'user', department: 'store', phone: '' });
      loadUsers();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDelete = async () => {
    if (!showDelete || !deleteReason.trim()) {
      setError('Deletion reason is required');
      return;
    }
    try {
      await deleteUser(showDelete.id, deleteReason, currentUser!.id, currentUser!.firstName);
      setShowDelete(null);
      setDeleteReason('');
      loadUsers();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const allUsers = users.filter(u => u.id !== currentUser?.id);
  const hodsByDept = (dept: Department) => allUsers.filter(u => u.department === dept && u.role === 'hod');
  const usersByHod = (hodId: string) => allUsers.filter(u => u.createdBy === hodId && u.role === 'user');

  const renderDepartmentView = () => (
    <div className="space-y-3">
      {DEPARTMENTS.map(dept => {
        const hods = hodsByDept(dept);
        const isExpanded = expandedDept === dept;
        return (
          <div key={dept} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <button
              onClick={() => setExpandedDept(isExpanded ? null : dept)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-gradient-to-r from-[#1a237e] to-[#0d47a1]">
                  <Users size={18} className="text-white" />
                </div>
                <div className="text-left">
                  <p className="font-medium">{DEPARTMENT_LABELS[dept]}</p>
                  <p className="text-xs text-gray-400">{hods.length} HODs</p>
                </div>
              </div>
              <ChevronRight size={18} className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            </button>

            {isExpanded && (
              <div className="border-t border-gray-100 p-4 animate-fade-in">
                {hods.length === 0 ? (
                  <p className="text-gray-400 text-sm">No HODs in this department</p>
                ) : (
                  <div className="space-y-3">
                    {hods.map(hod => {
                      const hodUsers = usersByHod(hod.id);
                      return (
                        <div key={hod.id} className="border border-gray-100 rounded-2xl overflow-hidden">
                          <div className="flex items-center justify-between p-3 bg-gray-50">
                            <div>
                              <p className="font-medium text-sm">{hod.firstName} <span className="text-xs text-blue-500">(HOD)</span></p>
                              {isAdmin && (
                                <p className="text-xs text-gray-400">
                                  Username: {hod.username} | Password: ****
                                  {hod.phone && ` | Phone: ${hod.phone}`}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => navigate(`/statistics/user/${hod.id}`)}
                                className="p-1.5 rounded-2xl hover:bg-blue-50 text-blue-500 transition-colors"
                                title="Inspect HOD"
                              >
                                <BarChart3 size={16} />
                              </button>
                              <button
                                onClick={() => setExpandedHod(expandedHod === hod.id ? null : hod.id)}
                                className="p-1.5 rounded-2xl hover:bg-gray-200 text-gray-500 transition-colors"
                                title="View Users"
                              >
                                <Eye size={16} />
                              </button>
                              {(isAdmin || isHod) && (
                                <button
                                  onClick={() => setShowDelete(hod)}
                                  className="p-1.5 rounded-2xl hover:bg-red-50 text-red-500 transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </div>

                          {expandedHod === hod.id && (
                            <div className="p-3 border-t border-gray-100 animate-fade-in">
                              {hodUsers.length === 0 ? (
                                <p className="text-gray-400 text-xs">No users under this HOD</p>
                              ) : (
                                <div className="space-y-3">
                                  {hodUsers.map(user => (
                                    <div key={user.id} className="flex items-center justify-between p-2 rounded-2xl hover:bg-gray-50">
                                      <div>
                                        <p className="text-sm font-medium">{user.firstName}</p>
                                        {isAdmin && (
                                          <p className="text-xs text-gray-400">Username: {user.username}</p>
                                        )}
                                      </div>
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => navigate(`/statistics/user/${user.id}`)}
                                          className="p-1.5 rounded-2xl hover:bg-blue-50 text-blue-500 transition-colors text-xs"
                                          title="Inspect User"
                                        >
                                          <BarChart3 size={14} />
                                        </button>
                                        <button
                                          onClick={() => setShowDelete(user)}
                                          className="p-1.5 rounded-2xl hover:bg-red-50 text-red-500 transition-colors"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const renderHodView = () => {
    const myUsers = allUsers.filter(u => u.createdBy === currentUser?.id);
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold mb-4" >My Team Members</h2>
        {myUsers.length === 0 ? (
          <p className="text-gray-400 text-sm">No users created yet</p>
        ) : (
          <div className="space-y-3">
            {myUsers.map(user => (
              <div key={user.id} className="flex items-center justify-between p-3 rounded-2xl border border-gray-100 hover:bg-gray-50">
                <div>
                  <p className="font-medium text-sm">{user.firstName}</p>
                  <p className="text-xs text-gray-400">Username: {user.username} | Role: {user.role}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/statistics/user/${user.id}`)}
                    className="p-1.5 rounded-2xl hover:bg-blue-50 text-blue-500 transition-colors"
                    title="Inspect User"
                  >
                    <BarChart3 size={16} />
                  </button>
                  <button
                    onClick={() => setShowDelete(user)}
                    className="p-1.5 rounded-2xl hover:bg-red-50 text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" >User Management</h1>
          <p className="text-gray-500 text-sm">Create and manage user accounts</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 text-white rounded-2xl transition-all hover:opacity-90"
          style={{ backgroundColor: '#1a237e',  }}
        >
          <UserPlus size={18} />
          <span className="text-sm font-medium">Create User</span>
        </button>
      </div>

      {isAdmin ? renderDepartmentView() : renderHodView()}

      {/* Create User Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create New User">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
            <input
              type="text"
              value={form.firstName}
              onChange={e => setForm({ ...form, firstName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:border-[#1a237e] text-sm"
              placeholder="Enter first name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:border-[#1a237e] text-sm"
              placeholder="Enter username"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:border-[#1a237e] text-sm"
              placeholder="Enter password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={form.role}
              onChange={e => setForm({ ...form, role: e.target.value as 'hod' | 'user' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:border-[#1a237e] text-sm"
            >
              {isAdmin && <option value="hod">Head of Department (HOD)</option>}
              <option value="user">User</option>
            </select>
          </div>
          {isAdmin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select
                value={form.department}
                onChange={e => setForm({ ...form, department: e.target.value as Department })}
                className="w-full px-3 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:border-[#1a237e] text-sm"
              >
                {DEPARTMENTS.map(d => (
                  <option key={d} value={d}>{DEPARTMENT_LABELS[d]}</option>
                ))}
              </select>
            </div>
          )}
          {form.role === 'hod' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:border-[#1a237e] text-sm"
                placeholder="Enter phone number"
              />
            </div>
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            onClick={handleCreate}
            className="w-full py-2 text-white font-medium rounded-2xl transition-all hover:opacity-90 text-sm"
            style={{ backgroundColor: '#1a237e',  }}
          >
            Create User
          </button>
        </div>
      </Modal>

      {/* Delete User Modal */}
      <Modal isOpen={!!showDelete} onClose={() => { setShowDelete(null); setDeleteReason(''); }} title="Delete User">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete <strong>{showDelete?.firstName}</strong>?
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason for deletion (required)</label>
            <textarea
              value={deleteReason}
              onChange={e => setDeleteReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:border-red-500 text-sm"
              rows={3}
              placeholder="Enter reason for deletion"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-3">
            <button
              onClick={() => { setShowDelete(null); setDeleteReason(''); }}
              className="flex-1 py-2 border border-gray-300 rounded-2xl text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="flex-1 py-2 bg-red-500 text-white rounded-2xl text-sm hover:bg-red-600"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
