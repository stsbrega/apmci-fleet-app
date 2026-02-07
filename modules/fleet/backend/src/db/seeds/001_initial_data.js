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
    { email: 'admin@fleettrack.com', password_hash, name: 'Fleet Admin', role: 'admin' },
    { email: 'manager@fleettrack.com', password_hash: await bcrypt.hash('manager123', salt), name: 'Fleet Manager', role: 'manager' }
  ]);

  // Check if FMC150 migration columns exist
  const hasDeviceModel = await knex.schema.hasColumn('trucks', 'gps_device_model');

  const fmc = (i) => hasDeviceModel ? {
    gps_device_model: 'FMC150',
    gps_device_imei: `35262509000${String(i).padStart(4, '0')}`,
    gps_protocol: 'tcp_codec8e'
  } : {};

  // ── APMCI actual fleet ─ 15 trucks ──────────────────────────────
  const truckData = [
    { id: 'TRK-001', plate_number: 'NCG 4723', make: 'Hino', model: 'WU342L-M', year: 2018, vin: 'MJECH40HXG5142022', status: 'active', fuel_capacity: 100, current_fuel_level: 78, odometer: 112000, gps_device_id: 'GPS-001', ...fmc(1) },
    { id: 'TRK-002', plate_number: 'NDF 7968', make: 'Hino', model: 'WU342L-M', year: 2016, vin: 'MJECH40H1G5142023', status: 'active', fuel_capacity: 100, current_fuel_level: 65, odometer: 148000, gps_device_id: 'GPS-002', ...fmc(2) },
    { id: 'TRK-003', plate_number: 'NCF-2403', make: 'Hino', model: 'WU730L', year: 2016, vin: 'JHHZJL0H102000313', status: 'active', fuel_capacity: 200, current_fuel_level: 55, odometer: 156000, gps_device_id: 'GPS-003', ...fmc(3) },
    { id: 'TRK-004', plate_number: 'NAL 2498', make: 'Hino', model: 'FG8J', year: 2017, vin: 'FG8J17888', status: 'active', fuel_capacity: 300, current_fuel_level: 72, odometer: 125000, gps_device_id: 'GPS-004', ...fmc(4) },
    { id: 'TRK-005', plate_number: 'ZBJ-997', make: 'Isuzu', model: 'NQR', year: 2005, vin: 'PABN1R71RL5200178', status: 'maintenance', fuel_capacity: 200, current_fuel_level: 30, odometer: 312000, gps_device_id: 'GPS-005', ...fmc(5) },
    { id: 'TRK-006', plate_number: 'NQO-721', make: 'Isuzu', model: 'ELF', year: 2009, vin: 'ENKR-20080481-C', status: 'active', fuel_capacity: 100, current_fuel_level: 82, odometer: 245000, gps_device_id: 'GPS-006', ...fmc(6) },
    { id: 'TRK-007', plate_number: 'NAZ 4573', make: 'Isuzu', model: 'FRR', year: 2016, vin: 'FRR35T4-7000044', status: 'idle', fuel_capacity: 200, current_fuel_level: 45, odometer: 142000, gps_device_id: 'GPS-007', ...fmc(7) },
    { id: 'TRK-008', plate_number: 'NDN 3363', make: 'Hino', model: 'Profia', year: 2018, vin: 'PN2PWJ-11674', status: 'active', fuel_capacity: 400, current_fuel_level: 68, odometer: 98000, gps_device_id: 'GPS-008', ...fmc(8) },
    { id: 'TRK-009', plate_number: 'CBR 1147', make: 'Isuzu', model: 'Forward', year: 2022, vin: 'FSD34T4-7000116', status: 'active', fuel_capacity: 200, current_fuel_level: 88, odometer: 38000, gps_device_id: 'GPS-009', ...fmc(9) },
    { id: 'TRK-010', plate_number: 'NGF 9660', make: 'Hino', model: 'Profia', year: 2018, vin: 'FN2PWJ-12186', status: 'active', fuel_capacity: 400, current_fuel_level: 52, odometer: 105000, gps_device_id: 'GPS-010', ...fmc(10) },
    { id: 'TRK-011', plate_number: 'NGX 3840', make: 'Isuzu', model: 'GIGA', year: 2020, vin: 'CXG77X8-7000117', status: 'active', fuel_capacity: 400, current_fuel_level: 61, odometer: 78000, gps_device_id: 'GPS-011', ...fmc(11) },
    { id: 'TRK-012', plate_number: 'NFY 8062', make: 'Isuzu', model: 'GIGA', year: 2018, vin: 'CYG51Y5Z-7000020', status: 'active', fuel_capacity: 400, current_fuel_level: 74, odometer: 115000, gps_device_id: 'GPS-012', ...fmc(12) },
    { id: 'TRK-013', plate_number: 'CBF 2015', make: 'Isuzu', model: 'FTR', year: 2023, vin: 'FTR34-7001940', status: 'idle', fuel_capacity: 200, current_fuel_level: 90, odometer: 22000, gps_device_id: 'GPS-013', ...fmc(13) },
    { id: 'TRK-014', plate_number: 'CCE 5647', make: 'Isuzu', model: 'Forward', year: 2025, vin: 'FRDS4V4-7000070', status: 'active', fuel_capacity: 200, current_fuel_level: 95, odometer: 5200, gps_device_id: 'GPS-014', ...fmc(14) },
    { id: 'TRK-015', plate_number: 'CCE 5649', make: 'Isuzu', model: 'Forward', year: 2023, vin: 'FRD34T4-7000228', status: 'active', fuel_capacity: 200, current_fuel_level: 70, odometer: 32000, gps_device_id: 'GPS-015', ...fmc(15) },
  ];

  await knex('trucks').insert(truckData);

  // ── Drivers ─ 15 for 15-truck fleet ─────────────────────────────
  await knex('drivers').insert([
    { name: 'Juan Dela Cruz', email: 'juan.delacruz@apmci.com', phone: '0917-123-4501', license_number: 'N04-12-345678', license_expiry: '2026-06-15', status: 'on_duty', assigned_truck_id: 'TRK-001', emergency_contact_name: 'Maria Dela Cruz', emergency_contact_phone: '0917-123-4502' },
    { name: 'Maria Santos', email: 'maria.santos@apmci.com', phone: '0918-234-5601', license_number: 'N04-13-456789', license_expiry: '2026-09-20', status: 'on_duty', assigned_truck_id: 'TRK-002', emergency_contact_name: 'Pedro Santos', emergency_contact_phone: '0918-234-5602' },
    { name: 'Pedro Reyes', email: 'pedro.reyes@apmci.com', phone: '0919-345-6701', license_number: 'N04-14-567890', license_expiry: '2026-03-10', status: 'on_duty', assigned_truck_id: 'TRK-003', emergency_contact_name: 'Rosa Reyes', emergency_contact_phone: '0919-345-6702' },
    { name: 'Ana Garcia', email: 'ana.garcia@apmci.com', phone: '0920-456-7801', license_number: 'N04-15-678901', license_expiry: '2026-12-01', status: 'on_duty', assigned_truck_id: 'TRK-004', emergency_contact_name: 'Carlos Garcia', emergency_contact_phone: '0920-456-7802' },
    { name: 'Jose Mendoza', email: 'jose.mendoza@apmci.com', phone: '0921-567-8901', license_number: 'N04-16-789012', license_expiry: '2026-07-25', status: 'off_duty', assigned_truck_id: 'TRK-005', emergency_contact_name: 'Elena Mendoza', emergency_contact_phone: '0921-567-8902' },
    { name: 'Rosa Villanueva', email: 'rosa.villanueva@apmci.com', phone: '0922-678-9001', license_number: 'N04-17-890123', license_expiry: '2026-04-30', status: 'on_duty', assigned_truck_id: 'TRK-006', emergency_contact_name: 'Miguel Villanueva', emergency_contact_phone: '0922-678-9002' },
    { name: 'Ricardo Bautista', email: 'ricardo.bautista@apmci.com', phone: '0923-789-0101', license_number: 'N04-18-901234', license_expiry: '2026-11-15', status: 'available', assigned_truck_id: 'TRK-007', emergency_contact_name: 'Lorna Bautista', emergency_contact_phone: '0923-789-0102' },
    { name: 'Eduardo Ramos', email: 'eduardo.ramos@apmci.com', phone: '0917-890-1201', license_number: 'N04-19-012345', license_expiry: '2027-01-20', status: 'on_duty', assigned_truck_id: 'TRK-008', emergency_contact_name: 'Linda Ramos', emergency_contact_phone: '0917-890-1202' },
    { name: 'Fernando Torres', email: 'fernando.torres@apmci.com', phone: '0918-901-2301', license_number: 'N04-20-123456', license_expiry: '2026-08-10', status: 'on_duty', assigned_truck_id: 'TRK-009', emergency_contact_name: 'Carmen Torres', emergency_contact_phone: '0918-901-2302' },
    { name: 'Miguel Aquino', email: 'miguel.aquino@apmci.com', phone: '0919-012-3401', license_number: 'N04-21-234567', license_expiry: '2027-03-15', status: 'on_duty', assigned_truck_id: 'TRK-010', emergency_contact_name: 'Isabel Aquino', emergency_contact_phone: '0919-012-3402' },
    { name: 'Roberto Cruz', email: 'roberto.cruz@apmci.com', phone: '0920-123-4501', license_number: 'N04-22-345678', license_expiry: '2026-10-05', status: 'on_duty', assigned_truck_id: 'TRK-011', emergency_contact_name: 'Teresa Cruz', emergency_contact_phone: '0920-123-4502' },
    { name: 'Carlos Navarro', email: 'carlos.navarro@apmci.com', phone: '0921-234-5601', license_number: 'N04-23-456789', license_expiry: '2027-02-28', status: 'on_duty', assigned_truck_id: 'TRK-012', emergency_contact_name: 'Gloria Navarro', emergency_contact_phone: '0921-234-5602' },
    { name: 'Danilo Pascual', email: 'danilo.pascual@apmci.com', phone: '0922-345-6701', license_number: 'N04-24-567890', license_expiry: '2026-05-20', status: 'available', assigned_truck_id: 'TRK-013', emergency_contact_name: 'Rosario Pascual', emergency_contact_phone: '0922-345-6702' },
    { name: 'Ernesto Lim', email: 'ernesto.lim@apmci.com', phone: '0923-456-7801', license_number: 'N04-25-678901', license_expiry: '2027-04-10', status: 'on_duty', assigned_truck_id: 'TRK-014', emergency_contact_name: 'Mila Lim', emergency_contact_phone: '0923-456-7802' },
    { name: 'Gabriel Mercado', email: 'gabriel.mercado@apmci.com', phone: '0917-567-8901', license_number: 'N04-26-789012', license_expiry: '2026-12-30', status: 'on_duty', assigned_truck_id: 'TRK-015', emergency_contact_name: 'Alma Mercado', emergency_contact_phone: '0917-567-8902' },
  ]);

  // ── GPS seed data ── Laguna-Batangas area ───────────────────────
  const now = new Date();
  const gpsData = [
    { truck_id: 'TRK-001', latitude: 14.1450, longitude: 121.1200, speed: 65, heading: 180, city: 'SLEX - Southbound', route_info: 'Calamba → LIMA Technopark' },
    { truck_id: 'TRK-002', latitude: 14.0400, longitude: 121.0700, speed: 70, heading: 0, city: 'STAR Tollway', route_info: 'LIMA Technopark → Calamba (Return)' },
    { truck_id: 'TRK-003', latitude: 14.0858, longitude: 121.1528, speed: 55, heading: 180, city: 'Tanauan, Batangas', route_info: 'Calamba → Tanauan' },
    { truck_id: 'TRK-004', latitude: 13.7565, longitude: 121.0584, speed: 45, heading: 220, city: 'Batangas Port', route_info: 'Calamba → Batangas Port' },
    { truck_id: 'TRK-005', latitude: 14.2114, longitude: 121.1653, speed: 0, heading: 0, city: 'APMCI Factory - Service Bay', route_info: 'Under Maintenance' },
    { truck_id: 'TRK-006', latitude: 14.1700, longitude: 121.2200, speed: 40, heading: 90, city: 'Los Baños, Laguna', route_info: 'Calamba → Los Baños' },
    { truck_id: 'TRK-007', latitude: 14.2114, longitude: 121.1653, speed: 0, heading: 0, city: 'APMCI Factory - Yard', route_info: 'Standby' },
    { truck_id: 'TRK-008', latitude: 13.9700, longitude: 121.0450, speed: 25, heading: 90, city: 'LIMA Technopark', route_info: 'Calamba → LIMA (Yamaha)' },
    { truck_id: 'TRK-009', latitude: 14.3134, longitude: 121.1110, speed: 50, heading: 180, city: 'Santa Rosa, Laguna', route_info: 'Santa Rosa → Calamba' },
    { truck_id: 'TRK-010', latitude: 13.8472, longitude: 121.2087, speed: 60, heading: 0, city: 'Rosario, Batangas', route_info: 'Rosario → Calamba (Return)' },
    { truck_id: 'TRK-011', latitude: 14.3342, longitude: 121.0832, speed: 55, heading: 270, city: 'Biñan, Laguna', route_info: 'Biñan → Calamba' },
    { truck_id: 'TRK-012', latitude: 13.9414, longitude: 121.1622, speed: 48, heading: 180, city: 'Lipa, Batangas', route_info: 'Calamba → Lipa' },
    { truck_id: 'TRK-013', latitude: 14.2114, longitude: 121.1653, speed: 0, heading: 0, city: 'APMCI Factory - Yard', route_info: 'Standby' },
    { truck_id: 'TRK-014', latitude: 14.0683, longitude: 121.3233, speed: 42, heading: 135, city: 'San Pablo, Laguna', route_info: 'Calamba → San Pablo' },
    { truck_id: 'TRK-015', latitude: 14.2250, longitude: 121.0800, speed: 45, heading: 270, city: 'Silang, Cavite', route_info: 'Calamba → Silang' },
  ];

  for (const data of gpsData) {
    await knex('gps_data').insert({ ...data, recorded_at: now });
  }

  // ── Fuel records ────────────────────────────────────────────────
  const allTruckIds = truckData.map(t => t.id);
  const fuelData = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    for (const truck of allTruckIds) {
      fuelData.push({ truck_id: truck, fuel_level: 50 + Math.random() * 50, record_type: 'reading', consumption_rate: 7 + Math.random() * 3, recorded_at: date });
      if (Math.random() > 0.7) {
        fuelData.push({ truck_id: truck, fuel_level: 95, record_type: 'refuel', liters_added: 100 + Math.random() * 200, cost: 200 + Math.random() * 300, station_name: ['Shell', 'Petron', 'Caltex', 'Phoenix'][Math.floor(Math.random() * 4)], recorded_at: new Date(date.getTime() + 8 * 60 * 60 * 1000) });
      }
    }
  }
  await knex('fuel_records').insert(fuelData);

  // ── Maintenance records ─────────────────────────────────────────
  const user = await knex('users').where({ email: 'admin@fleettrack.com' }).first();
  await knex('maintenance_records').insert([
    { truck_id: 'TRK-005', type: 'engine_service', title: 'Engine Overhaul - ZBJ-997', description: 'Major engine overhaul for 2005 Isuzu NQR with 312,000 km', scheduled_date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), status: 'in_progress', priority: 'high', estimated_cost: 45000, service_provider: 'APMCI Service Bay', created_by: user.id },
    { truck_id: 'TRK-003', type: 'oil_change', title: 'Scheduled Oil Change - NCF-2403', description: 'Regular maintenance oil change for Hino WU730L', scheduled_date: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), status: 'scheduled', priority: 'medium', estimated_cost: 3500, service_provider: 'Calamba Auto Services', created_by: user.id },
    { truck_id: 'TRK-001', type: 'tire_rotation', title: 'Tire Rotation - NCG 4723', description: 'Rotate all tires for Hino WU342L-M', scheduled_date: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000), status: 'scheduled', priority: 'low', estimated_cost: 1500, service_provider: 'Laguna Tire Center', created_by: user.id },
    { truck_id: 'TRK-006', type: 'brake_service', title: 'Brake Inspection - NQO-721', description: 'Brake system inspection for aging Isuzu ELF', scheduled_date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), status: 'scheduled', priority: 'high', estimated_cost: 8000, service_provider: 'Batangas Truck Repair Shop', created_by: user.id },
    { truck_id: 'TRK-010', type: 'engine_service', title: 'PMS - NGF 9660', description: 'Preventive maintenance for Hino Profia at 105,000 km', scheduled_date: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000), status: 'scheduled', priority: 'medium', estimated_cost: 12000, service_provider: 'Hino Philippines - Calamba', created_by: user.id },
  ]);

  // ── Alerts ──────────────────────────────────────────────────────
  await knex('alerts').insert([
    { truck_id: 'TRK-005', type: 'low_fuel', title: 'Low Fuel - ZBJ-997', message: 'Fuel at 30%. Vehicle under maintenance at APMCI Service Bay.', severity: 'warning', acknowledged: false, metadata: JSON.stringify({ fuel_level: 30 }) },
    { truck_id: 'TRK-003', type: 'maintenance_due', title: 'Maintenance Due - NCF-2403', message: 'Scheduled oil change in 200 km.', severity: 'warning', acknowledged: false, metadata: JSON.stringify({ maintenance_id: 2 }) },
    { truck_id: 'TRK-008', type: 'speed_violation', title: 'Speed Alert - NDN 3363', message: 'Heavy truck exceeded 80 km/h on SLEX.', severity: 'warning', acknowledged: false, metadata: JSON.stringify({ speed: 95 }) },
    { truck_id: 'TRK-012', type: 'speed_violation', title: 'Speed Alert - NFY 8062', message: 'Exceeded speed limit on STAR Tollway.', severity: 'info', acknowledged: true, metadata: JSON.stringify({ speed: 88 }) },
  ]);

  // ── CAN bus sample data ─────────────────────────────────────────
  if (hasCanTable) {
    const canData = [];
    const activeTrucks = allTruckIds.filter(id => !['TRK-005', 'TRK-007', 'TRK-013'].includes(id));
    for (const truckId of activeTrucks) {
      const idx = parseInt(truckId.split('-')[1]);
      const imei = `35262509000${String(idx).padStart(4, '0')}`;
      const odo = truckData.find(t => t.id === truckId)?.odometer || 50000;
      for (let h = 11; h >= 0; h--) {
        canData.push({
          truck_id: truckId, device_imei: imei,
          engine_rpm: 1200 + Math.floor(Math.random() * 1200),
          engine_coolant_temp: 75 + Math.random() * 15,
          engine_load: 30 + Math.random() * 40,
          fuel_level_can: 40 + Math.random() * 50,
          fuel_rate: 8 + Math.random() * 12,
          vehicle_speed_can: 40 + Math.random() * 50,
          accelerator_pedal_pos: 20 + Math.random() * 60,
          battery_voltage: 13.2 + Math.random() * 1.2,
          total_distance: odo + h * 15,
          intake_air_temp: 28 + Math.random() * 8,
          engine_oil_pressure: 200 + Math.random() * 150,
          ambient_air_temp: 30 + Math.random() * 5,
          dtc_count: 0,
          recorded_at: new Date(now.getTime() - h * 30 * 60 * 1000)
        });
      }
    }
    await knex('can_data').insert(canData);
    console.log(`Seeded ${canData.length} CAN data records for FMC150 devices.`);
  }

  console.log('Seed data inserted successfully! (15 trucks, 15 drivers)');
};
