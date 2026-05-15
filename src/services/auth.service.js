import { account, ID } from "./appwrite";

export const signup = async (email, password, name) => {
  return await account.create({ userId: ID.unique(), email, password, name });
};

export const login = async (email, password) => {
  await account.deleteSession({ sessionId: "current" });
  return await account.createEmailPasswordSession({ email, password });
};

export const logout = async () => {
  return await account.deleteSession({ sessionId: "current" });
};

export const getCurrentUser = async () => {
  // Check if an Appwrite session cookie likely exists
  // This avoids unnecessary 401 requests when no user is logged in
  const hasSession = document.cookie
    .split(";")
    .some((c) => c.trim().startsWith("a_session_"));

  if (!hasSession && !localStorage.getItem("cookieFallback")) {
    return null; // No session — skip the API call entirely
  }

  try {
    return await account.get();
  } catch {
    return null;
  }
};