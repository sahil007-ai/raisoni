/**
 * ============================================
 * Plan4U — app.js
 * Global state management, localStorage helpers,
 * sidebar logic, header rendering, toast system,
 * daily login check, and shared utilities.
 * Now with backend API sync support.
 * ============================================
 */

/* ── localStorage Keys ── */
const KEYS = {
    XP: 'studyquest_xp',
    LEVEL: 'studyquest_level',
    STREAK: 'studyquest_streak',
    TASKS: 'studyquest_tasks',
    SUBJECTS: 'studyquest_subjects',
    SCHEDULE: 'studyquest_schedule',
    SESSIONS: 'studyquest_sessions',
    BADGES: 'studyquest_badges',
    LAST_ACTIVE: 'studyquest_last_active',
    SCHEDULES_GENERATED: 'studyquest_schedules_generated',
    TOTAL_STUDY_HOURS: 'studyquest_total_study_hours'
};

/* ── Data Helpers (localStorage — instant, synchronous) ── */
const getData = (key, fallback = null) => {
    try {
        const val = localStorage.getItem(key);
        return val !== null ? JSON.parse(val) : fallback;
    } catch {
        return fallback;
    }
};

const saveData = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
};

/* ── Backend Sync Helpers ── */
// Sync progress fields to backend (fire-and-forget)
const syncProgressToBackend = (fields) => {
    if (typeof saveProgress === 'function') {
        saveProgress(fields);
    }
};

// Save all current progress state to backend
const syncAllProgress = () => {
    syncProgressToBackend({
        xp: getData(KEYS.XP, 0),
        level: getData(KEYS.LEVEL, 1),
        streak: getData(KEYS.STREAK, 0),
        last_active: getData(KEYS.LAST_ACTIVE, ''),
        schedules_generated: getData(KEYS.SCHEDULES_GENERATED, 0),
        total_study_hours: getData(KEYS.TOTAL_STUDY_HOURS, 0)
    });
};

// Load data from backend into localStorage on startup
const hydrateFromBackend = async () => {
    if (typeof loadProgress !== 'function') return;

    try {
        // Load progress
        const progress = await loadProgress();
        if (progress) {
            if (progress.xp !== undefined) saveData(KEYS.XP, progress.xp);
            if (progress.level !== undefined) saveData(KEYS.LEVEL, progress.level);
            if (progress.streak !== undefined) saveData(KEYS.STREAK, progress.streak);
            if (progress.last_active !== undefined) saveData(KEYS.LAST_ACTIVE, progress.last_active);
            if (progress.schedules_generated !== undefined) saveData(KEYS.SCHEDULES_GENERATED, progress.schedules_generated);
            if (progress.total_study_hours !== undefined) saveData(KEYS.TOTAL_STUDY_HOURS, progress.total_study_hours);
        }

        // Load tasks
        const tasks = await loadTasks();
        if (tasks && Array.isArray(tasks)) saveData(KEYS.TASKS, tasks);

        // Load sessions
        const sessions = await loadSessions();
        if (sessions && Array.isArray(sessions)) saveData(KEYS.SESSIONS, sessions);

        // Load badges
        const badges = await loadBadges();
        if (badges && Array.isArray(badges)) saveData(KEYS.BADGES, badges);

        // Load subjects
        const subjects = await loadSubjects();
        if (subjects && Array.isArray(subjects)) saveData(KEYS.SUBJECTS, subjects);

        // Load schedule
        const schedule = await loadSchedule();
        if (schedule && Array.isArray(schedule)) saveData(KEYS.SCHEDULE, schedule);

        // Load courses
        const courses = await loadCourses();
        if (courses && Array.isArray(courses)) saveData('studyquest_courses', courses);

        // Re-render header after hydration
        renderHeader();
    } catch (e) {
        console.log('Backend hydration skipped:', e.message);
    }
};

/* ── Date Utilities ── */
const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatTime = (hours, minutes) => {
    const h = hours % 12 || 12;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    return `${h}:${String(minutes).padStart(2, '0')} ${ampm}`;
};

const getToday = () => new Date().toISOString().split('T')[0];
const isToday = (dateStr) => dateStr === getToday();
const isPast = (dateStr) => new Date(dateStr) < new Date(getToday());

const daysUntil = (dateStr) => {
    const diff = new Date(dateStr) - new Date(getToday());
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

/* ── Unique ID Generator ── */
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

/* ── Subject Color Palette ── */
const SUBJECT_COLORS = [
    '#4F8EF7', '#3ECF8E', '#FFD166', '#A78BFA',
    '#F87171', '#FB923C', '#F472B6', '#34D399',
    '#60A5FA', '#FBBF24', '#C084FC', '#38BDF8'
];

const getSubjectColor = (index) => SUBJECT_COLORS[index % SUBJECT_COLORS.length];

/* ── Toast Notification System ── */
const showToast = (message, type = 'info') => {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

/* ── Daily Login & Streak Check ── */
const checkDailyLogin = () => {
    const today = getToday();
    const lastActive = getData(KEYS.LAST_ACTIVE, null);

    if (lastActive === today) return;

    let streak = getData(KEYS.STREAK, 0);
    if (lastActive) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (lastActive === yesterdayStr) {
            streak += 1;
            saveData(KEYS.STREAK, streak);
        } else {
            streak = 1;
            saveData(KEYS.STREAK, streak);
        }
    } else {
        streak = 1;
        saveData(KEYS.STREAK, streak);
    }

    saveData(KEYS.LAST_ACTIVE, today);

    // Sync to backend
    syncProgressToBackend({ streak, last_active: today });

    if (typeof awardXP === 'function') {
        awardXP(10, 'Daily login bonus! 🌟');
        if (streak > 1) {
            awardXP(15, `Streak maintained! Day ${streak} 🔥`);
        }
    }
};

/* ── Header Rendering ── */
const renderHeader = () => {
    const xp = getData(KEYS.XP, 0);
    const level = getData(KEYS.LEVEL, 1);
    const streak = getData(KEYS.STREAK, 0);
    const levelInfo = typeof getLevelInfo === 'function' ? getLevelInfo(level) : { name: 'Beginner', nextXP: 200 };
    const prevThreshold = typeof getLevelThreshold === 'function' ? getLevelThreshold(level) : 0;
    const nextThreshold = typeof getLevelThreshold === 'function' ? getLevelThreshold(level + 1) : 200;

    const levelXP = xp - prevThreshold;
    const levelRange = nextThreshold - prevThreshold;
    const percent = Math.min((levelXP / levelRange) * 100, 100);

    const xpFill = document.getElementById('xp-bar-fill');
    const xpLabel = document.getElementById('xp-label');
    if (xpFill) xpFill.style.width = `${percent}%`;
    if (xpLabel) xpLabel.textContent = `${xp} / ${nextThreshold} XP`;

    const streakEl = document.getElementById('streak-badge');
    if (streakEl) {
        streakEl.textContent = `🔥 ${streak} day${streak !== 1 ? 's' : ''}`;
        streakEl.classList.toggle('active-streak', streak >= 3);
    }

    const levelEl = document.getElementById('level-badge');
    if (levelEl) {
        levelEl.textContent = `Lv.${level} ${levelInfo.name}`;
    }
};

/* ── Sidebar Active State ── */
const initSidebar = () => {
    const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
        const href = item.getAttribute('data-page');
        if (href && currentPage.includes(href.replace('.html', ''))) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }

        item.addEventListener('click', () => {
            const page = item.getAttribute('data-page');
            if (page) window.location.href = page;
        });
    });
};

/* ── Mobile Menu Toggle ── */
const initMobileMenu = () => {
    const toggleBtn = document.getElementById('mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');

    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('mobile-open');
        });

        document.addEventListener('click', (e) => {
            if (sidebar.classList.contains('mobile-open') &&
                !sidebar.contains(e.target) &&
                !toggleBtn.contains(e.target)) {
                sidebar.classList.remove('mobile-open');
            }
        });
    }
};

/* ── Greeting Based on Time ── */
const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
};

/* ── Initialize Common Elements ── */
const initApp = () => {
    // Hydrate from backend first, then run login check
    hydrateFromBackend().then(() => {
        checkDailyLogin();
        renderHeader();
    });

    renderHeader(); // Render immediately with localStorage data
    initSidebar();
    initMobileMenu();

    const headerTitle = document.getElementById('header-title');
    const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
    if (headerTitle && (currentPage === 'dashboard.html' || currentPage === '' || currentPage === '/')) {
        headerTitle.textContent = `${getGreeting()}, Scholar! 🌤️`;
    }
};

// Run initialization when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);
