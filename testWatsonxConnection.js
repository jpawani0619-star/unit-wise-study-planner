/**
 * IBM watsonx.ai Connectivity & Foundation Model Verification CLI Tool
 * Usage: node scripts/testWatsonxConnection.js
 */

require('dotenv').config();
const { isWatsonxConfigured, resolveEndpoint, testWatsonxConnection } = require('../src/services/watsonxService');

async function main() {
  console.log('================================================================');
  console.log('🤖 IBM watsonx.ai Integration Diagnostic Check');
  console.log('================================================================\n');

  const configured = isWatsonxConfigured();
  const apiKey = process.env.WATSONX_API_KEY;
  const maskedKey = apiKey ? `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}` : '(not set)';
  const projectId = process.env.WATSONX_PROJECT_ID || '(not set)';
  const endpoint = resolveEndpoint();
  const modelId = process.env.WATSONX_MODEL_ID || 'ibm/granite-13b-chat-v2';

  console.log('📋 Configuration Status:');
  console.log(`  • Watsonx Configured: ${configured ? 'YES ✅' : 'NO ⚠️ (Running in Demo Mode)'}`);
  console.log(`  • API Key:            ${maskedKey}`);
  console.log(`  • Project ID:         ${projectId}`);
  console.log(`  • Regional Endpoint:  ${endpoint}`);
  console.log(`  • Foundation Model:   ${modelId}\n`);

  if (!configured) {
    console.log('ℹ️ WATSONX_API_KEY or WATSONX_PROJECT_ID is empty.');
    console.log('The application will smoothly operate in built-in **AI Demo Mode**.');
    console.log('\nTo connect to live IBM watsonx.ai:');
    console.log('1. Log into IBM Cloud: https://cloud.ibm.com');
    console.log('2. Create an IAM API key under Manage > Access (IAM) > API Keys');
    console.log('3. Open your watsonx.ai project > Manage > General > copy Project ID');
    console.log('4. Paste both into your `.env` file.');
    process.exit(0);
  }

  console.log('⏳ Testing IAM Authentication & Foundation Model Inference...');
  const startTime = Date.now();
  const result = await testWatsonxConnection();
  const duration = Date.now() - startTime;

  if (result.success) {
    console.log(`\n🎉 SUCCESS! Connected to watsonx.ai in ${duration}ms.`);
    console.log(`  • Model Used: ${result.modelId}`);
    console.log(`  • Sample AI Reply:\n"${result.reply}"\n`);
    process.exit(0);
  } else {
    console.error(`\n❌ Watsonx Connection Test Failed (${duration}ms):`);
    console.error(`  ${result.error}\n`);
    console.log('💡 Troubleshooting Tips:');
    console.log('  • Ensure WATSONX_API_KEY is an active IBM Cloud IAM API Key.');
    console.log('  • Ensure WATSONX_PROJECT_ID matches the GUID of your watsonx project.');
    console.log('  • Check WATSONX_URL matches your project cluster (e.g. https://us-south.ml.cloud.ibm.com).');
    console.log('  • Ensure your IBM Cloud account has Watson Studio / watsonx services enabled.\n');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal CLI Error:', err);
  process.exit(1);
});
