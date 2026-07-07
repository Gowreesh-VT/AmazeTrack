import { requireUserId } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id: roomId } = await params;

    // Delete membership
    const result = await prisma.roomMembership.deleteMany({
      where: {
        userId,
        roomId,
      },
    });

    if (result.count === 0) {
      return Response.json({ error: "Membership not found" }, { status: 404 });
    }

    return Response.json({ ok: true }, { status: 200 });
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 400 });
  }
}
