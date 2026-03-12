/**
 * ============================================
 * StudyQuest — app.js
 * Global state management, localStorage helpers,
 * sidebar logic, header rendering, toast system,
 * daily login check, and shared utilities.
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

/* ── Data Helpers ── */
// Get data from localStorage, returns parsed JSON or fallback
const getData = (key, fallback = null) => {
    try {
        const val = localStorage.getItem(key);
        return val !== null ? JSON.parse(val) : fallback;
    } catch {
        return fallback;
    }
};

// Save data to localStorage as JSON string
const saveData = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
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

// Get today's date as YYYY-MM-DD string
const getToday = () => new Date().toISOString().split('T')[0];

// Check if a date string is today
const isToday = (dateStr) => dateStr === getToday();

// Check if a date is in the past
const isPast = (dateStr) => new Date(dateStr) < new Date(getToday());

// Get days until a date
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

// Assign a color to a subject based on index
const getSubjectColor = (index) => SUBJECT_COLORS[index % SUBJECT_COLORS.length];

/* ── Toast Notification System ── */
const showToast = (message, type = 'info') => {
    const container = document.getElementById('toast-container');
    if (!container) return;

    // Create toast element with type-based styling
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);

    // Auto-dismiss after 3 seconds with slide-out animation
    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

/* ── Daily Login & Streak Check ── */
const checkDailyLogin = () => {
    const today = getToday();
    const lastActive = getData(KEYS.LAST_ACTIVE, null);

    if (lastActive === today) return; // Already logged in today

    // Calculate streak
    let streak = getData(KEYS.STREAK, 0);
    if (lastActive) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (lastActive === yesterdayStr) {
            // Consecutive day — increment streak
            streak += 1;
            saveData(KEYS.STREAK, streak);
        } else {
            // Streak broken — reset to 1 (today counts)
            streak = 1;
            saveData(KEYS.STREAK, streak);
        }
    } else {
        // First time user
        streak = 1;
        saveData(KEYS.STREAK, streak);
    }

    // Mark today as active
    saveData(KEYS.LAST_ACTIVE, today);

    // Award daily login XP (+10) and streak XP (+15)
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

    // Calculate XP progress percentage within current level
    const levelXP = xp - prevThreshold;
    const levelRange = nextThreshold - prevThreshold;
    const percent = Math.min((levelXP / levelRange) * 100, 100);

    // Update XP bar
    const xpFill = document.getElementById('xp-bar-fill');
    const xpLabel = document.getElementById('xp-label');
    if (xpFill) xpFill.style.width = `${percent}%`;
    if (xpLabel) xpLabel.textContent = `${xp} / ${nextThreshold} XP`;

    // Update streak badge
    const streakEl = document.getElementById('streak-badge');
    if (streakEl) {
        streakEl.textContent = `🔥 ${streak} day${streak !== 1 ? 's' : ''}`;
        // Add pulse animation when streak ≥ 3
        streakEl.classList.toggle('active-streak', streak >= 3);
    }

    // Update level badge
    const levelEl = document.getElementById('level-badge');
    if (levelEl) {
        levelEl.textContent = `Lv.${level} ${levelInfo.name}`;
    }
};

/* ── Sidebar Active State ── */
const initSidebar = () => {
    // Determine current page from URL
    const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
        const href = item.getAttribute('data-page');
        if (href && currentPage.includes(href.replace('.html', ''))) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }

        // Click handler to navigate
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

        // Close sidebar on outside click
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
    checkDailyLogin();
    renderHeader();
    initSidebar();
    initMobileMenu();

    // Set greeting only on dashboard page (other pages have their own titles)
    const headerTitle = document.getElementById('header-title');
    const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
    if (headerTitle && (currentPage === 'dashboard.html' || currentPage === '' || currentPage === '/')) {
        headerTitle.textContent = `${getGreeting()}, Scholar! 🌤️`;
    }
};

// Run initialization when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);
