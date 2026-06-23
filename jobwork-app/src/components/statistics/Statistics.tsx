import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../../store';
import type { Department, User } from '../../types';
import { DEPARTMENT_LABELS } from '../../types';
import { getPeriodStatistics, getActiveUsers, getUsersByCreator } from '../../database/operations';
import { formatCurrency } from '../../utils/helpers';
import { BarChart3, Package, CheckCircle, XCircle, Users, ChevronRight } from 'lucide-react';

const DEPARTMENTS: Department[] = ['store', 'welding', 'pressing', 'buffing', 'packaging', 'dispatch'];

export default function Statistics() {
  const { currentUser } = useSelector((s: RootState) => s.auth);
  const navigate = useNavigate();
  const [period, setPeriod] = useState<'week' | 'month' | 'year' | 'all'>('month');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [expandedDept, setExpandedDept] = useState<Department | null>(null);
  const [expandedHod, setExpandedHod] = useState<string | null>(null);

  const isAdmin = currentUser?.role === 'admin';
  const isHod = currentUser?.role === 'hod';

  useEffect(() => {
    loadStats();
    loadUsers();
  }, [period]);

  const loadStats = async () => {
    setStats(await getPeriodStatistics(period));
  };

  const loadUsers = async () => {
    if (!currentUser) return;
    if (isAdmin) {
      setUsers(await getActiveUsers());
    } else if (isHod) {
      setUsers(await getUsersByCreator(currentUser.id));
    }
  };

  const hodsByDept = (dept: Department) =>
    users.filter(u => u.department === dept && u.role === 'hod' && u.id !== currentUser?.id);
  const usersByHod = (hodId: string) =>
    users.filter(u => u.createdBy === hodId && u.role === 'user');

  if (!stats) return <div className="flex items-center justify-center h-64"><p className="text-gray-400">Loading...</p></div>;

  const acceptRate = stats.totalPieces > 0 ? ((stats.totalAccepted / stats.totalPieces) * 100).toFixed(1) : '0';
  const rejectRate = stats.totalPieces > 0 ? ((stats.totalRejected / stats.totalPieces) * 100).toFixed(1) : '0';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-light text-gray-900">Statistics</h1>
          <p className="text-sm text-gray-400 mt-1">Performance and production reports</p>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2 mb-6">
        {(['week', 'month', 'year', 'all'] as const).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 text-sm rounded-xl cursor-pointer ${
              period === p ? 'bg-[#2a2a2a] text-white' : 'bg-white/60 text-gray-600'
            }`}
          >
            {p === 'all' ? 'All Time' : p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gold-300 flex items-center justify-center shrink-0"><Package size={20} className="text-dark-800" /></div>
          <div>
            <p className="text-2xl font-light text-gray-900">{stats.batchCount}</p>
            <p className="text-sm text-gray-600">Total Batches</p>
          </div>
        </div>
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-200 flex items-center justify-center shrink-0"><BarChart3 size={20} className="text-dark-800" /></div>
          <div>
            <p className="text-2xl font-light text-gray-900">{stats.totalPieces}</p>
            <p className="text-sm text-gray-600">Total Pieces</p>
          </div>
        </div>
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-200 flex items-center justify-center shrink-0"><CheckCircle size={20} className="text-dark-800" /></div>
          <div>
            <p className="text-2xl font-light text-emerald-600">{acceptRate}%</p>
            <p className="text-sm text-gray-600">Acceptance Rate</p>
            <p className="text-[11px] text-gray-400">{stats.totalAccepted} accepted</p>
          </div>
        </div>
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-200 flex items-center justify-center shrink-0"><XCircle size={20} className="text-dark-800" /></div>
          <div>
            <p className="text-2xl font-light text-red-500">{rejectRate}%</p>
            <p className="text-sm text-gray-600">Rejection Rate</p>
            <p className="text-[11px] text-gray-400">{stats.totalRejected} rejected</p>
          </div>
        </div>
      </div>

      {/* Cost Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5">
          <p className="text-[11px] text-gray-400 uppercase font-medium">Consumer Goods Cost</p>
          <p className="text-2xl font-light text-blue-600 mt-1">{formatCurrency(stats.totalConsumerCost)}</p>
        </div>
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5">
          <p className="text-[11px] text-gray-400 uppercase font-medium">Service Cost</p>
          <p className="text-2xl font-light text-emerald-600 mt-1">{formatCurrency(stats.totalServiceCost)}</p>
        </div>
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5">
          <p className="text-[11px] text-gray-400 uppercase font-medium">Total Cost</p>
          <p className="text-2xl font-light text-gray-900 mt-1">{formatCurrency(stats.totalConsumerCost + stats.totalServiceCost)}</p>
        </div>
      </div>

      {/* User Statistics - Department Hierarchy */}
      {(isAdmin || isHod) && (
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            {isAdmin ? 'Department Statistics' : 'Team Statistics'}
          </h2>

          {isAdmin ? (
            <div className="space-y-3">
              {DEPARTMENTS.map(dept => {
                const deptHods = hodsByDept(dept);
                const isExpanded = expandedDept === dept;
                return (
                  <div key={dept} className="border border-gray-100 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedDept(isExpanded ? null : dept)}
                      className="w-full flex items-center justify-between p-4 hover:bg-white/40 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-gold-300">
                          <Users size={14} className="text-dark-800" />
                        </div>
                        <span className="font-medium text-sm text-gray-900">{DEPARTMENT_LABELS[dept]}</span>
                        <span className="text-[11px] text-gray-400">({deptHods.length} HODs)</span>
                      </div>
                      <ChevronRight size={16} className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </button>
                    {isExpanded && (
                      <div className="border-t border-gray-100 p-3 space-y-2">
                        {deptHods.length === 0 ? (
                          <p className="text-gray-400 text-[11px] p-2">No HODs</p>
                        ) : deptHods.map(hod => {
                          const hodUsers = usersByHod(hod.id);
                          return (
                            <div key={hod.id} className="border border-gray-100 rounded-xl">
                              <div className="flex items-center justify-between p-3">
                                <span className="font-medium text-sm text-gray-900">{hod.firstName} (HOD)</span>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => navigate(`/statistics/user/${hod.id}`)}
                                    className="text-[11px] px-3 py-1 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer"
                                  >
                                    <BarChart3 size={12} className="inline mr-1" />Report
                                  </button>
                                  <button
                                    onClick={() => setExpandedHod(expandedHod === hod.id ? null : hod.id)}
                                    className="text-[11px] px-3 py-1 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer"
                                  >
                                    Users ({hodUsers.length})
                                  </button>
                                </div>
                              </div>
                              {expandedHod === hod.id && (
                                <div className="border-t border-gray-100 p-3 space-y-1">
                                  {hodUsers.length === 0 ? (
                                    <p className="text-gray-400 text-[11px]">No users</p>
                                  ) : hodUsers.map(u => (
                                    <div key={u.id} className="flex items-center justify-between p-2 hover:bg-white/40 rounded-xl">
                                      <span className="text-sm text-gray-900">{u.firstName}</span>
                                      <button
                                        onClick={() => navigate(`/statistics/user/${u.id}`)}
                                        className="text-[11px] px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer"
                                      >
                                        <BarChart3 size={12} className="inline mr-1" />Report
                                      </button>
                                    </div>
                                  ))}
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
          ) : (
            <div className="space-y-3">
              {users.map(u => (
                <div key={u.id} className="flex items-center justify-between p-3 hover:bg-white/40 rounded-xl border border-gray-100">
                  <span className="text-sm font-medium text-gray-900">{u.firstName}</span>
                  <button
                    onClick={() => navigate(`/statistics/user/${u.id}`)}
                    className="text-[11px] px-3 py-1 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer"
                  >
                    <BarChart3 size={12} className="inline mr-1" />Report
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
