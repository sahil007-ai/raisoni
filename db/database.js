/**
 * ============================================
 * Plan4U — database.js
 * SQLite database initialization and helpers.
 * Uses better-sqlite3 for synchronous operations.
 * ============================================
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'plan4u.db');

let db;

const getDb = () => {
    if (!db) {
        db = new Database(DB_PATH);
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');
        initTables();
    }
    return db;
};

const initTables = () => {
    db.exec(`
        CREATE TABLE IF NOT EXISTS progress (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            xp INTEGER DEFAULT 0,
            level INTEGER DEFAULT 1,
            streak INTEGER DEFAULT 0,
            last_active TEXT DEFAULT '',
            schedules_generated INTEGER DEFAULT 0,
            total_study_hours REAL DEFAULT 0
        );

        INSERT OR IGNORE INTO progress (id) VALUES (1);

        CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            subject TEXT DEFAULT '',
            due_date TEXT DEFAULT '',
            priority TEXT DEFAULT 'Medium',
            completed INTEGER DEFAULT 0,
            completed_at TEXT DEFAULT '',
            notes TEXT DEFAULT '',
            proof_type TEXT DEFAULT '',
            proof_value TEXT DEFAULT '',
            proof_reflection TEXT DEFAULT '',
            proof_verified_at TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT 'focus',
            duration INTEGER DEFAULT 25,
            completed_at TEXT DEFAULT ''
        );

        CREATE TABLE IF NOT EXISTS badges (
            id TEXT PRIMARY KEY,
            name TEXT DEFAULT '',
            icon TEXT DEFAULT '',
            earned INTEGER DEFAULT 0,
            earned_at TEXT DEFAULT ''
        );

        CREATE TABLE IF NOT EXISTS subjects (
            id TEXT PRIMARY KEY,
            name TEXT DEFAULT '',
            exam_date TEXT DEFAULT '',
            difficulty TEXT DEFAULT 'Medium',
            color TEXT DEFAULT '#4F8EF7',
            hours_per_day INTEGER DEFAULT 4
        );

        CREATE TABLE IF NOT EXISTS schedule (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            slots_json TEXT DEFAULT '[]'
        );

        CREATE TABLE IF NOT EXISTS courses (
            id TEXT PRIMARY KEY,
            course_data_json TEXT DEFAULT '{}'
        );

        CREATE TABLE IF NOT EXISTS timer_widget (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            state_json TEXT DEFAULT '{}'
        );

        INSERT OR IGNORE INTO timer_widget (id) VALUES (1);
    `);
};

module.exports = { getDb };
