# Plan4U

Plan4U is a multi-page, gamified study planner built with HTML, CSS, vanilla JavaScript, and a Node.js + SQLite backend.
It helps students plan syllabus topics, manage tasks, run Pomodoro sessions, and track learning progress with analytics, XP-based progression, and Duolingo-style guilt-trip notifications.

## Table of Contents

1. [Overview](#overview)
2. [Key Features](#key-features)
3. [Pages and User Flow](#pages-and-user-flow)
4. [Project Structure](#project-structure)
5. [Tech Stack](#tech-stack)
6. [Backend API](#backend-api)
7. [Data Model](#data-model)
8. [JavaScript Module Responsibilities](#javascript-module-responsibilities)
9. [How to Run Locally](#how-to-run-locally)
10. [Gamification Rules](#gamification-rules)
11. [Notification System](#notification-system)
12. [Known Limitations](#known-limitations)
13. [Contributing](#contributing)
14. [License](#license)

## Overview

Plan4U is designed as a full-stack study planner that works with or without the backend.
When the **Node.js + SQLite backend** is running, all data is persisted server-side in a database file.
When running without the backend (static hosting), the app gracefully falls back to browser `localStorage`.

The app includes:

- A landing page (`index.html`)
- A dashboard (`dashboard.html`)
- An AI-style planner workflow (`planner.html`)
- A task manager with proof-based completion (`tasks.html`)
- An analytics and Pomodoro page (`analytics.html`)

## Key Features

- AI-style syllabus parsing (local heuristic parser, no external LLM call)
- 3-step planner wizard: Upload -> Review -> Generate
- Multi-course schedule generation with intensity modes
- Task management with priority, due dates, filters, and edit/delete
- Task verification flow using URL or media proof before full XP rewards
- XP, level system, streaks, badges, and level-up overlays
- Dashboard cards for daily study progress and motivation
- Analytics charts powered by Chart.js
- Pomodoro timer (main analytics timer + global floating widget)
- Confetti celebration animations for milestone moments
- Responsive navigation with sidebar and mobile bottom tab bar
- **Backend database** (Node.js + Express + SQLite) with REST API
- **Duolingo-style guilt-trip notifications** with escalating severity

## Pages and User Flow

### 1) Landing (`index.html`)

- Product intro and CTA to open the app (`dashboard.html`)
- Animated hero, feature highlights, and stats counter

### 2) Dashboard (`dashboard.html`)

- Shows daily stats:
  - Study hours today
  - Tasks completed today
  - Current streak
  - Total XP
- Displays today's generated schedule snapshot
- Shows badges and next badge indicator
- Provides motivational quotes and quick-action shortcuts

### 3) Planner (`planner.html`)

- Step 1: Upload syllabus file or paste text
- Step 2: Review parsed output (course name, exam date, topics, difficulty, hours)
- Step 3: Generate and view schedule (weekly and daily views)
- Supports marking slots as done/skipped and shows topic completion tracking

### 4) Tasks (`tasks.html`)

- Create, edit, delete, and filter tasks
- Complete task flow opens verification modal:
  - URL proof (valid URL required)
  - Media upload proof (file type and size checks)
  - Optional skip verification with reduced XP reward

### 5) Analytics (`analytics.html`)

- Summary cards for total hours, completed tasks, streak, and XP
- Charts:
  - Weekly study hours
  - Tasks by subject
  - Streak trend
  - Tasks completed per day
- Pomodoro focus/break timer with session history

## Project Structure

```text
Plan4U/
    README.md
    package.json
    server.js
    db/
        database.js
        routes.js
        plan4u.db          (auto-created on first run)
    analytics.html
    dashboard.html
    index.html
    planner.html
    tasks.html
    css/
        animations.css
        components.css
        style.css
    js/
        api.js
        analytics.js
        app.js
        confetti.js
        gamification.js
        notifications.js
        planner.js
        pomodoro.js
        tasks.js
        timer-widget.js
```

## Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6)
- **Backend**: Node.js, Express.js
- **Database**: SQLite via `better-sqlite3`
- **Charts**: Chart.js (CDN)
- **PDF Parsing**: pdf.js (CDN)
- **Data Fallback**: Browser `localStorage` when backend is unavailable

## Backend API

The backend (Node.js + Express + SQLite) provides a REST API on port `3000`. All endpoints are under `/api`.

### Endpoints

| Method   | Route              | Description                     |
|----------|--------------------|---------------------------------|
| `GET`    | `/api/progress`    | Get XP, level, streak, etc.     |
| `PUT`    | `/api/progress`    | Update progress fields          |
| `GET`    | `/api/tasks`       | List all tasks                  |
| `POST`   | `/api/tasks`       | Create a task                   |
| `PUT`    | `/api/tasks/:id`   | Update a task                   |
| `DELETE` | `/api/tasks/:id`   | Delete a task                   |
| `GET`    | `/api/sessions`    | List Pomodoro sessions          |
| `POST`   | `/api/sessions`    | Record a session                |
| `GET`    | `/api/badges`      | List all badges                 |
| `POST`   | `/api/badges`      | Add/update a badge              |
| `GET`    | `/api/subjects`    | List subjects                   |
| `PUT`    | `/api/subjects`    | Replace all subjects            |
| `GET`    | `/api/schedule`    | Get generated schedule          |
| `PUT`    | `/api/schedule`    | Save generated schedule         |
| `GET`    | `/api/courses`     | Get saved courses               |
| `PUT`    | `/api/courses`     | Save courses                    |
| `GET`    | `/api/timer`       | Get timer widget state          |
| `PUT`    | `/api/timer`       | Save timer widget state         |

### Database Schema

The SQLite database (`db/plan4u.db`) contains 8 tables:

| Table          | Purpose                                    |
|----------------|--------------------------------------------|
| `progress`     | XP, level, streak, study hours (single row) |
| `tasks`        | Task CRUD with proof/verification fields    |
| `sessions`     | Pomodoro session history                    |
| `badges`       | Earned badge records                        |
| `subjects`     | Course subjects with colors/difficulty      |
| `schedule`     | Generated study schedule (JSON slots)       |
| `courses`      | Parsed course data from planner             |
| `timer_widget` | Floating timer widget state                 |

## Data Model

The frontend uses `localStorage` keys as a write-through cache. When the backend is running, data is synced to SQLite; otherwise, `localStorage` is the sole data store.

### localStorage keys (defined in `js/app.js`)

- `studyquest_xp`, `studyquest_level`, `studyquest_streak`
- `studyquest_tasks`, `studyquest_subjects`, `studyquest_schedule`
- `studyquest_sessions`, `studyquest_badges`
- `studyquest_last_active`, `studyquest_schedules_generated`
- `studyquest_total_study_hours`, `studyquest_courses`
- `studyquest_timer_widget`

### Example data shapes

Task object:

```json
{
  "id": "abc123",
  "name": "Review Chapter 5",
  "subject": "Mathematics",
  "dueDate": "2026-03-20",
  "priority": "High",
  "completed": false,
  "completedAt": null,
  "notes": "Focus on integrals",
  "proof": null
}
```

Pomodoro session object:

```json
{
  "date": "2026-03-12",
  "type": "focus",
  "duration": 25,
  "completedAt": "2026-03-12T10:15:00.000Z"
}
```

## JavaScript Module Responsibilities

| Module | Responsibility |
|--------|---------------|
| `js/api.js` | Frontend API client with `localStorage` fallback; provides `loadTasks()`, `saveTaskToApi()`, etc. |
| `js/app.js` | Shared utilities, storage helpers, sidebar, header, toast system, daily login, backend hydration |
| `js/gamification.js` | XP awards, level calculation, level-up overlays, badge definitions |
| `js/notifications.js` | Duolingo-style guilt-trip push notifications and comeback splash modals |
| `js/planner.js` | Syllabus upload, AI parsing, course review, schedule generation |
| `js/tasks.js` | Task CRUD, filters, verification modal, proof handling |
| `js/analytics.js` | Analytics summary cards, Chart.js chart rendering |
| `js/pomodoro.js` | Pomodoro timer lifecycle, session recording, XP awards |
| `js/timer-widget.js` | Floating global timer widget, draggable, persistent state |
| `js/confetti.js` | Canvas-based confetti effects for celebrations |

## How to Run Locally

### Option A: With Backend (recommended)

```bash
npm install
npm start
```

Then visit: `http://localhost:3000`

The server serves all static files and the API. The SQLite database (`db/plan4u.db`) is created automatically on first run.

### Option B: Static only (no backend)

```bash
python -m http.server 5500
```

Then visit: `http://localhost:5500`

The app works fully with `localStorage` — the backend API calls will gracefully fail and fall back to local storage.

### Option C: VS Code Live Server

Open the project in VS Code and use the Live Server extension.

## Gamification Rules

| Action | XP Reward |
|--------|-----------|
| Daily login bonus | +10 XP |
| Streak maintain (consecutive day) | +15 XP |
| Planner schedule generation | +30 XP |
| Planner study block completion | +20 XP |
| Task completion with URL proof | +100 XP |
| Task completion with media proof | +150 XP |
| Task completion (skipped verification) | +25 XP |
| Pomodoro focus session completion | +25 XP |
| Floating widget break completion | +5 XP |

### Level Thresholds

| Level | XP Required | Title |
|-------|-------------|-------|
| Lv1 | 0 | Beginner |
| Lv2 | 200 | Student |
| Lv3 | 500 | Learner |
| Lv4 | 1000 | Scholar |
| Lv5 | 2000 | Expert |
| Lv6 | 4000 | Master |
| Lv7 | 8000 | Legend |

## Notification System

Plan4U features a Duolingo-inspired guilt-trip notification system that escalates based on how long the user has been away.

### Browser Push Notifications

When the user leaves the site, push notifications fire at escalating intervals:

| Severity | Triggers After | Example Message |
|----------|---------------|-----------------|
| 🟢 Gentle | 1 hour | *"It's okay if not, but I'd like it if you did."* |
| 🟡 Moderate | 4 hours | *"Don't let this streak become a not-streak."* |
| 🔴 Aggressive | 12 hours | *"Don't make me come over there."* |
| 💀 Nuclear | 24+ hours | *"Time to do your lesson or I'll tell your mom you're not studying."* |

### Comeback Splash Modal

When the user returns after being away 1+ hours, a full-screen modal appears with:

- Context-aware guilt-trip title and message (escalating severity)
- Stats bar showing hours away, current streak, and pending tasks
- CTA button to start studying
- "Maybe later" dismiss button that responds with snarky messages

### Testing Notifications

To test the comeback splash without waiting, run in browser console:

```js
localStorage.setItem('plan4u_last_visit', (Date.now() - 5 * 60 * 60 * 1000).toString());
localStorage.removeItem('plan4u_comeback_shown_date');
location.reload();
```

## Known Limitations

- SQLite database is local to the server machine (not cloud-hosted)
- Data does not sync across devices unless backend is deployed
- Clearing browser `localStorage` only resets the local cache (database retains data)
- Syllabus "AI" parsing is heuristic/local and may require manual corrections
- Browser notification behavior depends on user permissions and browser policy
- Chart.js depends on CDN availability in `analytics.html`
- Push notifications only work while the browser tab is open (no service worker)

## Contributing

1. Fork the repository.
2. Create a feature branch.
3. Commit your changes with clear messages.
4. Open a pull request describing:
   - Problem
   - Approach
   - Validation steps

## License

No explicit license file is currently present in the repository.
Add a `LICENSE` file (for example MIT) if you want to define reuse permissions clearly.
