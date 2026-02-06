let io = null;

/**
 * Initialize Socket.io
 */
const initializeSocket = (socketIo) => {
  io = socketIo;

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Join room for specific truck updates
    socket.on('subscribe:truck', (truckId) => {
      socket.join(`truck:${truckId}`);
      console.log(`Socket ${socket.id} subscribed to truck:${truckId}`);
    });

    // Leave truck room
    socket.on('unsubscribe:truck', (truckId) => {
      socket.leave(`truck:${truckId}`);
      console.log(`Socket ${socket.id} unsubscribed from truck:${truckId}`);
    });

    // Subscribe to all fleet updates
    socket.on('subscribe:fleet', () => {
      socket.join('fleet');
      console.log(`Socket ${socket.id} subscribed to fleet updates`);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
};

/**
 * Emit GPS update for a specific truck
 */
const emitGpsUpdate = (truckId, gpsData) => {
  if (io) {
    // Emit to specific truck room
    io.to(`truck:${truckId}`).emit('gps:update', { truckId, ...gpsData });
    // Also emit to fleet room
    io.to('fleet').emit('truck:location', { truckId, ...gpsData });
  }
};

/**
 * Emit fuel update for a specific truck
 */
const emitFuelUpdate = (truckId, fuelData) => {
  if (io) {
    io.to(`truck:${truckId}`).emit('fuel:update', { truckId, ...fuelData });
    io.to('fleet').emit('truck:fuel', { truckId, ...fuelData });
  }
};

/**
 * Emit new alert
 */
const emitAlert = (alert) => {
  if (io) {
    // Emit to fleet room
    io.to('fleet').emit('alert:new', alert);

    // If alert is for specific truck, emit to truck room too
    if (alert.truck_id) {
      io.to(`truck:${alert.truck_id}`).emit('alert:new', alert);
    }
  }
};

/**
 * Emit truck status change
 */
const emitTruckStatusChange = (truckId, status) => {
  if (io) {
    io.to('fleet').emit('truck:status', { truckId, status });
    io.to(`truck:${truckId}`).emit('truck:status', { truckId, status });
  }
};

/**
 * Emit driver assignment change
 */
const emitDriverAssignment = (driverId, truckId, action) => {
  if (io) {
    io.to('fleet').emit('driver:assignment', { driverId, truckId, action });
  }
};

/**
 * Broadcast message to all connected clients
 */
const broadcast = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

module.exports = {
  initializeSocket,
  emitGpsUpdate,
  emitFuelUpdate,
  emitAlert,
  emitTruckStatusChange,
  emitDriverAssignment,
  broadcast
};
