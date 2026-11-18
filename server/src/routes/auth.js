const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { setAuthCookie, clearAuthCookie, publicUser } = require('../middleware/auth');

function createAuthRouter(db, requireAuth) {
  const router = express.Router();

  router.post('/login', (req, res) => {
    const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = jwt.sign(
      { sub: Number(user.id), role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    setAuthCookie(res, token);
    return res.json({ user: publicUser(user) });
  });

  router.post('/logout', (req, res) => {
    clearAuthCookie(res);
    return res.json({ ok: true });
  });

  router.get('/me', requireAuth, (req, res) => {
    return res.json({ user: req.user });
  });

  return router;
}

module.exports = { createAuthRouter };
