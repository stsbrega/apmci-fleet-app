require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Import routes
const authRoutes = require('./routes/auth');
const trucksRoutes = require('./routes/trucks');
const driversRoutes = require('./routes/drivers');
const gpsRoutes = require('./routes/gps');
const fuelRoutes = require('./routes/fuel');
const maintenanceRoutes = require('./routes/maintenance');
const alertsRoutes = require('./routes/alerts');
const canDataRoutes = require('./routes/canData');

// Import socket service
const { initializeSocket } = require('./services/socketService');

// Import Teltonika TCP server for FMC150 devices
const { createTeltonikaTcpServer } = require('./services/teltonikaTcpServer');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Initialize socket service
initializeSocket(io);

// Make io accessible to routes
app.set('io', io);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/trucks', trucksRoutes);
app.use('/api/drivers', driversRoutes);
app.use('/api/gps', gpsRoutes);
app.use('/api/fuel', fuelRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/can', canDataRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: { message: 'Route not found' } });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

  // Start Teltonika TCP server for FMC150 devices
  const tcpServer = createTeltonikaTcpServer();
  console.log('Teltonika FMC150 TCP server initialized');
});

module.exports = { app, server, io };
