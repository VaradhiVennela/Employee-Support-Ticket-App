const jwt = require('jsonwebtoken');

function readCookie(req, name) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    const key = part.slice(0, separator).trim();
    if (key === name) {
      return decodeURIComponent(part.slice(separator + 1).trim());
    }
  }
  return null;
}

function setAuthCookie(res, token) {
  const maxAge = 60 * 60 * 8;
  res.setHeader(
    'Set-Cookie',
    `token=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax`
  );
}

function clearAuthCookie(res) {
  res.setHeader('Set-Cookie', 'token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax');
}

function createRequireAuth(db) {
  return function requireAuth(req, res, next) {
    const token = readCookie(req, 'token');
    if (!token) {
      return res.status(401).json({ error: 'Please log in.' });
    }
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = db
        .prepare('SELECT id, name, username, role FROM users WHERE id = ?')
        .get(payload.sub);
      if (!user) {
        return res.status(401).json({ error: 'Please log in.' });
      }
      req.user = {
        id: Number(user.id),
        name: user.name,
        username: user.username,
        role: user.role,
      };
      return next();
    } catch {
      return res.status(401).json({ error: 'Please log in.' });
    }
  };
}

function publicUser(user) {
  return {
    id: Number(user.id),
    name: user.name,
    username: user.username,
    role: user.role,
  };
}

module.exports = {
  createRequireAuth,
  setAuthCookie,
  clearAuthCookie,
  publicUser,
};
