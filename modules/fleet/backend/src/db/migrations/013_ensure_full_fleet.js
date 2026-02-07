/**
 * Data migration: ensure all 15 APMCI trucks and drivers exist in production.
 * The original seed only ran once with 6 placeholder trucks. This migration
 * upserts the full real fleet so existing data is corrected and missing
 * trucks/drivers are added.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const hasDeviceModel = await knex.schema.hasColumn('trucks', 'gps_device_model');
  const hasRegistration = await knex.schema.hasColumn('trucks', 'body_type');

  const trucks = [
    { id: 'TRK-001', plate_number: 'NCG 4723', make: 'Hino', model: 'WU342L-M', year: 2018, vin: 'MJECH40HXG5142022', status: 'active', fuel_capacity: 100, current_fuel_level: 78, odometer: 112000, gps_device_id: 'GPS-001' },
    { id: 'TRK-002', plate_number: 'NDF 7968', make: 'Hino', model: 'WU342L-M', year: 2016, vin: 'MJECH40H1G5142023', status: 'active', fuel_capacity: 100, current_fuel_level: 65, odometer: 148000, gps_device_id: 'GPS-002' },
    { id: 'TRK-003', plate_number: 'NCF-2403', make: 'Hino', model: 'WU730L', year: 2016, vin: 'JHHZJL0H102000313', status: 'active', fuel_capacity: 200, current_fuel_level: 55, odometer: 156000, gps_device_id: 'GPS-003' },
    { id: 'TRK-004', plate_number: 'NAL 2498', make: 'Hino', model: 'FG8J', year: 2017, vin: 'FG8J17888', status: 'active', fuel_capacity: 300, current_fuel_level: 72, odometer: 125000, gps_device_id: 'GPS-004' },
    { id: 'TRK-005', plate_number: 'ZBJ-997', make: 'Isuzu', model: 'NQR', year: 2005, vin: 'PABN1R71RL5200178', status: 'maintenance', fuel_capacity: 200, current_fuel_level: 30, odometer: 312000, gps_device_id: 'GPS-005' },
    { id: 'TRK-006', plate_number: 'NQO-721', make: 'Isuzu', model: 'ELF (Rebuilt)', year: 2009, vin: 'ENKR-20080481-C', status: 'active', fuel_capacity: 100, current_fuel_level: 82, odometer: 245000, gps_device_id: 'GPS-006' },
    { id: 'TRK-007', plate_number: 'NAZ 4573', make: 'Isuzu', model: 'FRR', year: 2016, vin: 'FRR35T4-7000044', status: 'idle', fuel_capacity: 200, current_fuel_level: 45, odometer: 142000, gps_device_id: 'GPS-007' },
    { id: 'TRK-008', plate_number: 'NDN 3363', make: 'Hino', model: 'Profia', year: 2018, vin: 'PN2PWJ-11674', status: 'active', fuel_capacity: 400, current_fuel_level: 68, odometer: 98000, gps_device_id: 'GPS-008' },
    { id: 'TRK-009', plate_number: 'CBR 1147', make: 'Isuzu', model: 'Forward (Rebuilt)', year: 2022, vin: 'FSD34T4-7000116', status: 'active', fuel_capacity: 200, current_fuel_level: 88, odometer: 38000, gps_device_id: 'GPS-009' },
    { id: 'TRK-010', plate_number: 'NGF 9660', make: 'Hino', model: 'Profia', year: 2018, vin: 'FN2PWJ-12186', status: 'active', fuel_capacity: 400, current_fuel_level: 52, odometer: 105000, gps_device_id: 'GPS-010' },
    { id: 'TRK-011', plate_number: 'NGX 3840', make: 'Isuzu', model: 'GIGA', year: 2020, vin: 'CXG77X8-7000117', status: 'active', fuel_capacity: 400, current_fuel_level: 61, odometer: 78000, gps_device_id: 'GPS-011' },
    { id: 'TRK-012', plate_number: 'NFY 8062', make: 'Isuzu', model: 'GIGA', year: 2018, vin: 'CYG51Y5Z-7000020', status: 'active', fuel_capacity: 400, current_fuel_level: 74, odometer: 115000, gps_device_id: 'GPS-012' },
    { id: 'TRK-013', plate_number: 'CBF 2015', make: 'Isuzu', model: 'FTR (Rebuilt)', year: 2023, vin: 'FTR34-7001940', status: 'idle', fuel_capacity: 200, current_fuel_level: 90, odometer: 22000, gps_device_id: 'GPS-013' },
    { id: 'TRK-014', plate_number: 'CCE 5647', make: 'Isuzu', model: 'Forward', year: 2025, vin: 'FRDS4V4-7000070', status: 'active', fuel_capacity: 200, current_fuel_level: 95, odometer: 5200, gps_device_id: 'GPS-014' },
    { id: 'TRK-015', plate_number: 'CCE 5649', make: 'Isuzu', model: 'Forward', year: 2023, vin: 'FRD34T4-7000228', status: 'active', fuel_capacity: 200, current_fuel_level: 70, odometer: 32000, gps_device_id: 'GPS-015' },
  ];

  const fmcData = [
    { id: 'TRK-001', gps_device_model: 'FMC150', gps_device_imei: '352625090000001', gps_protocol: 'tcp_codec8e' },
    { id: 'TRK-002', gps_device_model: 'FMC150', gps_device_imei: '352625090000002', gps_protocol: 'tcp_codec8e' },
    { id: 'TRK-003', gps_device_model: 'FMC150', gps_device_imei: '352625090000003', gps_protocol: 'tcp_codec8e' },
    { id: 'TRK-004', gps_device_model: 'FMC150', gps_device_imei: '352625090000004', gps_protocol: 'tcp_codec8e' },
    { id: 'TRK-005', gps_device_model: 'FMC150', gps_device_imei: '352625090000005', gps_protocol: 'tcp_codec8e' },
    { id: 'TRK-006', gps_device_model: 'FMC150', gps_device_imei: '352625090000006', gps_protocol: 'tcp_codec8e' },
    { id: 'TRK-007', gps_device_model: 'FMC150', gps_device_imei: '352625090000007', gps_protocol: 'tcp_codec8e' },
    { id: 'TRK-008', gps_device_model: 'FMC150', gps_device_imei: '352625090000008', gps_protocol: 'tcp_codec8e' },
    { id: 'TRK-009', gps_device_model: 'FMC150', gps_device_imei: '352625090000009', gps_protocol: 'tcp_codec8e' },
    { id: 'TRK-010', gps_device_model: 'FMC150', gps_device_imei: '352625090000010', gps_protocol: 'tcp_codec8e' },
    { id: 'TRK-011', gps_device_model: 'FMC150', gps_device_imei: '352625090000011', gps_protocol: 'tcp_codec8e' },
    { id: 'TRK-012', gps_device_model: 'FMC150', gps_device_imei: '352625090000012', gps_protocol: 'tcp_codec8e' },
    { id: 'TRK-013', gps_device_model: 'FMC150', gps_device_imei: '352625090000013', gps_protocol: 'tcp_codec8e' },
    { id: 'TRK-014', gps_device_model: 'FMC150', gps_device_imei: '352625090000014', gps_protocol: 'tcp_codec8e' },
    { id: 'TRK-015', gps_device_model: 'FMC150', gps_device_imei: '352625090000015', gps_protocol: 'tcp_codec8e' },
  ];

  const drivers = [
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
  ];

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

  const now = new Date();

  // Upsert trucks: update existing, insert missing
  for (const truck of trucks) {
    const existing = await knex('trucks').where({ id: truck.id }).first();
    const extra = {};
    if (hasDeviceModel) {
      const fmc = fmcData.find(f => f.id === truck.id);
      if (fmc) {
        extra.gps_device_model = fmc.gps_device_model;
        extra.gps_device_imei = fmc.gps_device_imei;
        extra.gps_protocol = fmc.gps_protocol;
      }
    }
    if (existing) {
      await knex('trucks').where({ id: truck.id }).update({ ...truck, ...extra });
    } else {
      await knex('trucks').insert({ ...truck, ...extra });
    }
  }

  // Upsert drivers: update existing by assigned_truck_id, insert missing
  for (const driver of drivers) {
    const existing = await knex('drivers')
      .where({ assigned_truck_id: driver.assigned_truck_id })
      .first();
    if (existing) {
      await knex('drivers').where({ id: existing.id }).update(driver);
    } else {
      // Check by email too
      const byEmail = await knex('drivers').where({ email: driver.email }).first();
      if (byEmail) {
        await knex('drivers').where({ id: byEmail.id }).update(driver);
      } else {
        await knex('drivers').insert(driver);
      }
    }
  }

  // Insert GPS data for trucks that don't have any
  for (const gps of gpsData) {
    const existing = await knex('gps_data').where({ truck_id: gps.truck_id }).first();
    if (!existing) {
      await knex('gps_data').insert({ ...gps, recorded_at: now });
    }
  }

  // Delete any old placeholder trucks not in the real fleet
  const realIds = trucks.map(t => t.id);
  await knex('drivers').whereNotIn('assigned_truck_id', realIds).del();
  await knex('gps_data').whereNotIn('truck_id', realIds).del();
  await knex('fuel_records').whereNotIn('truck_id', realIds).del();
  await knex('maintenance_records').whereNotIn('truck_id', realIds).del();
  await knex('alerts').whereNotIn('truck_id', realIds).del();
  await knex('trucks').whereNotIn('id', realIds).del();

  console.log('Full 15-truck APMCI fleet synced to production.');
};

exports.down = async function() {
  // No-op: cannot reverse fleet data sync
};
