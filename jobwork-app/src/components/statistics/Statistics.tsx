import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../../store';
import type { Department, User } from '../../types';
import { DEPARTMENT_LABELS } from '../../types';
import { getPeriodStatistics, getActiveUsers, getUsersByCreator } from '../../database/operations';
import { formatCurrency } from '../../utils/helpers';
import StatCard from '../common/StatCard';
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
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" >Statistics</h1>
          <p className="text-gray-500 text-sm">Performance and production reports</p>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2">
        {(['week', 'month', 'year', 'all'] as const).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-2xl text-sm font-medium transition-colors ${
              period === p ? 'text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
            style={period === p ? { backgroundColor: '#1a237e' } : {}}
          >
            {p === 'all' ? 'All Time' : p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Batches" value={stats.batchCount} icon={<Package size={20}  />} />
        <StatCard title="Total Pieces" value={stats.totalPieces} icon={<BarChart3 size={20} style={{ color: '#2196f3' }} />} color="#2196f3" />
        <StatCard
          title="Acceptance Rate"
          value={`${acceptRate}%`}
          subtitle={`${stats.totalAccepted} accepted`}
          icon={<CheckCircle size={20} style={{ color: '#4caf50' }} />}
          color="#4caf50"
        />
        <StatCard
          title="Rejection Rate"
          value={`${rejectRate}%`}
          subtitle={`${stats.totalRejected} rejected`}
          icon={<XCircle size={20} style={{ color: '#f44336' }} />}
          color="#f44336"
        />
      </div>

      {/* Cost Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <p className="text-xs text-gray-500 uppercase font-medium">Consumer Goods Cost</p>
          <p className="text-2xl font-bold mt-1" style={{ color: '#2196f3' }}>{formatCurrency(stats.totalConsumerCost)}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <p className="text-xs text-gray-500 uppercase font-medium">Service Cost</p>
          <p className="text-2xl font-bold mt-1" style={{ color: '#4caf50' }}>{formatCurrency(stats.totalServiceCost)}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <p className="text-xs text-gray-500 uppercase font-medium">Total Cost</p>
          <p className="text-2xl font-bold mt-1" >{formatCurrency(stats.totalConsumerCost + stats.totalServiceCost)}</p>
        </div>
      </div>

      {/* User Statistics - Department Hierarchy */}
      {(isAdmin || isHod) && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <h2 className="text-lg font-semibold mb-4" >
            {isAdmin ? 'Department Statistics' : 'Team Statistics'}
          </h2>

          {isAdmin ? (
            <div className="space-y-3">
              {DEPARTMENTS.map(dept => {
                const deptHods = hodsByDept(dept);
                const isExpanded = expandedDept === dept;
                return (
                  <div key={dept} className="border border-gray-100 rounded-2xl overflow-hidden">
                    <button
                      onClick={() => setExpandedDept(isExpanded ? null : dept)}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-2xl flex items-center justify-center bg-gradient-to-r from-[#1a237e] to-[#0d47a1]">
                          <Users size={14} className="text-white" />
                        </div>
                        <span className="font-medium text-sm">{DEPARTMENT_LABELS[dept]}</span>
                        <span className="text-xs text-gray-400">({deptHods.length} HODs)</span>
                      </div>
                      <ChevronRight size={16} className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </button>
                    {isExpanded && (
                      <div className="border-t border-gray-100 p-3 animate-fade-in space-y-2">
                        {deptHods.length === 0 ? (
                          <p className="text-gray-400 text-xs p-2">No HODs</p>
                        ) : deptHods.map(hod => {
                          const hodUsers = usersByHod(hod.id);
                          return (
                            <div key={hod.id} className="border border-gray-100 rounded-2xl">
                              <div className="flex items-center justify-between p-3">
                                <span className="font-medium text-sm">{hod.firstName} (HOD)</span>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => navigate(`/statistics/user/${hod.id}`)}
                                    className="text-xs px-3 py-1 rounded-2xl bg-blue-50 text-blue-600 hover:bg-blue-100"
                                  >
                                    <BarChart3 size={12} className="inline mr-1" />Report
                                  </button>
                                  <button
                                    onClick={() => setExpandedHod(expandedHod === hod.id ? null : hod.id)}
                                    className="text-xs px-3 py-1 rounded-2xl bg-gray-100 text-gray-600 hover:bg-gray-200"
                                  >
                                    Users ({hodUsers.length})
                                  </button>
                                </div>
                              </div>
                              {expandedHod === hod.id && (
                                <div className="border-t border-gray-100 p-3 animate-fade-in space-y-1">
                                  {hodUsers.length === 0 ? (
                                    <p className="text-gray-400 text-xs">No users</p>
                                  ) : hodUsers.map(u => (
                                    <div key={u.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-2xl">
                                      <span className="text-sm">{u.firstName}</span>
                                      <button
                                        onClick={() => navigate(`/statistics/user/${u.id}`)}
                                        className="text-xs px-2 py-1 rounded-2xl bg-blue-50 text-blue-600 hover:bg-blue-100"
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
                <div key={u.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-2xl border border-gray-100">
                  <span className="text-sm font-medium">{u.firstName}</span>
                  <button
                    onClick={() => navigate(`/statistics/user/${u.id}`)}
                    className="text-xs px-3 py-1 rounded-2xl bg-blue-50 text-blue-600 hover:bg-blue-100"
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
