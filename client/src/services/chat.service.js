import { api } from "./api";

export const getOrCreateConversation = async (_userId, otherUserId, listingId) => {
  const { data } = await api.post("/conversations", {
    otherUserId,
    listingId,
  });
  return data.conversation;
};

export const sendMessage = async (conversationId, _senderId, text) => {
  const { data } = await api.post(`/conversations/${conversationId}/messages`, {
    text,
  });
  return data.message;
};

export const getMessages = async (conversationId) => {
  const { data } = await api.get(`/conversations/${conversationId}/messages`);
  return data.messages;
};

export const getUserConversations = async () => {
  const { data } = await api.get("/conversations");
  return data.conversations;
};

export const deleteConversation = async (conversationId) => {
  const { data } = await api.delete(`/conversations/${conversationId}`);
  return data;
};

export const getUnreadCount = async () => {
  const { data } = await api.get("/conversations/unread-count");
  return data.unreadCount ?? 0;
};

export const markConversationRead = async (conversationId) => {
  const { data } = await api.post(`/conversations/${conversationId}/read`);
  return data;
};
