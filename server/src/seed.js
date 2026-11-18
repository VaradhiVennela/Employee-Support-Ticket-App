const path = require('path');
const bcrypt = require('bcryptjs');
const { SAMPLE_TIMESTAMP } = require('./constants');

const SAMPLE_TICKETS = [
  {
    title: 'Laptop not charging',
    description: 'The laptop battery does not charge when the power adapter is connected.',
    category: 'Hardware',
    priority: 'High',
    status: 'Open',
  },
  {
    title: 'Cannot log in to VPN',
    description: 'VPN authentication fails and the employee cannot reach the office network.',
    category: 'Network',
    priority: 'High',
    status: 'In Progress',
  },
  {
    title: 'Need access to the shared project folder',
    description: 'The employee needs permission to open the shared project folder.',
    category: 'Access',
    priority: 'Medium',
    status: 'Open',
  },
  {
    title: 'Excel keeps crashing on startup',
    description: 'Microsoft Excel closes immediately after it is opened.',
    category: 'Software',
    priority: 'Medium',
    status: 'Resolved',
  },
  {
    title: 'Request a second monitor',
    description: 'The employee is requesting an additional monitor for their desk.',
    category: 'Hardware',
    priority: 'Low',
    status: 'Closed',
  },
];

function seed(db) {
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get('ravi');
  if (existing) {
    return { seeded: false };
  }

  const employeePassword = process.env.DEMO_EMPLOYEE_PASSWORD;
  const staffPassword = process.env.DEMO_STAFF_PASSWORD;
  if (!employeePassword || !staffPassword) {
    throw new Error('Set DEMO_EMPLOYEE_PASSWORD and DEMO_STAFF_PASSWORD before seeding.');
  }

  const insertUser = db.prepare(
    'INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, ?)'
  );
  const ravi = insertUser.run('Ravi', 'ravi', bcrypt.hashSync(employeePassword, 10), 'employee');
  insertUser.run('Admin', 'admin', bcrypt.hashSync(staffPassword, 10), 'support');

  const insertTicket = db.prepare(`
    INSERT INTO tickets (
      title, description, category, priority, status, created_by, created_at, updated_at, timestamp_origin
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'sample')
  `);

  for (const ticket of SAMPLE_TICKETS) {
    insertTicket.run(
      ticket.title,
      ticket.description,
      ticket.category,
      ticket.priority,
      ticket.status,
      Number(ravi.lastInsertRowid),
      SAMPLE_TIMESTAMP,
      SAMPLE_TIMESTAMP
    );
  }

  return { seeded: true };
}

if (require.main === module) {
  require('dotenv').config({ path: path.join(__dirname, '../../.env') });
  const { openDatabase, databasePath } = require('./db');
  const db = openDatabase(databasePath());
  const result = seed(db);
  console.log(result.seeded ? 'Sample data inserted.' : 'Sample data already present. No duplicate users were added.');
}

module.exports = { seed, SAMPLE_TICKETS };
