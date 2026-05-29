/**
 * Encryption Utility
 * Provides secure password hashing and token generation using Cloudflare Native WebCrypto API.
 */

// Format: pbkdf2:sha256:iterations$salt$hash
const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16;
const HASH_LENGTH = 32;

/**
 * Generate a random cryptographically secure hex string
 * @param length Length of the string (in bytes, resulting hex will be 2x length)
 * @returns Hex string
 */
export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Encodes an ArrayBuffer or Uint8Array to a hex string
 */
function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const view = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(view)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Decodes a hex string to an ArrayBuffer
 */
function hexToBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes.buffer;
}

/**
 * Derives a key using PBKDF2
 */
async function derivePBKDF2Key(password: string, saltBuffer: ArrayBuffer | Uint8Array, iterations: number): Promise<ArrayBuffer> {
  const passwordBuffer = new TextEncoder().encode(password);
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  
  return await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: iterations,
      hash: 'SHA-256'
    },
    keyMaterial,
    HASH_LENGTH * 8
  );
}

/**
 * Hashes a password using PBKDF2
 * @param password The plain text password
 * @returns The formatted hash string
 */
export async function hashPassword(password: string): Promise<string> {
  const saltArray = new Uint8Array(SALT_LENGTH);
  crypto.getRandomValues(saltArray);
  
  const hashBuffer = await derivePBKDF2Key(password, saltArray, PBKDF2_ITERATIONS);
  
  const saltHex = bufferToHex(saltArray);
  const hashHex = bufferToHex(hashBuffer);
  
  return `pbkdf2:sha256:${PBKDF2_ITERATIONS}$${saltHex}$${hashHex}`;
}

/**
 * Verifies a password against a stored PBKDF2 hash
 * @param password The plain text password
 * @param storedHash The formatted hash string from the database
 * @returns True if the password matches, false otherwise
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  // Check if it's our PBKDF2 format
  if (!storedHash.startsWith('pbkdf2:sha256:')) {
    // If we needed bcrypt fallback, we would handle it here
    console.warn('Unknown password hash format');
    return false;
  }
  
  const parts = storedHash.split('$');
  if (parts.length !== 3) return false;
  
  const iterationsPart = parts[0].split(':');
  if (iterationsPart.length !== 3) return false;
  
  const iterations = parseInt(iterationsPart[2], 10);
  const saltHex = parts[1];
  const expectedHashHex = parts[2];
  
  const saltBuffer = hexToBuffer(saltHex);
  const expectedHashBuffer = hexToBuffer(expectedHashHex);
  
  // Hash the incoming password with the stored salt and iterations
  const computedHashBuffer = await derivePBKDF2Key(password, saltBuffer, iterations);
  
  // Timing-safe comparison to prevent timing attacks
  // In Cloudflare Workers, we must compare ArrayBuffers directly if using timingSafeEqual (if available)
  // Wait, crypto.subtle.timingSafeEqual doesn't exist in standard WebCrypto.
  // Instead, we can do a constant-time comparison manually or check if the platform provides it.
  // A simple bitwise constant-time compare:
  const computedArray = new Uint8Array(computedHashBuffer);
  const expectedArray = new Uint8Array(expectedHashBuffer);
  
  if (computedArray.length !== expectedArray.length) {
    return false;
  }
  
  let diff = 0;
  for (let i = 0; i < computedArray.length; i++) {
    diff |= computedArray[i] ^ expectedArray[i];
  }
  
  return diff === 0;
}
