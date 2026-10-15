/**
 * Main Frontend Application Controller
 * Handles subject/unit/topic CRUD, bidirectional progress tracking,
 * and dashboard analytics synchronization.
 */

const App = {
  currentSubjectModalMode: 'create', // 'create' | 'edit'
  activeSubjectIdForModal: null,

  init() {
    this.bindNavigation();
    this.bindSubjectEvents();
    this.bindDataManagement();
    this.setMinDateAttributes();

    // Initialize modules
    TimetableManager.init();
    ChatManager.init();

    // Check if user has initialized state before; if not, load starter sample data
    const existing = StorageManager.getSubjects();
    if (existing.length === 0 && !StorageManager.isInitialized()) {
      StorageManager.loadSampleData();
    }

    this.renderSyllabusList();
    this.updateDashboardMetrics();
    this.initSettingsInputs();
  },

  setMinDateAttributes() {
    const todayStr = new Date().toISOString().split('T')[0];
    const examDateInput = document.getElementById('subject-exam-date');
    const startDateInput = document.getElementById('start-date-input');
    if (examDateInput) {
      examDateInput.min = todayStr;
    }
    if (startDateInput) {
      startDateInput.value = StorageManager.getStartDate() || todayStr;
      startDateInput.min = todayStr;
    }
  },

  initSettingsInputs() {
    const dailyInput = document.getElementById('daily-hours-input');
    if (dailyInput) {
      dailyInput.value = StorageManager.getDailyHours();
      dailyInput.addEventListener('change', (e) => {
        const val = parseFloat(e.target.value);
        if (!isNaN(val) && val >= 0.5 && val <= 18) {
          StorageManager.saveDailyHours(val);
          this.updateDashboardMetrics();
          this.showToast(`Daily study target updated to ${val} hrs.`, 'info');
        } else {
          this.showToast('Please enter daily hours between 0.5 and 18.', 'error');
          dailyInput.value = StorageManager.getDailyHours();
        }
      });
    }

    const startInput = document.getElementById('start-date-input');
    if (startInput) {
      startInput.addEventListener('change', (e) => {
        if (e.target.value) {
          StorageManager.saveStartDate(e.target.value);
        }
      });
    }
  },

  bindNavigation() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabKey = btn.dataset.tab;
        this.switchTab(tabKey);
      });
    });
  },

  switchTab(tabKey) {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabKey);
    });

    tabPanes.forEach(pane => {
      pane.classList.toggle('active', pane.id === `tab-${tabKey}`);
    });

    if (tabKey === 'dashboard') {
      this.updateDashboardMetrics();
    } else if (tabKey === 'syllabus') {
      this.renderSyllabusList();
    } else if (tabKey === 'timetable') {
      const cached = StorageManager.getTimetable();
      if (cached) {
        TimetableManager.renderTimetable(cached);
      }
    }
  },

  bindSubjectEvents() {
    // Add Subject Button
    const addSubBtn = document.getElementById('open-add-subject-modal-btn');
    if (addSubBtn) {
      addSubBtn.addEventListener('click', () => this.openSubjectModal('create'));
    }

    // Modal close buttons
    const closeBtns = document.querySelectorAll('.modal-close-trigger');
    closeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
      });
    });

    // Subject Form Submit
    const subForm = document.getElementById('subject-form');
    if (subForm) {
      subForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSubjectSubmit();
      });
    }

    // Add Unit Row Button inside Subject Modal
    const addUnitRowBtn = document.getElementById('modal-add-unit-row-btn');
    if (addUnitRowBtn) {
      addUnitRowBtn.addEventListener('click', () => this.addUnitRowToModal());
    }
  },

  bindDataManagement() {
    // Reset Data
    const resetBtn = document.getElementById('reset-data-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset all subjects, timetables, and progress?')) {
          StorageManager.clearAllData();
          this.renderSyllabusList();
          this.updateDashboardMetrics();
          const ttContainer = document.getElementById('timetable-results-container');
          if (ttContainer) ttContainer.innerHTML = '';
          this.showToast('All local planner data has been reset.', 'info');
        }
      });
    }

    // Load Sample Course Data
    const sampleBtn = document.getElementById('load-sample-btn');
    if (sampleBtn) {
      sampleBtn.addEventListener('click', () => {
        StorageManager.loadSampleData();
        this.renderSyllabusList();
        this.updateDashboardMetrics();
        this.showToast('Sample university courses loaded!', 'success');
      });
    }

    // Export / Import
    const exportBtn = document.getElementById('export-data-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const json = StorageManager.exportData();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `study_planner_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.showToast('Study planner data downloaded.', 'success');
      });
    }

    const importInput = document.getElementById('import-file-input');
    if (importInput) {
      importInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
          const success = StorageManager.importData(evt.target.result);
          if (success) {
            this.renderSyllabusList();
            this.updateDashboardMetrics();
            TimetableManager.init();
            this.showToast('Planner data imported successfully!', 'success');
          } else {
            this.showToast('Failed to parse backup JSON file.', 'error');
          }
        };
        reader.readAsText(file);
      });
    }
  },

  openSubjectModal(mode, subjectId = null) {
    this.currentSubjectModalMode = mode;
    this.activeSubjectIdForModal = subjectId;

    const modal = document.getElementById('subject-modal');
    const modalTitle = document.getElementById('subject-modal-title');
    const nameInput = document.getElementById('subject-name');
    const codeInput = document.getElementById('subject-code');
    const examDateInput = document.getElementById('subject-exam-date');
    const unitsContainer = document.getElementById('modal-units-list');

    if (!modal) return;
    unitsContainer.innerHTML = '';

    if (mode === 'edit' && subjectId) {
      modalTitle.textContent = 'Edit Subject & Units';
      const subjects = StorageManager.getSubjects();
      const sub = subjects.find(s => s.id === subjectId);
      if (sub) {
        nameInput.value = sub.name;
        codeInput.value = sub.code || '';
        examDateInput.value = sub.examDate;
        (sub.units || []).forEach(unit => {
          this.addUnitRowToModal(unit);
        });
      }
    } else {
      modalTitle.textContent = 'Add New Subject & Units';
      nameInput.value = '';
      codeInput.value = '';
      examDateInput.value = '';
      this.addUnitRowToModal({ title: 'Unit 1: Fundamentals', difficulty: 'Easy', topics: [] });
      this.addUnitRowToModal({ title: 'Unit 2: Core Concepts', difficulty: 'Medium', topics: [] });
    }

    modal.classList.add('active');
  },

  addUnitRowToModal(unitData = null) {
    const container = document.getElementById('modal-units-list');
    if (!container) return;

    const rowId = 'unit_row_' + Math.random().toString(36).substring(2, 9);
    const titleVal = unitData?.title || '';
    const diffVal = unitData?.difficulty || 'Medium';

    const topics = Array.isArray(unitData?.topics) ? unitData.topics : [];
    const topicsStr = topics.map(t => typeof t === 'string' ? t : t.name).join(', ');

    const div = document.createElement('div');
    div.className = 'unit-item';
    div.id = rowId;
    div.dataset.unitId = unitData?.id || '';
    div.style.marginBottom = '0.75rem';
    div.innerHTML = `
      <div style="display: flex; gap: 0.5rem; margin-bottom: 0.4rem;">
        <input 
          type="text" 
          class="form-control unit-modal-title" 
          placeholder="Unit Title (e.g. Unit 1: Memory Management)" 
          value="${escapeHtml(titleVal)}" 
          required 
          style="flex: 2;"
        />
        <select class="form-control unit-modal-difficulty" style="flex: 1;">
          <option value="Easy" ${diffVal === 'Easy' ? 'selected' : ''}>Easy (1.0x)</option>
          <option value="Medium" ${diffVal === 'Medium' ? 'selected' : ''}>Medium (1.5x)</option>
          <option value="Hard" ${diffVal === 'Hard' ? 'selected' : ''}>Hard (2.0x)</option>
        </select>
        <button type="button" class="btn btn-danger-outline btn-sm" onclick="document.getElementById('${rowId}').remove()" title="Delete Unit">✕</button>
      </div>
      <input 
        type="text" 
        class="form-control unit-modal-topics" 
        placeholder="Key Topics separated by commas (e.g. Paging, Virtual Memory, TLB)" 
        value="${escapeHtml(topicsStr)}"
      />
    `;

    container.appendChild(div);
  },

  handleSubjectSubmit() {
    const nameInput = document.getElementById('subject-name');
    const codeInput = document.getElementById('subject-code');
    const examDateInput = document.getElementById('subject-exam-date');

    const name = nameInput.value.trim();
    const code = codeInput.value.trim();
    const examDate = examDateInput.value;

    if (!name) {
      this.showToast('Subject title is required.', 'error');
      return;
    }

    if (!examDate) {
      this.showToast('Exam date is required.', 'error');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (examDate < todayStr) {
      this.showToast('Exam date cannot be in the past.', 'error');
      return;
    }

    const unitRows = document.querySelectorAll('#modal-units-list .unit-item');
    if (unitRows.length === 0) {
      this.showToast('Please add at least one unit to this subject.', 'error');
      return;
    }

    // Retrieve existing subject if in edit mode to preserve completion statuses
    const existingSub = (this.currentSubjectModalMode === 'edit' && this.activeSubjectIdForModal)
      ? StorageManager.getSubjects().find(s => s.id === this.activeSubjectIdForModal)
      : null;

    const units = [];
    unitRows.forEach((row, idx) => {
      const title = row.querySelector('.unit-modal-title').value.trim();
      const difficulty = row.querySelector('.unit-modal-difficulty').value;
      const topicsRaw = row.querySelector('.unit-modal-topics').value.trim();
      const originalUnitId = row.dataset.unitId;

      const existingUnit = existingSub && Array.isArray(existingSub.units)
        ? existingSub.units.find(u => (originalUnitId && u.id === originalUnitId) || u.title.toLowerCase() === title.toLowerCase())
        : null;

      if (title) {
        let topicNames = topicsRaw ? topicsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
        if (topicNames.length === 0) {
          topicNames = [`${title} - Core Topics`];
        }

        const topics = topicNames.map(tName => {
          // Check if topic previously existed to preserve completed status & ID
          const existingTopic = existingUnit && Array.isArray(existingUnit.topics)
            ? existingUnit.topics.find(t => t.name.toLowerCase() === tName.toLowerCase())
            : null;

          return {
            id: existingTopic?.id || 'top_' + Math.random().toString(36).substring(2, 8),
            name: tName,
            difficulty: existingTopic?.difficulty || difficulty,
            estimatedHours: existingTopic?.estimatedHours || (difficulty === 'Hard' ? 2.5 : (difficulty === 'Medium' ? 1.5 : 1.0)),
            completed: existingTopic ? Boolean(existingTopic.completed) : false
          };
        });

        const unitCompleted = topics.length > 0 && topics.every(t => t.completed);

        units.push({
          id: existingUnit?.id || `unit_${idx + 1}_${Date.now()}`,
          title,
          difficulty,
          completed: unitCompleted,
          topics
        });
      }
    });

    if (units.length === 0) {
      this.showToast('All units must have a title.', 'error');
      return;
    }

    if (this.currentSubjectModalMode === 'edit' && this.activeSubjectIdForModal) {
      StorageManager.updateSubject(this.activeSubjectIdForModal, { name, code, examDate, units });
      this.showToast(`Updated "${name}".`, 'success');
    } else {
      StorageManager.addSubject({ name, code, examDate, units });
      this.showToast(`Subject "${name}" added successfully!`, 'success');
    }

    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
    this.renderSyllabusList();
    this.updateDashboardMetrics();
  },

  // --- Granular Syllabus Item Actions ---
  quickAddUnit(subjectId) {
    const title = prompt('Enter new Unit title (e.g., "Unit 4: Advanced Topics"):');
    if (!title || !title.trim()) return;

    const diff = prompt('Enter Unit Difficulty: "Easy", "Medium", or "Hard":', 'Medium');
    const validDiff = ['Easy', 'Medium', 'Hard'].includes(diff) ? diff : 'Medium';

    StorageManager.addUnitToSubject(subjectId, {
      title: title.trim(),
      difficulty: validDiff
    });

    this.renderSyllabusList();
    this.updateDashboardMetrics();
    this.showToast(`Unit "${title}" added.`, 'success');
  },

  quickDeleteUnit(subjectId, unitId, unitTitle) {
    if (confirm(`Delete unit "${unitTitle}" and all its topics?`)) {
      StorageManager.deleteUnitFromSubject(subjectId, unitId);
      this.renderSyllabusList();
      this.updateDashboardMetrics();
      this.showToast(`Deleted "${unitTitle}".`, 'info');
    }
  },

  quickAddTopic(subjectId, unitId) {
    const topicName = prompt('Enter new topic title:');
    if (!topicName || !topicName.trim()) return;

    const diff = prompt('Difficulty ("Easy", "Medium", "Hard"):', 'Medium');
    const validDiff = ['Easy', 'Medium', 'Hard'].includes(diff) ? diff : 'Medium';

    StorageManager.addTopicToUnit(subjectId, unitId, {
      name: topicName.trim(),
      difficulty: validDiff
    });

    this.renderSyllabusList();
    this.updateDashboardMetrics();
    this.showToast(`Topic "${topicName}" added.`, 'success');
  },

  quickDeleteTopic(subjectId, unitId, topicId, topicName) {
    if (confirm(`Delete topic "${topicName}"?`)) {
      StorageManager.deleteTopicFromUnit(subjectId, unitId, topicId);
      this.renderSyllabusList();
      this.updateDashboardMetrics();
      this.showToast(`Deleted topic "${topicName}".`, 'info');
    }
  },

  toggleTopicFromSyllabus(subjectName, unitTitle, topicName, isCompleted) {
    StorageManager.toggleTopicCompletion(subjectName, unitTitle, topicName, isCompleted);
    this.renderSyllabusList();
    this.updateDashboardMetrics();
    this.showToast(`"${topicName}" marked as ${isCompleted ? 'Completed' : 'Pending'}.`, 'info');
  },

  toggleUnitFromSyllabus(subjectId, unitId, isCompleted) {
    StorageManager.toggleUnitCompletion(subjectId, unitId, isCompleted);
    this.renderSyllabusList();
    this.updateDashboardMetrics();
    this.showToast(`Unit updated to ${isCompleted ? 'Completed' : 'Pending'}.`, 'info');
  },

  renderSyllabusList() {
    const container = document.getElementById('syllabus-cards-container');
    if (!container) return;

    const subjects = StorageManager.getSubjects();

    if (subjects.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📖</div>
          <h3>No Subjects Registered</h3>
          <p>Get started by creating your subjects, units and exam dates, or load sample college courses.</p>
          <div style="display: flex; gap: 0.75rem; justify-content: center;">
            <button class="btn btn-primary" onclick="App.openSubjectModal('create')">+ Add Your First Subject</button>
            <button class="btn btn-secondary" onclick="StorageManager.loadSampleData(); App.renderSyllabusList(); App.updateDashboardMetrics();">⚡ Load Demo Courses</button>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = subjects.map(sub => {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const examTime = new Date(sub.examDate);
      const daysUntil = Math.ceil((examTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const isUrgent = daysUntil <= 5;

      const unitsHtml = (sub.units || []).map(u => {
        const topicsList = (u.topics || []).map(t => {
          const diffClass = `badge-${(t.difficulty || 'medium').toLowerCase()}`;
          return `
            <div class="topic-pill-item ${t.completed ? 'completed' : ''}">
              <input 
                type="checkbox" 
                ${t.completed ? 'checked' : ''} 
                title="Mark completed"
                style="cursor: pointer; accent-color: var(--primary);"
                onchange="App.toggleTopicFromSyllabus('${escapeHtml(sub.name)}', '${escapeHtml(u.title)}', '${escapeHtml(t.name)}', this.checked)"
              />
              <span class="topic-name-label">${escapeHtml(t.name)}</span>
              <span class="badge ${diffClass}">${t.difficulty || 'Med'}</span>
              <button 
                class="topic-del-btn" 
                title="Delete Topic"
                onclick="App.quickDeleteTopic('${sub.id}', '${u.id}', '${t.id}', '${escapeHtml(t.name)}')"
              >×</button>
            </div>
          `;
        }).join('');

        return `
          <div class="unit-item">
            <div class="unit-header-row">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <input 
                  type="checkbox" 
                  ${u.completed ? 'checked' : ''} 
                  title="Mark all topics in unit complete"
                  style="cursor: pointer; accent-color: var(--primary);"
                  onchange="App.toggleUnitFromSyllabus('${sub.id}', '${u.id}', this.checked)"
                />
                <span style="font-weight: 700; ${u.completed ? 'text-decoration: line-through; opacity: 0.75;' : ''}">${escapeHtml(u.title)}</span>
                <span class="badge badge-${(u.difficulty || 'medium').toLowerCase()}">${u.difficulty || 'Medium'}</span>
              </div>
              <div style="display: flex; gap: 0.35rem;">
                <button class="unit-action-btn" title="Add topic to unit" onclick="App.quickAddTopic('${sub.id}', '${u.id}')">+ Topic</button>
                <button class="unit-action-btn" title="Delete unit" onclick="App.quickDeleteUnit('${sub.id}', '${u.id}', '${escapeHtml(u.title)}')">🗑️</button>
              </div>
            </div>
            <div class="topic-pills" style="margin-top: 0.5rem;">
              ${topicsList || '<span style="font-size:0.75rem; color:var(--text-light);">No topics yet. Click "+ Topic" above.</span>'}
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="subject-card">
          <div class="subject-header">
            <div>
              <div class="subject-title">${escapeHtml(sub.name)}</div>
              ${sub.code ? `<div class="subject-code">${escapeHtml(sub.code)}</div>` : ''}
            </div>
            <div class="exam-badge ${isUrgent ? 'urgent' : ''}">
              📅 ${sub.examDate} (${daysUntil > 0 ? `${daysUntil}d left` : 'Today'})
            </div>
          </div>

          <div class="units-list">
            ${unitsHtml || '<p style="color:var(--text-muted); font-size:0.85rem;">No units registered.</p>'}
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.85rem; border-top: 1px solid var(--border-color); padding-top: 0.75rem;">
            <button class="btn btn-outline btn-sm" onclick="App.quickAddUnit('${sub.id}')">+ Add Unit</button>
            <div style="display: flex; gap: 0.4rem;">
              <button class="btn btn-secondary btn-sm" onclick="App.openSubjectModal('edit', '${sub.id}')">✏️ Edit</button>
              <button class="btn btn-danger-outline btn-sm" onclick="App.deleteSubjectConfirm('${sub.id}', '${escapeHtml(sub.name)}')">🗑️ Delete</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  deleteSubjectConfirm(id, name) {
    if (confirm(`Delete subject "${name}" and all its units?`)) {
      StorageManager.deleteSubject(id);
      this.renderSyllabusList();
      this.updateDashboardMetrics();
      this.showToast(`Deleted "${name}".`, 'info');
    }
  },

  updateDashboardMetrics() {
    const subjects = StorageManager.getSubjects();
    let totalUnits = 0;
    let completedUnits = 0;
    let totalTopics = 0;
    let completedTopics = 0;
    let hardTopics = 0;
    let earliestDays = Infinity;

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    subjects.forEach(s => {
      const examTime = new Date(s.examDate).getTime();
      const days = Math.ceil((examTime - now.getTime()) / (1000 * 60 * 60 * 24));
      if (!isNaN(days) && days < earliestDays) {
        earliestDays = days;
      }

      (s.units || []).forEach(u => {
        totalUnits++;
        if (u.completed) completedUnits++;
        (u.topics || []).forEach(t => {
          totalTopics++;
          if (t.completed) completedTopics++;
          if (t.difficulty === 'Hard' && !t.completed) hardTopics++;
        });
      });
    });

    const completionPct = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

    // DOM Elements
    const statSubjectsEl = document.getElementById('stat-total-subjects');
    const statExamCountdownEl = document.getElementById('stat-exam-countdown');
    const statUnitsEl = document.getElementById('stat-units-progress');
    const statHardEl = document.getElementById('stat-hard-topics');
    const statCompletionPctEl = document.getElementById('stat-completion-pct');
    const progressBarFill = document.getElementById('dashboard-progress-fill');

    if (statSubjectsEl) statSubjectsEl.textContent = subjects.length;
    if (statExamCountdownEl) {
      statExamCountdownEl.textContent = earliestDays === Infinity ? '—' : `${earliestDays} Days`;
    }
    if (statUnitsEl) statUnitsEl.textContent = `${completedUnits} / ${totalUnits}`;
    if (statHardEl) statHardEl.textContent = `${hardTopics} Pending`;
    if (statCompletionPctEl) statCompletionPctEl.textContent = `${completionPct}%`;
    if (progressBarFill) progressBarFill.style.width = `${completionPct}%`;

    // Render Mini Subject progress cards on Dashboard overview
    this.renderDashboardSubjectSummaries(subjects);
  },

  renderDashboardSubjectSummaries(subjects) {
    const container = document.getElementById('dashboard-subjects-overview');
    if (!container) return;

    if (subjects.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted); font-size:0.9rem;">No subjects added yet. Add your courses in the Syllabus tab.</p>';
      return;
    }

    container.innerHTML = subjects.map(s => {
      let subTopics = 0;
      let subDone = 0;
      (s.units || []).forEach(u => {
        (u.topics || []).forEach(t => {
          subTopics++;
          if (t.completed) subDone++;
        });
      });

      const pct = subTopics > 0 ? Math.round((subDone / subTopics) * 100) : 0;

      return `
        <div style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.85rem; margin-bottom: 0.75rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
            <strong style="font-size: 0.92rem; color: #0f172a;">${escapeHtml(s.name)}</strong>
            <span style="font-size: 0.8rem; font-weight: 700; color: var(--primary);">${pct}%</span>
          </div>
          <div class="progress-bar-bg" style="height: 6px;">
            <div class="progress-bar-fill" style="width: ${pct}%;"></div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted); margin-top: 0.35rem;">
            <span>${(s.units || []).length} Units • ${subDone}/${subTopics} Topics completed</span>
            <span>Exam: ${s.examDate}</span>
          </div>
        </div>
      `;
    }).join('');
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
};

// Bootstrap when DOM ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
