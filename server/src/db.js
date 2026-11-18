const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

function openDatabase(filename) {
  if (filename !== ':memory:') {
    fs.mkdirSync(path.dirname(path.resolve(filename)), { recursive: true });
  }

  const db = new DatabaseSync(filename);
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('employee', 'support'))
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL CHECK (category IN ('Hardware', 'Software', 'Network', 'Access', 'Other')),
      priority TEXT NOT NULL CHECK (priority IN ('Low', 'Medium', 'High')),
      status TEXT NOT NULL CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Closed')) DEFAULT 'Open',
      created_by INTEGER NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      timestamp_origin TEXT NOT NULL CHECK (timestamp_origin IN ('sample', 'system'))
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY,
      ticket_id INTEGER NOT NULL REFERENCES tickets(id),
      author_id INTEGER NOT NULL REFERENCES users(id),
      body TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  return db;
}

function databasePath() {
  return process.env.DATABASE_PATH || path.join(__dirname, '../data/support.db');
}

module.exports = { openDatabase, databasePath };
