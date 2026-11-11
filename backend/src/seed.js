// Dummy data only. Run: npm run seed   (login password for all demo users: Demo@1234)
require('dotenv').config();
const bcrypt = require('bcrypt');
const { q } = require('./config/db');
const ins = async (sql, p) => (await q(sql, p))[0];
(async () => {
  for (const t of ['transport_bookings', 'bids', 'listings', 'daily_prices', 'audit_logs', 'users', 'crops', 'districts']) await q(`DELETE FROM ${t}`);
  const D = {}, C = {}, U = {};
  for (const n of ['Hapur', 'Meerut', 'Ghaziabad']) D[n] = (await ins('INSERT INTO districts(name,state) OUTPUT INSERTED.district_id id VALUES(@n,\'Uttar Pradesh\')', { n })).id;
  const crops = [['Wheat', 'Rabi', 2275], ['Rice', 'Kharif', 2300], ['Maize', 'Kharif', 2090], ['Mustard', 'Rabi', 5650], ['Potato', 'Rabi', 1200]];
  for (const [n, s] of crops) C[n] = (await ins('INSERT INTO crops(name,season) OUTPUT INSERTED.crop_id id VALUES(@n,@s)', { n, s })).id;
  const hash = await bcrypt.hash('Demo@1234', 10);
  const users = [['admin', 'Admin User', 'admin', 1], ['officer', 'Officer Sharma', 'officer', 1], ['farmer1', 'Ramesh Kumar', 'farmer', 1],
    ['farmer2', 'Sita Devi', 'farmer', 1], ['farmer3', 'Mohan Singh', 'farmer', 1], ['trader1', 'Agarwal Traders', 'trader', 1],
    ['trader2', 'Verma Agro', 'trader', 1], ['trader3', 'New Trader Co', 'trader', 0]];
  for (const [k, n, r, v] of users) U[k] = (await ins(`INSERT INTO users(full_name,email,password_hash,role,district_id,is_verified)
    OUTPUT INSERTED.user_id id VALUES(@n,@e,@h,@r,@d,@v)`, { n, e: k + '@demo.com', h: hash, r, d: D.Hapur, v })).id;
  const mins = m => new Date(Date.now() + m * 60000);
  const ls = [['farmer1', 'Wheat', 500, 'A', 2300, 1440], ['farmer1', 'Mustard', 200, 'B', 5700, 600], ['farmer2', 'Rice', 800, 'A', 2350, 2880],
    ['farmer3', 'Maize', 300, 'C', 2100, 300], ['farmer2', 'Potato', 1000, 'B', 1250, 4320]];
  const L = [];
  for (const [f, c, qty, g, bp, m] of ls) L.push((await ins(`INSERT INTO listings(farmer_id,crop_id,quantity_kg,grade,base_price,closing_time)
    OUTPUT INSERTED.listing_id id VALUES(@f,@c,@q,@g,@b,@t)`, { f: U[f], c: C[c], q: qty, g, b: bp, t: mins(m) })).id);
  for (const [i, t, a] of [[0, 'trader1', 2320], [0, 'trader2', 2400], [1, 'trader1', 5750], [2, 'trader2', 2360]])
    await q('INSERT INTO bids(listing_id,trader_id,bid_amount) VALUES(@l,@t,@a)', { l: L[i], t: U[t], a });
  for (const [n, , base] of crops) for (const d of ['Hapur', 'Meerut']) {
    let p = base;
    for (let i = 29; i >= 0; i--) {
      p = Math.round(p * (1 + (Math.random() - 0.48) * 0.02));
      await q('INSERT INTO daily_prices(crop_id,district_id,price_date,modal_price,entered_by) VALUES(@c,@d,@dt,@p,@u)',
        { c: C[n], d: D[d], dt: new Date(Date.now() - i * 864e5), p, u: U.officer });
    }
  }
  console.log('Seeded. Logins: admin / officer / farmer1-3 / trader1-3 @demo.com, password Demo@1234');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
