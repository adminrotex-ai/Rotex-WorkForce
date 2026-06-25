export type Department = string;

export type UserRole = 'admin' | 'hod' | 'user';

export type BatchStatus = 'created' | 'in_progress' | 'completed';

export type BatchStage =
  | 'store_raw'
  | 'welding'
  | 'store_welded'
  | 'pressing'
  | 'store_pressed'
  | 'buffing'
  | 'store_finished'
  | 'packaging'
  | 'store_packed'
  | 'dispatch';

export const STAGE_ORDER: BatchStage[] = [
  'store_raw',
  'welding',
  'store_welded',
  'pressing',
  'store_pressed',
  'buffing',
  'store_finished',
  'packaging',
  'store_packed',
  'dispatch',
];

export const STAGE_TO_DEPARTMENT: Record<BatchStage, Department> = {
  store_raw: 'store',
  welding: 'welding',
  store_welded: 'store',
  pressing: 'pressing',
  store_pressed: 'store',
  buffing: 'buffing',
  store_finished: 'store',
  packaging: 'packaging',
  store_packed: 'store',
  dispatch: 'dispatch',
};

export const DEFAULT_DEPARTMENTS = ['store', 'welding', 'pressing', 'buffing', 'packaging', 'dispatch'];

export const DEFAULT_DEPARTMENT_LABELS: Record<string, string> = {
  store: 'Store',
  welding: 'Welding Department',
  pressing: 'Pressing Department',
  buffing: 'Buffing Department',
  packaging: 'Packaging Department',
  dispatch: 'Dispatch Department',
};

// Mutable label store; updated at runtime when custom departments are loaded.
export const DEPARTMENT_LABELS: Record<string, string> = { ...DEFAULT_DEPARTMENT_LABELS };

export const STAGE_LABELS: Record<BatchStage, string> = {
  store_raw: 'Store (Raw Material)',
  welding: 'Welding',
  store_welded: 'Store (Welded)',
  pressing: 'Pressing',
  store_pressed: 'Store (Pressed)',
  buffing: 'Buffing',
  store_finished: 'Store (Finished)',
  packaging: 'Packaging',
  store_packed: 'Store (Packed)',
  dispatch: 'Dispatch',
};

export interface CustomDepartment {
  id: string;
  key: string;
  label: string;
  createdBy: string;
  createdAt: string;
  isActive: boolean;
}

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  firstName: string;
  role: UserRole;
  department: Department;
  phone?: string;
  profilePicture?: string;
  openingBalance?: number;
  serviceCostRate?: number;
  createdBy: string;
  createdAt: string;
  deletedAt?: string;
  deleteReason?: string;
  deletedBy?: string;
  isActive: boolean;
}

export interface Batch {
  id: string;
  batchNumber: string;
  totalPieces: number;
  currentStage: BatchStage;
  status: BatchStatus;
  sizes: string[];
  createdBy: string;
  createdAt: string;
  completedAt?: string;
  deletedAt?: string;
  deleteReason?: string;
  deletedBy?: string;
  isActive: boolean;
}

export interface BatchStageRecord {
  id: string;
  batchId: string;
  stage: BatchStage;
  assignedHodId?: string;
  totalPiecesReceived: number;
  acceptedPieces: number;
  rejectedPieces: number;
  piecesProcessed: number;
  piecesSentForward: number;
  status: 'pending' | 'in_progress' | 'completed';
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface BatchTransfer {
  id: string;
  batchId: string;
  fromStage: BatchStage;
  toStage: BatchStage;
  piecesCount: number;
  transferredBy: string;
  targetHodId?: string;
  size?: string;
  createdAt: string;
}

export interface PieceEntry {
  id: string;
  batchId: string;
  stageRecordId: string;
  userId: string;
  acceptedPieces: number;
  rejectedPieces: number;
  totalPieces: number;
  size?: string;
  notes?: string;
  createdAt: string;
}

export interface ConsumerGoodItem {
  id: string;
  name: string;
  unit?: string;
  createdBy: string;
  createdAt: string;
  deletedAt?: string;
  deleteReason?: string;
  isActive: boolean;
}

export interface MaterialType {
  id: string;
  name: string;
  unit?: string;
  createdBy: string;
  createdAt: string;
  isActive: boolean;
}

export interface MaterialEntry {
  id: string;
  materialTypeId: string;
  supplierName: string;
  billPhoto?: string;
  price: number;
  quantity: number;
  remainingQuantity: number;
  unit: string;
  isOpening?: boolean;
  isRawMaterial?: boolean;
  enteredBy: string;
  createdAt: string;
}

export interface ConsumerGoodUsage {
  id: string;
  batchId: string;
  stageRecordId?: string;
  consumerGoodId: string;
  quantity: number;
  pricePerUnit: number;
  totalCost: number;
  department: Department;
  userId: string;
  createdAt: string;
}

export interface ServiceCost {
  id: string;
  batchId: string;
  stageRecordId?: string;
  department: Department;
  costPerPiece: number;
  totalPieces: number;
  totalCost: number;
  size?: string;
  hodId?: string;
  productTypeId?: string;
  enteredBy: string;
  createdAt: string;
}

export interface AccountingEntry {
  id: string;
  hodId: string;
  adminId: string;
  type: 'hod_owes_admin' | 'admin_owes_hod';
  amount: number;
  description: string;
  batchId?: string;
  relatedCostId?: string;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  payerId: string;
  payeeId: string;
  amount: number;
  confirmed: boolean;
  confirmedBy?: string;
  confirmedAt?: string;
  description: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  category: 'batch' | 'user' | 'cost' | 'transfer' | 'material' | 'consumer_goods' | 'payment' | 'deletion' | 'department' | 'product' | 'profile' | 'general';
  entityType: string;
  entityId: string;
  userId: string;
  userName: string;
  details: string;
  metadata?: string;
  createdAt: string;
}

export interface ConsumerGoodInventory {
  id: string;
  consumerGoodId: string;
  quantity: number;
  remainingQuantity: number;
  pricePerUnit: number;
  isOpening?: boolean;
  enteredBy: string;
  supplierName?: string;
  billPhoto?: string;
  createdAt: string;
}

export interface ConsumerGoodReceipt {
  id: string;
  receiptNumber: string;
  hodId: string;
  hodName: string;
  department: Department;
  issuedBy: string;
  issuedByName: string;
  items: ConsumerGoodReceiptItem[];
  totalAmount: number;
  batchId?: string;
  createdAt: string;
}

export interface ConsumerGoodReceiptItem {
  consumerGoodId: string;
  consumerGoodName: string;
  quantity: number;
  pricePerUnit: number;
  totalCost: number;
  inventoryEntryId: string;
  supplierName?: string;
}

export interface FinalProductType {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  isActive: boolean;
}

export interface FinalProduct {
  id: string;
  name: string;
  productTypeId?: string;
  size?: string;
  unit: string;
  createdBy: string;
  createdAt: string;
  deletedAt?: string;
  isActive: boolean;
}

export interface FinalProductStockEntry {
  id: string;
  productId: string;
  quantity: number;
  remainingQuantity: number;
  batchId?: string;
  isOpening?: boolean;
  enteredBy: string;
  createdAt: string;
}

export interface DepartmentStock {
  id: string;
  department: string;
  productId?: string;
  size?: string;
  quantity: number;
  unit: string;
  lastUpdatedBy: string;
  lastUpdatedAt: string;
  createdAt: string;
  isActive: boolean;
}

export interface StockTransfer {
  id: string;
  fromDepartment: string;
  toDepartment: string;
  targetHodId?: string;
  targetHodName?: string;
  productId?: string;
  size?: string;
  quantity: number;
  unit: string;
  transferredBy: string;
  transferredByName: string;
  notes?: string;
  createdAt: string;
}

export interface StockAdjustment {
  id: string;
  departmentStockId: string;
  department: string;
  previousQuantity: number;
  newQuantity: number;
  reason: string;
  adjustedBy: string;
  adjustedByName: string;
  createdAt: string;
}

export interface DispatchEntry {
  id: string;
  productId: string;
  productName: string;
  size?: string;
  quantity: number;
  unit: string;
  partyName: string;
  notes?: string;
  dispatchedBy: string;
  dispatchedByName: string;
  createdAt: string;
  deletedAt?: string;
  deleteReason?: string;
  deletedBy?: string;
  deletedByName?: string;
  isActive: boolean;
}

export interface ServiceCostRate {
  id: string;
  hodId: string;
  size?: string;
  productTypeId?: string;
  costPerPiece: number;
  createdBy: string;
  createdAt: string;
  isActive: boolean;
}

export interface CostPaymentConfirmation {
  id: string;
  type: 'service_cost' | 'consumer_goods';
  relatedId: string;
  hodId: string;
  amount: number;
  confirmedBy: string;
  confirmedByName: string;
  createdAt: string;
  deletedAt?: string;
  deleteReason?: string;
  deletedBy?: string;
  deletedByName?: string;
  isActive: boolean;
}

export interface SyncQueueItem {
  id: string;
  action: string;
  table: string;
  data: string;
  synced: boolean;
  createdAt: string;
}
