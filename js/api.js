/**
 * ============================================
 * Plan4U — api.js
 * Frontend API client for backend communication.
 * Falls back to localStorage if backend is unreachable.
 * ============================================
 */

const API_BASE = '/api';
let _backendAvailable = null; // null = unknown, true/false after first check

/* ── Core HTTP helpers ── */
const apiGet = async (endpoint) => {
    try {
        const res = await fetch(`${API_BASE}${endpoint}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        _backendAvailable = true;
        return await res.json();
    } catch (e) {
        _backendAvailable = false;
        return null;
    }
};

const apiPost = async (endpoint, body) => {
    try {
        const res = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        _backendAvailable = true;
        return await res.json();
    } catch (e) {
        _backendAvailable = false;
        return null;
    }
};

const apiPut = async (endpoint, body) => {
    try {
        const res = await fetch(`${API_BASE}${endpoint}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        _backendAvailable = true;
        return await res.json();
    } catch (e) {
        _backendAvailable = false;
        return null;
    }
};

const apiDelete = async (endpoint) => {
    try {
        const res = await fetch(`${API_BASE}${endpoint}`, { method: 'DELETE' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        _backendAvailable = true;
        return await res.json();
    } catch (e) {
        _backendAvailable = false;
        return null;
    }
};

/* ── Check if backend is available ── */
const isBackendAvailable = () => _backendAvailable === true;

/* ── Sync helpers: write-through to both backend + localStorage ── */

/**
 * Load data: try backend first, fallback to localStorage.
 * Also writes backend data into localStorage as cache.
 */
const loadData = async (key, endpoint, fallback = null) => {
    const apiData = await apiGet(endpoint);
    if (apiData !== null) {
        // Cache in localStorage for instant access next time
        localStorage.setItem(key, JSON.stringify(apiData));
        return apiData;
    }
    // Fallback to localStorage
    try {
        const val = localStorage.getItem(key);
        return val !== null ? JSON.parse(val) : fallback;
    } catch {
        return fallback;
    }
};

/**
 * Save data: write to both backend and localStorage.
 */
const syncSave = async (key, endpoint, data, method = 'PUT') => {
    // Always save to localStorage immediately for instant UI
    localStorage.setItem(key, JSON.stringify(data));
    // Then sync to backend
    if (method === 'PUT') {
        await apiPut(endpoint, data);
    } else {
        await apiPost(endpoint, data);
    }
};

/* ── High-level data operations ── */

// Progress (XP, level, streak, etc.)
const loadProgress = () => loadData('_plan4u_progress', '/progress', { xp: 0, level: 1, streak: 0, last_active: '', schedules_generated: 0, total_study_hours: 0 });
const saveProgress = (fields) => apiPut('/progress', fields);

// Tasks
const loadTasks = () => loadData(KEYS.TASKS, '/tasks', []);
const saveTaskToApi = (task) => apiPost('/tasks', task);
const updateTaskInApi = (id, task) => apiPut(`/tasks/${id}`, task);
const deleteTaskFromApi = (id) => apiDelete(`/tasks/${id}`);

// Sessions
const loadSessions = () => loadData(KEYS.SESSIONS, '/sessions', []);
const saveSessionToApi = (session) => apiPost('/sessions', session);

// Badges
const loadBadges = () => loadData(KEYS.BADGES, '/badges', []);
const saveBadgeToApi = (badge) => apiPost('/badges', badge);

// Subjects
const loadSubjects = () => loadData(KEYS.SUBJECTS, '/subjects', []);
const saveSubjectsToApi = (subjects) => apiPut('/subjects', subjects);

// Schedule
const loadSchedule = () => loadData(KEYS.SCHEDULE, '/schedule', []);
const saveScheduleToApi = (schedule) => apiPut('/schedule', schedule);

// Courses
const loadCourses = () => loadData('studyquest_courses', '/courses', []);
const saveCoursesToApi = (courses) => apiPut('/courses', courses);

// Timer widget
const loadTimerState = () => loadData('studyquest_timer_widget', '/timer', {});
const saveTimerStateToApi = (state) => apiPut('/timer', state);

/* ── Initial backend availability check ── */
const checkBackend = async () => {
    await apiGet('/progress');
    if (_backendAvailable) {
        console.log('✅ Plan4U backend connected');
    } else {
        console.log('⚠️ Backend not available — using localStorage only');
    }
};

// Run check when script loads
checkBackend();
