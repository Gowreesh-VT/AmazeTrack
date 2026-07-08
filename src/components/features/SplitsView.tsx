import React from 'react';
import { PlusCircle, Users, UserPlus, Coins, ArrowRight, CheckCircle2, XCircle, MoreHorizontal, Check, X, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { useAppContext } from '@/lib/AppContext';

export function SplitsView() {
  const {
    driveData, session, currencySymbol,
    setIsCreatingRoom, setIsJoiningRoom, startAddSharedExpense,
    respondToSplit, initiateSettleUp, respondToSettlePending,
    leaveRoom, rooms, selectedRoomId, handleRoomSelect, roomLedger, splits
  } = useAppContext();

  return (
    <>
    <section className="flex flex-1 flex-col gap-6 px-6 pt-6 pb-24 max-w-md md:max-w-5xl mx-auto w-full">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Hostel Splits</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCreatingRoom(true)}
                className="p-2 rounded-xl bg-purple-50 text-purple-600 hover:bg-purple-100 transition-all flex items-center justify-center"
                title="Create Room"
              >
                <PlusCircle className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setIsJoiningRoom(true)}
                className="p-2 rounded-xl bg-pink-50 text-pink-600 hover:bg-pink-100 transition-all flex items-center justify-center"
                title="Join Room"
              >
                <UserPlus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Onboarding State: No Rooms */}
          {rooms.length === 0 ? (
            <div className="glass p-6 rounded-3xl text-center flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-base">No Split Rooms</h3>
                <p className="text-xs text-zinc-500 font-medium mt-1">
                  Create a room for your hostel room or join your roommate's room via invite code to start splitting shared costs.
                </p>
              </div>
              <div className="flex w-full gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreatingRoom(true)}
                  className="flex-1 h-11 rounded-xl bg-purple-600 text-white text-xs font-bold shadow-md shadow-purple-500/20 active:scale-95 transition-all hover:bg-purple-700"
                >
                  Create Room
                </button>
                <button
                  type="button"
                  onClick={() => setIsJoiningRoom(true)}
                  className="flex-1 h-11 rounded-xl bg-zinc-100 text-zinc-600 text-xs font-bold active:scale-95 transition-all hover:bg-zinc-200"
                >
                  Join Room
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Room Select Dropdown */}
              <div className="glass p-4 rounded-3xl flex flex-col gap-3 border border-zinc-100 shadow-sm">
                <label className="space-y-1">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Select Room</span>
                  <select
                    className="h-11 w-full rounded-xl border-0 bg-zinc-100/50 px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-foreground"
                    value={selectedRoomId || ""}
                    onChange={(e) => handleRoomSelect(e.target.value)}
                  >
                    {rooms.map((r: any) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </label>
                {selectedRoomId && (
                  <>
                    <div className="flex items-center justify-between text-xs font-bold mt-1">
                      <span className="text-zinc-500 bg-zinc-100 px-2.5 py-1 rounded-lg">
                        Code: {rooms.find((r: any) => r.id === selectedRoomId)?.inviteCode}
                      </span>
                      <button
                        type="button"
                        onClick={() => leaveRoom(selectedRoomId)}
                        className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100/60 px-2.5 py-1 rounded-lg transition-colors text-xs font-bold"
                      >
                        Leave Room
                      </button>
                    </div>
                    <div className="border-t border-zinc-100 pt-3 mt-1">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">Room Members</span>
                      <div className="flex flex-wrap gap-2">
                        {rooms.find((r: any) => r.id === selectedRoomId)?.memberships.map((m: any) => {
                          const isMe = m.user.id === session?.user?.id;
                          return (
                            <div key={m.user.id} className="flex items-center gap-1.5 bg-zinc-100/60 px-2.5 py-1 rounded-full text-xs font-semibold text-zinc-600">
                              {m.user.image ? (
                                <img src={m.user.image} alt={m.user.name || "Member"} className="w-4 h-4 rounded-full border border-zinc-200" />
                              ) : (
                                <div className="w-4 h-4 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-[8px] font-bold">
                                  {(m.user.name || m.user.email)[0].toUpperCase()}
                                </div>
                              )}
                              <span className="truncate max-w-[100px]">{m.user.name || m.user.email.split("@")[0]} {isMe && "(You)"}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Room Net Ledger and Members */}
              {selectedRoomId && (
                <div className="flex flex-col gap-4">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Room Ledger Balance</h3>
                  
                  {roomLedger.length === 0 ? (
                    <div className="glass p-5 rounded-3xl text-center py-8 text-zinc-500 text-xs italic border border-zinc-100">
                      Everyone is squared away in this room!
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {roomLedger.map((ledgerItem: any, idx: any) => {
                        const isMeDebtor = ledgerItem.debtor.id === session?.user?.id;
                        const isMeCreditor = ledgerItem.creditor.id === session?.user?.id;
                        
                        return (
                          <div key={idx} className="glass p-4 rounded-2xl flex items-center justify-between border border-zinc-100 shadow-sm">
                            <div className="min-w-0 flex-1 flex items-center gap-2">
                              <span className="font-bold text-zinc-700 text-xs truncate">
                                {ledgerItem.debtor.name || ledgerItem.debtor.email.split("@")[0]}
                              </span>
                              <ArrowRight className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                              <span className="font-bold text-zinc-700 text-xs truncate">
                                {ledgerItem.creditor.name || ledgerItem.creditor.email.split("@")[0]}
                              </span>
                              <span className="font-extrabold text-zinc-900 text-sm ml-2">
                                {formatCurrency(ledgerItem.amount, currencySymbol)}
                              </span>
                            </div>

                            {/* Settlement Confirmation State */}
                            {ledgerItem.isSettlePending ? (
                              ledgerItem.initiatorId === session?.user?.id ? (
                                <span className="text-[10px] font-bold text-zinc-400 bg-zinc-50 border border-zinc-100 px-2.5 py-1.5 rounded-xl animate-pulse">
                                  Waiting...
                                </span>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => respondToSettlePending(selectedRoomId, isMeDebtor ? ledgerItem.creditor.id : ledgerItem.debtor.id, "confirm")}
                                    className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                                    title="Confirm Settlement"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => respondToSettlePending(selectedRoomId, isMeDebtor ? ledgerItem.creditor.id : ledgerItem.debtor.id, "decline")}
                                    className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                    title="Reject Settlement"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )
                            ) : (
                              // Only show Settle Up if the current user is part of the pair
                              (isMeDebtor || isMeCreditor) && (
                                <button
                                  type="button"
                                  onClick={() => initiateSettleUp(selectedRoomId, isMeDebtor ? ledgerItem.creditor.id : ledgerItem.debtor.id)}
                                  className="text-xs font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-xl transition-all"
                                >
                                  Settle Up
                                </button>
                              )
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Pending Split Requests (Owed by User) */}
          {splits.filter((s: any) => s.recipientId === session?.user?.id && s.status === "pending").length > 0 && (
            <div className="flex flex-col gap-4 mt-2">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Incoming Split Requests</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {splits
                  .filter((s: any) => s.recipientId === session?.user?.id && s.status === "pending")
                  .map((split: any) => (
                    <div key={split.id} className="glass p-4 rounded-2xl flex flex-col gap-3 border border-zinc-100 shadow-sm bg-gradient-to-r from-purple-50/20 to-transparent">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-foreground text-sm">{split.note || "Shared Expense"}</h4>
                          <p className="text-xs text-zinc-400 font-medium">
                            Payer: {split.requester.name || split.requester.email.split("@")[0]} · Room: {split.room.name}
                          </p>
                        </div>
                        <span className="font-extrabold text-zinc-900 text-base">{formatCurrency(split.amount, currencySymbol)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-zinc-50">
                        <span className="text-[10px] text-zinc-400 font-semibold">
                          {new Date(split.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => respondToSplit(split.id, "accepted")}
                            className="text-xs font-bold text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-xl flex items-center gap-1 active:scale-95 transition-all shadow-sm shadow-green-600/10"
                          >
                            <Check className="w-3.5 h-3.5" /> Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => respondToSplit(split.id, "disputed")}
                            className="text-xs font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-xl flex items-center gap-1 active:scale-95 transition-all"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" /> Dispute
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Sent Split Requests (Disputed or Pending) */}
          {splits.filter((s: any) => s.requesterId === session?.user?.id && s.roomId === selectedRoomId && (s.status === "pending" || s.status === "disputed")).length > 0 && (
            <div className="flex flex-col gap-4 mt-2">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Sent Split Requests</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {splits
                  .filter((s: any) => s.requesterId === session?.user?.id && s.roomId === selectedRoomId && (s.status === "pending" || s.status === "disputed"))
                  .map((split: any) => {
                    const isDisputed = split.status === "disputed";
                    return (
                      <div
                        key={split.id}
                        className={`glass p-4 rounded-2xl flex flex-col gap-2 border shadow-sm ${
                          isDisputed
                            ? "bg-amber-50/50 border-amber-100 text-amber-900 animate-pulse"
                            : "border-zinc-100 text-zinc-700"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-bold text-sm">{split.note || "Shared Expense"}</h4>
                            <p className="text-xs text-zinc-400 font-medium">
                              Ower: {split.recipient.name || split.recipient.email.split("@")[0]} · Room: {split.room.name}
                            </p>
                          </div>
                          <span className="font-extrabold text-base">{formatCurrency(split.amount, currencySymbol)}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1 text-[10px] font-bold uppercase tracking-wider">
                          <span>
                            {new Date(split.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                          </span>
                          <span className={isDisputed ? "text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full" : "text-zinc-400"}>
                            {split.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </section>
    </>
  );
}
