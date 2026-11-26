import { api } from "./api";

// --- EXPENSES ---
export const createExpense = async (expenseData, sharesData = []) => {
  const { data } = await api.post("/expenses", {
    ...expenseData,
    shares: sharesData,
  });
  return data.expense;
};

export const getExpensesByRoom = async (roomId) => {
  const { data } = await api.get(`/rooms/${roomId}/expenses`);
  return data.expenses;
};

// --- EXPENSE SHARES ---
export const getExpenseSharesByRoom = async (roomId) => {
  const { data } = await api.get(`/rooms/${roomId}/expense-shares`);
  return data.shares;
};

export const updateExpenseShareStatus = async (shareId, is_paid) => {
  const { data } = await api.patch(`/expense-shares/${shareId}`, { is_paid });
  return data.share;
};

// --- RECURRING BILLS ---
export const createRecurringBill = async (billData) => {
  const { data } = await api.post("/recurring-bills", billData);
  return data.bill;
};

export const getRecurringBillsByRoom = async (roomId) => {
  const { data } = await api.get(`/rooms/${roomId}/recurring-bills`);
  return data.bills;
};
