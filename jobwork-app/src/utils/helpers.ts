import { v4 as uuid } from 'uuid';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import type { BatchStage, Department } from '../types';
import { STAGE_ORDER, STAGE_TO_DEPARTMENT } from '../types';

export function generateBatchNumber(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `BATCH-${result}`;
}

export function generateId(): string {
  return uuid();
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string): string {
  return format(new Date(date), 'dd MMM yyyy, hh:mm a');
}

export function formatDateShort(date: string): string {
  return format(new Date(date), 'dd MMM yyyy');
}

export function getNextStage(currentStage: BatchStage): BatchStage | null {
  const idx = STAGE_ORDER.indexOf(currentStage);
  if (idx === -1 || idx >= STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[idx + 1];
}

export function getPreviousStage(currentStage: BatchStage): BatchStage | null {
  const idx = STAGE_ORDER.indexOf(currentStage);
  if (idx <= 0) return null;
  return STAGE_ORDER[idx - 1];
}

export function getNextDepartmentForStage(stage: BatchStage): Department | null {
  const next = getNextStage(stage);
  if (!next) return null;
  return STAGE_TO_DEPARTMENT[next];
}

export function getDateRange(period: 'week' | 'month' | 'year' | 'all'): { start: Date; end: Date } {
  const now = new Date();
  switch (period) {
    case 'week':
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'month':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'year':
      return { start: startOfYear(now), end: endOfYear(now) };
    case 'all':
      return { start: new Date(2000, 0, 1), end: new Date(2100, 0, 1) };
  }
}

export function getRejectionWeldingStage(): BatchStage {
  return 'welding';
}

export function canUserAccessBatch(userDept: Department, batchStage: BatchStage): boolean {
  return STAGE_TO_DEPARTMENT[batchStage] === userDept;
}
