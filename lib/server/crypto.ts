import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "./state";

export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString("base64url");
export const sha256 = (value: string) => crypto.createHash("sha256").update(value).digest("hex");

export function hashPassword(password: string, salt = randomToken(16)) {
  return { salt, hash: crypto.scryptSync(password, salt, 64).toString("hex") };
}

export function verifyPassword(password: string, record: { salt: string; hash: string }) {
  const candidate = Buffer.from(hashPassword(password, record.salt).hash, "hex");
  const stored = Buffer.from(record.hash, "hex");
  return candidate.length === stored.length && crypto.timingSafeEqual(candidate, stored);
}

/**
 * Key for encrypting network tokens at rest: TOKEN_ENCRYPTION_KEY (32 bytes, base64) if set,
 * otherwise a key generated once into .data/secret.key. Losing the key means reconnecting accounts.
 */
let key: Buffer | null = null;
function encryptionKey() {
  if (key) return key;
  const fromEnv = process.env.TOKEN_ENCRYPTION_KEY;
  if (fromEnv) {
    key = Buffer.from(fromEnv, "base64");
    if (key.length !== 32) throw new Error("TOKEN_ENCRYPTION_KEY must be 32 bytes, base64-encoded.");
    return key;
  }
  if (!DATA_DIR) return (key = crypto.randomBytes(32));
  const file = path.join(DATA_DIR, "secret.key");
  if (!fs.existsSync(file)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(file, crypto.randomBytes(32).toString("base64"), { mode: 0o600 });
  }
  return (key = Buffer.from(fs.readFileSync(file, "utf8"), "base64"));
}

/** AES-256-GCM; output is iv.tag.ciphertext in base64url. */
export function encrypt(plain: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString("base64url")).join(".");
}

export function decrypt(sealed: string) {
  const [iv, tag, data] = sealed.split(".").map((p) => Buffer.from(p, "base64url"));
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
