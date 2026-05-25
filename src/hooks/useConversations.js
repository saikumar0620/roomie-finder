import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getUserConversations } from "../services/chat.service";
import { client, DATABASE_ID, COL_CONVERSATIONS } from "../services/appwrite";
import { useEffect } from "react";

export const useConversations = (userId) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["conversations", userId],
    queryFn: () => getUserConversations(userId),
    enabled: !!userId,
  });
  useEffect(() => {
    if (!userId) return;

    let isMounted = true;
    let unsubscribe;
    const channel = `databases.${DATABASE_ID}.collections.${COL_CONVERSATIONS}.documents`;

    const timeoutId = setTimeout(() => {
      if (!isMounted) return;

      unsubscribe = client.subscribe(channel, (response) => {
        if (
          response.events.some(
            (e) => e.includes(".create") || e.includes(".update"),
          )
        ) {
          const doc = response.payload;

          // Only care if it involves the current user
          if (doc.user1Id === userId || doc.user2Id === userId) {
            queryClient.setQueryData(["conversations", userId], (oldData) => {
              if (!oldData) return [doc];
              // If exists, update it, else prepend it
              if (oldData.some((c) => c.$id === doc.$id)) {
                return oldData.map((c) => (c.$id === doc.$id ? doc : c));
              }
              return [doc, ...oldData];
            });
          }
        }
      });
    }, 100);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      if (unsubscribe) unsubscribe();
    };
  }, [userId, queryClient]);

  return query;
};
