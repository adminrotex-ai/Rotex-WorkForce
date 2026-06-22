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
} from '../../database/operations';
import { formatCurrency, formatDate, getNextStage } from '../../utils/helpers';
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
  const [serviceForm, setServiceForm] = useState({ costPerPiece: '', pieces: '', size: '' });
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

    const stageRecord = getMyStageRecord();
    try {
      await recordServiceCost(
        batch.id, currentUser.department, cost, pieces,
        currentUser.id, currentUser.firstName,
        serviceForm.size || undefined, stageRecord?.id
      );
      setShowServiceCost(false);
      setServiceForm({ costPerPiece: '', pieces: '', size: '' });
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
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/batches')} className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#001f3f' }}>{batch.batchNumber}</h1>
          <p className="text-gray-500 text-sm">
            {batch.totalPieces} pieces | Sizes: {batch.sizes.join(', ')} | Created: {formatDate(batch.createdAt)}
          </p>
        </div>
        <span className={`ml-auto text-sm px-3 py-1 rounded-full ${
          batch.status === 'completed' ? 'bg-green-100 text-green-700' :
          batch.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {batch.status.replace('_', ' ')}
        </span>
      </div>

      {/* Stage Progress */}
      <div className="bg-white rounded-lg p-6 border border-gray-100 overflow-x-auto" style={{ borderRadius: '8px' }}>
        <h2 className="text-sm font-semibold mb-4" style={{ color: '#001f3f' }}>Workflow Progress</h2>
        <div className="flex items-center gap-1 min-w-max">
          {STAGE_ORDER.map((stage, idx) => {
            const stageRecord = stages.find(s => s.stage === stage);
            const isCurrent = batch.currentStage === stage;
            const isCompleted = stageRecord?.status === 'completed';
            const hasData = !!stageRecord;

            return (
              <div key={stage} className="flex items-center">
                <div className={`flex flex-col items-center px-2 py-1 rounded-lg text-center min-w-[80px] ${
                  isCurrent ? 'bg-blue-50 border border-blue-200' :
                  isCompleted ? 'bg-green-50 border border-green-200' :
                  hasData ? 'bg-yellow-50 border border-yellow-200' :
                  'bg-gray-50 border border-gray-200'
                }`}>
                  <p className="text-[10px] font-medium text-gray-600 whitespace-nowrap">{STAGE_LABELS[stage]}</p>
                  {stageRecord && (
                    <div className="text-[9px] text-gray-500 mt-0.5">
                      <span className="text-green-600">{stageRecord.acceptedPieces}A</span>
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
        <div className="flex flex-wrap gap-3">
          {canEnterPieces() && (
            <button
              onClick={() => setShowPieceEntry(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90"
              style={{ backgroundColor: '#001f3f', borderRadius: '8px' }}
            >
              <CheckCircle size={16} /> Record Pieces
            </button>
          )}
          {canTransfer() && availableForTransfer > 0 && getNextStage(currentStageRecord.stage) && (
            <button
              onClick={openTransferModal}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90"
              style={{ backgroundColor: '#0074d9', borderRadius: '8px' }}
            >
              <Send size={16} /> Transfer ({availableForTransfer} available)
            </button>
          )}
          {canEnterCosts() && isHod && (
            <>
              <button
                onClick={() => setShowServiceCost(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 bg-green-600"
                style={{ borderRadius: '8px' }}
              >
                <DollarSign size={16} /> Service Cost
              </button>
            </>
          )}
          {(canEnterCosts() || (isHod && (currentUser?.department === 'welding' || currentUser?.department === 'buffing'))) && (
            <button
              onClick={() => setShowConsumerUsage(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 bg-orange-500"
              style={{ borderRadius: '8px' }}
            >
              <Package size={16} /> Consumer Goods
            </button>
          )}
          {canTransfer() && currentStageRecord.rejectedPieces > 0 && currentStageRecord.stage !== 'welding' && (
            <button
              onClick={() => setShowReject(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 bg-red-500"
              style={{ borderRadius: '8px' }}
            >
              <AlertTriangle size={16} /> Send Rejected to Welding
            </button>
          )}
        </div>
      )}

      {/* Stage Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {stages.map(stage => (
          <div key={stage.id} className="bg-white rounded-lg p-5 border border-gray-100" style={{ borderRadius: '8px' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold" style={{ color: '#001f3f' }}>{STAGE_LABELS[stage.stage]}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                stage.status === 'completed' ? 'bg-green-100 text-green-700' :
                stage.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-700'
              }`}>{stage.status.replace('_', ' ')}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-400">Received</p>
                <p className="font-semibold">{stage.totalPiecesReceived}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Processed</p>
                <p className="font-semibold">{stage.piecesProcessed}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 flex items-center gap-1"><CheckCircle size={10} className="text-green-500" /> Accepted</p>
                <p className="font-semibold text-green-600">{stage.acceptedPieces}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 flex items-center gap-1"><XCircle size={10} className="text-red-500" /> Rejected</p>
                <p className="font-semibold text-red-500">{stage.rejectedPieces}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Sent Forward</p>
                <p className="font-semibold">{stage.piecesSentForward}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Remaining</p>
                <p className="font-semibold text-blue-600">{stage.acceptedPieces - stage.piecesSentForward}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Cost Summary */}
      {stats && (
        <div className="bg-white rounded-lg p-6 border border-gray-100" style={{ borderRadius: '8px' }}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: '#001f3f' }}>Cost Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
              <p className="text-xs text-blue-600 uppercase font-medium">Consumer Goods</p>
              <p className="text-xl font-bold text-blue-700">{formatCurrency(stats.totalConsumerCost)}</p>
            </div>
            <div className="p-4 rounded-lg bg-green-50 border border-green-100">
              <p className="text-xs text-green-600 uppercase font-medium">Service Costs</p>
              <p className="text-xl font-bold text-green-700">{formatCurrency(stats.totalServiceCost)}</p>
            </div>
            <div className="p-4 rounded-lg" style={{ backgroundColor: '#001f3f10', border: '1px solid #001f3f20' }}>
              <p className="text-xs uppercase font-medium" style={{ color: '#001f3f' }}>Total Cost</p>
              <p className="text-xl font-bold" style={{ color: '#001f3f' }}>{formatCurrency(stats.totalCost)}</p>
            </div>
          </div>

          {Object.entries(stats.costBreakdown).length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-2">Breakdown by Department</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
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
        <div className="bg-white rounded-lg p-6 border border-gray-100" style={{ borderRadius: '8px' }}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: '#001f3f' }}>Transfer History</h2>
          <div className="space-y-2">
            {transfers.map(t => (
              <div key={t.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg text-sm">
                <span className="font-medium">{t.piecesCount} pcs</span>
                <span className="text-gray-400">{STAGE_LABELS[t.fromStage]}</span>
                <ArrowRight size={14} className="text-gray-400" />
                <span className="text-gray-400">{STAGE_LABELS[t.toStage]}</span>
                {t.size && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Size: {t.size}</span>}
                <span className="ml-auto text-xs text-gray-400">{formatDate(t.createdAt)}</span>
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Number of Pieces</label>
            <input
              type="number"
              value={transferForm.pieces}
              onChange={e => setTransferForm({ ...transferForm, pieces: e.target.value })}
              max={availableForTransfer}
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          {batch?.sizes && batch.sizes.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
              <select
                value={transferForm.size}
                onChange={e => setTransferForm({ ...transferForm, size: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
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
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button onClick={handleTransfer} className="w-full py-2 text-white rounded-lg text-sm" style={{ backgroundColor: '#0074d9', borderRadius: '8px' }}>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Accepted Pieces</label>
              <input
                type="number"
                value={pieceForm.accepted}
                onChange={e => setPieceForm({ ...pieceForm, accepted: e.target.value })}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rejected Pieces</label>
              <input
                type="number"
                value={pieceForm.rejected}
                onChange={e => setPieceForm({ ...pieceForm, rejected: e.target.value })}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
          {batch?.sizes && batch.sizes.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
              <select
                value={pieceForm.size}
                onChange={e => setPieceForm({ ...pieceForm, size: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              rows={2}
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button onClick={handlePieceEntry} className="w-full py-2 text-white rounded-lg text-sm" style={{ backgroundColor: '#001f3f', borderRadius: '8px' }}>
            Record Entry
          </button>
        </div>
      </Modal>

      {/* Consumer Goods Usage Modal */}
      <Modal isOpen={showConsumerUsage} onClose={() => setShowConsumerUsage(false)} title="Record Consumer Goods Usage">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Consumer Good</label>
            <select
              value={consumerForm.goodId}
              onChange={e => {
                setConsumerForm({ ...consumerForm, goodId: e.target.value });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          {consumerForm.quantity && consumerForm.pricePerUnit && (
            <p className="text-sm font-medium" style={{ color: '#001f3f' }}>
              Total: {formatCurrency(parseFloat(consumerForm.quantity) * parseFloat(consumerForm.pricePerUnit))}
            </p>
          )}
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button onClick={handleConsumerUsage} className="w-full py-2 text-white rounded-lg text-sm bg-orange-500" style={{ borderRadius: '8px' }}>
            Record Usage
          </button>
        </div>
      </Modal>

      {/* Service Cost Modal */}
      <Modal isOpen={showServiceCost} onClose={() => setShowServiceCost(false)} title="Record Service Cost">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cost per Piece (INR)</label>
            <input
              type="number"
              value={serviceForm.costPerPiece}
              onChange={e => setServiceForm({ ...serviceForm, costPerPiece: e.target.value })}
              min="0.01"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Number of Pieces</label>
            <input
              type="number"
              value={serviceForm.pieces}
              onChange={e => setServiceForm({ ...serviceForm, pieces: e.target.value })}
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          {batch?.sizes && batch.sizes.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
              <select
                value={serviceForm.size}
                onChange={e => setServiceForm({ ...serviceForm, size: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">All sizes</option>
                {batch.sizes.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
          {serviceForm.costPerPiece && serviceForm.pieces && (
            <p className="text-sm font-medium" style={{ color: '#001f3f' }}>
              Total: {formatCurrency(parseFloat(serviceForm.costPerPiece) * parseInt(serviceForm.pieces))}
            </p>
          )}
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button onClick={handleServiceCost} className="w-full py-2 text-white rounded-lg text-sm bg-green-600" style={{ borderRadius: '8px' }}>
            Record Service Cost
          </button>
        </div>
      </Modal>

      {/* Reject to Welding Modal */}
      <Modal isOpen={showReject} onClose={() => setShowReject(false)} title="Send Rejected Pieces to Welding">
        <div className="space-y-4">
          <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
            <p className="text-sm text-red-700">
              Rejected pieces will be sent back to the Welding Department for rework.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Number of Rejected Pieces</label>
            <input
              type="number"
              value={rejectForm.pieces}
              onChange={e => setRejectForm({ pieces: e.target.value })}
              min="1"
              max={currentStageRecord?.rejectedPieces || 0}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button onClick={handleReject} className="w-full py-2 text-white rounded-lg text-sm bg-red-500" style={{ borderRadius: '8px' }}>
            Send to Welding
          </button>
        </div>
      </Modal>
    </div>
  );
}
