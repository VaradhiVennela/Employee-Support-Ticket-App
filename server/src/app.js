const express = require('express');
const cors = require('cors');
const { createRequireAuth } = require('./middleware/auth');
const { createAuthRouter } = require('./routes/auth');
const { createTicketRouter } = require('./routes/tickets');

function createApp(db) {
  const app = express();
  const requireAuth = createRequireAuth(db);

  app.use(
    cors({
      origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
      credentials: true,
    })
  );
  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({ ok: true });
  });

  app.use('/api/auth', createAuthRouter(db, requireAuth));
  app.use('/api/tickets', createTicketRouter(db, requireAuth));

  app.use((req, res) => {
    res.status(404).json({ error: 'Not found.' });
  });

  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Request body must be JSON.' });
    }
    console.error(err);
    return res.status(500).json({ error: 'Something went wrong.' });
  });

  return app;
}

module.exports = { createApp };
