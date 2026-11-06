const bcrypt = require('bcryptjs');
const { withTransaction } = require('./db');

async function seed() {
  console.log('🌱 Starting database seed...');

  await withTransaction(async (client) => {
    // ─── Business Settings ───────────────────────────────────────────
    await client.query(`
      INSERT INTO business_settings (
        id, business_name, address, city, state, phone, email, gst_number,
        footer_text, starting_bill_number, current_bill_number,
        bill_prefix, invoice_prefix, default_payment_method
      ) VALUES (
        1, 'JSK fishers', 'kanhangad fish market', 'Kasaragod', 'Kerala', '+91 9876543210',
        'jsk@fishmarket.com', '32AABCF1234B1Z5',
        'HAVE A NICE DAY!', 17950, 17954, '', 'INV', 'Cash'
      ) ON CONFLICT (id) DO UPDATE SET
        business_name = EXCLUDED.business_name,
        address = EXCLUDED.address,
        current_bill_number = 17955
    `);

    // ─── Users ───────────────────────────────────────────────────────
    const adminHash = await bcrypt.hash('admin123', 10);
    const staffHash = await bcrypt.hash('staff123', 10);

    const userResult = await client.query(`
      INSERT INTO users (username, password_hash, full_name, role) VALUES
        ('admin', $1, 'Administrator', 'ADMIN'),
        ('staff', $2, 'Staff Member', 'STAFF')
      ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash
      RETURNING id, username
    `, [adminHash, staffHash]);

    const adminId = userResult.rows.find(u => u.username === 'admin').id;

    // ─── Fish Items ───────────────────────────────────────────────────
    await client.query(`
      INSERT INTO fish_items (item_code, name, default_rate, unit) VALUES
        ('MATHI', 'MATHI (Sardine)', 3500, 'Box'),
        ('AYALA', 'AYALA (Mackerel)', 4200, 'Box'),
        ('CHOORA', 'CHOORA (Tuna)', 5500, 'Box'),
        ('KILIMEEN', 'KILIMEEN', 3200, 'Box'),
        ('HAMOUR', 'HAMOUR', 8000, 'Box'),
        ('PRAWNS', 'PRAWNS', 12000, 'Box'),
        ('SQUID', 'SQUID', 6500, 'Box'),
        ('POMFRET', 'POMFRET (Vatta)', 9500, 'Box'),
        ('NETHOLI', 'NETHOLI (Anchovy)', 2800, 'Box'),
        ('KUTTOLI', 'KUTTOLI', 3100, 'Box'),
        ('SANKARA', 'SANKARA (Red Snapper)', 7500, 'Box'),
        ('CHALA', 'CHALA (Herring)', 2500, 'Box')
      ON CONFLICT (item_code) DO UPDATE SET name = EXCLUDED.name
    `);

    // ─── Parties ─────────────────────────────────────────────────────
    const partiesResult = await client.query(`
      INSERT INTO parties (party_code, party_name, phone, address, opening_balance, current_balance) VALUES
        ('MPM001', 'M P M KZD RARY', '+91 9876501001', 'Kozhikode, Kerala', 30000, 29900),
        ('KFT002', 'Kadalundi Fish Traders', '+91 9876501002', 'Kadalundi, Kerala', 0, 45200),
        ('BME003', 'Beypore Marine Exports', '+91 9876501003', 'Beypore, Kerala', 15000, 15000),
        ('PSF004', 'Puthiyappa Sea Foods', '+91 9876501004', 'Puthiyappa, Kozhikode', 0, 72300),
        ('CFF005', 'Chaliyam Fresh Fish', '+91 9876501005', 'Chaliyam, Kerala', 5000, 18500),
        ('VBM006', 'Valanchery Bay Merchants', '+91 9876501006', 'Valanchery, Kerala', 0, 0),
        ('PKT007', 'Parappanangadi Kuttans', '+91 9876501007', 'Parappanangadi, Kerala', 0, 31200)
      ON CONFLICT (party_code) DO UPDATE SET party_name = EXCLUDED.party_name, current_balance = EXCLUDED.current_balance
      RETURNING id, party_code, party_name
    `);

    const partyMap = {};
    partiesResult.rows.forEach(p => { partyMap[p.party_code] = p.id; });
    const mpmId = partyMap['MPM001'];
    const kftId = partyMap['KFT002'];
    const psfId = partyMap['PSF004'];

    // ─── Reference Bill #17955 ─────────────────────────────────────
    const bill17955 = await client.query(`
      INSERT INTO bills (
        bill_number, invoice_number, party_id, bill_date,
        gross_total, commission, vehicle_rent, unloading, total_expenses,
        net_amount, old_balance, total_due, paid_amount, balance,
        payment_method, status, created_by
      ) VALUES (
        17955, 'INV17955', $1, '2026-09-10',
        68400, 6835, 9000, 665, 16500,
        51900, 30000, 81900, 52000, 29900,
        'Cash', 'PARTIAL', $2
      ) ON CONFLICT (bill_number) DO NOTHING
      RETURNING id
    `, [mpmId, adminId]);

    if (bill17955.rows.length > 0) {
      const billId = bill17955.rows[0].id;
      await client.query(`INSERT INTO bill_items (bill_id, fish_item_id, item_name, box, quantity, rate, total, sort_order) VALUES ($1, (SELECT id FROM fish_items WHERE item_code = 'MATHI'), 'MATHI', 13, 0, 3700, 48100, 1)`, [billId]);
      await client.query(`INSERT INTO bill_items (bill_id, fish_item_id, item_name, box, quantity, rate, total, sort_order) VALUES ($1, (SELECT id FROM fish_items WHERE item_code = 'MATHI'), 'MATHI', 5, 0, 3600, 18000, 2)`, [billId]);
      await client.query(`INSERT INTO bill_items (bill_id, fish_item_id, item_name, box, quantity, rate, total, sort_order) VALUES ($1, (SELECT id FROM fish_items WHERE item_code = 'MATHI'), 'MATHI', 1, 21, 2300, 2300, 3)`, [billId]);

      // Ledger entries for bill #17955
      await client.query(`
        INSERT INTO ledger_entries (party_id, bill_id, entry_type, debit, credit, running_balance, description, entry_date, created_by)
        VALUES ($1, $2, 'BILL', 81900, 0, 81900, 'Bill #17955', '2026-09-10', $3)
      `, [mpmId, billId, adminId]);

      // Payment for bill #17955
      const pay17955 = await client.query(`
        INSERT INTO payments (payment_code, party_id, bill_id, amount, payment_method, payment_date, created_by)
        VALUES ('PAY-17955-1', $1, $2, 52000, 'Cash', '2026-09-10', $3)
        RETURNING id
      `, [mpmId, billId, adminId]);

      await client.query(`
        INSERT INTO ledger_entries (party_id, bill_id, payment_id, entry_type, debit, credit, running_balance, description, entry_date, created_by)
        VALUES ($1, $2, $3, 'PAYMENT', 0, 52000, 29900, 'Payment received - Cash', '2026-09-10', $4)
      `, [mpmId, billId, pay17955.rows[0].id, adminId]);
    }

    // ─── Additional Historical Bills (for dashboard & reports) ─────
    // Bill #17950 - Kadalundi Fish Traders
    const bill17950 = await client.query(`
      INSERT INTO bills (
        bill_number, invoice_number, party_id, bill_date,
        gross_total, commission, vehicle_rent, unloading, total_expenses,
        net_amount, old_balance, total_due, paid_amount, balance,
        payment_method, status, created_by
      ) VALUES (
        17950, 'INV17950', $1, '2026-09-05',
        52000, 5200, 7000, 800, 13000,
        39000, 0, 39000, 0, 39000,
        'Cash', 'DUE', $2
      ) ON CONFLICT (bill_number) DO NOTHING RETURNING id
    `, [kftId, adminId]);

    if (bill17950.rows.length > 0) {
      const billId = bill17950.rows[0].id;
      await client.query(`INSERT INTO bill_items (bill_id, fish_item_id, item_name, box, quantity, rate, total, sort_order) VALUES ($1, (SELECT id FROM fish_items WHERE item_code = 'AYALA'), 'AYALA', 8, 0, 4200, 33600, 1)`, [billId]);
      await client.query(`INSERT INTO bill_items (bill_id, fish_item_id, item_name, box, quantity, rate, total, sort_order) VALUES ($1, (SELECT id FROM fish_items WHERE item_code = 'NETHOLI'), 'NETHOLI', 5, 0, 2800, 14000, 2)`, [billId]);
      await client.query(`INSERT INTO bill_items (bill_id, fish_item_id, item_name, box, quantity, rate, total, sort_order) VALUES ($1, (SELECT id FROM fish_items WHERE item_code = 'CHALA'), 'CHALA', 2, 0, 2200, 4400, 3)`, [billId]);
      await client.query(`
        INSERT INTO ledger_entries (party_id, bill_id, entry_type, debit, credit, running_balance, description, entry_date, created_by)
        VALUES ($1, $2, 'BILL', 39000, 0, 39000, 'Bill #17950', '2026-09-05', $3)
      `, [kftId, billId, adminId]);
    }

    // Bill #17951
    const bill17951 = await client.query(`
      INSERT INTO bills (
        bill_number, invoice_number, party_id, bill_date,
        gross_total, commission, vehicle_rent, unloading, total_expenses,
        net_amount, old_balance, total_due, paid_amount, balance,
        payment_method, status, created_by
      ) VALUES (
        17951, 'INV17951', $1, '2026-09-12',
        84000, 8400, 9000, 600, 18000,
        66000, 0, 66000, 66000, 0,
        'UPI', 'PAID', $2
      ) ON CONFLICT (bill_number) DO NOTHING RETURNING id
    `, [psfId, adminId]);

    if (bill17951.rows.length > 0) {
      const billId = bill17951.rows[0].id;
      await client.query(`INSERT INTO bill_items (bill_id, fish_item_id, item_name, box, quantity, rate, total, sort_order) VALUES ($1, (SELECT id FROM fish_items WHERE item_code = 'CHOORA'), 'CHOORA', 10, 0, 5500, 55000, 1)`, [billId]);
      await client.query(`INSERT INTO bill_items (bill_id, fish_item_id, item_name, box, quantity, rate, total, sort_order) VALUES ($1, (SELECT id FROM fish_items WHERE item_code = 'SANKARA'), 'SANKARA', 2, 0, 7500, 15000, 2)`, [billId]);
      await client.query(`INSERT INTO bill_items (bill_id, fish_item_id, item_name, box, quantity, rate, total, sort_order) VALUES ($1, (SELECT id FROM fish_items WHERE item_code = 'MATHI'), 'MATHI', 4, 0, 3500, 14000, 3)`, [billId]);
    }

    // Bill #17952
    const bill17952 = await client.query(`
      INSERT INTO bills (
        bill_number, invoice_number, party_id, bill_date,
        gross_total, commission, vehicle_rent, unloading, total_expenses,
        net_amount, old_balance, total_due, paid_amount, balance,
        payment_method, status, created_by
      ) VALUES (
        17952, 'INV17952', $1, '2026-09-15',
        45600, 4560, 6000, 440, 11000,
        34600, 39000, 73600, 28400, 45200,
        'Cash', 'PARTIAL', $2
      ) ON CONFLICT (bill_number) DO NOTHING RETURNING id
    `, [kftId, adminId]);

    if (bill17952.rows.length > 0) {
      const billId = bill17952.rows[0].id;
      await client.query(`INSERT INTO bill_items (bill_id, fish_item_id, item_name, box, quantity, rate, total, sort_order) VALUES ($1, (SELECT id FROM fish_items WHERE item_code = 'MATHI'), 'MATHI', 7, 0, 3800, 26600, 1)`, [billId]);
      await client.query(`INSERT INTO bill_items (bill_id, fish_item_id, item_name, box, quantity, rate, total, sort_order) VALUES ($1, (SELECT id FROM fish_items WHERE item_code = 'KUTTOLI'), 'KUTTOLI', 5, 0, 3100, 15500, 2)`, [billId]);
      await client.query(`INSERT INTO bill_items (bill_id, fish_item_id, item_name, box, quantity, rate, total, sort_order) VALUES ($1, (SELECT id FROM fish_items WHERE item_code = 'CHALA'), 'CHALA', 1, 14, 1500, 1500, 3)`, [billId]);
      await client.query(`INSERT INTO bill_items (bill_id, fish_item_id, item_name, box, quantity, rate, total, sort_order) VALUES ($1, (SELECT id FROM fish_items WHERE item_code = 'NETHOLI'), 'NETHOLI', 1, 0, 2000, 2000, 4)`, [billId]);
    }

    // Bill #17953 - Today's bill for dashboard
    const bill17953 = await client.query(`
      INSERT INTO bills (
        bill_number, invoice_number, party_id, bill_date,
        gross_total, commission, vehicle_rent, unloading, total_expenses,
        net_amount, old_balance, total_due, paid_amount, balance,
        payment_method, status, created_by
      ) VALUES (
        17953, 'INV17953', $1, CURRENT_DATE,
        96000, 9600, 10000, 900, 20500,
        75500, 0, 75500, 75500, 0,
        'Bank Transfer', 'PAID', $2
      ) ON CONFLICT (bill_number) DO NOTHING RETURNING id
    `, [partyMap['BME003'], adminId]);

    if (bill17953.rows.length > 0) {
      const billId = bill17953.rows[0].id;
      await client.query(`INSERT INTO bill_items (bill_id, fish_item_id, item_name, box, quantity, rate, total, sort_order) VALUES ($1, (SELECT id FROM fish_items WHERE item_code = 'PRAWNS'), 'PRAWNS', 5, 0, 12000, 60000, 1)`, [billId]);
      await client.query(`INSERT INTO bill_items (bill_id, fish_item_id, item_name, box, quantity, rate, total, sort_order) VALUES ($1, (SELECT id FROM fish_items WHERE item_code = 'POMFRET'), 'POMFRET', 2, 0, 9500, 19000, 2)`, [billId]);
      await client.query(`INSERT INTO bill_items (bill_id, fish_item_id, item_name, box, quantity, rate, total, sort_order) VALUES ($1, (SELECT id FROM fish_items WHERE item_code = 'HAMOUR'), 'HAMOUR', 2, 0, 8500, 17000, 3)`, [billId]);
    }

    // Bill #17954 - Today's bill
    const bill17954 = await client.query(`
      INSERT INTO bills (
        bill_number, invoice_number, party_id, bill_date,
        gross_total, commission, vehicle_rent, unloading, total_expenses,
        net_amount, old_balance, total_due, paid_amount, balance,
        payment_method, status, created_by
      ) VALUES (
        17954, 'INV17954', $1, CURRENT_DATE,
        38500, 3850, 5000, 650, 9500,
        29000, 31200, 60200, 29000, 31200,
        'Cash', 'PARTIAL', $2
      ) ON CONFLICT (bill_number) DO NOTHING RETURNING id
    `, [partyMap['PKT007'], adminId]);

    if (bill17954.rows.length > 0) {
      const billId = bill17954.rows[0].id;
      await client.query(`INSERT INTO bill_items (bill_id, fish_item_id, item_name, box, quantity, rate, total, sort_order) VALUES ($1, (SELECT id FROM fish_items WHERE item_code = 'MATHI'), 'MATHI', 6, 0, 3600, 21600, 1)`, [billId]);
      await client.query(`INSERT INTO bill_items (bill_id, fish_item_id, item_name, box, quantity, rate, total, sort_order) VALUES ($1, (SELECT id FROM fish_items WHERE item_code = 'AYALA'), 'AYALA', 3, 0, 4500, 13500, 2)`, [billId]);
      await client.query(`INSERT INTO bill_items (bill_id, fish_item_id, item_name, box, quantity, rate, total, sort_order) VALUES ($1, (SELECT id FROM fish_items WHERE item_code = 'NETHOLI'), 'NETHOLI', 1, 8, 3400, 3400, 3)`, [billId]);
    }

    console.log('✅ Seed data inserted successfully');
  });

  console.log('✅ Database seeded!');
  console.log('');
  console.log('🔑 Login credentials:');
  console.log('   Admin: admin / admin123');
  console.log('   Staff: staff / staff123');
  console.log('');
  console.log('📄 Sample Bills: #17950 - #17955 created');
}

seed()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  });
