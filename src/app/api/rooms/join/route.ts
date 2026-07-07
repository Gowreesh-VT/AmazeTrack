import { requireUserId } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const joinRoomSchema = z.object({
  inviteCode: z.string().length(6),
});

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const body = await request.json();
    const { inviteCode } = joinRoomSchema.parse(body);

    const room = await prisma.room.findUnique({
      where: { inviteCode: inviteCode.toUpperCase() },
    });

    if (!room) {
      return Response.json({ error: "Room not found" }, { status: 404 });
    }

    // Check if membership already exists
    const existing = await prisma.roomMembership.findUnique({
      where: {
        userId_roomId: {
          userId,
          roomId: room.id,
        },
      },
    });

    if (!existing) {
      await prisma.roomMembership.create({
        data: {
          userId,
          roomId: room.id,
          role: "member",
        },
      });
    }

    const roomWithMembers = await prisma.room.findUnique({
      where: { id: room.id },
      include: {
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                image: true,
              },
            },
          },
        },
      },
    });

    return Response.json(roomWithMembers, { status: 200 });
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 400 });
  }
}
