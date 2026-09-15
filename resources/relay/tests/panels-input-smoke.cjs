const { _electron: electron } = require('playwright')
const { expect } = require('playwright/test')
const fs = require('node:fs'),
  path = require('node:path'),
  os = require('node:os')
const { execFileSync } = require('node:child_process')
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'relay-panels-qa-'))
;(async () => {
  const app = await electron.launch({
    executablePath: process.env.RELAY_EXECUTABLE || require('electron'),
    args: process.env.RELAY_EXECUTABLE ? [] : ['.'],
    env: {
      ...process.env,
      ...(process.env.RELAY_TEST_GUI_PATH ? { PATH: '/usr/bin:/bin:/usr/sbin:/sbin' } : {}),
      ORCA_BACKGROUND_LAUNCH: '1',
      RELAY_ROOT: path.join(fixture, 'root'),
      RELAY_USER_DATA_PATH: path.join(fixture, 'profile')
    }
  })
  const p = await app.firstWindow()
  const request = (op, args = {}) =>
    p.evaluate(({ op, args }) => window.relay.request('local', op, args), { op, args })
  const width = (side) =>
    p
      .locator(`[data-sidebar="${side}"]`)
      .evaluate((element) => element.getBoundingClientRect().width)
  try {
    await p.waitForFunction(() =>
      document.activeElement?.classList.contains('xterm-helper-textarea')
    )
    const ws = (await request('snapshot')).workspaces.find((w) => w.id === 'genral')
    const id = ws.terminals[0].id
    const owner = () =>
      execFileSync('tmux', ['list-panes', '-t', `=relay-${id}`, '-F', '#{pane_pid}']).toString()
    const pid = owner()
    for (const [side, name, delta] of [
      ['left', 'workspaces', 80],
      ['right', 'repositories', -80]
    ]) {
      const handle = await p
        .getByRole('separator', { name: `Resize ${name}`, exact: true })
        .boundingBox()
      await p.mouse.move(handle.x + 6, handle.y + 120)
      await p.mouse.down()
      await p.mouse.move(handle.x + 6 + delta, handle.y + 120, { steps: 12 })
      await p.mouse.up()
      await expect.poll(() => width(side)).toBe(side === 'left' ? 320 : 400)
      await p.getByRole('button', { name: `Hide ${name}`, exact: true }).click()
      await expect.poll(() => width(side)).toBe(0)
    }
    if (owner() !== pid) {
      throw new Error('Hiding panels restarted the terminal owner')
    }
    await p.reload()
    await p.getByRole('button', { name: 'Show workspaces', exact: true }).waitFor()
    for (const [side, name, expected] of [
      ['left', 'workspaces', 320],
      ['right', 'repositories', 400]
    ]) {
      await expect.poll(() => width(side)).toBe(0)
      await p.getByRole('button', { name: `Show ${name}`, exact: true }).click()
      await expect.poll(() => width(side)).toBe(expected)
    }
    const capture = path.join(fixture, 'shift-enter.txt')
    const python = `import os,tty,termios,select; fd=0; old=termios.tcgetattr(fd); tty.setraw(fd); print('RELAY_INPUT_READY',flush=True); data=os.read(fd,1); exec("while select.select([fd],[],[],0.2)[0]:\\n data+=os.read(fd,1024)"); termios.tcsetattr(fd,termios.TCSADRAIN,old); open(${JSON.stringify(capture)},'w').write(data.hex())`
    const command = `python3 -c ` + `'${python.replaceAll("'", "'\\''")}'\r`
    await p.evaluate(() => {
      window.inputOutput = ''
      window.relay.onTerminal((event) => {
        window.inputOutput += event.data || ''
      })
    })
    await p.evaluate(({ key, command }) => window.relay.write(key, command), {
      key: JSON.stringify(['local', ws.id, id]),
      command
    })
    await p.waitForFunction(() => window.inputOutput.includes('RELAY_INPUT_READY\n'))
    await p.locator('.xterm-helper-textarea:visible').focus()
    await p.keyboard.press('Shift+Enter')
    await expect.poll(() => fs.existsSync(capture)).toBe(true)
    if (fs.readFileSync(capture, 'utf8') !== '1b0d') {
      throw new Error('Shift+Enter did not reach sess as Orca’s non-submit sequence')
    }
    if (process.env.RELAY_QA_OUTPUT) {
      await p.screenshot({
        path: path.join(process.env.RELAY_QA_OUTPUT, 'relay-resizable-panels.png')
      })
    }
    console.log(
      'PASS: both sidebar drag sizes, hide/show, persisted state after reload, stable session owner, and actual Shift+Enter bytes through sess/tmux.'
    )
  } finally {
    const snapshot = await request('snapshot')
    for (const workspace of snapshot.workspaces) {
      for (const terminal of workspace.terminals) {
        await request('terminal_remove', { workspace: workspace.id, terminal: terminal.id })
      }
    }
    await app.close()
    fs.rmSync(fixture, { recursive: true, force: true })
  }
})().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
