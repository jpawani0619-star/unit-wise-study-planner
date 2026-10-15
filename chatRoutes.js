const express = require('express');
const router = express.Router();
const { validateChatPayload } = require('../utils/validator');
const { isWatsonxConfigured, resolveEndpoint, generateWatsonxResponse, testWatsonxConnection } = require('../services/watsonxService');
const { generateDemoAdvice } = require('../services/demoAdvisorService');

/**
 * GET /api/chat/status
 * Returns current AI service mode and availability
 */
router.get('/status', (req, res) => {
  const configured = isWatsonxConfigured();
  return res.status(200).json({
    watsonxConfigured: configured,
    activeMode: configured ? 'watsonx' : 'demo',
    modelId: process.env.WATSONX_MODEL_ID || 'ibm/granite-13b-chat-v2',
    endpoint: resolveEndpoint()
  });
});

/**
 * GET /api/chat/test-watsonx
 * Diagnostic test endpoint to verify IBM IAM & watsonx connection
 */
router.get('/test-watsonx', async (req, res) => {
  const result = await testWatsonxConnection();
  if (result.success) {
    return res.status(200).json(result);
  } else {
    return res.status(result.configured ? 502 : 200).json(result);
  }
});

/**
 * POST /api/chat
 * Generates academic advice and responds to student questions
 */
router.post('/', async (req, res) => {
  try {
    const validation = validateChatPayload(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed.',
        errors: validation.errors
      });
    }

    const { message, history, studentContext } = req.body;

    // 1. If watsonx is configured, attempt foundation model inference
    if (isWatsonxConfigured()) {
      try {
        const aiResponse = await generateWatsonxResponse({ message, history, studentContext });
        return res.status(200).json({
          success: true,
          reply: aiResponse.reply,
          mode: 'watsonx',
          modelId: aiResponse.modelId
        });
      } catch (watsonxError) {
        console.warn('⚠️ Watsonx API call failed, falling back to Demo Mode:', watsonxError.message);
        const demoResponse = generateDemoAdvice({ message, history, studentContext });
        return res.status(200).json({
          success: true,
          reply: demoResponse.reply,
          mode: 'demo',
          fallbackNotice: `Watsonx API error (${watsonxError.message}). Fallback to Demo Mode active.`
        });
      }
    } else {
      // 2. Demo Mode
      const demoResponse = generateDemoAdvice({ message, history, studentContext });
      return res.status(200).json({
        success: true,
        reply: demoResponse.reply,
        mode: 'demo'
      });
    }
  } catch (error) {
    console.error('Error in chat route:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate study advice.',
      error: error.message
    });
  }
});

module.exports = router;
