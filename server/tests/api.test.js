const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const { createApp } = require('../src/app');
const { openDatabase } = require('../src/db');
const { seed } = require('../src/seed');

process.env.JWT_SECRET = 'test-jwt-secret-not-for-production';
process.env.DEMO_EMPLOYEE_PASSWORD = 'Ravi-demo-1842';
process.env.DEMO_STAFF_PASSWORD = 'Admin-demo-1842';
process.env.CLIENT_ORIGIN = 'http://localhost:5173';

function countOf(db, table) {
  return Number(db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n);
}

function makeApp() {
  const db = openDatabase(':memory:');
  seed(db);
  return { app: createApp(db), db };
}

async function login(agent, username, password) {
  const response = await agent.post('/api/auth/login').send({ username, password });
  assert.equal(response.status, 200);
  return response.body.user;
}

test('seed does not duplicate users or tickets', () => {
  const db = openDatabase(':memory:');
  assert.equal(seed(db).seeded, true);
  assert.equal(seed(db).seeded, false);
  assert.equal(countOf(db, 'users'), 2);
  assert.equal(countOf(db, 'tickets'), 5);
});

test('health check responds', async () => {
  const { app } = makeApp();
  const response = await request(app).get('/api/health');
  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
});

test('login rejects a wrong password and accepts the demo employee', async () => {
  const { app } = makeApp();
  const wrong = await request(app).post('/api/auth/login').send({
    username: 'ravi',
    password: 'wrong-password',
  });
  assert.equal(wrong.status, 401);

  const agent = request.agent(app);
  const user = await login(agent, 'ravi', process.env.DEMO_EMPLOYEE_PASSWORD);
  assert.equal(user.name, 'Ravi');
  assert.equal(user.role, 'employee');
  assert.equal(user.password_hash, undefined);

  const me = await agent.get('/api/auth/me');
  assert.equal(me.status, 200);
  assert.equal(me.body.user.username, 'ravi');
});

test('a request without a login cookie is rejected', async () => {
  const { app } = makeApp();
  const response = await request(app).get('/api/tickets');
  assert.equal(response.status, 401);
});

test('employee can create a ticket and view only their own tickets', async () => {
  const { app, db } = makeApp();
  const password = bcrypt.hashSync('Kiran-demo-1842', 10);
  const kiran = db
    .prepare('INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, ?)')
    .run('Kiran', 'kiran', password, 'employee');
  db.prepare(
    `INSERT INTO tickets (
      title, description, category, priority, status, created_by, created_at, updated_at, timestamp_origin
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'system')`
  ).run(
    'Kiran printer jam',
    'The printer on Kiran desk is jammed.',
    'Hardware',
    'Low',
    'Open',
    Number(kiran.lastInsertRowid),
    '2026-11-18T10:00:00.000Z',
    '2026-11-18T10:00:00.000Z'
  );

  const ravi = request.agent(app);
  await login(ravi, 'ravi', process.env.DEMO_EMPLOYEE_PASSWORD);
  const created = await ravi.post('/api/tickets').send({
    title: 'Keyboard keys stick',
    description: 'Several keys on the keyboard stay down.',
    category: 'Hardware',
    priority: 'Low',
    status: 'Closed',
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.ticket.status, 'Open');
  assert.equal(created.body.ticket.createdBy.name, 'Ravi');
  assert.equal(created.body.ticket.timestampOrigin, 'system');

  const ownList = await ravi.get('/api/tickets');
  assert.equal(ownList.status, 200);
  assert.equal(ownList.body.tickets.length, 6);
  assert.ok(ownList.body.tickets.every((ticket) => ticket.createdBy.name === 'Ravi'));
  assert.equal(
    ownList.body.tickets.some((ticket) => ticket.title === 'Kiran printer jam'),
    false
  );

  const hidden = ownList.body.tickets.find((ticket) => ticket.title === 'Kiran printer jam');
  assert.equal(hidden, undefined);
  const kiranTicketId = db.prepare(`SELECT id FROM tickets WHERE title = ?`).get('Kiran printer jam').id;
  const forbidden = await ravi.get(`/api/tickets/${Number(kiranTicketId)}`);
  assert.equal(forbidden.status, 403);
});

test('support staff can view all tickets', async () => {
  const { app } = makeApp();
  const admin = request.agent(app);
  await login(admin, 'admin', process.env.DEMO_STAFF_PASSWORD);
  const response = await admin.get('/api/tickets');
  assert.equal(response.status, 200);
  assert.equal(response.body.tickets.length, 5);
  const titles = response.body.tickets.map((ticket) => ticket.title);
  assert.ok(titles.includes('Laptop not charging'));
  assert.ok(titles.includes('Request a second monitor'));
});

test('search and category filters stay inside the caller visibility', async () => {
  const { app } = makeApp();
  const ravi = request.agent(app);
  await login(ravi, 'ravi', process.env.DEMO_EMPLOYEE_PASSWORD);
  const hardware = await ravi.get('/api/tickets').query({ category: 'Hardware', search: 'laptop' });
  assert.equal(hardware.status, 200);
  assert.equal(hardware.body.tickets.length, 1);
  assert.equal(hardware.body.tickets[0].title, 'Laptop not charging');
});

test('support staff can change status and an employee cannot', async () => {
  const { app, db } = makeApp();
  const admin = request.agent(app);
  const ravi = request.agent(app);
  await login(admin, 'admin', process.env.DEMO_STAFF_PASSWORD);
  await login(ravi, 'ravi', process.env.DEMO_EMPLOYEE_PASSWORD);
  const openTicket = db.prepare(`SELECT id, created_at FROM tickets WHERE title = ?`).get('Laptop not charging');
  const closedTicket = db.prepare(`SELECT id FROM tickets WHERE title = ?`).get('Request a second monitor');

  const denied = await ravi.patch(`/api/tickets/${Number(openTicket.id)}/status`).send({ status: 'Resolved' });
  assert.equal(denied.status, 403);

  const changed = await admin.patch(`/api/tickets/${Number(openTicket.id)}/status`).send({ status: 'In Progress' });
  assert.equal(changed.status, 200);
  assert.equal(changed.body.ticket.status, 'In Progress');
  assert.equal(changed.body.ticket.createdAt, openTicket.created_at);
  assert.notEqual(changed.body.ticket.updatedAt, openTicket.created_at);

  const reopened = await admin.patch(`/api/tickets/${Number(closedTicket.id)}/status`).send({ status: 'Open' });
  assert.equal(reopened.status, 200);
  assert.equal(reopened.body.ticket.status, 'Open');

  const invalid = await admin.patch(`/api/tickets/${Number(openTicket.id)}/status`).send({ status: 'Done' });
  assert.equal(invalid.status, 400);
});

test('empty titles, empty descriptions, and long titles are rejected', async () => {
  const { app, db } = makeApp();
  const before = countOf(db, 'tickets');
  const ravi = request.agent(app);
  await login(ravi, 'ravi', process.env.DEMO_EMPLOYEE_PASSWORD);

  const emptyTitle = await ravi.post('/api/tickets').send({
    title: '   ',
    description: 'A description',
    category: 'Other',
    priority: 'Low',
  });
  assert.equal(emptyTitle.status, 400);
  assert.match(emptyTitle.body.error, /Title/);

  const emptyDescription = await ravi.post('/api/tickets').send({
    title: 'A title',
    description: ' ',
    category: 'Other',
    priority: 'Low',
  });
  assert.equal(emptyDescription.status, 400);
  assert.match(emptyDescription.body.error, /Description/);

  const tooLong = await ravi.post('/api/tickets').send({
    title: 'A'.repeat(101),
    description: 'A description',
    category: 'Other',
    priority: 'Low',
  });
  assert.equal(tooLong.status, 400);
  assert.equal(countOf(db, 'tickets'), before);

  const exact = await ravi.post('/api/tickets').send({
    title: 'B'.repeat(100),
    description: 'A description',
    category: 'Other',
    priority: 'Medium',
  });
  assert.equal(exact.status, 201);
  assert.equal(exact.body.ticket.title.length, 100);
});

test('closed tickets cannot be edited and open tickets can', async () => {
  const { app, db } = makeApp();
  const ravi = request.agent(app);
  const admin = request.agent(app);
  await login(ravi, 'ravi', process.env.DEMO_EMPLOYEE_PASSWORD);
  await login(admin, 'admin', process.env.DEMO_STAFF_PASSWORD);
  const closed = db.prepare(`SELECT id FROM tickets WHERE title = ?`).get('Request a second monitor');
  const open = db.prepare(`SELECT id, created_at FROM tickets WHERE title = ?`).get('Laptop not charging');
  const payload = {
    title: 'Updated title',
    description: 'Updated description',
    category: 'Software',
    priority: 'High',
  };

  const employeeClosed = await ravi.patch(`/api/tickets/${Number(closed.id)}`).send(payload);
  assert.equal(employeeClosed.status, 400);
  const staffClosed = await admin.patch(`/api/tickets/${Number(closed.id)}`).send(payload);
  assert.equal(staffClosed.status, 400);

  const employeeEdit = await ravi.patch(`/api/tickets/${Number(open.id)}`).send(payload);
  assert.equal(employeeEdit.status, 200);
  assert.equal(employeeEdit.body.ticket.title, 'Updated title');
  assert.equal(employeeEdit.body.ticket.createdAt, open.created_at);
  assert.notEqual(employeeEdit.body.ticket.updatedAt, open.created_at);
});

test('comments can be added to a closed ticket and empty comments are rejected', async () => {
  const { app, db } = makeApp();
  const ravi = request.agent(app);
  const admin = request.agent(app);
  await login(ravi, 'ravi', process.env.DEMO_EMPLOYEE_PASSWORD);
  await login(admin, 'admin', process.env.DEMO_STAFF_PASSWORD);
  const closed = db.prepare(`SELECT id, created_at FROM tickets WHERE title = ?`).get('Request a second monitor');

  const empty = await ravi.post(`/api/tickets/${Number(closed.id)}/comments`).send({ body: '  ' });
  assert.equal(empty.status, 400);

  const employeeComment = await ravi.post(`/api/tickets/${Number(closed.id)}/comments`).send({
    body: 'I still need this monitor next week.',
  });
  assert.equal(employeeComment.status, 201);
  assert.equal(employeeComment.body.comment.author.name, 'Ravi');
  assert.ok(employeeComment.body.comment.createdAt);

  const staffComment = await admin.post(`/api/tickets/${Number(closed.id)}/comments`).send({
    body: 'The request stays on file.',
  });
  assert.equal(staffComment.status, 201);
  assert.equal(staffComment.body.comment.author.name, 'Admin');

  const details = await ravi.get(`/api/tickets/${Number(closed.id)}`);
  assert.equal(details.body.comments.length, 2);
  const updated = db.prepare('SELECT created_at, updated_at FROM tickets WHERE id = ?').get(closed.id);
  assert.equal(updated.created_at, closed.created_at);
  assert.notEqual(updated.updated_at, closed.created_at);

  const password = bcrypt.hashSync('Kiran-demo-1842', 10);
  db.prepare('INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, ?)').run(
    'Kiran',
    'kiran',
    password,
    'employee'
  );
  const kiran = request.agent(app);
  await login(kiran, 'kiran', 'Kiran-demo-1842');
  const forbidden = await kiran.post(`/api/tickets/${Number(closed.id)}/comments`).send({
    body: 'I should not be able to comment.',
  });
  assert.equal(forbidden.status, 403);
  const stillTwo = await ravi.get(`/api/tickets/${Number(closed.id)}/comments`);
  assert.equal(stillTwo.body.comments.length, 2);
});

test('invalid ticket ids are handled and stored comments remain after close and reopen', async () => {
  const { app, db } = makeApp();
  const admin = request.agent(app);
  await login(admin, 'admin', process.env.DEMO_STAFF_PASSWORD);
  const open = db.prepare(`SELECT id FROM tickets WHERE title = ?`).get('Laptop not charging');

  const textId = await admin.get('/api/tickets/abc');
  assert.equal(textId.status, 400);
  const missing = await admin.get('/api/tickets/99999');
  assert.equal(missing.status, 404);

  await admin.post(`/api/tickets/${Number(open.id)}/comments`).send({ body: 'Checking the charger.' });
  await admin.patch(`/api/tickets/${Number(open.id)}/status`).send({ status: 'Closed' });
  const closedView = await admin.get(`/api/tickets/${Number(open.id)}`);
  assert.equal(closedView.body.ticket.status, 'Closed');
  assert.equal(closedView.body.comments.length, 1);

  await admin.patch(`/api/tickets/${Number(open.id)}/status`).send({ status: 'Open' });
  const reopened = await admin.get(`/api/tickets/${Number(open.id)}`);
  assert.equal(reopened.body.ticket.status, 'Open');
  assert.equal(reopened.body.comments[0].body, 'Checking the charger.');
});
