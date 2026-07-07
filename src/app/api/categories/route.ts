import { z } from "zod";
import { requireUserId } from "@/lib/apiAuth";
import { readAppDataFile } from "@/lib/driveClient";
import { getWriteQueue, initUserData } from "@/lib/driveSync";
import { getFreshAccessToken } from "@/lib/googleTokens";
import { prisma } from "@/lib/prisma";
import type { Category } from "@/lib/types";

const categorySchema = z.object({
  name: z.string().min(1).max(40),
  parentId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const input = categorySchema.parse(await request.json());
    const accessToken = await getFreshAccessToken(userId);
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { driveFileId: true } });
    const loaded = user?.driveFileId
      ? { fileId: user.driveFileId, data: await readAppDataFile(accessToken, user.driveFileId) }
      : await initUserData(userId, accessToken);
    if (!user?.driveFileId) {
      await prisma.user.update({ where: { id: userId }, data: { driveFileId: loaded.fileId } });
    }

    const fileId = loaded.fileId;
    const data = loaded.data;
    const parent = data.categories.find((category) => category.id === input.parentId);

    if (!parent) {
      return Response.json({ error: "Parent category not found" }, { status: 404 });
    }

    const timestamp = new Date().toISOString();
    const category: Category = {
      id: crypto.randomUUID(),
      name: input.name,
      parentId: input.parentId,
      color: parent.color,
      icon: parent.icon,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const nextData = { ...data, categories: [...data.categories, category], updatedAt: timestamp };

    await getWriteQueue(userId, accessToken, fileId).scheduleWrite(nextData);
    return Response.json(category, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 400 });
  }
}
