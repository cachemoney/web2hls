import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Mock YouTube OAuth
  await page.route('**/o/oauth2/v2/auth*', async (route) => {
    const url = new URL(route.request().url());
    const redirectUri = url.searchParams.get('redirect_uri');
    if (redirectUri) {
      const callbackUrl = new URL(redirectUri);
      callbackUrl.searchParams.set('code', 'mock-auth-code');
      await route.fulfill({
        status: 302,
        headers: { Location: callbackUrl.toString() },
      });
    }
  });

  await page.route('**/oauth2.googleapis.com/token', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'mock-access-token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'https://www.googleapis.com/auth/youtube.upload',
        refresh_token: 'mock-refresh-token',
      }),
    });
  });

  // Log browser console
  page.on('console', msg => {
    const text = msg.text();
    console.log(`BROWSER [${msg.type()}]: ${text}`);
  });

  page.on('pageerror', err => {
    console.log(`BROWSER ERROR: ${err.message}`);
  });
});

test('Full Go Live journey (Auth -> Start -> Stream -> Stop)', async ({ page }) => {
  const uploadedSegments: number[] = [];

  // Mock HLS ingestion endpoint
  await page.route('**/live/*.ts', async (route) => {
    const url = route.request().url();
    const match = url.match(/(\d+)\.ts$/);
    if (match) {
      const segmentIndex = parseInt(match[1]);
      uploadedSegments.push(segmentIndex);
    }
    await route.fulfill({
      status: 200,
      contentType: 'video/mp2t',
      body: Buffer.alloc(100), // Mock some data
    });
  });

  await page.goto('/?codec=mock');

  // 1. Auth
  const authBtn = page.getByRole('button', { name: 'Sign In with YouTube' });
  await expect(authBtn).toBeVisible();
  await authBtn.click();

  // Wait for auth to complete (redirect back and token exchange)
  await expect(page.getByText('✓ Authenticated')).toBeVisible({ timeout: 10000 });

  // 2. Configure
  const ingestionInput = page.locator('#ingestion-url');
  await ingestionInput.fill('http://localhost:5173/live/stream.m3u8');

  // 3. Start
  const startBtn = page.getByRole('button', { name: 'Start Streaming' });
  await startBtn.click();

  // 4. Stream (Wait for segments)
  await expect(page.getByRole('button', { name: 'Stop Streaming' })).toBeVisible({ timeout: 10000 });
  
  console.log('Streaming started, waiting for segments...');
  
  await expect.poll(() => uploadedSegments.length, {
    message: 'Wait for at least 3 segments',
    timeout: 30000,
  }).toBeGreaterThanOrEqual(3);

  console.log(`Received ${uploadedSegments.length} segments: ${uploadedSegments.join(', ')}`);

  // Verify sequential order
  for (let i = 0; i < uploadedSegments.length - 1; i++) {
    expect(uploadedSegments[i + 1]).toBeGreaterThan(uploadedSegments[i]);
  }

  // 5. Stop
  const stopBtn = page.getByRole('button', { name: 'Stop Streaming' });
  await stopBtn.click();

  await expect(page.getByRole('button', { name: 'Start Streaming' })).toBeVisible();
  console.log('Streaming stopped successfully');
});

test('Network failure and recovery', async ({ page }) => {
  let failCount = 0;
  const uploadedSegments: number[] = [];

  await page.route('**/live/*.ts', async (route) => {
    const url = route.request().url();
    const match = url.match(/(\d+)\.ts$/);
    const segmentIndex = match ? parseInt(match[1]) : -1;

    // Fail the first 2 attempts for segment 1
    if (segmentIndex === 1 && failCount < 2) {
      failCount++;
      console.log(`Simulating network failure for segment ${segmentIndex} (attempt ${failCount})`);
      await route.abort('failed');
      return;
    }

    if (segmentIndex !== -1) {
      uploadedSegments.push(segmentIndex);
    }
    
    await route.fulfill({
      status: 200,
      body: Buffer.alloc(10),
    });
  });

  await page.goto('/?codec=mock');
  await page.locator('#ingestion-url').fill('http://localhost:5173/live/stream.m3u8');
  await page.getByRole('button', { name: 'Start Streaming' }).click();

  // Polling for segment 1
  await expect.poll(() => uploadedSegments.includes(1), {
    message: 'Wait for segment 1 to be uploaded after recovery',
    timeout: 20000,
  }).toBe(true);
  
  expect(failCount).toBe(2);
  console.log('Recovery verified after 2 failures');

  await page.getByRole('button', { name: 'Stop Streaming' }).click();
});

test('Hardware/Codec failure fallback UI', async ({ page }) => {
  // Use a codec that will fail and fallback profiles that will also fail in CI
  await page.goto('/?codec=force-failure');
  
  await page.getByRole('button', { name: 'Start Streaming' }).click();

  // Verify that the error is displayed in the UI
  const errorMsg = page.locator('.error-message');
  await expect(errorMsg).toBeVisible({ timeout: 10000 });
  await expect(errorMsg).toContainText('No supported H.264 profile found');
});
