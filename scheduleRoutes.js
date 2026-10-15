const express = require('express');
const router = express.Router();
const { validateSchedulePayload } = require('../utils/validator');
const { generateSchedule } = require('../services/schedulerService');

/**
 * POST /api/schedule/generate
 * Generates personalized day-wise and unit-wise timetable
 */
router.post('/generate', (req, res) => {
  try {
    const validation = validateSchedulePayload(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed. Please correct the errors and try again.',
        errors: validation.errors
      });
    }

    const { subjects, dailyHours, startDate } = req.body;
    const result = generateSchedule({ subjects, dailyHours, startDate });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error generating schedule:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred while generating the study timetable.',
      error: error.message
    });
  }
});

module.exports = router;
