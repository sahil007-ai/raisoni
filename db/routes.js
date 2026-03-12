/**
 * ============================================
 * Plan4U — routes.js
 * Express API routes for all data operations.
 * ============================================
 */

const express = require('express');
const router = express.Router();
const { getDb } = require('./database');

/* ══════════════════════════════════════════════
   PROGRESS (XP, Level, Streak, etc.)
   ══════════════════════════════════════════════ */

router.get('/progress', (req, res) => {
    const db = getDb();
    const row = db.prepare('SELECT * FROM progress WHERE id = 1').get();
    res.json(row || { xp: 0, level: 1, streak: 0, last_active: '', schedules_generated: 0, total_study_hours: 0 });
});

router.put('/progress', (req, res) => {
    const db = getDb();
    const fields = req.body;
    const allowed = ['xp', 'level', 'streak', 'last_active', 'schedules_generated', 'total_study_hours'];
    const updates = [];
    const values = [];

    for (const key of allowed) {
        if (fields[key] !== undefined) {
            updates.push(`${key} = ?`);
            values.push(fields[key]);
        }
    }

    if (updates.length === 0) return res.status(400).json({ error: 'No valid fields provided' });

    values.push(1); // WHERE id = 1
    db.prepare(`UPDATE progress SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    const row = db.prepare('SELECT * FROM progress WHERE id = 1').get();
    res.json(row);
});

/* ══════════════════════════════════════════════
   TASKS
   ══════════════════════════════════════════════ */

router.get('/tasks', (req, res) => {
    const db = getDb();
    const tasks = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all();
    // Convert to frontend format
    const result = tasks.map(t => ({
        id: t.id,
        name: t.name,
        subject: t.subject,
        dueDate: t.due_date,
        priority: t.priority,
        completed: !!t.completed,
        completedAt: t.completed_at || null,
        notes: t.notes,
        proof: t.proof_type ? {
            type: t.proof_type,
            value: t.proof_value,
            reflection: t.proof_reflection || null,
            verifiedAt: t.proof_verified_at || null
        } : null
    }));
    res.json(result);
});

router.post('/tasks', (req, res) => {
    const db = getDb();
    const { id, name, subject, dueDate, priority, completed, completedAt, notes, proof } = req.body;

    const taskId = id || (Date.now().toString(36) + Math.random().toString(36).substr(2, 5));

    db.prepare(`
        INSERT INTO tasks (id, name, subject, due_date, priority, completed, completed_at, notes,
                          proof_type, proof_value, proof_reflection, proof_verified_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        taskId,
        name || '',
        subject || '',
        dueDate || '',
        priority || 'Medium',
        completed ? 1 : 0,
        completedAt || '',
        notes || '',
        proof?.type || '',
        proof?.value || '',
        proof?.reflection || '',
        proof?.verifiedAt || ''
    );

    res.json({ id: taskId, name, subject, dueDate, priority, completed: !!completed, completedAt, notes, proof });
});

router.put('/tasks/:id', (req, res) => {
    const db = getDb();
    const { name, subject, dueDate, priority, completed, completedAt, notes, proof } = req.body;

    db.prepare(`
        UPDATE tasks SET name = ?, subject = ?, due_date = ?, priority = ?,
                        completed = ?, completed_at = ?, notes = ?,
                        proof_type = ?, proof_value = ?, proof_reflection = ?, proof_verified_at = ?
        WHERE id = ?
    `).run(
        name || '',
        subject || '',
        dueDate || '',
        priority || 'Medium',
        completed ? 1 : 0,
        completedAt || '',
        notes || '',
        proof?.type || '',
        proof?.value || '',
        proof?.reflection || '',
        proof?.verifiedAt || '',
        req.params.id
    );

    res.json({ id: req.params.id, name, subject, dueDate, priority, completed: !!completed, completedAt, notes, proof });
});

router.delete('/tasks/:id', (req, res) => {
    const db = getDb();
    db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

/* ══════════════════════════════════════════════
   SESSIONS (Pomodoro)
   ══════════════════════════════════════════════ */

router.get('/sessions', (req, res) => {
    const db = getDb();
    const sessions = db.prepare('SELECT * FROM sessions ORDER BY id DESC').all();
    const result = sessions.map(s => ({
        date: s.date,
        type: s.type,
        duration: s.duration,
        completedAt: s.completed_at
    }));
    res.json(result);
});

router.post('/sessions', (req, res) => {
    const db = getDb();
    const { date, type, duration, completedAt } = req.body;

    const info = db.prepare(`
        INSERT INTO sessions (date, type, duration, completed_at)
        VALUES (?, ?, ?, ?)
    `).run(date || '', type || 'focus', duration || 25, completedAt || '');

    res.json({ id: info.lastInsertRowid, date, type, duration, completedAt });
});

/* ══════════════════════════════════════════════
   BADGES
   ══════════════════════════════════════════════ */

router.get('/badges', (req, res) => {
    const db = getDb();
    const badges = db.prepare('SELECT * FROM badges').all();
    const result = badges.map(b => ({
        id: b.id,
        name: b.name,
        icon: b.icon,
        earned: !!b.earned,
        earnedAt: b.earned_at
    }));
    res.json(result);
});

router.post('/badges', (req, res) => {
    const db = getDb();
    const { id, name, icon, earned, earnedAt } = req.body;

    db.prepare(`
        INSERT OR REPLACE INTO badges (id, name, icon, earned, earned_at)
        VALUES (?, ?, ?, ?, ?)
    `).run(id, name || '', icon || '', earned ? 1 : 0, earnedAt || '');

    res.json({ id, name, icon, earned: !!earned, earnedAt });
});

/* ══════════════════════════════════════════════
   SUBJECTS
   ══════════════════════════════════════════════ */

router.get('/subjects', (req, res) => {
    const db = getDb();
    const subjects = db.prepare('SELECT * FROM subjects').all();
    const result = subjects.map(s => ({
        id: s.id,
        name: s.name,
        examDate: s.exam_date,
        difficulty: s.difficulty,
        color: s.color,
        hoursPerDay: s.hours_per_day
    }));
    res.json(result);
});

router.put('/subjects', (req, res) => {
    const db = getDb();
    const subjects = req.body; // array of subjects

    const deleteAll = db.prepare('DELETE FROM subjects');
    const insert = db.prepare(`
        INSERT INTO subjects (id, name, exam_date, difficulty, color, hours_per_day)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    const replaceAll = db.transaction((items) => {
        deleteAll.run();
        for (const s of items) {
            insert.run(s.id || '', s.name || '', s.examDate || '', s.difficulty || 'Medium', s.color || '#4F8EF7', s.hoursPerDay || 4);
        }
    });

    replaceAll(Array.isArray(subjects) ? subjects : []);
    res.json({ success: true });
});

/* ══════════════════════════════════════════════
   SCHEDULE
   ══════════════════════════════════════════════ */

router.get('/schedule', (req, res) => {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM schedule ORDER BY date ASC').all();
    const result = rows.map(r => ({
        date: r.date,
        slots: JSON.parse(r.slots_json || '[]')
    }));
    res.json(result);
});

router.put('/schedule', (req, res) => {
    const db = getDb();
    const schedule = req.body; // array of { date, slots }

    const deleteAll = db.prepare('DELETE FROM schedule');
    const insert = db.prepare('INSERT INTO schedule (date, slots_json) VALUES (?, ?)');

    const replaceAll = db.transaction((items) => {
        deleteAll.run();
        for (const day of items) {
            insert.run(day.date || '', JSON.stringify(day.slots || []));
        }
    });

    replaceAll(Array.isArray(schedule) ? schedule : []);
    res.json({ success: true });
});

/* ══════════════════════════════════════════════
   COURSES
   ══════════════════════════════════════════════ */

router.get('/courses', (req, res) => {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM courses').all();
    const result = rows.map(r => JSON.parse(r.course_data_json || '{}'));
    res.json(result);
});

router.put('/courses', (req, res) => {
    const db = getDb();
    const courses = req.body; // array of course objects

    const deleteAll = db.prepare('DELETE FROM courses');
    const insert = db.prepare('INSERT INTO courses (id, course_data_json) VALUES (?, ?)');

    const replaceAll = db.transaction((items) => {
        deleteAll.run();
        for (const c of items) {
            insert.run(c.courseId || c.id || '', JSON.stringify(c));
        }
    });

    replaceAll(Array.isArray(courses) ? courses : []);
    res.json({ success: true });
});

/* ══════════════════════════════════════════════
   TIMER WIDGET STATE
   ══════════════════════════════════════════════ */

router.get('/timer', (req, res) => {
    const db = getDb();
    const row = db.prepare('SELECT state_json FROM timer_widget WHERE id = 1').get();
    res.json(JSON.parse(row?.state_json || '{}'));
});

router.put('/timer', (req, res) => {
    const db = getDb();
    db.prepare('UPDATE timer_widget SET state_json = ? WHERE id = 1').run(JSON.stringify(req.body));
    res.json({ success: true });
});

module.exports = router;
