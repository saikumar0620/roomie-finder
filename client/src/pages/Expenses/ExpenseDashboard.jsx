import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/useAuthStore';
import { acceptInviteByToken } from '../../services/expense.service';
import {
  useUserRooms,
  useRoomDashboard,
  useCreateRoom,
  useJoinRoom,
  useAddRoomMember,
  usePendingInvites,
  useRespondToInvite,
  useRemoveRoomMember,
} from '../../hooks/useExpenses';
import SplitForm from './components/SplitForm';
import SettlementSummary from './components/SettlementSummary';
import ExpenseList from './components/ExpenseList';
import RecurringBills from './components/RecurringBills';

export default function ExpenseDashboard() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [showNewRoom, setShowNewRoom] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [showJoinRoom, setShowJoinRoom] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');

  const { data: rooms = [], isLoading: isLoadingRooms } = useUserRooms(!!user);
  const { data: pendingInvites = [] } = usePendingInvites(!!user);
  const createRoomMutation = useCreateRoom();
  const joinRoomMutation = useJoinRoom();
  const respondInviteMutation = useRespondToInvite();

  const activeRoomId =
    selectedRoomId && rooms.some((r) => r.id === selectedRoomId)
      ? selectedRoomId
      : rooms[0]?.id || null;

  const addMemberMutation = useAddRoomMember(activeRoomId);
  const removeMemberMutation = useRemoveRoomMember(activeRoomId);

  useEffect(() => {
    const inviteToken = searchParams.get('inviteToken');
    if (!user || !inviteToken) return;

    acceptInviteByToken(inviteToken)
      .then((res) => {
        queryClient.invalidateQueries({ queryKey: ['rooms'] });
        queryClient.invalidateQueries({ queryKey: ['room_invites'] });
        if (res?.room?.id) setSelectedRoomId(res.room.id);
        toast.success(`Joined "${res?.room?.name || 'room'}"!`);
      })
      .catch((err) => {
        toast.error(err?.message || 'Could not accept invite link');
      })
      .finally(() => {
        searchParams.delete('inviteToken');
        setSearchParams(searchParams, { replace: true });
      });
  }, [user, searchParams, setSearchParams, queryClient]);

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

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    const room = await joinRoomMutation.mutateAsync(joinCode.trim());
    setSelectedRoomId(room.id);
    setJoinCode('');
    setShowJoinRoom(false);
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!memberEmail.trim()) return;
    await addMemberMutation.mutateAsync(memberEmail.trim());
    setMemberEmail('');
  };

  const isLoading = isLoadingRooms || (!!activeRoomId && isLoadingDash);
  const isSyncing = !!activeRoomId && isFetchingDash;

  const activeRoom = dashboard?.room || rooms.find((r) => r.id === activeRoomId);
  const members = dashboard?.members || [{ $id: user.$id, name: user.name || 'You' }];
  const expenses = dashboard?.expenses || [];
  const shares = dashboard?.shares || [];
  const bills = dashboard?.bills || [];
  const isCreator = activeRoom?.createdBy === user.$id;

  const copyInviteCode = () => {
    if (!activeRoom?.inviteCode) return;
    navigator.clipboard.writeText(activeRoom.inviteCode);
    toast.success('Invite code copied!');
  };

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

        <div className="flex flex-wrap items-center gap-2">
          {rooms.length > 0 && (
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
          )}
          <button
            type="button"
            onClick={() => {
              setShowJoinRoom((v) => !v);
              setShowNewRoom(false);
            }}
            className="btn btn-o text-sm py-2 px-3 whitespace-nowrap"
          >
            {showJoinRoom ? 'Cancel' : 'Join Code'}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowNewRoom((v) => !v);
              setShowJoinRoom(false);
            }}
            className="btn btn-o text-sm py-2 px-3 whitespace-nowrap"
          >
            {showNewRoom ? 'Cancel' : '+ New Room'}
          </button>
        </div>
      </div>

      {/* Pending Room Invites */}
      {pendingInvites.length > 0 && (
        <div className="mb-6 flex flex-col gap-3 fade-up">
          {pendingInvites.map((inv) => (
            <div
              key={inv.id}
              className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              style={{ borderColor: 'var(--p)', background: 'var(--sur2)' }}
            >
              <div className="text-sm">
                <strong style={{ color: 'var(--tx)' }}>{inv.inviter.name}</strong>{' '}
                <span style={{ color: 'var(--tx2)' }}>
                  ({inv.inviter.email}) invited you to join{' '}
                </span>
                <strong style={{ color: 'var(--p)' }}>{inv.room.name}</strong>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  disabled={respondInviteMutation.isPending}
                  onClick={() =>
                    respondInviteMutation.mutate(
                      { inviteId: inv.id, action: 'accept' },
                      { onSuccess: () => setSelectedRoomId(inv.room.id) }
                    )
                  }
                  className="btn btn-p text-xs py-1.5 px-3"
                >
                  Accept
                </button>
                <button
                  type="button"
                  disabled={respondInviteMutation.isPending}
                  onClick={() =>
                    respondInviteMutation.mutate({
                      inviteId: inv.id,
                      action: 'decline',
                    })
                  }
                  className="btn btn-o text-xs py-1.5 px-3"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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

      {showJoinRoom && (
        <form onSubmit={handleJoinRoom} className="card p-5 mb-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-end fade-up">
          <div className="flex-1">
            <label className="lbl">Room Invite Code</label>
            <input
              type="text"
              className="inp py-2 text-sm uppercase"
              placeholder="e.g. EA795330"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={joinRoomMutation.isPending}
            className="btn btn-p text-sm py-2 px-5"
          >
            {joinRoomMutation.isPending ? 'Joining...' : 'Join Room'}
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
          <h2 className="text-xl font-semibold mb-2 text-[var(--tx)]">Create or join a shared room</h2>
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
        <>
          {/* Room members & invite bar */}
          <div className="card p-4 mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 fade-up">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--tx2)] mr-1">
                Members ({members.length}):
              </span>
              {members.map((m) => {
                const canRemove =
                  (isCreator && m.$id !== user.$id) ||
                  (!isCreator && m.$id === user.$id);
                return (
                  <span key={m.$id} className="tag text-xs py-1 px-3">
                    {m.name} {m.$id === user.$id ? '(You)' : ''}
                    {canRemove && (
                      <button
                        type="button"
                        onClick={() => removeMemberMutation.mutate(m.$id)}
                        title={m.$id === user.$id ? 'Leave room' : 'Remove member'}
                        className="ml-1.5 border-0 bg-transparent cursor-pointer font-bold p-0"
                        style={{ color: 'var(--p)' }}
                      >
                        {m.$id === user.$id ? 'Leave' : '✕'}
                      </button>
                    )}
                  </span>
                );
              })}
              {activeRoom?.inviteCode && (
                <button
                  type="button"
                  onClick={copyInviteCode}
                  className="btn btn-o text-xs py-1 px-2.5"
                  title="Click to copy invite code"
                >
                  Code: {activeRoom.inviteCode} 📋
                </button>
              )}
            </div>

            <form onSubmit={handleAddMember} className="flex gap-2 items-center">
              <input
                type="email"
                className="inp py-1.5 text-sm"
                placeholder="Invite roommate by email..."
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                required
              />
              <button
                type="submit"
                disabled={addMemberMutation.isPending}
                className="btn btn-p text-xs py-2 px-3 whitespace-nowrap"
              >
                {addMemberMutation.isPending ? 'Sending...' : 'Send Invite'}
              </button>
            </form>
          </div>

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
        </>
      )}
    </div>
  );
}
