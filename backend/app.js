const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { getDb } = require('./storage/fileDb');

dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '.env') });

// Initialize the local file DB before the first request.
getDb();

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/routes', require('./routes/routes'));
app.use('/api/route-packs', require('./routes/routePacks'));
app.use('/api/points', require('./routes/points'));
app.use('/api/scan', require('./routes/scan'));
app.use('/api/rewards', require('./routes/rewards'));
app.use('/api', require('./routes/navigation'));

module.exports = app;
