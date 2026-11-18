const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { createApp } = require('./app');
const { openDatabase, databasePath } = require('./db');
const { seed } = require('./seed');

if (!process.env.JWT_SECRET) {
  console.error('Set JWT_SECRET in .env before starting the server.');
  process.exit(1);
}

const db = openDatabase(databasePath());
const result = seed(db);
if (result.seeded) {
  console.log('Inserted fictional sample users and tickets.');
}

const port = Number(process.env.PORT) || 4000;
createApp(db).listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
