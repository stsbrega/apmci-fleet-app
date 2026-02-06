/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('drivers', (table) => {
    table.increments('id').primary();
    table.string('name', 255).notNullable();
    table.string('email', 255).unique();
    table.string('phone', 20);
    table.string('license_number', 50).notNullable().unique();
    table.date('license_expiry').notNullable();
    table.enum('status', ['available', 'on_duty', 'off_duty', 'inactive']).defaultTo('available');
    table.string('assigned_truck_id', 20).references('id').inTable('trucks').onDelete('SET NULL');
    table.string('emergency_contact_name', 255);
    table.string('emergency_contact_phone', 20);
    table.text('notes');
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('drivers');
};
