/**
 * Data migration: populate registration fields for existing trucks
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const registrationData = [
    { id: 'TRK-001', mv_file_no: '1301-00000694302', engine_no: 'W04DTPJ65657', body_type: 'Aluminum Van', gross_weight: 4500, net_capacity: 2250, model: 'WU342L-M' },
    { id: 'TRK-002', mv_file_no: '1301-00000694306', engine_no: 'W04DTPJ65655', body_type: 'Aluminum Van', gross_weight: 4500, net_capacity: 2250, model: 'WU342L-M' },
    { id: 'TRK-003', mv_file_no: '1301-00000709253', engine_no: 'W04DTN40100', body_type: 'Aluminum Van', gross_weight: 8300, net_capacity: 4150, model: 'WU730L' },
    { id: 'TRK-004', mv_file_no: '1301-00000888224', engine_no: 'J08EUG16370', body_type: 'Aluminum Van', gross_weight: 15100, net_capacity: 7550, model: 'FG8J' },
    { id: 'TRK-005', mv_file_no: '1368-00000211528', engine_no: '4HG1-237797', body_type: 'Aluminum Van', gross_weight: 8000, net_capacity: 4000, model: 'NQR' },
    { id: 'TRK-006', mv_file_no: '1312-00000355611', engine_no: '4HF1-520664', body_type: 'Aluminum Van', gross_weight: 4200, net_capacity: 2100, model: 'ELF (Rebuilt)' },
    { id: 'TRK-007', mv_file_no: '1301-00000976492', engine_no: '6HL1-339662', body_type: 'Aluminum Van', gross_weight: 8500, net_capacity: 4250, model: 'FRR' },
    { id: 'TRK-008', mv_file_no: '1301-00001415161', engine_no: 'P11C-UD12953', body_type: 'Canvass Wing Van', gross_weight: 24000, net_capacity: 12000, model: 'Profia' },
    { id: 'TRK-009', mv_file_no: '0389-00000038273', engine_no: '6HK1-424771', body_type: 'Close Van', gross_weight: 8500, net_capacity: 4250, model: 'Forward (Rebuilt)' },
    { id: 'TRK-010', mv_file_no: '1301-00001440445', engine_no: 'P11C-UD13854', body_type: 'Aluminum Wing Van', gross_weight: 24000, net_capacity: 12000, model: 'Profia' },
    { id: 'TRK-011', mv_file_no: '130100001797092', engine_no: '6UZ1-419625', body_type: 'Aluminum Closed Van', gross_weight: 24000, net_capacity: 12000, model: 'GIGA' },
    { id: 'TRK-012', mv_file_no: '130100001534313', engine_no: '6WF1-135287', body_type: 'Aluminum Van', gross_weight: 24000, net_capacity: 12000, model: 'GIGA' },
    { id: 'TRK-013', mv_file_no: '038900000067378', engine_no: '6HK1-476777', body_type: 'Closed Van', gross_weight: 8500, net_capacity: 4250, model: 'FTR (Rebuilt)' },
    { id: 'TRK-014', mv_file_no: '0389-00000078338', engine_no: '6HK1-442949', body_type: 'Aluminum Van', gross_weight: 8500, net_capacity: 4250, model: 'Forward' },
    { id: 'TRK-015', mv_file_no: '038900000078340', engine_no: '6HK1-448424', body_type: 'Wing Van', gross_weight: 8500, net_capacity: 4250, model: 'Forward' },
  ];

  for (const truck of registrationData) {
    const { id, ...data } = truck;
    await knex('trucks').where({ id }).update(data);
  }

  console.log('Updated 15 trucks with LTO registration data.');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex('trucks').update({
    mv_file_no: null,
    engine_no: null,
    body_type: null,
    gross_weight: null,
    net_capacity: null,
  });
};
