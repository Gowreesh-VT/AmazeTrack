import { requireUserId } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  month: z.string().length(7), // YYYY-MM
  updates: z.array(
    z.object({
      categoryId: z.string().min(1),
      deltaAmount: z.number(),
      deltaUserCount: z.number().int(),
    })
  ),
});

export async function POST(request: Request) {
  try {
    // Check authentication
    const userId = await requireUserId();

    // Check benchmarking opt-in status
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { benchmarkOptIn: true },
    });

    if (!user || !user.benchmarkOptIn) {
      return Response.json({ error: "Access denied. Please opt-in to benchmarking first." }, { status: 403 });
    }

    const body = await request.json();
    const { month, updates } = updateSchema.parse(body);

    if (updates.length === 0) {
      return Response.json({ ok: true });
    }

    // Execute updates in a transaction
    await prisma.$transaction(
      updates.map((up) => {
        const { categoryId, deltaAmount, deltaUserCount } = up;

        return prisma.categoryAggregate.upsert({
          where: {
            categoryId_month: {
              categoryId,
              month,
            },
          },
          update: {
            totalAmount: { increment: deltaAmount },
            userCount: { increment: deltaUserCount },
          },
          create: {
            categoryId,
            month,
            totalAmount: deltaAmount,
            userCount: Math.max(0, deltaUserCount),
          },
        });
      })
    );

    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 400 });
  }
}
