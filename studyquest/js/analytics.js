/**
 * ============================================
 * StudyQuest — analytics.js
 * Chart.js powered analytics dashboard.
 * Renders bar, doughnut, and line charts for
 * study hours, tasks, streaks, and performance.
 * ============================================
 */

/* ── Initialize Analytics Page ── */
const initAnalytics = () => {
    renderAnalyticsStats();
    renderWeeklyHoursChart();
    renderTasksBySubjectChart();
    renderStreakTrendChart();
    renderTasksPerDayChart();
};

/* ── Stats Summary Cards ── */
const renderAnalyticsStats = () => {
    const totalHours = parseFloat(getData(KEYS.TOTAL_STUDY_HOURS, 0)) || 0;
    const tasks = getData(KEYS.TASKS, []);
    const totalDone = tasks.filter(t => t.completed).length;
    const streak = getData(KEYS.STREAK, 0);
    const xp = getData(KEYS.XP, 0);

    const setEl = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };

    // Update stat card values
    setEl('stat-total-hours', `${totalHours.toFixed(1)}h`);
    setEl('stat-total-tasks', totalDone);
    setEl('stat-best-streak', `${streak} days`);
    setEl('stat-total-xp', `${xp} XP`);
};

/* ── Chart 1: Weekly Study Hours (Bar) ── */
const renderWeeklyHoursChart = () => {
    const ctx = document.getElementById('weekly-hours-chart')?.getContext('2d');
    if (!ctx) return;

    // Compute hours per day for the last 7 days from sessions
    const sessions = getData(KEYS.SESSIONS, []);
    const labels = [];
    const dataPoints = [];

    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));

        // Sum focus session durations for this day
        const dayMinutes = sessions
            .filter(s => s.date === dateStr && s.type === 'focus')
            .reduce((sum, s) => sum + (s.duration || 25), 0);
        dataPoints.push((dayMinutes / 60).toFixed(1));
    }

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Study Hours',
                data: dataPoints,
                backgroundColor: 'rgba(79, 142, 247, 0.7)',
                borderColor: 'rgba(79, 142, 247, 1)',
                borderWidth: 1,
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: '#E5E9F020' } },
                x: { grid: { display: false } }
            }
        }
    });
};

/* ── Chart 2: Tasks by Subject (Doughnut) ── */
const renderTasksBySubjectChart = () => {
    const ctx = document.getElementById('tasks-subject-chart')?.getContext('2d');
    if (!ctx) return;

    const tasks = getData(KEYS.TASKS, []);
    const subjectMap = {};

    // Count tasks per subject
    tasks.forEach(t => {
        const subj = t.subject || 'No Subject';
        subjectMap[subj] = (subjectMap[subj] || 0) + 1;
    });

    const labels = Object.keys(subjectMap);
    const dataPoints = Object.values(subjectMap);

    // Pastel colors for each subject
    const colors = ['#4F8EF7', '#3ECF8E', '#FFD166', '#A78BFA', '#F87171', '#FB923C', '#F472B6', '#38BDF8'];

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels.length ? labels : ['No Tasks Yet'],
            datasets: [{
                data: dataPoints.length ? dataPoints : [1],
                backgroundColor: labels.length ? colors.slice(0, labels.length) : ['#E5E9F0'],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { padding: 16, font: { size: 12 } } }
            }
        }
    });
};

/* ── Chart 3: Streak Trend (Line) ── */
const renderStreakTrendChart = () => {
    const ctx = document.getElementById('streak-trend-chart')?.getContext('2d');
    if (!ctx) return;

    const streak = getData(KEYS.STREAK, 0);
    const labels = [];
    const dataPoints = [];

    // Simulate streak trend over last 30 days based on current streak
    for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        labels.push(d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }));
        // Streak value: if within current streak window, show increasing; else 0
        dataPoints.push(i < streak ? streak - i : 0);
    }

    new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Streak',
                data: dataPoints,
                borderColor: '#3ECF8E',
                backgroundColor: (context) => {
                    const chart = context.chart;
                    const { ctx: c, chartArea } = chart;
                    if (!chartArea) return 'rgba(62,207,142,0.1)';
                    const gradient = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                    gradient.addColorStop(0, 'rgba(62,207,142,0.3)');
                    gradient.addColorStop(1, 'rgba(62,207,142,0.02)');
                    return gradient;
                },
                fill: true,
                tension: 0.4,
                pointRadius: 2,
                pointBackgroundColor: '#3ECF8E',
                borderWidth: 2.5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: '#E5E9F020' } },
                x: { grid: { display: false }, ticks: { maxTicksLimit: 7 } }
            }
        }
    });
};

/* ── Chart 4: Tasks Completed Per Day (Bar) ── */
const renderTasksPerDayChart = () => {
    const ctx = document.getElementById('tasks-day-chart')?.getContext('2d');
    if (!ctx) return;

    const tasks = getData(KEYS.TASKS, []);
    const labels = [];
    const dataPoints = [];

    // Count completed tasks per day for last 7 days
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));

        const count = tasks.filter(t =>
            t.completed && t.completedAt &&
            t.completedAt.startsWith(dateStr)
        ).length;
        dataPoints.push(count);
    }

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Tasks Completed',
                data: dataPoints,
                backgroundColor: 'rgba(167, 139, 250, 0.7)',
                borderColor: 'rgba(167, 139, 250, 1)',
                borderWidth: 1,
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#E5E9F020' } },
                x: { grid: { display: false } }
            }
        }
    });
};

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('analytics-page')) {
        initAnalytics();
    }
});
