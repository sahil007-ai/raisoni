/**
 * ============================================
 * StudyQuest — timer-widget.js
 * Self-injecting floating Pomodoro timer widget.
 * Appears on all pages. Persists state across
 * navigation via localStorage. Includes collapsed
 * (circle) and expanded (card) states.
 * ============================================
 */

(() => {
    'use strict';

    /* ── Constants ── */
    const WIDGET_KEY = 'studyquest_timer_widget';
    const FOCUS_SECS = 25 * 60;
    const BREAK_SECS = 5 * 60;
    const LONG_BREAK_SECS = 15 * 60;

    /* ── State ── */
    let state = loadState();
    let tickInterval = null;
    let expanded = false;

    /* ── Load / Save State ── */
    function loadState() {
        try {
            const raw = localStorage.getItem(WIDGET_KEY);
            if (raw) {
                const s = JSON.parse(raw);
                // Recalculate elapsed time if timer was running
                if (s.running && s.lastUpdated) {
                    const elapsed = Math.floor((Date.now() - s.lastUpdated) / 1000);
                    s.timeLeft = Math.max(s.timeLeft - elapsed, 0);
                }
                return s;
            }
        } catch { }
        return {
            running: false,
            paused: false,
            timeLeft: FOCUS_SECS,
            totalTime: FOCUS_SECS,
            mode: 'focus',       // 'focus' | 'break' | 'longbreak'
            sessionCount: 0,
            lastUpdated: null,
            posX: null,
            posY: null
        };
    }

    function saveState() {
        state.lastUpdated = Date.now();
        localStorage.setItem(WIDGET_KEY, JSON.stringify(state));
    }

    /* ── Format Time ── */
    function fmt(s) {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    }

    /* ── Inject Widget HTML + CSS ── */
    function injectWidget() {
        // Inject styles
        const style = document.createElement('style');
        style.textContent = `
            #pomo-widget-bubble {
                position: fixed;
                top: 80px; right: 20px;
                width: 56px; height: 56px;
                border-radius: 50%;
                background: #fff;
                box-shadow: 0 4px 20px rgba(0,0,0,0.12);
                display: flex; align-items: center; justify-content: center;
                cursor: pointer;
                z-index: 9999;
                border: 3px solid var(--accent-blue, #4F8EF7);
                transition: all 0.25s ease;
                font-size: 1.3rem;
                user-select: none;
            }
            #pomo-widget-bubble.running { border-color: var(--accent-green, #3ECF8E); animation: widgetPulse 2s infinite; }
            #pomo-widget-bubble.on-break { border-color: var(--accent-yellow, #FFD166); }
            #pomo-widget-bubble .bubble-time { font-size: 11px; font-weight: 700; font-family: 'DM Sans', sans-serif; color: #1A1D2E; }
            @keyframes widgetPulse {
                0%, 100% { box-shadow: 0 4px 20px rgba(0,0,0,0.12); }
                50% { box-shadow: 0 4px 30px rgba(62,207,142,0.35); }
            }
            @keyframes completePulse {
                0%,100% { box-shadow: 0 4px 20px rgba(0,0,0,0.12); }
                33% { box-shadow: 0 0 20px rgba(62,207,142,0.6); }
                66% { box-shadow: 0 0 30px rgba(62,207,142,0.4); }
            }

            #pomo-widget-card {
                position: fixed;
                top: 80px; right: 20px;
                width: 260px;
                background: #fff;
                border-radius: 20px;
                box-shadow: 0 8px 40px rgba(0,0,0,0.15);
                z-index: 9999;
                padding: 20px;
                display: none;
                transform: scale(0.1); opacity: 0;
                transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease;
                user-select: none;
            }
            #pomo-widget-card.open { display: block; transform: scale(1); opacity: 1; }

            .pw-header { display:flex;align-items:center;justify-content:space-between;margin-bottom:12px; }
            .pw-header-label { font-size:0.78rem;font-weight:700;color:#6B7280; }
            .pw-minimize { background:none;border:none;font-size:1.1rem;cursor:pointer;color:#6B7280;padding:4px; }
            .pw-minimize:hover { color:#1A1D2E; }

            .pw-session-label { text-align:center;font-size:0.82rem;font-weight:600;margin-bottom:14px; }
            .pw-session-label.focus { color:#4F8EF7; }
            .pw-session-label.break { color:#3ECF8E; }
            .pw-session-label.longbreak { color:#FFD166; }

            .pw-ring { width:110px;height:110px;margin:0 auto 14px;position:relative;display:flex;align-items:center;justify-content:center; }
            .pw-ring svg { position:absolute;width:100%;height:100%;transform:rotate(-90deg); }
            .pw-ring circle { fill:none;stroke-linecap:round; }
            .pw-ring .ring-bg { stroke:#E5E9F0;stroke-width:5; }
            .pw-ring .ring-prog { stroke:#4F8EF7;stroke-width:5;transition:stroke-dashoffset 1s linear; }
            .pw-ring .ring-prog.break { stroke:#3ECF8E; }
            .pw-ring .ring-prog.longbreak { stroke:#FFD166; }
            .pw-time { font-size:1.6rem;font-weight:800;font-family:'Plus Jakarta Sans',sans-serif;z-index:1;letter-spacing:1px; }

            .pw-modes { display:flex;gap:4px;justify-content:center;margin-bottom:14px; }
            .pw-mode { padding:5px 10px;border-radius:20px;border:1.5px solid #E5E9F0;background:#fff;
                font-size:0.7rem;font-weight:600;cursor:pointer;transition:all 0.2s;color:#6B7280; }
            .pw-mode.active { background:#4F8EF7;color:#fff;border-color:#4F8EF7; }
            .pw-mode:hover:not(.active) { border-color:#4F8EF7;color:#4F8EF7; }

            .pw-controls { display:flex;justify-content:center;gap:8px;margin-bottom:14px; }
            .pw-btn { width:38px;height:38px;border-radius:50%;border:none;background:#F7F9FC;
                font-size:1rem;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;justify-content:center;
                box-shadow:0 2px 8px rgba(0,0,0,0.06); }
            .pw-btn:hover { transform:scale(1.1);box-shadow:0 4px 14px rgba(0,0,0,0.1); }
            .pw-btn.primary { background:linear-gradient(135deg,#4F8EF7,#3B7DEB);color:#fff; }

            .pw-dots { display:flex;justify-content:center;gap:5px;margin-bottom:8px;min-height:14px; }
            .pw-dot { width:10px;height:10px;border-radius:50%; }
            .pw-dot.focus { background:#4F8EF7; }
            .pw-dot.break { background:#3ECF8E; }

            .pw-xp-hint { text-align:center;font-size:0.7rem;color:#6B7280; }

            .pw-mini-toast { position:absolute;bottom:-40px;left:50%;transform:translateX(-50%);
                background:#1A1D2E;color:#fff;padding:6px 14px;border-radius:20px;font-size:0.72rem;
                font-weight:600;white-space:nowrap;opacity:0;transition:opacity 0.3s;pointer-events:none; }
            .pw-mini-toast.show { opacity:1; }
        `;
        document.head.appendChild(style);

        // Inject bubble
        const bubble = document.createElement('div');
        bubble.id = 'pomo-widget-bubble';
        bubble.innerHTML = '<span>⏱️</span>';
        bubble.addEventListener('click', toggleExpanded);
        document.body.appendChild(bubble);

        // Inject card
        const card = document.createElement('div');
        card.id = 'pomo-widget-card';
        card.innerHTML = `
            <div class="pw-header">
                <span class="pw-header-label">⏱️ Pomodoro</span>
                <button class="pw-minimize" id="pw-minimize">—</button>
            </div>
            <div class="pw-session-label focus" id="pw-session-label">🍅 Focus Session</div>
            <div class="pw-ring">
                <svg viewBox="0 0 120 120">
                    <circle class="ring-bg" cx="60" cy="60" r="52"/>
                    <circle class="ring-prog" id="pw-ring-prog" cx="60" cy="60" r="52"
                        stroke-dasharray="326.73" stroke-dashoffset="0"/>
                </svg>
                <span class="pw-time" id="pw-time">25:00</span>
            </div>
            <div class="pw-modes">
                <button class="pw-mode active" data-mode="focus" data-secs="${FOCUS_SECS}">🍅 25m</button>
                <button class="pw-mode" data-mode="break" data-secs="${BREAK_SECS}">☕ 5m</button>
                <button class="pw-mode" data-mode="longbreak" data-secs="${LONG_BREAK_SECS}">🛋️ 15m</button>
            </div>
            <div class="pw-controls">
                <button class="pw-btn primary" id="pw-play">▶️</button>
                <button class="pw-btn" id="pw-reset">🔄</button>
                <button class="pw-btn" id="pw-skip">⏭️</button>
            </div>
            <div class="pw-dots" id="pw-dots"></div>
            <div class="pw-xp-hint">+25 XP per focus session</div>
            <div class="pw-mini-toast" id="pw-mini-toast"></div>
        `;
        document.body.appendChild(card);

        // Apply saved position if dragged before
        if (state.posX !== null && state.posY !== null) {
            bubble.style.left = state.posX + 'px';
            bubble.style.top = state.posY + 'px';
            bubble.style.right = 'auto';
            card.style.left = state.posX + 'px';
            card.style.top = state.posY + 'px';
            card.style.right = 'auto';
        }

        // Event listeners
        document.getElementById('pw-minimize').addEventListener('click', (e) => {
            e.stopPropagation();
            collapse();
        });

        document.getElementById('pw-play').addEventListener('click', togglePlay);
        document.getElementById('pw-reset').addEventListener('click', resetTimer);
        document.getElementById('pw-skip').addEventListener('click', skipToNext);

        // Mode tabs
        card.querySelectorAll('.pw-mode').forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                const secs = parseInt(btn.dataset.secs);
                switchMode(mode, secs);
            });
        });

        // Make widget draggable
        makeDraggable(bubble, card);

        // Initial render
        render();

        // If timer was running, resume ticking
        if (state.running && !state.paused && state.timeLeft > 0) {
            startTicking();
        } else if (state.timeLeft <= 0 && state.running) {
            onTimerComplete();
        }
    }

    /* ── Toggle Expanded/Collapsed ── */
    function toggleExpanded() {
        expanded ? collapse() : expand();
    }

    function expand() {
        expanded = true;
        const bubble = document.getElementById('pomo-widget-bubble');
        const card = document.getElementById('pomo-widget-card');
        bubble.style.display = 'none';
        card.style.display = 'block';
        requestAnimationFrame(() => card.classList.add('open'));
    }

    function collapse() {
        expanded = false;
        const bubble = document.getElementById('pomo-widget-bubble');
        const card = document.getElementById('pomo-widget-card');
        card.classList.remove('open');
        setTimeout(() => { card.style.display = 'none'; bubble.style.display = 'flex'; }, 300);
    }

    /* ── Timer Controls ── */
    function togglePlay() {
        if (state.running && !state.paused) {
            pause();
        } else {
            start();
        }
    }

    function start() {
        state.running = true;
        state.paused = false;
        saveState();
        startTicking();
        render();
    }

    function pause() {
        state.paused = true;
        clearInterval(tickInterval);
        tickInterval = null;
        saveState();
        render();
    }

    function resetTimer() {
        clearInterval(tickInterval);
        tickInterval = null;
        state.running = false;
        state.paused = false;
        const modeBtn = document.querySelector('.pw-mode.active');
        state.timeLeft = parseInt(modeBtn?.dataset.secs || FOCUS_SECS);
        state.totalTime = state.timeLeft;
        saveState();
        render();
    }

    function skipToNext() {
        clearInterval(tickInterval);
        tickInterval = null;
        // Switch to next mode
        if (state.mode === 'focus') {
            switchMode('break', BREAK_SECS);
        } else {
            switchMode('focus', FOCUS_SECS);
        }
    }

    function switchMode(mode, secs) {
        clearInterval(tickInterval);
        tickInterval = null;
        state.mode = mode;
        state.timeLeft = secs;
        state.totalTime = secs;
        state.running = false;
        state.paused = false;
        saveState();

        // Update active tab
        document.querySelectorAll('.pw-mode').forEach(b => b.classList.remove('active'));
        document.querySelector(`.pw-mode[data-mode="${mode}"]`)?.classList.add('active');
        render();
    }

    /* ── Ticking ── */
    function startTicking() {
        if (tickInterval) clearInterval(tickInterval);
        tickInterval = setInterval(() => {
            state.timeLeft = Math.max(state.timeLeft - 1, 0);
            saveState();
            render();

            if (state.timeLeft <= 0) {
                clearInterval(tickInterval);
                tickInterval = null;
                onTimerComplete();
            }
        }, 1000);
    }

    /* ── Timer Complete ── */
    function onTimerComplete() {
        state.running = false;
        state.paused = false;

        // Play beep
        playWidgetBeep();

        if (state.mode === 'focus') {
            state.sessionCount += 1;

            // Save session to global sessions
            try {
                const KEYS_SESSIONS = 'studyquest_sessions';
                const KEYS_TOTAL_HOURS = 'studyquest_total_study_hours';
                const KEYS_XP = 'studyquest_xp';
                const KEYS_LEVEL = 'studyquest_level';
                const today = new Date().toISOString().split('T')[0];

                const sessions = JSON.parse(localStorage.getItem(KEYS_SESSIONS) || '[]');
                sessions.push({ date: today, type: 'focus', duration: 25, completedAt: new Date().toISOString() });
                localStorage.setItem(KEYS_SESSIONS, JSON.stringify(sessions));

                const totalH = parseFloat(localStorage.getItem(KEYS_TOTAL_HOURS) || '0');
                localStorage.setItem(KEYS_TOTAL_HOURS, JSON.stringify(totalH + (25 / 60)));

                // Award XP directly
                let xp = parseInt(localStorage.getItem(KEYS_XP) || '0');
                xp += 25;
                localStorage.setItem(KEYS_XP, JSON.stringify(xp));
            } catch { }

            showMiniToast('Session done! +25 XP ⭐');
            showGlobalToast('+25 XP — Focus session complete! 🍅', 'success');
            pulseComplete();

            // Auto-switch to break
            state.mode = 'break';
            state.timeLeft = BREAK_SECS;
            state.totalTime = BREAK_SECS;
        } else {
            // Break complete
            try {
                let xp = parseInt(localStorage.getItem('studyquest_xp') || '0');
                xp += 5;
                localStorage.setItem('studyquest_xp', JSON.stringify(xp));
            } catch { }

            showMiniToast('Break over! +5 XP ☕');
            showGlobalToast('+5 XP — Break complete! Ready for more? 🍅', 'info');

            state.mode = 'focus';
            state.timeLeft = FOCUS_SECS;
            state.totalTime = FOCUS_SECS;
        }

        saveState();
        render();

        // Request browser notification
        requestNotification();
    }

    /* ── Render All UI ── */
    function render() {
        const bubble = document.getElementById('pomo-widget-bubble');
        const timeEl = document.getElementById('pw-time');
        const ringProg = document.getElementById('pw-ring-prog');
        const sessionLabel = document.getElementById('pw-session-label');
        const playBtn = document.getElementById('pw-play');
        const dotsEl = document.getElementById('pw-dots');

        if (!bubble) return;

        // Bubble content
        if (state.running && !state.paused) {
            bubble.innerHTML = `<span class="bubble-time">${fmt(state.timeLeft)}</span>`;
            bubble.className = 'running';
            if (state.mode !== 'focus') bubble.className = 'on-break';
        } else {
            bubble.innerHTML = '<span>⏱️</span>';
            bubble.className = '';
        }
        bubble.id = 'pomo-widget-bubble';

        // Time display
        if (timeEl) timeEl.textContent = fmt(state.timeLeft);

        // Ring progress
        if (ringProg) {
            const circumference = 2 * Math.PI * 52;
            const progress = state.timeLeft / state.totalTime;
            ringProg.style.strokeDasharray = circumference;
            ringProg.style.strokeDashoffset = circumference * (1 - progress);
            ringProg.className = `ring-prog ${state.mode === 'break' ? 'break' : state.mode === 'longbreak' ? 'longbreak' : ''}`;
        }

        // Session label
        if (sessionLabel) {
            const labels = {
                focus: '🍅 Focus Session',
                break: '☕ Break Time',
                longbreak: '🛋️ Long Break'
            };
            sessionLabel.textContent = labels[state.mode] || '🍅 Focus Session';
            sessionLabel.className = `pw-session-label ${state.mode}`;
        }

        // Play button
        if (playBtn) {
            playBtn.textContent = (state.running && !state.paused) ? '⏸️' : '▶️';
        }

        // Session dots (max 8)
        if (dotsEl) {
            const count = Math.min(state.sessionCount, 8);
            dotsEl.innerHTML = count > 0
                ? Array.from({ length: count }, () => '<span class="pw-dot focus"></span>').join('')
                : '';
        }

        // Update mode tabs
        document.querySelectorAll('.pw-mode').forEach(b => {
            b.classList.toggle('active', b.dataset.mode === state.mode);
        });
    }

    /* ── Web Audio Beep ── */
    function playWidgetBeep() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, ctx.currentTime);
            gain.gain.setValueAtTime(0.25, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.3);
        } catch { }
    }

    /* ── Browser Notification ── */
    function requestNotification() {
        if ('Notification' in window) {
            if (Notification.permission === 'granted') {
                new Notification('🍅 StudyQuest Timer', {
                    body: state.mode === 'focus' ? 'Focus session complete! Take a break.' : 'Break over! Time to focus.',
                    icon: '📚'
                });
            } else if (Notification.permission !== 'denied') {
                Notification.requestPermission();
            }
        }
    }

    /* ── Mini Toast inside widget ── */
    function showMiniToast(msg) {
        const el = document.getElementById('pw-mini-toast');
        if (!el) return;
        el.textContent = msg;
        el.classList.add('show');
        setTimeout(() => el.classList.remove('show'), 2500);
    }

    /* ── Global Toast (uses the page's toast system if available) ── */
    function showGlobalToast(msg, type) {
        if (typeof showToast === 'function') {
            showToast(msg, type);
        }
    }

    /* ── Pulse bubble green on complete ── */
    function pulseComplete() {
        const bubble = document.getElementById('pomo-widget-bubble');
        if (!bubble) return;
        bubble.style.animation = 'completePulse 0.5s ease 3';
        setTimeout(() => { bubble.style.animation = ''; }, 1500);
    }

    /* ── Make Widget Draggable ── */
    function makeDraggable(bubble, card) {
        let isDragging = false;
        let startX, startY, origX, origY;

        const onMouseDown = (e) => {
            // Only drag from header area of card, or anywhere on bubble
            if (e.target.closest('.pw-btn, .pw-mode, .pw-minimize, button')) return;
            isDragging = false;
            startX = e.clientX;
            startY = e.clientY;
            const el = expanded ? card : bubble;
            const rect = el.getBoundingClientRect();
            origX = rect.left;
            origY = rect.top;

            const onMouseMove = (e2) => {
                const dx = e2.clientX - startX;
                const dy = e2.clientY - startY;
                if (Math.abs(dx) > 5 || Math.abs(dy) > 5) isDragging = true;
                if (!isDragging) return;

                const newX = Math.max(0, Math.min(origX + dx, window.innerWidth - 60));
                const newY = Math.max(0, Math.min(origY + dy, window.innerHeight - 60));

                bubble.style.left = newX + 'px';
                bubble.style.top = newY + 'px';
                bubble.style.right = 'auto';
                card.style.left = newX + 'px';
                card.style.top = newY + 'px';
                card.style.right = 'auto';

                state.posX = newX;
                state.posY = newY;
            };

            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                if (isDragging) {
                    saveState();
                    // Prevent click from toggling if was dragging
                    setTimeout(() => { isDragging = false; }, 100);
                }
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };

        bubble.addEventListener('mousedown', onMouseDown);
        card.querySelector('.pw-header').addEventListener('mousedown', onMouseDown);

        // Override bubble click to prevent toggle when dragging
        const origHandler = bubble.onclick;
        bubble.onclick = null;
        bubble.addEventListener('click', (e) => {
            if (!isDragging) toggleExpanded();
        });
    }

    /* ── Initialize on DOMContentLoaded ── */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectWidget);
    } else {
        injectWidget();
    }
})();
