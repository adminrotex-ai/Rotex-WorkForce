import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import type { User } from '../../types';
import { DEPARTMENT_LABELS } from '../../types';
import { getUserStatistics, getUsersByCreator, getUserById } from '../../database/operations';
import { formatCurrency, formatDate } from '../../utils/helpers';
import StatCard from '../common/StatCard';
import { PageHeader, WidgetCard, Accordion } from '../common/Widgets';
import { ArrowLeft, CheckCircle, XCircle, Package, BarChart3 } from 'lucide-react';

export default function UserStatReport() {
  const { userId } = useParams<{ userId: string }>();
  const { currentUser } = useSelector((s: RootState) => s.auth);
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [user, setUser] = useState<User | null>(null);
  const [subUsers, setSubUsers] = useState<User[]>([]);

  useEffect(() => {
    if (userId) loadData();
  }, [userId]);

  const loadData = async () => {
    if (!userId) return;
    const [s, u, subs] = await Promise.all([
      getUserStatistics(userId),
      getUserById(userId),
      getUsersByCreator(userId),
    ]);
    setStats(s);
    setUser(u || null);
    setSubUsers(subs);
  };

  if (!stats || !user) return <div className="flex items-center justify-center h-64"><p className="text-gray-400">Loading...</p></div>;

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="space-y-10">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 rounded-2xl hover:bg-gray-100">
          <ArrowLeft size={20} />
        </button>
        <PageHeader
          title={`${user.firstName}'s Report`}
          subtitle={`${user.role.toUpperCase()} - ${DEPARTMENT_LABELS[user.department]}${isAdmin ? ` | Username: ${user.username}` : ''}`}
        />
      </div>

      {/* Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Pieces" value={stats.totalPieces} icon={<Package size={20} />} />
        <StatCard title="Accepted" value={stats.totalAccepted} subtitle={`${stats.acceptanceRate.toFixed(1)}% rate`} icon={<CheckCircle size={20} style={{ color: '#4caf50' }} />} color="#4caf50" />
        <StatCard title="Rejected" value={stats.totalRejected} subtitle={`${stats.rejectionRate.toFixed(1)}% rate`} icon={<XCircle size={20} style={{ color: '#f44336' }} />} color="#f44336" />
        <StatCard title="Batches Worked" value={stats.batchCount} icon={<Package size={20} style={{ color: '#2196f3' }} />} color="#2196f3" />
      </div>

      {/* Cost Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <WidgetCard title="Consumer Goods Used">
          <p className="text-2xl font-bold" style={{ color: '#ff9800' }}>{formatCurrency(stats.totalConsumerCost)}</p>
        </WidgetCard>
        <WidgetCard title="Service Cost">
          <p className="text-2xl font-bold" style={{ color: '#4caf50' }}>{formatCurrency(stats.totalServiceCost)}</p>
        </WidgetCard>
      </div>

      {/* Piece Entries */}
      {stats.pieceEntries.length > 0 && (
        <Accordion
          title="Piece Entry History"
          subtitle={`${stats.pieceEntries.length} entries`}
          icon={<Package size={16} className="text-[#c9a227]" />}
          defaultOpen
        >
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium text-right">Accepted</th>
                  <th className="pb-2 font-medium text-right">Rejected</th>
                  <th className="pb-2 font-medium text-right">Total</th>
                  <th className="pb-2 font-medium">Size</th>
                </tr>
              </thead>
              <tbody>
                {stats.pieceEntries.map((e: any) => (
                  <tr key={e.id} className="border-b border-gray-50">
                    <td className="py-2 text-xs">{formatDate(e.createdAt)}</td>
                    <td className="py-2 text-right text-green-600">{e.acceptedPieces}</td>
                    <td className="py-2 text-right text-red-500">{e.rejectedPieces}</td>
                    <td className="py-2 text-right font-medium">{e.totalPieces}</td>
                    <td className="py-2">{e.size || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Accordion>
      )}

      {/* Consumer Goods Usage */}
      {stats.consumerUsages.length > 0 && (
        <Accordion
          title="Consumer Goods Usage"
          subtitle={`${stats.consumerUsages.length} entries`}
          icon={<Package size={16} className="text-orange-500" />}
        >
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Department</th>
                  <th className="pb-2 font-medium text-right">Quantity</th>
                  <th className="pb-2 font-medium text-right">Price/Unit</th>
                  <th className="pb-2 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {stats.consumerUsages.map((u: any) => (
                  <tr key={u.id} className="border-b border-gray-50">
                    <td className="py-2 text-xs">{formatDate(u.createdAt)}</td>
                    <td className="py-2 capitalize">{u.department}</td>
                    <td className="py-2 text-right">{u.quantity}</td>
                    <td className="py-2 text-right">{formatCurrency(u.pricePerUnit)}</td>
                    <td className="py-2 text-right font-medium">{formatCurrency(u.totalCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Accordion>
      )}

      {/* Service Costs */}
      {stats.serviceCosts.length > 0 && (
        <Accordion
          title="Service Costs"
          subtitle={`${stats.serviceCosts.length} entries`}
          icon={<BarChart3 size={16} className="text-green-500" />}
        >
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Department</th>
                  <th className="pb-2 font-medium text-right">Cost/Piece</th>
                  <th className="pb-2 font-medium text-right">Pieces</th>
                  <th className="pb-2 font-medium text-right">Total</th>
                  <th className="pb-2 font-medium">Size</th>
                </tr>
              </thead>
              <tbody>
                {stats.serviceCosts.map((s: any) => (
                  <tr key={s.id} className="border-b border-gray-50">
                    <td className="py-2 text-xs">{formatDate(s.createdAt)}</td>
                    <td className="py-2 capitalize">{s.department}</td>
                    <td className="py-2 text-right">{formatCurrency(s.costPerPiece)}</td>
                    <td className="py-2 text-right">{s.totalPieces}</td>
                    <td className="py-2 text-right font-medium">{formatCurrency(s.totalCost)}</td>
                    <td className="py-2">{s.size || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Accordion>
      )}

      {/* Sub-Users (for HODs) */}
      {user.role === 'hod' && subUsers.length > 0 && (
        <WidgetCard title="Team Members">
          <div className="space-y-3">
            {subUsers.map(u => (
              <div key={u.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-2xl border border-gray-100">
                <div>
                  <p className="font-medium text-sm">{u.firstName}</p>
                  <p className="text-xs text-gray-400">{u.role}</p>
                </div>
                <button
                  onClick={() => navigate(`/statistics/user/${u.id}`)}
                  className="text-xs px-3 py-1 rounded-2xl bg-blue-50 text-blue-600 hover:bg-blue-100"
                >
                  <BarChart3 size={12} className="inline mr-1" />View Report
                </button>
              </div>
            ))}
          </div>
        </WidgetCard>
      )}
    </div>
  );
}
