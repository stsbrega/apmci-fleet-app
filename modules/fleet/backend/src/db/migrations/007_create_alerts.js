/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('alerts', (table) => {
    table.increments('id').primary();
    table.string('truck_id', 20).references('id').inTable('trucks').onDelete('CASCADE');
    table.integer('driver_id').references('id').inTable('drivers').onDelete('SET NULL');
    table.enum('type', [
      'low_fuel',
      'maintenance_due',
      'speed_violation',
      'geofence_exit',
      'geofence_enter',
      'engine_warning',
      'tire_pressure',
      'idle_time',
      'route_deviation',
      'license_expiry',
      'other'
    ]).notNullable();
    table.string('title', 255).notNullable();
    table.text('message');
    table.enum('severity', ['info', 'warning', 'critical']).defaultTo('info');
    table.boolean('acknowledged').defaultTo(false);
    table.integer('acknowledged_by').references('id').inTable('users');
    table.timestamp('acknowledged_at');
    table.jsonb('metadata'); // Additional data (GPS coordinates, fuel level, etc.)
    table.timestamps(true, true);

    // Indexes for queries
    table.index(['truck_id', 'acknowledged']);
    table.index(['severity', 'acknowledged']);
    table.index('created_at');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('alerts');
};
