import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import type { RootState } from '../../store';
import type { AccountingEntry, PaymentRecord, User } from '../../types';
import { db } from '../../database/db';
import { DEPARTMENT_LABELS } from '../../types';
import {
  getAllAccountingSummary, getAccountingForHod, makePayment,
  confirmPayment, getPendingPayments, getUserById,
} from '../../database/operations';
import { formatCurrency, formatDate } from '../../utils/helpers';
import Modal from '../common/Modal';
import { PageHeader, WidgetCard, Accordion } from '../common/Widgets';
import { ArrowLeft, Send, DollarSign } from 'lucide-react';

export default function Accounting() {
  const { hodId } = useParams<{ hodId: string }>();
  const { currentUser } = useSelector((s: RootState) => s.auth);

  const isAdmin = currentUser?.role === 'admin';
  const isHod = currentUser?.role === 'hod';

  if (hodId) return <HodAccountingDetail hodId={hodId} />;
  if (isAdmin) return <AdminAccounting />;
  if (isHod) return <HodAccounting />;
  return <p className="text-gray-400">Access denied</p>;
}

function AdminAccounting() {
  const { currentUser } = useSelector((s: RootState) => s.auth);
  const navigate = useNavigate();
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof getAllAccountingSummary>>>([]);
  const [pendingPayments, setPendingPayments] = useState<PaymentRecord[]>([]);
  const [showPayment, setShowPayment] = useState<{ hodId: string; hodName: string } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDesc, setPaymentDesc] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    if (!currentUser) return;
    setSummary(await getAllAccountingSummary());
    setPendingPayments(await getPendingPayments(currentUser.id));
  };

  const handleConfirmPayment = async (paymentId: string) => {
    if (!currentUser) return;
    await confirmPayment(paymentId, currentUser.id, currentUser.firstName);
    loadData();
  };

  const handleMakePayment = async () => {
    if (!showPayment || !currentUser) return;
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) { setError('Enter valid amount'); return; }
    try {
      await makePayment(currentUser.id, currentUser.firstName, showPayment.hodId, amount,
        paymentDesc || `Payment from Admin to ${showPayment.hodName}`);
      setShowPayment(null);
      setPaymentAmount('');
      setPaymentDesc('');
      loadData();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const totalOwed = summary.reduce((s, a) => s + a.hodOwesAdmin, 0);
  const totalOwing = summary.reduce((s, a) => s + a.adminOwesHod, 0);

  return (
    <div className="space-y-10">
      <PageHeader title="Accounting" subtitle="Financial overview and HOD accounts" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <WidgetCard title="Total to Collect">
          <p className="text-2xl font-bold text-green-700">{formatCurrency(totalOwed)}</p>
        </WidgetCard>
        <WidgetCard title="Total to Pay">
          <p className="text-2xl font-bold text-orange-700">{formatCurrency(totalOwing)}</p>
        </WidgetCard>
        <WidgetCard title="Net Balance">
          <p className={`text-2xl font-bold ${totalOwed - totalOwing >= 0 ? 'text-green-700' : 'text-red-600'}`}>
            {formatCurrency(totalOwed - totalOwing)}
          </p>
        </WidgetCard>
      </div>

      {/* HOD-wise breakdown */}
      <WidgetCard title="HOD Accounts" onNavigate={undefined}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-3 font-medium">HOD</th>
                <th className="pb-3 font-medium">Department</th>
                <th className="pb-3 font-medium text-right">To Collect</th>
                <th className="pb-3 font-medium text-right">To Pay</th>
                <th className="pb-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {summary.map(a => (
                <tr key={a.hodId} className="border-b border-gray-50">
                  <td className="py-3 font-medium">{a.hodName}</td>
                  <td className="py-3 text-gray-500">{DEPARTMENT_LABELS[a.department]}</td>
                  <td className="py-3 text-right text-green-600">{formatCurrency(a.hodOwesAdmin)}</td>
                  <td className="py-3 text-right text-orange-500">{formatCurrency(a.adminOwesHod)}</td>
                  <td className="py-3 text-right">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => navigate(`/accounting/${a.hodId}`)}
                        className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-100"
                      >
                        Details
                      </button>
                      <button
                        onClick={() => setShowPayment({ hodId: a.hodId, hodName: a.hodName })}
                        className="text-xs px-2 py-1 bg-green-50 text-green-600 rounded-2xl hover:bg-green-100"
                      >
                        Pay
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </WidgetCard>

      {/* Pending Payments to Confirm */}
      {pendingPayments.length > 0 && (
        <Accordion
          title="Pending Payment Confirmations"
          subtitle={`${pendingPayments.length} pending`}
          icon={<DollarSign size={16} className="text-yellow-600" />}
          defaultOpen
        >
          <div className="p-4 space-y-3">
            {pendingPayments.map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-2xl">
                <div>
                  <p className="text-sm font-medium">{formatCurrency(p.amount)}</p>
                  <p className="text-xs text-gray-500">{p.description} | {formatDate(p.createdAt)}</p>
                </div>
                {p.payeeId === currentUser?.id && (
                  <button
                    onClick={() => handleConfirmPayment(p.id)}
                    className="text-xs px-3 py-1 bg-green-500 text-white rounded-2xl hover:bg-green-600"
                  >
                    Confirm
                  </button>
                )}
              </div>
            ))}
          </div>
        </Accordion>
      )}

      {/* Payment Modal */}
      <Modal isOpen={!!showPayment} onClose={() => setShowPayment(null)} title={`Pay ${showPayment?.hodName}`}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (INR)</label>
            <input
              type="number"
              value={paymentAmount}
              onChange={e => setPaymentAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-2xl text-sm"
              min="0.01"
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={paymentDesc}
              onChange={e => setPaymentDesc(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-2xl text-sm"
              placeholder="Payment description"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button onClick={handleMakePayment} className="w-full py-2 text-white rounded-2xl text-sm bg-green-600">
            Make Payment
          </button>
        </div>
      </Modal>
    </div>
  );
}

function HodAccounting() {
  const { currentUser } = useSelector((s: RootState) => s.auth);
  const [accounting, setAccounting] = useState<{ hodOwesAdmin: number; adminOwesHod: number; entries: AccountingEntry[] } | null>(null);
  const [pendingPayments, setPendingPayments] = useState<PaymentRecord[]>([]);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDesc, setPaymentDesc] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { if (currentUser) loadData(); }, [currentUser]);

  const loadData = async () => {
    if (!currentUser) return;
    setAccounting(await getAccountingForHod(currentUser.id));
    setPendingPayments(await getPendingPayments(currentUser.id));
  };

  const handlePayAdmin = async () => {
    if (!currentUser) return;
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) { setError('Enter valid amount'); return; }
    const adminUser = await db.users.where('role').equals('admin').first();
    if (!adminUser) { setError('Admin not found'); return; }
    try {
      await makePayment(currentUser.id, currentUser.firstName, adminUser.id, amount,
        paymentDesc || `Payment from ${currentUser.firstName} to Admin`);
      setShowPayment(false);
      setPaymentAmount('');
      setPaymentDesc('');
      loadData();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleConfirmPayment = async (paymentId: string) => {
    if (!currentUser) return;
    await confirmPayment(paymentId, currentUser.id, currentUser.firstName);
    loadData();
  };

  if (!accounting) return null;

  return (
    <div className="space-y-10">
      <PageHeader title="My Accounting" subtitle="Your financial overview" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <WidgetCard title="To Collect from Admin">
          <div className="p-3 rounded-2xl" style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' }}>
            <p className="text-2xl font-bold text-green-700">{formatCurrency(accounting.adminOwesHod)}</p>
            <p className="text-xs text-green-500 mt-1">For service costs</p>
          </div>
        </WidgetCard>
        <WidgetCard title="To Pay Admin">
          <div className="p-3 rounded-2xl" style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)' }}>
            <p className="text-2xl font-bold text-orange-700">{formatCurrency(accounting.hodOwesAdmin)}</p>
            <p className="text-xs text-orange-500 mt-1">For consumer goods &amp; opening balance</p>
            <button
              onClick={() => setShowPayment(true)}
              className="mt-3 text-xs px-3 py-1.5 bg-orange-500 text-white rounded-2xl hover:bg-orange-600"
            >
              <Send size={12} className="inline mr-1" />Pay Admin
            </button>
          </div>
        </WidgetCard>
      </div>

      {/* Transaction History */}
      <Accordion
        title="Transactions"
        subtitle={`${accounting.entries.length} entries`}
        icon={<DollarSign size={16} className="text-[#c9a227]" />}
        defaultOpen
      >
        <div className="p-4">
          {accounting.entries.length === 0 ? (
            <p className="text-gray-400 text-sm">No transactions yet</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {accounting.entries.map(e => (
                <div key={e.id} className={`p-3 rounded-2xl text-sm ${
                  e.type === 'admin_owes_hod' ? 'bg-green-50 border border-green-100' : 'bg-orange-50 border border-orange-100'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{formatCurrency(e.amount)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      e.type === 'admin_owes_hod' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {e.type === 'admin_owes_hod' ? 'To collect from admin' : 'To pay admin'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{e.description}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(e.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </Accordion>

      {/* Pending Payments */}
      {pendingPayments.length > 0 && (
        <Accordion
          title="Pending Confirmations"
          subtitle={`${pendingPayments.length} pending`}
          icon={<DollarSign size={16} className="text-yellow-600" />}
          defaultOpen
        >
          <div className="p-4 space-y-3">
            {pendingPayments.map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-2xl">
                <div>
                  <p className="text-sm font-medium">{formatCurrency(p.amount)}</p>
                  <p className="text-xs text-gray-500">{p.description}</p>
                </div>
                {p.payeeId === currentUser?.id && (
                  <button
                    onClick={() => handleConfirmPayment(p.id)}
                    className="text-xs px-3 py-1 bg-green-500 text-white rounded-2xl"
                  >
                    Confirm
                  </button>
                )}
              </div>
            ))}
          </div>
        </Accordion>
      )}

      {/* Payment Modal */}
      <Modal isOpen={showPayment} onClose={() => setShowPayment(false)} title="Pay Admin">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (INR)</label>
            <input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-2xl text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input type="text" value={paymentDesc} onChange={e => setPaymentDesc(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-2xl text-sm" />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button onClick={handlePayAdmin} className="w-full py-2 text-white rounded-2xl text-sm bg-orange-500">
            Send Payment
          </button>
        </div>
      </Modal>
    </div>
  );
}

function HodAccountingDetail({ hodId }: { hodId: string }) {
  const navigate = useNavigate();
  const [accounting, setAccounting] = useState<{ hodOwesAdmin: number; adminOwesHod: number; entries: AccountingEntry[] } | null>(null);
  const [hod, setHod] = useState<User | null>(null);

  useEffect(() => {
    loadData();
  }, [hodId]);

  const loadData = async () => {
    const [acc, user] = await Promise.all([
      getAccountingForHod(hodId),
      getUserById(hodId),
    ]);
    setAccounting(acc);
    setHod(user || null);
  };

  if (!accounting || !hod) return null;

  return (
    <div className="space-y-10">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/accounting')} className="p-2 rounded-2xl hover:bg-gray-100">
          <ArrowLeft size={20} />
        </button>
        <PageHeader
          title={`${hod.firstName}'s Account`}
          subtitle={DEPARTMENT_LABELS[hod.department]}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <WidgetCard title="To Collect">
          <p className="text-2xl font-bold text-green-700">{formatCurrency(accounting.hodOwesAdmin)}</p>
        </WidgetCard>
        <WidgetCard title="To Pay">
          <p className="text-2xl font-bold text-orange-700">{formatCurrency(accounting.adminOwesHod)}</p>
        </WidgetCard>
      </div>

      <Accordion
        title="Transaction History"
        subtitle={`${accounting.entries.length} entries`}
        icon={<DollarSign size={16} className="text-[#c9a227]" />}
        defaultOpen
      >
        <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
          {accounting.entries.map(e => (
            <div key={e.id} className={`p-3 rounded-2xl text-sm ${
              e.type === 'hod_owes_admin' ? 'bg-green-50 border border-green-100' : 'bg-orange-50 border border-orange-100'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-medium">{formatCurrency(e.amount)}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  e.type === 'hod_owes_admin' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                }`}>
                  {e.type === 'hod_owes_admin' ? 'To collect from HOD' : 'To pay HOD'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{e.description}</p>
              <p className="text-xs text-gray-400 mt-0.5">{formatDate(e.createdAt)}</p>
            </div>
          ))}
        </div>
      </Accordion>
    </div>
  );
}
