import { db } from './db';
import { generateId, generateBatchNumber, getDateRange } from '../utils/helpers';
import { hashPassword } from '../utils/crypto';
import {
  DEPARTMENT_LABELS, DEFAULT_DEPARTMENT_LABELS,
} from '../types';
import type {
  User, Batch, BatchStageRecord, BatchTransfer, PieceEntry,
  ConsumerGoodItem, MaterialType, MaterialEntry, ConsumerGoodUsage,
  ServiceCost, AccountingEntry, PaymentRecord, AuditLog,
  ConsumerGoodInventory, ConsumerGoodReceipt, ConsumerGoodReceiptItem,
  Department, BatchStage, UserRole, CustomDepartment,
  FinalProductType, FinalProduct, FinalProductStockEntry,
  DepartmentStock, StockTransfer, StockAdjustment,
} from '../types';

function now(): string {
  return new Date().toISOString();
}

function ensurePositive(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive number greater than zero`);
  }
}

function ensureNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} cannot be negative`);
  }
}

async function addAudit(
  action: string,
  category: AuditLog['category'],
  entityType: string,
  entityId: string,
  userId: string,
  userName: string,
  details: string,
  metadata?: string,
) {
  await db.auditLogs.add({
    id: generateId(),
    action,
    category,
    entityType,
    entityId,
    userId,
    userName,
    details,
    metadata,
    createdAt: now(),
  });
}

// ---- ADMIN PASSWORD VERIFICATION ----

export async function verifyAdminPassword(password: string): Promise<boolean> {
  if (!password) return false;
  const hash = hashPassword(password);
  const admins = await db.users.where('role').equals('admin').toArray();
  return admins.some(a => a.isActive && a.passwordHash === hash);
}

async function requireAdminPassword(password: string): Promise<void> {
  const ok = await verifyAdminPassword(password);
  if (!ok) throw new Error('Invalid admin password');
}

// ---- DEPARTMENT OPERATIONS ----

export async function loadCustomDepartmentsIntoLabels(): Promise<CustomDepartment[]> {
  const customs = await db.customDepartments.where('isActive').equals(1).toArray();
  // Reset to defaults then layer customs
  for (const k of Object.keys(DEPARTMENT_LABELS)) delete DEPARTMENT_LABELS[k];
  Object.assign(DEPARTMENT_LABELS, DEFAULT_DEPARTMENT_LABELS);
  for (const c of customs) DEPARTMENT_LABELS[c.key] = c.label;
  return customs;
}

export async function getActiveDepartments(): Promise<Array<{ key: string; label: string; custom: boolean }>> {
  const customs = await loadCustomDepartmentsIntoLabels();
  const defaults = Object.entries(DEFAULT_DEPARTMENT_LABELS).map(([key, label]) => ({ key, label, custom: false }));
  const customList = customs.map(c => ({ key: c.key, label: c.label, custom: true }));
  return [...defaults, ...customList];
}

export async function createCustomDepartment(
  label: string,
  createdBy: string,
  creatorName: string,
): Promise<CustomDepartment> {
  const trimmed = label.trim();
  if (!trimmed) throw new Error('Department name is required');
  const key = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  if (!key) throw new Error('Invalid department name');
  if (DEFAULT_DEPARTMENT_LABELS[key]) throw new Error('A built-in department with this name already exists');
  const existing = await db.customDepartments.where('key').equals(key).first();
  if (existing && existing.isActive) throw new Error('A department with this name already exists');

  const dept: CustomDepartment = {
    id: generateId(),
    key,
    label: trimmed,
    createdBy,
    createdAt: now(),
    isActive: true,
  };
  await db.customDepartments.add(dept);
  DEPARTMENT_LABELS[key] = trimmed;
  await addAudit('DEPARTMENT_CREATED', 'department', 'department', dept.id, createdBy, creatorName,
    `Created department "${trimmed}"`);
  return dept;
}

export async function deleteCustomDepartment(
  id: string,
  reason: string,
  deletedBy: string,
  deleterName: string,
  adminPassword: string,
) {
  if (!reason.trim()) throw new Error('Deletion reason is required');
  await requireAdminPassword(adminPassword);
  const dept = await db.customDepartments.get(id);
  if (!dept) throw new Error('Department not found');
  await db.customDepartments.update(id, { isActive: false });
  delete DEPARTMENT_LABELS[dept.key];
  await addAudit('DEPARTMENT_DELETED', 'deletion', 'department', id, deletedBy, deleterName,
    `Deleted department "${dept.label}". Reason: ${reason}`);
}

// ---- USER OPERATIONS ----

export async function createUser(
  username: string,
  password: string,
  firstName: string,
  role: UserRole,
  department: Department,
  createdBy: string,
  creatorName: string,
  phone?: string,
  profilePicture?: string,
  openingBalance?: number,
): Promise<User> {
  if (!firstName.trim()) {
    throw new Error('Name is required');
  }
  if (role !== 'hod' && (!username.trim() || !password.trim())) {
    throw new Error('Username and password are required');
  }
  if (username.trim()) {
    const existing = await db.users.where('username').equals(username).first();
    if (existing) throw new Error('Username already exists');
  }

  const user: User = {
    id: generateId(),
    username: username.trim(),
    passwordHash: password.trim() ? hashPassword(password) : '',
    firstName: firstName.trim(),
    role,
    department,
    phone: role === 'hod' ? phone : undefined,
    profilePicture: role === 'hod' ? profilePicture : undefined,
    openingBalance: role === 'hod' ? openingBalance : undefined,
    createdBy,
    createdAt: now(),
    isActive: true,
  };
  await db.users.add(user);

  // Apply opening balance to accounting if HOD
  if (role === 'hod' && openingBalance !== undefined && openingBalance !== 0) {
    const admin = await db.users.where('role').equals('admin').first();
    if (admin) {
      // Positive: HOD owes admin (e.g., previous unpaid balance HOD has to pay)
      // Negative: admin owes HOD
      if (openingBalance > 0) {
        await addAccountingEntry(user.id, admin.id, 'hod_owes_admin', openingBalance,
          `Opening balance for ${firstName}`, undefined, undefined);
      } else {
        await addAccountingEntry(user.id, admin.id, 'admin_owes_hod', Math.abs(openingBalance),
          `Opening balance for ${firstName}`, undefined, undefined);
      }
    }
  }

  await addAudit('USER_CREATED', 'user', 'user', user.id, createdBy, creatorName,
    `Created ${role} user "${firstName}" in ${DEPARTMENT_LABELS[department] || department} department${openingBalance !== undefined && openingBalance !== 0 ? ` with opening balance ₹${openingBalance}` : ''}`);
  return user;
}

export async function deleteUser(
  userId: string,
  reason: string,
  deletedBy: string,
  deleterName: string,
  adminPassword?: string,
) {
  if (!reason.trim()) throw new Error('Deletion reason is required');
  const user = await db.users.get(userId);
  if (!user) throw new Error('User not found');
  // Require admin password for HOD/admin deletion
  if (user.role === 'hod' || user.role === 'admin') {
    if (!adminPassword) throw new Error('Admin password is required to delete an HOD');
    await requireAdminPassword(adminPassword);
  }
  await db.users.update(userId, { isActive: false, deletedAt: now(), deleteReason: reason, deletedBy });
  await addAudit('USER_DELETED', 'deletion', 'user', userId, deletedBy, deleterName,
    `Deleted user "${user.firstName}" (${user.role}) from ${DEPARTMENT_LABELS[user.department] || user.department}. Reason: ${reason}`);
}

export async function getActiveUsers(): Promise<User[]> {
  return db.users.where('isActive').equals(1).toArray();
}

export async function getUsersByDepartment(department: Department): Promise<User[]> {
  return db.users.where({ department, isActive: 1 }).toArray();
}

export async function getUsersByCreator(creatorId: string): Promise<User[]> {
  return db.users.where({ createdBy: creatorId, isActive: 1 }).toArray();
}

export async function getHodsByDepartment(department: Department): Promise<User[]> {
  return db.users.where({ department, role: 'hod', isActive: 1 }).toArray();
}

export async function getUserById(userId: string): Promise<User | undefined> {
  return db.users.get(userId);
}

export async function authenticateUser(username: string, passwordHash: string): Promise<User | null> {
  const user = await db.users.where('username').equals(username).first();
  if (!user || !user.isActive) return null;
  if (user.passwordHash !== passwordHash) return null;
  return user;
}

// ---- BATCH OPERATIONS ----

export async function createBatch(
  totalPieces: number,
  sizes: string[],
  createdBy: string,
  creatorName: string,
): Promise<Batch> {
  ensurePositive(totalPieces, 'Total pieces');
  if (sizes.length === 0) throw new Error('At least one size is required');

  const batch: Batch = {
    id: generateId(),
    batchNumber: generateBatchNumber(),
    totalPieces,
    currentStage: 'store_raw',
    status: 'created',
    sizes,
    createdBy,
    createdAt: now(),
    isActive: true,
  };
  await db.batches.add(batch);

  const stageRecord: BatchStageRecord = {
    id: generateId(),
    batchId: batch.id,
    stage: 'store_raw',
    totalPiecesReceived: totalPieces,
    acceptedPieces: totalPieces,
    rejectedPieces: 0,
    piecesProcessed: 0,
    piecesSentForward: 0,
    status: 'in_progress',
    startedAt: now(),
    createdAt: now(),
  };
  await db.batchStageRecords.add(stageRecord);

  await addAudit('BATCH_CREATED', 'batch', 'batch', batch.id, createdBy, creatorName,
    `Created batch ${batch.batchNumber} with ${totalPieces} pieces. Sizes: ${sizes.join(', ')}`);
  return batch;
}

export async function deleteBatch(
  batchId: string,
  reason: string,
  deletedBy: string,
  deleterName: string,
  adminPassword: string,
) {
  if (!reason.trim()) throw new Error('Deletion reason is required');
  if (!adminPassword) throw new Error('Admin password is required to delete a batch');
  await requireAdminPassword(adminPassword);
  const batch = await db.batches.get(batchId);
  if (!batch) throw new Error('Batch not found');
  await db.batches.update(batchId, { isActive: false, deletedAt: now(), deleteReason: reason, deletedBy });
  await addAudit('BATCH_DELETED', 'deletion', 'batch', batchId, deletedBy, deleterName,
    `Deleted batch ${batch.batchNumber}. Reason: ${reason}`);
}

export async function getActiveBatches(): Promise<Batch[]> {
  return db.batches.where('isActive').equals(1).toArray();
}

export async function getBatchById(batchId: string): Promise<Batch | undefined> {
  return db.batches.get(batchId);
}

export async function getBatchesAtStage(stage: BatchStage): Promise<Batch[]> {
  return db.batches.where({ currentStage: stage, isActive: 1 }).toArray();
}

export async function getBatchStageRecords(batchId: string): Promise<BatchStageRecord[]> {
  return db.batchStageRecords.where('batchId').equals(batchId).toArray();
}

export async function getBatchStageRecord(batchId: string, stage: BatchStage): Promise<BatchStageRecord | undefined> {
  return db.batchStageRecords.where({ batchId, stage }).first();
}

// ---- TRANSFER OPERATIONS ----

export async function transferPieces(
  batchId: string,
  fromStage: BatchStage,
  toStage: BatchStage,
  piecesCount: number,
  transferredBy: string,
  transferrerName: string,
  targetHodId?: string,
  size?: string,
): Promise<BatchTransfer> {
  ensurePositive(piecesCount, 'Transfer count');
  const batch = await db.batches.get(batchId);
  if (!batch) throw new Error('Batch not found');

  const fromRecord = await getBatchStageRecord(batchId, fromStage);
  if (!fromRecord) throw new Error('Stage record not found');

  const availablePieces = fromRecord.acceptedPieces - fromRecord.piecesSentForward;
  if (piecesCount > availablePieces) {
    throw new Error(`Only ${availablePieces} pieces available for transfer`);
  }

  await db.batchStageRecords.update(fromRecord.id, {
    piecesSentForward: fromRecord.piecesSentForward + piecesCount,
  });

  let toRecord = await getBatchStageRecord(batchId, toStage);
  if (!toRecord) {
    toRecord = {
      id: generateId(),
      batchId,
      stage: toStage,
      assignedHodId: targetHodId,
      totalPiecesReceived: piecesCount,
      acceptedPieces: 0,
      rejectedPieces: 0,
      piecesProcessed: 0,
      piecesSentForward: 0,
      status: 'in_progress',
      startedAt: now(),
      createdAt: now(),
    };
    await db.batchStageRecords.add(toRecord);
  } else {
    await db.batchStageRecords.update(toRecord.id, {
      totalPiecesReceived: toRecord.totalPiecesReceived + piecesCount,
      assignedHodId: targetHodId || toRecord.assignedHodId,
    });
  }

  if (fromRecord.piecesSentForward + piecesCount >= fromRecord.acceptedPieces) {
    await db.batchStageRecords.update(fromRecord.id, { status: 'completed', completedAt: now() });
  }

  await db.batches.update(batchId, { status: 'in_progress', currentStage: toStage });

  const transfer: BatchTransfer = {
    id: generateId(),
    batchId,
    fromStage,
    toStage,
    piecesCount,
    transferredBy,
    targetHodId,
    size,
    createdAt: now(),
  };
  await db.batchTransfers.add(transfer);

  await addAudit('BATCH_TRANSFER', 'transfer', 'batch', batchId, transferredBy, transferrerName,
    `Transferred ${piecesCount} pieces from ${fromStage} to ${toStage} in batch ${batch.batchNumber}${targetHodId ? ` (assigned to HOD)` : ''}`,
    JSON.stringify({ fromStage, toStage, piecesCount, targetHodId, size }));
  return transfer;
}

export async function recordPieceEntry(
  batchId: string,
  stageRecordId: string,
  userId: string,
  userName: string,
  acceptedPieces: number,
  rejectedPieces: number,
  size?: string,
  notes?: string,
): Promise<PieceEntry> {
  ensureNonNegative(acceptedPieces, 'Accepted pieces');
  ensureNonNegative(rejectedPieces, 'Rejected pieces');
  if (acceptedPieces + rejectedPieces <= 0) throw new Error('Enter at least one piece');

  const stageRecord = await db.batchStageRecords.get(stageRecordId);
  if (!stageRecord) throw new Error('Stage record not found');

  const totalNew = acceptedPieces + rejectedPieces;
  const alreadyProcessed = stageRecord.piecesProcessed;
  if (alreadyProcessed + totalNew > stageRecord.totalPiecesReceived) {
    throw new Error(`Cannot process more pieces than received. Remaining: ${stageRecord.totalPiecesReceived - alreadyProcessed}`);
  }

  const entry: PieceEntry = {
    id: generateId(),
    batchId,
    stageRecordId,
    userId,
    acceptedPieces,
    rejectedPieces,
    totalPieces: totalNew,
    size,
    notes,
    createdAt: now(),
  };
  await db.pieceEntries.add(entry);

  await db.batchStageRecords.update(stageRecordId, {
    acceptedPieces: stageRecord.acceptedPieces + acceptedPieces,
    rejectedPieces: stageRecord.rejectedPieces + rejectedPieces,
    piecesProcessed: stageRecord.piecesProcessed + totalNew,
  });

  await addAudit('PIECE_ENTRY', 'batch', 'piece_entry', entry.id, userId, userName,
    `Recorded ${acceptedPieces} accepted, ${rejectedPieces} rejected pieces in batch stage`,
    JSON.stringify({ batchId, stage: stageRecord.stage, accepted: acceptedPieces, rejected: rejectedPieces }));
  return entry;
}

export async function sendRejectedToWelding(
  batchId: string,
  rejectedPieces: number,
  fromStage: BatchStage,
  transferredBy: string,
  transferrerName: string,
) {
  ensurePositive(rejectedPieces, 'Rejected pieces');
  return transferPieces(batchId, fromStage, 'welding', rejectedPieces, transferredBy, transferrerName);
}

export async function getBatchTransfers(batchId: string): Promise<BatchTransfer[]> {
  return db.batchTransfers.where('batchId').equals(batchId).toArray();
}

// ---- CONSUMER GOODS OPERATIONS ----

export async function createConsumerGoodItem(
  name: string,
  createdBy: string,
  creatorName: string,
  unit?: string,
): Promise<ConsumerGoodItem> {
  if (!name.trim()) throw new Error('Item name is required');
  const item: ConsumerGoodItem = {
    id: generateId(),
    name: name.trim(),
    unit,
    createdBy,
    createdAt: now(),
    isActive: true,
  };
  await db.consumerGoodItems.add(item);
  await addAudit('CONSUMER_GOOD_CREATED', 'consumer_goods', 'consumer_good', item.id, createdBy, creatorName,
    `Created consumer good item: ${name}`);
  return item;
}

export async function updateConsumerGoodItem(
  itemId: string,
  name: string,
  updatedBy: string,
  updaterName: string,
) {
  if (!name.trim()) throw new Error('Item name is required');
  const old = await db.consumerGoodItems.get(itemId);
  await db.consumerGoodItems.update(itemId, { name: name.trim() });
  await addAudit('CONSUMER_GOOD_UPDATED', 'consumer_goods', 'consumer_good', itemId, updatedBy, updaterName,
    `Updated consumer good from "${old?.name}" to "${name}"`);
}

export async function deleteConsumerGoodItem(
  itemId: string,
  reason: string,
  deletedBy: string,
  deleterName: string,
) {
  if (!reason.trim()) throw new Error('Deletion reason is required');
  const item = await db.consumerGoodItems.get(itemId);
  await db.consumerGoodItems.update(itemId, { isActive: false, deletedAt: now(), deleteReason: reason });
  await addAudit('CONSUMER_GOOD_DELETED', 'deletion', 'consumer_good', itemId, deletedBy, deleterName,
    `Deleted consumer good "${item?.name}". Reason: ${reason}`);
}

export async function getActiveConsumerGoods(): Promise<ConsumerGoodItem[]> {
  return db.consumerGoodItems.where('isActive').equals(1).toArray();
}

// ---- MATERIAL TYPE OPERATIONS ----

export async function createMaterialType(
  name: string,
  createdBy: string,
  creatorName: string,
  unit?: string,
): Promise<MaterialType> {
  if (!name.trim()) throw new Error('Material type name is required');
  const mt: MaterialType = {
    id: generateId(),
    name: name.trim(),
    unit,
    createdBy,
    createdAt: now(),
    isActive: true,
  };
  await db.materialTypes.add(mt);
  await addAudit('MATERIAL_TYPE_CREATED', 'material', 'material_type', mt.id, createdBy, creatorName,
    `Created material type: ${name}`);
  return mt;
}

export async function getActiveMaterialTypes(): Promise<MaterialType[]> {
  return db.materialTypes.where('isActive').equals(1).toArray();
}

export async function addMaterialEntry(
  materialTypeId: string,
  supplierName: string,
  price: number,
  quantity: number,
  unit: string,
  enteredBy: string,
  entererName: string,
  billPhoto?: string,
  isOpening?: boolean,
): Promise<MaterialEntry> {
  ensurePositive(price, 'Price');
  ensurePositive(quantity, 'Quantity');
  if (!materialTypeId) throw new Error('Material type is required');
  if (!supplierName.trim() && !isOpening) throw new Error('Supplier name is required');

  const entry: MaterialEntry = {
    id: generateId(),
    materialTypeId,
    supplierName: supplierName.trim() || (isOpening ? 'Opening Stock' : ''),
    billPhoto,
    price,
    quantity,
    remainingQuantity: quantity,
    unit,
    isOpening,
    enteredBy,
    createdAt: now(),
  };
  await db.materialEntries.add(entry);
  const mt = await db.materialTypes.get(materialTypeId);
  await addAudit(isOpening ? 'MATERIAL_OPENING_STOCK' : 'MATERIAL_ENTRY_ADDED', 'material', 'material_entry', entry.id, enteredBy, entererName,
    `${isOpening ? 'Opening stock' : 'Added entry'}: ${mt?.name} ${isOpening ? '' : `from ${supplierName}`}, qty: ${quantity} ${unit}, price: ₹${price}`,
    JSON.stringify({ materialTypeId, supplierName, price, quantity, isOpening }));

  await addStockToDepartment('store', quantity, unit, enteredBy, entererName);

  return entry;
}

export async function getMaterialEntries(materialTypeId?: string): Promise<MaterialEntry[]> {
  if (materialTypeId) {
    return db.materialEntries.where('materialTypeId').equals(materialTypeId).toArray();
  }
  return db.materialEntries.toArray();
}

export async function deleteMaterialType(
  materialTypeId: string,
  reason: string,
  deletedBy: string,
  deleterName: string,
  adminPassword: string,
): Promise<void> {
  if (!reason.trim()) throw new Error('Deletion reason is required');
  if (!adminPassword) throw new Error('Admin password is required');
  await requireAdminPassword(adminPassword);
  const mt = await db.materialTypes.get(materialTypeId);
  if (!mt) throw new Error('Material type not found');
  await db.materialTypes.update(materialTypeId, { isActive: false });
  await addAudit('MATERIAL_TYPE_DELETED', 'deletion', 'material_type', materialTypeId, deletedBy, deleterName,
    `Deleted material type: ${mt.name}. Reason: ${reason}`);
}

export async function deleteMaterialEntry(
  entryId: string,
  reason: string,
  deletedBy: string,
  deleterName: string,
  adminPassword: string,
): Promise<void> {
  if (!reason.trim()) throw new Error('Deletion reason is required');
  if (!adminPassword) throw new Error('Admin password is required');
  await requireAdminPassword(adminPassword);
  const entry = await db.materialEntries.get(entryId);
  if (!entry) throw new Error('Material entry not found');
  const mt = await db.materialTypes.get(entry.materialTypeId);
  await db.materialEntries.delete(entryId);
  await addAudit('MATERIAL_ENTRY_DELETED', 'deletion', 'material_entry', entryId, deletedBy, deleterName,
    `Deleted material entry: ${mt?.name || 'Unknown'}, qty: ${entry.quantity} ${entry.unit}, price: ₹${entry.price}. Reason: ${reason}`);
}

export async function getMaterialStockTotal(materialTypeId: string): Promise<{ totalQty: number; latestPrice: number; unit: string }> {
  const all = await db.materialEntries.where('materialTypeId').equals(materialTypeId).toArray();
  const totalQty = all.reduce((s, e) => s + (e.remainingQuantity ?? e.quantity), 0);
  const sorted = [...all].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const latestPrice = sorted.length > 0 ? sorted[sorted.length - 1].price : 0;
  const unit = sorted.length > 0 ? sorted[sorted.length - 1].unit : '';
  return { totalQty, latestPrice, unit };
}

// ---- CONSUMER GOODS USAGE ----

export async function recordConsumerGoodUsage(
  batchId: string,
  consumerGoodId: string,
  quantity: number,
  pricePerUnit: number,
  department: Department,
  userId: string,
  userName: string,
  stageRecordId?: string,
): Promise<ConsumerGoodUsage> {
  ensurePositive(quantity, 'Quantity');
  ensurePositive(pricePerUnit, 'Price per unit');

  const usage: ConsumerGoodUsage = {
    id: generateId(),
    batchId,
    stageRecordId,
    consumerGoodId,
    quantity,
    pricePerUnit,
    totalCost: quantity * pricePerUnit,
    department,
    userId,
    createdAt: now(),
  };
  await db.consumerGoodUsages.add(usage);

  const good = await db.consumerGoodItems.get(consumerGoodId);
  const batch = await db.batches.get(batchId);
  await addAudit('CONSUMER_GOOD_USED', 'consumer_goods', 'consumer_good_usage', usage.id, userId, userName,
    `Used ${quantity} units of "${good?.name}" (₹${pricePerUnit}/unit = ₹${usage.totalCost}) for batch ${batch?.batchNumber} in ${DEPARTMENT_LABELS[department] || department}`,
    JSON.stringify({ batchId, consumerGoodId, quantity, pricePerUnit, totalCost: usage.totalCost }));

  const user = await db.users.get(userId);
  if (user) {
    const admin = await db.users.where('role').equals('admin').first();
    if (admin) {
      await addAccountingEntry(userId, admin.id, 'hod_owes_admin', usage.totalCost,
        `Consumer goods: ${good?.name} (${quantity} x ₹${pricePerUnit}) for batch ${batch?.batchNumber}`, batchId, usage.id);
    }
  }

  return usage;
}

export async function getConsumerGoodUsages(filters: {
  batchId?: string;
  department?: Department;
  userId?: string;
}): Promise<ConsumerGoodUsage[]> {
  const results = await db.consumerGoodUsages.toArray();
  return results.filter(u => {
    if (filters.batchId && u.batchId !== filters.batchId) return false;
    if (filters.department && u.department !== filters.department) return false;
    if (filters.userId && u.userId !== filters.userId) return false;
    return true;
  });
}

// ---- SERVICE COST OPERATIONS ----

export async function recordServiceCost(
  batchId: string,
  department: Department,
  costPerPiece: number,
  totalPieces: number,
  enteredBy: string,
  entererName: string,
  size?: string,
  stageRecordId?: string,
  hodId?: string,
): Promise<ServiceCost> {
  ensurePositive(costPerPiece, 'Cost per piece');
  ensurePositive(totalPieces, 'Total pieces');

  const cost: ServiceCost = {
    id: generateId(),
    batchId,
    stageRecordId,
    department,
    costPerPiece,
    totalPieces,
    totalCost: costPerPiece * totalPieces,
    size,
    enteredBy,
    createdAt: now(),
  };
  await db.serviceCosts.add(cost);

  const batch = await db.batches.get(batchId);
  await addAudit('SERVICE_COST_RECORDED', 'cost', 'service_cost', cost.id, enteredBy, entererName,
    `Service cost for ${DEPARTMENT_LABELS[department] || department}: ₹${costPerPiece}/piece x ${totalPieces} = ₹${cost.totalCost} for batch ${batch?.batchNumber}${size ? ` (size: ${size})` : ''}`,
    JSON.stringify({ batchId, department, costPerPiece, totalPieces, totalCost: cost.totalCost, size }));

  const accountingHodId = hodId || enteredBy;
  const admin = await db.users.where('role').equals('admin').first();
  if (admin) {
    await addAccountingEntry(accountingHodId, admin.id, 'admin_owes_hod', cost.totalCost,
      `Service cost: ${DEPARTMENT_LABELS[department] || department} - ₹${costPerPiece}/piece x ${totalPieces} for batch ${batch?.batchNumber}${size ? ` (size: ${size})` : ''}`,
      batchId, cost.id);
  }

  return cost;
}

export async function updateServiceCost(
  costId: string,
  costPerPiece: number,
  updatedBy: string,
  updaterName: string,
) {
  ensurePositive(costPerPiece, 'Cost per piece');
  const old = await db.serviceCosts.get(costId);
  if (!old) throw new Error('Service cost not found');
  const newTotal = costPerPiece * old.totalPieces;
  await db.serviceCosts.update(costId, { costPerPiece, totalCost: newTotal });
  await addAudit('SERVICE_COST_UPDATED', 'cost', 'service_cost', costId, updatedBy, updaterName,
    `Updated service cost from ₹${old.costPerPiece}/piece to ₹${costPerPiece}/piece (total: ₹${old.totalCost} → ₹${newTotal})`);
}

export async function getServiceCosts(filters: {
  batchId?: string;
  department?: Department;
  enteredBy?: string;
}): Promise<ServiceCost[]> {
  const results = await db.serviceCosts.toArray();
  return results.filter(s => {
    if (filters.batchId && s.batchId !== filters.batchId) return false;
    if (filters.department && s.department !== filters.department) return false;
    if (filters.enteredBy && s.enteredBy !== filters.enteredBy) return false;
    return true;
  });
}

// ---- ACCOUNTING OPERATIONS ----

async function addAccountingEntry(
  hodId: string,
  adminId: string,
  type: AccountingEntry['type'],
  amount: number,
  description: string,
  batchId?: string,
  relatedCostId?: string,
) {
  const entry: AccountingEntry = {
    id: generateId(),
    hodId,
    adminId,
    type,
    amount,
    description,
    batchId,
    relatedCostId,
    createdAt: now(),
  };
  await db.accountingEntries.add(entry);
}

export async function getAccountingForHod(hodId: string): Promise<{
  hodOwesAdmin: number;
  adminOwesHod: number;
  entries: AccountingEntry[];
}> {
  const entries = await db.accountingEntries.where('hodId').equals(hodId).toArray();
  const payments = await db.paymentRecords.toArray();
  const relevantPayments = payments.filter(p =>
    (p.payerId === hodId || p.payeeId === hodId) && p.confirmed);

  let hodOwesAdmin = 0;
  let adminOwesHod = 0;

  for (const e of entries) {
    if (e.type === 'hod_owes_admin') hodOwesAdmin += e.amount;
    if (e.type === 'admin_owes_hod') adminOwesHod += e.amount;
  }

  for (const p of relevantPayments) {
    if (p.payerId === hodId) hodOwesAdmin -= p.amount;
    else adminOwesHod -= p.amount;
  }

  return { hodOwesAdmin: Math.max(0, hodOwesAdmin), adminOwesHod: Math.max(0, adminOwesHod), entries };
}

export async function getAllAccountingSummary(): Promise<Array<{
  hodId: string;
  hodName: string;
  department: Department;
  hodOwesAdmin: number;
  adminOwesHod: number;
}>> {
  const hods = await db.users.where({ role: 'hod', isActive: 1 }).toArray();
  const results = [];
  for (const hod of hods) {
    const acc = await getAccountingForHod(hod.id);
    results.push({
      hodId: hod.id,
      hodName: hod.firstName,
      department: hod.department,
      hodOwesAdmin: acc.hodOwesAdmin,
      adminOwesHod: acc.adminOwesHod,
    });
  }
  return results;
}

export async function makePayment(
  payerId: string,
  payerName: string,
  payeeId: string,
  amount: number,
  description: string,
): Promise<PaymentRecord> {
  ensurePositive(amount, 'Payment amount');
  const payment: PaymentRecord = {
    id: generateId(),
    payerId,
    payeeId,
    amount,
    confirmed: false,
    description,
    createdAt: now(),
  };
  await db.paymentRecords.add(payment);
  await addAudit('PAYMENT_MADE', 'payment', 'payment', payment.id, payerId, payerName,
    `Payment of ₹${amount}: ${description}`);
  return payment;
}

export async function confirmPayment(
  paymentId: string,
  confirmedBy: string,
  confirmerName: string,
) {
  const payment = await db.paymentRecords.get(paymentId);
  if (!payment) throw new Error('Payment not found');
  await db.paymentRecords.update(paymentId, {
    confirmed: true,
    confirmedBy,
    confirmedAt: now(),
  });
  await addAudit('PAYMENT_CONFIRMED', 'payment', 'payment', paymentId, confirmedBy, confirmerName,
    `Confirmed payment of ₹${payment.amount} from ${payment.payerId}`);
}

export async function getPendingPayments(userId: string): Promise<PaymentRecord[]> {
  const all = await db.paymentRecords.toArray();
  return all.filter(p => (p.payeeId === userId || p.payerId === userId) && !p.confirmed);
}

export async function getConfirmedPayments(userId: string): Promise<PaymentRecord[]> {
  const all = await db.paymentRecords.toArray();
  return all.filter(p => (p.payeeId === userId || p.payerId === userId) && p.confirmed);
}

// ---- CONSUMER GOODS INVENTORY ----

export async function addConsumerGoodToInventory(
  consumerGoodId: string,
  quantity: number,
  pricePerUnit: number,
  enteredBy: string,
  entererName: string,
  supplierName?: string,
  billPhoto?: string,
  isOpening?: boolean,
): Promise<ConsumerGoodInventory> {
  ensurePositive(quantity, 'Quantity');
  ensurePositive(pricePerUnit, 'Price per unit');

  const inv: ConsumerGoodInventory = {
    id: generateId(),
    consumerGoodId,
    quantity,
    remainingQuantity: quantity,
    pricePerUnit,
    isOpening,
    enteredBy,
    supplierName,
    billPhoto,
    createdAt: now(),
  };
  await db.consumerGoodInventory.add(inv);
  const good = await db.consumerGoodItems.get(consumerGoodId);
  await addAudit(isOpening ? 'INVENTORY_OPENING_STOCK' : 'INVENTORY_ADDED', 'consumer_goods', 'inventory', inv.id, enteredBy, entererName,
    `${isOpening ? 'Opening stock' : 'Added'} ${quantity} units of "${good?.name}" at ₹${pricePerUnit}/unit${supplierName ? ` from ${supplierName}` : ''}`);
  return inv;
}

export async function getConsumerGoodInventory(consumerGoodId?: string): Promise<ConsumerGoodInventory[]> {
  if (consumerGoodId) {
    return db.consumerGoodInventory.where('consumerGoodId').equals(consumerGoodId).toArray();
  }
  return db.consumerGoodInventory.toArray();
}

export async function getAvailableStock(consumerGoodId: string): Promise<ConsumerGoodInventory[]> {
  const all = await db.consumerGoodInventory.where('consumerGoodId').equals(consumerGoodId).toArray();
  return all.filter(inv => inv.remainingQuantity > 0).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function getAvailableStockTotal(consumerGoodId: string): Promise<{ totalQty: number; latestPrice: number }> {
  const stock = await getAvailableStock(consumerGoodId);
  const totalQty = stock.reduce((s, inv) => s + inv.remainingQuantity, 0);
  const latestPrice = stock.length > 0 ? stock[stock.length - 1].pricePerUnit : 0;
  return { totalQty, latestPrice };
}

// ---- CONSUMER GOODS RECEIPT / ISSUANCE ----

function generateReceiptNumber(): string {
  const chars = '0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return `RCT-${result}`;
}

export async function issueConsumerGoodsToHod(
  hodId: string,
  hodName: string,
  department: Department,
  items: Array<{ consumerGoodId: string; quantity: number }>,
  issuedBy: string,
  issuedByName: string,
  batchId?: string,
): Promise<ConsumerGoodReceipt> {
  const receiptItems: ConsumerGoodReceiptItem[] = [];
  let totalAmount = 0;

  for (const item of items) {
    ensurePositive(item.quantity, 'Quantity');
    const good = await db.consumerGoodItems.get(item.consumerGoodId);
    if (!good) throw new Error(`Consumer good not found`);

    const stock = await getAvailableStock(item.consumerGoodId);
    const totalAvailable = stock.reduce((s, inv) => s + inv.remainingQuantity, 0);
    if (totalAvailable < item.quantity) {
      throw new Error(`Insufficient stock for "${good.name}". Available: ${totalAvailable}, Requested: ${item.quantity}`);
    }

    let remaining = item.quantity;
    let totalCostForItem = 0;
    const inventoryEntries: Array<{ entryId: string; qty: number; price: number; supplier?: string }> = [];

    for (const inv of stock) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, inv.remainingQuantity);
      await db.consumerGoodInventory.update(inv.id, {
        remainingQuantity: inv.remainingQuantity - take,
      });
      totalCostForItem += take * inv.pricePerUnit;
      inventoryEntries.push({ entryId: inv.id, qty: take, price: inv.pricePerUnit, supplier: inv.supplierName });
      remaining -= take;
    }

    for (const entry of inventoryEntries) {
      receiptItems.push({
        consumerGoodId: item.consumerGoodId,
        consumerGoodName: good.name,
        quantity: entry.qty,
        pricePerUnit: entry.price,
        totalCost: entry.qty * entry.price,
        inventoryEntryId: entry.entryId,
        supplierName: entry.supplier,
      });
    }
    totalAmount += totalCostForItem;
  }

  const receipt: ConsumerGoodReceipt = {
    id: generateId(),
    receiptNumber: generateReceiptNumber(),
    hodId,
    hodName,
    department,
    issuedBy,
    issuedByName,
    items: receiptItems,
    totalAmount,
    batchId,
    createdAt: now(),
  };
  await db.consumerGoodReceipts.add(receipt);

  const admin = await db.users.where('role').equals('admin').first();
  if (admin) {
    await addAccountingEntry(hodId, admin.id, 'hod_owes_admin', totalAmount,
      `Consumer goods receipt ${receipt.receiptNumber}: ${receiptItems.map(i => `${i.consumerGoodName} x${i.quantity}`).join(', ')}`,
      batchId, receipt.id);
  }

  const batch = batchId ? await db.batches.get(batchId) : null;
  await addAudit('CONSUMER_GOODS_ISSUED', 'consumer_goods', 'receipt', receipt.id, issuedBy, issuedByName,
    `Issued consumer goods to ${hodName} (${DEPARTMENT_LABELS[department] || department}) - Receipt ${receipt.receiptNumber}, Total: ₹${totalAmount}${batch ? ` for batch ${batch.batchNumber}` : ''}`,
    JSON.stringify(receipt));

  return receipt;
}

export async function getReceiptsForHod(hodId: string): Promise<ConsumerGoodReceipt[]> {
  return db.consumerGoodReceipts.where('hodId').equals(hodId).toArray();
}

export async function getAllReceipts(): Promise<ConsumerGoodReceipt[]> {
  return db.consumerGoodReceipts.orderBy('createdAt').reverse().toArray();
}

export async function deleteReceipt(
  receiptId: string,
  deletedBy: string,
  deletedByName: string,
  reason: string,
  adminPassword: string,
) {
  if (!reason.trim()) throw new Error('Reason is required');
  await requireAdminPassword(adminPassword);

  const receipt = await db.consumerGoodReceipts.get(receiptId);
  if (!receipt) throw new Error('Receipt not found');

  for (const item of receipt.items) {
    const inv = await db.consumerGoodInventory.get(item.inventoryEntryId);
    if (inv) {
      await db.consumerGoodInventory.update(inv.id, {
        remainingQuantity: inv.remainingQuantity + item.quantity,
      });
    }
  }

  const allEntries = await db.accountingEntries.where('relatedCostId').equals(receiptId).toArray();
  for (const entry of allEntries) {
    await db.accountingEntries.delete(entry.id);
  }

  await db.consumerGoodReceipts.delete(receiptId);

  await addAudit('RECEIPT_DELETED', 'deletion', 'receipt', receiptId, deletedBy, deletedByName,
    `Deleted receipt ${receipt.receiptNumber} (₹${receipt.totalAmount}) issued to ${receipt.hodName}. Reason: ${reason}`);
}

// ---- FINAL PRODUCT OPERATIONS ----

// ---- FINAL PRODUCT TYPE OPERATIONS ----

export async function createFinalProductType(
  name: string,
  createdBy: string,
  creatorName: string,
): Promise<FinalProductType> {
  if (!name.trim()) throw new Error('Product type name is required');
  const pt: FinalProductType = {
    id: generateId(),
    name: name.trim(),
    createdBy,
    createdAt: now(),
    isActive: true,
  };
  await db.finalProductTypes.add(pt);
  await addAudit('PRODUCT_TYPE_CREATED', 'product', 'final_product_type', pt.id, createdBy, creatorName,
    `Created product type: ${name}`);
  return pt;
}

export async function getActiveFinalProductTypes(): Promise<FinalProductType[]> {
  return db.finalProductTypes.where('isActive').equals(1).toArray();
}

export async function deleteFinalProductType(
  typeId: string,
  reason: string,
  deletedBy: string,
  deleterName: string,
  adminPassword: string,
): Promise<void> {
  if (!reason.trim()) throw new Error('Deletion reason is required');
  if (!adminPassword) throw new Error('Admin password is required');
  await requireAdminPassword(adminPassword);
  const pt = await db.finalProductTypes.get(typeId);
  if (!pt) throw new Error('Product type not found');
  await db.finalProductTypes.update(typeId, { isActive: false });
  await addAudit('PRODUCT_TYPE_DELETED', 'deletion', 'final_product_type', typeId, deletedBy, deleterName,
    `Deleted product type: ${pt.name}. Reason: ${reason}`);
}

export async function createFinalProduct(
  name: string,
  unit: string,
  createdBy: string,
  creatorName: string,
  size?: string,
  productTypeId?: string,
): Promise<FinalProduct> {
  if (!name.trim()) throw new Error('Product name is required');
  const product: FinalProduct = {
    id: generateId(),
    name: name.trim(),
    productTypeId: productTypeId || undefined,
    size: size?.trim() || undefined,
    unit: unit.trim() || 'pcs',
    createdBy,
    createdAt: now(),
    isActive: true,
  };
  await db.finalProducts.add(product);
  await addAudit('PRODUCT_CREATED', 'product', 'final_product', product.id, createdBy, creatorName,
    `Created final product: ${name}${size ? ` (Size: ${size})` : ''}`);
  return product;
}

export async function getActiveFinalProducts(): Promise<FinalProduct[]> {
  return db.finalProducts.where('isActive').equals(1).toArray();
}

export async function deleteFinalProduct(
  productId: string,
  reason: string,
  deletedBy: string,
  deleterName: string,
  adminPassword: string,
): Promise<void> {
  if (!reason.trim()) throw new Error('Deletion reason is required');
  if (!adminPassword) throw new Error('Admin password is required');
  await requireAdminPassword(adminPassword);
  const product = await db.finalProducts.get(productId);
  if (!product) throw new Error('Product not found');
  await db.finalProducts.update(productId, { isActive: false, deletedAt: now() });
  await addAudit('PRODUCT_DELETED', 'deletion', 'final_product', productId, deletedBy, deleterName,
    `Deleted final product: ${product.name}${product.size ? ` (${product.size})` : ''}. Reason: ${reason}`);
}

export async function addFinalProductStock(
  productId: string,
  quantity: number,
  enteredBy: string,
  entererName: string,
  batchId?: string,
  isOpening?: boolean,
): Promise<FinalProductStockEntry> {
  ensurePositive(quantity, 'Quantity');
  const entry: FinalProductStockEntry = {
    id: generateId(),
    productId,
    quantity,
    remainingQuantity: quantity,
    batchId,
    isOpening,
    enteredBy,
    createdAt: now(),
  };
  await db.finalProductStock.add(entry);
  const product = await db.finalProducts.get(productId);
  await addAudit(isOpening ? 'PRODUCT_OPENING_STOCK' : 'PRODUCT_STOCK_ADDED', 'product', 'final_product_stock', entry.id, enteredBy, entererName,
    `${isOpening ? 'Opening stock' : 'Added stock'} for ${product?.name}: ${quantity} ${product?.unit}`);
  return entry;
}

export async function getFinalProductStockEntries(productId?: string): Promise<FinalProductStockEntry[]> {
  if (productId) return db.finalProductStock.where('productId').equals(productId).toArray();
  return db.finalProductStock.toArray();
}

export async function getFinalProductStockTotal(productId: string): Promise<number> {
  const entries = await db.finalProductStock.where('productId').equals(productId).toArray();
  return entries.reduce((s, e) => s + (e.remainingQuantity ?? e.quantity), 0);
}

// ---- DEPARTMENT STOCK OPERATIONS ----

export async function getDepartmentStock(department?: string): Promise<DepartmentStock[]> {
  if (department) {
    return db.departmentStock.where({ department, isActive: 1 }).toArray();
  }
  return db.departmentStock.where('isActive').equals(1).toArray();
}

export async function getDepartmentStockById(id: string): Promise<DepartmentStock | undefined> {
  return db.departmentStock.get(id);
}

export async function addStockToDepartment(
  department: string,
  quantity: number,
  unit: string,
  addedBy: string,
  addedByName: string,
  productId?: string,
  size?: string,
): Promise<DepartmentStock> {
  ensurePositive(quantity, 'Quantity');

  if (department === 'pressing' && !size) {
    throw new Error('Size is compulsory for pressing department stock');
  }

  if (department === 'welding') {
    size = undefined;
  }

  const existing = await db.departmentStock.where({ department, isActive: 1 }).toArray();
  const match = existing.find(s =>
    (s.productId || '') === (productId || '') &&
    (s.size || '') === (size || '')
  );

  if (match) {
    const newQty = match.quantity + quantity;
    await db.departmentStock.update(match.id, {
      quantity: newQty,
      lastUpdatedBy: addedBy,
      lastUpdatedAt: now(),
    });
    await addAudit('STOCK_ADDED', 'transfer', 'department_stock', match.id, addedBy, addedByName,
      `Added ${quantity} ${unit} to ${DEPARTMENT_LABELS[department] || department}${size ? ` (${size})` : ''}. New total: ${newQty}`);
    return { ...match, quantity: newQty, lastUpdatedBy: addedBy, lastUpdatedAt: now() };
  }

  const stock: DepartmentStock = {
    id: generateId(),
    department,
    productId: productId || undefined,
    size: size || undefined,
    quantity,
    unit,
    lastUpdatedBy: addedBy,
    lastUpdatedAt: now(),
    createdAt: now(),
    isActive: true,
  };
  await db.departmentStock.add(stock);
  await addAudit('STOCK_ADDED', 'transfer', 'department_stock', stock.id, addedBy, addedByName,
    `Added ${quantity} ${unit} to ${DEPARTMENT_LABELS[department] || department}${size ? ` (${size})` : ''}`);
  return stock;
}

export async function editDepartmentStock(
  stockId: string,
  newQuantity: number,
  reason: string,
  adjustedBy: string,
  adjustedByName: string,
  adminPassword: string,
): Promise<void> {
  ensureNonNegative(newQuantity, 'Quantity');
  if (!reason.trim()) throw new Error('Reason for adjustment is required');
  await requireAdminPassword(adminPassword);

  const stock = await db.departmentStock.get(stockId);
  if (!stock) throw new Error('Stock entry not found');

  const adjustment: StockAdjustment = {
    id: generateId(),
    departmentStockId: stockId,
    department: stock.department,
    previousQuantity: stock.quantity,
    newQuantity,
    reason: reason.trim(),
    adjustedBy,
    adjustedByName,
    createdAt: now(),
  };
  await db.stockAdjustments.add(adjustment);

  await db.departmentStock.update(stockId, {
    quantity: newQuantity,
    lastUpdatedBy: adjustedBy,
    lastUpdatedAt: now(),
  });

  await addAudit('STOCK_ADJUSTED', 'transfer', 'department_stock', stockId, adjustedBy, adjustedByName,
    `Adjusted stock in ${DEPARTMENT_LABELS[stock.department] || stock.department}${stock.size ? ` (${stock.size})` : ''}: ${stock.quantity} → ${newQuantity}. Reason: ${reason}`);
}

export async function transferStock(
  fromDepartment: string,
  toDepartment: string,
  targetHodId: string,
  quantity: number,
  transferredBy: string,
  transferredByName: string,
  productId?: string,
  size?: string,
  notes?: string,
): Promise<StockTransfer> {
  ensurePositive(quantity, 'Transfer quantity');

  if (fromDepartment === 'pressing' && !size) {
    throw new Error('Size is compulsory for transfers from pressing department');
  }

  const sourceStock = await db.departmentStock.where({ department: fromDepartment, isActive: 1 }).toArray();
  const sourceMatch = sourceStock.find(s =>
    (s.productId || '') === (productId || '') &&
    (s.size || '') === (size || '')
  );

  if (!sourceMatch || sourceMatch.quantity < quantity) {
    const available = sourceMatch?.quantity ?? 0;
    throw new Error(`Insufficient stock. Available: ${available}, Requested: ${quantity}`);
  }

  const unit = sourceMatch.unit;

  const newSourceQty = sourceMatch.quantity - quantity;
  await db.departmentStock.update(sourceMatch.id, {
    quantity: newSourceQty,
    lastUpdatedBy: transferredBy,
    lastUpdatedAt: now(),
  });

  const inheritedSize = toDepartment === 'welding' ? undefined : (size || sourceMatch.size);
  const inheritedProductId = productId || sourceMatch.productId;

  await addStockToDepartment(
    toDepartment, quantity, unit, transferredBy, transferredByName,
    inheritedProductId, inheritedSize,
  );

  // Auto-add to final product stock when packaging→store
  if (fromDepartment === 'packaging' && toDepartment === 'store' && inheritedProductId) {
    const product = await db.finalProducts.get(inheritedProductId);
    if (product && product.isActive) {
      await addFinalProductStock(inheritedProductId, quantity, transferredBy, transferredByName);
    }
  }

  const transfer: StockTransfer = {
    id: generateId(),
    fromDepartment,
    toDepartment,
    targetHodId,
    productId: inheritedProductId,
    size: inheritedSize,
    quantity,
    unit,
    transferredBy,
    transferredByName,
    notes: notes?.trim() || undefined,
    createdAt: now(),
  };
  await db.stockTransfers.add(transfer);

  await addAudit('STOCK_TRANSFERRED', 'transfer', 'stock_transfer', transfer.id, transferredBy, transferredByName,
    `Transferred ${quantity} ${unit} from ${DEPARTMENT_LABELS[fromDepartment] || fromDepartment} to ${DEPARTMENT_LABELS[toDepartment] || toDepartment}${inheritedSize ? ` (${inheritedSize})` : ''}`,
    JSON.stringify({ fromDepartment, toDepartment, targetHodId, quantity, productId: inheritedProductId, size: inheritedSize }));

  return transfer;
}

export async function getStockTransfers(filters?: {
  fromDepartment?: string;
  toDepartment?: string;
}): Promise<StockTransfer[]> {
  const all = await db.stockTransfers.toArray();
  if (!filters) return all;
  return all.filter(t => {
    if (filters.fromDepartment && t.fromDepartment !== filters.fromDepartment) return false;
    if (filters.toDepartment && t.toDepartment !== filters.toDepartment) return false;
    return true;
  });
}

export async function getStockAdjustments(department?: string): Promise<StockAdjustment[]> {
  if (department) {
    return db.stockAdjustments.where('department').equals(department).toArray();
  }
  return db.stockAdjustments.toArray();
}

export async function deleteDepartmentStock(
  stockId: string,
  reason: string,
  deletedBy: string,
  deleterName: string,
  adminPassword: string,
): Promise<void> {
  if (!reason.trim()) throw new Error('Deletion reason is required');
  await requireAdminPassword(adminPassword);
  const stock = await db.departmentStock.get(stockId);
  if (!stock) throw new Error('Stock entry not found');
  await db.departmentStock.update(stockId, { isActive: false });
  await addAudit('STOCK_DELETED', 'deletion', 'department_stock', stockId, deletedBy, deleterName,
    `Deleted stock in ${DEPARTMENT_LABELS[stock.department] || stock.department}${stock.size ? ` (${stock.size})` : ''}, qty: ${stock.quantity}. Reason: ${reason}`);
}

// ---- AUDIT OPERATIONS ----

export async function getAuditLogs(filters?: {
  category?: AuditLog['category'];
  userId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<AuditLog[]> {
  let results = await db.auditLogs.orderBy('createdAt').reverse().toArray();
  if (filters) {
    results = results.filter(log => {
      if (filters.category && log.category !== filters.category) return false;
      if (filters.userId && log.userId !== filters.userId) return false;
      if (filters.startDate && log.createdAt < filters.startDate) return false;
      if (filters.endDate && log.createdAt > filters.endDate) return false;
      return true;
    });
  }
  return results;
}

// ---- STATISTICS ----

export async function getBatchStatistics(batchId: string) {
  const batch = await db.batches.get(batchId);
  const stages = await db.batchStageRecords.where('batchId').equals(batchId).toArray();
  const transfers = await db.batchTransfers.where('batchId').equals(batchId).toArray();
  const pieceEntries = await db.pieceEntries.where('batchId').equals(batchId).toArray();
  const consumerUsages = await db.consumerGoodUsages.where('batchId').equals(batchId).toArray();
  const serviceCosts = await db.serviceCosts.where('batchId').equals(batchId).toArray();

  const totalConsumerCost = consumerUsages.reduce((sum, u) => sum + u.totalCost, 0);
  const totalServiceCost = serviceCosts.reduce((sum, s) => sum + s.totalCost, 0);

  const costBreakdown: Record<string, { consumerGoods: number; serviceCost: number }> = {};
  for (const u of consumerUsages) {
    if (!costBreakdown[u.department]) costBreakdown[u.department] = { consumerGoods: 0, serviceCost: 0 };
    costBreakdown[u.department].consumerGoods += u.totalCost;
  }
  for (const s of serviceCosts) {
    if (!costBreakdown[s.department]) costBreakdown[s.department] = { consumerGoods: 0, serviceCost: 0 };
    costBreakdown[s.department].serviceCost += s.totalCost;
  }

  return {
    batch,
    stages,
    transfers,
    pieceEntries,
    consumerUsages,
    serviceCosts,
    totalConsumerCost,
    totalServiceCost,
    totalCost: totalConsumerCost + totalServiceCost,
    costBreakdown,
  };
}

export async function getUserStatistics(userId: string) {
  const user = await db.users.get(userId);
  const pieceEntries = await db.pieceEntries.where('userId').equals(userId).toArray();
  const consumerUsages = await db.consumerGoodUsages.where('userId').equals(userId).toArray();
  const serviceCosts = await db.serviceCosts.where('enteredBy').equals(userId).toArray();

  const totalAccepted = pieceEntries.reduce((sum, e) => sum + e.acceptedPieces, 0);
  const totalRejected = pieceEntries.reduce((sum, e) => sum + e.rejectedPieces, 0);
  const totalConsumerCost = consumerUsages.reduce((sum, u) => sum + u.totalCost, 0);
  const totalServiceCost = serviceCosts.reduce((sum, s) => sum + s.totalCost, 0);

  const batchIds = [...new Set(pieceEntries.map(e => e.batchId))];
  const batches = await Promise.all(batchIds.map(id => db.batches.get(id)));

  return {
    user,
    pieceEntries,
    consumerUsages,
    serviceCosts,
    totalAccepted,
    totalRejected,
    totalPieces: totalAccepted + totalRejected,
    acceptanceRate: totalAccepted + totalRejected > 0 ? (totalAccepted / (totalAccepted + totalRejected)) * 100 : 0,
    rejectionRate: totalAccepted + totalRejected > 0 ? (totalRejected / (totalAccepted + totalRejected)) * 100 : 0,
    totalConsumerCost,
    totalServiceCost,
    batchCount: batchIds.length,
    batches: batches.filter(Boolean),
  };
}

export async function getPeriodStatistics(period: 'week' | 'month' | 'year' | 'all') {
  const { start, end } = getDateRange(period);
  const startStr = start.toISOString();
  const endStr = end.toISOString();

  const allBatches = await db.batches.where('isActive').equals(1).toArray();
  const batches = period === 'all' ? allBatches : allBatches.filter(b => b.createdAt >= startStr && b.createdAt <= endStr);

  const batchIds = batches.map(b => b.id);

  const allPieceEntries = await db.pieceEntries.toArray();
  const pieceEntries = allPieceEntries.filter(e => batchIds.includes(e.batchId));

  const allConsumerUsages = await db.consumerGoodUsages.toArray();
  const consumerUsages = allConsumerUsages.filter(u => batchIds.includes(u.batchId));

  const allServiceCosts = await db.serviceCosts.toArray();
  const serviceCosts = allServiceCosts.filter(s => batchIds.includes(s.batchId));

  return {
    period,
    batchCount: batches.length,
    totalPieces: batches.reduce((sum, b) => sum + b.totalPieces, 0),
    totalAccepted: pieceEntries.reduce((sum, e) => sum + e.acceptedPieces, 0),
    totalRejected: pieceEntries.reduce((sum, e) => sum + e.rejectedPieces, 0),
    totalConsumerCost: consumerUsages.reduce((sum, u) => sum + u.totalCost, 0),
    totalServiceCost: serviceCosts.reduce((sum, s) => sum + s.totalCost, 0),
    batches,
  };
}

export async function getHodBatchesInProgress(hodId: string): Promise<{ batch: Batch; stageRecord: BatchStageRecord }[]> {
  const records = await db.batchStageRecords.where({ assignedHodId: hodId, status: 'in_progress' }).toArray();
  const results = [];
  for (const record of records) {
    const batch = await db.batches.get(record.batchId);
    if (batch && batch.isActive) {
      results.push({ batch, stageRecord: record });
    }
  }
  return results;
}

export async function getDepartmentConsumerUsageTotal(department: Department, hodId: string): Promise<number> {
  const hodUsers = await getUsersByCreator(hodId);
  const userIds = [hodId, ...hodUsers.map(u => u.id)];

  const allUsages = await db.consumerGoodUsages.where('department').equals(department).toArray();
  return allUsages
    .filter(u => userIds.includes(u.userId))
    .reduce((sum, u) => sum + u.totalCost, 0);
}

export async function getPieceEntriesByUser(userId: string): Promise<PieceEntry[]> {
  return db.pieceEntries.where('userId').equals(userId).toArray();
}

export async function getAllBatches(): Promise<Batch[]> {
  return db.batches.toArray();
}
