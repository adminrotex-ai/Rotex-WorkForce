import Dexie, { type Table } from 'dexie';
import type {
  User, Batch, BatchStageRecord, BatchTransfer, PieceEntry,
  ConsumerGoodItem, MaterialType, MaterialEntry, ConsumerGoodUsage,
  ServiceCost, AccountingEntry, PaymentRecord, AuditLog,
  ConsumerGoodInventory, ConsumerGoodReceipt, SyncQueueItem,
  CustomDepartment, FinalProduct, FinalProductStockEntry,
} from '../types';

export class JobworkDB extends Dexie {
  users!: Table<User>;
  batches!: Table<Batch>;
  batchStageRecords!: Table<BatchStageRecord>;
  batchTransfers!: Table<BatchTransfer>;
  pieceEntries!: Table<PieceEntry>;
  consumerGoodItems!: Table<ConsumerGoodItem>;
  materialTypes!: Table<MaterialType>;
  materialEntries!: Table<MaterialEntry>;
  consumerGoodUsages!: Table<ConsumerGoodUsage>;
  serviceCosts!: Table<ServiceCost>;
  accountingEntries!: Table<AccountingEntry>;
  paymentRecords!: Table<PaymentRecord>;
  auditLogs!: Table<AuditLog>;
  consumerGoodInventory!: Table<ConsumerGoodInventory>;
  consumerGoodReceipts!: Table<ConsumerGoodReceipt>;
  syncQueue!: Table<SyncQueueItem>;
  customDepartments!: Table<CustomDepartment>;
  finalProducts!: Table<FinalProduct>;
  finalProductStock!: Table<FinalProductStockEntry>;

  constructor() {
    super('JobworkDB');
    this.version(2).stores({
      users: 'id, username, role, department, createdBy, isActive',
      batches: 'id, batchNumber, status, currentStage, createdBy, isActive',
      batchStageRecords: 'id, batchId, stage, assignedHodId, status',
      batchTransfers: 'id, batchId, fromStage, toStage, transferredBy, createdAt',
      pieceEntries: 'id, batchId, stageRecordId, userId',
      consumerGoodItems: 'id, name, isActive',
      materialTypes: 'id, name, isActive',
      materialEntries: 'id, materialTypeId, enteredBy, createdAt',
      consumerGoodUsages: 'id, batchId, consumerGoodId, department, userId',
      serviceCosts: 'id, batchId, department, enteredBy',
      accountingEntries: 'id, hodId, adminId, type, createdAt',
      paymentRecords: 'id, payerId, payeeId, confirmed, createdAt',
      auditLogs: 'id, action, category, entityType, userId, createdAt',
      consumerGoodInventory: 'id, consumerGoodId, enteredBy, remainingQuantity',
      consumerGoodReceipts: 'id, receiptNumber, hodId, department, createdAt',
      syncQueue: 'id, synced, createdAt',
    });

    this.version(3).stores({
      users: 'id, username, role, department, createdBy, isActive',
      batches: 'id, batchNumber, status, currentStage, createdBy, isActive',
      batchStageRecords: 'id, batchId, stage, assignedHodId, status',
      batchTransfers: 'id, batchId, fromStage, toStage, transferredBy, createdAt',
      pieceEntries: 'id, batchId, stageRecordId, userId',
      consumerGoodItems: 'id, name, isActive',
      materialTypes: 'id, name, isActive',
      materialEntries: 'id, materialTypeId, enteredBy, createdAt, remainingQuantity',
      consumerGoodUsages: 'id, batchId, consumerGoodId, department, userId',
      serviceCosts: 'id, batchId, department, enteredBy',
      accountingEntries: 'id, hodId, adminId, type, createdAt',
      paymentRecords: 'id, payerId, payeeId, confirmed, createdAt',
      auditLogs: 'id, action, category, entityType, userId, createdAt',
      consumerGoodInventory: 'id, consumerGoodId, enteredBy, remainingQuantity',
      consumerGoodReceipts: 'id, receiptNumber, hodId, department, createdAt',
      syncQueue: 'id, synced, createdAt',
      customDepartments: 'id, key, isActive, createdAt',
      finalProducts: 'id, name, isActive',
      finalProductStock: 'id, productId, batchId, enteredBy, createdAt',
    }).upgrade(async tx => {
      // Add remainingQuantity to existing material entries
      const mats = await tx.table('materialEntries').toArray();
      for (const m of mats) {
        if (m.remainingQuantity === undefined) {
          await tx.table('materialEntries').update(m.id, { remainingQuantity: m.quantity });
        }
      }
    });
  }
}

export const db = new JobworkDB();
