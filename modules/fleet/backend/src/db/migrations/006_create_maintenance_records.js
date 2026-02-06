/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('maintenance_records', (table) => {
    table.increments('id').primary();
    table.string('truck_id', 20).notNullable().references('id').inTable('trucks').onDelete('CASCADE');
    table.enum('type', [
      'oil_change',
      'tire_rotation',
      'tire_replacement',
      'brake_service',
      'engine_service',
      'transmission_service',
      'inspection',
      'repair',
      'other'
    ]).notNullable();
    table.string('title', 255).notNullable();
    table.text('description');
    table.date('scheduled_date');
    table.date('completed_date');
    table.decimal('odometer_at_service', 12, 2);
    table.decimal('next_service_odometer', 12, 2);
    table.date('next_service_date');
    table.enum('status', ['scheduled', 'in_progress', 'completed', 'cancelled']).defaultTo('scheduled');
    table.enum('priority', ['low', 'medium', 'high', 'critical']).defaultTo('medium');
    table.decimal('estimated_cost', 10, 2);
    table.decimal('actual_cost', 10, 2);
    table.string('service_provider', 255);
    table.text('notes');
    table.integer('created_by').references('id').inTable('users');
    table.timestamps(true, true);

    // Index for queries
    table.index(['truck_id', 'status']);
    table.index(['scheduled_date']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('maintenance_records');
};
