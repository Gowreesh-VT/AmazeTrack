import { describe, it, expect, vi, beforeEach } from "vitest";
import { mergeDriveData, initUserData, addTransaction, createWriteQueue } from "@/lib/driveSync";
import * as driveClient from "@/lib/driveClient";
import { DriveData, Transaction, emptyDriveData } from "@/lib/types";

vi.mock("@/lib/driveClient", () => ({
  findAppDataFile: vi.fn(),
  readAppDataFile: vi.fn(),
  writeAppDataFile: vi.fn(),
  createAppDataFile: vi.fn(),
}));

describe("Phase 1: Drive Sync & CRUD", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  describe("Multi-tab conflict test (mergeDriveData)", () => {
    it("should merge transactions by ID without clobbering each other", () => {
      const baseData = emptyDriveData("user-1");
      
      const txX: Transaction = {
        id: "tx-x-uuid",
        amount: 100,
        type: "expense",
        categoryId: "food",
        spentAt: "2026-07-01T10:00:00.000Z",
        createdAt: "2026-07-01T10:00:00.000Z",
        updatedAt: "2026-07-01T10:00:00.000Z",
      };

      const txY: Transaction = {
        id: "tx-y-uuid",
        amount: 200,
        type: "expense",
        categoryId: "laundry",
        spentAt: "2026-07-01T11:00:00.000Z",
        createdAt: "2026-07-01T11:00:00.000Z",
        updatedAt: "2026-07-01T11:00:00.000Z",
      };

      // Tab A adds X, does not know about Y
      const localDataA: DriveData = {
        ...baseData,
        transactions: [txX],
      };

      // Tab B adds Y, does not know about X
      const localDataB: DriveData = {
        ...baseData,
        transactions: [txY],
      };

      // Simulating Tab B merging its data into a remote state that has X (written by Tab A)
      const merged = mergeDriveData(localDataB, localDataA);

      expect(merged.transactions).toHaveLength(2);
      expect(merged.transactions.find(t => t.id === "tx-x-uuid")).toBeDefined();
      expect(merged.transactions.find(t => t.id === "tx-y-uuid")).toBeDefined();
    });

    it("should retain the latest transaction edit based on updatedAt", () => {
      const baseData = emptyDriveData("user-1");

      const txOld: Transaction = {
        id: "tx-x-uuid",
        amount: 100,
        type: "expense",
        categoryId: "food",
        spentAt: "2026-07-01T10:00:00.000Z",
        createdAt: "2026-07-01T10:00:00.000Z",
        updatedAt: "2026-07-01T10:00:00.000Z",
      };

      const txNew: Transaction = {
        id: "tx-x-uuid",
        amount: 120, // Updated amount
        type: "expense",
        categoryId: "food",
        spentAt: "2026-07-01T10:00:00.000Z",
        createdAt: "2026-07-01T10:00:00.000Z",
        updatedAt: "2026-07-01T10:05:00.000Z", // Later update
      };

      const merged = mergeDriveData({ ...baseData, transactions: [txNew] }, { ...baseData, transactions: [txOld] });
      const tx = merged.transactions.find(t => t.id === "tx-x-uuid");
      expect(tx?.amount).toBe(120);
    });
  });

  describe("Debounce & Retry test (createWriteQueue)", () => {
    it("should debounce subsequent writes and retry on transient failures", async () => {
      const dataA = emptyDriveData("user-1");
      const queue = createWriteQueue("token", "file-123", 400);

      const mockWrite = vi.spyOn(driveClient, "writeAppDataFile");
      const mockRead = vi.spyOn(driveClient, "readAppDataFile");

      // Mock success read
      mockRead.mockResolvedValue(emptyDriveData("user-1"));
      // First write attempt fails, second succeeds
      mockWrite
        .mockRejectedValueOnce(new Error("Transient Error"))
        .mockResolvedValueOnce({ id: "file-123", modifiedTime: "now" });

      const p1 = queue.scheduleWrite(dataA);

      // Fast forward past debounce window (400ms) to trigger flush
      await vi.advanceTimersByTimeAsync(400);
      // Fast forward past retry delay (600ms)
      await vi.advanceTimersByTimeAsync(600);

      await expect(p1).resolves.not.toThrow();
      expect(mockWrite).toHaveBeenCalledTimes(2);
    });

    it("should not retry-loop infinitely on permanent failures and surface error", async () => {
      const dataA = emptyDriveData("user-1");
      const queue = createWriteQueue("token", "file-123", 400);

      const mockWrite = vi.spyOn(driveClient, "writeAppDataFile");
      const mockRead = vi.spyOn(driveClient, "readAppDataFile");

      mockRead.mockResolvedValue(emptyDriveData("user-1"));
      mockWrite.mockRejectedValue(new Error("Permanent API Block"));

      const p1 = queue.scheduleWrite(dataA);
      p1.catch(() => {}); // Suppress unhandled rejection warning in Node.js test environment

      await vi.advanceTimersByTimeAsync(400);
      await vi.advanceTimersByTimeAsync(600);

      await expect(p1).rejects.toThrow("Permanent API Block");
      expect(mockWrite).toHaveBeenCalledTimes(2); // Initial try + 1 retry
    });
  });

  describe("Idempotent write test", () => {
    it("should add transaction only once if same UUID is supplied", () => {
      const baseData = emptyDriveData("user-1");
      const tx: Transaction = {
        id: "same-uuid",
        amount: 50,
        type: "expense",
        categoryId: "food",
        spentAt: "2026-07-01T10:00:00.000Z",
        createdAt: "2026-07-01T10:00:00.000Z",
        updatedAt: "2026-07-01T10:00:00.000Z",
      };

      const step1 = addTransaction(baseData, tx);
      const step2 = addTransaction(step1, tx);

      expect(step1.transactions).toHaveLength(1);
      expect(step2.transactions).toHaveLength(1);
    });
  });

  describe("First login seed test", () => {
    it("should seed default hostel categories for a brand new user", async () => {
      const mockFind = vi.spyOn(driveClient, "findAppDataFile").mockResolvedValue(null);
      const mockCreate = vi.spyOn(driveClient, "createAppDataFile").mockResolvedValue({ id: "new-file-id", modifiedTime: "now" });

      const res = await initUserData("user-new", "token");

      expect(mockFind).toHaveBeenCalledWith("token");
      expect(mockCreate).toHaveBeenCalled();
      expect(res.data.categories.length).toBeGreaterThan(0);
      expect(res.data.categories[0].name).toBe("Mess/Canteen");
    });
  });
});
