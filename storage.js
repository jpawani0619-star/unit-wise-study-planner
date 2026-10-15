/**
 * LocalStorage Persistence and State Manager
 */

const STORAGE_KEYS = {
  SUBJECTS: 'study_planner_subjects_v1',
  DAILY_HOURS: 'study_planner_daily_hours_v1',
  START_DATE: 'study_planner_start_date_v1',
  TIMETABLE: 'study_planner_timetable_v1',
  CHAT_HISTORY: 'study_planner_chat_history_v1',
  INITIALIZED: 'study_planner_initialized_v1'
};

const StorageManager = {
  isInitialized() {
    return localStorage.getItem(STORAGE_KEYS.INITIALIZED) === 'true';
  },

  setInitialized(val = true) {
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, val ? 'true' : 'false');
  },

  // --- Subjects ---
  getSubjects() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SUBJECTS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error reading subjects from localStorage:', e);
      return [];
    }
  },

  saveSubjects(subjects) {
    try {
      localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(subjects));
    } catch (e) {
      console.error('Error saving subjects to localStorage:', e);
    }
  },

  addSubject(subject) {
    const list = this.getSubjects();
    const newSub = {
      id: subject.id || 'sub_' + Date.now(),
      name: subject.name.trim(),
      code: (subject.code || '').trim().toUpperCase(),
      examDate: subject.examDate,
      units: (subject.units || []).map((u, uIdx) => ({
        id: u.id || `u_${Date.now()}_${uIdx}`,
        title: u.title.trim(),
        difficulty: u.difficulty || 'Medium',
        completed: Boolean(u.completed),
        topics: (u.topics || []).map((t, tIdx) => ({
          id: t.id || `t_${Date.now()}_${tIdx}`,
          name: typeof t === 'string' ? t.trim() : t.name.trim(),
          difficulty: t.difficulty || u.difficulty || 'Medium',
          estimatedHours: parseFloat(t.estimatedHours) || 1.5,
          completed: Boolean(t.completed)
        }))
      }))
    };
    list.push(newSub);
    this.saveSubjects(list);
    this.setInitialized(true);
    return newSub;
  },

  updateSubject(id, updatedFields) {
    const list = this.getSubjects();
    const idx = list.findIndex(s => s.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updatedFields };
      this.saveSubjects(list);
      return list[idx];
    }
    return null;
  },

  deleteSubject(id) {
    const list = this.getSubjects().filter(s => s.id !== id);
    this.saveSubjects(list);
    return list;
  },

  // Granular Unit Operations
  addUnitToSubject(subjectId, unitData) {
    const list = this.getSubjects();
    const sub = list.find(s => s.id === subjectId);
    if (!sub) return null;

    if (!Array.isArray(sub.units)) sub.units = [];
    const newUnit = {
      id: unitData.id || `u_${Date.now()}`,
      title: (unitData.title || 'New Unit').trim(),
      difficulty: unitData.difficulty || 'Medium',
      completed: false,
      topics: (unitData.topics || []).map((t, idx) => ({
        id: t.id || `t_${Date.now()}_${idx}`,
        name: typeof t === 'string' ? t.trim() : (t.name || 'Core Topic').trim(),
        difficulty: t.difficulty || unitData.difficulty || 'Medium',
        estimatedHours: parseFloat(t.estimatedHours) || 1.5,
        completed: false
      }))
    };

    if (newUnit.topics.length === 0) {
      newUnit.topics.push({
        id: `t_${Date.now()}_0`,
        name: `${newUnit.title} - Core Topics`,
        difficulty: newUnit.difficulty,
        estimatedHours: 1.5,
        completed: false
      });
    }

    sub.units.push(newUnit);
    this.saveSubjects(list);
    return newUnit;
  },

  deleteUnitFromSubject(subjectId, unitId) {
    const list = this.getSubjects();
    const sub = list.find(s => s.id === subjectId);
    if (!sub || !Array.isArray(sub.units)) return false;

    sub.units = sub.units.filter(u => u.id !== unitId);
    this.saveSubjects(list);
    return true;
  },

  // Granular Topic Operations
  addTopicToUnit(subjectId, unitId, topicData) {
    const list = this.getSubjects();
    const sub = list.find(s => s.id === subjectId);
    if (!sub) return null;

    const unit = (sub.units || []).find(u => u.id === unitId);
    if (!unit) return null;

    if (!Array.isArray(unit.topics)) unit.topics = [];
    const newTopic = {
      id: topicData.id || `t_${Date.now()}`,
      name: (topicData.name || 'New Topic').trim(),
      difficulty: topicData.difficulty || unit.difficulty || 'Medium',
      estimatedHours: parseFloat(topicData.estimatedHours) || 1.5,
      completed: false
    };

    unit.topics.push(newTopic);
    unit.completed = unit.topics.every(t => t.completed);
    this.saveSubjects(list);
    return newTopic;
  },

  deleteTopicFromUnit(subjectId, unitId, topicId) {
    const list = this.getSubjects();
    const sub = list.find(s => s.id === subjectId);
    if (!sub) return false;

    const unit = (sub.units || []).find(u => u.id === unitId);
    if (!unit || !Array.isArray(unit.topics)) return false;

    unit.topics = unit.topics.filter(t => t.id !== topicId);
    unit.completed = unit.topics.length > 0 && unit.topics.every(t => t.completed);
    this.saveSubjects(list);
    return true;
  },

  toggleUnitCompletion(subjectId, unitId, isCompleted) {
    const list = this.getSubjects();
    const sub = list.find(s => s.id === subjectId);
    if (!sub) return false;

    const unit = (sub.units || []).find(u => u.id === unitId);
    if (!unit) return false;

    unit.completed = isCompleted;
    (unit.topics || []).forEach(t => {
      t.completed = isCompleted;
      // also sync in timetable
      this.syncTopicToTimetable(sub.name, unit.title, t.name, isCompleted);
    });

    this.saveSubjects(list);
    return true;
  },

  syncTopicToTimetable(subjectName, unitTitle, topicName, isCompleted) {
    const tt = this.getTimetable();
    if (tt && Array.isArray(tt.schedule)) {
      let modified = false;
      tt.schedule.forEach(day => {
        (day.slots || []).forEach(slot => {
          if (
            slot.subjectName?.toLowerCase() === subjectName.toLowerCase() &&
            slot.unitTitle?.toLowerCase() === unitTitle.toLowerCase() &&
            slot.topicName?.toLowerCase() === topicName.toLowerCase()
          ) {
            slot.completed = isCompleted;
            modified = true;
          }
        });
      });
      if (modified) {
        this.saveTimetable(tt);
      }
    }
  },

  // --- Daily Hours & Settings ---
  getDailyHours() {
    const hours = localStorage.getItem(STORAGE_KEYS.DAILY_HOURS);
    return hours ? parseFloat(hours) : 3.0;
  },

  saveDailyHours(hours) {
    localStorage.setItem(STORAGE_KEYS.DAILY_HOURS, hours);
  },

  getStartDate() {
    const date = localStorage.getItem(STORAGE_KEYS.START_DATE);
    if (date) return date;
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  saveStartDate(date) {
    localStorage.setItem(STORAGE_KEYS.START_DATE, date);
  },

  // --- Timetable ---
  getTimetable() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TIMETABLE);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  saveTimetable(timetableData) {
    try {
      localStorage.setItem(STORAGE_KEYS.TIMETABLE, JSON.stringify(timetableData));
    } catch (e) {
      console.error('Error saving timetable:', e);
    }
  },

  toggleTopicCompletion(subjectName, unitTitle, topicName, isCompleted) {
    // 1. Update in subjects
    const subjects = this.getSubjects();
    let updated = false;

    subjects.forEach(sub => {
      if (sub.name.toLowerCase() === subjectName.toLowerCase()) {
        (sub.units || []).forEach(unit => {
          if (unit.title.toLowerCase() === unitTitle.toLowerCase()) {
            (unit.topics || []).forEach(topic => {
              if (topic.name.toLowerCase() === topicName.toLowerCase()) {
                topic.completed = isCompleted;
                updated = true;
              }
            });
            // Update unit overall completion
            if (Array.isArray(unit.topics) && unit.topics.length > 0) {
              unit.completed = unit.topics.every(t => t.completed);
            }
          }
        });
      }
    });

    if (updated) {
      this.saveSubjects(subjects);
    }

    // 2. Sync to timetable
    this.syncTopicToTimetable(subjectName, unitTitle, topicName, isCompleted);

    return { subjects, timetable: this.getTimetable() };
  },

  // --- Chat History ---
  getChatHistory() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CHAT_HISTORY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  saveChatHistory(history) {
    try {
      const trimmed = history.slice(-30);
      localStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(trimmed));
    } catch (e) {
      console.error('Error saving chat history:', e);
    }
  },

  clearChatHistory() {
    localStorage.removeItem(STORAGE_KEYS.CHAT_HISTORY);
  },

  // --- Sample Demo Data ---
  loadSampleData() {
    const now = new Date();
    const formatDateOffset = (offsetDays) => {
      const d = new Date(now);
      d.setDate(now.getDate() + offsetDays);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const sampleSubjects = [
      {
        id: 'sub_dsa_101',
        name: 'Data Structures & Algorithms',
        code: 'CS301',
        examDate: formatDateOffset(7),
        units: [
          {
            id: 'u_dsa_1',
            title: 'Unit 1: Arrays, Stacks & Queues',
            difficulty: 'Easy',
            completed: true,
            topics: [
              { id: 't1_1', name: 'Stack Operations & Infix to Postfix', difficulty: 'Easy', estimatedHours: 1.5, completed: true },
              { id: 't1_2', name: 'Circular Queues & Deque Implementation', difficulty: 'Medium', estimatedHours: 2.0, completed: true }
            ]
          },
          {
            id: 'u_dsa_2',
            title: 'Unit 2: Trees & Binary Search Trees',
            difficulty: 'Medium',
            completed: false,
            topics: [
              { id: 't2_1', name: 'Binary Tree Traversals & Depth', difficulty: 'Medium', estimatedHours: 2.0, completed: true },
              { id: 't2_2', name: 'AVL Tree Rotations & Balancing', difficulty: 'Hard', estimatedHours: 3.0, completed: false }
            ]
          },
          {
            id: 'u_dsa_3',
            title: 'Unit 3: Graphs & Shortest Path',
            difficulty: 'Hard',
            completed: false,
            topics: [
              { id: 't3_1', name: 'BFS & DFS Graph Traversals', difficulty: 'Medium', estimatedHours: 2.0, completed: false },
              { id: 't3_2', name: 'Dijkstra and Bellman-Ford Algorithms', difficulty: 'Hard', estimatedHours: 3.5, completed: false }
            ]
          }
        ]
      },
      {
        id: 'sub_dbms_102',
        name: 'Database Management Systems',
        code: 'CS304',
        examDate: formatDateOffset(12),
        units: [
          {
            id: 'u_db_1',
            title: 'Unit 1: Relational Model & SQL',
            difficulty: 'Medium',
            completed: true,
            topics: [
              { id: 't_db_1', name: 'Complex SQL Joins & Subqueries', difficulty: 'Medium', estimatedHours: 2.0, completed: true },
              { id: 't_db_2', name: 'Relational Algebra Operations', difficulty: 'Easy', estimatedHours: 1.5, completed: true }
            ]
          },
          {
            id: 'u_db_2',
            title: 'Unit 2: Normalization (1NF to BCNF)',
            difficulty: 'Hard',
            completed: false,
            topics: [
              { id: 't_db_3', name: 'Functional Dependencies & 2NF/3NF', difficulty: 'Medium', estimatedHours: 2.0, completed: false },
              { id: 't_db_4', name: 'BCNF & Lossless Decomposition', difficulty: 'Hard', estimatedHours: 3.0, completed: false }
            ]
          },
          {
            id: 'u_db_3',
            title: 'Unit 3: Transactions & Concurrency',
            difficulty: 'Medium',
            completed: false,
            topics: [
              { id: 't_db_5', name: 'ACID Properties & Serializability', difficulty: 'Medium', estimatedHours: 2.0, completed: false },
              { id: 't_db_6', name: 'Two-Phase Locking & Deadlock Handling', difficulty: 'Hard', estimatedHours: 2.5, completed: false }
            ]
          }
        ]
      },
      {
        id: 'sub_cn_103',
        name: 'Computer Networks',
        code: 'CS305',
        examDate: formatDateOffset(16),
        units: [
          {
            id: 'u_cn_1',
            title: 'Unit 1: OSI & TCP/IP Layer Architecture',
            difficulty: 'Easy',
            completed: false,
            topics: [
              { id: 't_cn_1', name: 'Layer Responsibilities & Packet Encapsulation', difficulty: 'Easy', estimatedHours: 1.5, completed: false },
              { id: 't_cn_2', name: 'Flow Control & Sliding Window Protocol', difficulty: 'Medium', estimatedHours: 2.0, completed: false }
            ]
          },
          {
            id: 'u_cn_2',
            title: 'Unit 2: Network Layer & IP Subnetting',
            difficulty: 'Hard',
            completed: false,
            topics: [
              { id: 't_cn_3', name: 'IPv4 Addressing, CIDR & Subnetting', difficulty: 'Hard', estimatedHours: 3.0, completed: false },
              { id: 't_cn_4', name: 'Routing Protocols: OSPF & BGP Overview', difficulty: 'Medium', estimatedHours: 2.0, completed: false }
            ]
          }
        ]
      },
      {
        id: 'sub_os_104',
        name: 'Operating Systems',
        code: 'CS302',
        examDate: formatDateOffset(20),
        units: [
          {
            id: 'u_os_1',
            title: 'Unit 1: Process Management & CPU Scheduling',
            difficulty: 'Medium',
            completed: false,
            topics: [
              { id: 't_os_1', name: 'Process Lifecycle, PCB & Context Switching', difficulty: 'Easy', estimatedHours: 1.5, completed: false },
              { id: 't_os_2', name: 'CPU Scheduling: FCFS, SJF & Round Robin', difficulty: 'Medium', estimatedHours: 2.0, completed: false }
            ]
          },
          {
            id: 'u_os_2',
            title: 'Unit 2: Synchronization & Concurrency',
            difficulty: 'Hard',
            completed: false,
            topics: [
              { id: 't_os_3', name: 'Critical Section Problem & Semaphores', difficulty: 'Medium', estimatedHours: 2.0, completed: false },
              { id: 't_os_4', name: 'Banker\'s Algorithm & Deadlock Avoidance', difficulty: 'Hard', estimatedHours: 3.0, completed: false }
            ]
          },
          {
            id: 'u_os_3',
            title: 'Unit 3: Memory Management & Paging',
            difficulty: 'Hard',
            completed: false,
            topics: [
              { id: 't_os_5', name: 'Virtual Memory, Multi-level Paging & TLB', difficulty: 'Hard', estimatedHours: 3.5, completed: false },
              { id: 't_os_6', name: 'Page Replacement: FIFO, LRU & Optimal', difficulty: 'Medium', estimatedHours: 2.0, completed: false }
            ]
          },
          {
            id: 'u_os_4',
            title: 'Unit 4: File Systems & I/O Subsystems',
            difficulty: 'Easy',
            completed: false,
            topics: [
              { id: 't_os_7', name: 'File Allocation Methods & Inode Structures', difficulty: 'Easy', estimatedHours: 1.5, completed: false },
              { id: 't_os_8', name: 'Disk Scheduling: SCAN, C-SCAN & LOOK', difficulty: 'Easy', estimatedHours: 1.5, completed: false }
            ]
          }
        ]
      }
    ];

    this.saveSubjects(sampleSubjects);
    this.saveDailyHours(3.5);
    this.saveStartDate(formatDateOffset(0));
    this.setInitialized(true);
    return sampleSubjects;
  },

  clearAllData() {
    Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
    this.setInitialized(true); // marks as explicitly cleared so samples aren't auto-reloaded
  },

  exportData() {
    return JSON.stringify({
      version: '1.0',
      exportedAt: new Date().toISOString(),
      subjects: this.getSubjects(),
      dailyHours: this.getDailyHours(),
      startDate: this.getStartDate(),
      timetable: this.getTimetable()
    }, null, 2);
  },

  importData(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (Array.isArray(data.subjects)) {
        this.saveSubjects(data.subjects);
      }
      if (data.dailyHours) {
        this.saveDailyHours(data.dailyHours);
      }
      if (data.startDate) {
        this.saveStartDate(data.startDate);
      }
      if (data.timetable) {
        this.saveTimetable(data.timetable);
      }
      this.setInitialized(true);
      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  }
};
