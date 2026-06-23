import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../../store';
import type { Department, User } from '../../types';
import { DEPARTMENT_LABELS } from '../../types';
import { getPeriodStatistics, getActiveUsers, getUsersByCreator } from '../../database/operations';
import { formatCurrency } from '../../utils/helpers';
import StatCard from '../common/StatCard';
import { PageHeader, PillTabs, WidgetCard, Accordion } from '../common/Widgets';
import { BarChart3, Package, CheckCircle, XCircle, Users } from 'lucide-react';

const DEPARTMENTS: Department[] = ['store', 'welding', 'pressing', 'buffing', 'packaging', 'dispatch'];

export default function Statistics() {
  const { currentUser } = useSelector((s: RootState) => s.auth);
  const navigate = useNavigate();
  const [period, setPeriod] = useState('month');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);

  const isAdmin = currentUser?.role === 'admin';
  const isHod = currentUser?.role === 'hod';

  useEffect(() => {
    loadStats();
    loadUsers();
  }, [period]);

  const loadStats = async () => {
    setStats(await getPeriodStatistics(period as any));
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

  const periodTabs = [
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
    { key: 'year', label: 'Year' },
    { key: 'all', label: 'All Time' },
  ];

  return (
    <div className="space-y-10">
      <PageHeader title="Statistics" subtitle="Performance and production reports" />

      <PillTabs tabs={periodTabs} active={period} onChange={setPeriod} />

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Batches" value={stats.batchCount} icon={<Package size={20} />} />
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
        <WidgetCard title="Consumer Goods Cost">
          <p className="text-2xl font-bold" style={{ color: '#2196f3' }}>{formatCurrency(stats.totalConsumerCost)}</p>
        </WidgetCard>
        <WidgetCard title="Service Cost">
          <p className="text-2xl font-bold" style={{ color: '#4caf50' }}>{formatCurrency(stats.totalServiceCost)}</p>
        </WidgetCard>
        <WidgetCard title="Total Cost">
          <p className="text-2xl font-bold text-[#c9a227]">{formatCurrency(stats.totalConsumerCost + stats.totalServiceCost)}</p>
        </WidgetCard>
      </div>

      {/* User Statistics - Department Hierarchy */}
      {(isAdmin || isHod) && (
        <WidgetCard title={isAdmin ? 'Department Statistics' : 'Team Statistics'}>
          {isAdmin ? (
            <div className="space-y-3">
              {DEPARTMENTS.map(dept => {
                const deptHods = hodsByDept(dept);
                return (
                  <Accordion
                    key={dept}
                    title={DEPARTMENT_LABELS[dept]}
                    subtitle={`${deptHods.length} HODs`}
                    icon={<Users size={14} className="text-[#c9a227]" />}
                  >
                    <div className="p-3 space-y-2">
                      {deptHods.length === 0 ? (
                        <p className="text-gray-400 text-xs p-2">No HODs</p>
                      ) : deptHods.map(hod => {
                        const hodUsers = usersByHod(hod.id);
                        return (
                          <Accordion
                            key={hod.id}
                            title={`${hod.firstName} (HOD)`}
                            subtitle={`${hodUsers.length} users`}
                          >
                            <div className="p-3 space-y-1">
                              <button
                                onClick={() => navigate(`/statistics/user/${hod.id}`)}
                                className="text-xs px-3 py-1 rounded-2xl bg-blue-50 text-blue-600 hover:bg-blue-100 mb-2"
                              >
                                <BarChart3 size={12} className="inline mr-1" />HOD Report
                              </button>
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
                          </Accordion>
                        );
                      })}
                    </div>
                  </Accordion>
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
        </WidgetCard>
      )}
    </div>
  );
}
