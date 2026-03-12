/**
 * ============================================
 * Plan4U — gamification.js
 * XP awarding, level system, streak management,
 * badge definitions, badge checking, and
 * level-up overlay display.
 * Now with backend API sync support.
 * ============================================
 */

/* ── Level Thresholds ── */
const LEVEL_THRESHOLDS = [0, 200, 500, 1000, 2000, 4000, 8000];

const LEVEL_NAMES = {
    1: 'Beginner',
    2: 'Student',
    3: 'Learner',
    4: 'Scholar',
    5: 'Expert',
    6: 'Master',
    7: 'Legend'
};

const getLevelThreshold = (level) => {
    if (level <= 0) return 0;
    if (level > LEVEL_THRESHOLDS.length) return LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
    return LEVEL_THRESHOLDS[level - 1];
};

const getLevelInfo = (level) => ({
    name: LEVEL_NAMES[level] || 'Legend',
    threshold: getLevelThreshold(level),
    nextXP: getLevelThreshold(level + 1)
});

const calculateLevel = (xp) => {
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
        if (xp >= LEVEL_THRESHOLDS[i]) return i + 1;
    }
    return 1;
};

/* ── XP Award System ── */
const awardXP = (amount, reason = '') => {
    let xp = getData(KEYS.XP, 0);
    const oldLevel = calculateLevel(xp);

    xp += amount;
    saveData(KEYS.XP, xp);

    const newLevel = calculateLevel(xp);
    saveData(KEYS.LEVEL, newLevel);

    // Sync XP and level to backend
    syncProgressToBackend({ xp, level: newLevel });

    if (reason) {
        showToast(`+${amount} XP — ${reason}`, 'success');
    }

    if (newLevel > oldLevel) {
        showLevelUp(newLevel);
    }

    checkBadges();
    renderHeader();

    return xp;
};

/* ── Level Up Overlay ── */
const showLevelUp = (level) => {
    const info = getLevelInfo(level);
    const overlay = document.getElementById('levelup-overlay');
    if (!overlay) return;

    overlay.querySelector('.levelup-emoji').textContent = '🎉';
    overlay.querySelector('.levelup-title').textContent = 'Level Up!';
    overlay.querySelector('.levelup-subtitle').textContent = `You're now a ${info.name}!`;

    overlay.classList.add('active');

    if (typeof fireConfetti === 'function') {
        fireConfetti(window.innerWidth / 2, window.innerHeight / 2);
    }

    setTimeout(() => {
        overlay.classList.remove('active');
    }, 2500);
};

/* ── Badge Definitions ── */
const BADGE_DEFS = [
    { id: 'streak3', name: 'On Fire', icon: '🔥', description: '3-day streak', check: () => getData(KEYS.STREAK, 0) >= 3 },
    { id: 'streak7', name: 'Consistent', icon: '📅', description: '7-day streak', check: () => getData(KEYS.STREAK, 0) >= 7 },
    { id: 'tasks10', name: 'Task Master', icon: '✅', description: '10 tasks completed', check: () => (getData(KEYS.TASKS, []).filter(t => t.completed).length >= 10) },
    { id: 'hours5', name: 'Dedicated', icon: '⏰', description: '5 study hours', check: () => getData(KEYS.TOTAL_STUDY_HOURS, 0) >= 5 },
    { id: 'week7', name: 'Week Warrior', icon: '🏆', description: 'Tasks 7 days in a row', check: () => getData(KEYS.STREAK, 0) >= 7 },
    { id: 'planner3', name: 'Planner Pro', icon: '🎯', description: '3 schedules generated', check: () => getData(KEYS.SCHEDULES_GENERATED, 0) >= 3 }
];

/* ── Check & Award Badges ── */
const checkBadges = () => {
    let badges = getData(KEYS.BADGES, []);

    BADGE_DEFS.forEach(def => {
        const existing = badges.find(b => b.id === def.id);

        if (!existing || !existing.earned) {
            if (def.check()) {
                const badgeData = {
                    id: def.id,
                    name: def.name,
                    icon: def.icon,
                    earned: true,
                    earnedAt: new Date().toISOString()
                };

                if (existing) {
                    Object.assign(existing, badgeData);
                } else {
                    badges.push(badgeData);
                }

                saveData(KEYS.BADGES, badges);

                // Sync badge to backend
                if (typeof saveBadgeToApi === 'function') {
                    saveBadgeToApi(badgeData);
                }

                showToast(`Badge Unlocked: ${def.icon} ${def.name}!`, 'success');
                if (typeof fireConfetti === 'function') {
                    setTimeout(() => fireConfetti(window.innerWidth / 2, 200), 300);
                }
            }
        }
    });
};

/* ── Render Badges Grid ── */
const renderBadges = (containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    const badges = getData(KEYS.BADGES, []);

    container.innerHTML = BADGE_DEFS.map(def => {
        const earned = badges.find(b => b.id === def.id && b.earned);
        return `
            <div class="badge-item ${earned ? 'earned' : 'locked'}" title="${def.description}">
                <span class="badge-icon">${def.icon}</span>
                <span class="badge-name">${def.name}</span>
            </div>
        `;
    }).join('');
};

/* ── Get Next Unearned Badge Progress ── */
const getNextBadgeProgress = () => {
    const badges = getData(KEYS.BADGES, []);
    const unearnedDef = BADGE_DEFS.find(def => !badges.find(b => b.id === def.id && b.earned));
    if (!unearnedDef) return { name: 'All badges earned!', percent: 100 };

    return { name: `${unearnedDef.icon} ${unearnedDef.name}`, description: unearnedDef.description };
};
