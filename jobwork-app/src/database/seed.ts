import { db } from './db';
import { hashPassword } from '../utils/crypto';

// Fixed ids so concurrent first-loads from different devices converge on the
// same admin row instead of creating duplicates in the shared database.
const ADMIN_ID = '00000000-0000-0000-0000-000000000001';
const INIT_LOG_ID = '00000000-0000-0000-0000-000000000002';

export async function seedDatabase() {
  const adminCount = await db.users.where('username').equals('adminHVD@$SAC@$123').count();
  if (adminCount > 0) return;

  await db.users.put({
    id: ADMIN_ID,
    username: 'adminHVD@$SAC@$123',
    passwordHash: hashPassword('RHS@$123'),
    firstName: 'Admin',
    role: 'admin',
    department: 'store',
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    isActive: true,
  });

  await db.auditLogs.put({
    id: INIT_LOG_ID,
    action: 'SYSTEM_INIT',
    category: 'general',
    entityType: 'system',
    entityId: 'system',
    userId: ADMIN_ID,
    userName: 'System',
    details: 'System initialized with admin account',
    createdAt: new Date().toISOString(),
  });
}
