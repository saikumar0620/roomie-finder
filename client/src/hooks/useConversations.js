import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getUserConversations } from "../services/chat.service";
import { getSocket } from "../services/socket";

export const useConversations = (userId) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["conversations", userId],
    queryFn: () => getUserConversations(userId),
    enabled: !!userId,
  });

  useEffect(() => {
    if (!userId) return;

    const socket = getSocket();

    const handleConversationUpdated = (doc) => {
      if (doc.user1Id !== userId && doc.user2Id !== userId) return;

      queryClient.setQueryData(
        ["conversations", userId],
        (oldData = []) => {
          const exists = oldData.some((c) => c.$id === doc.$id);
          if (exists) {
            return oldData.map((c) => (c.$id === doc.$id ? doc : c));
          }
          return [doc, ...oldData];
        }
      );
    };

    socket.on("conversation_updated", handleConversationUpdated);

    return () => {
      socket.off("conversation_updated", handleConversationUpdated);
    };
  }, [userId, queryClient]);

  return query;
};
