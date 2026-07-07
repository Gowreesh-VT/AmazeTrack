import { requireUserId } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSplitsSchema = z.object({
  roomId: z.string(),
  note: z.string().optional(),
  splits: z.array(z.object({
    userId: z.string(),
    amount: z.number().positive(),
  })),
});

export async function GET() {
  try {
    const userId = await requireUserId();
    const splits = await prisma.splitRequest.findMany({
      where: {
        OR: [
          { requesterId: userId },
          { recipientId: userId },
        ],
      },
      include: {
        requester: {
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
          },
        },
        recipient: {
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
          },
        },
        room: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return Response.json(splits);
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const body = await request.json();
    const { roomId, note, splits } = createSplitsSchema.parse(body);

    // Verify room membership of requester
    const requesterMembership = await prisma.roomMembership.findUnique({
      where: {
        userId_roomId: {
          userId,
          roomId,
        },
      },
    });

    if (!requesterMembership) {
      return Response.json({ error: "Forbidden: You are not a member of this room" }, { status: 403 });
    }

    // Verify all recipients are members of the room
    const memberIds = splits.map((s) => s.userId);
    const validMembersCount = await prisma.roomMembership.count({
      where: {
        roomId,
        userId: { in: memberIds },
      },
    });

    if (validMembersCount !== memberIds.length) {
      return Response.json({ error: "One or more split recipients are not members of this room" }, { status: 400 });
    }

    // Create split requests in a transaction
    const createdSplits = await prisma.$transaction(
      splits.map((split) =>
        prisma.splitRequest.create({
          data: {
            roomId,
            requesterId: userId, // Payer
            recipientId: split.userId, // Ower
            amount: split.amount,
            note: note || undefined,
            status: "pending",
          },
          include: {
            requester: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
            recipient: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        })
      )
    );

    return Response.json(createdSplits, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 400 });
  }
}
