/**
 * ============================================
 * Plan4U — notifications.js
 * Duolingo-style guilt-trip push notifications
 * and in-app welcome-back splash messages.
 * ============================================
 */

/* ── Notification Storage Keys ── */
const NOTIF_KEYS = {
    LAST_VISIT: 'plan4u_last_visit',
    NOTIF_PERMISSION: 'plan4u_notif_permission',
    NOTIF_SCHEDULED: 'plan4u_notif_scheduled',
    NOTIF_DISMISSED_COUNT: 'plan4u_notif_dismissed',
    COMEBACK_SHOWN: 'plan4u_comeback_shown_date'
};

/* ── Guilt-Trip Message Pool ── */
const GUILT_MESSAGES = {
    // 1-2 hours away
    gentle: [
        { title: "📚 Ready to study?", body: "It's okay if not, but I'd like it if you did." },
        { title: "📚 Plan4U misses you!", body: "Ready to practice? Your study plan is waiting." },
        { title: "📖 Quick reminder", body: "Your future self will thank you for 15 minutes of study right now." },
        { title: "🎯 Study time?", body: "A small study session goes a long way. Let's go!" },
        { title: "📚 Hey there!", body: "Your books aren't going to read themselves... just saying." }
    ],
    // 4-12 hours away
    moderate: [
        { title: "📚 Hi, it's Plan4U", body: "Don't let this streak become a not-streak." },
        { title: "📚 We noticed...", body: "Looks like you've forgotten about your study sessions. Again." },
        { title: "🏆 Leaderboard alert", body: "See that person ahead of you? Don't let them win." },
        { title: "📚 Just checking in", body: "Your study streak is getting cold. Warm it up!" },
        { title: "📝 Your tasks miss you", body: "They've been sitting there, waiting. Don't ghost them." },
        { title: "⏰ A gentle nudge", body: "Your exam doesn't care about your excuses. But Plan4U does. Come study." }
    ],
    // 1-2 days away
    aggressive: [
        { title: "📚 Don't make me come over there.", body: "Your study plan has been collecting dust. Time to fix that." },
        { title: "😤 Plan4U is disappointed", body: "You've let Plan4U down. Who will be next? Your professor? Your GPA?" },
        { title: "📚 These notifications...", body: "These notifications don't seem to be working. We'll stop sending them." },
        { title: "🦉 Last chance", body: "Your streak is about to break. Is that really what you want?" },
        { title: "📚 Remember me?", body: "I'm Plan4U. You used to study with me. Those were the days..." },
        { title: "🔥 STREAK EMERGENCY", body: "Your streak is crying. Literally. Open the app. NOW." }
    ],
    // 3+ days away
    nuclear: [
        { title: "💀 It's been days.", body: "Your study plan wrote a goodbye letter. Don't let it end like this." },
        { title: "📚 We need to talk.", body: "This isn't working. You promised you'd study. Time to come back." },
        { title: "🪦 R.I.P. Your Streak", body: "Your streak didn't survive. But your grades still can. Open Plan4U." },
        { title: "📚 Final warning", body: "Time to do your lesson or I'll tell your mom you're not studying." },
        { title: "😭 Plan4U is crying", body: "You haven't studied in days. Your textbooks are gathering actual cobwebs." },
        { title: "📚 Breaking News", body: "Local student abandons studies. Textbooks seen weeping. More at 11." },
        { title: "🚨 This is an intervention", body: "Your friends, your family, your GPA — we're all here because we care. Open Plan4U." }
    ]
};

/* ── In-App Welcome-Back Messages (shown as splash modal) ── */
const COMEBACK_MESSAGES = {
    gentle: [
        { emoji: "👋", title: "Welcome back!", subtitle: "Ready to crush some study goals today?", cta: "Let's Go! 🚀" },
        { emoji: "📚", title: "Hey, you're here!", subtitle: "Your study plan missed you. Let's pick up where you left off.", cta: "Start Studying" }
    ],
    moderate: [
        { emoji: "😏", title: "Look who's back!", subtitle: "We were starting to worry. Your streak took a hit, but it's not too late.", cta: "Save My Streak! 🔥" },
        { emoji: "📖", title: "Oh, you remembered!", subtitle: "Your study plan was starting to feel neglected. Let's fix that.", cta: "Make It Up! 💪" },
        { emoji: "🫣", title: "It's been a while...", subtitle: "Your tasks have been waiting patiently. Some more patiently than others.", cta: "I'm Sorry, Let's Study" }
    ],
    aggressive: [
        { emoji: "😤", title: "Finally!", subtitle: "Do you know how long I've been sending you notifications? Your books almost filed a missing person report.", cta: "I'm Back! Forgive Me 😅" },
        { emoji: "🦉", title: "The Prodigal Student Returns", subtitle: "Your streak is gone. Your tasks are overdue. But hey — you're here now. That's... something.", cta: "Redemption Arc Starts Now" },
        { emoji: "💀", title: "We thought you dropped out", subtitle: "Your study plan literally started making contingency plans. Welcome back, legend.", cta: "I Never Left (Okay I Did)" }
    ],
    nuclear: [
        { emoji: "🪦", title: "Back from the dead?", subtitle: "Your streak: deceased. Your tasks: abandoned. Your GPA: on life support. But today? Today we fight.", cta: "RESURRECT MY GRADES 💀🔥" },
        { emoji: "😭", title: "IS THAT REALLY YOU?!", subtitle: "I've been sending you notifications for DAYS. I was about to call your mom. Let's never do this again.", cta: "I Promise I'll Study 🥺" }
    ]
};

/* ── Get severity level based on hours away ── */
const getAbsenceSeverity = (hoursAway) => {
    if (hoursAway < 2) return 'gentle';
    if (hoursAway < 12) return 'moderate';
    if (hoursAway < 48) return 'aggressive';
    return 'nuclear';
};

/* ── Pick a random message from a severity pool ── */
const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

/* ── Request Notification Permission ── */
const requestNotifPermission = async () => {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;

    const result = await Notification.requestPermission();
    return result === 'granted';
};

/* ── Schedule Browser Push Notification ── */
const scheduleNotification = (delayMs, severity) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    // Clear previously scheduled
    const existingId = localStorage.getItem(NOTIF_KEYS.NOTIF_SCHEDULED);
    if (existingId) clearTimeout(parseInt(existingId));

    const timeoutId = setTimeout(() => {
        const pool = GUILT_MESSAGES[severity] || GUILT_MESSAGES.gentle;
        const msg = pickRandom(pool);

        try {
            const n = new Notification(msg.title, {
                body: msg.body,
                icon: '📚',
                badge: '📚',
                tag: 'plan4u-guilt',
                requireInteraction: true,
                silent: false
            });

            n.onclick = () => {
                window.focus();
                n.close();
            };

            // Schedule next notification at escalating severity
            const nextSeverity = severity === 'gentle' ? 'moderate' :
                                 severity === 'moderate' ? 'aggressive' :
                                 severity === 'aggressive' ? 'nuclear' : 'nuclear';
            const nextDelay = severity === 'gentle' ? 2 * 60 * 60 * 1000 :    // 2 hours
                              severity === 'moderate' ? 4 * 60 * 60 * 1000 :   // 4 hours
                              severity === 'aggressive' ? 8 * 60 * 60 * 1000 : // 8 hours
                              24 * 60 * 60 * 1000;                              // 24 hours

            scheduleNotification(nextDelay, nextSeverity);
        } catch (e) {
            console.log('Notification failed:', e);
        }
    }, delayMs);

    localStorage.setItem(NOTIF_KEYS.NOTIF_SCHEDULED, timeoutId.toString());
};

/* ── Show In-App Comeback Splash ── */
const showComebackSplash = (hoursAway) => {
    const today = getToday();
    const alreadyShown = localStorage.getItem(NOTIF_KEYS.COMEBACK_SHOWN);
    if (alreadyShown === today) return; // Only show once per day

    if (hoursAway < 1) return; // Don't show if they just left

    const severity = getAbsenceSeverity(hoursAway);
    const pool = COMEBACK_MESSAGES[severity] || COMEBACK_MESSAGES.gentle;
    const msg = pickRandom(pool);

    // Create splash overlay
    const overlay = document.createElement('div');
    overlay.id = 'comeback-overlay';
    overlay.innerHTML = `
        <div class="comeback-backdrop"></div>
        <div class="comeback-card">
            <div class="comeback-emoji">${msg.emoji}</div>
            <h2 class="comeback-title">${msg.title}</h2>
            <p class="comeback-subtitle">${msg.subtitle}</p>
            <div class="comeback-stats">
                <div class="comeback-stat">
                    <span class="comeback-stat-value">${Math.floor(hoursAway)}h</span>
                    <span class="comeback-stat-label">Away</span>
                </div>
                <div class="comeback-stat">
                    <span class="comeback-stat-value" id="comeback-streak">${getData(KEYS.STREAK, 0)}</span>
                    <span class="comeback-stat-label">Streak</span>
                </div>
                <div class="comeback-stat">
                    <span class="comeback-stat-value" id="comeback-tasks">${getData(KEYS.TASKS, []).filter(t => !t.completed).length}</span>
                    <span class="comeback-stat-label">Pending</span>
                </div>
            </div>
            <button class="comeback-cta" id="comeback-cta-btn">${msg.cta}</button>
            <button class="comeback-dismiss" id="comeback-dismiss-btn">Maybe later...</button>
        </div>
    `;

    document.body.appendChild(overlay);

    // Animate in
    requestAnimationFrame(() => {
        overlay.classList.add('active');
    });

    // CTA button — close with positivity
    document.getElementById('comeback-cta-btn').addEventListener('click', () => {
        overlay.classList.remove('active');
        setTimeout(() => overlay.remove(), 400);
        localStorage.setItem(NOTIF_KEYS.COMEBACK_SHOWN, today);
        showToast("That's the spirit! Let's go! 🔥", 'success');
    });

    // Dismiss button — guilt them even more
    document.getElementById('comeback-dismiss-btn').addEventListener('click', () => {
        const dismissCount = parseInt(localStorage.getItem(NOTIF_KEYS.NOTIF_DISMISSED_COUNT) || '0') + 1;
        localStorage.setItem(NOTIF_KEYS.NOTIF_DISMISSED_COUNT, dismissCount.toString());

        overlay.classList.remove('active');
        setTimeout(() => overlay.remove(), 400);
        localStorage.setItem(NOTIF_KEYS.COMEBACK_SHOWN, today);

        const dismissResponses = [
            "Fine. But I'll be back. 😤",
            "Your textbook just shed a tear. 📖💧",
            "Okay... but your exam won't wait for you.",
            `That's ${dismissCount} time${dismissCount > 1 ? 's' : ''} you've dismissed me. I'm counting.`,
            "I'll remember this when your grades come out. 📉"
        ];
        showToast(pickRandom(dismissResponses), 'warning');
    });
};

/* ── Notification Permission Banner ── */
const showPermissionBanner = () => {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'default') return;
    if (localStorage.getItem(NOTIF_KEYS.NOTIF_PERMISSION) === 'asked') return;

    const banner = document.createElement('div');
    banner.id = 'notif-permission-banner';
    banner.className = 'notif-banner';
    banner.innerHTML = `
        <div class="notif-banner-content">
            <span class="notif-banner-icon">🔔</span>
            <div>
                <strong>Never miss a study session!</strong>
                <p>Enable notifications and we'll gently (or not so gently) remind you to study.</p>
            </div>
        </div>
        <div class="notif-banner-actions">
            <button class="btn btn-primary btn-sm" id="notif-enable-btn">Enable Notifications</button>
            <button class="btn btn-sm btn-secondary" id="notif-dismiss-banner">Not now</button>
        </div>
    `;

    document.body.appendChild(banner);
    requestAnimationFrame(() => banner.classList.add('active'));

    document.getElementById('notif-enable-btn').addEventListener('click', async () => {
        const granted = await requestNotifPermission();
        banner.classList.remove('active');
        setTimeout(() => banner.remove(), 400);
        localStorage.setItem(NOTIF_KEYS.NOTIF_PERMISSION, 'asked');

        if (granted) {
            showToast("Notifications enabled! We'll keep you on track. 🔔", 'success');
            // Send a test notification
            setTimeout(() => {
                new Notification("📚 Plan4U is ready!", {
                    body: "Great choice! We'll make sure you never forget to study. 😈",
                    tag: 'plan4u-welcome'
                });
            }, 1000);
        } else {
            showToast("No worries! You can enable later in browser settings.", 'info');
        }
    });

    document.getElementById('notif-dismiss-banner').addEventListener('click', () => {
        banner.classList.remove('active');
        setTimeout(() => banner.remove(), 400);
        localStorage.setItem(NOTIF_KEYS.NOTIF_PERMISSION, 'asked');
    });
};

/* ── Initialize Notification System ── */
const initNotifications = () => {
    const now = Date.now();
    const lastVisit = parseInt(localStorage.getItem(NOTIF_KEYS.LAST_VISIT) || '0');
    const hoursAway = lastVisit > 0 ? (now - lastVisit) / (1000 * 60 * 60) : 0;

    // Update last visit timestamp
    localStorage.setItem(NOTIF_KEYS.LAST_VISIT, now.toString());

    // Show comeback splash if they've been away
    if (hoursAway >= 1) {
        // Small delay so the page renders first
        setTimeout(() => showComebackSplash(hoursAway), 800);
    }

    // Show permission banner after 5 seconds on first visit
    setTimeout(() => showPermissionBanner(), 5000);

    // Schedule push notifications for when user leaves
    if ('Notification' in window && Notification.permission === 'granted') {
        // Schedule first gentle reminder for 1 hour from now
        scheduleNotification(1 * 60 * 60 * 1000, 'gentle');
    }

    // Update last visit timestamp on every page visibility change
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            localStorage.setItem(NOTIF_KEYS.LAST_VISIT, Date.now().toString());
            // Cancel any scheduled notifications since user is back
            const existingId = localStorage.getItem(NOTIF_KEYS.NOTIF_SCHEDULED);
            if (existingId) clearTimeout(parseInt(existingId));
        } else {
            // User left — schedule notifications
            if ('Notification' in window && Notification.permission === 'granted') {
                scheduleNotification(1 * 60 * 60 * 1000, 'gentle');
            }
        }
    });
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to not interfere with main app init
    setTimeout(initNotifications, 1500);
});
