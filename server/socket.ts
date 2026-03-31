import { Server as IOServer, Socket } from 'socket.io';
import http from 'http';

let io: IOServer | null = null;

export function initSocketServer(httpServer: http.Server) {
  if (io) return io; // already initialized
  io = new IOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: Socket) => {
    console.log('Socket connected:', socket.id);

    socket.on('joinRide', (data: { rideId: string; userType: string; userId?: string }) => {
      const { rideId, userType } = data;
      if (!rideId || !userType) return;
      socket.join(`${userType}_${rideId}`);
      socket.join(`ride_${rideId}`);
      console.log(`socket ${socket.id} joined rooms: ${userType}_${rideId}, ride_${rideId}`);
    });

    // ✅ ADD JOIN PASSENGER EVENT
    socket.on('joinPassenger', (data: { passengerId: string }) => {
      const { passengerId } = data;
      if (!passengerId) return;
      socket.join(`passenger_${passengerId}`);
      console.log(`socket ${socket.id} joined passenger room: passenger_${passengerId}`);
    });

    socket.on('locationUpdate', (data: { rideId: string; userType: string; coords: { lat: number; lng: number } }) => {
      const { rideId, userType, coords } = data;
      if (!rideId || !userType || !coords) return;
      if (userType === 'driver') {
        io?.to(`passenger_${rideId}`).emit('driverLocation', coords);
      } else if (userType === 'passenger') {
        io?.to(`driver_${rideId}`).emit('passengerLocation', coords);
      }
    });

    socket.on('bookingAccepted', (data: { rideId: string; passengerId: string; driverInfo: any; passengerInfo: any }) => {
      const { rideId, passengerId, driverInfo, passengerInfo } = data;
      if (!rideId || !passengerId) return;

      // Notify passenger that booking was accepted
      io?.to(`passenger_${passengerId}`).emit('bookingAccepted', {
        rideId,
        driverInfo,
        passengerInfo,
        redirectUrl: `/active-ride/${rideId}`
      });

      console.log(`Booking accepted notification sent to passenger ${passengerId} for ride ${rideId}`);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id);
    });
  });

  return io;
}

export function getIo() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}
