import { io } from "socket.io-client";
import { getAuthToken, SERVER_URL } from "./api";

let socketInstance = null;

export function getSocket() {
  if (!socketInstance) {
    socketInstance = io(SERVER_URL, {
      withCredentials: true,
      auth: (cb) => {
        cb({ token: getAuthToken() });
      },
      autoConnect: true,
    });
  }
  return socketInstance;
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}
