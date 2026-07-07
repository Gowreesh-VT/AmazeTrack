import { requireUserId } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createRoomSchema = z.object({
  name: z.string().min(1).max(100),
});

async function generateUniqueJoinCode() {
  const charset = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "";
  let attempts = 0;
  while (attempts < 15) {
    code = "";
    for (let i = 0; i < 6; i++) {
      code += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    const existing = await prisma.room.findUnique({ where: { inviteCode: code } });
    if (!existing) return code;
    attempts++;
  }
  throw new Error("Could not generate a unique invite code");
}

export async function GET() {
  try {
    const userId = await requireUserId();
    const rooms = await prisma.room.findMany({
      where: {
        memberships: {
          some: { userId },
        },
      },
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
      orderBy: {
        createdAt: "desc",
      },
    });

    return Response.json(rooms);
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const body = await request.json();
    const { name } = createRoomSchema.parse(body);

    const inviteCode = await generateUniqueJoinCode();

    const room = await prisma.room.create({
      data: {
        name,
        inviteCode,
        memberships: {
          create: {
            userId,
            role: "owner",
          },
        },
      },
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

    return Response.json(room, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 400 });
  }
}
