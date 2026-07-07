import { requireUserId } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const userId = await requireUserId();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { benchmarkOptIn: true },
    });

    if (!user || !user.benchmarkOptIn) {
      return Response.json({ error: "Access denied. Please opt-in to benchmarking first." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") || new Date().toISOString().slice(0, 7);

    const aggregates = await prisma.categoryAggregate.findMany({
      where: { month },
    });

    return Response.json(aggregates);
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 400 });
  }
}
