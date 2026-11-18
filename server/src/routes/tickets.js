const express = require('express');
const {
  validateTicketContent,
  validateStatus,
  validateComment,
  parseTicketId,
} = require('../validators');

function mapTicket(row) {
  return {
    id: Number(row.id),
    title: row.title,
    description: row.description,
    category: row.category,
    priority: row.priority,
    status: row.status,
    createdBy: { id: Number(row.created_by), name: row.creator_name },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    timestampOrigin: row.timestamp_origin,
  };
}

function mapComment(row) {
  return {
    id: Number(row.id),
    body: row.body,
    createdAt: row.created_at,
    author: { id: Number(row.author_id), name: row.author_name },
  };
}

function likeTerm(search) {
  const escaped = search.replace(/[\\%_]/g, (character) => `\\${character}`);
  return `%${escaped}%`;
}

function loadTicket(db, id) {
  return db
    .prepare(
      `SELECT tickets.*, users.name AS creator_name
       FROM tickets
       JOIN users ON users.id = tickets.created_by
       WHERE tickets.id = ?`
    )
    .get(id);
}

function loadComments(db, ticketId) {
  return db
    .prepare(
      `SELECT comments.*, users.name AS author_name
       FROM comments
       JOIN users ON users.id = comments.author_id
       WHERE comments.ticket_id = ?
       ORDER BY comments.created_at ASC, comments.id ASC`
    )
    .all(ticketId)
    .map(mapComment);
}

function canAccess(user, ticket) {
  return user.role === 'support' || ticket.created_by === user.id;
}

function createTicketRouter(db, requireAuth) {
  const router = express.Router();
  router.use(requireAuth);

  router.get('/', (req, res) => {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const category = typeof req.query.category === 'string' ? req.query.category : '';
    const priority = typeof req.query.priority === 'string' ? req.query.priority : '';
    const status = typeof req.query.status === 'string' ? req.query.status : '';
    const ownerId = req.user.role === 'employee' ? req.user.id : null;
    const term = search ? likeTerm(search) : '';

    const rows = db
      .prepare(
        `SELECT tickets.*, users.name AS creator_name
         FROM tickets
         JOIN users ON users.id = tickets.created_by
         WHERE (? IS NULL OR tickets.created_by = ?)
           AND (? = '' OR tickets.title LIKE ? ESCAPE '\\' OR tickets.description LIKE ? ESCAPE '\\')
           AND (? = '' OR tickets.category = ?)
           AND (? = '' OR tickets.priority = ?)
           AND (? = '' OR tickets.status = ?)
         ORDER BY tickets.updated_at DESC, tickets.id DESC`
      )
      .all(
        ownerId,
        ownerId,
        term,
        term,
        term,
        category,
        category,
        priority,
        priority,
        status,
        status
      );

    return res.json({ tickets: rows.map(mapTicket) });
  });

  router.post('/', (req, res) => {
    const error = validateTicketContent(req.body || {});
    if (error) {
      return res.status(400).json({ error });
    }

    const now = new Date().toISOString();
    const result = db
      .prepare(
        `INSERT INTO tickets (
          title, description, category, priority, status, created_by, created_at, updated_at, timestamp_origin
        ) VALUES (?, ?, ?, ?, 'Open', ?, ?, ?, 'system')`
      )
      .run(
        req.body.title.trim(),
        req.body.description.trim(),
        req.body.category,
        req.body.priority,
        req.user.id,
        now,
        now
      );

    const ticket = loadTicket(db, Number(result.lastInsertRowid));
    return res.status(201).json({ ticket: mapTicket(ticket) });
  });

  router.get('/:id', (req, res) => {
    const parsed = parseTicketId(req.params.id);
    if (parsed.error) {
      return res.status(parsed.status).json({ error: parsed.error });
    }
    const ticket = loadTicket(db, parsed.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }
    if (!canAccess(req.user, ticket)) {
      return res.status(403).json({ error: 'You cannot view this ticket.' });
    }
    return res.json({
      ticket: mapTicket(ticket),
      comments: loadComments(db, ticket.id),
    });
  });

  router.patch('/:id/status', (req, res) => {
    if (req.user.role !== 'support') {
      return res.status(403).json({ error: 'Only support staff can change ticket status.' });
    }
    const parsed = parseTicketId(req.params.id);
    if (parsed.error) {
      return res.status(parsed.status).json({ error: parsed.error });
    }
    const statusError = validateStatus(req.body?.status);
    if (statusError) {
      return res.status(400).json({ error: statusError });
    }
    const ticket = loadTicket(db, parsed.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }
    const now = new Date().toISOString();
    db.prepare('UPDATE tickets SET status = ?, updated_at = ? WHERE id = ?').run(
      req.body.status,
      now,
      ticket.id
    );
    return res.json({ ticket: mapTicket(loadTicket(db, ticket.id)) });
  });

  router.patch('/:id', (req, res) => {
    const parsed = parseTicketId(req.params.id);
    if (parsed.error) {
      return res.status(parsed.status).json({ error: parsed.error });
    }
    const ticket = loadTicket(db, parsed.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }
    if (!canAccess(req.user, ticket)) {
      return res.status(403).json({ error: 'You cannot update this ticket.' });
    }
    if (ticket.status === 'Closed') {
      return res.status(400).json({ error: 'Closed tickets cannot be edited.' });
    }
    const error = validateTicketContent(req.body || {});
    if (error) {
      return res.status(400).json({ error });
    }
    const now = new Date().toISOString();
    db.prepare(
      `UPDATE tickets
       SET title = ?, description = ?, category = ?, priority = ?, updated_at = ?
       WHERE id = ?`
    ).run(
      req.body.title.trim(),
      req.body.description.trim(),
      req.body.category,
      req.body.priority,
      now,
      ticket.id
    );
    return res.json({ ticket: mapTicket(loadTicket(db, ticket.id)) });
  });

  router.get('/:id/comments', (req, res) => {
    const parsed = parseTicketId(req.params.id);
    if (parsed.error) {
      return res.status(parsed.status).json({ error: parsed.error });
    }
    const ticket = loadTicket(db, parsed.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }
    if (!canAccess(req.user, ticket)) {
      return res.status(403).json({ error: 'You cannot view this ticket.' });
    }
    return res.json({ comments: loadComments(db, ticket.id) });
  });

  router.post('/:id/comments', (req, res) => {
    const parsed = parseTicketId(req.params.id);
    if (parsed.error) {
      return res.status(parsed.status).json({ error: parsed.error });
    }
    const ticket = loadTicket(db, parsed.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }
    if (!canAccess(req.user, ticket)) {
      return res.status(403).json({ error: 'You cannot comment on this ticket.' });
    }
    const commentError = validateComment(req.body?.body);
    if (commentError) {
      return res.status(400).json({ error: commentError });
    }
    const now = new Date().toISOString();
    const result = db
      .prepare('INSERT INTO comments (ticket_id, author_id, body, created_at) VALUES (?, ?, ?, ?)')
      .run(ticket.id, req.user.id, req.body.body.trim(), now);
    db.prepare('UPDATE tickets SET updated_at = ? WHERE id = ?').run(now, ticket.id);
    const comment = db
      .prepare(
        `SELECT comments.*, users.name AS author_name
         FROM comments
         JOIN users ON users.id = comments.author_id
         WHERE comments.id = ?`
      )
      .get(Number(result.lastInsertRowid));
    return res.status(201).json({ comment: mapComment(comment) });
  });

  return router;
}

module.exports = { createTicketRouter };
