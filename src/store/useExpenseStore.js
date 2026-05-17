import { create } from 'zustand';

export const useExpenseStore = create((set) => ({
  // Filter & Context State
  activeRoomId: null,
  setActiveRoomId: (id) => set({ activeRoomId: id }),

  // Split Form State (To avoid large useState blocks in components)
  splitMethod: 'equal', // 'equal', 'custom_percentage', 'custom_amount'
  setSplitMethod: (method) => set({ splitMethod: method }),
  
  newExpenseTotal: '',
  setNewExpenseTotal: (total) => set({ newExpenseTotal: total }),

  newExpenseCategory: 'Rent',
  setNewExpenseCategory: (category) => set({ newExpenseCategory: category }),

  newExpenseDescription: '',
  setNewExpenseDescription: (desc) => set({ newExpenseDescription: desc }),

  customShares: {}, // { userId: amount_or_percentage }
  setCustomShare: (userId, value) => set((state) => ({
    customShares: { ...state.customShares, [userId]: value }
  })),
  resetCustomShares: () => set({ customShares: {} }),

  resetForm: () => set({
    splitMethod: 'equal',
    newExpenseTotal: '',
    newExpenseCategory: 'Rent',
    newExpenseDescription: '',
    customShares: {}
  })
}));
