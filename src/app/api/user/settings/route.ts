import { requireUserId } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const patchSchema = z.object({
  benchmarkOptIn: z.boolean(),
});

export async function GET() {
  try {
    const userId = await requireUserId();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { benchmarkOptIn: true },
    });
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }
    return Response.json(user);
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = await requireUserId();
    const body = await request.json();
    const { benchmarkOptIn } = patchSchema.parse(body);

    const user = await prisma.user.update({
      where: { id: userId },
      data: { benchmarkOptIn },
      select: { benchmarkOptIn: true },
    });

    return Response.json(user);
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 400 });
  }
}
