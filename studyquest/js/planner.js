/**
 * ============================================
 * StudyQuest — planner.js (AI Syllabus Upload)
 * 3-step wizard for syllabus upload, AI parsing,
 * and intelligent schedule generation.
 * ============================================
 */

/* ── Constants ── */
const COURSE_KEY = 'studyquest_courses';
const INTENSITY = { Light: 0.6, Balanced: 0.8, Intensive: 1.0 };
const DIFFICULTY_HOURS = { Easy: 1, Medium: 1.5, Hard: 2.5 };
const DIFFICULTY_KEYWORDS = {
    Hard: ['advanced', 'complex', 'calculus', 'algorithm', 'theory', 'proof', 'differential', 'integral', 'quantum', 'nonlinear', 'optimization', 'recursion', 'dynamic programming', 'abstract', 'theorem'],
    Easy: ['introduction', 'basic', 'overview', 'fundamentals', 'intro', 'getting started', 'beginner', 'simple', 'review', 'recap', 'summary', 'definitions'],
};
const SUBJECT_COLORS = ['#4F8EF7', '#3ECF8E', '#FFD166', '#A78BFA', '#F472B6', '#EC4899', '#34D399', '#FB923C', '#6366F1', '#14B8A6'];

let wizardStep = 1;
let parsedCourses = [];  // Holds all courses added by user
let currentParsed = null; // The course currently being parsed/reviewed
let generatedSchedule = [];

/* ══════════════════════════════════════════════
   STEP 1 — UPLOAD / PASTE
   ══════════════════════════════════════════════ */

const initPlanner = () => {
    setupStep1Events();
    setupStep2Events();
    setupStep3Events();

    // Load existing courses
    parsedCourses = getData(COURSE_KEY, []);

    // If we have courses and a schedule, show step 3
    const existingSchedule = getData(KEYS.SCHEDULE, []);
    if (parsedCourses.length > 0 && existingSchedule.length > 0) {
        generatedSchedule = existingSchedule;
        goToStep(3);
    }

    // Render course sidebar
    renderCourseList();
};

const setupStep1Events = () => {
    // File upload drag & drop
    const dropZone = document.getElementById('syllabus-drop-zone');
    const fileInput = document.getElementById('syllabus-file-input');

    if (dropZone && fileInput) {
        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            if (e.dataTransfer.files.length) handleSyllabusFile(e.dataTransfer.files[0]);
        });
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length) handleSyllabusFile(fileInput.files[0]);
        });
    }

    // Analyze button
    const analyzeBtn = document.getElementById('analyze-btn');
    if (analyzeBtn) analyzeBtn.addEventListener('click', startAnalysis);

    // Re-upload button
    const reuploadBtn = document.getElementById('reupload-btn');
    if (reuploadBtn) reuploadBtn.addEventListener('click', () => {
        parsedCourses = [];
        saveData(COURSE_KEY, []);
        saveData(KEYS.SCHEDULE, []);
        saveData(KEYS.SUBJECTS, []);
        goToStep(1);
        renderCourseList();
        showToast('Ready for a fresh start! 📄', 'info');
    });
};

const handleSyllabusFile = (file) => {
    const accepted = ['text/plain', 'application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const isImage = file.type.startsWith('image/');
    const isAccepted = accepted.includes(file.type) || isImage || file.name.match(/\.(txt|pdf|doc|docx)$/i);

    if (!isAccepted) {
        showToast('Unsupported file format', 'warning');
        return;
    }

    const indicator = document.getElementById('file-indicator');
    indicator.style.display = 'flex';
    indicator.innerHTML = `
        <span style="color:var(--accent-green)">✅</span>
        <span style="font-weight:600;font-size:0.85rem;">${file.name}</span>
        <span style="font-size:0.75rem;color:var(--text-muted);">${(file.size / 1024).toFixed(1)} KB</span>
    `;

    // If text file, read its contents into the textarea
    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('syllabus-text').value = e.target.result;
        };
        reader.readAsText(file);
    } else if (isImage) {
        showToast('📸 Image uploaded! Please also paste text for best results.', 'info');
    }
};

/* ── Start AI Analysis (Simulated) ── */
const startAnalysis = () => {
    const text = document.getElementById('syllabus-text')?.value.trim();
    const fileIndicator = document.getElementById('file-indicator');
    const hasFile = fileIndicator && fileIndicator.style.display !== 'none';

    if (!text && !hasFile) {
        showToast('Please upload a file or paste your syllabus text', 'warning');
        return;
    }

    // Show loading (step 2 loading view)
    goToStep(2);
    showAnalysisLoading();

    // Parse after simulated delay
    setTimeout(() => {
        currentParsed = parseSyllabus(text || '');
        renderParsedResult();
    }, 2500);
};

/* ══════════════════════════════════════════════
   AI PARSING LOGIC (Local JS, no API)
   ══════════════════════════════════════════════ */

const parseSyllabus = (text) => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    // Extract course name
    let courseName = '';
    const courseMatch = text.match(/(?:course|subject|module)[:\s]+(.+)/i);
    if (courseMatch) courseName = courseMatch[1].trim();
    if (!courseName && lines.length > 0) courseName = lines[0].replace(/^[\d.:\-]+/, '').trim();

    // Extract exam date
    let examDate = '';
    const datePatterns = [
        /(?:exam|final|assessment|test|due)[:\s]*(\w+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?)/i,
        /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
        /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?)/i,
    ];
    for (const pattern of datePatterns) {
        const match = text.match(pattern);
        if (match) {
            const parsed = new Date(match[1]);
            if (!isNaN(parsed.getTime())) {
                examDate = parsed.toISOString().split('T')[0];
                break;
            }
        }
    }
    if (!examDate) {
        // Default: 30 days from now
        const d = new Date();
        d.setDate(d.getDate() + 30);
        examDate = d.toISOString().split('T')[0];
    }

    // Extract topics
    const topics = [];
    let currentUnit = '';

    for (const line of lines) {
        // Detect unit/chapter/module headers
        const unitMatch = line.match(/^(?:unit|chapter|module|part|section|week)\s*[\d.:]+[:\s\-]*(.*)/i);
        if (unitMatch) {
            currentUnit = unitMatch[1].trim() || line;
            continue;
        }

        // Detect topic lines (starts with -, •, *, number, or letters)
        const topicMatch = line.match(/^\s*(?:[-•*]|\d+[.)]\s*|[a-z][.)]\s*)\s*(.+)/i);
        if (topicMatch) {
            const topicName = topicMatch[1].trim();
            if (topicName.length > 2 && topicName.length < 150) {
                const difficulty = estimateDifficulty(topicName);
                topics.push({
                    id: generateId(),
                    name: topicName,
                    unit: currentUnit || 'General',
                    difficulty,
                    estimatedHours: DIFFICULTY_HOURS[difficulty],
                    completed: false
                });
            }
        }
    }

    // If no topics found, try splitting by lines that look meaningful
    if (topics.length === 0) {
        for (const line of lines.slice(1)) {
            if (line.length > 3 && line.length < 150 && !line.match(/^(course|subject|exam|date|assessment)/i)) {
                const difficulty = estimateDifficulty(line);
                topics.push({
                    id: generateId(),
                    name: line,
                    unit: 'General',
                    difficulty,
                    estimatedHours: DIFFICULTY_HOURS[difficulty],
                    completed: false
                });
            }
        }
    }

    // Calculate confidence based on data found
    let confidence = 50;
    if (courseName) confidence += 15;
    if (examDate) confidence += 10;
    if (topics.length >= 3) confidence += 15;
    if (topics.length >= 8) confidence += 10;
    confidence = Math.min(confidence, 98);

    return {
        courseId: generateId(),
        courseName: courseName || 'Untitled Course',
        examDate,
        topics,
        confidence,
        uploadedAt: new Date().toISOString(),
        color: SUBJECT_COLORS[parsedCourses.length % SUBJECT_COLORS.length]
    };
};

/* ── Estimate Difficulty ── */
const estimateDifficulty = (text) => {
    const lower = text.toLowerCase();
    for (const kw of DIFFICULTY_KEYWORDS.Hard) {
        if (lower.includes(kw)) return 'Hard';
    }
    for (const kw of DIFFICULTY_KEYWORDS.Easy) {
        if (lower.includes(kw)) return 'Easy';
    }
    return 'Medium';
};

/* ══════════════════════════════════════════════
   STEP 2 — REVIEW PARSED RESULTS
   ══════════════════════════════════════════════ */

const showAnalysisLoading = () => {
    const container = document.getElementById('analysis-content');
    const messages = [
        '📖 Reading your syllabus...',
        '🧠 Identifying key topics...',
        '📊 Estimating difficulty levels...',
        '📅 Checking exam dates...',
        '✨ Building your personalized plan...'
    ];
    let idx = 0;

    container.innerHTML = `
        <div style="text-align:center;padding:60px 20px;">
            <div class="verify-spinner" style="margin:0 auto 20px;"></div>
            <div style="height:6px;background:var(--border);border-radius:4px;max-width:300px;margin:0 auto 20px;">
                <div id="analysis-progress-bar" style="height:100%;background:var(--accent-blue);border-radius:4px;width:0%;transition:width 0.5s;"></div>
            </div>
            <p id="analysis-status" style="font-weight:600;font-size:0.95rem;">${messages[0]}</p>
        </div>
    `;

    const statusEl = document.getElementById('analysis-status');
    const progressBar = document.getElementById('analysis-progress-bar');

    const cycle = setInterval(() => {
        idx++;
        if (idx >= messages.length) { clearInterval(cycle); return; }
        if (statusEl) statusEl.textContent = messages[idx];
        if (progressBar) progressBar.style.width = `${((idx + 1) / messages.length) * 100}%`;
    }, 500);
};

const renderParsedResult = () => {
    const container = document.getElementById('analysis-content');
    if (!currentParsed) return;

    const c = currentParsed;
    const topicsHTML = c.topics.map(t => `
        <div class="topic-pill-row" data-id="${t.id}">
            <span class="topic-name">${t.name}</span>
            <span class="topic-unit text-muted">${t.unit}</span>
            <button class="difficulty-toggle diff-${t.difficulty.toLowerCase()}" onclick="toggleTopicDifficulty('${t.id}')">
                ${t.difficulty === 'Easy' ? '🟢' : t.difficulty === 'Hard' ? '🔴' : '🟡'} ${t.difficulty}
            </button>
            <input type="number" class="topic-hours-input" value="${t.estimatedHours}" min="0.5" max="10" step="0.5"
                   onchange="updateTopicHours('${t.id}', this.value)" title="Estimated hours">
            <button class="btn-icon btn-sm" onclick="removeTopic('${t.id}')" title="Remove">✕</button>
        </div>
    `).join('');

    container.innerHTML = `
        <div class="card" style="border:2px solid var(--accent-green);margin-bottom:20px;">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
                <span style="font-size:1.5rem;">✅</span>
                <div>
                    <h3 style="font-size:1rem;margin-bottom:2px;">AI Analysis Complete!</h3>
                    <p style="font-size:0.78rem;color:var(--text-muted);">Review and edit the extracted data below</p>
                </div>
            </div>

            <!-- Editable Fields -->
            <div class="grid-2" style="gap:12px;margin-bottom:16px;">
                <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label">Course Name</label>
                    <input type="text" class="form-input" id="parsed-course-name" value="${c.courseName}">
                </div>
                <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label">Exam Date</label>
                    <input type="date" class="form-input" id="parsed-exam-date" value="${c.examDate}">
                </div>
            </div>

            <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
                <span style="font-size:0.85rem;font-weight:600;">📝 ${c.topics.length} topics detected</span>
                <span class="pill pill-blue">AI Confidence: ${c.confidence}% 🎯</span>
            </div>

            <!-- Topics List (scrollable) -->
            <div id="topics-list" style="max-height:250px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px;margin-bottom:12px;">
                ${topicsHTML || '<p class="text-muted" style="padding:16px;text-align:center;">No topics detected. Add some manually below.</p>'}
            </div>
            <button class="btn btn-sm btn-secondary" onclick="addManualTopic()">+ Add Topic Manually</button>
        </div>

        <!-- Settings -->
        <div class="card" style="margin-bottom:20px;">
            <div class="grid-3" style="gap:12px;">
                <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label">Daily Study Hours</label>
                    <input type="range" class="form-range" id="parsed-daily-hours" min="1" max="12" value="4"
                           oninput="document.getElementById('hours-display').textContent = this.value + ' hours'">
                    <div id="hours-display" style="text-align:center;font-size:0.82rem;font-weight:600;">4 hours</div>
                </div>
                <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label">Start Date</label>
                    <input type="date" class="form-input" id="parsed-start-date" value="${new Date().toISOString().split('T')[0]}">
                </div>
                <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label">Schedule Intensity</label>
                    <div class="intensity-pills">
                        <button class="filter-pill intensity-btn" data-intensity="Light">Light</button>
                        <button class="filter-pill intensity-btn active" data-intensity="Balanced">Balanced</button>
                        <button class="filter-pill intensity-btn" data-intensity="Intensive">Intensive</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Actions -->
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
            <button class="btn btn-primary btn-lg" id="generate-from-parsed" style="flex:1;" onclick="saveCourseAndGenerate()">🚀 Generate Schedule</button>
            <button class="btn btn-secondary" onclick="goToStep(1)">← Back</button>
        </div>
    `;

    // Intensity pill clicks
    container.querySelectorAll('.intensity-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.intensity-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
};

/* ── Topic Editor Functions ── */
const toggleTopicDifficulty = (topicId) => {
    if (!currentParsed) return;
    const topic = currentParsed.topics.find(t => t.id === topicId);
    if (!topic) return;
    const cycle = { Easy: 'Medium', Medium: 'Hard', Hard: 'Easy' };
    topic.difficulty = cycle[topic.difficulty];
    topic.estimatedHours = DIFFICULTY_HOURS[topic.difficulty];
    renderParsedResult();
};

const updateTopicHours = (topicId, val) => {
    if (!currentParsed) return;
    const topic = currentParsed.topics.find(t => t.id === topicId);
    if (topic) topic.estimatedHours = parseFloat(val) || 1;
};

const removeTopic = (topicId) => {
    if (!currentParsed) return;
    currentParsed.topics = currentParsed.topics.filter(t => t.id !== topicId);
    renderParsedResult();
};

const addManualTopic = () => {
    if (!currentParsed) return;
    const name = prompt('Enter topic name:');
    if (!name || !name.trim()) return;
    const difficulty = estimateDifficulty(name);
    currentParsed.topics.push({
        id: generateId(),
        name: name.trim(),
        unit: 'Manual',
        difficulty,
        estimatedHours: DIFFICULTY_HOURS[difficulty],
        completed: false
    });
    renderParsedResult();
};

/* ══════════════════════════════════════════════
   GENERATE SCHEDULE FROM PARSED DATA
   ══════════════════════════════════════════════ */

const saveCourseAndGenerate = () => {
    if (!currentParsed) return;

    // Update from editable fields
    currentParsed.courseName = document.getElementById('parsed-course-name')?.value || currentParsed.courseName;
    currentParsed.examDate = document.getElementById('parsed-exam-date')?.value || currentParsed.examDate;

    const dailyHours = parseInt(document.getElementById('parsed-daily-hours')?.value || 4);
    const startDate = document.getElementById('parsed-start-date')?.value || new Date().toISOString().split('T')[0];
    const intensityBtn = document.querySelector('.intensity-btn.active');
    const intensity = intensityBtn?.dataset.intensity || 'Balanced';

    // Save course
    const existing = parsedCourses.findIndex(c => c.courseId === currentParsed.courseId);
    if (existing > -1) {
        parsedCourses[existing] = currentParsed;
    } else {
        parsedCourses.push(currentParsed);
    }
    saveData(COURSE_KEY, parsedCourses);

    // Save subjects for compatibility with other modules
    const subjects = parsedCourses.map(c => ({
        id: c.courseId,
        name: c.courseName,
        examDate: c.examDate,
        difficulty: getMajorityDifficulty(c.topics),
        color: c.color,
        hoursPerDay: dailyHours
    }));
    saveData(KEYS.SUBJECTS, subjects);

    // Generate schedule
    generatedSchedule = generateAISchedule(parsedCourses, dailyHours, startDate, intensity);
    saveData(KEYS.SCHEDULE, generatedSchedule);

    // Award XP for generating schedule
    const count = getData(KEYS.SCHEDULES_GENERATED, 0) + 1;
    saveData(KEYS.SCHEDULES_GENERATED, count);
    if (typeof awardXP === 'function') {
        awardXP(30, 'AI schedule generated! 📅');
    }

    goToStep(3);
    renderCourseList();
};

const getMajorityDifficulty = (topics) => {
    const counts = { Easy: 0, Medium: 0, Hard: 0 };
    topics.forEach(t => counts[t.difficulty]++);
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
};

/* ── AI Schedule Generation Algorithm ── */
const generateAISchedule = (courses, dailyHours, startDate, intensityKey) => {
    const schedule = [];
    const intensityFactor = INTENSITY[intensityKey] || 0.8;
    const effectiveDaily = dailyHours * intensityFactor;

    // Flatten all topics across courses
    const allSlots = [];
    for (const course of courses) {
        for (const topic of course.topics) {
            if (!topic.completed) {
                allSlots.push({
                    topicId: topic.id,
                    topicName: topic.name,
                    unit: topic.unit,
                    subjectName: course.courseName,
                    subjectColor: course.color,
                    difficulty: topic.difficulty,
                    duration: topic.estimatedHours * 60,
                    courseId: course.courseId,
                    examDate: course.examDate,
                    completed: false,
                    skipped: false
                });
            }
        }
    }

    // Sort by urgency: closer exam date first, then harder topics first
    allSlots.sort((a, b) => {
        const dateA = new Date(a.examDate || '9999');
        const dateB = new Date(b.examDate || '9999');
        if (dateA - dateB !== 0) return dateA - dateB;
        const diff = { Hard: 0, Medium: 1, Easy: 2 };
        return diff[a.difficulty] - diff[b.difficulty];
    });

    // Distribute slots across days
    let currentDate = new Date(startDate);
    let dayMinutes = 0;
    let daySlots = [];
    let startTime = 9;

    for (const slot of allSlots) {
        const slotMins = slot.duration || 60;

        if (dayMinutes + slotMins > effectiveDaily * 60) {
            // Save current day and start a new one
            if (daySlots.length > 0) {
                schedule.push({ date: currentDate.toISOString().split('T')[0], slots: [...daySlots] });
            }
            currentDate.setDate(currentDate.getDate() + 1);
            dayMinutes = 0;
            daySlots = [];
            startTime = 9;
        }

        const startHour = Math.floor(startTime);
        const startMin = Math.round((startTime % 1) * 60);
        const timeStr = `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;
        const endTime = startTime + (slotMins / 60);
        const endHour = Math.floor(endTime);
        const endMin = Math.round((endTime % 1) * 60);
        const endStr = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;

        daySlots.push({
            ...slot,
            startTime: timeStr,
            endTime: endStr,
            duration: slotMins
        });

        dayMinutes += slotMins;
        startTime = endTime + (15 / 60); // 15 min break
    }

    // Push remaining day
    if (daySlots.length > 0) {
        schedule.push({ date: currentDate.toISOString().split('T')[0], slots: [...daySlots] });
    }

    return schedule;
};

/* ══════════════════════════════════════════════
   STEP 3 — RENDERED SCHEDULE
   ══════════════════════════════════════════════ */

const setupStep2Events = () => { };

const setupStep3Events = () => {
    // View tabs
    document.querySelectorAll('.schedule-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.schedule-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const view = tab.dataset.view;
            document.getElementById('weekly-view').style.display = view === 'weekly' ? 'block' : 'none';
            document.getElementById('daily-view').style.display = view === 'daily' ? 'block' : 'none';
        });
    });

    // Recalculate button
    const recalc = document.getElementById('recalculate-btn');
    if (recalc) recalc.addEventListener('click', () => {
        if (parsedCourses.length === 0) {
            showToast('No courses — upload a syllabus first!', 'warning');
            return;
        }
        // Re-generate with existing settings
        const dailyHours = parseInt(document.getElementById('parsed-daily-hours')?.value || 4);
        generatedSchedule = generateAISchedule(parsedCourses, dailyHours, getToday(), 'Balanced');
        saveData(KEYS.SCHEDULE, generatedSchedule);
        renderStep3();
        showToast('Schedule recalculated! 🔄', 'success');
    });
};

const renderStep3 = () => {
    renderWeeklyView();
    renderDailyView();
    renderTopicTracker();
    renderSmartWarnings();
};

/* ── Weekly View ── */
const renderWeeklyView = () => {
    const container = document.getElementById('weekly-view');
    if (!container) return;

    const schedule = getData(KEYS.SCHEDULE, []);

    if (schedule.length === 0) {
        container.innerHTML = '<div class="empty-state" style="padding:32px;"><span class="empty-state-icon">📅</span><p class="text-muted">No schedule generated yet</p></div>';
        return;
    }

    container.innerHTML = schedule.map(day => {
        const dayLabel = new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        const isToday = day.date === getToday();

        return `
            <div class="day-section ${isToday ? 'today' : ''}">
                <h4 class="day-label">${dayLabel} ${isToday ? '(Today)' : ''}</h4>
                ${day.slots.map(slot => {
            const totalTopics = parsedCourses.find(c => c.courseId === slot.courseId)?.topics.length || 1;
            const pct = Math.round((1 / totalTopics) * 100);
            return `
                        <div class="schedule-block ${slot.completed ? 'completed' : ''} ${slot.skipped ? 'skipped' : ''}">
                            <span class="timeline-dot" style="background:${slot.subjectColor}"></span>
                            <div style="flex:1;">
                                <div style="font-weight:600;font-size:0.88rem;">${slot.topicName}</div>
                                <div style="font-size:0.75rem;color:var(--text-muted);">${slot.subjectName} · ${slot.unit}</div>
                                <div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px;">
                                    ~${pct}% of course · ${slot.startTime} – ${slot.endTime}
                                    <span class="pill pill-${slot.difficulty === 'Hard' ? 'red' : slot.difficulty === 'Easy' ? 'green' : 'yellow'}" style="font-size:0.65rem;">${slot.difficulty}</span>
                                </div>
                            </div>
                            <div class="schedule-actions" style="display:flex;gap:6px;">
                                ${!slot.completed && !slot.skipped ? `
                                    <button class="btn btn-sm btn-success" onclick="markSlotDone('${day.date}', '${slot.topicId}')">✓ Done</button>
                                    <button class="btn btn-sm btn-secondary" onclick="skipSlot('${day.date}', '${slot.topicId}')">↻ Skip</button>
                                ` : ''}
                                ${slot.completed ? '<span class="pill pill-green">✓ Done</span>' : ''}
                                ${slot.skipped ? '<span class="pill pill-gray">Skipped</span>' : ''}
                            </div>
                        </div>
                    `;
        }).join('')}
            </div>
        `;
    }).join('');
};

/* ── Daily View ── */
const renderDailyView = () => {
    const container = document.getElementById('daily-view');
    if (!container) return;

    const schedule = getData(KEYS.SCHEDULE, []);
    const today = getToday();
    const todaySchedule = schedule.find(d => d.date === today);

    if (!todaySchedule || todaySchedule.slots.length === 0) {
        container.innerHTML = '<div class="empty-state" style="padding:32px;"><span class="empty-state-icon">📆</span><p class="text-muted">No study blocks for today</p></div>';
        return;
    }

    container.innerHTML = todaySchedule.slots.map(slot => `
        <div class="timeline-item ${slot.completed ? 'completed' : ''}">
            <span class="timeline-dot" style="background:${slot.subjectColor}"></span>
            <span class="timeline-time">${slot.startTime}</span>
            <div class="timeline-content" style="flex:1;">
                <h4>${slot.topicName}</h4>
                <p>${slot.subjectName} · ${slot.duration} min · ${slot.difficulty}</p>
            </div>
            ${!slot.completed && !slot.skipped ? `
                <button class="btn btn-sm btn-success" onclick="markSlotDone('${today}', '${slot.topicId}')">✓</button>
            ` : ''}
            ${slot.completed ? '<span class="pill pill-green">✓</span>' : ''}
        </div>
    `).join('');
};

/* ── Topic Completion Tracker ── */
const renderTopicTracker = () => {
    const container = document.getElementById('topic-tracker');
    if (!container) return;

    if (parsedCourses.length === 0) {
        container.innerHTML = '<p class="text-muted" style="padding:16px;">No courses yet</p>';
        return;
    }

    const schedule = getData(KEYS.SCHEDULE, []);
    const completedTopicIds = new Set();
    schedule.forEach(day => day.slots.forEach(slot => {
        if (slot.completed) completedTopicIds.add(slot.topicId);
    }));

    container.innerHTML = parsedCourses.map(course => {
        const total = course.topics.length;
        const done = course.topics.filter(t => completedTopicIds.has(t.id) || t.completed).length;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;

        // Group by unit
        const units = {};
        course.topics.forEach(t => {
            if (!units[t.unit]) units[t.unit] = [];
            units[t.unit].push(t);
        });

        return `
            <div style="margin-bottom:20px;">
                <div class="flex-between" style="margin-bottom:8px;">
                    <span style="font-weight:700;font-size:0.88rem;">${course.courseName}</span>
                    <span class="pill pill-blue">${pct}% 📚</span>
                </div>
                <div style="height:6px;background:var(--border);border-radius:4px;margin-bottom:12px;">
                    <div style="height:100%;background:${course.color};border-radius:4px;width:${pct}%;transition:width 0.5s;"></div>
                </div>
                ${Object.entries(units).map(([unit, topics]) => {
            const unitDone = topics.filter(t => completedTopicIds.has(t.id) || t.completed).length;
            return `
                        <div style="margin-bottom:6px;">
                            <span style="font-size:0.78rem;font-weight:600;color:var(--text-muted);">${unit}: ${unitDone}/${topics.length}</span>
                            <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">
                                ${topics.map(t => `
                                    <span class="pill ${completedTopicIds.has(t.id) || t.completed ? 'pill-green' : 'pill-gray'}" style="font-size:0.65rem;">
                                        ${completedTopicIds.has(t.id) || t.completed ? '✓' : '○'} ${t.name.substring(0, 25)}
                                    </span>
                                `).join('')}
                            </div>
                        </div>
                    `;
        }).join('')}
            </div>
        `;
    }).join('');
};

/* ── Smart Warnings ── */
const renderSmartWarnings = () => {
    const container = document.getElementById('smart-warnings');
    if (!container) return;

    container.innerHTML = '';

    for (const course of parsedCourses) {
        const schedule = getData(KEYS.SCHEDULE, []);
        const completedIds = new Set();
        schedule.forEach(d => d.slots.forEach(s => { if (s.completed) completedIds.add(s.topicId); }));

        const remaining = course.topics.filter(t => !completedIds.has(t.id) && !t.completed).length;
        const daysUntilExam = Math.ceil((new Date(course.examDate) - new Date()) / (1000 * 60 * 60 * 24));

        if (daysUntilExam <= 7 && remaining > 0) {
            container.innerHTML += `
                <div class="smart-warning warning-critical">
                    <span>🚨</span>
                    <div>
                        <strong>${course.courseName}:</strong> ${remaining} topics remaining with only ${daysUntilExam} days until exam!
                        <button class="btn btn-sm btn-danger" style="margin-left:8px;" onclick="switchIntensiveMode()">Switch to Intensive</button>
                    </div>
                </div>`;
        } else if (daysUntilExam <= 14 && remaining > daysUntilExam) {
            container.innerHTML += `
                <div class="smart-warning warning-caution">
                    <span>⚠️</span>
                    <div>
                        <strong>${course.courseName}:</strong> At current pace, you'll cover ~${Math.round(((course.topics.length - remaining) / course.topics.length) * 100)}% before your exam. Consider adding more hours.
                    </div>
                </div>`;
        }
    }
};

const switchIntensiveMode = () => {
    if (parsedCourses.length === 0) return;
    generatedSchedule = generateAISchedule(parsedCourses, 6, getToday(), 'Intensive');
    saveData(KEYS.SCHEDULE, generatedSchedule);
    renderStep3();
    showToast('🔥 Switched to Intensive mode!', 'success');
};

/* ── Mark Slot Done / Skip ── */
const markSlotDone = (date, topicId) => {
    let schedule = getData(KEYS.SCHEDULE, []);
    const day = schedule.find(d => d.date === date);
    if (!day) return;
    const slot = day.slots.find(s => s.topicId === topicId);
    if (!slot) return;

    slot.completed = true;

    // Also mark topic completed in course data
    for (const course of parsedCourses) {
        const topic = course.topics.find(t => t.id === topicId);
        if (topic) { topic.completed = true; break; }
    }

    saveData(KEYS.SCHEDULE, schedule);
    saveData(COURSE_KEY, parsedCourses);

    // Track study hours
    const totalH = getData(KEYS.TOTAL_STUDY_HOURS, 0);
    saveData(KEYS.TOTAL_STUDY_HOURS, totalH + ((slot.duration || 60) / 60));

    if (typeof awardXP === 'function') awardXP(20, 'Study block completed! 📚');

    renderStep3();
};

const skipSlot = (date, topicId) => {
    let schedule = getData(KEYS.SCHEDULE, []);
    const day = schedule.find(d => d.date === date);
    if (!day) return;
    const slot = day.slots.find(s => s.topicId === topicId);
    if (slot) slot.skipped = true;

    saveData(KEYS.SCHEDULE, schedule);
    showToast('Slot skipped — it\'ll be redistributed', 'info');
    renderStep3();
};

/* ══════════════════════════════════════════════
   WIZARD STEP NAVIGATION
   ══════════════════════════════════════════════ */

const goToStep = (step) => {
    wizardStep = step;

    // Update stepper
    document.querySelectorAll('.stepper-step').forEach(el => {
        const s = parseInt(el.dataset.step);
        el.classList.toggle('active', s === step);
        el.classList.toggle('done', s < step);
    });

    // Show/hide step panels
    document.getElementById('step-1-panel').style.display = step === 1 ? 'block' : 'none';
    document.getElementById('step-2-panel').style.display = step === 2 ? 'block' : 'none';
    document.getElementById('step-3-panel').style.display = step === 3 ? 'block' : 'none';

    if (step === 3) renderStep3();
};

/* ── Course List Sidebar ── */
const renderCourseList = () => {
    const container = document.getElementById('course-list');
    if (!container) return;

    if (parsedCourses.length === 0) {
        container.innerHTML = '<p class="text-muted" style="font-size:0.82rem;padding:8px;">No courses added yet</p>';
        return;
    }

    container.innerHTML = parsedCourses.map(c => `
        <div class="course-pill" style="border-left:3px solid ${c.color};padding:8px 12px;background:var(--bg-primary);border-radius:8px;margin-bottom:6px;">
            <div style="font-weight:600;font-size:0.82rem;">${c.courseName}</div>
            <div style="font-size:0.72rem;color:var(--text-muted);">${c.topics.length} topics · Exam: ${formatDate(c.examDate)}</div>
        </div>
    `).join('');
};

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('planner-page')) initPlanner();
});
