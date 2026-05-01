# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: stream.spec.ts >> Full Go Live journey (Auth -> Start -> Stream -> Stop)
- Location: tests/stream.spec.ts:43:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('✓ Authenticated')
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByText('✓ Authenticated')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - heading "web2hls React 19" [level=1] [ref=e5]:
      - text: web2hls
      - generic [ref=e6]: React 19
    - paragraph [ref=e7]: High-performance HTML Canvas to HLS live streaming
  - main [ref=e8]:
    - complementary [ref=e11]:
      - generic [ref=e12]:
        - heading "Pipeline Config" [level=3] [ref=e13]
        - button "Sign Out of YouTube" [ref=e15] [cursor=pointer]
        - generic [ref=e16]:
          - generic [ref=e17]: Codec
          - combobox "Codec" [ref=e18]:
            - option "H.264 High" [selected]
            - option "H.264 Main"
            - option "H.264 Baseline"
            - option "Mock Encoder (Testing)"
        - generic [ref=e19]:
          - generic [ref=e20]: Ingestion URL
          - textbox "Ingestion URL" [ref=e21]: http://localhost:8080/live/stream.m3u8
        - button "Start Streaming" [ref=e23] [cursor=pointer]
      - generic [ref=e24]:
        - heading "Stream Health" [level=3] [ref=e25]
        - generic [ref=e26]:
          - generic [ref=e27]:
            - generic [ref=e28]: FPS
            - generic [ref=e29]: "0.0"
          - generic [ref=e30]:
            - generic [ref=e31]: Dropped
            - generic [ref=e32]: "0"
          - generic [ref=e33]:
            - generic [ref=e34]: Data Sent
            - generic [ref=e35]: 0 B
          - generic [ref=e36]:
            - generic [ref=e37]: Segments
            - generic [ref=e38]: "0"
          - generic [ref=e39]:
            - generic [ref=e40]: Health
            - generic [ref=e41]: unknown
  - contentinfo [ref=e42]:
    - paragraph [ref=e43]: Built with WebCodecs, MPEG-TS, and React 19
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.beforeEach(async ({ page }) => {
  4   |   // Mock YouTube OAuth
  5   |   await page.route('**/o/oauth2/v2/auth*', async (route) => {
  6   |     const url = new URL(route.request().url());
  7   |     const redirectUri = url.searchParams.get('redirect_uri');
  8   |     if (redirectUri) {
  9   |       const callbackUrl = new URL(redirectUri);
  10  |       callbackUrl.searchParams.set('code', 'mock-auth-code');
  11  |       await route.fulfill({
  12  |         status: 302,
  13  |         headers: { Location: callbackUrl.toString() },
  14  |       });
  15  |     }
  16  |   });
  17  | 
  18  |   await page.route('**/oauth2.googleapis.com/token', async (route) => {
  19  |     await route.fulfill({
  20  |       status: 200,
  21  |       contentType: 'application/json',
  22  |       body: JSON.stringify({
  23  |         access_token: 'mock-access-token',
  24  |         expires_in: 3600,
  25  |         token_type: 'Bearer',
  26  |         scope: 'https://www.googleapis.com/auth/youtube.upload',
  27  |         refresh_token: 'mock-refresh-token',
  28  |       }),
  29  |     });
  30  |   });
  31  | 
  32  |   // Log browser console
  33  |   page.on('console', msg => {
  34  |     const text = msg.text();
  35  |     console.log(`BROWSER [${msg.type()}]: ${text}`);
  36  |   });
  37  | 
  38  |   page.on('pageerror', err => {
  39  |     console.log(`BROWSER ERROR: ${err.message}`);
  40  |   });
  41  | });
  42  | 
  43  | test('Full Go Live journey (Auth -> Start -> Stream -> Stop)', async ({ page }) => {
  44  |   const uploadedSegments: number[] = [];
  45  | 
  46  |   // Mock HLS ingestion endpoint
  47  |   await page.route('**/live/*.ts', async (route) => {
  48  |     const url = route.request().url();
  49  |     const match = url.match(/(\d+)\.ts$/);
  50  |     if (match) {
  51  |       const segmentIndex = parseInt(match[1]);
  52  |       uploadedSegments.push(segmentIndex);
  53  |     }
  54  |     await route.fulfill({
  55  |       status: 200,
  56  |       contentType: 'video/mp2t',
  57  |       body: Buffer.alloc(100), // Mock some data
  58  |     });
  59  |   });
  60  | 
  61  |   await page.goto('/?codec=mock');
  62  | 
  63  |   // 1. Auth
  64  |   const authBtn = page.getByRole('button', { name: 'Sign In with YouTube' });
  65  |   await expect(authBtn).toBeVisible();
  66  |   await authBtn.click();
  67  | 
  68  |   // Wait for auth to complete (redirect back and token exchange)
> 69  |   await expect(page.getByText('✓ Authenticated')).toBeVisible({ timeout: 10000 });
      |                                                   ^ Error: expect(locator).toBeVisible() failed
  70  | 
  71  |   // 2. Configure
  72  |   const ingestionInput = page.locator('#ingestion-url');
  73  |   await ingestionInput.fill('http://localhost:5173/live/stream.m3u8');
  74  | 
  75  |   // 3. Start
  76  |   const startBtn = page.getByRole('button', { name: 'Start Streaming' });
  77  |   await startBtn.click();
  78  | 
  79  |   // 4. Stream (Wait for segments)
  80  |   await expect(page.getByRole('button', { name: 'Stop Streaming' })).toBeVisible({ timeout: 10000 });
  81  |   
  82  |   console.log('Streaming started, waiting for segments...');
  83  |   
  84  |   await expect.poll(() => uploadedSegments.length, {
  85  |     message: 'Wait for at least 3 segments',
  86  |     timeout: 30000,
  87  |   }).toBeGreaterThanOrEqual(3);
  88  | 
  89  |   console.log(`Received ${uploadedSegments.length} segments: ${uploadedSegments.join(', ')}`);
  90  | 
  91  |   // Verify sequential order
  92  |   for (let i = 0; i < uploadedSegments.length - 1; i++) {
  93  |     expect(uploadedSegments[i + 1]).toBeGreaterThan(uploadedSegments[i]);
  94  |   }
  95  | 
  96  |   // 5. Stop
  97  |   const stopBtn = page.getByRole('button', { name: 'Stop Streaming' });
  98  |   await stopBtn.click();
  99  | 
  100 |   await expect(page.getByRole('button', { name: 'Start Streaming' })).toBeVisible();
  101 |   console.log('Streaming stopped successfully');
  102 | });
  103 | 
  104 | test('Network failure and recovery', async ({ page }) => {
  105 |   let failCount = 0;
  106 |   const uploadedSegments: number[] = [];
  107 | 
  108 |   await page.route('**/live/*.ts', async (route) => {
  109 |     const url = route.request().url();
  110 |     const match = url.match(/(\d+)\.ts$/);
  111 |     const segmentIndex = match ? parseInt(match[1]) : -1;
  112 | 
  113 |     // Fail the first 2 attempts for segment 1
  114 |     if (segmentIndex === 1 && failCount < 2) {
  115 |       failCount++;
  116 |       console.log(`Simulating network failure for segment ${segmentIndex} (attempt ${failCount})`);
  117 |       await route.abort('failed');
  118 |       return;
  119 |     }
  120 | 
  121 |     if (segmentIndex !== -1) {
  122 |       uploadedSegments.push(segmentIndex);
  123 |     }
  124 |     
  125 |     await route.fulfill({
  126 |       status: 200,
  127 |       body: Buffer.alloc(10),
  128 |     });
  129 |   });
  130 | 
  131 |   await page.goto('/?codec=mock');
  132 |   await page.locator('#ingestion-url').fill('http://localhost:5173/live/stream.m3u8');
  133 |   await page.getByRole('button', { name: 'Start Streaming' }).click();
  134 | 
  135 |   // Polling for segment 1
  136 |   await expect.poll(() => uploadedSegments.includes(1), {
  137 |     message: 'Wait for segment 1 to be uploaded after recovery',
  138 |     timeout: 20000,
  139 |   }).toBe(true);
  140 |   
  141 |   expect(failCount).toBe(2);
  142 |   console.log('Recovery verified after 2 failures');
  143 | 
  144 |   await page.getByRole('button', { name: 'Stop Streaming' }).click();
  145 | });
  146 | 
  147 | test('Hardware/Codec failure fallback UI', async ({ page }) => {
  148 |   // Use a codec that will fail and fallback profiles that will also fail in CI
  149 |   await page.goto('/?codec=force-failure');
  150 |   
  151 |   await page.getByRole('button', { name: 'Start Streaming' }).click();
  152 | 
  153 |   // Verify that the error is displayed in the UI
  154 |   const errorMsg = page.locator('.error-message');
  155 |   await expect(errorMsg).toBeVisible({ timeout: 10000 });
  156 |   await expect(errorMsg).toContainText('No supported H.264 profile found');
  157 | });
  158 | 
```