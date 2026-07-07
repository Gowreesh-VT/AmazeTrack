import { getFreshAccessToken } from "@/lib/googleTokens";
import { prisma } from "@/lib/prisma";
import { initUserData, getWriteQueue } from "@/lib/driveSync";
import { readAppDataFile } from "@/lib/driveClient";
import { requireUserId } from "@/lib/apiAuth";
import { z } from "zod";

const budgetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  categoryIds: z.array(z.string()),
  limitAmount: z.number().positive(),
  periodType: z.enum(["weekly", "monthly", "semester", "custom"]),
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
});

const goalSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  targetAmount: z.number().positive(),
  currentAmount: z.number().nonnegative(),
  targetDate: z.string().optional(),
});

const allowanceConfigSchema = z.object({
  amount: z.number().positive(),
  cycleType: z.enum(["monthly", "semester"]),
  cycleStart: z.string().min(1),
  cycleEnd: z.string().optional(),
});

const patchSchema = z.object({
  budgets: z.array(budgetSchema).optional(),
  goals: z.array(goalSchema).optional(),
  allowanceConfig: allowanceConfigSchema.nullable().optional(),
});

export async function GET() {
  try {
    const userId = await requireUserId();
    const accessToken = await getFreshAccessToken(userId);
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { driveFileId: true } });
    const fileId = user?.driveFileId;

    if (!fileId) {
      const initialized = await initUserData(userId, accessToken);
      await prisma.user.update({ where: { id: userId }, data: { driveFileId: initialized.fileId } });
      return Response.json(initialized.data);
    }

    return Response.json(await readAppDataFile(accessToken, fileId));
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = await requireUserId();
    const body = await request.json();
    const input = patchSchema.parse(body);
    
    const accessToken = await getFreshAccessToken(userId);
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { driveFileId: true } });
    const fileId = user?.driveFileId;
    
    if (!fileId) {
      return Response.json({ error: "Drive not initialized" }, { status: 400 });
    }
    
    const data = await readAppDataFile(accessToken, fileId);
    const timestamp = new Date().toISOString();
    
    const nextData = {
      ...data,
      ...(input.budgets !== undefined ? { budgets: input.budgets } : {}),
      ...(input.goals !== undefined ? { goals: input.goals } : {}),
      ...(input.allowanceConfig !== undefined ? { allowanceConfig: input.allowanceConfig ?? undefined } : {}),
      updatedAt: timestamp,
    };
    
    await getWriteQueue(userId, accessToken, fileId).scheduleWrite(nextData);
    return Response.json(nextData);
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const { driveData } = await request.json();
    if (!driveData) {
      return Response.json({ error: "Missing driveData" }, { status: 400 });
    }

    const accessToken = await getFreshAccessToken(userId);
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { driveFileId: true } });
    const fileId = user?.driveFileId;

    if (!fileId) {
      return Response.json({ error: "Drive not initialized" }, { status: 400 });
    }

    await getWriteQueue(userId, accessToken, fileId).scheduleWrite(driveData);
    return Response.json(driveData);
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 400 });
  }
}

