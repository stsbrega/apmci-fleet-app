/**
 * Teltonika Codec 8 Extended (Codec 8E) Binary Protocol Parser
 *
 * The FMC150 communicates via TCP using the Teltonika binary protocol.
 * Protocol flow:
 *   1. Device connects and sends IMEI (17 bytes prefixed by 2-byte length)
 *   2. Server responds with 0x01 (accept) or 0x00 (reject)
 *   3. Device sends AVL data packets in Codec 8E format
 *   4. Server responds with number of records accepted (4 bytes, big-endian)
 *
 * Codec 8E Packet Structure:
 *   [4B preamble 0x00000000] [4B data length] [1B codec ID=0x8E]
 *   [1B record count] [N x AVL records] [1B record count]
 *   [4B CRC-16]
 *
 * AVL Record:
 *   [8B timestamp ms] [1B priority] [GPS Element] [IO Element]
 *
 * GPS Element:
 *   [4B longitude] [4B latitude] [2B altitude] [2B angle] [1B satellites] [2B speed]
 *   - Coordinates are in 10^-7 degrees (signed 32-bit int)
 *
 * IO Element (Codec 8E):
 *   [2B event_id] [2B total_count]
 *   [2B n1_count] [N x {2B id, 1B value}]   - 1-byte values
 *   [2B n2_count] [N x {2B id, 2B value}]   - 2-byte values
 *   [2B n4_count] [N x {2B id, 4B value}]   - 4-byte values
 *   [2B n8_count] [N x {2B id, 8B value}]   - 8-byte values
 */

// Well-known Teltonika AVL I/O parameter IDs relevant to FMC150 CAN data
const AVL_IO_IDS = {
  // Digital I/O
  239: 'ignition',              // 0=off, 1=on
  240: 'movement',              // 0=stationary, 1=moving
  80:  'data_mode',             // 0=home, 1=roaming, 2=no data
  21:  'gsm_signal',            // 1-5

  // Power
  66:  'external_voltage',      // mV
  67:  'battery_voltage',       // mV
  68:  'battery_current',       // mA

  // GPS
  69:  'gnss_status',           // 0=off, 1=on, 2=sleep
  181: 'gnss_pdop',             // Precision * 10
  182: 'gnss_hdop',             // Precision * 10

  // CAN Bus Data (OBD/CAN protocol - FMC150 specific)
  16:  'total_odometer',        // meters
  24:  'engine_rpm',            // RPM (value * 0.125 for some vehicles)
  31:  'accelerator_pedal_pos', // %
  51:  'fuel_level',            // % (CAN)
  72:  'engine_coolant_temp',   // Celsius (offset: -40)
  73:  'fuel_rate',             // L/h * 20
  74:  'engine_load',           // %
  75:  'intake_air_temp',       // Celsius (offset: -40)
  76:  'intake_manifold_pressure', // kPa
  77:  'engine_oil_pressure',   // kPa
  78:  'ambient_air_temp',      // Celsius (offset: -40)
  191: 'vehicle_speed_can',     // km/h (CAN bus speed)
  247: 'engine_total_hours',    // seconds
  252: 'total_fuel_used',       // Liters (different scale per vehicle)

  // DTC
  30:  'dtc_count',             // Number of Diagnostic Trouble Codes
  281: 'dtc_codes',             // Encoded DTC data
};

/**
 * Parse the IMEI from device connection handshake
 * Format: [2B length] [NB IMEI ASCII string]
 */
function parseImei(buffer) {
  if (buffer.length < 2) return null;
  const length = buffer.readUInt16BE(0);
  if (buffer.length < 2 + length) return null;
  const imei = buffer.slice(2, 2 + length).toString('ascii');
  // Basic IMEI validation: 15 digits
  if (/^\d{15}$/.test(imei)) {
    return imei;
  }
  return null;
}

/**
 * Parse a complete Codec 8E data packet
 * Returns array of parsed AVL records
 */
function parseCodec8E(buffer) {
  let offset = 0;

  // Preamble: 4 bytes of 0x00
  const preamble = buffer.readUInt32BE(offset);
  offset += 4;
  if (preamble !== 0x00000000) {
    throw new Error(`Invalid preamble: 0x${preamble.toString(16)}`);
  }

  // Data field length (4 bytes)
  const dataLength = buffer.readUInt32BE(offset);
  offset += 4;

  // Verify we have enough data
  if (buffer.length < 8 + dataLength + 4) {
    throw new Error(`Incomplete packet: expected ${8 + dataLength + 4} bytes, got ${buffer.length}`);
  }

  // Codec ID (1 byte) - should be 0x8E for Codec 8 Extended
  const codecId = buffer.readUInt8(offset);
  offset += 1;
  if (codecId !== 0x8E && codecId !== 0x08) {
    throw new Error(`Unsupported codec: 0x${codecId.toString(16)} (expected 0x8E or 0x08)`);
  }
  const isCodec8E = codecId === 0x8E;

  // Number of data records (1 byte)
  const recordCount1 = buffer.readUInt8(offset);
  offset += 1;

  const records = [];

  for (let i = 0; i < recordCount1; i++) {
    const record = parseAvlRecord(buffer, offset, isCodec8E);
    records.push(record.data);
    offset = record.offset;
  }

  // Number of data records (repeated, 1 byte)
  const recordCount2 = buffer.readUInt8(offset);
  offset += 1;

  if (recordCount1 !== recordCount2) {
    console.warn(`Record count mismatch: ${recordCount1} vs ${recordCount2}`);
  }

  // CRC-16 (4 bytes)
  const crc = buffer.readUInt32BE(offset);

  return {
    codecId,
    recordCount: recordCount1,
    records,
    crc
  };
}

/**
 * Parse a single AVL data record
 */
function parseAvlRecord(buffer, offset, isCodec8E) {
  // Timestamp (8 bytes, milliseconds since epoch)
  const timestampHigh = buffer.readUInt32BE(offset);
  const timestampLow = buffer.readUInt32BE(offset + 4);
  const timestamp = new Date(timestampHigh * 4294967296 + timestampLow);
  offset += 8;

  // Priority (1 byte): 0=low, 1=high, 2=panic
  const priority = buffer.readUInt8(offset);
  offset += 1;

  // GPS Element
  const gps = parseGpsElement(buffer, offset);
  offset = gps.offset;

  // IO Element
  const io = parseIoElement(buffer, offset, isCodec8E);
  offset = io.offset;

  return {
    data: {
      timestamp,
      priority,
      gps: gps.data,
      io: io.data
    },
    offset
  };
}

/**
 * Parse GPS element from AVL record
 * [4B longitude] [4B latitude] [2B altitude] [2B angle] [1B satellites] [2B speed]
 */
function parseGpsElement(buffer, offset) {
  // Longitude (signed 32-bit, in 10^-7 degrees)
  const lonRaw = buffer.readInt32BE(offset);
  const longitude = lonRaw / 10000000;
  offset += 4;

  // Latitude (signed 32-bit, in 10^-7 degrees)
  const latRaw = buffer.readInt32BE(offset);
  const latitude = latRaw / 10000000;
  offset += 4;

  // Altitude (unsigned 16-bit, meters)
  const altitude = buffer.readUInt16BE(offset);
  offset += 2;

  // Angle/heading (unsigned 16-bit, degrees 0-360)
  const heading = buffer.readUInt16BE(offset);
  offset += 2;

  // Satellites (unsigned 8-bit)
  const satellites = buffer.readUInt8(offset);
  offset += 1;

  // Speed (unsigned 16-bit, km/h)
  const speed = buffer.readUInt16BE(offset);
  offset += 2;

  return {
    data: { latitude, longitude, altitude, heading, satellites, speed },
    offset
  };
}

/**
 * Parse IO element from AVL record
 * Codec 8E uses 2-byte IO IDs, Codec 8 uses 1-byte IO IDs
 */
function parseIoElement(buffer, offset, isCodec8E) {
  const idSize = isCodec8E ? 2 : 1;
  const readId = isCodec8E
    ? (buf, off) => buf.readUInt16BE(off)
    : (buf, off) => buf.readUInt8(off);
  const readCount = isCodec8E
    ? (buf, off) => buf.readUInt16BE(off)
    : (buf, off) => buf.readUInt8(off);
  const countSize = isCodec8E ? 2 : 1;

  // Event IO ID
  const eventId = readId(buffer, offset);
  offset += idSize;

  // Total IO element count
  const totalCount = readCount(buffer, offset);
  offset += countSize;

  const ioElements = {};

  // Parse 1-byte value elements
  const n1Count = readCount(buffer, offset);
  offset += countSize;
  for (let i = 0; i < n1Count; i++) {
    const id = readId(buffer, offset);
    offset += idSize;
    const value = buffer.readUInt8(offset);
    offset += 1;
    ioElements[id] = value;
  }

  // Parse 2-byte value elements
  const n2Count = readCount(buffer, offset);
  offset += countSize;
  for (let i = 0; i < n2Count; i++) {
    const id = readId(buffer, offset);
    offset += idSize;
    const value = buffer.readUInt16BE(offset);
    offset += 2;
    ioElements[id] = value;
  }

  // Parse 4-byte value elements
  const n4Count = readCount(buffer, offset);
  offset += countSize;
  for (let i = 0; i < n4Count; i++) {
    const id = readId(buffer, offset);
    offset += idSize;
    const value = buffer.readUInt32BE(offset);
    offset += 4;
    ioElements[id] = value;
  }

  // Parse 8-byte value elements
  const n8Count = readCount(buffer, offset);
  offset += countSize;
  for (let i = 0; i < n8Count; i++) {
    const id = readId(buffer, offset);
    offset += idSize;
    const high = buffer.readUInt32BE(offset);
    const low = buffer.readUInt32BE(offset + 4);
    offset += 8;
    ioElements[id] = high * 4294967296 + low;
  }

  // Codec 8E also supports variable-length (NX) elements
  if (isCodec8E && offset < buffer.length - 5) {
    try {
      const nxCount = buffer.readUInt16BE(offset);
      offset += 2;
      for (let i = 0; i < nxCount; i++) {
        const id = buffer.readUInt16BE(offset);
        offset += 2;
        const len = buffer.readUInt16BE(offset);
        offset += 2;
        ioElements[id] = buffer.slice(offset, offset + len);
        offset += len;
      }
    } catch (e) {
      // NX elements are optional; ignore parse errors
    }
  }

  return {
    data: {
      eventId,
      totalCount,
      elements: ioElements
    },
    offset
  };
}

/**
 * Extract CAN bus data from parsed IO elements
 * Maps Teltonika AVL IDs to human-readable CAN parameters
 */
function extractCanData(ioElements) {
  const can = {};

  if (ioElements[24] !== undefined) {
    can.engine_rpm = ioElements[24];
  }
  if (ioElements[72] !== undefined) {
    // Engine coolant temp has -40 offset in J1939
    can.engine_coolant_temp = ioElements[72] - 40;
  }
  if (ioElements[74] !== undefined) {
    can.engine_load = ioElements[74];
  }
  if (ioElements[247] !== undefined) {
    // Convert seconds to hours
    can.engine_total_hours = Math.floor(ioElements[247] / 3600);
  }
  if (ioElements[51] !== undefined) {
    can.fuel_level_can = ioElements[51];
  }
  if (ioElements[73] !== undefined) {
    can.fuel_rate = ioElements[73] / 20; // Scale factor
  }
  if (ioElements[252] !== undefined) {
    can.total_fuel_used = ioElements[252];
  }
  if (ioElements[191] !== undefined) {
    can.vehicle_speed_can = ioElements[191];
  }
  if (ioElements[31] !== undefined) {
    can.accelerator_pedal_pos = ioElements[31];
  }
  if (ioElements[16] !== undefined) {
    can.total_distance = ioElements[16] / 1000; // meters to km
  }
  if (ioElements[66] !== undefined) {
    can.battery_voltage = ioElements[66] / 1000; // mV to V
  }
  if (ioElements[75] !== undefined) {
    can.intake_air_temp = ioElements[75] - 40;
  }
  if (ioElements[76] !== undefined) {
    can.intake_manifold_pressure = ioElements[76];
  }
  if (ioElements[77] !== undefined) {
    can.engine_oil_pressure = ioElements[77];
  }
  if (ioElements[78] !== undefined) {
    can.ambient_air_temp = ioElements[78] - 40;
  }
  if (ioElements[30] !== undefined) {
    can.dtc_count = ioElements[30];
  }
  if (ioElements[239] !== undefined) {
    can.ignition = ioElements[239] === 1;
  }

  return can;
}

/**
 * Check if a parsed record contains any CAN bus data
 */
function hasCanData(ioElements) {
  const canIds = [24, 31, 51, 72, 73, 74, 75, 76, 77, 78, 191, 247, 252];
  return canIds.some(id => ioElements[id] !== undefined);
}

/**
 * Calculate CRC-16 for Teltonika protocol
 * Uses CRC-16/IBM (CRC-16/ARC) polynomial 0xA001
 */
function calculateCrc16(buffer) {
  let crc = 0;
  for (let i = 0; i < buffer.length; i++) {
    crc ^= buffer[i];
    for (let j = 0; j < 8; j++) {
      if (crc & 1) {
        crc = (crc >> 1) ^ 0xA001;
      } else {
        crc = crc >> 1;
      }
    }
  }
  return crc;
}

module.exports = {
  AVL_IO_IDS,
  parseImei,
  parseCodec8E,
  extractCanData,
  hasCanData,
  calculateCrc16
};
