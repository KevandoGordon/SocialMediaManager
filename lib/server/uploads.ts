import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "./state";

/** Uploaded files live next to the data file, named by media id. In memory mode they're kept in a map. */
const memory = new Map<string, Buffer>();
const dir = () => path.join(DATA_DIR!, "uploads");

export function writeUpload(id: string, data: Buffer) {
  if (!DATA_DIR) return void memory.set(id, data);
  fs.mkdirSync(dir(), { recursive: true });
  fs.writeFileSync(path.join(dir(), id), data, { mode: 0o600 });
}

export function readUpload(id: string): Buffer | null {
  if (!DATA_DIR) return memory.get(id) ?? null;
  const file = path.join(dir(), id);
  return fs.existsSync(file) ? fs.readFileSync(file) : null;
}

export function removeUpload(id: string) {
  if (!DATA_DIR) return void memory.delete(id);
  fs.rmSync(path.join(dir(), id), { force: true });
}
