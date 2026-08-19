import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

export const PIN_LENGTH = 6;
export const MAX_PIN_ATTEMPTS = 10;
export const UNLOCK_TTL_MS = 60 * 60 * 1000;

const PBKDF2_ITERATIONS = 120_000;

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function bytesToBase64(bytes: Uint8Array): string {
  let output = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] ?? 0;
    const b = bytes[i + 1];
    const c = bytes[i + 2];
    output += B64[a >> 2];
    output += B64[((a & 3) << 4) | ((b ?? 0) >> 4)];
    output += b === undefined ? '=' : B64[((b & 15) << 2) | ((c ?? 0) >> 6)];
    output += c === undefined ? '=' : B64[c & 63];
  }
  return output;
}

function base64ToBytes(value: string): Uint8Array {
  const cleaned = value.replace(/[^A-Za-z0-9+/=]/g, '');
  const len = cleaned.length;
  const outLen = Math.floor((len * 3) / 4) - (cleaned.endsWith('==') ? 2 : cleaned.endsWith('=') ? 1 : 0);
  const bytes = new Uint8Array(outLen);
  let byteIndex = 0;
  for (let i = 0; i < len; i += 4) {
    const enc1 = B64.indexOf(cleaned[i] ?? 'A');
    const enc2 = B64.indexOf(cleaned[i + 1] ?? 'A');
    const enc3 = B64.indexOf(cleaned[i + 2] ?? 'A');
    const enc4 = B64.indexOf(cleaned[i + 3] ?? 'A');
    const chr1 = (enc1 << 2) | (enc2 >> 4);
    const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    const chr3 = ((enc3 & 3) << 6) | enc4;
    bytes[byteIndex++] = chr1;
    if (cleaned[i + 2] !== '=') bytes[byteIndex++] = chr2;
    if (cleaned[i + 3] !== '=') bytes[byteIndex++] = chr3;
  }
  return bytes.slice(0, byteIndex);
}

export async function generateSalt(): Promise<string> {
  return bytesToBase64(await Crypto.getRandomBytesAsync(16));
}

async function hashPinWeb(pin: string, saltB64: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error('Web Crypto unavailable');
  const enc = new TextEncoder();
  const keyMaterial = await subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: base64ToBytes(saltB64) as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  return bytesToBase64(new Uint8Array(bits));
}

async function hashPinNative(pin: string, saltB64: string): Promise<string> {
  let data = `${saltB64}:${pin}`;
  for (let i = 0; i < 2000; i += 1) {
    data = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, data);
  }
  return data;
}

export async function hashPin(pin: string, saltB64: string): Promise<string> {
  if (Platform.OS === 'web' && globalThis.crypto?.subtle) {
    return hashPinWeb(pin, saltB64);
  }
  return hashPinNative(pin, saltB64);
}

export async function verifyPin(pin: string, saltB64: string, expectedHash: string): Promise<boolean> {
  const actual = await hashPin(pin, saltB64);
  return actual === expectedHash;
}

export function isValidPin(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}
