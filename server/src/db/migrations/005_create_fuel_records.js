/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('fuel_records', (table) => {
    table.bigIncrements('id').primary();
    table.string('truck_id', 20).notNullable().references('id').inTable('trucks').onDelete('CASCADE');
    table.decimal('fuel_level', 5, 2).notNullable(); // Percentage
    table.decimal('liters_added', 10, 2); // For refueling events
    table.decimal('cost', 10, 2); // Cost of refuel
    table.decimal('odometer_reading', 12, 2);
    table.decimal('consumption_rate', 6, 2); // L/100km
    table.enum('record_type', ['reading', 'refuel']).defaultTo('reading');
    table.string('station_name', 255);
    table.text('notes');
    table.timestamp('recorded_at').notNullable().defaultTo(knex.fn.now());
    table.timestamps(true, true);

    // Index for efficient queries
    table.index(['truck_id', 'recorded_at']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('fuel_records');
};
