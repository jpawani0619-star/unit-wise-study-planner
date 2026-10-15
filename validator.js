/**
 * Input validation utilities for Study Planner API
 */

function validateSchedulePayload(body) {
  const errors = [];

  if (!body) {
    return { isValid: false, errors: ['Request body cannot be empty.'] };
  }

  const { subjects, dailyHours, startDate } = body;

  // Daily hours validation
  const hours = parseFloat(dailyHours);
  if (isNaN(hours) || hours <= 0 || hours > 18) {
    errors.push('Daily study hours must be a positive number between 0.5 and 18 hours.');
  }

  // Subjects array validation
  if (!Array.isArray(subjects) || subjects.length === 0) {
    errors.push('At least one subject with units is required to generate a study timetable.');
  } else {
    subjects.forEach((subject, sIdx) => {
      const sName = subject.name ? subject.name.trim() : '';
      if (!sName) {
        errors.push(`Subject #${sIdx + 1} must have a valid title.`);
      }

      if (!subject.examDate) {
        errors.push(`Subject "${sName || `#${sIdx + 1}`}" must have an exam date.`);
      } else {
        const examTime = new Date(subject.examDate).getTime();
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        if (isNaN(examTime) || examTime < now.getTime()) {
          errors.push(`Exam date for "${sName || `#${sIdx + 1}`}" cannot be in the past.`);
        }
      }

      if (!Array.isArray(subject.units) || subject.units.length === 0) {
        errors.push(`Subject "${sName || `#${sIdx + 1}`}" must have at least one unit.`);
      } else {
        subject.units.forEach((unit, uIdx) => {
          const uTitle = unit.title ? unit.title.trim() : '';
          if (!uTitle) {
            errors.push(`Unit #${uIdx + 1} in "${sName || `Subject #${sIdx + 1}`}" requires a title.`);
          }
        });
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

function validateChatPayload(body) {
  const errors = [];

  if (!body || typeof body.message !== 'string' || !body.message.trim()) {
    errors.push('Chat message is required and cannot be empty.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

module.exports = {
  validateSchedulePayload,
  validateChatPayload
};
