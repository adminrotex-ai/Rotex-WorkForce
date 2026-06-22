import CryptoJS from 'crypto-js';

const SALT = 'JOBWORK_SECURE_SALT_2024';

export function hashPassword(password: string): string {
  return CryptoJS.SHA256(password + SALT).toString();
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}
