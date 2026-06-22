import { v4 as uuid } from 'uuid';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import type { BatchStage, Department } from '../types';
import { STAGE_ORDER, STAGE_TO_DEPARTMENT, DEPARTMENT_LABELS } from '../types';

export function deptLabel(key: string | undefined | null): string {
  if (!key) return '';
  return DEPARTMENT_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, m => m.toUpperCase());
}

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

const IST_FORMATTER = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
});

const IST_SHORT_FORMATTER = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

export function formatDate(date: string): string {
  return `${IST_FORMATTER.format(new Date(date))} IST`;
}

export function formatDateShort(date: string): string {
  return IST_SHORT_FORMATTER.format(new Date(date));
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function currentISTString(): string {
  return `${IST_FORMATTER.format(new Date())} IST`;
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

export function deptKeyFromLabel(label: string): string {
  return label.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}
