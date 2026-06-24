import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../../store';
import type { User, Department, Batch, ServiceCost } from '../../types';
import { DEPARTMENT_LABELS } from '../../types';
import {
  getActiveUsers, getUsersByCreator, createUser, deleteUser, getActiveDepartments,
  getServiceCosts, recordServiceCost, updateServiceCost, getActiveBatches,
} from '../../database/operations';
import Modal from '../common/Modal';
import { Trash2, BarChart3, ChevronRight, Eye, Users, UserPlus, Camera, ImageIcon, X, DollarSign, Pencil } from 'lucide-react';
import { formatCurrency } from '../../utils/helpers';

export default function UserManagement() {
  const { currentUser } = useSelector((s: RootState) => s.auth);
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Array<{ key: string; label: string; custom: boolean }>>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showDelete, setShowDelete] = useState<User | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteAdminPassword, setDeleteAdminPassword] = useState('');
  const [error, setError] = useState('');
  const [expandedDept, setExpandedDept] = useState<Department | null>(null);
  const [expandedHod, setExpandedHod] = useState<string | null>(null);
  const [showServiceCosts, setShowServiceCosts] = useState<User | null>(null);
  const [hodServiceCosts, setHodServiceCosts] = useState<ServiceCost[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [showAddServiceCost, setShowAddServiceCost] = useState(false);
  const [showEditServiceCost, setShowEditServiceCost] = useState<ServiceCost | null>(null);
  const [serviceCostForm, setServiceCostForm] = useState({ batchId: '', costPerPiece: '', pieces: '', size: '' });
  const [editCostPerPiece, setEditCostPerPiece] = useState('');

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    username: '',
    password: '',
    firstName: '',
    role: 'user' as 'hod' | 'user',
    department: 'store' as Department,
    phone: '',
    profilePicture: '' as string,
    openingBalance: '',
  });

  const isAdmin = currentUser?.role === 'admin';
  const isHod = currentUser?.role === 'hod';

  useEffect(() => {
    loadUsers();
    getActiveDepartments().then(setDepartments);
  }, []);

  const loadUsers = async () => {
    if (!currentUser) return;
    if (isAdmin) {
      setUsers(await getActiveUsers());
    } else if (isHod) {
      setUsers(await getUsersByCreator(currentUser.id));
    }
  };

  const handleImageFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setError('Image too large (max 5 MB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => setForm(f => ({ ...f, profilePicture: ev.target?.result as string }));
    reader.readAsDataURL(file);
  };

  const handleCreate = async () => {
    setError('');
    if (!form.firstName) {
      setError('Name is required');
      return;
    }
    if (form.role !== 'hod' && (!form.username || !form.password)) {
      setError('Username and password are required');
      return;
    }
    const openingBal = form.role === 'hod' && form.openingBalance.trim()
      ? parseFloat(form.openingBalance) : undefined;
    if (openingBal !== undefined && !Number.isFinite(openingBal)) {
      setError('Opening balance must be a valid number'); return;
    }
    try {
      await createUser(
        form.username, form.password, form.firstName,
        form.role, isHod ? currentUser!.department : form.department,
        currentUser!.id, currentUser!.firstName, form.phone,
        form.role === 'hod' ? form.profilePicture || undefined : undefined,
        openingBal,
      );
      setShowCreate(false);
      setForm({ username: '', password: '', firstName: '', role: 'user', department: 'store', phone: '', profilePicture: '', openingBalance: '' });
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
    if ((showDelete.role === 'hod' || showDelete.role === 'admin') && !deleteAdminPassword) {
      setError('Admin password is required to delete an HOD'); return;
    }
    try {
      await deleteUser(showDelete.id, deleteReason, currentUser!.id, currentUser!.firstName, deleteAdminPassword);
      setShowDelete(null);
      setDeleteReason('');
      setDeleteAdminPassword('');
      setError('');
      loadUsers();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const openServiceCosts = async (hod: User) => {
    setShowServiceCosts(hod);
    setError('');
    const [costs, b] = await Promise.all([
      getServiceCosts({ department: hod.department }),
      getActiveBatches(),
    ]);
    setHodServiceCosts(costs.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    setBatches(b);
  };

  const handleAddServiceCost = async () => {
    if (!currentUser || !showServiceCosts) return;
    setError('');
    const cost = parseFloat(serviceCostForm.costPerPiece);
    const pieces = parseInt(serviceCostForm.pieces);
    if (!serviceCostForm.batchId) { setError('Select a batch'); return; }
    if (!Number.isFinite(cost) || cost <= 0) { setError('Cost per piece must be positive'); return; }
    if (!Number.isFinite(pieces) || pieces <= 0) { setError('Number of pieces must be positive'); return; }
    try {
      await recordServiceCost(
        serviceCostForm.batchId, showServiceCosts.department, cost, pieces,
        currentUser.id, currentUser.firstName,
        serviceCostForm.size || undefined, undefined,
        showServiceCosts.id,
      );
      setShowAddServiceCost(false);
      setServiceCostForm({ batchId: '', costPerPiece: '', pieces: '', size: '' });
      openServiceCosts(showServiceCosts);
    } catch (e: any) { setError(e.message); }
  };

  const handleEditServiceCost = async () => {
    if (!currentUser || !showEditServiceCost || !showServiceCosts) return;
    setError('');
    const cost = parseFloat(editCostPerPiece);
    if (!Number.isFinite(cost) || cost <= 0) { setError('Cost per piece must be positive'); return; }
    try {
      await updateServiceCost(showEditServiceCost.id, cost, currentUser.id, currentUser.firstName);
      setShowEditServiceCost(null);
      setEditCostPerPiece('');
      openServiceCosts(showServiceCosts);
    } catch (e: any) { setError(e.message); }
  };

  const allUsers = users.filter(u => u.id !== currentUser?.id);
  const hodsByDept = (dept: Department) => allUsers.filter(u => u.department === dept && u.role === 'hod');
  const usersByHod = (hodId: string) => allUsers.filter(u => u.createdBy === hodId && u.role === 'user');

  const renderDepartmentView = () => (
    <div className="space-y-3">
      {departments.map(d => {
        const dept = d.key;
        const hods = hodsByDept(dept);
        const isExpanded = expandedDept === dept;
        return (
          <div key={dept} className="bg-white/60 backdrop-blur-sm rounded-2xl overflow-hidden">
            <button
              onClick={() => setExpandedDept(isExpanded ? null : dept)}
              className="w-full flex items-center justify-between p-4 hover:bg-white/80 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-gold-300">
                  <Users size={18} className="text-dark-800" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm text-gray-900">{d.label}</p>
                  <p className="text-[11px] text-gray-400">{hods.length} HODs{d.custom ? ' · custom' : ''}</p>
                </div>
              </div>
              <ChevronRight size={18} className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            </button>

            {isExpanded && (
              <div className="border-t border-gray-100 p-5">
                {hods.length === 0 ? (
                  <p className="text-gray-400 text-sm">No HODs in this department</p>
                ) : (
                  <div className="space-y-4">
                    {hods.map(hod => {
                      const hodUsers = usersByHod(hod.id);
                      return (
                        <div key={hod.id} className="border border-gray-100 rounded-xl overflow-hidden">
                          <div className="flex items-center justify-between p-3 bg-white/40">
                            <div className="flex items-center gap-3">
                              {hod.profilePicture ? (
                                <img src={hod.profilePicture} alt={hod.firstName} className="w-10 h-10 rounded-full object-cover" />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gold-300 flex items-center justify-center text-xs font-bold text-dark-800">
                                  {hod.firstName[0]}
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-sm text-gray-900">{hod.firstName} <span className="text-[11px] text-blue-500">(HOD)</span></p>
                                {isAdmin && (
                                  <p className="text-[11px] text-gray-400">
                                    Username: {hod.username}
                                    {hod.phone && ` · Phone: ${hod.phone}`}
                                    {hod.openingBalance !== undefined && hod.openingBalance !== 0 && ` · Opening: ${formatCurrency(hod.openingBalance)}`}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {isAdmin && (
                                <button
                                  onClick={() => openServiceCosts(hod)}
                                  className="p-2 rounded-xl hover:bg-emerald-50 text-emerald-500 cursor-pointer"
                                  title="Service Costs"
                                >
                                  <DollarSign size={16} />
                                </button>
                              )}
                              <button
                                onClick={() => navigate(`/statistics/user/${hod.id}`)}
                                className="p-2 rounded-xl hover:bg-blue-50 text-blue-500 cursor-pointer"
                                title="Inspect HOD"
                              >
                                <BarChart3 size={16} />
                              </button>
                              <button
                                onClick={() => setExpandedHod(expandedHod === hod.id ? null : hod.id)}
                                className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 cursor-pointer"
                                title="View Users"
                              >
                                <Eye size={16} />
                              </button>
                              {isAdmin && (
                                <button
                                  onClick={() => setShowDelete(hod)}
                                  className="p-2 rounded-xl hover:bg-red-50 text-red-400 cursor-pointer"
                                  title="Delete"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </div>

                          {expandedHod === hod.id && (
                            <div className="p-4 border-t border-gray-100">
                              {hodUsers.length === 0 ? (
                                <p className="text-gray-400 text-[11px]">No users under this HOD</p>
                              ) : (
                                <div className="space-y-2">
                                  {hodUsers.map(user => (
                                    <div key={user.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/60">
                                      <div>
                                        <p className="text-sm font-medium text-gray-900">{user.firstName}</p>
                                        {isAdmin && (
                                          <p className="text-[11px] text-gray-400">Username: {user.username}</p>
                                        )}
                                      </div>
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => navigate(`/statistics/user/${user.id}`)}
                                          className="p-1.5 rounded-xl hover:bg-blue-50 text-blue-500 cursor-pointer"
                                          title="Inspect User"
                                        >
                                          <BarChart3 size={14} />
                                        </button>
                                        <button
                                          onClick={() => setShowDelete(user)}
                                          className="p-1.5 rounded-xl hover:bg-red-50 text-red-400 cursor-pointer"
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
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">My Team Members</h2>
        {myUsers.length === 0 ? (
          <p className="text-gray-400 text-sm">No users created yet</p>
        ) : (
          <div className="space-y-3">
            {myUsers.map(user => (
              <div key={user.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-white/40">
                <div>
                  <p className="font-medium text-sm text-gray-900">{user.firstName}</p>
                  <p className="text-[11px] text-gray-400">Username: {user.username} · Role: {user.role}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/statistics/user/${user.id}`)}
                    className="p-1.5 rounded-xl hover:bg-blue-50 text-blue-500 cursor-pointer"
                    title="Inspect User"
                  >
                    <BarChart3 size={16} />
                  </button>
                  <button
                    onClick={() => setShowDelete(user)}
                    className="p-1.5 rounded-xl hover:bg-red-50 text-red-400 cursor-pointer"
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
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-light text-gray-900">User Management</h1>
          <p className="text-sm text-gray-400 mt-1">Create and manage user accounts</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-[#2a2a2a] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#1a1a1a] cursor-pointer"
        >
          <UserPlus size={16} /> Create User
        </button>
      </div>

      {isAdmin ? renderDepartmentView() : renderHodView()}

      {/* Create User Modal */}
      <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); setError(''); }} title="Create New User">
        <div className="space-y-4">
          {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
            <input
              type="text"
              value={form.firstName}
              onChange={e => setForm({ ...form, firstName: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              placeholder="Enter first name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username {form.role === 'hod' && <span className="text-gray-400 font-normal">(optional)</span>}</label>
            <input
              type="text"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              placeholder="Enter username"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password {form.role === 'hod' && <span className="text-gray-400 font-normal">(optional)</span>}</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              placeholder="Enter password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={form.role}
              onChange={e => setForm({ ...form, role: e.target.value as 'hod' | 'user' })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
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
                onChange={e => setForm({ ...form, department: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              >
                {departments.map(d => (
                  <option key={d.key} value={d.key}>{d.label}</option>
                ))}
              </select>
            </div>
          )}
          {form.role === 'hod' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
                  placeholder="Enter phone number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Profile Picture</label>
                <div className="flex items-center gap-3">
                  {form.profilePicture ? (
                    <div className="relative">
                      <img src={form.profilePicture} alt="Profile" className="w-16 h-16 rounded-xl object-cover" />
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, profilePicture: '' })}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center text-gray-300">
                      <ImageIcon size={22} />
                    </div>
                  )}
                  <div className="flex flex-col gap-2 flex-1">
                    <input
                      ref={cameraRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f); e.target.value = ''; }}
                    />
                    <input
                      ref={galleryRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f); e.target.value = ''; }}
                    />
                    <button
                      type="button"
                      onClick={() => cameraRef.current?.click()}
                      className="flex items-center justify-center gap-2 px-3 py-2 border border-gray-200 rounded-xl text-xs hover:bg-white/60 cursor-pointer"
                    >
                      <Camera size={14} /> Take Photo
                    </button>
                    <button
                      type="button"
                      onClick={() => galleryRef.current?.click()}
                      className="flex items-center justify-center gap-2 px-3 py-2 border border-gray-200 rounded-xl text-xs hover:bg-white/60 cursor-pointer"
                    >
                      <ImageIcon size={14} /> Choose from Gallery
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Opening Balance (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.openingBalance}
                  onChange={e => setForm({ ...form, openingBalance: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
                  placeholder="e.g. 5000 (HOD owes you) or -2000 (you owe HOD)"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Positive = HOD owes admin. Negative = admin owes HOD. Leave blank for zero.
                </p>
              </div>
            </>
          )}

          <button
            onClick={handleCreate}
            className="w-full bg-[#2a2a2a] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#1a1a1a] cursor-pointer"
          >
            Create User
          </button>
        </div>
      </Modal>

      {/* Service Costs Modal */}
      <Modal
        isOpen={!!showServiceCosts}
        onClose={() => { setShowServiceCosts(null); setError(''); }}
        title={`Service Costs — ${showServiceCosts?.firstName || ''} (${DEPARTMENT_LABELS[showServiceCosts?.department || ''] || showServiceCosts?.department || ''})`}
        maxWidth="36rem"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-gray-400">{hodServiceCosts.length} cost entries</p>
            <button
              onClick={() => { setShowAddServiceCost(true); setError(''); setServiceCostForm({ batchId: '', costPerPiece: '', pieces: '', size: '' }); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-[11px] font-medium rounded-full hover:bg-emerald-700 cursor-pointer"
            >
              <DollarSign size={12} /> Add Service Cost
            </button>
          </div>

          {hodServiceCosts.length === 0 ? (
            <p className="text-center py-6 text-gray-400 text-sm">No service costs recorded</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left">
                    <th className="pb-2 text-[11px] text-gray-500 uppercase font-semibold">Batch</th>
                    <th className="pb-2 text-[11px] text-gray-500 uppercase font-semibold text-right">Cost/Piece</th>
                    <th className="pb-2 text-[11px] text-gray-500 uppercase font-semibold text-right">Pieces</th>
                    <th className="pb-2 text-[11px] text-gray-500 uppercase font-semibold text-right">Total</th>
                    <th className="pb-2 text-[11px] text-gray-500 uppercase font-semibold text-right">Date</th>
                    <th className="pb-2 text-[11px] text-gray-500 uppercase font-semibold text-center"></th>
                  </tr>
                </thead>
                <tbody>
                  {hodServiceCosts.map(sc => {
                    const batch = batches.find(b => b.id === sc.batchId);
                    return (
                      <tr key={sc.id} className="border-b border-gray-50">
                        <td className="py-2 text-gray-900">
                          {batch?.batchNumber || 'N/A'}
                          {sc.size && <span className="text-[10px] ml-1 text-gray-400">({sc.size})</span>}
                        </td>
                        <td className="py-2 text-right text-gray-900">{formatCurrency(sc.costPerPiece)}</td>
                        <td className="py-2 text-right text-gray-900">{sc.totalPieces}</td>
                        <td className="py-2 text-right font-semibold text-emerald-600">{formatCurrency(sc.totalCost)}</td>
                        <td className="py-2 text-right text-[11px] text-gray-400 whitespace-nowrap">{new Date(sc.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                        <td className="py-2 text-center">
                          <button
                            onClick={() => { setShowEditServiceCost(sc); setEditCostPerPiece(String(sc.costPerPiece)); setError(''); }}
                            className="p-1 text-blue-500 hover:text-blue-700 cursor-pointer"
                            title="Edit"
                          >
                            <Pencil size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>

      {/* Add Service Cost Modal */}
      <Modal isOpen={showAddServiceCost} onClose={() => { setShowAddServiceCost(false); setError(''); }} title={`Add Service Cost — ${showServiceCosts?.firstName || ''}`}>
        <div className="space-y-4">
          {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Batch</label>
            <select
              value={serviceCostForm.batchId}
              onChange={e => setServiceCostForm({ ...serviceCostForm, batchId: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
            >
              <option value="">Select batch</option>
              {batches.map(b => (
                <option key={b.id} value={b.id}>{b.batchNumber}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cost per Piece (INR)</label>
            <input
              type="number"
              min="0.01" step="0.01"
              value={serviceCostForm.costPerPiece}
              onChange={e => setServiceCostForm({ ...serviceCostForm, costPerPiece: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Number of Pieces</label>
            <input
              type="number"
              min="1"
              value={serviceCostForm.pieces}
              onChange={e => setServiceCostForm({ ...serviceCostForm, pieces: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Size <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              type="text"
              value={serviceCostForm.size}
              onChange={e => setServiceCostForm({ ...serviceCostForm, size: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              placeholder="e.g. Large, 12 inch"
            />
          </div>
          {serviceCostForm.costPerPiece && serviceCostForm.pieces && (
            <p className="text-sm font-medium text-gray-900">
              Total: {formatCurrency(parseFloat(serviceCostForm.costPerPiece) * parseInt(serviceCostForm.pieces))}
            </p>
          )}
          <button onClick={handleAddServiceCost} className="w-full bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-700 cursor-pointer">
            Record Service Cost
          </button>
        </div>
      </Modal>

      {/* Edit Service Cost Modal */}
      <Modal isOpen={!!showEditServiceCost} onClose={() => { setShowEditServiceCost(null); setError(''); }} title="Edit Service Cost">
        <div className="space-y-4">
          {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="p-3 bg-gray-50 rounded-xl text-[11px] text-gray-600">
            <p>Pieces: <strong>{showEditServiceCost?.totalPieces}</strong></p>
            <p>Current cost/piece: <strong>{showEditServiceCost ? formatCurrency(showEditServiceCost.costPerPiece) : ''}</strong></p>
            <p>Current total: <strong>{showEditServiceCost ? formatCurrency(showEditServiceCost.totalCost) : ''}</strong></p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Cost per Piece (INR)</label>
            <input
              type="number"
              min="0.01" step="0.01"
              value={editCostPerPiece}
              onChange={e => setEditCostPerPiece(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
            />
          </div>
          {editCostPerPiece && showEditServiceCost && (
            <p className="text-sm font-medium text-gray-900">
              New total: {formatCurrency(parseFloat(editCostPerPiece) * showEditServiceCost.totalPieces)}
            </p>
          )}
          <button onClick={handleEditServiceCost} className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 cursor-pointer">
            Update Cost
          </button>
        </div>
      </Modal>

      {/* Delete User Modal */}
      <Modal
        isOpen={!!showDelete}
        onClose={() => { setShowDelete(null); setDeleteReason(''); setDeleteAdminPassword(''); setError(''); }}
        title="Delete User"
        maxWidth="28rem"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete <strong>{showDelete?.firstName}</strong>?
          </p>
          {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason for deletion (required)</label>
            <textarea
              value={deleteReason}
              onChange={e => setDeleteReason(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              rows={3}
              placeholder="Enter reason for deletion"
            />
          </div>
          {(showDelete?.role === 'hod' || showDelete?.role === 'admin') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Admin Password (required)</label>
              <input
                type="password"
                value={deleteAdminPassword}
                onChange={e => setDeleteAdminPassword(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
                placeholder="Enter admin password to confirm"
              />
            </div>
          )}
          <div className="flex gap-3 justify-end mt-4">
            <button
              onClick={() => { setShowDelete(null); setDeleteReason(''); setDeleteAdminPassword(''); setError(''); }}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 text-sm bg-red-500 text-white rounded-xl hover:bg-red-600 cursor-pointer"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
