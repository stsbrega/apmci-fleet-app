/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('trucks', (table) => {
    table.string('id', 20).primary(); // e.g., TRK-001
    table.string('plate_number', 20).notNullable().unique();
    table.string('make', 100);
    table.string('model', 100);
    table.integer('year');
    table.string('vin', 17).unique();
    table.enum('status', ['active', 'idle', 'maintenance', 'inactive']).defaultTo('idle');
    table.decimal('fuel_capacity', 10, 2).defaultTo(300); // Liters
    table.decimal('current_fuel_level', 5, 2).defaultTo(100); // Percentage
    table.decimal('odometer', 12, 2).defaultTo(0); // Kilometers
    table.string('gps_device_id', 50); // Hardware GPS device ID
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('trucks');
};
