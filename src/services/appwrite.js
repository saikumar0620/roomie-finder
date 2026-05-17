import { Client, Account, TablesDB, Storage, ID } from "appwrite";

export const client = new Client();

client
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

export const account = new Account(client);
export const databases = new TablesDB(client);
export const storage = new Storage(client);

export const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
export const BUCKET_ID = import.meta.env.VITE_APPWRITE_BUCKET_ID;

export const COL_LISTING = import.meta.env.VITE_COLLECTION_LISTING;
export const COL_FAVORITES = import.meta.env.VITE_COLLECTION_FAVORITES;
export const COL_CONVERSATIONS = import.meta.env.VITE_COLLECTION_CONVERSATIONS;
export const COL_MESSAGES = import.meta.env.VITE_COLLECTION_MESSAGES;
export const COL_PROFILES = import.meta.env.VITE_COLLECTION_PROFILES;
export const COL_EXPENSES = import.meta.env.VITE_COLLECTION_EXPENSES || "expenses";
export const COL_EXPENSE_SHARES = import.meta.env.VITE_COLLECTION_EXPENSE_SHARES || "expense_shares";
export const COL_RECURRING_BILLS = import.meta.env.VITE_COLLECTION_RECURRING_BILLS || "recurring_bills";

export { ID };