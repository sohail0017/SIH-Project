// Filter-system verification: computes expected values directly from the JSON
// tables, then drives the real UI in headless Edge. Filters are set via the
// global filter bar on the Outcomes page; the Dashboard (which has no filter
// bar by design) is then checked to display the SAME filtered data through
// same-document hash navigation (filter state is preserved in-memory).
import puppeteer from 'puppeteer-core';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = 'http://localhost:3000';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const load = async (f) => await (await fetch(`${BASE}/data/${f}.json`)).json();

async function main() {
  const trainees = await load('trainees');
  const employees = await load('employees');
  const empByTrainee = new Map(employees.map((e) => [e.traineeId, e]));
  const issues = [];

  // --- expected-value helpers (mirror the service filtering rules) ---
  const matches = (t, f) => {
    if (f.district && t.district !== f.district) return false;
    if (f.programme && t.programId !== f.programme) return false;
    if (f.provider && t.providerId !== f.provider) return false;
    if (f.trainingYear && t.trainingYear !== f.trainingYear) return false;
    if (f.gender && t.gender !== f.gender) return false;
    if (f.ageGroup) {
      if (f.ageGroup === '18-21' && t.age > 21) return false;
      if (f.ageGroup === '22-25' && (t.age < 22 || t.age > 25)) return false;
      if (f.ageGroup === '26+' && t.age < 26) return false;
    }
    if (f.status && empByTrainee.get(t.id)?.outcome !== f.status) return false;
    return true;
  };
  const expected = (f) => {
    const set = trainees.filter((t) => matches(t, f));
    const certified = set.filter((t) => t.certificationDate).length;
    return { trainees: set.length, certified };
  };

  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push(`PAGEERROR: ${e.message}`));

  const setFilter = async (label, value) => {
    const handle = await page.$(`select[aria-label="${label}"]`);
    if (!handle) throw new Error(`select ${label} not found`);
    await handle.select(value);
    await sleep(700);
  };
  const clearAll = async () => {
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Clear filters'));
      if (btn) btn.click();
    });
    await sleep(700);
  };
  // Same-document hash navigation preserves the in-memory filter state.
  const gotoSection = async (section) => {
    await page.goto(`${BASE}/#${section}`, { waitUntil: 'networkidle0' });
    await sleep(600);
  };
  const readCount = () =>
    page.evaluate(() => {
      const m = document.body.innerText.match(/Showing\s+([\d,]+)\s+of/)?.[1];
      return m === undefined ? -1 : Number(m.replace(/,/g, ''));
    });
  const readKpi = (id) =>
    page.evaluate(
      (tid) => document.querySelector(`[data-testid="kpi-${tid}"]`)?.textContent?.trim() ?? null,
      id
    );
  const toNum = (s) => Number(String(s).replace(/[₹,%]/g, '').replace(/,/g, ''));

  // ------------------------------------------------------------------
  const scenarios = [
    { name: 'District: Pune', filters: { 'Filter by district': 'Pune' }, expect: expected({ district: 'Pune' }) },
    { name: 'District: Mumbai Suburban', filters: { 'Filter by district': 'Mumbai Suburban' }, expect: expected({ district: 'Mumbai Suburban' }) },
    { name: 'District: Nagpur', filters: { 'Filter by district': 'Nagpur' }, expect: expected({ district: 'Nagpur' }) },
    { name: 'Provider: PROV-05', filters: { 'Filter by training provider': 'PROV-05' }, expect: expected({ provider: 'PROV-05' }) },
    { name: 'Programme: PROG-01', filters: { 'Filter by programme': 'PROG-01' }, expect: expected({ programme: 'PROG-01' }) },
    {
      name: 'District + Programme (Pune + PROG-01)',
      filters: { 'Filter by district': 'Pune', 'Filter by programme': 'PROG-01' },
      expect: expected({ district: 'Pune', programme: 'PROG-01' }),
    },
    {
      name: 'District + Status (Pune + Employed)',
      filters: { 'Filter by district': 'Pune', 'Filter by employment status': 'Employed' },
      expect: expected({ district: 'Pune', status: 'Employed' }),
    },
    {
      name: 'Provider + Programme (PROV-05 + PROG-01)',
      filters: { 'Filter by training provider': 'PROV-05', 'Filter by programme': 'PROG-01' },
      expect: expected({ provider: 'PROV-05', programme: 'PROG-01' }),
    },
    {
      name: 'Multiple (Pune + Female + 22-25 + 2023-24)',
      filters: {
        'Filter by district': 'Pune',
        'Filter by gender': 'Female',
        'Filter by age group': '22-25',
        'Filter by training year': '2023-24',
      },
      expect: expected({ district: 'Pune', gender: 'Female', trainingYear: '2023-24', ageGroup: '22-25' }),
    },
  ];

  // The global filter bar lives on the data pages (Outcomes), not the Dashboard.
  await gotoSection('outcomes');

  // Baseline: unfiltered totals
  const baseTotal = await readCount();
  if (baseTotal !== trainees.length) issues.push(`baseline count ${baseTotal} != ${trainees.length}`);

  for (const s of scenarios) {
    await clearAll();
    for (const [label, value] of Object.entries(s.filters)) await setFilter(label, value);

    // Outcomes page: footer count + certified count
    const shown = await readCount();
    if (shown !== s.expect.trainees)
      issues.push(`${s.name}: shown ${shown} != expected ${s.expect.trainees}`);
    const certified = await page.evaluate(() => {
      const m = document.body.innerText.match(/([\d,]+)\s+certified/)?.[1];
      return m === undefined ? -1 : Number(m.replace(/,/g, ''));
    });
    if (certified !== s.expect.certified)
      issues.push(`${s.name}: outcomes certified ${certified} != ${s.expect.certified}`);

    // Outcomes distribution must sum to ~100% when records exist (no zero-collapse)
    const distSum = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('.grid > div > p.text-\\[22px\\]')];
      const vals = cards.map((c) => parseFloat(c.textContent)).filter((v) => !isNaN(v));
      return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0)) : -1;
    });
    if (s.expect.certified > 0 && (distSum < 99 || distSum > 101))
      issues.push(`${s.name}: distribution sums to ${distSum}% (expected ~100%)`);

    // Dashboard (no filter bar, same UI as before): must display the SAME
    // filtered data through the central pipeline.
    await gotoSection('dashboard');
    const kpiTotal = await readKpi('total_trainees');
    if (kpiTotal === null) issues.push(`${s.name}: dashboard KPI not rendered`);
    else if (toNum(kpiTotal) !== s.expect.trainees)
      issues.push(`${s.name}: dashboard KPI total ${kpiTotal} != ${s.expect.trainees}`);
    const kpiEmployment = await readKpi('employment_rate');
    if (kpiEmployment === null || isNaN(toNum(kpiEmployment)))
      issues.push(`${s.name}: dashboard employment KPI invalid ("${kpiEmployment}")`);
    // Dashboard renders no filter UI by design
    const hasBar = await page.evaluate(() => !!document.querySelector('select[aria-label="Filter by district"]'));
    if (hasBar) issues.push('dashboard shows a filter bar (should have none)');

    await gotoSection('outcomes');
  }

  // Employment-status filter: dashboard employment KPI must be 100% (all matched are employed)
  await clearAll();
  await setFilter('Filter by employment status', 'Employed');
  await gotoSection('dashboard');
  const empKpi = await readKpi('employment_rate');
  if (empKpi !== '100%') issues.push(`status=Employed: dashboard employment KPI ${empKpi} != 100%`);
  const wageKpi = await readKpi('avg_wage');
  if (!wageKpi || toNum(wageKpi) <= 0)
    issues.push(`status=Employed: dashboard avg wage KPI shows "${wageKpi}" (employed trainees exist)`);
  await gotoSection('outcomes');

  // Date range: a 2025 window must give the exact expected count
  await clearAll();
  await page.evaluate(() => {
    const from = document.querySelector('input[aria-label="Certification date from"]');
    const to = document.querySelector('input[aria-label="Certification date to"]');
    const setVal = (el, v) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    };
    setVal(from, '2025-01-01');
    setVal(to, '2025-12-31');
  });
  await sleep(700);
  const dateCount = await readCount();
  const expectedDate = trainees.filter(
    (t) => t.certificationDate && t.certificationDate >= '2025-01-01' && t.certificationDate <= '2025-12-31'
  ).length;
  if (dateCount !== expectedDate)
    issues.push(`date range 2025: shown ${dateCount} != expected ${expectedDate}`);

  // Reset restores original totals
  await clearAll();
  const afterReset = await readCount();
  if (afterReset !== trainees.length)
    issues.push(`after reset: count ${afterReset} != ${trainees.length}`);

  // Empty-state: find a combination with no records (checked on Outcomes,
  // where the filters were set)
  const emptyCombo = (() => {
    for (const d of ['Sindhudurg', 'Gadchiroli', 'Nandurbar', 'Washim']) {
      for (const p of ['PROG-01', 'PROG-03', 'PROG-05', 'PROG-12']) {
        if (expected({ district: d, programme: p }).trainees === 0) return { d, p };
      }
    }
    return null;
  })();
  if (emptyCombo) {
    await setFilter('Filter by district', emptyCombo.d);
    await setFilter('Filter by programme', emptyCombo.p);
    const emptyShown = await page.evaluate(() =>
      document.body.innerText.includes('No data available for the selected filters') ||
      document.body.innerText.includes('No certified trainees')
    );
    if (!emptyShown) issues.push(`empty combo (${emptyCombo.d}+${emptyCombo.p}) did not show the empty state`);
    // The dashboard must not crash with an empty filtered set (renders the
    // same layout with empty components — no error state).
    await gotoSection('dashboard');
    const dashOk = await page.evaluate(() => document.body.innerText.includes('Maharashtra Skilling Outcomes Dashboard'));
    if (!dashOk) issues.push('dashboard failed to render with empty filtered set');
    await gotoSection('outcomes');
  }

  // Console errors across the run
  const realErrors = consoleErrors.filter((e) => !e.includes('favicon') && !e.includes('React DevTools'));
  if (realErrors.length) issues.push(`console errors: ${realErrors[0]}`);

  await browser.close();
  console.log(issues.length === 0 ? 'FILTER TEST: ALL PASS' : `FILTER TEST: ${issues.length} issue(s)`);
  issues.forEach((i) => console.log('  -', i));
}

main().catch((e) => { console.error('FILTER TEST FAILED TO RUN:', e.message); process.exit(1); });
