import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getUnreadCount } from "../services/chat.service";
import { getSocket } from "../services/socket";

export function useOnlineUsers(enabled = true) {
  const [onlineSet, setOnlineSet] = useState(() => new Set());

  useEffect(() => {
    if (!enabled) return;
    const socket = getSocket();

    const syncAll = () => {
      socket.emit("get_online_users", (ids = []) => {
        setOnlineSet(new Set(ids));
      });
    };

    const handleOnline = ({ userId }) => {
      setOnlineSet((prev) => {
        const next = new Set(prev);
        next.add(userId);
        return next;
      });
    };

    const handleOffline = ({ userId }) => {
      setOnlineSet((prev) => {
        if (!prev.has(userId)) return prev;
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    };

    syncAll();
    socket.on("connect", syncAll);
    socket.on("user_online", handleOnline);
    socket.on("user_offline", handleOffline);

    return () => {
      socket.off("connect", syncAll);
      socket.off("user_online", handleOnline);
      socket.off("user_offline", handleOffline);
    };
  }, [enabled]);

  return onlineSet;
}

export function useUnreadCount(enabled = true) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["unread_count"],
    queryFn: getUnreadCount,
    enabled,
    staleTime: 1000 * 30,
  });

  useEffect(() => {
    if (!enabled) return;
    const socket = getSocket();

    const handleUnreadUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ["unread_count"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    };

    socket.on("unread_updated", handleUnreadUpdated);
    return () => {
      socket.off("unread_updated", handleUnreadUpdated);
    };
  }, [enabled, queryClient]);

  return query.data ?? 0;
}

export function useTypingIndicator(conversationId, currentUserId) {
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const stopTimerRef = useRef(null);
  const remoteClearRef = useRef(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    if (!conversationId) return;
    const socket = getSocket();

    const handleTyping = ({ conversationId: cid, userId }) => {
      if (cid !== conversationId || userId === currentUserId) return;
      setIsOtherTyping(true);
      clearTimeout(remoteClearRef.current);
      remoteClearRef.current = setTimeout(() => setIsOtherTyping(false), 3000);
    };

    const handleStopTyping = ({ conversationId: cid, userId }) => {
      if (cid !== conversationId || userId === currentUserId) return;
      clearTimeout(remoteClearRef.current);
      setIsOtherTyping(false);
    };

    socket.on("user_typing", handleTyping);
    socket.on("user_stop_typing", handleStopTyping);

    return () => {
      clearTimeout(remoteClearRef.current);
      setIsOtherTyping(false);
      socket.off("user_typing", handleTyping);
      socket.off("user_stop_typing", handleStopTyping);
    };
  }, [conversationId, currentUserId]);

  const stopTyping = useCallback(() => {
    if (!conversationId || !isTypingRef.current) return;
    isTypingRef.current = false;
    clearTimeout(stopTimerRef.current);
    getSocket().emit("stop_typing", { conversationId });
  }, [conversationId]);

  const notifyTyping = useCallback(() => {
    if (!conversationId) return;
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      getSocket().emit("typing", { conversationId });
    }
    clearTimeout(stopTimerRef.current);
    stopTimerRef.current = setTimeout(() => {
      stopTyping();
    }, 1800);
  }, [conversationId, stopTyping]);

  useEffect(() => {
    return () => {
      clearTimeout(stopTimerRef.current);
    };
  }, []);

  return { isOtherTyping, notifyTyping, stopTyping };
}
