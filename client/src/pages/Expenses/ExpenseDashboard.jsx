import React, { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import {
  useUserRooms,
  useRoomDashboard,
  useCreateRoom,
} from '../../hooks/useExpenses';
import SplitForm from './components/SplitForm';
import SettlementSummary from './components/SettlementSummary';
import ExpenseList from './components/ExpenseList';
import RecurringBills from './components/RecurringBills';

export default function ExpenseDashboard() {
  const { user } = useAuthStore();
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [showNewRoom, setShowNewRoom] = useState(false);

  const { data: rooms = [], isLoading: isLoadingRooms } = useUserRooms(!!user);
  const createRoomMutation = useCreateRoom();

  const activeRoomId =
    selectedRoomId && rooms.some((r) => r.id === selectedRoomId)
      ? selectedRoomId
      : rooms[0]?.id || null;

  const {
    data: dashboard,
    isLoading: isLoadingDash,
    isFetching: isFetchingDash,
  } = useRoomDashboard(activeRoomId);

  if (!user) {
    return (
      <div className="wrap flex justify-center items-center" style={{ minHeight: '60vh' }}>
        <p className="text-[var(--tx2)]">Please login to view expenses.</p>
      </div>
    );
  }

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    const room = await createRoomMutation.mutateAsync({
      name: newRoomName.trim(),
      memberIds: [],
    });
    setSelectedRoomId(room.id);
    setNewRoomName('');
    setShowNewRoom(false);
  };

  const isLoading = isLoadingRooms || (!!activeRoomId && isLoadingDash);
  const isSyncing = !!activeRoomId && isFetchingDash;

  const members = dashboard?.members || [{ $id: user.$id, name: user.name || 'You' }];
  const expenses = dashboard?.expenses || [];
  const shares = dashboard?.shares || [];
  const bills = dashboard?.bills || [];

  return (
    <div className="wrap py-8 max-w-5xl">
      <div className="fade-up mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-4 mb-1">
            <h1 className="text-2xl md:text-3xl font-bold text-[var(--tx)]">
              Expenses
            </h1>
            {isSyncing && !isLoading && (
              <div className="flex items-center gap-2 px-3 py-1 bg-[var(--sur2)] rounded-full border border-[var(--bdr)] text-xs text-[var(--tx2)] font-medium shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[var(--p)]" style={{ animation: 'pulse 1.5s infinite' }}></span>
                Syncing
              </div>
            )}
          </div>
          <p className="text-[var(--tx2)] text-sm md:text-base">
            Track shared expenses and settle balances.
          </p>
        </div>

        {rooms.length > 0 && (
          <div className="flex items-center gap-2">
            <select
              className="inp py-2 text-sm"
              value={activeRoomId || ''}
              onChange={(e) => setSelectedRoomId(e.target.value)}
            >
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowNewRoom((v) => !v)}
              className="btn btn-o text-sm py-2 px-3 whitespace-nowrap"
            >
              {showNewRoom ? 'Cancel' : '+ New Room'}
            </button>
          </div>
        )}
      </div>

      {showNewRoom && (
        <form onSubmit={handleCreateRoom} className="card p-5 mb-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-end fade-up">
          <div className="flex-1">
            <label className="lbl">Room / Apartment Name</label>
            <input
              type="text"
              className="inp py-2 text-sm"
              placeholder="e.g. Flat 402, Indiranagar"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={createRoomMutation.isPending}
            className="btn btn-p text-sm py-2 px-5"
          >
            {createRoomMutation.isPending ? 'Creating...' : 'Create Room'}
          </button>
        </form>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="skel h-[500px] w-full rounded-2xl"></div>
          </div>
          <div className="space-y-6">
            <div className="skel h-[300px] w-full rounded-2xl"></div>
          </div>
        </div>
      ) : !activeRoomId ? (
        <div className="card p-8 max-w-md mx-auto text-center fade-up">
          <div className="text-4xl mb-3">🧾</div>
          <h2 className="text-xl font-semibold mb-2 text-[var(--tx)]">Create your first shared room</h2>
          <p className="text-sm text-[var(--tx2)] mb-6">
            Group shared groceries, utilities, and recurring bills with your roommates.
          </p>
          <form onSubmit={handleCreateRoom} className="flex flex-col gap-3">
            <input
              type="text"
              className="inp text-sm"
              placeholder="e.g. My Apartment"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              required
            />
            <button
              type="submit"
              disabled={createRoomMutation.isPending}
              className="btn btn-p w-full py-2.5"
            >
              {createRoomMutation.isPending ? 'Creating...' : 'Create Room'}
            </button>
          </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          <div className="lg:col-span-2 flex flex-col gap-8">
            <SplitForm roomId={activeRoomId} members={members} />
            <div className="divider opacity-50"></div>
            <ExpenseList
              roomId={activeRoomId}
              expenses={expenses}
              shares={shares}
              members={members}
            />
          </div>

          <div className="flex flex-col gap-6 md:gap-8">
            <SettlementSummary
              expenses={expenses}
              shares={shares}
              members={members}
            />
            <RecurringBills roomId={activeRoomId} bills={bills} />
          </div>
        </div>
      )}
    </div>
  );
}
