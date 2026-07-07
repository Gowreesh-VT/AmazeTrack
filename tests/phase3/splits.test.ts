import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH } from "@/app/api/splits/[id]/route";
import { POST as createSplits } from "@/app/api/splits/route";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/apiAuth", () => ({
  requireUserId: vi.fn(() => "user-debtor"),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    splitRequest: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    roomMembership: {
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn((promises) => Promise.all(promises)),
  },
}));

// Client-side room ledger math extracted from page.tsx for verification
function calculateLedger(selectedRoomId: string, userId: string, rooms: any[], splits: any[]) {
  if (!selectedRoomId || !userId) return [];
  const room = rooms.find((r: any) => r.id === selectedRoomId);
  if (!room) return [];

  const members = room.memberships.map((m: any) => m.user);
  const roomSplits = splits.filter((s: any) => s.roomId === selectedRoomId);

  const balances: { [key: string]: number } = {};
  
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const key = members[i].id < members[j].id 
        ? `${members[i].id}:${members[j].id}` 
        : `${members[j].id}:${members[i].id}`;
      balances[key] = 0;
    }
  }

  for (const split of roomSplits) {
    const isAccepted = split.status === "accepted" || split.status.startsWith("settle_pending_by_");
    if (!isAccepted) continue;

    const user1 = split.requesterId;
    const user2 = split.recipientId;
    
    const key = user1 < user2 ? `${user1}:${user2}` : `${user2}:${user1}`;
    const amount = Number(split.amount);
    
    if (user1 < user2) {
      balances[key] += amount;
    } else {
      balances[key] -= amount;
    }
  }

  const ledgers: any[] = [];
  for (const [key, balance] of Object.entries(balances)) {
    if (balance === 0) continue;
    const [u1, u2] = key.split(":");
    const user1Obj = members.find((m: any) => m.id === u1);
    const user2Obj = members.find((m: any) => m.id === u2);
    
    if (!user1Obj || !user2Obj) continue;

    const pairSplits = roomSplits.filter((s: any) => {
      const isPair = 
        (s.requesterId === u1 && s.recipientId === u2) ||
        (s.recipientId === u1 && s.requesterId === u2);
      return isPair && s.status.startsWith("settle_pending_by_");
    });
    const isSettlePending = pairSplits.length > 0;
    const initiatorId = isSettlePending ? pairSplits[0].status.replace("settle_pending_by_", "") : null;

    if (balance > 0) {
      ledgers.push({ debtor: user2Obj, creditor: user1Obj, amount: balance, isSettlePending, initiatorId });
    } else {
      ledgers.push({ debtor: user1Obj, creditor: user2Obj, amount: Math.abs(balance), isSettlePending, initiatorId });
    }
  }

  return ledgers;
}

describe("Phase 3: Roommate Splits", () => {
  const alice = { id: "user-alice", name: "Alice", email: "alice@example.com" };
  const bob = { id: "user-bob", name: "Bob", email: "bob@example.com" };

  const mockRooms = [
    {
      id: "room-a",
      name: "Room A",
      memberships: [{ user: alice }, { user: bob }],
    },
    {
      id: "room-b",
      name: "Room B",
      memberships: [{ user: alice }, { user: bob }],
    },
  ];

  describe("Cross-room ledger isolation test", () => {
    it("should keep balances separate for two different rooms containing the same users", () => {
      const splits = [
        // Alice paid ₹100 in Room A
        { id: "s1", roomId: "room-a", requesterId: "user-alice", recipientId: "user-bob", amount: 100, status: "accepted" },
        // Alice paid ₹50 in Room B
        { id: "s2", roomId: "room-b", requesterId: "user-alice", recipientId: "user-bob", amount: 50, status: "accepted" },
      ];

      const ledgerRoomA = calculateLedger("room-a", "user-alice", mockRooms, splits);
      const ledgerRoomB = calculateLedger("room-b", "user-alice", mockRooms, splits);

      expect(ledgerRoomA).toHaveLength(1);
      expect(ledgerRoomA[0].debtor.id).toBe("user-bob");
      expect(ledgerRoomA[0].amount).toBe(100);

      expect(ledgerRoomB).toHaveLength(1);
      expect(ledgerRoomB[0].debtor.id).toBe("user-bob");
      expect(ledgerRoomB[0].amount).toBe(50);
    });
  });

  describe("Pending/disputed splits exclusion", () => {
    it("should only include ACCEPTED and SETTLE_PENDING split requests in ledger", () => {
      const splits = [
        { id: "s1", roomId: "room-a", requesterId: "user-alice", recipientId: "user-bob", amount: 100, status: "accepted" },
        { id: "s2", roomId: "room-a", requesterId: "user-alice", recipientId: "user-bob", amount: 50, status: "pending" }, // ignored
        { id: "s3", roomId: "room-a", requesterId: "user-alice", recipientId: "user-bob", amount: 30, status: "disputed" }, // ignored
        { id: "s4", roomId: "room-a", requesterId: "user-alice", recipientId: "user-bob", amount: 200, status: "settle_pending_by_user-alice" }, // included
      ];

      const ledger = calculateLedger("room-a", "user-alice", mockRooms, splits);

      // Ledger balance should be 100 + 200 = 300
      expect(ledger).toHaveLength(1);
      expect(ledger[0].amount).toBe(300);
    });
  });

  describe("Settle-up confirmation authorization API vulnerability", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should reject unilateral settlement updates by the settlement initiator", async () => {
      const mockSplit = {
        id: "split-123",
        roomId: "room-a",
        requesterId: "user-alice", // Alice paid, so Bob owes Alice
        recipientId: "user-debtor", // Bob (the current user "user-debtor")
        amount: 100,
        status: "settle_pending_by_user-debtor", // user-debtor initiated this settle-up
      };

      vi.spyOn(prisma.splitRequest, "findUnique").mockResolvedValue(mockSplit as any);

      // Settle initiator tries to confirm
      const req = new Request("http://localhost/api/splits/split-123", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "settled" }),
      });

      const res = await PATCH(req, { params: Promise.resolve({ id: "split-123" }) });
      expect(res.status).toBe(403);
      
      const payload = await res.json();
      expect(payload.error).toContain("must be confirmed by the other party");
    });

    it("should allow settlement updates by the responder party", async () => {
      const mockSplit = {
        id: "split-123",
        roomId: "room-a",
        requesterId: "user-alice",
        recipientId: "user-debtor",
        amount: 100,
        status: "settle_pending_by_user-alice", // Alice initiated, so user-debtor (the current user) is the responder
      };

      vi.spyOn(prisma.splitRequest, "findUnique").mockResolvedValue(mockSplit as any);
      vi.spyOn(prisma.splitRequest, "update").mockImplementation(async ({ data }: any) => ({
        ...mockSplit,
        status: data.status,
      }));

      // Settle responder tries to confirm
      const req = new Request("http://localhost/api/splits/split-123", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "settled" }),
      });

      const res = await PATCH(req, { params: Promise.resolve({ id: "split-123" }) });
      expect(res.status).toBe(200);
      
      const payload = await res.json();
      expect(payload.status).toBe("settled");
    });
  });

  describe("Splits creation room membership security checks", () => {
    it("should reject split creation if requester is not a member of the room", async () => {
      vi.spyOn(prisma.roomMembership, "findUnique").mockResolvedValue(null); // not a member

      const req = new Request("http://localhost/api/splits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: "room-abc",
          note: "Pizza",
          splits: [{ userId: "user-bob", amount: 50 }],
        }),
      });

      const res = await createSplits(req);
      expect(res.status).toBe(403);
      const payload = await res.json();
      expect(payload.error).toContain("not a member of this room");
    });

    it("should reject split creation if any recipient is not a member of the room", async () => {
      vi.spyOn(prisma.roomMembership, "findUnique").mockResolvedValue({ id: "m1", userId: "user-debtor", roomId: "room-abc", role: "member", createdAt: new Date() });
      vi.spyOn(prisma.roomMembership, "count").mockResolvedValue(0); // Bob is not in room

      const req = new Request("http://localhost/api/splits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: "room-abc",
          note: "Pizza",
          splits: [{ userId: "user-bob", amount: 50 }],
        }),
      });

      const res = await createSplits(req);
      expect(res.status).toBe(400);
      const payload = await res.json();
      expect(payload.error).toContain("recipients are not members of this room");
    });
  });
});
