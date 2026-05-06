import CryptoJS from 'crypto-js';

// The 'Key' used to scramble the student data.
const SECRET_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'beach-secure-key-2026';

/**
 * Turns readable text into scrambled gibberish (AES-256)
 */
export const encryptData = (text: string) => {
  return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
};

/**
 * Turns scrambled gibberish back into readable text
 */
export const decryptData = (ciphertext: string) => {
  const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};