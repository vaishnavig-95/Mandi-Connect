const sql = require('mssql');

const cfg = {
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: 1433,
  options: {
    encrypt: true,
    trustServerCertificate: false,
    connectTimeout: 30000,
    requestTimeout: 30000
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

let pool;

const getPool = async () => {
  if (!pool) {
    pool = await new sql.ConnectionPool(cfg).connect();
  }
  return pool;
};

async function q(text, params = {}) {
  const request = (await getPool()).request();

  for (const [key, value] of Object.entries(params)) {
    request.input(key, value);
  }

  return (await request.query(text)).recordset || [];
}

module.exports = { q };