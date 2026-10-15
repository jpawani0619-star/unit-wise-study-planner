/**
 * Timetable Manager and Renderer
 */

const TimetableManager = {
  activeFilter: 'all',

  init() {
    this.bindEvents();
    // Render existing timetable if cached
    const cached = StorageManager.getTimetable();
    if (cached) {
      this.renderTimetable(cached);
    }
  },

  bindEvents() {
    const genBtn = document.getElementById('generate-schedule-btn');
    if (genBtn) {
      genBtn.addEventListener('click', () => this.generateTimetable());
    }

    const filterBtns = document.querySelectorAll('.tt-filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        filterBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.activeFilter = e.target.dataset.filter || 'all';
        const cached = StorageManager.getTimetable();
        if (cached) {
          this.renderTimetable(cached);
        }
      });
    });
  },

  async generateTimetable() {
    const subjects = StorageManager.getSubjects();
    if (!subjects || subjects.length === 0) {
      App.showToast('Please add at least one subject with units before generating a schedule.', 'error');
      App.switchTab('syllabus');
      return;
    }

    const dailyHoursInput = document.getElementById('daily-hours-input');
    const startDateInput = document.getElementById('start-date-input');

    const dailyHours = dailyHoursInput ? parseFloat(dailyHoursInput.value) : StorageManager.getDailyHours();
    const startDate = startDateInput ? startDateInput.value : StorageManager.getStartDate();

    if (isNaN(dailyHours) || dailyHours <= 0 || dailyHours > 18) {
      App.showToast('Daily study hours must be between 0.5 and 18 hours.', 'error');
      return;
    }

    StorageManager.saveDailyHours(dailyHours);
    StorageManager.saveStartDate(startDate);

    const genBtn = document.getElementById('generate-schedule-btn');
    if (genBtn) {
      genBtn.disabled = true;
      genBtn.innerHTML = '⏳ Generating Schedule...';
    }

    try {
      const response = await fetch('/api/schedule/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjects, dailyHours, startDate })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMsg = data.errors ? data.errors.join('\n') : (data.message || 'Failed to generate timetable.');
        App.showToast(errorMsg, 'error');
        return;
      }

      StorageManager.saveTimetable(data);
      this.renderTimetable(data);
      App.updateDashboardMetrics();
      App.showToast('Timetable successfully generated with spaced revisions and practice slots!', 'success');

      // Scroll to timetable section
      const target = document.getElementById('timetable-results-container');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (err) {
      console.error('Error generating timetable:', err);
      App.showToast('Server connection error. Please make sure the backend is running.', 'error');
    } finally {
      if (genBtn) {
        genBtn.disabled = false;
        genBtn.innerHTML = '⚡ Generate Timetable';
      }
    }
  },

  renderTimetable(data) {
    const container = document.getElementById('timetable-results-container');
    if (!container) return;

    if (!data || !Array.isArray(data.schedule) || data.schedule.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📅</div>
          <h3>No Timetable Generated Yet</h3>
          <p>Configure your daily study hours above and click "Generate Timetable" to produce your day-wise study plan.</p>
        </div>
      `;
      return;
    }

    const { summary, schedule } = data;

    // Build Feasibility and Recommendation Banner
    let bannerHtml = '';
    if (summary) {
      const recsList = (summary.recommendations || []).map(r => `<li>${r}</li>`).join('');
      bannerHtml = `
        <div class="feasibility-banner ${summary.feasibilityStatus || 'Optimal'}">
          <div style="font-size: 1.5rem; flex-shrink: 0;">
            ${summary.feasibilityStatus === 'Overloaded' ? '⚠️' : (summary.feasibilityStatus === 'Intensive' ? '⚡' : '✅')}
          </div>
          <div style="flex: 1;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
              <strong style="font-size: 1.05rem;">Workload Assessment: ${summary.feasibilityStatus} Schedule</strong>
              <span style="font-size: 0.8rem; opacity: 0.85;">Total Planned: ${summary.totalPlannedHours} hrs (${summary.dailyAvailableHours} hrs/day)</span>
            </div>
            <ul style="margin-left: 1.1rem; line-height: 1.45; font-size: 0.86rem;">
              ${recsList}
            </ul>
          </div>
        </div>
      `;
    }

    // Filter schedule days and slots
    let totalDisplayedSlots = 0;
    const daysHtml = schedule.map(day => {
      const filteredSlots = day.slots.filter(slot => {
        if (this.activeFilter === 'all') return true;
        return slot.type === this.activeFilter;
      });

      if (filteredSlots.length === 0 && this.activeFilter !== 'all') {
        return '';
      }

      totalDisplayedSlots += filteredSlots.length;

      const slotsHtml = filteredSlots.map(slot => {
        const isDone = Boolean(slot.completed);
        const badgeClass = slot.type === 'study' ? 'badge-study' : (slot.type === 'revision' ? 'badge-revision' : 'badge-practice');
        const diffBadge = slot.difficulty ? `<span class="badge badge-${slot.difficulty.toLowerCase()}">${slot.difficulty}</span>` : '';

        return `
          <div class="slot-item ${isDone ? 'completed' : ''}" data-slot-id="${slot.id}">
            <div class="slot-left">
              <input 
                type="checkbox" 
                class="slot-checkbox" 
                ${isDone ? 'checked' : ''} 
                title="Mark topic as completed"
                onchange="TimetableManager.onSlotToggle(this, '${escapeHtml(slot.subjectName)}', '${escapeHtml(slot.unitTitle)}', '${escapeHtml(slot.topicName)}')"
              />
              <div class="slot-details">
                <div class="slot-topic-title">${escapeHtml(slot.topicName)}</div>
                <div class="slot-sub-info">
                  <span class="badge ${badgeClass}">${slot.type.toUpperCase()}</span>
                  <strong>${escapeHtml(slot.subjectName)}</strong>
                  <span>•</span>
                  <span>${escapeHtml(slot.unitTitle)}</span>
                  ${diffBadge}
                </div>
                ${slot.tips ? `<div class="slot-tips">💡 ${escapeHtml(slot.tips)}</div>` : ''}
              </div>
            </div>
            <div class="slot-duration">${slot.allocatedHours} hrs</div>
          </div>
        `;
      }).join('');

      return `
        <div class="day-card">
          <div class="day-header">
            <div class="day-title">Day ${day.dayIndex} — ${day.dayName}, ${day.date}</div>
            <div class="day-meta">Allocated: <strong>${day.totalDayHours} hrs</strong></div>
          </div>
          <div class="slots-list">
            ${slotsHtml || '<p style="color: var(--text-muted); font-size: 0.85rem; padding: 0.5rem 0;">No slots for selected filter.</p>'}
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      ${bannerHtml}
      <div class="schedule-timeline">
        ${daysHtml || '<div class="empty-state"><p>No study slots match the selected filter.</p></div>'}
      </div>
    `;
  },

  onSlotToggle(checkbox, subjectName, unitTitle, topicName) {
    const isCompleted = checkbox.checked;
    StorageManager.toggleTopicCompletion(subjectName, unitTitle, topicName, isCompleted);
    
    // Update slot styling
    const parent = checkbox.closest('.slot-item');
    if (parent) {
      if (isCompleted) {
        parent.classList.add('completed');
      } else {
        parent.classList.remove('completed');
      }
    }

    App.updateDashboardMetrics();
    App.showToast(`Updated "${topicName}" to ${isCompleted ? 'Completed' : 'Pending'}.`, 'info');
  }
};

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
