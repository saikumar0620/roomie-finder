import { account, ID } from "./appwrite";

export const signup = async (email, password, name) => {
  return await account.create({ userId: ID.unique(), email, password, name });
};

export const login = async (email, password) => {
  try {
    // Appwrite SDK expects positional arguments
    return await account.createEmailPasswordSession(email, password);
  } catch (error) {
    // If a session is already active, delete the stuck session and try again seamlessly
    if (
      error?.message?.includes(
        "Creation of a session is prohibited when a session is active",
      )
    ) {
      await account.deleteSession("current");
      return await account.createEmailPasswordSession(email, password);
    }
    throw error;
  }
};

export const logout = async () => {
  try {
    return await account.deleteSession({ sessionId: "current" });
  } catch (error) {
    console.warn("Logout failed, possibly no active session:", error);
    return null; // Return null or false to indicate failed logout without re-throwing
  }
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
