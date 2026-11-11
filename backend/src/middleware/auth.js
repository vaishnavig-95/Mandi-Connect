const jwt = require('jsonwebtoken');
const { q } = require('../config/db');
const auth = (req, res, next) => {
  try {
    req.user = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), process.env.JWT_SECRET);
    next();
  } catch { res.status(401).json({ error: 'Please log in' }); }
};
const need = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'Not allowed for your role' });
const audit = (uid, action, details) =>
  q('INSERT INTO audit_logs(user_id,action,details) VALUES(@u,@a,@d)', { u: uid, a: action, d: String(details) }).catch(() => {});
module.exports = { auth, need, audit };
