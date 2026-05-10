import { databases, ID, DATABASE_ID, COL_CONVERSATIONS, COL_MESSAGES } from "./appwrite";
import { Query } from "appwrite";

// Create or get conversation
export const getOrCreateConversation = async (
  userId,
  otherUserId,
  listingId
) => {
  const res = await databases.listDocuments(
    DATABASE_ID,
    COL_CONVERSATIONS,
    [
      Query.equal("listingId", listingId),
      Query.or([
        Query.and([Query.equal("user1Id", userId), Query.equal("user2Id", otherUserId)]),
        Query.and([Query.equal("user1Id", otherUserId), Query.equal("user2Id", userId)])
      ])
    ]
  );

  if (res.documents.length > 0) {
    return res.documents[0];
  }

  return await databases.createDocument(
    DATABASE_ID,
    COL_CONVERSATIONS,
    ID.unique(),
    {
      user1Id: userId,
      user2Id: otherUserId,
      listingId,
    }
  );
};

// Send message
export const sendMessage = async (conversationId, senderId, text) => {
  return await databases.createDocument(
    DATABASE_ID,
    COL_MESSAGES,
    ID.unique(),
    {
      conversationId,
      senderId,
      text,
    }
  );
};

// Get messages
export const getMessages = async (conversationId) => {
  const res = await databases.listDocuments(
    DATABASE_ID,
    COL_MESSAGES,
    [
      Query.equal("conversationId", conversationId),
      Query.orderAsc("$createdAt"),
    ]
  );

  return res.documents;
};

// Get user conversations
export const getUserConversations = async (userId) => {
  const res = await databases.listDocuments(
    DATABASE_ID,
    COL_CONVERSATIONS,
    [
      Query.or([
        Query.equal("user1Id", userId),
        Query.equal("user2Id", userId),
      ]),
      Query.orderDesc("$createdAt"),
    ]
  );

  return res.documents;
};