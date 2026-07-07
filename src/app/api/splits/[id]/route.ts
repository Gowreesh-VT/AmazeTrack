import { requireUserId } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSplitSchema = z.object({
  status: z.string().min(1).max(50),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const body = await request.json();
    const { status } = updateSplitSchema.parse(body);

    const split = await prisma.splitRequest.findUnique({
      where: { id },
    });

    if (!split) {
      return Response.json({ error: "Split request not found" }, { status: 404 });
    }

    if (split.requesterId !== userId && split.recipientId !== userId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    if (status === "settled" && split.status.startsWith("settle_pending_by_")) {
      const initiatorId = split.status.replace("settle_pending_by_", "");
      if (userId === initiatorId) {
        return Response.json({ error: "Forbidden: Settle-up must be confirmed by the other party" }, { status: 403 });
      }
    }

    const updated = await prisma.splitRequest.update({
      where: { id },
      data: {
        status,
        updatedAt: new Date(),
      },
    });

    return Response.json(updated);
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 400 });
  }
}
