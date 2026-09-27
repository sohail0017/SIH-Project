// Browser test: loads the app in headless Edge, walks every page, clicks
// key interactions, captures console errors and horizontal overflow at
// desktop / tablet / mobile viewports.
import puppeteer from 'puppeteer-core';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = 'http://localhost:3000';
const VIEWPORTS = [
  { name: 'mobile-375', width: 375, height: 812 },
  { name: 'mobile-430', width: 430, height: 932 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'laptop-1280', width: 1280, height: 800 },
  { name: 'desktop-1920', width: 1920, height: 1080 },
];
const SECTIONS = [
  'dashboard', 'districts', 'outcomes', 'trainees', 'skillgaps',
  'providers', 'followups', 'analytics', 'insights', 'reports',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu'],
  });
  const issues = [];

  for (const vp of VIEWPORTS) {
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height });
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(`PAGEERROR: ${err.message}`));

    for (const section of SECTIONS) {
      await page.goto(`${BASE}/#${section}`, { waitUntil: 'networkidle0', timeout: 30000 });
      await sleep(700);

      // 1. console errors
      const errs = consoleErrors.filter(
        (e) => !e.includes('favicon') && !e.includes('Download the React DevTools')
      );
      if (errs.length) issues.push(`[${vp.name} / ${section}] console: ${errs[0]}`);

      // 2. page-level horizontal scroll
      const overflow = await page.evaluate(() => {
        const d = document.documentElement;
        return d.scrollWidth - d.clientWidth;
      });
      if (overflow > 1) issues.push(`[${vp.name} / ${section}] page h-scroll: ${overflow}px`);

      // 3. blank page check
      const textLen = await page.evaluate(() => document.body.innerText.length);
      if (textLen < 100) issues.push(`[${vp.name} / ${section}] page appears blank (${textLen} chars)`);
    }

    // Interactive checks (mobile only, to keep runtime sane)
    if (vp.name === 'mobile-375' || vp.name === 'desktop-1280') {
      const label = vp.name;

      // Sidebar drawer on mobile
      if (label === 'mobile-375') {
        await page.goto(`${BASE}/#dashboard`, { waitUntil: 'networkidle0' });
        await sleep(400);
        const burger = await page.$('button[aria-label="Open navigation"]');
        if (!burger) issues.push('[mobile] hamburger button missing');
        else {
          await burger.click();
          await sleep(500);
          const drawerVisible = await page.evaluate(() => {
            const drawer = document.querySelector('[role="dialog"][aria-label="Navigation"]');
            return !!drawer;
          });
          if (!drawerVisible) issues.push('[mobile] drawer did not open');
          // click a nav item → drawer should close and navigate
          const clicked = await page.evaluate(() => {
            const drawer = document.querySelector('[role="dialog"][aria-label="Navigation"]');
            if (!drawer) return false;
            const btn = [...drawer.querySelectorAll('button')].find((b) => b.textContent.includes('Reports'));
            if (btn) { btn.click(); return true; }
            return false;
          });
          await sleep(500);
          if (!clicked) issues.push('[mobile] could not click drawer item');
          const drawerGone = await page.evaluate(() => !document.querySelector('[role="dialog"][aria-label="Navigation"]'));
          const onReports = await page.evaluate(() => location.hash === '#reports');
          if (!drawerGone) issues.push('[mobile] drawer did not close after nav click');
          if (!onReports) issues.push('[mobile] nav click did not navigate');
        }
      }

      // Trainee search + profile modal (desktop)
      if (label === 'desktop-1280') {
        await page.goto(`${BASE}/#trainees`, { waitUntil: 'networkidle0' });
        await sleep(500);
        const rows = await page.$$eval('tbody tr', (trs) => trs.length);
        if (rows < 1) issues.push('[trainees] no rows rendered');
        // open profile modal
        await page.evaluate(() => document.querySelector('tbody tr')?.click());
        await sleep(500);
        const modalOpen = await page.evaluate(() => !!document.querySelector('[aria-label="Close profile"]'));
        if (!modalOpen) issues.push('[trainees] profile modal did not open');
        // close via Escape
        await page.keyboard.press('Escape');
        await sleep(300);
        const modalClosed = await page.evaluate(() => !document.querySelector('[aria-label="Close profile"]'));
        if (!modalClosed) issues.push('[trainees] modal did not close on Escape');

        // Outcomes filters: apply district filter via the global bar, check counts update
        await page.goto(`${BASE}/#outcomes`, { waitUntil: 'networkidle0' });
        await sleep(500);
        const before = await page.evaluate(() => document.body.innerText.match(/Showing\s+([\d,]+)\s+of/)?.[1]);
        const districtSelect = await page.$('select[aria-label="Filter by district"]');
        if (!districtSelect) issues.push('[outcomes] district filter select missing');
        else {
          await districtSelect.select('Pune');
          await sleep(600);
          const after = await page.evaluate(() => document.body.innerText.match(/Showing\s+([\d,]+)\s+of/)?.[1]);
          if (before === after) issues.push(`[outcomes] district filter did not change count (${before})`);
          const reset = await page.evaluate(() => {
            const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Clear filters'));
            if (btn) { btn.click(); return true; }
            return false;
          });
          await sleep(500);
          if (!reset) issues.push('[outcomes] clear filters button missing after filtering');
        }

        // Follow-ups: open + close contact modal
        await page.goto(`${BASE}/#followups`, { waitUntil: 'networkidle0' });
        await sleep(500);
        const contactBtn = await page.evaluate(() => {
          const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Contact'));
          if (btn) { btn.click(); return true; }
          return false;
        });
        await sleep(400);
        if (!contactBtn) issues.push('[followups] contact button missing');
        else {
          const attemptModal = await page.evaluate(() => document.body.innerText.includes('Record Contact Attempt'));
          if (!attemptModal) issues.push('[followups] contact modal did not open');
          await page.keyboard.press('Escape');
        }

        // Global search modal
        await page.keyboard.down('Control');
        await page.keyboard.press('k');
        await page.keyboard.up('Control');
        await sleep(400);
        const searchOpen = await page.evaluate(() => !!document.querySelector('input[placeholder*="Search trainees"]'));
        if (!searchOpen) issues.push('[search] Ctrl+K modal did not open');
        await page.keyboard.press('Escape');
      }
    }

    await page.close();
  }

  await browser.close();
  console.log(issues.length === 0 ? 'BROWSER TEST: ALL PASS' : `BROWSER TEST: ${issues.length} issue(s)`);
  issues.forEach((i) => console.log('  -', i));
}

main().catch((e) => {
  console.error('BROWSER TEST FAILED TO RUN:', e.message);
  process.exit(1);
});
