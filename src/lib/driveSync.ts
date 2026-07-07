import { createAppDataFile, findAppDataFile, readAppDataFile, writeAppDataFile } from "./driveClient";
import { DriveData, Transaction, emptyDriveData } from "./types";

type QueuedWrite = {
  data: DriveData;
  resolve: () => void;
  reject: (error: unknown) => void;
};

const queues = new Map<string, ReturnType<typeof createWriteQueue>>();

export async function initUserData(userId: string, accessToken: string) {
  const existing = await findAppDataFile(accessToken);

  if (existing) {
    const data = await readAppDataFile(accessToken, existing.id);
    if (!data.categories.length) {
      const seeded = emptyDriveData(userId);
      data.categories = seeded.categories;
      data.updatedAt = new Date().toISOString();
      await writeAppDataFile(accessToken, existing.id, data);
    }
    return { fileId: existing.id, data };
  }

  const data = emptyDriveData(userId);
  const file = await createAppDataFile(accessToken, data);
  return { fileId: file.id, data };
}

export function mergeDriveData(local: DriveData, remote: DriveData): DriveData {
  const transactionMap = new Map<string, Transaction>();

  for (const transaction of [...remote.transactions, ...local.transactions]) {
    const current = transactionMap.get(transaction.id);
    if (!current || new Date(transaction.updatedAt) > new Date(current.updatedAt)) {
      transactionMap.set(transaction.id, transaction);
    }
  }

  return {
    ...remote,
    ...local,
    categories: local.categories.length ? local.categories : remote.categories,
    transactions: Array.from(transactionMap.values()),
    updatedAt: new Date().toISOString(),
  };
}

export async function mergeAndWrite(accessToken: string, fileId: string, nextData: DriveData) {
  const remote = await readAppDataFile(accessToken, fileId);
  const merged = mergeDriveData(nextData, remote);
  await writeAppDataFile(accessToken, fileId, merged);
  return merged;
}

export function createWriteQueue(accessToken: string, fileId: string, quietMs = 400) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: QueuedWrite | null = null;

  async function flush() {
    const job = pending;
    pending = null;
    timer = null;
    if (!job) return;

    try {
      await mergeAndWrite(accessToken, fileId, job.data);
      job.resolve();
    } catch (firstError) {
      try {
        await new Promise((resolve) => setTimeout(resolve, 600));
        await mergeAndWrite(accessToken, fileId, job.data);
        job.resolve();
      } catch {
        job.reject(firstError);
      }
    }
  }

  return {
    scheduleWrite(data: DriveData) {
      if (pending) {
        pending.data = data;
      }

      const promise = new Promise<void>((resolve, reject) => {
        pending = { data, resolve, reject };
      });

      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, quietMs);
      return promise;
    },
  };
}

export function getWriteQueue(userId: string, accessToken: string, fileId: string) {
  const key = `${userId}:${fileId}`;
  const queue = queues.get(key) ?? createWriteQueue(accessToken, fileId);
  queues.set(key, queue);
  return queue;
}

export function addTransaction(data: DriveData, transaction: Transaction) {
  if (data.transactions.some((item) => item.id === transaction.id)) {
    return data;
  }

  return {
    ...data,
    transactions: [...data.transactions, transaction],
    updatedAt: new Date().toISOString(),
  };
}
