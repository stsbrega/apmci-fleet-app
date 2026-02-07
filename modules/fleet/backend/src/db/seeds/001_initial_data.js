const bcrypt = require('bcryptjs');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function(knex) {
  // Check if data already exists to avoid re-seeding
  const existingUsers = await knex('users').count('* as count').first();
  if (existingUsers && existingUsers.count > 0) {
    console.log('Database already seeded, skipping...');
    return;
  }

  // Clear existing data (in reverse order of dependencies)
  await knex('alerts').del();
  await knex('maintenance_records').del();
  await knex('fuel_records').del();
  // Clear CAN data if table exists
  const hasCanTable = await knex.schema.hasTable('can_data');
  if (hasCanTable) {
    await knex('can_data').del();
  }
  await knex('gps_data').del();
  await knex('drivers').del();
  await knex('trucks').del();
  await knex('users').del();

  // Create admin user
  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash('admin123', salt);

  await knex('users').insert([
    {
      email: 'admin@fleettrack.com',
      password_hash,
      name: 'Fleet Admin',
      role: 'admin'
    },
    {
      email: 'manager@fleettrack.com',
      password_hash: await bcrypt.hash('manager123', salt),
      name: 'Fleet Manager',
      role: 'manager'
    }
  ]);

  // Check if new columns exist (from FMC150 migration)
  const hasDeviceModel = await knex.schema.hasColumn('trucks', 'gps_device_model');

  // Create trucks with FMC150 device assignments
  // IMEIs are placeholders - will be updated with actual FMC150 IMEIs upon delivery
  const truckData = [
    {
      id: 'TRK-001',
      plate_number: 'ABC-1234',
      make: 'Freightliner',
      model: 'Cascadia',
      year: 2022,
      vin: '1FUJGLDR5CLBP1234',
      status: 'active',
      fuel_capacity: 400,
      current_fuel_level: 78,
      odometer: 45230,
      gps_device_id: 'GPS-001',
      ...(hasDeviceModel && {
        gps_device_model: 'FMC150',
        gps_device_imei: '352625090000001',
        gps_protocol: 'tcp_codec8e'
      })
    },
    {
      id: 'TRK-002',
      plate_number: 'DEF-5678',
      make: 'Kenworth',
      model: 'T680',
      year: 2021,
      vin: '1XKYD49X1MJ456789',
      status: 'active',
      fuel_capacity: 380,
      current_fuel_level: 92,
      odometer: 38920,
      gps_device_id: 'GPS-002',
      ...(hasDeviceModel && {
        gps_device_model: 'FMC150',
        gps_device_imei: '352625090000002',
        gps_protocol: 'tcp_codec8e'
      })
    },
    {
      id: 'TRK-003',
      plate_number: 'GHI-9012',
      make: 'Peterbilt',
      model: '579',
      year: 2020,
      vin: '1XPWD49X1MD012345',
      status: 'idle',
      fuel_capacity: 350,
      current_fuel_level: 45,
      odometer: 52100,
      gps_device_id: 'GPS-003',
      ...(hasDeviceModel && {
        gps_device_model: 'FMC150',
        gps_device_imei: '352625090000003',
        gps_protocol: 'tcp_codec8e'
      })
    },
    {
      id: 'TRK-004',
      plate_number: 'JKL-3456',
      make: 'Volvo',
      model: 'VNL 860',
      year: 2023,
      vin: '4V4NC9EH5PN567890',
      status: 'active',
      fuel_capacity: 420,
      current_fuel_level: 68,
      odometer: 41500,
      gps_device_id: 'GPS-004',
      ...(hasDeviceModel && {
        gps_device_model: 'FMC150',
        gps_device_imei: '352625090000004',
        gps_protocol: 'tcp_codec8e'
      })
    },
    {
      id: 'TRK-005',
      plate_number: 'MNO-7890',
      make: 'Mack',
      model: 'Anthem',
      year: 2019,
      vin: '1M1AN07Y5KM890123',
      status: 'maintenance',
      fuel_capacity: 360,
      current_fuel_level: 30,
      odometer: 67800,
      gps_device_id: 'GPS-005',
      ...(hasDeviceModel && {
        gps_device_model: 'FMC150',
        gps_device_imei: '352625090000005',
        gps_protocol: 'tcp_codec8e'
      })
    },
    {
      id: 'TRK-006',
      plate_number: 'PQR-1234',
      make: 'International',
      model: 'LT',
      year: 2022,
      vin: '3HSDJSJR1NN123456',
      status: 'active',
      fuel_capacity: 390,
      current_fuel_level: 85,
      odometer: 34200,
      gps_device_id: 'GPS-006',
      ...(hasDeviceModel && {
        gps_device_model: 'FMC150',
        gps_device_imei: '352625090000006',
        gps_protocol: 'tcp_codec8e'
      })
    }
  ];

  await knex('trucks').insert(truckData);

  // Create drivers
  await knex('drivers').insert([
    {
      name: 'Juan Dela Cruz',
      email: 'juan.delacruz@apmci.com',
      phone: '0917-123-4501',
      license_number: 'N04-12-345678',
      license_expiry: '2026-06-15',
      status: 'on_duty',
      assigned_truck_id: 'TRK-001',
      emergency_contact_name: 'Maria Dela Cruz',
      emergency_contact_phone: '0917-123-4502'
    },
    {
      name: 'Maria Santos',
      email: 'maria.santos@apmci.com',
      phone: '0918-234-5601',
      license_number: 'N04-13-456789',
      license_expiry: '2026-09-20',
      status: 'on_duty',
      assigned_truck_id: 'TRK-002',
      emergency_contact_name: 'Pedro Santos',
      emergency_contact_phone: '0918-234-5602'
    },
    {
      name: 'Pedro Reyes',
      email: 'pedro.reyes@apmci.com',
      phone: '0919-345-6701',
      license_number: 'N04-14-567890',
      license_expiry: '2026-03-10',
      status: 'available',
      assigned_truck_id: 'TRK-003',
      emergency_contact_name: 'Rosa Reyes',
      emergency_contact_phone: '0919-345-6702'
    },
    {
      name: 'Ana Garcia',
      email: 'ana.garcia@apmci.com',
      phone: '0920-456-7801',
      license_number: 'N04-15-678901',
      license_expiry: '2026-12-01',
      status: 'on_duty',
      assigned_truck_id: 'TRK-004',
      emergency_contact_name: 'Carlos Garcia',
      emergency_contact_phone: '0920-456-7802'
    },
    {
      name: 'Jose Mendoza',
      email: 'jose.mendoza@apmci.com',
      phone: '0921-567-8901',
      license_number: 'N04-16-789012',
      license_expiry: '2026-07-25',
      status: 'off_duty',
      assigned_truck_id: 'TRK-005',
      emergency_contact_name: 'Elena Mendoza',
      emergency_contact_phone: '0921-567-8902'
    },
    {
      name: 'Rosa Villanueva',
      email: 'rosa.villanueva@apmci.com',
      phone: '0922-678-9001',
      license_number: 'N04-17-890123',
      license_expiry: '2026-04-30',
      status: 'on_duty',
      assigned_truck_id: 'TRK-006',
      emergency_contact_name: 'Miguel Villanueva',
      emergency_contact_phone: '0922-678-9002'
    },
    {
      name: 'Ricardo Bautista',
      email: 'ricardo.bautista@apmci.com',
      phone: '0923-789-0101',
      license_number: 'N04-18-901234',
      license_expiry: '2026-11-15',
      status: 'available',
      assigned_truck_id: null,
      emergency_contact_name: 'Lorna Bautista',
      emergency_contact_phone: '0923-789-0102'
    }
  ]);

  // Create GPS data for each truck (Laguna-Batangas area, Philippines)
  const now = new Date();
  const gpsData = [
    { truck_id: 'TRK-001', latitude: 14.1450, longitude: 121.1200, speed: 65, heading: 180, city: 'SLEX - Southbound', route_info: 'Calamba to LIMA Technopark (Yamaha)' },
    { truck_id: 'TRK-002', latitude: 14.0400, longitude: 121.0700, speed: 70, heading: 0, city: 'STAR Tollway', route_info: 'LIMA Technopark to Calamba (Return)' },
    { truck_id: 'TRK-003', latitude: 13.9700, longitude: 121.0450, speed: 0, heading: 0, city: 'LIMA Technopark', route_info: 'Yamaha Delivery Point' },
    { truck_id: 'TRK-004', latitude: 14.1700, longitude: 121.2200, speed: 55, heading: 90, city: 'Los Baños, Laguna', route_info: 'Calamba to Los Baños (Local Delivery)' },
    { truck_id: 'TRK-005', latitude: 14.2114, longitude: 121.1653, speed: 0, heading: 0, city: 'APMCI Factory - Service Bay', route_info: 'Under Maintenance' },
    { truck_id: 'TRK-006', latitude: 14.2250, longitude: 121.0800, speed: 48, heading: 270, city: 'Silang Boundary', route_info: 'Calamba to Silang, Cavite' }
  ];

  for (const data of gpsData) {
    await knex('gps_data').insert({
      ...data,
      recorded_at: now
    });
  }

  // Create fuel records
  const fuelData = [];
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    for (const truck of ['TRK-001', 'TRK-002', 'TRK-003', 'TRK-004', 'TRK-005', 'TRK-006']) {
      // Daily reading
      fuelData.push({
        truck_id: truck,
        fuel_level: 50 + Math.random() * 50,
        record_type: 'reading',
        consumption_rate: 7 + Math.random() * 3,
        recorded_at: date
      });

      // Occasional refuel
      if (Math.random() > 0.7) {
        fuelData.push({
          truck_id: truck,
          fuel_level: 95,
          record_type: 'refuel',
          liters_added: 200 + Math.random() * 150,
          cost: 300 + Math.random() * 200,
          station_name: ['Shell', 'Petron', 'Caltex', 'Phoenix'][Math.floor(Math.random() * 4)],
          recorded_at: new Date(date.getTime() + 8 * 60 * 60 * 1000) // 8 hours later
        });
      }
    }
  }

  await knex('fuel_records').insert(fuelData);

  // Create maintenance records
  const user = await knex('users').where({ email: 'admin@fleettrack.com' }).first();

  await knex('maintenance_records').insert([
    {
      truck_id: 'TRK-005',
      type: 'engine_service',
      title: 'Engine Diagnostics',
      description: 'Check engine light investigation and repair',
      scheduled_date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      status: 'in_progress',
      priority: 'high',
      estimated_cost: 1500,
      service_provider: 'APMCI Service Bay',
      created_by: user.id
    },
    {
      truck_id: 'TRK-003',
      type: 'oil_change',
      title: 'Scheduled Oil Change',
      description: 'Regular maintenance oil change',
      scheduled_date: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      status: 'scheduled',
      priority: 'medium',
      estimated_cost: 350,
      service_provider: 'Calamba Auto Services',
      created_by: user.id
    },
    {
      truck_id: 'TRK-001',
      type: 'tire_rotation',
      title: 'Tire Rotation',
      description: 'Rotate all tires for even wear',
      scheduled_date: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      status: 'scheduled',
      priority: 'low',
      estimated_cost: 150,
      service_provider: 'Laguna Tire Center',
      created_by: user.id
    },
    {
      truck_id: 'TRK-002',
      type: 'brake_service',
      title: 'Brake Inspection',
      description: 'Comprehensive brake system inspection',
      scheduled_date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      status: 'scheduled',
      priority: 'high',
      estimated_cost: 800,
      service_provider: 'Batangas Truck Repair Shop',
      created_by: user.id
    }
  ]);

  // Create alerts
  await knex('alerts').insert([
    {
      truck_id: 'TRK-005',
      type: 'low_fuel',
      title: 'Low Fuel Alert - TRK-005',
      message: 'Fuel level at 30%. Recommend refueling soon.',
      severity: 'warning',
      acknowledged: false,
      metadata: JSON.stringify({ fuel_level: 30 })
    },
    {
      truck_id: 'TRK-003',
      type: 'maintenance_due',
      title: 'Maintenance Due - TRK-003',
      message: 'Scheduled maintenance in 200 km. Book service appointment.',
      severity: 'warning',
      acknowledged: false,
      metadata: JSON.stringify({ maintenance_id: 2 })
    },
    {
      truck_id: 'TRK-001',
      type: 'speed_violation',
      title: 'Speed Alert - TRK-001',
      message: 'Vehicle exceeded speed limit on SLEX Southbound.',
      severity: 'info',
      acknowledged: true,
      metadata: JSON.stringify({ speed: 125, location: 'SLEX Southbound' })
    },
    {
      truck_id: 'TRK-004',
      type: 'speed_violation',
      title: 'Speed Alert - TRK-004',
      message: 'Vehicle exceeded speed limit on STAR Tollway.',
      severity: 'warning',
      acknowledged: false,
      metadata: JSON.stringify({ speed: 118, location: 'STAR Tollway' })
    }
  ]);

  // Seed sample CAN bus data (if table exists from FMC150 migration)
  if (hasCanTable) {
    const canData = [];
    const canTrucks = ['TRK-001', 'TRK-002', 'TRK-003', 'TRK-004', 'TRK-006'];

    for (const truckId of canTrucks) {
      const truckIndex = parseInt(truckId.split('-')[1]);
      const imei = `35262509000000${truckIndex}`;

      // Generate last 12 hours of CAN data (every 30 min)
      for (let h = 11; h >= 0; h--) {
        const recordTime = new Date(now.getTime() - h * 30 * 60 * 1000);
        const isMoving = truckId !== 'TRK-003' || h > 4; // TRK-003 is idle

        canData.push({
          truck_id: truckId,
          device_imei: imei,
          engine_rpm: isMoving ? 1200 + Math.floor(Math.random() * 1200) : 700 + Math.floor(Math.random() * 100),
          engine_coolant_temp: 75 + Math.random() * 15,
          engine_load: isMoving ? 30 + Math.random() * 40 : 5 + Math.random() * 10,
          fuel_level_can: 40 + Math.random() * 50,
          fuel_rate: isMoving ? 8 + Math.random() * 12 : 1 + Math.random() * 2,
          vehicle_speed_can: isMoving ? 40 + Math.random() * 50 : 0,
          accelerator_pedal_pos: isMoving ? 20 + Math.random() * 60 : 0,
          battery_voltage: 13.2 + Math.random() * 1.2,
          total_distance: 30000 + truckIndex * 5000 + h * 15,
          intake_air_temp: 28 + Math.random() * 8,
          engine_oil_pressure: 200 + Math.random() * 150,
          ambient_air_temp: 30 + Math.random() * 5,
          dtc_count: 0,
          recorded_at: recordTime
        });
      }
    }

    await knex('can_data').insert(canData);
    console.log(`Seeded ${canData.length} CAN data records for FMC150 devices.`);
  }

  console.log('Seed data inserted successfully!');
};
