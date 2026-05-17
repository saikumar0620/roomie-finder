import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as expenseService from '../services/expense.service';
import toast from 'react-hot-toast';

const STALE_TIME = 1000 * 60 * 5; // 5 minutes
const GC_TIME = 1000 * 60 * 30; // 30 minutes (formerly cacheTime)

// --- FETCH HOOKS ---

export const useRoomExpenses = (roomId) => {
  return useQuery({
    queryKey: ['expenses', roomId],
    queryFn: () => expenseService.getExpensesByRoom(roomId),
    enabled: !!roomId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
};

export const useRoomExpenseShares = (roomId) => {
  return useQuery({
    queryKey: ['expense_shares', roomId],
    queryFn: () => expenseService.getExpenseSharesByRoom(roomId),
    enabled: !!roomId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
};

export const useRoomRecurringBills = (roomId) => {
  return useQuery({
    queryKey: ['recurring_bills', roomId],
    queryFn: () => expenseService.getRecurringBillsByRoom(roomId),
    enabled: !!roomId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
};

// --- MUTATION HOOKS ---

export const useCreateExpense = (roomId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      // payload expects { expenseData, sharesData }
      const newExpense = await expenseService.createExpense(payload.expenseData);
      
      // Create associated shares
      const sharePromises = payload.sharesData.map(share => 
        expenseService.createExpenseShare({
          ...share,
          expense_id: newExpense.$id
        })
      );
      
      await Promise.all(sharePromises);
      return newExpense;
    },
    onSuccess: () => {
      // Invalidate both expenses and shares to refetch
      queryClient.invalidateQueries({ queryKey: ['expenses', roomId] });
      queryClient.invalidateQueries({ queryKey: ['expense_shares', roomId] });
      toast.success('Expense added successfully!');
    },
    onError: (error) => {
      console.error("Failed to create expense", error);
      if (error?.code === 401 || error?.message?.includes('permissions')) {
        toast.error('Appwrite Error: Add "Create" permissions for "Users" in your Collection Settings!', { duration: 6000 });
      } else {
        toast.error('Failed to add expense. Please try again.');
      }
    }
  });
};

export const useUpdateShareStatus = (roomId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ shareId, is_paid }) => expenseService.updateExpenseShareStatus(shareId, is_paid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense_shares', roomId] });
      toast.success('Payment status updated!');
    },
    onError: (error) => {
      console.error("Failed to update status", error);
      toast.error('Failed to update status.');
    }
  });
};

export const useCreateRecurringBill = (roomId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (billData) => expenseService.createRecurringBill(billData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring_bills', roomId] });
      toast.success('Recurring bill added!');
    },
    onError: (error) => {
      console.error("Failed to create recurring bill", error);
      toast.error('Failed to add recurring bill.');
    }
  });
};
