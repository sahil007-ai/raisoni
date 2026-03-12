/**
 * ============================================
 * StudyQuest — pomodoro.js
 * Pomodoro timer: 25-min focus / 5-min break,
 * circular progress display, start/pause/reset,
 * session counter, Web Audio API beep, XP award.
 * ============================================
 */

/* ── Timer State ── */
let pomodoroState = {
    running: false,
    paused: false,
    mode: 'focus',       // 'focus' or 'break'
    totalSeconds: 25 * 60,
    remainingSeconds: 25 * 60,
    intervalId: null,
    sessionsToday: 0
};

const FOCUS_DURATION = 25 * 60;  // 25 minutes in seconds
const BREAK_DURATION = 5 * 60;   // 5 minutes in seconds

/* ── Initialize Pomodoro ── */
const initPomodoro = () => {
    // Load today's session count from storage
    const sessions = getData(KEYS.SESSIONS, []);
    const today = getToday();
    pomodoroState.sessionsToday = sessions.filter(
        s => s.date === today && s.type === 'focus'
    ).length;

    renderPomodoro();
    renderSessionHistory();
    updateSidebarPomodoro();
};

/* ── Render Timer Display ── */
const renderPomodoro = () => {
    const timeEl = document.getElementById('pomodoro-time');
    const labelEl = document.getElementById('pomodoro-label');
    const progressEl = document.getElementById('timer-progress');
    const sessionDotsEl = document.getElementById('session-dots');

    if (!timeEl) return;

    // Format remaining time as MM:SS
    const mins = Math.floor(pomodoroState.remainingSeconds / 60);
    const secs = pomodoroState.remainingSeconds % 60;
    timeEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    // Update label based on mode
    if (labelEl) {
        labelEl.textContent = pomodoroState.mode === 'focus'
            ? '🍅 Focus Session (25 min)'
            : '☕ Break Time (5 min)';
    }

    // Update circular progress SVG
    if (progressEl) {
        const circumference = 2 * Math.PI * 100; // radius = 100
        const progress = pomodoroState.remainingSeconds / pomodoroState.totalSeconds;
        const offset = circumference * (1 - progress);
        progressEl.style.strokeDasharray = circumference;
        progressEl.style.strokeDashoffset = offset;

        // Change color based on mode
        progressEl.style.stroke = pomodoroState.mode === 'focus'
            ? 'var(--accent-blue)' : 'var(--accent-green)';
    }

    // Render session dots (tomato emojis)
    if (sessionDotsEl) {
        sessionDotsEl.innerHTML = pomodoroState.sessionsToday > 0
            ? '🍅'.repeat(pomodoroState.sessionsToday)
            : '<span style="color: var(--text-muted); font-size: 0.85rem">No sessions yet</span>';
    }
};

/* ── Start Timer ── */
const startPomodoro = () => {
    if (pomodoroState.running && !pomodoroState.paused) return;

    pomodoroState.running = true;
    pomodoroState.paused = false;

    // Countdown interval — ticks every second
    pomodoroState.intervalId = setInterval(() => {
        pomodoroState.remainingSeconds -= 1;

        if (pomodoroState.remainingSeconds <= 0) {
            completePomodoro();
        } else {
            renderPomodoro();
            updateSidebarPomodoro();
        }
    }, 1000);

    updatePomodoroButtons();
    showToast(pomodoroState.mode === 'focus' ? 'Focus session started! 🍅' : 'Break started! ☕', 'info');
};

/* ── Pause Timer ── */
const pausePomodoro = () => {
    if (!pomodoroState.running || pomodoroState.paused) return;

    pomodoroState.paused = true;
    clearInterval(pomodoroState.intervalId);
    updatePomodoroButtons();
};

/* ── Resume from Pause ── */
const resumePomodoro = () => {
    if (!pomodoroState.paused) return;
    startPomodoro();
};

/* ── Reset Timer ── */
const resetPomodoro = () => {
    clearInterval(pomodoroState.intervalId);
    pomodoroState.running = false;
    pomodoroState.paused = false;
    pomodoroState.mode = 'focus';
    pomodoroState.totalSeconds = FOCUS_DURATION;
    pomodoroState.remainingSeconds = FOCUS_DURATION;

    renderPomodoro();
    updatePomodoroButtons();
    updateSidebarPomodoro();
};

/* ── Complete Session ── */
const completePomodoro = () => {
    clearInterval(pomodoroState.intervalId);
    pomodoroState.running = false;
    pomodoroState.paused = false;

    // Play completion beep using Web Audio API
    playBeep();

    if (pomodoroState.mode === 'focus') {
        // Focus session completed — award XP
        pomodoroState.sessionsToday += 1;

        // Save session to storage
        const sessions = getData(KEYS.SESSIONS, []);
        sessions.push({
            date: getToday(),
            type: 'focus',
            duration: FOCUS_DURATION / 60,
            completedAt: new Date().toISOString()
        });
        saveData(KEYS.SESSIONS, sessions);

        // Update total study hours
        const totalHours = getData(KEYS.TOTAL_STUDY_HOURS, 0);
        saveData(KEYS.TOTAL_STUDY_HOURS, totalHours + (FOCUS_DURATION / 3600));

        // Award +25 XP
        awardXP(25, 'Pomodoro session complete! 🍅');

        // Switch to break mode
        pomodoroState.mode = 'break';
        pomodoroState.totalSeconds = BREAK_DURATION;
        pomodoroState.remainingSeconds = BREAK_DURATION;

        showToast('Focus session complete! Time for a break ☕', 'success');

        // Fire confetti
        if (typeof fireConfetti === 'function') {
            fireConfetti(window.innerWidth / 2, window.innerHeight / 2);
        }
    } else {
        // Break completed — switch back to focus
        pomodoroState.mode = 'focus';
        pomodoroState.totalSeconds = FOCUS_DURATION;
        pomodoroState.remainingSeconds = FOCUS_DURATION;

        showToast('Break over! Ready for another focus session? 🍅', 'info');
    }

    renderPomodoro();
    renderSessionHistory();
    updatePomodoroButtons();
    updateSidebarPomodoro();
};

/* ── Toggle Start/Pause ── */
const togglePomodoro = () => {
    if (!pomodoroState.running) {
        startPomodoro();
    } else if (pomodoroState.paused) {
        resumePomodoro();
    } else {
        pausePomodoro();
    }
};

/* ── Update Button States ── */
const updatePomodoroButtons = () => {
    const startBtn = document.getElementById('pomodoro-start');
    if (!startBtn) return;

    if (!pomodoroState.running) {
        startBtn.textContent = '▶️ Start';
    } else if (pomodoroState.paused) {
        startBtn.textContent = '▶️ Resume';
    } else {
        startBtn.textContent = '⏸️ Pause';
    }
};

/* ── Web Audio API Beep Sound ── */
const playBeep = () => {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        // Pleasant bell-like tone
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
        oscillator.frequency.setValueAtTime(660, audioCtx.currentTime + 0.15);
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime + 0.3);

        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.8);

        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.8);
    } catch (e) {
        // Audio context not available, skip silently
    }
};

/* ── Render Session History ── */
const renderSessionHistory = () => {
    const container = document.getElementById('session-history');
    if (!container) return;

    const sessions = getData(KEYS.SESSIONS, []);
    const todaySessions = sessions.filter(s => s.date === getToday() && s.type === 'focus');

    if (todaySessions.length === 0) {
        container.innerHTML = '<p class="text-muted" style="font-size:0.85rem;text-align:center;padding:16px;">No sessions completed today</p>';
        return;
    }

    // Display completed sessions as a timeline list
    container.innerHTML = todaySessions.map((s, i) => {
        const time = new Date(s.completedAt).toLocaleTimeString('en-US', {
            hour: 'numeric', minute: '2-digit'
        });
        return `
            <div class="timeline-item">
                <span class="timeline-dot" style="background:var(--accent-blue)"></span>
                <span class="timeline-time">${time}</span>
                <div class="timeline-content">
                    <h4>Focus Session #${i + 1}</h4>
                    <p>${s.duration} minutes</p>
                </div>
            </div>
        `;
    }).join('');
};

/* ── Update Sidebar Mini Pomodoro ── */
const updateSidebarPomodoro = () => {
    const sidebarPomo = document.getElementById('sidebar-pomodoro');
    if (!sidebarPomo) return;

    if (pomodoroState.running) {
        const mins = Math.floor(pomodoroState.remainingSeconds / 60);
        const secs = pomodoroState.remainingSeconds % 60;
        sidebarPomo.textContent = `⏱️ ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        sidebarPomo.classList.add('active');
    } else {
        sidebarPomo.classList.remove('active');
    }
};
