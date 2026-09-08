import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import Dexie from "dexie";
import { Store } from "../src/storage";
import {
  db,
  writeData,
  readData,
  restoreData,
  encryptBackup,
  decryptBackup,
  csv,
} from "../src/storage";
import { emptyData, defaultProfile } from "../src/domain";
beforeEach(async () => {
  await db.state.clear();
  await db.snapshots.clear();
});
describe("durable data and backup", () => {
  it("upgrades the initial database without losing diary data", async () => {
    const old = new Dexie("daywell-migration-test");
    old.version(1).stores({ state: "key", snapshots: "++id,time" });
    await old.table("state").put({ key: "main", data: emptyData });
    old.close();
    const current = new Store("daywell-migration-test");
    await current.open();
    expect((await current.state.get("main"))?.data).toEqual(emptyData);
    expect(await current.foodCache.count()).toBe(0);
    await current.delete();
  });
  it("rejects a stale write from another tab", async () => {
    const baseline = structuredClone(emptyData);
    await writeData(baseline);
    const updated = { ...baseline, profile: defaultProfile() };
    await writeData(updated, baseline);
    await expect(
      writeData(
        {
          ...baseline,
          profile: { ...defaultProfile(), name: "Different tab" },
        },
        baseline,
      ),
    ).rejects.toThrow("Another tab");
    expect(await readData()).toEqual(updated);
  });
  it("opens a fresh v1 database and round trips a profile", async () => {
    const d = { ...structuredClone(emptyData), profile: defaultProfile() };
    await writeData(d);
    expect(await readData()).toEqual(d);
  });
  it("retains prior state during transactional restore", async () => {
    const before = { ...structuredClone(emptyData), profile: defaultProfile() };
    await writeData(before);
    await restoreData(emptyData);
    expect((await db.snapshots.toArray())[0].data).toEqual(before);
    expect((await readData()).profile).toBeNull();
  });
  it("rejects invalid restore without changing saved data", async () => {
    await writeData(emptyData);
    await expect(
      restoreData({ ...emptyData, version: 99 } as any),
    ).rejects.toThrow();
    expect(await readData()).toEqual(emptyData);
  });
  it("encrypts round trip and rejects wrong passwords or corruption", async () => {
    const d = { ...structuredClone(emptyData), profile: defaultProfile() };
    const encrypted = await encryptBackup(d, "a long private password");
    expect(encrypted).not.toContain("heightCm");
    expect(
      await decryptBackup(encrypted, "a long private password"),
    ).toMatchObject(d);
    await expect(decryptBackup(encrypted, "wrong password")).rejects.toThrow(
      "wrong password",
    );
    const e = JSON.parse(encrypted);
    e.payload = e.payload.slice(0, -8) + "AAAAAAAA";
    await expect(
      decryptBackup(JSON.stringify(e), "a long private password"),
    ).rejects.toThrow();
  }, 15000);
  it("neutralizes spreadsheet formulas in CSV", () => {
    expect(csv([["=CMD()", 'a"b']])).toBe('"\'=CMD()","a""b"');
  });
});
