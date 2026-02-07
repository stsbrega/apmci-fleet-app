/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('trucks', (table) => {
    table.string('mv_file_no');
    table.string('engine_no');
    table.string('body_type');
    table.decimal('gross_weight', 10, 2);
    table.decimal('net_capacity', 10, 2);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('trucks', (table) => {
    table.dropColumn('mv_file_no');
    table.dropColumn('engine_no');
    table.dropColumn('body_type');
    table.dropColumn('gross_weight');
    table.dropColumn('net_capacity');
  });
};
