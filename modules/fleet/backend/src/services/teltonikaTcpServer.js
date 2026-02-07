/**
 * Teltonika FMC150 TCP Server
 *
 * Listens for incoming TCP connections from Teltonika GPS trackers.
 * The FMC150 uses Codec 8 Extended over TCP for data transmission.
 *
 * Connection flow:
 *   1. Device opens TCP connection
 *   2. Device sends IMEI packet: [2B length][15B IMEI ASCII]
 *   3. Server replies 0x01 (accept) or 0x00 (reject)
 *   4. Device sends AVL data packets
 *   5. Server replies with accepted record count (4 bytes big-endian)
 *   6. Repeat from step 4 until disconnect
 */

const net = require('net');
const db = require('../db/connection');
const { parseImei, parseCodec8E, extractCanData, hasCanData } = require('./teltonikaCodec');
const { emitGpsUpdate, emitCanDataUpdate } = require('./socketService');
const { processCanAlerts } = require('./canDataService');

const TELTONIKA_TCP_PORT = parseInt(process.env.TELTONIKA_TCP_PORT) || 5027;

// Track connected devices
const connectedDevices = new Map();

/**
 * Create and start the Teltonika TCP server
 */
function createTeltonikaTcpServer() {
  const server = net.createServer((socket) => {
    let imei = null;
    let buffer = Buffer.alloc(0);
    const remoteAddress = `${socket.remoteAddress}:${socket.remotePort}`;

    console.log(`[Teltonika TCP] New connection from ${remoteAddress}`);

    socket.setTimeout(300000); // 5 minute timeout

    socket.on('data', async (data) => {
      // Accumulate data in buffer
      buffer = Buffer.concat([buffer, data]);

      try {
        if (!imei) {
          // First message should be IMEI
          imei = parseImei(buffer);
          if (imei) {
            console.log(`[Teltonika TCP] Device IMEI: ${imei} from ${remoteAddress}`);

            // Check if device is registered
            const truck = await db('trucks')
              .where(function() {
                this.where('gps_device_imei', imei)
                  .orWhere('gps_device_id', imei);
              })
              .first();

            if (truck) {
              // Accept connection
              socket.write(Buffer.from([0x01]));
              connectedDevices.set(imei, {
                socket,
                truckId: truck.id,
                connectedAt: new Date(),
                remoteAddress
              });

              // Update last seen
              await db('trucks')
                .where('id', truck.id)
                .update({ device_last_seen: new Date() });

              console.log(`[Teltonika TCP] Accepted device ${imei} -> ${truck.id}`);
            } else {
              // Accept but log as unregistered (still collect data for later assignment)
              socket.write(Buffer.from([0x01]));
              connectedDevices.set(imei, {
                socket,
                truckId: null,
                connectedAt: new Date(),
                remoteAddress,
                unregistered: true
              });
              console.log(`[Teltonika TCP] Accepted unregistered device ${imei} - data will be stored when registered`);
            }

            buffer = Buffer.alloc(0);
          }
        } else {
          // Subsequent messages are AVL data packets
          // Wait until we have at least the header to determine packet size
          if (buffer.length < 8) return;

          const dataLength = buffer.readUInt32BE(4);
          const totalPacketSize = 8 + dataLength + 4; // preamble + data + CRC

          if (buffer.length < totalPacketSize) return; // Wait for more data

          const packet = buffer.slice(0, totalPacketSize);
          buffer = buffer.slice(totalPacketSize);

          const parsed = parseCodec8E(packet);
          console.log(`[Teltonika TCP] Received ${parsed.recordCount} records from ${imei}`);

          // Process each AVL record
          await processAvlRecords(imei, parsed.records);

          // Acknowledge: send number of accepted records (4 bytes big-endian)
          const ackBuffer = Buffer.alloc(4);
          ackBuffer.writeUInt32BE(parsed.recordCount, 0);
          socket.write(ackBuffer);
        }
      } catch (err) {
        console.error(`[Teltonika TCP] Error processing data from ${imei || remoteAddress}:`, err.message);
        // Don't close connection on parse errors - device may resend
      }
    });

    socket.on('timeout', () => {
      console.log(`[Teltonika TCP] Timeout for ${imei || remoteAddress}`);
      socket.end();
    });

    socket.on('error', (err) => {
      console.error(`[Teltonika TCP] Socket error for ${imei || remoteAddress}:`, err.message);
    });

    socket.on('close', () => {
      if (imei) {
        connectedDevices.delete(imei);
      }
      console.log(`[Teltonika TCP] Disconnected: ${imei || remoteAddress}`);
    });
  });

  server.on('error', (err) => {
    console.error(`[Teltonika TCP] Server error:`, err.message);
  });

  server.listen(TELTONIKA_TCP_PORT, () => {
    console.log(`[Teltonika TCP] Server listening on port ${TELTONIKA_TCP_PORT}`);
    console.log(`[Teltonika TCP] Configure FMC150 devices to connect to this server's IP on port ${TELTONIKA_TCP_PORT}`);
  });

  return server;
}

/**
 * Process parsed AVL records from a device
 */
async function processAvlRecords(imei, records) {
  const deviceInfo = connectedDevices.get(imei);
  let truckId = deviceInfo?.truckId;

  // If device was unregistered, check again
  if (!truckId) {
    const truck = await db('trucks')
      .where(function() {
        this.where('gps_device_imei', imei)
          .orWhere('gps_device_id', imei);
      })
      .first();
    if (truck) {
      truckId = truck.id;
      if (deviceInfo) {
        deviceInfo.truckId = truckId;
        deviceInfo.unregistered = false;
      }
    }
  }

  if (!truckId) {
    console.log(`[Teltonika TCP] Skipping data for unregistered IMEI ${imei}`);
    return;
  }

  for (const record of records) {
    try {
      await processRecord(imei, truckId, record);
    } catch (err) {
      console.error(`[Teltonika TCP] Error processing record for ${truckId}:`, err.message);
    }
  }

  // Update device last seen
  await db('trucks')
    .where('id', truckId)
    .update({ device_last_seen: new Date() });
}

/**
 * Process a single AVL record: save GPS data, CAN data, emit real-time updates
 */
async function processRecord(imei, truckId, record) {
  const { timestamp, priority, gps, io } = record;

  // Save GPS data
  const gpsRecord = {
    truck_id: truckId,
    latitude: gps.latitude,
    longitude: gps.longitude,
    speed: gps.speed,
    heading: gps.heading,
    altitude: gps.altitude,
    satellites: gps.satellites,
    device_imei: imei,
    priority,
    event_id: io.eventId ? String(io.eventId) : null,
    recorded_at: timestamp
  };

  // Only save if coordinates are valid (not 0,0)
  if (gps.latitude !== 0 || gps.longitude !== 0) {
    const [savedGps] = await db('gps_data')
      .insert(gpsRecord)
      .returning('*');

    // Update truck status based on speed
    const truck = await db('trucks').where('id', truckId).first();
    const updateData = { device_last_seen: new Date() };

    if (gps.speed > 0 && truck.status !== 'maintenance') {
      updateData.status = 'active';
    } else if (gps.speed === 0 && truck.status === 'active') {
      updateData.status = 'idle';
    }

    // Update fuel from CAN if available
    const canData = extractCanData(io.elements);
    if (canData.fuel_level_can !== undefined) {
      updateData.current_fuel_level = canData.fuel_level_can;
    }

    // Update odometer from CAN if available
    if (canData.total_distance !== undefined) {
      updateData.odometer = canData.total_distance;
    }

    await db('trucks').where('id', truckId).update(updateData);

    // Emit real-time GPS update via Socket.io
    emitGpsUpdate(truckId, {
      latitude: gps.latitude,
      longitude: gps.longitude,
      speed: gps.speed,
      heading: gps.heading,
      altitude: gps.altitude,
      satellites: gps.satellites,
      fuel_level: canData.fuel_level_can !== undefined
        ? canData.fuel_level_can
        : parseFloat(truck.current_fuel_level),
      timestamp: timestamp
    });
  }

  // Save CAN data if present
  if (hasCanData(io.elements)) {
    const canData = extractCanData(io.elements);
    const canRecord = {
      truck_id: truckId,
      device_imei: imei,
      engine_rpm: canData.engine_rpm,
      engine_coolant_temp: canData.engine_coolant_temp,
      engine_load: canData.engine_load,
      engine_total_hours: canData.engine_total_hours,
      fuel_level_can: canData.fuel_level_can,
      fuel_rate: canData.fuel_rate,
      total_fuel_used: canData.total_fuel_used,
      vehicle_speed_can: canData.vehicle_speed_can,
      accelerator_pedal_pos: canData.accelerator_pedal_pos,
      total_distance: canData.total_distance,
      battery_voltage: canData.battery_voltage,
      intake_air_temp: canData.intake_air_temp,
      intake_manifold_pressure: canData.intake_manifold_pressure,
      engine_oil_pressure: canData.engine_oil_pressure,
      ambient_air_temp: canData.ambient_air_temp,
      dtc_count: canData.dtc_count || 0,
      raw_io_data: JSON.stringify(io.elements),
      recorded_at: timestamp
    };

    await db('can_data').insert(canRecord);

    // Emit real-time CAN data update via Socket.io
    emitCanDataUpdate(truckId, canData);

    // Process CAN-based alerts (engine warnings, DTC codes, etc.)
    await processCanAlerts(truckId, canData);
  }
}

/**
 * Get status of all connected devices
 */
function getConnectedDevices() {
  const devices = [];
  for (const [imei, info] of connectedDevices) {
    devices.push({
      imei,
      truckId: info.truckId,
      connectedAt: info.connectedAt,
      remoteAddress: info.remoteAddress,
      unregistered: info.unregistered || false
    });
  }
  return devices;
}

module.exports = {
  createTeltonikaTcpServer,
  getConnectedDevices,
  TELTONIKA_TCP_PORT
};
