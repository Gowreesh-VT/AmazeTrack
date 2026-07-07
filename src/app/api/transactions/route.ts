import { z } from "zod";
import { requireUserId } from "@/lib/apiAuth";
import { readAppDataFile } from "@/lib/driveClient";
import { addTransaction, getWriteQueue, initUserData } from "@/lib/driveSync";
import { getFreshAccessToken } from "@/lib/googleTokens";
import { prisma } from "@/lib/prisma";
import type { DriveData, Transaction } from "@/lib/types";

const transactionSchema = z.object({
  id: z.string().uuid(),
  amount: z.number().positive(),
  type: z.enum(["expense", "income", "debt", "credit"]).default("expense"),
  categoryId: z.string().min(1),
  subcategoryId: z.string().optional(),
  note: z.string().max(160).optional(),
  spentAt: z.string().datetime(),
  splitRequestId: z.string().optional(),
});

async function loadUserDrive(userId: string) {
  const accessToken = await getFreshAccessToken(userId);
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { driveFileId: true } });

  if (!user?.driveFileId) {
    const initialized = await initUserData(userId, accessToken);
    await prisma.user.update({ where: { id: userId }, data: { driveFileId: initialized.fileId } });
    return { accessToken, fileId: initialized.fileId, data: initialized.data };
  }

  return {
    accessToken,
    fileId: user.driveFileId,
    data: await readAppDataFile(accessToken, user.driveFileId),
  };
}

async function persist(userId: string, accessToken: string, fileId: string, data: DriveData) {
  await getWriteQueue(userId, accessToken, fileId).scheduleWrite(data);
}

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const input = transactionSchema.parse(await request.json());
    const { accessToken, fileId, data } = await loadUserDrive(userId);
    const timestamp = new Date().toISOString();
    const transaction: Transaction = {
      ...input,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const nextData = addTransaction(data, transaction);

    await persist(userId, accessToken, fileId, nextData);
    return Response.json(transaction, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 400 });
  }
}
