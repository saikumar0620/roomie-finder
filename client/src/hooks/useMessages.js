import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMessages } from "../services/chat.service";
import { getSocket } from "../services/socket";

export const useMessages = (conversationId) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => getMessages(conversationId),
    enabled: !!conversationId,
  });

  useEffect(() => {
    if (!conversationId) return;

    const socket = getSocket();
    socket.emit("join_conversation", conversationId);

    const handleNewMessage = (newMessage) => {
      if (newMessage.conversationId !== conversationId) return;

      queryClient.setQueryData(
        ["messages", conversationId],
        (oldData = []) => {
          const exists = oldData.some((m) => m.$id === newMessage.$id);
          if (exists) return oldData;
          return [...oldData, newMessage];
        }
      );
    };

    socket.on("new_message", handleNewMessage);

    return () => {
      socket.emit("leave_conversation", conversationId);
      socket.off("new_message", handleNewMessage);
    };
  }, [conversationId, queryClient]);

  return query;
};
