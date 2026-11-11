const router = require('express').Router();
const { q } = require('../config/db');
const { auth, need, audit } = require('../middleware/auth');
const h = fn => (req, res) => fn(req, res).catch(e => { console.error(e); res.status(500).json({ error: 'Server error' }); });

// ---- public reference data + cached daily prices (read-heavy, written once a day) ----
router.get('/districts', h(async (_, res) => res.json(await q('SELECT * FROM districts ORDER BY name'))));
router.get('/crops', h(async (_, res) => res.json(await q('SELECT * FROM crops ORDER BY name'))));

let cache = null, cacheAt = 0;
router.get('/prices', h(async (_, res) => {
  if (!cache || Date.now() - cacheAt > 60000) {
    cache = await q(`SELECT p.price_date, c.name crop, c.season, d.name district, p.modal_price
      FROM daily_prices p JOIN crops c ON c.crop_id=p.crop_id JOIN districts d ON d.district_id=p.district_id
      WHERE p.price_date >= DATEADD(day,-30,CAST(SYSUTCDATETIME() AS DATE))
      ORDER BY p.price_date DESC, c.name`);
    cacheAt = Date.now();
  }
  res.json(cache);
}));

router.post('/prices', auth, need('officer'), h(async (req, res) => {
  const { crop_id, district_id, price_date, modal_price } = req.body;
  if (!(modal_price > 0) || !price_date) return res.status(400).json({ error: 'Valid price and date required' });
  const p = { c: Number(crop_id), d: Number(district_id), dt: new Date(price_date), p: Number(modal_price), u: req.user.id };
  await q(`IF EXISTS (SELECT 1 FROM daily_prices WHERE crop_id=@c AND district_id=@d AND price_date=@dt)
             UPDATE daily_prices SET modal_price=@p, entered_by=@u WHERE crop_id=@c AND district_id=@d AND price_date=@dt
           ELSE INSERT INTO daily_prices(crop_id,district_id,price_date,modal_price,entered_by) VALUES(@c,@d,@dt,@p,@u)`, p);
  cache = null;  // invalidate cache on write
  await audit(req.user.id, 'PRICE_SET', `crop ${p.c}, district ${p.d}, ${price_date} = ${p.p}`);
  res.json({ ok: true });
}));

// ---- listings ----
router.get('/listings', auth, h(async (_, res) => {
  res.json(await q('SELECT * FROM vw_active_listings ORDER BY closing_time'));
}));
router.get('/listings/mine', auth, need('farmer'), h(async (req, res) => res.json(await q(
  `SELECT l.listing_id, c.name crop, l.quantity_kg, l.grade, l.base_price, l.closing_time, l.status,
     (SELECT MAX(bid_amount) FROM bids b WHERE b.listing_id=l.listing_id) highest_bid
   FROM listings l JOIN crops c ON c.crop_id=l.crop_id WHERE l.farmer_id=@u ORDER BY l.created_at DESC`, { u: req.user.id }))));

router.post('/listings', auth, need('farmer'), h(async (req, res) => {
  const { crop_id, quantity_kg, grade, base_price, closing_time } = req.body;
  if (!(quantity_kg > 0) || !(base_price > 0) || !['A', 'B', 'C'].includes(grade) || !(new Date(closing_time) > new Date()))
    return res.status(400).json({ error: 'Check quantity, price, grade and a future closing time' });
  const [r] = await q(`INSERT INTO listings(farmer_id,crop_id,quantity_kg,grade,base_price,closing_time)
    OUTPUT INSERTED.listing_id VALUES(@f,@c,@qty,@g,@bp,@ct)`,
    { f: req.user.id, c: Number(crop_id), qty: Number(quantity_kg), g: grade, bp: Number(base_price), ct: new Date(closing_time) });
  await audit(req.user.id, 'LISTING_CREATED', r.listing_id);
  res.status(201).json(r);
}));

router.post('/listings/:id/bids', auth, need('trader'), h(async (req, res) => {
  const id = Number(req.params.id), amount = Number(req.body.bid_amount);
  const [me] = await q('SELECT is_verified FROM users WHERE user_id=@u', { u: req.user.id });
  if (!me.is_verified) return res.status(403).json({ error: 'Your account is not verified by a mandi officer yet' });
  const [l] = await q('SELECT base_price, status, closing_time FROM listings WHERE listing_id=@i', { i: id });
  if (!l || l.status !== 'Open' || new Date(l.closing_time) <= new Date()) return res.status(400).json({ error: 'Bidding is closed for this listing' });
  if (!(amount >= l.base_price)) return res.status(400).json({ error: `Bid must be at least the base price (${l.base_price})` });
  await q('INSERT INTO bids(listing_id,trader_id,bid_amount) VALUES(@l,@t,@a)', { l: id, t: req.user.id, a: amount });
  await audit(req.user.id, 'BID_PLACED', `listing ${id}, amount ${amount}`);
  res.status(201).json({ ok: true });
}));

router.post('/listings/:id/close', auth, need('admin'), h(async (req, res) => {   // manual close, handy for demos
  await q('EXEC sp_close_listing @listing_id=@i', { i: Number(req.params.id) });
  res.json({ ok: true });
}));

router.get('/bids/mine', auth, need('trader'), h(async (req, res) => res.json(await q(
  `SELECT b.bid_id, c.name crop, b.bid_amount, b.bid_time, b.status FROM bids b
   JOIN listings l ON l.listing_id=b.listing_id JOIN crops c ON c.crop_id=l.crop_id
   WHERE b.trader_id=@u ORDER BY b.bid_time DESC`, { u: req.user.id }))));

// ---- officer: verify traders; admin: audit log ----
router.get('/traders/pending', auth, need('officer'), h(async (_, res) =>
  res.json(await q("SELECT user_id, full_name, email FROM users WHERE role='trader' AND is_verified=0"))));
router.patch('/traders/:id/verify', auth, need('officer'), h(async (req, res) => {
  await q("UPDATE users SET is_verified=1 WHERE user_id=@i AND role='trader'", { i: Number(req.params.id) });
  await audit(req.user.id, 'TRADER_VERIFIED', req.params.id);
  res.json({ ok: true });
}));
router.get('/audit', auth, need('admin'), h(async (_, res) =>
  res.json(await q(`SELECT TOP 100 a.log_id, u.full_name, a.action, a.details, a.created_at
    FROM audit_logs a LEFT JOIN users u ON u.user_id=a.user_id ORDER BY a.log_id DESC`))));
module.exports = router;
