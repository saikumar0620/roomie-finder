import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as expenseService from '../services/expense.service';
import toast from 'react-hot-toast';

const STALE_TIME = 1000 * 60 * 5;
const GC_TIME = 1000 * 60 * 30;

// Never retry 4xx client errors (prevents multi-second hangs on bad IDs / auth errors)
const smartRetry = (failureCount, error) => {
  const status = error?.response?.status;
  if (status && status < 500) return false;
  return failureCount < 2;
};

// --- FETCH HOOKS ---

export const useUserRooms = (enabled = true) => {
  return useQuery({
    queryKey: ['rooms'],
    queryFn: expenseService.getUserRooms,
    enabled,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    retry: smartRetry,
  });
};

export const useRoomDashboard = (roomId) => {
  return useQuery({
    queryKey: ['room_dashboard', roomId],
    queryFn: () => expenseService.getRoomDashboard(roomId),
    enabled: !!roomId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    retry: smartRetry,
  });
};

export const useRoomExpenses = (roomId) => {
  return useQuery({
    queryKey: ['expenses', roomId],
    queryFn: () => expenseService.getExpensesByRoom(roomId),
    enabled: !!roomId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    retry: smartRetry,
  });
};

export const useRoomExpenseShares = (roomId) => {
  return useQuery({
    queryKey: ['expense_shares', roomId],
    queryFn: () => expenseService.getExpenseSharesByRoom(roomId),
    enabled: !!roomId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    retry: smartRetry,
  });
};

export const useRoomRecurringBills = (roomId) => {
  return useQuery({
    queryKey: ['recurring_bills', roomId],
    queryFn: () => expenseService.getRecurringBillsByRoom(roomId),
    enabled: !!roomId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    retry: smartRetry,
  });
};

// --- MUTATION HOOKS ---

export const useCreateRoom = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, memberIds }) => expenseService.createRoom(name, memberIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast.success('Room created!');
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to create room.');
    },
  });
};

export const useJoinRoom = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inviteCode) => expenseService.joinRoomByCode(inviteCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast.success('Joined room!');
    },
    onError: (error) => {
      toast.error(error?.message || 'Invalid invite code.');
    },
  });
};

export const useAddRoomMember = (roomId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (email) => expenseService.addRoomMemberByEmail(roomId, email),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['room_dashboard', roomId] });
      toast.success(res?.message || 'Invitation sent!');
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to send invite.');
    },
  });
};

export const usePendingInvites = (enabled = true) => {
  return useQuery({
    queryKey: ['room_invites'],
    queryFn: expenseService.getPendingInvites,
    enabled,
    staleTime: 1000 * 30,
    retry: smartRetry,
  });
};

export const useRespondToInvite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ inviteId, action }) => expenseService.respondToInvite(inviteId, action),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['room_invites'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast.success(res.status === 'accepted' ? 'Joined room!' : 'Invite declined');
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to respond to invite.');
    },
  });
};

export const useRemoveRoomMember = (roomId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId) => expenseService.removeRoomMember(roomId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['room_dashboard', roomId] });
      toast.success('Updated room members');
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to update members.');
    },
  });
};

export const useCreateExpense = (roomId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      return await expenseService.createExpense(
        payload.expenseData,
        payload.sharesData
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room_dashboard', roomId] });
      queryClient.invalidateQueries({ queryKey: ['expenses', roomId] });
      queryClient.invalidateQueries({ queryKey: ['expense_shares', roomId] });
      toast.success('Expense added successfully!');
    },
    onError: (error) => {
      console.error("Failed to create expense", error);
      toast.error(error?.message || 'Failed to add expense. Please try again.');
    },
  });
};

export const useUpdateShareStatus = (roomId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ shareId, is_paid }) => expenseService.updateExpenseShareStatus(shareId, is_paid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room_dashboard', roomId] });
      queryClient.invalidateQueries({ queryKey: ['expense_shares', roomId] });
      toast.success('Payment status updated!');
    },
    onError: (error) => {
      console.error("Failed to update status", error);
      toast.error(error?.message || 'Failed to update status.');
    },
  });
};

export const useDeleteExpense = (roomId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (expenseId) => expenseService.deleteExpense(expenseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room_dashboard', roomId] });
      queryClient.invalidateQueries({ queryKey: ['expenses', roomId] });
      queryClient.invalidateQueries({ queryKey: ['expense_shares', roomId] });
      toast.success('Expense deleted');
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to delete expense.');
    },
  });
};

export const useCreateRecurringBill = (roomId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (billData) => expenseService.createRecurringBill(billData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room_dashboard', roomId] });
      queryClient.invalidateQueries({ queryKey: ['recurring_bills', roomId] });
      toast.success('Recurring bill added!');
    },
    onError: (error) => {
      console.error("Failed to create recurring bill", error);
      toast.error(error?.message || 'Failed to add recurring bill.');
    },
  });
};

export const useCreateChore = (roomId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => expenseService.createChore(roomId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room_dashboard', roomId] });
      toast.success('Chore added!');
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to add chore.');
    },
  });
};

export const useToggleChore = (roomId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ choreId, isDone }) => expenseService.toggleChoreStatus(choreId, isDone),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room_dashboard', roomId] });
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to update chore.');
    },
  });
};

export const useDeleteChore = (roomId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (choreId) => expenseService.deleteChore(choreId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room_dashboard', roomId] });
      toast.success('Chore removed');
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to delete chore.');
    },
  });
};
