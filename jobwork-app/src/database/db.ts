import { supabase } from './supabaseClient';
import type {
  User, Batch, BatchStageRecord, BatchTransfer, PieceEntry,
  ConsumerGoodItem, MaterialType, MaterialEntry, ConsumerGoodUsage,
  ServiceCost, AccountingEntry, PaymentRecord, AuditLog,
  ConsumerGoodInventory, ConsumerGoodReceipt, SyncQueueItem,
  CustomDepartment, FinalProductType, FinalProduct, FinalProductStockEntry,
  DepartmentStock, StockTransfer, StockAdjustment,
} from '../types';

// ---------------------------------------------------------------------------
// Shared cloud data layer (Supabase / Postgres).
//
// Every record is stored as a JSON document: each table is `id text` + `doc
// jsonb`. This adapter exposes the small slice of the Dexie API the app relies
// on (toArray / get / add / put / update / delete / where(...).equals() /
// where({...}) / orderBy().reverse() / count), so data is now shared across
// every device instead of living in each browser's IndexedDB.
// ---------------------------------------------------------------------------

// Fields stored as booleans but sometimes queried with 1/0. Normalising them
// keeps `where('isActive').equals(1)` matching a stored `true`.
const BOOLEAN_FIELDS = new Set(['isActive', 'confirmed', 'synced', 'isOpening']);

function jsonCol(field: string): string {
  return `doc->>${field}`;
}

function coerce(field: string, value: unknown): string {
  if (BOOLEAN_FIELDS.has(field)) {
    const truthy = value === true || value === 1 || value === '1' || value === 'true';
    return truthy ? 'true' : 'false';
  }
  return String(value);
}

interface Filter { field: string; value: unknown }
interface DocRow<T> { id: string; doc: T }

class DocQuery<T> {
  private table: string;
  private filters: Filter[];
  private orderField?: string;
  private descending: boolean;

  constructor(table: string, filters: Filter[] = [], orderField?: string, descending = false) {
    this.table = table;
    this.filters = filters;
    this.orderField = orderField;
    this.descending = descending;
  }

  reverse(): this {
    this.descending = !this.descending;
    return this;
  }

  private base() {
    let q = supabase.from(this.table).select('id,doc');
    for (const f of this.filters) q = q.eq(jsonCol(f.field), coerce(f.field, f.value));
    if (this.orderField) q = q.order(jsonCol(this.orderField), { ascending: !this.descending });
    return q;
  }

  async toArray(): Promise<T[]> {
    const { data, error } = await this.base();
    if (error) throw new Error(error.message);
    return ((data ?? []) as DocRow<T>[]).map(r => r.doc);
  }

  async first(): Promise<T | undefined> {
    const { data, error } = await this.base().limit(1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as DocRow<T>[];
    return rows.length ? rows[0].doc : undefined;
  }

  async count(): Promise<number> {
    let q = supabase.from(this.table).select('id', { count: 'exact', head: true });
    for (const f of this.filters) q = q.eq(jsonCol(f.field), coerce(f.field, f.value));
    const { count, error } = await q;
    if (error) throw new Error(error.message);
    return count ?? 0;
  }
}

class DocTable<T extends { id: string }> {
  private table: string;

  constructor(table: string) {
    this.table = table;
  }

  where(field: string): { equals: (value: unknown) => DocQuery<T> };
  where(criteria: Record<string, unknown>): DocQuery<T>;
  where(arg: string | Record<string, unknown>): { equals: (value: unknown) => DocQuery<T> } | DocQuery<T> {
    if (typeof arg === 'string') {
      return { equals: (value: unknown) => new DocQuery<T>(this.table, [{ field: arg, value }]) };
    }
    const filters = Object.entries(arg).map(([field, value]) => ({ field, value }));
    return new DocQuery<T>(this.table, filters);
  }

  orderBy(field: string): DocQuery<T> {
    return new DocQuery<T>(this.table, [], field, false);
  }

  async toArray(): Promise<T[]> {
    return new DocQuery<T>(this.table).toArray();
  }

  async get(id: string): Promise<T | undefined> {
    const { data, error } = await supabase
      .from(this.table)
      .select('doc')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? (data as { doc: T }).doc : undefined;
  }

  async add(obj: T): Promise<string> {
    const { error } = await supabase.from(this.table).insert({ id: obj.id, doc: obj });
    if (error) throw new Error(error.message);
    return obj.id;
  }

  async put(obj: T): Promise<string> {
    const { error } = await supabase.from(this.table).upsert({ id: obj.id, doc: obj });
    if (error) throw new Error(error.message);
    return obj.id;
  }

  async update(id: string, changes: Partial<T>): Promise<number> {
    const current = await this.get(id);
    if (!current) return 0;
    const merged = { ...current, ...changes };
    const { error } = await supabase.from(this.table).update({ doc: merged }).eq('id', id);
    if (error) throw new Error(error.message);
    return 1;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from(this.table).delete().eq('id', id);
    if (error) throw new Error(error.message);
  }
}

export const db = {
  users: new DocTable<User>('jw_users'),
  batches: new DocTable<Batch>('jw_batches'),
  batchStageRecords: new DocTable<BatchStageRecord>('jw_batch_stage_records'),
  batchTransfers: new DocTable<BatchTransfer>('jw_batch_transfers'),
  pieceEntries: new DocTable<PieceEntry>('jw_piece_entries'),
  consumerGoodItems: new DocTable<ConsumerGoodItem>('jw_consumer_good_items'),
  materialTypes: new DocTable<MaterialType>('jw_material_types'),
  materialEntries: new DocTable<MaterialEntry>('jw_material_entries'),
  consumerGoodUsages: new DocTable<ConsumerGoodUsage>('jw_consumer_good_usages'),
  serviceCosts: new DocTable<ServiceCost>('jw_service_costs'),
  accountingEntries: new DocTable<AccountingEntry>('jw_accounting_entries'),
  paymentRecords: new DocTable<PaymentRecord>('jw_payment_records'),
  auditLogs: new DocTable<AuditLog>('jw_audit_logs'),
  consumerGoodInventory: new DocTable<ConsumerGoodInventory>('jw_consumer_good_inventory'),
  consumerGoodReceipts: new DocTable<ConsumerGoodReceipt>('jw_consumer_good_receipts'),
  syncQueue: new DocTable<SyncQueueItem>('jw_sync_queue'),
  customDepartments: new DocTable<CustomDepartment>('jw_custom_departments'),
  finalProductTypes: new DocTable<FinalProductType>('jw_final_product_types'),
  finalProducts: new DocTable<FinalProduct>('jw_final_products'),
  finalProductStock: new DocTable<FinalProductStockEntry>('jw_final_product_stock'),
  departmentStock: new DocTable<DepartmentStock>('jw_department_stock'),
  stockTransfers: new DocTable<StockTransfer>('jw_stock_transfers'),
  stockAdjustments: new DocTable<StockAdjustment>('jw_stock_adjustments'),
};
