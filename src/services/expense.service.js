import { databases, ID, DATABASE_ID, COL_EXPENSES, COL_EXPENSE_SHARES, COL_RECURRING_BILLS } from "./appwrite";
import { Query, Permission, Role } from "appwrite";

// --- EXPENSES ---
export const createExpense = async (data) => {
  return await databases.createRow({
    databaseId: DATABASE_ID,
    tableId: COL_EXPENSES,
    rowId: ID.unique(),
    data,
    permissions: [
      Permission.read(Role.any()), // Typically we would restrict to room members
      Permission.update(Role.user(data.created_by)),
      Permission.delete(Role.user(data.created_by)),
    ]
  });
};

export const getExpensesByRoom = async (roomId) => {
  const res = await databases.listRows({
    databaseId: DATABASE_ID,
    tableId: COL_EXPENSES,
    queries: [
      Query.equal("room_id", roomId),
      Query.orderDesc("$createdAt"),
      Query.limit(100)
    ]
  });
  return res.rows;
};

// --- EXPENSE SHARES ---
export const createExpenseShare = async (data) => {
  return await databases.createRow({
    databaseId: DATABASE_ID,
    tableId: COL_EXPENSE_SHARES,
    rowId: ID.unique(),
    data,
    permissions: [
      Permission.read(Role.any()),
      Permission.update(Role.any()),
      Permission.delete(Role.any())
    ]
  });
};

export const getExpenseSharesByRoom = async (roomId) => {
  // Fetch shares by resolving expenses first or if we have room_id on shares.
  // For optimization, we'll fetch all shares for the relevant expenses.
  // Since Appwrite lacks native join, we fetch expenses first, then their shares.
  const expenses = await getExpensesByRoom(roomId);
  if (expenses.length === 0) return [];

  const expenseIds = expenses.map(e => e.$id);
  
  // Appwrite limits OR queries, so if there are many, we might need chunking.
  // For MVP, chunking up to 100 queries is fine.
  const chunks = [];
  for (let i = 0; i < expenseIds.length; i += 100) {
    chunks.push(expenseIds.slice(i, i + 100));
  }

  let allShares = [];
  for (const chunk of chunks) {
    const res = await databases.listRows({
      databaseId: DATABASE_ID,
      tableId: COL_EXPENSE_SHARES,
      queries: [
        Query.equal("expense_id", chunk),
        Query.limit(500)
      ]
    });
    allShares = [...allShares, ...res.rows];
  }
  
  return allShares;
};

export const updateExpenseShareStatus = async (shareId, is_paid) => {
  return await databases.updateRow({
    databaseId: DATABASE_ID,
    tableId: COL_EXPENSE_SHARES,
    rowId: shareId,
    data: { is_paid }
  });
};

// --- RECURRING BILLS ---
export const createRecurringBill = async (data) => {
  return await databases.createRow({
    databaseId: DATABASE_ID,
    tableId: COL_RECURRING_BILLS,
    rowId: ID.unique(),
    data,
    permissions: [
      Permission.read(Role.any()),
      Permission.update(Role.user(data.created_by)),
      Permission.delete(Role.user(data.created_by)),
    ]
  });
};

export const getRecurringBillsByRoom = async (roomId) => {
  const res = await databases.listRows({
    databaseId: DATABASE_ID,
    tableId: COL_RECURRING_BILLS,
    queries: [
      Query.equal("room_id", roomId),
      Query.orderDesc("$createdAt")
    ]
  });
  return res.rows;
};
