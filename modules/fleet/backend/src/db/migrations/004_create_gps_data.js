/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('gps_data', (table) => {
    table.bigIncrements('id').primary();
    table.string('truck_id', 20).notNullable().references('id').inTable('trucks').onDelete('CASCADE');
    table.decimal('latitude', 10, 7).notNullable();
    table.decimal('longitude', 10, 7).notNullable();
    table.decimal('speed', 6, 2).defaultTo(0); // km/h
    table.decimal('heading', 5, 2); // Degrees (0-360)
    table.string('city', 100);
    table.string('route_info', 255);
    table.timestamp('recorded_at').notNullable().defaultTo(knex.fn.now());
    table.timestamps(true, true);

    // Index for efficient time-series queries
    table.index(['truck_id', 'recorded_at']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('gps_data');
};
