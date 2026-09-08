import Dexie, { type Table } from "dexie";
import { dataSchema, emptyData, type Data } from "./domain";
import { dayKey } from "./domain";
import { energyModel } from "./model";
export class Store extends Dexie {
  state!: Table<{ key: string; data: Data }, string>;
  snapshots!: Table<{ id?: number; time: string; data: Data }, number>;
  foodCache!: Table<{ key: string; at: string; payload: unknown }, string>;
  constructor(name = "daywell") {
    super(name);
    this.version(1).stores({ state: "key", snapshots: "++id,time" });
    this.version(2).stores({
      state: "key",
      snapshots: "++id,time",
      foodCache: "key,at",
    });
  }
}
export const db = new Store();
export async function readData() {
  return dataSchema.parse(
    (await db.state.get("main"))?.data ?? structuredClone(emptyData),
  );
}
export async function writeData(data: Data, expected?: Data) {
  const valid = dataSchema.parse(data);
  await db.transaction("rw", db.state, async () => {
    const current = await db.state.get("main");
    if (expected && current) {
      const stored = JSON.stringify(dataSchema.parse(current.data));
      if (
        stored !== JSON.stringify(dataSchema.parse(expected)) &&
        stored !== JSON.stringify(valid)
      )
        throw Error(
          "Another tab or save changed your journal. Reload before trying this edit again.",
        );
    }
    await db.state.put({ key: "main", data: valid });
  });
}
export async function restoreData(data: Data) {
  const valid = dataSchema.parse(data);
  await db.transaction("rw", db.state, db.snapshots, async () => {
    const current = await db.state.get("main");
    if (current)
      await db.snapshots.add({
        time: new Date().toISOString(),
        data: current.data,
      });
    await db.state.put({ key: "main", data: valid });
  });
}
const b64 = (a: Uint8Array) =>
  btoa(Array.from(a, (x) => String.fromCharCode(x)).join(""));
const un64 = (s: string) => Uint8Array.from(atob(s), (x) => x.charCodeAt(0));
async function key(password: string, salt: Uint8Array) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: 600000,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}
async function hash(bytes: Uint8Array) {
  return b64(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", bytes as BufferSource),
    ),
  );
}
export async function encryptBackup(data: Data, password: string) {
  if (password.length < 10)
    throw Error("Use a password of at least 10 characters.");
  const bytes = new TextEncoder().encode(
    JSON.stringify(
      dataSchema.parse(
        data.profile
          ? {
              ...data,
              modelSnapshots: [
                energyModel(data, dayKey(new Date(), data.profile.timezone)),
              ],
            }
          : data,
      ),
    ),
  );
  const salt = crypto.getRandomValues(new Uint8Array(16)),
    iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await key(password, salt),
    bytes,
  );
  return JSON.stringify({
    format: "daywell",
    version: 1,
    appVersion: "1.0.0",
    modelVersion: "energy-1.0",
    createdAt: new Date().toISOString(),
    kdf: "PBKDF2-SHA256",
    iterations: 600000,
    cipher: "AES-256-GCM",
    salt: b64(salt),
    iv: b64(iv),
    checksum: await hash(bytes),
    payload: b64(new Uint8Array(encrypted)),
  });
}
export async function decryptBackup(
  text: string,
  password: string,
): Promise<Data> {
  try {
    const e = JSON.parse(text);
    if (
      e.format !== "daywell" ||
      e.version !== 1 ||
      e.iterations !== 600000 ||
      e.cipher !== "AES-256-GCM"
    )
      throw Error();
    const bytes = new Uint8Array(
      await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: un64(e.iv) },
        await key(password, un64(e.salt)),
        un64(e.payload),
      ),
    );
    if ((await hash(bytes)) !== e.checksum) throw Error();
    return dataSchema.parse(JSON.parse(new TextDecoder().decode(bytes)));
  } catch {
    throw Error(
      "Unable to restore: wrong password, damaged file, or unsupported backup version. Your current data is unchanged.",
    );
  }
}
export function download(
  content: string,
  name: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function csv(rows: unknown[][]) {
  return rows
    .map((row) =>
      row
        .map(
          (v) =>
            '"' +
            String(v ?? "")
              .replace(/^[=+@-]/, "'$&")
              .replaceAll('"', '""') +
            '"',
        )
        .join(","),
    )
    .join("\r\n");
}
export async function setLock(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const k = await key(password, salt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const proof = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    k,
    new TextEncoder().encode("daywell-unlock"),
  );
  localStorage.setItem(
    "daywell-lock",
    JSON.stringify({
      salt: b64(salt),
      iv: b64(iv),
      proof: b64(new Uint8Array(proof)),
    }),
  );
}
export async function unlock(password: string) {
  try {
    const e = JSON.parse(localStorage.getItem("daywell-lock")!);
    await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: un64(e.iv) },
      await key(password, un64(e.salt)),
      un64(e.proof),
    );
    return true;
  } catch {
    return false;
  }
}
