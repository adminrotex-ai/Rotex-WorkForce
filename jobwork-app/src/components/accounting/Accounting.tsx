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
import { formatCurrency } from '../../utils/helpers';
import Modal from '../common/Modal';
import { ArrowLeft, Send } from 'lucide-react';

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
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-light text-gray-900">Accounting</h1>
        <p className="text-sm text-gray-400 mt-1">{summary.length} HOD accounts</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100">
          <p className="text-[11px] text-emerald-600 uppercase font-medium">Total to Collect</p>
          <p className="text-2xl font-light text-emerald-700">{formatCurrency(totalOwed)}</p>
        </div>
        <div className="bg-red-50 rounded-2xl p-5 border border-red-100">
          <p className="text-[11px] text-red-500 uppercase font-medium">Total to Pay</p>
          <p className="text-2xl font-light text-red-600">{formatCurrency(totalOwing)}</p>
        </div>
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5">
          <p className="text-[11px] text-gray-400 uppercase font-medium">Net Balance</p>
          <p className={`text-2xl font-light ${totalOwed - totalOwing >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
            {formatCurrency(totalOwed - totalOwing)}
          </p>
        </div>
      </div>

      {/* HOD-wise breakdown */}
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">HOD Accounts</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200">
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
                  <td className="py-3 font-medium text-gray-900">{a.hodName}</td>
                  <td className="py-3 text-gray-500">{DEPARTMENT_LABELS[a.department]}</td>
                  <td className="py-3 text-right text-emerald-600">{formatCurrency(a.hodOwesAdmin)}</td>
                  <td className="py-3 text-right text-red-500">{formatCurrency(a.adminOwesHod)}</td>
                  <td className="py-3 text-right">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => navigate(`/accounting/${a.hodId}`)}
                        className="text-[11px] px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 cursor-pointer"
                      >
                        Details
                      </button>
                      <button
                        onClick={() => setShowPayment({ hodId: a.hodId, hodName: a.hodName })}
                        className="text-[11px] px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full hover:bg-emerald-100 cursor-pointer"
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
      </div>

      {/* Pending Payments to Confirm */}
      {pendingPayments.length > 0 && (
        <div className="bg-amber-50 rounded-2xl p-6 border border-amber-200">
          <h2 className="text-base font-semibold text-amber-700 mb-4">Pending Payment Confirmations</h2>
          <div className="space-y-3">
            {pendingPayments.map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-white/60 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-gray-900">{formatCurrency(p.amount)}</p>
                  <p className="text-[11px] text-gray-400">{p.description} · {new Date(p.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
                </div>
                {p.payeeId === currentUser?.id && (
                  <button
                    onClick={() => handleConfirmPayment(p.id)}
                    className="text-[11px] px-3 py-1.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 cursor-pointer"
                  >
                    Confirm
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Modal */}
      <Modal isOpen={!!showPayment} onClose={() => setShowPayment(null)} title={`Pay ${showPayment?.hodName}`}>
        <div className="space-y-4">
          {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (INR)</label>
            <input
              type="number"
              value={paymentAmount}
              onChange={e => setPaymentAmount(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
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
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              placeholder="Payment description"
            />
          </div>
          <button onClick={handleMakePayment} className="w-full bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-700 cursor-pointer">
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
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-light text-gray-900">My Accounting</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100">
          <p className="text-[11px] text-emerald-600 uppercase font-medium">Admin To Collect</p>
          <p className="text-2xl font-light text-emerald-700">{formatCurrency(accounting.adminOwesHod)}</p>
          <p className="text-[11px] text-emerald-500 mt-1">For service costs</p>
        </div>
        <div className="bg-red-50 rounded-2xl p-5 border border-red-100">
          <p className="text-[11px] text-red-500 uppercase font-medium">To Pay Admin</p>
          <p className="text-2xl font-light text-red-600">{formatCurrency(accounting.hodOwesAdmin)}</p>
          <p className="text-[11px] text-red-400 mt-1">For consumer goods & opening balance</p>
          <button
            onClick={() => setShowPayment(true)}
            className="mt-3 text-[11px] px-3 py-1.5 bg-red-500 text-white rounded-xl hover:bg-red-600 cursor-pointer"
          >
            <Send size={12} className="inline mr-1" />Pay Admin
          </button>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Transactions</h2>
        {accounting.entries.length === 0 ? (
          <p className="text-gray-400 text-sm">No transactions yet</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {accounting.entries.map(e => (
              <div key={e.id} className={`p-3 rounded-xl text-sm ${
                e.type === 'admin_owes_hod' ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{formatCurrency(e.amount)}</span>
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full ${
                    e.type === 'admin_owes_hod' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {e.type === 'admin_owes_hod' ? 'To collect from admin' : 'To pay admin'}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">{e.description}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{new Date(e.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Payments */}
      {pendingPayments.length > 0 && (
        <div className="bg-amber-50 rounded-2xl p-6 border border-amber-200">
          <h2 className="text-base font-semibold text-amber-700 mb-4">Pending Confirmations</h2>
          <div className="space-y-3">
            {pendingPayments.map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-white/60 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-gray-900">{formatCurrency(p.amount)}</p>
                  <p className="text-[11px] text-gray-400">{p.description}</p>
                </div>
                {p.payeeId === currentUser?.id && (
                  <button
                    onClick={() => handleConfirmPayment(p.id)}
                    className="text-[11px] px-3 py-1.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 cursor-pointer"
                  >
                    Confirm
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Modal */}
      <Modal isOpen={showPayment} onClose={() => setShowPayment(false)} title="Pay Admin">
        <div className="space-y-4">
          {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (INR)</label>
            <input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input type="text" value={paymentDesc} onChange={e => setPaymentDesc(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400" />
          </div>
          <button onClick={handlePayAdmin} className="w-full bg-red-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-red-600 cursor-pointer">
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
    <div>
      <button onClick={() => navigate('/accounting')} className="text-sm text-gray-500 hover:text-gray-700 mb-4 cursor-pointer flex items-center gap-1">
        <ArrowLeft size={14} /> Back to Accounting
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-light text-gray-900">{hod.firstName}'s Account</h1>
        <p className="text-sm text-gray-400 mt-1">{DEPARTMENT_LABELS[hod.department]}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100">
          <p className="text-[11px] text-emerald-600 uppercase font-medium">To Collect</p>
          <p className="text-2xl font-light text-emerald-700">{formatCurrency(accounting.hodOwesAdmin)}</p>
        </div>
        <div className="bg-red-50 rounded-2xl p-5 border border-red-100">
          <p className="text-[11px] text-red-500 uppercase font-medium">To Pay</p>
          <p className="text-2xl font-light text-red-600">{formatCurrency(accounting.adminOwesHod)}</p>
        </div>
      </div>

      <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Transaction History</h2>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {accounting.entries.map(e => (
            <div key={e.id} className={`p-3 rounded-xl text-sm ${
              e.type === 'hod_owes_admin' ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">{formatCurrency(e.amount)}</span>
                <span className={`text-[11px] px-2.5 py-0.5 rounded-full ${
                  e.type === 'hod_owes_admin' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                }`}>
                  {e.type === 'hod_owes_admin' ? 'To collect from HOD' : 'To pay HOD'}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">{e.description}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{new Date(e.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
