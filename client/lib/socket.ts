import { io, Socket } from 'socket.io-client';

// create a singleton socket instance
let socket: Socket | null = null;

export function getSocket() {
  if (!socket) {
    socket = io(); // will connect to current origin
  }
  return socket;
}
