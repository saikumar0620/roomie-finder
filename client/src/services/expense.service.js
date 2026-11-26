import { api } from "./api";

// --- ROOMS & DASHBOARD ---
export const getUserRooms = async () => {
  const { data } = await api.get("/rooms");
  return data.rooms;
};

export const createRoom = async (name, memberIds = []) => {
  const { data } = await api.post("/rooms", { name, memberIds });
  return data.room;
};

export const joinRoomByCode = async (inviteCode) => {
  const { data } = await api.post("/rooms/join", { inviteCode });
  return data.room;
};

export const addRoomMemberByEmail = async (roomId, email) => {
  const { data } = await api.post(`/rooms/${roomId}/members`, { email });
  return data;
};

export const getPendingInvites = async () => {
  const { data } = await api.get("/rooms/invites");
  return data.invites;
};

export const respondToInvite = async (inviteId, action) => {
  const { data } = await api.post(`/rooms/invites/${inviteId}/respond`, { action });
  return data;
};

export const acceptInviteByToken = async (token) => {
  const { data } = await api.post("/rooms/invites/accept-token", { token });
  return data;
};

export const removeRoomMember = async (roomId, userId) => {
  const { data } = await api.delete(`/rooms/${roomId}/members/${userId}`);
  return data;
};

export const getRoomDashboard = async (roomId) => {
  const { data } = await api.get(`/rooms/${roomId}/dashboard`);
  return data;
};

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

// --- CHORES ---
export const createChore = async (roomId, payload) => {
  const { data } = await api.post(`/rooms/${roomId}/chores`, payload);
  return data.chore;
};

export const toggleChoreStatus = async (choreId, isDone) => {
  const { data } = await api.patch(`/chores/${choreId}`, { isDone });
  return data.chore;
};

export const deleteChore = async (choreId) => {
  const { data } = await api.delete(`/chores/${choreId}`);
  return data;
};
