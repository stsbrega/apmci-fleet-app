/**
 * Add device model and TCP-related fields to trucks table
 * Supports FMC150 device identification and configuration
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('trucks', (table) => {
    table.string('gps_device_model', 50); // e.g., 'FMC150', 'FMC250'
    table.string('gps_device_imei', 20); // IMEI number for Teltonika devices
    table.string('gps_protocol', 20).defaultTo('http'); // 'tcp_codec8e' or 'http'
    table.timestamp('device_last_seen'); // Last communication timestamp
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('trucks', (table) => {
    table.dropColumn('gps_device_model');
    table.dropColumn('gps_device_imei');
    table.dropColumn('gps_protocol');
    table.dropColumn('device_last_seen');
  });
};
