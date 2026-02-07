/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('can_data', (table) => {
    table.bigIncrements('id').primary();
    table.string('truck_id', 20).notNullable().references('id').inTable('trucks').onDelete('CASCADE');
    table.string('device_imei', 50); // FMC150 IMEI

    // Engine data from CAN bus
    table.integer('engine_rpm');
    table.decimal('engine_coolant_temp', 5, 1); // Celsius
    table.decimal('engine_load', 5, 1); // Percentage
    table.integer('engine_total_hours'); // Hours

    // Fuel data from CAN bus
    table.decimal('fuel_level_can', 5, 1); // Percentage from CAN (more accurate than analog)
    table.decimal('fuel_rate', 8, 2); // L/h
    table.decimal('total_fuel_used', 12, 2); // Liters

    // Vehicle dynamics from CAN bus
    table.decimal('vehicle_speed_can', 6, 1); // km/h from CAN (more accurate than GPS speed)
    table.decimal('accelerator_pedal_pos', 5, 1); // Percentage
    table.decimal('total_distance', 12, 2); // km from odometer

    // Additional CAN parameters
    table.decimal('battery_voltage', 5, 2); // Volts
    table.decimal('intake_air_temp', 5, 1); // Celsius
    table.decimal('intake_manifold_pressure', 6, 1); // kPa
    table.decimal('engine_oil_pressure', 6, 1); // kPa
    table.decimal('ambient_air_temp', 5, 1); // Celsius

    // DTC (Diagnostic Trouble Codes)
    table.specificType('dtc_codes', 'text[]'); // Array of active DTCs
    table.integer('dtc_count').defaultTo(0);

    // Metadata
    table.jsonb('raw_io_data'); // Raw I/O element data from Teltonika for debugging
    table.timestamp('recorded_at').notNullable().defaultTo(knex.fn.now());
    table.timestamps(true, true);

    // Indexes for efficient queries
    table.index(['truck_id', 'recorded_at']);
    table.index(['device_imei', 'recorded_at']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('can_data');
};
