
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { q } = require('./config/db');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '100kb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    project: 'Mandi Connect',
    database: 'Azure SQL'
  });
});

// Azure SQL connection test
app.get('/api/db-test', async (req, res) => {
  try {
    const result = await q('SELECT DB_NAME() AS databaseName');

    res.json({
      status: 'connected',
      database: result[0].databaseName
    });
  } catch (error) {
    console.error('Database error:', error.message);

    res.status(500).json({
      status: 'failed',
      message: error.message
    });
  }
});

// Authentication APIs
app.use('/api/auth', require('./routes/auth'));

// Marketplace, bidding, prices and other APIs
app.use('/api', require('./routes/market'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Mandi Connect API running on port ${PORT}`);
});
