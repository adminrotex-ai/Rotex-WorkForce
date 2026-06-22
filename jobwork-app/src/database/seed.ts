import { db } from './db';
import { hashPassword } from '../utils/crypto';
import { v4 as uuid } from 'uuid';

export async function seedDatabase() {
  const adminCount = await db.users.where('username').equals('adminHVD@$SAC@$123').count();
  if (adminCount > 0) return;

  const adminId = uuid();
  await db.users.add({
    id: adminId,
    username: 'adminHVD@$SAC@$123',
    passwordHash: hashPassword('RHS@$123'),
    firstName: 'Admin',
    role: 'admin',
    department: 'store',
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    isActive: true,
  });

  await db.auditLogs.add({
    id: uuid(),
    action: 'SYSTEM_INIT',
    category: 'general',
    entityType: 'system',
    entityId: 'system',
    userId: adminId,
    userName: 'System',
    details: 'System initialized with admin account',
    createdAt: new Date().toISOString(),
  });
}
