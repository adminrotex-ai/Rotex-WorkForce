import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import type { RootState } from '../../store';
import type { Batch, BatchStageRecord, BatchTransfer, User, ConsumerGoodItem } from '../../types';
import { STAGE_LABELS, STAGE_ORDER, STAGE_TO_DEPARTMENT } from '../../types';
import {
  getBatchById, getBatchStageRecords, getBatchTransfers, getHodsByDepartment,
  transferPieces, recordPieceEntry, recordConsumerGoodUsage, recordServiceCost,
  sendRejectedToWelding, getActiveConsumerGoods, getBatchStatistics, getHodBatchesInProgress,
  getActiveUsers,
} from '../../database/operations';
import { formatCurrency, getNextStage } from '../../utils/helpers';
import Modal from '../common/Modal';
import {
  ArrowRight, Package, CheckCircle, XCircle, Send,
  DollarSign, AlertTriangle, ChevronRight, ArrowLeft
} from 'lucide-react';

export default function BatchDetail() {
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useSelector((s: RootState) => s.auth);
  const navigate = useNavigate();
  const [batch, setBatch] = useState<Batch | null>(null);
  const [stages, setStages] = useState<BatchStageRecord[]>([]);
  const [transfers, setTransfers] = useState<BatchTransfer[]>([]);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showPieceEntry, setShowPieceEntry] = useState(false);
  const [showConsumerUsage, setShowConsumerUsage] = useState(false);
  const [showServiceCost, setShowServiceCost] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [targetHods, setTargetHods] = useState<User[]>([]);
  const [consumerGoods, setConsumerGoods] = useState<ConsumerGoodItem[]>([]);
  const [hodBatches, setHodBatches] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [stats, setStats] = useState<any>(null);

  const [transferForm, setTransferForm] = useState({ pieces: '', targetHodId: '', size: '' });
  const [pieceForm, setPieceForm] = useState({ accepted: '', rejected: '', size: '', notes: '' });
  const [consumerForm, setConsumerForm] = useState({ goodId: '', quantity: '', pricePerUnit: '' });
  const [serviceForm, setServiceForm] = useState({ costPerPiece: '', pieces: '', size: '', hodId: '' });
  const [allHods, setAllHods] = useState<User[]>([]);
  const [rejectForm, setRejectForm] = useState({ pieces: '' });

  const isAdmin = currentUser?.role === 'admin';
  const isHod = currentUser?.role === 'hod';

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    const [b, s, t, goods, st] = await Promise.all([
      getBatchById(id),
      getBatchStageRecords(id),
      getBatchTransfers(id),
      getActiveConsumerGoods(),
      getBatchStatistics(id),
    ]);
    setBatch(b || null);
    setStages(s);
    setTransfers(t);
    setConsumerGoods(goods);
    setStats(st);
    const users = await getActiveUsers();
    setAllHods(users.filter(u => u.role === 'hod'));
  };

  const getCurrentStageRecord = () => {
    if (!batch) return null;
    return stages.find(s => s.stage === batch.currentStage && s.status === 'in_progress');
  };

  const getMyStageRecord = () => {
    if (!currentUser || !batch) return null;
    if (isAdmin) return getCurrentStageRecord();
    return stages.find(s =>
      s.assignedHodId === currentUser.id && s.status === 'in_progress'
    ) || getCurrentStageRecord();
  };

  const canTransfer = () => {
    if (!currentUser || !batch) return false;
    const stageRecord = getMyStageRecord();
    if (!stageRecord) return false;
    if (isAdmin) return true;
    if (isHod && stageRecord.assignedHodId === currentUser.id) return true;
    return false;
  };

  const canEnterPieces = () => {
    if (!currentUser || !batch) return false;
    const stageRecord = getMyStageRecord();
    if (!stageRecord) return false;
    if (isAdmin) return true;
    if (isHod && stageRecord.assignedHodId === currentUser.id) return true;
    if (currentUser.role === 'user') {
      const dept = STAGE_TO_DEPARTMENT[stageRecord.stage];
      return currentUser.department === dept;
    }
    return false;
  };

  const canEnterCosts = () => {
    if (!currentUser) return false;
    return isAdmin || (isHod && (currentUser.department === 'welding' || currentUser.department === 'buffing' || currentUser.department === 'store'));
  };

  const handleTransfer = async () => {
    setError('');
    if (!batch || !currentUser) return;
    const pieces = parseInt(transferForm.pieces);
    if (!pieces || pieces <= 0) { setError('Enter valid piece count'); return; }

    const stageRecord = getMyStageRecord();
    if (!stageRecord) { setError('No active stage record'); return; }

    const nextStage = getNextStage(stageRecord.stage);
    if (!nextStage) { setError('No next stage available'); return; }

    try {
      await transferPieces(
        batch.id, stageRecord.stage, nextStage, pieces,
        currentUser.id, currentUser.firstName,
        transferForm.targetHodId || undefined,
        transferForm.size || undefined
      );
      setShowTransfer(false);
      setTransferForm({ pieces: '', targetHodId: '', size: '' });
      loadData();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handlePieceEntry = async () => {
    setError('');
    if (!batch || !currentUser) return;
    const accepted = parseInt(pieceForm.accepted) || 0;
    const rejected = parseInt(pieceForm.rejected) || 0;
    if (accepted + rejected <= 0) { setError('Enter at least one piece'); return; }

    const stageRecord = getMyStageRecord();
    if (!stageRecord) { setError('No active stage record'); return; }

    try {
      await recordPieceEntry(
        batch.id, stageRecord.id, currentUser.id, currentUser.firstName,
        accepted, rejected, pieceForm.size || undefined, pieceForm.notes || undefined
      );
      setShowPieceEntry(false);
      setPieceForm({ accepted: '', rejected: '', size: '', notes: '' });
      loadData();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleConsumerUsage = async () => {
    setError('');
    if (!batch || !currentUser) return;
    const qty = parseFloat(consumerForm.quantity);
    const price = parseFloat(consumerForm.pricePerUnit);
    if (!qty || !price || !consumerForm.goodId) { setError('Fill all fields'); return; }

    const stageRecord = getMyStageRecord();
    try {
      await recordConsumerGoodUsage(
        batch.id, consumerForm.goodId, qty, price,
        currentUser.department, currentUser.id, currentUser.firstName,
        stageRecord?.id
      );
      setShowConsumerUsage(false);
      setConsumerForm({ goodId: '', quantity: '', pricePerUnit: '' });
      loadData();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleServiceCost = async () => {
    setError('');
    if (!batch || !currentUser) return;
    const cost = parseFloat(serviceForm.costPerPiece);
    const pieces = parseInt(serviceForm.pieces);
    if (!cost || !pieces) { setError('Fill all fields'); return; }
    if (!serviceForm.hodId) { setError('Select an HOD'); return; }

    const selectedHod = allHods.find(h => h.id === serviceForm.hodId);
    if (!selectedHod) { setError('Invalid HOD'); return; }

    const stageRecord = getMyStageRecord();
    try {
      await recordServiceCost(
        batch.id, selectedHod.department, cost, pieces,
        currentUser.id, currentUser.firstName,
        serviceForm.size || undefined, stageRecord?.id,
        selectedHod.id,
      );
      setShowServiceCost(false);
      setServiceForm({ costPerPiece: '', pieces: '', size: '', hodId: '' });
      loadData();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleReject = async () => {
    setError('');
    if (!batch || !currentUser) return;
    const pieces = parseInt(rejectForm.pieces);
    if (!pieces || pieces <= 0) { setError('Enter valid piece count'); return; }

    const stageRecord = getMyStageRecord();
    if (!stageRecord) { setError('No active stage record'); return; }

    try {
      await sendRejectedToWelding(
        batch.id, pieces, stageRecord.stage,
        currentUser.id, currentUser.firstName
      );
      setShowReject(false);
      setRejectForm({ pieces: '' });
      loadData();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const openTransferModal = async () => {
    const stageRecord = getMyStageRecord();
    if (!stageRecord) return;
    const nextStage = getNextStage(stageRecord.stage);
    if (!nextStage) return;
    const dept = STAGE_TO_DEPARTMENT[nextStage];
    const hods = await getHodsByDepartment(dept);

    const batchInfo: Record<string, string> = {};
    for (const hod of hods) {
      const inProgress = await getHodBatchesInProgress(hod.id);
      if (inProgress.length > 0) {
        batchInfo[hod.id] = inProgress.map(b => b.batch.batchNumber).join(', ');
      }
    }

    setTargetHods(hods);
    setHodBatches(batchInfo);
    setShowTransfer(true);
  };

  if (!batch) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-400">Loading batch...</p>
    </div>
  );

  const currentStageRecord = getMyStageRecord();
  const availableForTransfer = currentStageRecord
    ? currentStageRecord.acceptedPieces - currentStageRecord.piecesSentForward
    : 0;

  return (
    <div>
      <button onClick={() => navigate('/batches')} className="text-sm text-gray-500 hover:text-gray-700 mb-4 cursor-pointer flex items-center gap-1">
        <ArrowLeft size={14} /> Back to Batches
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-light text-gray-900">{batch.batchNumber}</h1>
          <p className="text-sm text-gray-400 mt-1">
            {batch.totalPieces} pieces · Sizes: {batch.sizes.join(', ')} · {new Date(batch.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
          </p>
        </div>
        <span className={`text-[11px] font-medium px-3 py-1.5 rounded-full ${
          batch.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
          batch.status === 'in_progress' ? 'bg-gold-300 text-dark-800' :
          'bg-gray-100 text-gray-600'
        }`}>
          {batch.status.replace('_', ' ')}
        </span>
      </div>

      {/* Stage Progress */}
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 mb-6 overflow-x-auto">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Workflow Progress</h2>
        <div className="flex items-center gap-1 min-w-max">
          {STAGE_ORDER.map((stage, idx) => {
            const stageRecord = stages.find(s => s.stage === stage);
            const isCurrent = batch.currentStage === stage;
            const isCompleted = stageRecord?.status === 'completed';
            const hasData = !!stageRecord;

            return (
              <div key={stage} className="flex items-center">
                <div className={`flex flex-col items-center px-2 py-1 rounded-xl text-center min-w-[80px] ${
                  isCurrent ? 'bg-gold-300 border border-gold-400' :
                  isCompleted ? 'bg-emerald-50 border border-emerald-200' :
                  hasData ? 'bg-amber-50 border border-amber-200' :
                  'bg-gray-50 border border-gray-200'
                }`}>
                  <p className="text-[10px] font-medium text-gray-600 whitespace-nowrap">{STAGE_LABELS[stage]}</p>
                  {stageRecord && (
                    <div className="text-[9px] text-gray-500 mt-0.5">
                      <span className="text-emerald-600">{stageRecord.acceptedPieces}A</span>
                      {' / '}
                      <span className="text-red-500">{stageRecord.rejectedPieces}R</span>
                    </div>
                  )}
                </div>
                {idx < STAGE_ORDER.length - 1 && <ChevronRight size={12} className="text-gray-300 mx-0.5" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      {currentStageRecord && (
        <div className="flex flex-wrap gap-3 mb-6">
          {canEnterPieces() && (
            <button
              onClick={() => setShowPieceEntry(true)}
              className="flex items-center gap-2 bg-[#2a2a2a] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#1a1a1a] cursor-pointer"
            >
              <CheckCircle size={16} /> Record Pieces
            </button>
          )}
          {canTransfer() && availableForTransfer > 0 && getNextStage(currentStageRecord.stage) && (
            <button
              onClick={openTransferModal}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 cursor-pointer"
            >
              <Send size={16} /> Transfer ({availableForTransfer} available)
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setShowServiceCost(true)}
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-700 cursor-pointer"
            >
              <DollarSign size={16} /> Service Cost
            </button>
          )}
          {(canEnterCosts() || (isHod && (currentUser?.department === 'welding' || currentUser?.department === 'buffing'))) && (
            <button
              onClick={() => setShowConsumerUsage(true)}
              className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-orange-600 cursor-pointer"
            >
              <Package size={16} /> Consumer Goods
            </button>
          )}
          {canTransfer() && currentStageRecord.rejectedPieces > 0 && currentStageRecord.stage !== 'welding' && (
            <button
              onClick={() => setShowReject(true)}
              className="flex items-center gap-2 bg-red-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-red-600 cursor-pointer"
            >
              <AlertTriangle size={16} /> Send Rejected to Welding
            </button>
          )}
        </div>
      )}

      {/* Stage Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {stages.map(stage => (
          <div key={stage.id} className="bg-white/60 backdrop-blur-sm rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">{STAGE_LABELS[stage.stage]}</h3>
              <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${
                stage.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                stage.status === 'in_progress' ? 'bg-gold-300 text-dark-800' :
                'bg-gray-100 text-gray-600'
              }`}>{stage.status.replace('_', ' ')}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[11px] text-gray-400">Received</p>
                <p className="font-medium text-gray-900">{stage.totalPiecesReceived}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400">Processed</p>
                <p className="font-medium text-gray-900">{stage.piecesProcessed}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400 flex items-center gap-1"><CheckCircle size={10} className="text-emerald-500" /> Accepted</p>
                <p className="font-medium text-emerald-600">{stage.acceptedPieces}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400 flex items-center gap-1"><XCircle size={10} className="text-red-500" /> Rejected</p>
                <p className="font-medium text-red-500">{stage.rejectedPieces}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400">Sent Forward</p>
                <p className="font-medium text-gray-900">{stage.piecesSentForward}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400">Remaining</p>
                <p className="font-medium text-blue-600">{stage.acceptedPieces - stage.piecesSentForward}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Cost Summary */}
      {stats && (
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Cost Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-4">
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
              <p className="text-[11px] text-blue-600 uppercase font-medium">Consumer Goods</p>
              <p className="text-xl font-light text-blue-700">{formatCurrency(stats.totalConsumerCost)}</p>
            </div>
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
              <p className="text-[11px] text-emerald-600 uppercase font-medium">Service Costs</p>
              <p className="text-xl font-light text-emerald-700">{formatCurrency(stats.totalServiceCost)}</p>
            </div>
            <div className="p-4 rounded-xl bg-gold-300/20 border border-gold-400/20">
              <p className="text-[11px] text-dark-800 uppercase font-medium">Total Cost</p>
              <p className="text-xl font-light text-dark-800">{formatCurrency(stats.totalCost)}</p>
            </div>
          </div>

          {Object.entries(stats.costBreakdown).length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-2">Breakdown by Department</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-200">
                      <th className="pb-2 font-medium">Department</th>
                      <th className="pb-2 font-medium text-right">Consumer Goods</th>
                      <th className="pb-2 font-medium text-right">Service Cost</th>
                      <th className="pb-2 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(stats.costBreakdown).map(([dept, costs]: [string, any]) => (
                      <tr key={dept} className="border-b border-gray-50">
                        <td className="py-2 capitalize">{dept}</td>
                        <td className="py-2 text-right">{formatCurrency(costs.consumerGoods)}</td>
                        <td className="py-2 text-right">{formatCurrency(costs.serviceCost)}</td>
                        <td className="py-2 text-right font-semibold">{formatCurrency(costs.consumerGoods + costs.serviceCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Transfer History */}
      {transfers.length > 0 && (
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Transfer History</h2>
          <div className="space-y-3">
            {transfers.map(t => (
              <div key={t.id} className="flex items-center gap-3 p-3 bg-white/40 rounded-xl text-sm">
                <span className="font-medium">{t.piecesCount} pcs</span>
                <span className="text-gray-400">{STAGE_LABELS[t.fromStage]}</span>
                <ArrowRight size={14} className="text-gray-400" />
                <span className="text-gray-400">{STAGE_LABELS[t.toStage]}</span>
                {t.size && <span className="text-[11px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Size: {t.size}</span>}
                <span className="ml-auto text-[11px] text-gray-400">{new Date(t.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      <Modal isOpen={showTransfer} onClose={() => setShowTransfer(false)} title="Transfer Pieces">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Available: <strong>{availableForTransfer}</strong> pieces.
            Next stage: <strong>{currentStageRecord ? STAGE_LABELS[getNextStage(currentStageRecord.stage)!] : ''}</strong>
          </p>
          {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Number of Pieces</label>
            <input
              type="number"
              value={transferForm.pieces}
              onChange={e => setTransferForm({ ...transferForm, pieces: e.target.value })}
              max={availableForTransfer}
              min="1"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
            />
          </div>
          {batch?.sizes && batch.sizes.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
              <select
                value={transferForm.size}
                onChange={e => setTransferForm({ ...transferForm, size: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              >
                <option value="">All sizes</option>
                {batch.sizes.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
          {targetHods.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign to HOD</label>
              <select
                value={transferForm.targetHodId}
                onChange={e => setTransferForm({ ...transferForm, targetHodId: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              >
                <option value="">Select HOD</option>
                {targetHods.map(h => (
                  <option key={h.id} value={h.id}>
                    {h.firstName} {hodBatches[h.id] ? `(Working on: ${hodBatches[h.id]})` : '(Available)'}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button onClick={handleTransfer} className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 cursor-pointer">
            Transfer Pieces
          </button>
        </div>
      </Modal>

      {/* Piece Entry Modal */}
      <Modal isOpen={showPieceEntry} onClose={() => setShowPieceEntry(false)} title="Record Piece Entry">
        <div className="space-y-4">
          {currentStageRecord && (
            <p className="text-sm text-gray-600">
              Remaining to process: <strong>{currentStageRecord.totalPiecesReceived - currentStageRecord.piecesProcessed}</strong>
            </p>
          )}
          {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Accepted Pieces</label>
              <input
                type="number"
                value={pieceForm.accepted}
                onChange={e => setPieceForm({ ...pieceForm, accepted: e.target.value })}
                min="0"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rejected Pieces</label>
              <input
                type="number"
                value={pieceForm.rejected}
                onChange={e => setPieceForm({ ...pieceForm, rejected: e.target.value })}
                min="0"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              />
            </div>
          </div>
          {batch?.sizes && batch.sizes.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
              <select
                value={pieceForm.size}
                onChange={e => setPieceForm({ ...pieceForm, size: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              >
                <option value="">Select size</option>
                {batch.sizes.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={pieceForm.notes}
              onChange={e => setPieceForm({ ...pieceForm, notes: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              rows={2}
            />
          </div>
          <button onClick={handlePieceEntry} className="w-full bg-[#2a2a2a] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#1a1a1a] cursor-pointer">
            Record Entry
          </button>
        </div>
      </Modal>

      {/* Consumer Goods Usage Modal */}
      <Modal isOpen={showConsumerUsage} onClose={() => setShowConsumerUsage(false)} title="Record Consumer Goods Usage">
        <div className="space-y-4">
          {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Consumer Good</label>
            <select
              value={consumerForm.goodId}
              onChange={e => {
                setConsumerForm({ ...consumerForm, goodId: e.target.value });
              }}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
            >
              <option value="">Select item</option>
              {consumerGoods.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
            <input
              type="number"
              value={consumerForm.quantity}
              onChange={e => setConsumerForm({ ...consumerForm, quantity: e.target.value })}
              min="0.01"
              step="0.01"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price per Unit (INR)</label>
            <input
              type="number"
              value={consumerForm.pricePerUnit}
              onChange={e => setConsumerForm({ ...consumerForm, pricePerUnit: e.target.value })}
              min="0.01"
              step="0.01"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
            />
          </div>
          {consumerForm.quantity && consumerForm.pricePerUnit && (
            <p className="text-sm font-medium text-gray-900">
              Total: {formatCurrency(parseFloat(consumerForm.quantity) * parseFloat(consumerForm.pricePerUnit))}
            </p>
          )}
          <button onClick={handleConsumerUsage} className="w-full bg-orange-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-orange-600 cursor-pointer">
            Record Usage
          </button>
        </div>
      </Modal>

      {/* Service Cost Modal */}
      <Modal isOpen={showServiceCost} onClose={() => setShowServiceCost(false)} title="Record Service Cost">
        <div className="space-y-4">
          {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">HOD</label>
            <select
              value={serviceForm.hodId}
              onChange={e => setServiceForm({ ...serviceForm, hodId: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
            >
              <option value="">Select HOD</option>
              {allHods.map(h => (
                <option key={h.id} value={h.id}>{h.firstName} ({h.department})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cost per Piece (INR)</label>
            <input
              type="number"
              value={serviceForm.costPerPiece}
              onChange={e => setServiceForm({ ...serviceForm, costPerPiece: e.target.value })}
              min="0.01"
              step="0.01"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Number of Pieces</label>
            <input
              type="number"
              value={serviceForm.pieces}
              onChange={e => setServiceForm({ ...serviceForm, pieces: e.target.value })}
              min="1"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
            />
          </div>
          {batch?.sizes && batch.sizes.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
              <select
                value={serviceForm.size}
                onChange={e => setServiceForm({ ...serviceForm, size: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              >
                <option value="">All sizes</option>
                {batch.sizes.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
          {serviceForm.costPerPiece && serviceForm.pieces && (
            <p className="text-sm font-medium text-gray-900">
              Total: {formatCurrency(parseFloat(serviceForm.costPerPiece) * parseInt(serviceForm.pieces))}
            </p>
          )}
          <button onClick={handleServiceCost} className="w-full bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-700 cursor-pointer">
            Record Service Cost
          </button>
        </div>
      </Modal>

      {/* Reject to Welding Modal */}
      <Modal isOpen={showReject} onClose={() => setShowReject(false)} title="Send Rejected Pieces to Welding">
        <div className="space-y-4">
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
            <p className="text-sm text-red-700">
              Rejected pieces will be sent back to the Welding Department for rework.
            </p>
          </div>
          {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Number of Rejected Pieces</label>
            <input
              type="number"
              value={rejectForm.pieces}
              onChange={e => setRejectForm({ pieces: e.target.value })}
              min="1"
              max={currentStageRecord?.rejectedPieces || 0}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
            />
          </div>
          <button onClick={handleReject} className="w-full bg-red-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-red-600 cursor-pointer">
            Send to Welding
          </button>
        </div>
      </Modal>
    </div>
  );
}
