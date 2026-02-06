import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

export const useSocket = (onTruckUpdate, onFuelUpdate, onNewAlert) => {
  const socketRef = useRef(null);

  useEffect(() => {
    // Initialize socket connection
    socketRef.current = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Socket connected');
      // Subscribe to fleet updates
      socket.emit('subscribe:fleet');
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    // Listen for truck location updates
    socket.on('truck:location', (data) => {
      if (onTruckUpdate) {
        onTruckUpdate(data);
      }
    });

    // Listen for truck status changes
    socket.on('truck:status', (data) => {
      if (onTruckUpdate) {
        onTruckUpdate(data);
      }
    });

    // Listen for fuel updates
    socket.on('truck:fuel', (data) => {
      if (onFuelUpdate) {
        onFuelUpdate(data);
      }
    });

    // Listen for new alerts
    socket.on('alert:new', (alert) => {
      if (onNewAlert) {
        onNewAlert(alert);
      }
    });

    // Listen for driver assignments
    socket.on('driver:assignment', (data) => {
      if (onTruckUpdate) {
        onTruckUpdate(data);
      }
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, [onTruckUpdate, onFuelUpdate, onNewAlert]);

  const subscribeToTruck = useCallback((truckId) => {
    if (socketRef.current) {
      socketRef.current.emit('subscribe:truck', truckId);
    }
  }, []);

  const unsubscribeFromTruck = useCallback((truckId) => {
    if (socketRef.current) {
      socketRef.current.emit('unsubscribe:truck', truckId);
    }
  }, []);

  return {
    socket: socketRef.current,
    subscribeToTruck,
    unsubscribeFromTruck,
  };
};

export default useSocket;
