import { stringUtils } from 'mvc-common-toolkit';

export function generateOtpToken(): string {
  return stringUtils.generatePassword(32).replace(/[^a-zA-Z ]/g, '');
}

export function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
