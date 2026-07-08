import { z } from "zod";
import { requireUserId } from "@/lib/apiAuth";
import { readAppDataFile } from "@/lib/driveClient";
import { getWriteQueue, initUserData } from "@/lib/driveSync";
import { getFreshAccessToken } from "@/lib/googleTokens";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  amount: z.number().positive().optional(),
  type: z.enum(["expense", "income", "debt", "credit"]).optional(),
  categoryId: z.string().min(1).optional(),
  subcategoryId: z.string().optional(),
  note: z.string().max(160).optional(),
  spentAt: z.string().datetime().optional(),
  splitRequestId: z.string().optional(),
  isAmortized: z.boolean().optional(),
  amortizeMonths: z.number().int().positive().optional(),
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

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const input = updateSchema.parse(await request.json());
    const { accessToken, fileId, data } = await loadUserDrive(userId);
    const timestamp = new Date().toISOString();
    const transactions = data.transactions.map((transaction) =>
      transaction.id === id ? { ...transaction, ...input, updatedAt: timestamp } : transaction,
    );

    if (!transactions.some((transaction) => transaction.id === id)) {
      return Response.json({ error: "Transaction not found" }, { status: 404 });
    }

    const nextData = { ...data, transactions, updatedAt: timestamp };
    await getWriteQueue(userId, accessToken, fileId).scheduleWrite(nextData);
    return Response.json(transactions.find((transaction) => transaction.id === id));
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const { accessToken, fileId, data } = await loadUserDrive(userId);
    const timestamp = new Date().toISOString();
    const transactions = data.transactions.map((transaction) =>
      transaction.id === id ? { ...transaction, deletedAt: timestamp, updatedAt: timestamp } : transaction,
    );

    if (!transactions.some((transaction) => transaction.id === id)) {
      return Response.json({ error: "Transaction not found" }, { status: 404 });
    }

    const nextData = { ...data, transactions, updatedAt: timestamp };
    await getWriteQueue(userId, accessToken, fileId).scheduleWrite(nextData);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 400 });
  }
}
