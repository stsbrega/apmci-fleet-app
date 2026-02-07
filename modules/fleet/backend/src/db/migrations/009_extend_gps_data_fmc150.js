/**
 * Extend GPS data table with FMC150-specific fields
 * FMC150 provides enhanced GPS data including altitude, satellite count, and HDOP
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('gps_data', (table) => {
    table.decimal('altitude', 8, 2); // Meters above sea level
    table.integer('satellites'); // Number of visible satellites
    table.decimal('hdop', 4, 1); // Horizontal dilution of precision
    table.string('device_imei', 50); // FMC150 device IMEI
    table.integer('priority').defaultTo(0); // Teltonika priority (0=low, 1=high, 2=panic)
    table.string('event_id', 20); // Teltonika event that triggered the record
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('gps_data', (table) => {
    table.dropColumn('altitude');
    table.dropColumn('satellites');
    table.dropColumn('hdop');
    table.dropColumn('device_imei');
    table.dropColumn('priority');
    table.dropColumn('event_id');
  });
};
