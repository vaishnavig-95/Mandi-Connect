const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { q } = require('../config/db');
const { audit } = require('../middleware/auth');

router.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 100 }));

router.post('/register', async (req, res) => {
  try {
    const { full_name, email, password, role, district_id } = req.body;
    if (!full_name || !/^\S+@\S+\.\S+$/.test(email || '') || (password || '').length < 8)
      return res.status(400).json({ error: 'Name, valid email and 8+ character password required' });
    if (!['farmer', 'trader'].includes(role)) return res.status(400).json({ error: 'Role must be farmer or trader' });
    const hash = await bcrypt.hash(password, 10);
    const [u] = await q(
      `INSERT INTO users(full_name,email,password_hash,role,district_id,is_verified)
       OUTPUT INSERTED.user_id VALUES(@n,@e,@h,@r,@d,@v)`,
      { n: full_name, e: email.toLowerCase(), h: hash, r: role, d: Number(district_id), v: role === 'farmer' ? 1 : 0 });
    await audit(u.user_id, 'REGISTER', role);
    res.status(201).json({ ok: true });
  } catch (e) {
    res.status(e.number === 2627 ? 409 : 500).json({ error: e.number === 2627 ? 'Email already registered' : 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const [u] = await q('SELECT * FROM users WHERE email=@e', { e: String(req.body.email || '').toLowerCase() });
    if (!u || !(await bcrypt.compare(String(req.body.password || ''), u.password_hash))) {
      await audit(u?.user_id ?? null, 'LOGIN_FAILED', req.body.email);
      return res.status(401).json({ error: 'Wrong email or password' });
    }
    const token = jwt.sign({ id: u.user_id, role: u.role, name: u.full_name }, process.env.JWT_SECRET, { expiresIn: '8h' });
    await audit(u.user_id, 'LOGIN', u.role);
    res.json({ token, user: { id: u.user_id, name: u.full_name, role: u.role, verified: !!u.is_verified } });
  } catch { res.status(500).json({ error: 'Server error' }); }
});
module.exports = router;
