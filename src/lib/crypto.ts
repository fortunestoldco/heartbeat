import CryptoJS from 'crypto-js';

const SALT = process.env.NEXT_PUBLIC_SALT || 'failsafe-salt-key';

export function encryptPassword(password: string): string {
  return CryptoJS.SHA256(password + SALT).toString();
}

export function verifyPassword(inputPassword: string, storedHash: string): boolean {
  const inputHash = encryptPassword(inputPassword);
  return inputHash === storedHash;
}