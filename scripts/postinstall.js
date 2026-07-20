const { execSync } = require('child_process');
const path = require('path');
const os = require('os');

console.log('Installing Playwright Chromium...');

// Ensure we install playwright browsers locally in the root directory
const browsersPath = path.join(__dirname, '..', 'playwright-browsers');

try {
  execSync('npx playwright install chromium', {
    env: {
      ...process.env,
      PLAYWRIGHT_BROWSERS_PATH: browsersPath
    },
    stdio: 'inherit'
  });
  console.log('Playwright browsers installed to:', browsersPath);
} catch (error) {
  console.error('Failed to install Playwright browsers:', error);
  process.exit(1);
}
