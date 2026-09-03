// samourai-visio #63: breakout rooms showcase.
// Run from a directory holding playwright, with the PR branch on vite:8070/8072
// and the backend on 8074. Records the host viewport for the whole lifecycle.
import { chromium } from 'playwright'
import fs from 'node:fs'

const BASE = process.env.BASE || 'http://localhost:8072'
const URL = `${BASE}/tst-room-dev`
const OUT = process.argv[2] || '/tmp/film63/out'
fs.mkdirSync(OUT, { recursive: true })

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a)

const browser = await chromium.launch({
  headless: true,
  args: [
    '--use-fake-device-for-media-stream',
    '--use-fake-ui-for-media-stream',
    '--autoplay-policy=no-user-gesture-required',
    '--disable-features=WebRtcHideLocalIpsWithMdns',
  ],
})

const join = async (name, record) => {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: 'en-US',
    permissions: ['camera', 'microphone'],

    storageState: { cookies: [], origins: [{ origin: BASE,
      localStorage: [{ name: 'silent-login-retry', value: String(Date.now() + 864e5) }] }] },
  })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => log(`[PAGEERROR ${name}]`, e.message))
  for (let a = 0; ; a++) {
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 })
    try { await page.waitForSelector('#input-name', { timeout: 30000 }); break }
    catch (e) { if (a === 2) throw e }
  }
  await page.locator('#input-name').fill(name)
  await page.getByRole('button', { name: 'Join', exact: true }).click()
  await page.waitForSelector('[data-lk-source]', { timeout: 60000 })
  log(name, 'joined')
  return { ctx, page }
}

const pause = (p, ms) => p.waitForTimeout(ms)

let host, alice, bob
let badTake = false
try {
  alice = await join('Alice', false)
  bob = await join('Bob', false)
  host = await join('Host', true)
  const hp = host.page
  await pause(hp, 3500)

  log('open breakout panel')
  await hp.getByRole('button', { name: 'More Options' }).click()
  await pause(hp, 1500)
  await hp.getByRole('menuitem', { name: 'Breakout Rooms' }).click()
  await pause(hp, 2500)

  log('choose 2 rooms')
  await hp.getByRole('button', { name: '2 rooms' }).click()
  await pause(hp, 1800)
  log('choose duration')
  await hp.locator('select[aria-label="Duration"]').selectOption('600')
  await pause(hp, 2000)

  log('create')
  await hp.getByRole('button', { name: 'Create Breakout Rooms' }).click()
  await hp.waitForSelector('text=Assign all randomly', { timeout: 20000 })
  await pause(hp, 3000)

  log('randomize')
  await hp.getByRole('button', { name: 'Assign all randomly' }).click()
  await pause(hp, 4000)

  log('open all rooms')
  await hp.getByRole('button', { name: 'Open All Rooms' }).click()
  await pause(hp, 7000)

  // Both guests must actually land in a breakout room, or the take is unusable.
  const inRoom = async (c) => c.page.evaluate(() =>
    /You are in /.test(document.body.innerText))
  for (let i = 0; i < 10; i++) {
    if ((await inRoom(alice)) && (await inRoom(bob))) break
    await pause(hp, 1500)
  }
  const moved = { alice: await inRoom(alice), bob: await inRoom(bob) }
  log('MOVED:', JSON.stringify(moved))
  if (!moved.alice || !moved.bob) { badTake = true; throw new Error('guests did not swap rooms') }

  const timer = await hp.evaluate(() => {
    const el = document.querySelector('[role="timer"]')
    if (!el) return 'NO TIMER ELEMENT'
    const cs = getComputedStyle(el)
    let bg = 'transparent', n = el
    while (n && (bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)')) { bg = getComputedStyle(n).backgroundColor; n = n.parentElement }
    return { text: el.textContent, color: cs.color, bgBehind: bg }
  })
  log('TIMER:', JSON.stringify(timer))
  const aliceOverlay = await alice.page.evaluate(() => document.body.innerText.slice(0, 400).replace(/\n+/g, ' | '))
  log('ALICE:', aliceOverlay)

  log('alice asks for help')
  const helpBtn = alice.page.getByRole('button', { name: /Ask for Help/i })
  if (await helpBtn.count()) { await helpBtn.first().click(); log('help clicked') }
  else log('!! no Ask for Help button on Alice')
  await pause(hp, 5000)
  const banner = await hp.evaluate(() => {
    const m = [...document.querySelectorAll('div')].filter(d => /Help Request/i.test(d.textContent || '') && d.children.length < 8)
    return m.length ? m[m.length - 1].innerText.replace(/\n+/g, ' | ') : 'NO HELP BANNER'
  })
  log('HELP BANNER:', banner)

  log('broadcast')
  const ta = hp.locator('[placeholder*="announcement" i]')
  await ta.first().fill('Ten minutes left — wrap up and post your notes.')
  await pause(hp, 1200)
  await hp.getByRole('button', { name: 'Send broadcast' }).click()
  await pause(hp, 6500)

  log('close all')
  await hp.getByRole('button', { name: 'Close All Rooms' }).click()
  for (const w of [5, 15, 30, 45]) {
    await pause(hp, w === 5 ? 5000 : 10000)
    for (const [n, c] of [['alice', alice], ['bob', bob]]) {
      const txt = await c.page.evaluate(() => document.body.innerText.slice(0, 120).replace(/\n+/g, ' | '))
      log(`+${w}s ${n}: ${c.page.url().replace('http://localhost:8072','')} :: ${txt}`)
    }
  }
  log('done')
} catch (e) {
  log('FAILED:', e.message.split('\n')[0])
  if (host) await host.page.screenshot({ path: `${OUT}/fail-host.png` }).catch(() => {})
  if (alice) { await alice.page.screenshot({ path: `${OUT}/fail-alice.png` }).catch(() => {})
    log('ALICE URL', alice.page.url(), await alice.page.evaluate(() => document.body.innerText.slice(0,300).replace(/\n+/g,' | ')).catch(()=>'?')) }
} finally {
  for (const c of [host, alice, bob]) if (c) await c.ctx.close().catch(() => {})
  await browser.close()
}
log('videos:', fs.readdirSync(OUT).join(' '))
if (badTake) process.exit(3)
