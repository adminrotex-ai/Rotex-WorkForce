import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import type { RootState } from '../../store';
import type { AccountingEntry, PaymentRecord, User, ServiceCost, ConsumerGoodReceipt, FinalProductType } from '../../types';
import { db } from '../../database/db';
import { DEPARTMENT_LABELS } from '../../types';
import {
  getAllAccountingSummary, getAccountingForHod, makePayment,
  confirmPayment, getPendingPayments, getUserById,
  getServiceCostsForHod, getReceiptsForHod, getActiveFinalProductTypes,
} from '../../database/operations';
import { formatCurrency } from '../../utils/helpers';
import Modal from '../common/Modal';
import { ArrowLeft, Send, Receipt, Wrench, CheckCircle, Printer } from 'lucide-react';

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
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { if (currentUser) loadData(); }, [currentUser]);

  const loadData = async () => {
    if (!currentUser) return;
    setAccounting(await getAccountingForHod(currentUser.id));
    setPendingPayments(await getPendingPayments(currentUser.id));
    setLoaded(true);
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
        {loaded && accounting.entries.length === 0 ? (
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
  const { currentUser } = useSelector((s: RootState) => s.auth);
  const navigate = useNavigate();
  const [accounting, setAccounting] = useState<{ hodOwesAdmin: number; adminOwesHod: number; entries: AccountingEntry[] } | null>(null);
  const [hod, setHod] = useState<User | null>(null);
  const [serviceCosts, setServiceCosts] = useState<ServiceCost[]>([]);
  const [receipts, setReceipts] = useState<ConsumerGoodReceipt[]>([]);
  const [productTypes, setProductTypes] = useState<FinalProductType[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [selectedReceipt, setSelectedReceipt] = useState<ConsumerGoodReceipt | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDesc, setPaymentDesc] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [hodId]);

  const loadData = async () => {
    const [acc, user, costs, recs, pts] = await Promise.all([
      getAccountingForHod(hodId),
      getUserById(hodId),
      getServiceCostsForHod(hodId),
      getReceiptsForHod(hodId),
      getActiveFinalProductTypes(),
    ]);
    setAccounting(acc);
    setHod(user || null);
    setServiceCosts(costs);
    setReceipts(recs.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    setProductTypes(pts);
    setLoaded(true);
  };

  const ptName = (id?: string) => {
    if (!id) return '—';
    return productTypes.find(p => p.id === id)?.name || '—';
  };

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });

  const totalServiceCost = serviceCosts.reduce((s, c) => s + c.totalCost, 0);
  const totalConsumerGoods = receipts.reduce((s, r) => s + r.totalAmount, 0);

  const handleConfirmPaid = async () => {
    if (!currentUser || !hod) return;
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) { setError('Enter valid amount'); return; }
    try {
      await makePayment(currentUser.id, currentUser.firstName, hodId, amount,
        paymentDesc || `Service cost payment to ${hod.firstName}`);
      setShowPayModal(false);
      setPaymentAmount('');
      setPaymentDesc('');
      setError('');
      loadData();
    } catch (e: any) { setError(e.message); }
  };

  const handleConfirmCollected = async () => {
    if (!currentUser || !hod) return;
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) { setError('Enter valid amount'); return; }
    try {
      await makePayment(hodId, hod.firstName, currentUser.id, amount,
        paymentDesc || `Consumer goods payment from ${hod.firstName}`);
      setShowCollectModal(false);
      setPaymentAmount('');
      setPaymentDesc('');
      setError('');
      loadData();
    } catch (e: any) { setError(e.message); }
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
          <p className="text-[11px] text-emerald-600 uppercase font-medium">To Collect (Consumer Goods)</p>
          <p className="text-2xl font-light text-emerald-700">{formatCurrency(accounting.hodOwesAdmin)}</p>
        </div>
        <div className="bg-red-50 rounded-2xl p-5 border border-red-100">
          <p className="text-[11px] text-red-500 uppercase font-medium">To Pay (Service Cost)</p>
          <p className="text-2xl font-light text-red-600">{formatCurrency(accounting.adminOwesHod)}</p>
        </div>
      </div>

      {/* Service Cost Log */}
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wrench size={16} className="text-blue-500" />
            <h2 className="text-base font-semibold text-gray-900">Service Cost Log</h2>
            <span className="text-[11px] text-gray-400">({serviceCosts.length} entries)</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-blue-600">Total: {formatCurrency(totalServiceCost)}</span>
            <button
              onClick={() => { setShowPayModal(true); setError(''); setPaymentAmount(''); setPaymentDesc(''); }}
              className="text-[11px] px-3 py-1.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 cursor-pointer flex items-center gap-1"
            >
              <CheckCircle size={12} /> Confirm Paid
            </button>
          </div>
        </div>
        {loaded && serviceCosts.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">No service costs recorded</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Time</th>
                  <th className="pb-3 font-medium text-right">Wages/Piece</th>
                  <th className="pb-3 font-medium text-right">Pieces</th>
                  <th className="pb-3 font-medium">Size</th>
                  <th className="pb-3 font-medium">Product Type</th>
                  <th className="pb-3 font-medium text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody>
                {serviceCosts.map(c => (
                  <tr key={c.id} className="border-b border-gray-50">
                    <td className="py-3 text-gray-700">{fmtDate(c.createdAt)}</td>
                    <td className="py-3 text-gray-500">{fmtTime(c.createdAt)}</td>
                    <td className="py-3 text-right text-gray-700">{formatCurrency(c.costPerPiece)}</td>
                    <td className="py-3 text-right text-gray-700">{c.totalPieces}</td>
                    <td className="py-3 text-gray-700">{c.size || '—'}</td>
                    <td className="py-3 text-gray-700">{ptName(c.productTypeId)}</td>
                    <td className="py-3 text-right font-medium text-gray-900">{formatCurrency(c.totalCost)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-300">
                  <td colSpan={6} className="py-3 text-right font-semibold text-gray-700">Grand Total</td>
                  <td className="py-3 text-right font-semibold text-gray-900">{formatCurrency(totalServiceCost)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Consumer Goods Log */}
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Receipt size={16} className="text-orange-500" />
            <h2 className="text-base font-semibold text-gray-900">Consumer Goods Log</h2>
            <span className="text-[11px] text-gray-400">({receipts.length} receipts)</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-orange-600">Total: {formatCurrency(totalConsumerGoods)}</span>
            <button
              onClick={() => { setShowCollectModal(true); setError(''); setPaymentAmount(''); setPaymentDesc(''); }}
              className="text-[11px] px-3 py-1.5 bg-orange-500 text-white rounded-xl hover:bg-orange-600 cursor-pointer flex items-center gap-1"
            >
              <CheckCircle size={12} /> Confirm Collected
            </button>
          </div>
        </div>
        {loaded && receipts.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">No consumer goods issued</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="pb-3 font-medium">Goods Issued</th>
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Time</th>
                  <th className="pb-3 font-medium text-right">Price/Unit</th>
                  <th className="pb-3 font-medium">Receipt No.</th>
                  <th className="pb-3 font-medium text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map(r => (
                  <tr key={r.id} className="border-b border-gray-50">
                    <td className="py-3 text-gray-700">
                      {r.items.map(i => `${i.consumerGoodName} x${i.quantity}`).join(', ')}
                    </td>
                    <td className="py-3 text-gray-700">{fmtDate(r.createdAt)}</td>
                    <td className="py-3 text-gray-500">{fmtTime(r.createdAt)}</td>
                    <td className="py-3 text-right text-gray-700">
                      {r.items.length === 1
                        ? formatCurrency(r.items[0].pricePerUnit)
                        : r.items.map(i => `${formatCurrency(i.pricePerUnit)}`).join(', ')}
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => setSelectedReceipt(r)}
                        className="text-blue-600 hover:text-blue-800 underline cursor-pointer font-medium"
                      >
                        {r.receiptNumber}
                      </button>
                    </td>
                    <td className="py-3 text-right font-medium text-gray-900">{formatCurrency(r.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-300">
                  <td colSpan={5} className="py-3 text-right font-semibold text-gray-700">Grand Total</td>
                  <td className="py-3 text-right font-semibold text-gray-900">{formatCurrency(totalConsumerGoods)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Confirm Paid Modal (Service Cost) */}
      <Modal isOpen={showPayModal} onClose={() => setShowPayModal(false)} title="Confirm Service Cost Payment">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Record payment made to {hod.firstName} for service costs.</p>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
            <input
              type="text"
              value={paymentDesc}
              onChange={e => setPaymentDesc(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              placeholder="Payment description"
            />
          </div>
          <button onClick={handleConfirmPaid} className="w-full bg-blue-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-600 cursor-pointer">
            Confirm Paid
          </button>
        </div>
      </Modal>

      {/* Confirm Collected Modal (Consumer Goods) */}
      <Modal isOpen={showCollectModal} onClose={() => setShowCollectModal(false)} title="Confirm Payment Collected">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Record payment collected from {hod.firstName} for consumer goods.</p>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
            <input
              type="text"
              value={paymentDesc}
              onChange={e => setPaymentDesc(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              placeholder="Payment description"
            />
          </div>
          <button onClick={handleConfirmCollected} className="w-full bg-orange-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-orange-600 cursor-pointer">
            Confirm Collected
          </button>
        </div>
      </Modal>

      {/* Receipt Detail Modal */}
      <Modal isOpen={!!selectedReceipt} onClose={() => setSelectedReceipt(null)} title={`Receipt ${selectedReceipt?.receiptNumber || ''}`} maxWidth="36rem">
        {selectedReceipt && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[11px] text-gray-400">Receipt No.</p>
                <p className="font-semibold text-gray-900">{selectedReceipt.receiptNumber}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400">Date</p>
                <p className="font-medium text-gray-900">{new Date(selectedReceipt.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400">Issued To</p>
                <p className="font-medium text-gray-900">{selectedReceipt.hodName} ({DEPARTMENT_LABELS[selectedReceipt.department]})</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400">Issued By</p>
                <p className="font-medium text-gray-900">{selectedReceipt.issuedByName}</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="pb-2 font-medium">#</th>
                    <th className="pb-2 font-medium">Item</th>
                    <th className="pb-2 font-medium text-right">Qty</th>
                    <th className="pb-2 font-medium text-right">Price/Unit</th>
                    <th className="pb-2 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedReceipt.items.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-50">
                      <td className="py-2 text-gray-500">{idx + 1}</td>
                      <td className="py-2 text-gray-900">{item.consumerGoodName}</td>
                      <td className="py-2 text-right text-gray-700">{item.quantity}</td>
                      <td className="py-2 text-right text-gray-700">{formatCurrency(item.pricePerUnit)}</td>
                      <td className="py-2 text-right font-medium text-gray-900">{formatCurrency(item.totalCost)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-300">
                    <td colSpan={4} className="py-2 text-right font-semibold text-gray-700">Total</td>
                    <td className="py-2 text-right font-semibold text-lg text-gray-900">{formatCurrency(selectedReceipt.totalAmount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <button
              onClick={() => {
                const r = selectedReceipt;
                const rows = r.items.map((item, i) =>
                  `<tr><td>${i + 1}</td><td>${item.consumerGoodName}</td><td style="text-align:right">${item.quantity}</td><td style="text-align:right">${formatCurrency(item.pricePerUnit)}</td><td style="text-align:right">${formatCurrency(item.totalCost)}</td></tr>`
                ).join('');
                const w = window.open('', '_blank');
                if (w) {
                  w.document.write(`<html><head><title>Receipt ${r.receiptNumber}</title><style>body{font-family:sans-serif;padding:20px;max-width:600px;margin:0 auto}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{padding:8px;border-bottom:1px solid #ddd;text-align:left}th{background:#f5f5f5}.total-row td{font-weight:bold;border-top:2px solid #333}</style></head><body><h2>Consumer Goods Issue Receipt</h2><div><span>Receipt No.</span> <strong>${r.receiptNumber}</strong></div><div><span>Date</span> ${new Date(r.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</div><div><span>Issued To</span> ${r.hodName} (${DEPARTMENT_LABELS[r.department] || r.department})</div><div><span>Issued By</span> ${r.issuedByName}</div><table><thead><tr><th>#</th><th>Item</th><th style="text-align:right">Qty</th><th style="text-align:right">Price/Unit</th><th style="text-align:right">Total</th></tr></thead><tbody>${rows}</tbody><tfoot><tr class="total-row"><td colspan="4" style="text-align:right">Total Amount:</td><td style="text-align:right">${formatCurrency(r.totalAmount)}</td></tr></tfoot></table></body></html>`);
                  w.document.close();
                  w.print();
                }
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#2a2a2a] text-white rounded-xl text-sm font-medium hover:bg-gray-800 cursor-pointer"
            >
              <Printer size={14} /> Print Receipt
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
