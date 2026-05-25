import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMessages } from "../services/chat.service";
import { client, DATABASE_ID, COL_MESSAGES } from "../services/appwrite";
import { useEffect } from "react";

export const useMessages = (conversationId) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => getMessages(conversationId),
    enabled: !!conversationId,
  });

  useEffect(() => {
    if (!conversationId) return;

    let isMounted = true;
    let unsubscribe;
    // Subscribe to all changes in the messages collection
    const channel = `databases.${DATABASE_ID}.collections.${COL_MESSAGES}.documents`;

    const timeoutId = setTimeout(() => {
      if (!isMounted) return;

      unsubscribe = client.subscribe(channel, (response) => {
        // Check if the event is a creation
        if (
          response.events.includes(
            "databases.*.collections.*.documents.*.create",
          ) ||
          response.events.some((e) => e.includes(".create"))
        ) {
          const newMessage = response.payload;

          // Only append if it belongs to the current conversation
          if (newMessage.conversationId === conversationId) {
            queryClient.setQueryData(
              ["messages", conversationId],
              (oldData) => {
                if (!oldData) return [newMessage];
                // Prevent duplicates
                if (oldData.some((m) => m.$id === newMessage.$id))
                  return oldData;
                return [...oldData, newMessage];
              },
            );
          }
        }
      });
    }, 100);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      if (unsubscribe) unsubscribe();
    };
  }, [conversationId, queryClient]);

  return query;
};
