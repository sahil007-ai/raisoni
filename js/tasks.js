/**
 * ============================================
 * Plan4U — tasks.js
 * Task CRUD operations with Verification System.
 * Users must verify task completion via URL proof
 * or media upload before earning full XP.
 * Now with backend API sync support.
 * ============================================
 */

/* ── Initialize Tasks Page ── */
const initTasks = () => {
    renderTasks();
    setupTaskEvents();
};

/* ── Setup Event Listeners ── */
const setupTaskEvents = () => {
    const addBtn = document.getElementById('add-task-btn');
    if (addBtn) addBtn.addEventListener('click', () => openTaskModal());

    const saveBtn = document.getElementById('save-task-btn');
    if (saveBtn) saveBtn.addEventListener('click', saveTask);

    document.querySelectorAll('.modal-close, .modal-cancel').forEach(el => {
        el.addEventListener('click', closeTaskModal);
    });

    const overlay = document.getElementById('task-modal-overlay');
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeTaskModal();
        });
    }

    document.querySelectorAll('.task-filter').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.task-filter').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            renderTasks();
        });
    });

    setupVerificationModal();
};

/* ══════════════════════════════════════════════
   VERIFICATION MODAL SYSTEM
   ══════════════════════════════════════════════ */

let verifyingTaskId = null;
let verificationProof = { type: null, value: null };

const setupVerificationModal = () => {
    const vOverlay = document.getElementById('verify-modal-overlay');
    if (vOverlay) {
        vOverlay.addEventListener('click', (e) => {
            if (e.target === vOverlay) closeVerifyModal();
        });
    }
    document.querySelectorAll('.verify-modal-close').forEach(el => {
        el.addEventListener('click', closeVerifyModal);
    });

    document.querySelectorAll('.verify-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.verify-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const view = tab.dataset.tab;
            document.getElementById('verify-url-panel').style.display = view === 'url' ? 'block' : 'none';
            document.getElementById('verify-media-panel').style.display = view === 'media' ? 'block' : 'none';
            verificationProof = { type: null, value: null };
            updateVerifyButton();
        });
    });

    const urlInput = document.getElementById('verify-url-input');
    if (urlInput) {
        urlInput.addEventListener('input', () => {
            const val = urlInput.value.trim();
            const isValid = isValidURL(val);
            const status = document.getElementById('url-status');
            const preview = document.getElementById('url-preview');

            if (val.length === 0) {
                status.textContent = '';
                preview.style.display = 'none';
                verificationProof = { type: null, value: null };
            } else if (isValid) {
                status.innerHTML = '<span style="color:var(--accent-green)">✅ Valid URL</span>';
                const domain = new URL(val).hostname;
                preview.style.display = 'flex';
                preview.innerHTML = `
                    <img src="https://www.google.com/s2/favicons?domain=${domain}&sz=32" 
                         alt="" style="width:20px;height:20px;border-radius:4px;" onerror="this.style.display='none'">
                    <div>
                        <div style="font-weight:600;font-size:0.82rem;">${domain}</div>
                        <div style="font-size:0.72rem;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:220px;">${val}</div>
                    </div>
                `;
                verificationProof = { type: 'url', value: val };
            } else {
                status.innerHTML = '<span style="color:var(--accent-red)">✗ Invalid URL format</span>';
                preview.style.display = 'none';
                verificationProof = { type: null, value: null };
            }
            updateVerifyButton();
        });
    }

    const dropZone = document.getElementById('verify-drop-zone');
    const fileInput = document.getElementById('verify-file-input');

    if (dropZone && fileInput) {
        dropZone.addEventListener('click', () => fileInput.click());

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            if (e.dataTransfer.files.length) handleVerifyFile(e.dataTransfer.files[0]);
        });

        fileInput.addEventListener('change', () => {
            if (fileInput.files.length) handleVerifyFile(fileInput.files[0]);
        });
    }

    const verifyBtn = document.getElementById('verify-complete-btn');
    if (verifyBtn) verifyBtn.addEventListener('click', executeVerification);

    const reflectionInput = document.getElementById('verify-reflection');
    if (reflectionInput) reflectionInput.addEventListener('input', updateVerifyButton);

    const skipLink = document.getElementById('skip-verification-link');
    if (skipLink) skipLink.addEventListener('click', showSkipConfirm);

    const skipAnywayBtn = document.getElementById('skip-anyway-btn');
    const goBackBtn = document.getElementById('go-back-btn');
    if (skipAnywayBtn) skipAnywayBtn.addEventListener('click', skipVerification);
    if (goBackBtn) goBackBtn.addEventListener('click', () => {
        document.getElementById('skip-confirm').style.display = 'none';
    });
};

/* ── URL Validation ── */
const isValidURL = (str) => {
    try {
        const url = new URL(str);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
};

/* ── Handle File Upload for Verification ── */
const handleVerifyFile = (file) => {
    if (file.size > 10 * 1024 * 1024) {
        showToast('File too large! Max 10MB allowed.', 'error');
        return;
    }

    const accepted = ['image/', 'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const isAccepted = accepted.some(t => file.type.startsWith(t));

    if (!isAccepted && !file.name.match(/\.(pdf|doc|docx|jpg|jpeg|png|gif|webp)$/i)) {
        showToast('Unsupported file type', 'warning');
        return;
    }

    const previewContainer = document.getElementById('file-preview');
    previewContainer.style.display = 'block';

    if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            previewContainer.innerHTML = `
                <div class="file-preview-card">
                    <img src="${e.target.result}" alt="Preview" 
                         style="width:100%;max-height:120px;object-fit:cover;border-radius:8px;margin-bottom:8px;">
                    <div class="flex-between">
                        <span style="font-size:0.78rem;font-weight:600;">${file.name}</span>
                        <button class="btn-icon" onclick="removeVerifyFile()" title="Remove">✕</button>
                    </div>
                    <span style="font-size:0.7rem;color:var(--text-muted);">${(file.size / 1024).toFixed(1)} KB</span>
                </div>
            `;
        };
        reader.readAsDataURL(file);
    } else {
        const icon = file.name.endsWith('.pdf') ? '📄' : '📝';
        previewContainer.innerHTML = `
            <div class="file-preview-card">
                <div style="display:flex;align-items:center;gap:10px;">
                    <span style="font-size:2rem;">${icon}</span>
                    <div>
                        <div style="font-size:0.82rem;font-weight:600;">${file.name}</div>
                        <div style="font-size:0.72rem;color:var(--text-muted);">${(file.size / 1024).toFixed(1)} KB</div>
                    </div>
                </div>
                <button class="btn-icon" onclick="removeVerifyFile()" title="Remove" style="margin-top:8px;">✕</button>
            </div>
        `;
    }

    verificationProof = { type: 'media', value: file.name };
    updateVerifyButton();
};

/* ── Remove uploaded file ── */
const removeVerifyFile = () => {
    const previewContainer = document.getElementById('file-preview');
    previewContainer.style.display = 'none';
    previewContainer.innerHTML = '';
    document.getElementById('verify-file-input').value = '';
    verificationProof = { type: null, value: null };
    updateVerifyButton();
};

/* ── Update Verify Button State ── */
const updateVerifyButton = () => {
    const btn = document.getElementById('verify-complete-btn');
    if (!btn) return;

    const hasProof = verificationProof.type !== null;
    btn.disabled = !hasProof;
    btn.classList.toggle('btn-disabled', !hasProof);

    if (hasProof) {
        let xpAmount = verificationProof.type === 'media' ? 150 : 100;

        const reflectionEl = document.getElementById('verify-reflection');
        if (reflectionEl && reflectionEl.value.trim().length > 5) {
            xpAmount += 20;
        }

        btn.textContent = `Verify & Earn ${xpAmount} XP 🌟`;
    } else {
        btn.textContent = 'Upload proof to verify ✓';
    }
};

/* ── Open Verification Modal ── */
const openVerifyModal = (taskId) => {
    verifyingTaskId = taskId;
    verificationProof = { type: null, value: null };

    document.getElementById('verify-url-input').value = '';
    document.getElementById('url-status').textContent = '';
    document.getElementById('url-preview').style.display = 'none';
    document.getElementById('file-preview').style.display = 'none';
    document.getElementById('file-preview').innerHTML = '';
    document.getElementById('verify-file-input').value = '';
    const reflectionEl = document.getElementById('verify-reflection');
    if (reflectionEl) reflectionEl.value = '';
    document.getElementById('skip-confirm').style.display = 'none';
    document.getElementById('verify-loading').style.display = 'none';
    document.getElementById('verify-success').style.display = 'none';
    document.getElementById('verify-content').style.display = 'block';

    document.querySelectorAll('.verify-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.verify-tab[data-tab="url"]').classList.add('active');
    document.getElementById('verify-url-panel').style.display = 'block';
    document.getElementById('verify-media-panel').style.display = 'none';

    updateVerifyButton();

    document.getElementById('verify-modal-overlay').classList.add('active');
};

/* ── Close Verification Modal ── */
const closeVerifyModal = () => {
    document.getElementById('verify-modal-overlay').classList.remove('active');
    verifyingTaskId = null;
    verificationProof = { type: null, value: null };
};

/* ── Ollama Verification ── */
const checkProofWithOllama = async (taskName, proofType, proofValue, reflection) => {
    if (!reflection || reflection.length < 5) return null;

    try {
        const prompt = `You are a strict but encouraging study coach AI. 
The student just completed a task: "${taskName}".
They provided a ${proofType} proof of work: "${proofValue}".
Here is their personal reflection on what they learned:
"${reflection}"

Analyze their reflection. Does it sound genuine? Does it relate to the task?
Return exactly a JSON object, no markdown wrappers (no \`\`\`json), with:
{
  "valid": true | false,
  "bonusXP": <integer between 0 and 50 based on quality>,
  "aiMessage": "Short feedback message in 1 sentence for the student."
}`;

        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'qwen2.5:7b',
                prompt: prompt,
                stream: false,
                format: 'json'
            })
        });

        if (!response.ok) throw new Error('Ollama error');

        const data = await response.json();
        return JSON.parse(data.response);
    } catch (e) {
        console.error('Ollama verification fallback active:', e);
        return null;
    }
};

/* ── Execute Verification (with Ollama Local Model) ── */
const executeVerification = async () => {
    if (!verificationProof.type || !verifyingTaskId) return;

    const content = document.getElementById('verify-content');
    const loading = document.getElementById('verify-loading');
    const success = document.getElementById('verify-success');

    content.style.display = 'none';
    loading.style.display = 'flex';

    let tasks = getData(KEYS.TASKS, []);
    const task = tasks.find(t => t.id === verifyingTaskId);
    const taskName = task ? task.name : 'Unknown Task';

    const reflectionEl = document.getElementById('verify-reflection');
    const reflectionText = reflectionEl ? reflectionEl.value.trim() : '';

    let baseXP = verificationProof.type === 'media' ? 150 : 100;
    let finalXP = baseXP;
    let hasReflection = false;

    // Call Ollama
    const oResult = await checkProofWithOllama(taskName, verificationProof.type, verificationProof.value, reflectionText);

    loading.style.display = 'none';
    success.style.display = 'flex';

    if (oResult) {
        if (!oResult.valid) {
            showToast('AI Coach: ' + oResult.aiMessage, 'warning');
            finalXP = baseXP; // No bonus for poor reflection
        } else {
            finalXP = baseXP + (oResult.bonusXP || 20);
            hasReflection = true;
            verificationProof.reflection = reflectionText;
            showToast('AI Coach: ' + (oResult.aiMessage || 'Great work!'), 'info');
        }
    } else {
        // Fallback to simple simulated behavior
        if (reflectionText.length > 5) {
            finalXP += 20;
            verificationProof.reflection = reflectionText;
            hasReflection = true;
        }
    }

    const xpEl = document.getElementById('verify-xp-earned');
    if (xpEl) xpEl.textContent = `+${finalXP} XP`;

    setTimeout(() => {
        markTaskVerified(verifyingTaskId, verificationProof, finalXP, hasReflection);
        closeVerifyModal();
    }, 1500);
};

/* ── Mark Task as Verified and Complete ── */
const markTaskVerified = (taskId, proof, xpAmount, hasReflection = false) => {
    let tasks = getData(KEYS.TASKS, []);
    const task = tasks.find(t => t.id === taskId);

    if (task && !task.completed) {
        task.completed = true;
        task.completedAt = new Date().toISOString();
        task.proof = {
            type: proof.type,
            value: proof.value,
            reflection: proof.reflection || null,
            verifiedAt: new Date().toISOString()
        };
        saveData(KEYS.TASKS, tasks);

        // Sync to backend
        if (typeof updateTaskInApi === 'function') {
            updateTaskInApi(taskId, task);
        }

        let reason = proof.type === 'media'
            ? '📎 Media proof accepted!' : '🔗 URL proof accepted!';

        if (hasReflection) reason += ' (+20 XP Reflection)';

        if (typeof awardXP === 'function') awardXP(xpAmount, reason);

        if (typeof fireConfetti === 'function') {
            fireConfetti(window.innerWidth / 2, window.innerHeight / 2);
        }

        renderTasks();
    }
};

/* ── Show Skip Confirmation ── */
const showSkipConfirm = () => {
    document.getElementById('skip-confirm').style.display = 'block';
};

/* ── Skip Verification — award reduced XP ── */
const skipVerification = () => {
    if (!verifyingTaskId) return;

    let tasks = getData(KEYS.TASKS, []);
    const task = tasks.find(t => t.id === verifyingTaskId);

    if (task && !task.completed) {
        task.completed = true;
        task.completedAt = new Date().toISOString();
        task.proof = { type: 'skipped', value: null, verifiedAt: new Date().toISOString() };
        saveData(KEYS.TASKS, tasks);

        // Sync to backend
        if (typeof updateTaskInApi === 'function') {
            updateTaskInApi(verifyingTaskId, task);
        }

        if (typeof awardXP === 'function') {
            awardXP(25, 'Complete with proof next time for full XP!');
        }

        renderTasks();
    }

    closeVerifyModal();
};

/* ══════════════════════════════════════════════
   TASK CRUD OPERATIONS
   ══════════════════════════════════════════════ */

let editingTaskId = null;

const openTaskModal = (taskId = null) => {
    const overlay = document.getElementById('task-modal-overlay');
    const title = document.getElementById('modal-title');

    if (taskId) {
        editingTaskId = taskId;
        const tasks = getData(KEYS.TASKS, []);
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            document.getElementById('task-name').value = task.name;
            document.getElementById('task-subject').value = task.subject || '';
            document.getElementById('task-due-date').value = task.dueDate || '';
            document.getElementById('task-priority').value = task.priority || 'Medium';
            document.getElementById('task-notes').value = task.notes || '';
            title.textContent = '✏️ Edit Task';
        }
    } else {
        editingTaskId = null;
        document.getElementById('task-name').value = '';
        document.getElementById('task-subject').value = '';
        document.getElementById('task-due-date').value = '';
        document.getElementById('task-priority').value = 'Medium';
        document.getElementById('task-notes').value = '';
        title.textContent = '📝 Add New Task';
    }

    populateSubjectDropdown();
    overlay.classList.add('active');
};

const closeTaskModal = () => {
    document.getElementById('task-modal-overlay').classList.remove('active');
    editingTaskId = null;
};

const populateSubjectDropdown = () => {
    const select = document.getElementById('task-subject');
    if (!select) return;
    const subjects = getData(KEYS.SUBJECTS, []);
    select.innerHTML = '<option value="">Select Subject</option>' +
        subjects.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
};

const saveTask = () => {
    const name = document.getElementById('task-name')?.value.trim();
    const subject = document.getElementById('task-subject')?.value || '';
    const dueDate = document.getElementById('task-due-date')?.value || '';
    const priority = document.getElementById('task-priority')?.value || 'Medium';
    const notes = document.getElementById('task-notes')?.value || '';

    if (!name) { showToast('Please enter a task name', 'warning'); return; }

    let tasks = getData(KEYS.TASKS, []);

    if (editingTaskId) {
        const idx = tasks.findIndex(t => t.id === editingTaskId);
        if (idx > -1) {
            tasks[idx] = { ...tasks[idx], name, subject, dueDate, priority, notes };
            // Sync update to backend
            if (typeof updateTaskInApi === 'function') {
                updateTaskInApi(editingTaskId, tasks[idx]);
            }
        }
        showToast('Task updated! ✏️', 'info');
    } else {
        const newTask = {
            id: generateId(), name, subject, dueDate, priority,
            completed: false, completedAt: null, notes, proof: null
        };
        tasks.push(newTask);
        // Sync new task to backend
        if (typeof saveTaskToApi === 'function') {
            saveTaskToApi(newTask);
        }
        showToast('Task added! 📝', 'success');
    }

    saveData(KEYS.TASKS, tasks);
    closeTaskModal();
    renderTasks();
};

/* ── Complete Task — opens verification modal ── */
const completeTask = (taskId, event) => {
    openVerifyModal(taskId);
};

const deleteTask = (taskId) => {
    let tasks = getData(KEYS.TASKS, []);
    tasks = tasks.filter(t => t.id !== taskId);
    saveData(KEYS.TASKS, tasks);

    // Sync delete to backend
    if (typeof deleteTaskFromApi === 'function') {
        deleteTaskFromApi(taskId);
    }

    showToast('Task deleted 🗑️', 'info');
    renderTasks();
};

/* ══════════════════════════════════════════════
   RENDER TASKS
   ══════════════════════════════════════════════ */

const renderTasks = () => {
    const container = document.getElementById('task-list');
    if (!container) return;

    let tasks = getData(KEYS.TASKS, []);
    const activeFilter = document.querySelector('.task-filter.active')?.dataset.filter || 'all';
    const today = getToday();

    let filtered = [...tasks];
    switch (activeFilter) {
        case 'today':
            filtered = tasks.filter(t => t.dueDate === today && !t.completed);
            break;
        case 'week': {
            const weekEnd = new Date();
            weekEnd.setDate(weekEnd.getDate() + 7);
            const weekEndStr = weekEnd.toISOString().split('T')[0];
            filtered = tasks.filter(t => t.dueDate >= today && t.dueDate <= weekEndStr && !t.completed);
            break;
        }
        case 'overdue':
            filtered = tasks.filter(t => t.dueDate && t.dueDate < today && !t.completed);
            break;
        case 'completed':
            filtered = tasks.filter(t => t.completed);
            break;
        default:
            filtered = tasks;
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-shape">📚</div>
                <h3>No tasks ${activeFilter !== 'all' ? 'in this filter' : 'yet'}</h3>
                <p>Add your first task above to get started! 📝</p>
            </div>`;
        return;
    }

    const priorityOrder = { High: 0, Medium: 1, Low: 2 };
    filtered.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        if (priorityOrder[a.priority] !== priorityOrder[b.priority])
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        return new Date(a.dueDate || '9999') - new Date(b.dueDate || '9999');
    });

    container.innerHTML = filtered.map(task => {
        const isOverdue = task.dueDate && task.dueDate < today && !task.completed;
        const subjects = getData(KEYS.SUBJECTS, []);
        const subjectObj = subjects.find(s => s.name === task.subject);
        const subjectColor = subjectObj?.color || 'var(--accent-blue)';

        let proofBadge = '';
        if (task.completed && task.proof) {
            const timeAgo = getTimeAgo(task.proof.verifiedAt || task.completedAt);
            if (task.proof.type === 'url') {
                proofBadge = `<span class="pill pill-blue">🔗 URL Verified</span><span class="pill pill-gray">${timeAgo}</span>`;
            } else if (task.proof.type === 'media') {
                proofBadge = `<span class="pill pill-green">📎 Media Verified</span><span class="pill pill-gray">${timeAgo}</span>`;
            } else {
                proofBadge = `<span class="pill pill-gray">⚡ Quick Complete</span><span class="pill pill-gray">${timeAgo}</span>`;
            }
        }

        return `
            <div class="task-card priority-${task.priority?.toLowerCase()} ${task.completed ? 'completed' : ''} fade-in-up">
                <div class="task-card-header">
                    <span class="task-name">${task.name}</span>
                    <div class="task-actions">
                        ${!task.completed ? `<button class="btn btn-sm btn-success" onclick="completeTask('${task.id}', event)">✓ Complete</button>` : ''}
                        <button class="btn-icon" onclick="openTaskModal('${task.id}')" title="Edit">✏️</button>
                        <button class="btn-icon" onclick="deleteTask('${task.id}')" title="Delete">🗑️</button>
                    </div>
                </div>
                <div class="task-meta">
                    ${task.subject ? `<span class="pill" style="background:${subjectColor}20;color:${subjectColor}">${task.subject}</span>` : ''}
                    ${task.dueDate ? `<span class="pill pill-gray">${formatDate(task.dueDate)}</span>` : ''}
                    ${isOverdue ? '<span class="overdue-badge">⚠️ Overdue</span>' : ''}
                    <span class="pill pill-${task.priority === 'High' ? 'red' : task.priority === 'Low' ? 'green' : 'yellow'}">${task.priority}</span>
                    ${proofBadge}
                </div>
            </div>`;
    }).join('');
};

/* ── Time ago helper ── */
const getTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
};

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('tasks-page')) initTasks();
});
