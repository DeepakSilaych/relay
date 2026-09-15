const { test } = require('node:test')
const assert = require('node:assert/strict')
const { EventEmitter } = require('node:events')
const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const vm = require('node:vm')
const { transformSync } = require('esbuild')
const source = transformSync(readFileSync(resolve('src/main/relay/updates.ts'), 'utf8'), {
  loader: 'ts',
  format: 'cjs',
  target: 'es2022'
}).code
function fixture({ packaged = true, signed = true, result, failure } = {}) {
  const calls = { checks: 0, downloads: 0, installs: 0 },
    events = [],
    deferred = []
  const updater = Object.assign(new EventEmitter(), {
    setFeedURL(value) {
      assert.equal(value.repo, 'relay')
    },
    async checkForUpdates() {
      calls.checks++
      if (failure) {
        throw failure
      }
      return result
    },
    async downloadUpdate() {
      calls.downloads++
      updater.emit('download-progress', { percent: 70 })
    },
    quitAndInstall() {
      calls.installs++
    }
  })
  const exports = {}
  const context = {
    exports,
    module: { exports },
    process: { platform: 'darwin' },
    setImmediate: (callback) => deferred.push(callback),
    require(name) {
      if (name === 'electron') {
        return {
          app: { isPackaged: packaged, getVersion: () => '0.2.0', getAppPath: () => '/fixture' }
        }
      }
      if (name === 'electron-updater') {
        return { autoUpdater: updater }
      }
      if (name === 'node:fs') {
        return { readFileSync: () => JSON.stringify({ relayAutoUpdate: signed }) }
      }
      return require(name)
    }
  }
  vm.runInNewContext(source, context)
  return {
    service: context.module.exports.createUpdates((state) => events.push(state)),
    calls,
    events,
    deferred
  }
}
test('development and unsigned Mac builds never attempt automatic installation', async () => {
  for (const options of [{ packaged: false }, { signed: false }]) {
    const f = fixture(options)
    assert.equal((await f.service.run()).phase, 'unsupported')
    assert.equal(f.calls.checks, 0)
  }
})
test('no update, wrong product and network errors do not download or install', async () => {
  for (const options of [
    { result: { isUpdateAvailable: false }, phase: 'current' },
    {
      result: { isUpdateAvailable: true, updateInfo: { files: [{ url: 'Orca.zip' }] } },
      phase: 'error'
    },
    { failure: new Error('Offline'), phase: 'error' }
  ]) {
    const f = fixture(options)
    assert.equal((await f.service.run()).phase, options.phase)
    assert.equal(f.calls.downloads, 0)
    assert.equal(f.calls.installs, 0)
  }
})
test('a Relay update downloads once, reports progress, then schedules install', async () => {
  const f = fixture({
    result: { isUpdateAvailable: true, updateInfo: { files: [{ url: 'Relay-0.3.0-arm64.zip' }] } }
  })
  await Promise.all([f.service.run(), f.service.run()])
  assert.equal(f.calls.checks, 1)
  assert.equal(f.calls.downloads, 1)
  assert.equal(f.calls.installs, 0)
  assert.equal(
    f.events.some((s) => s.percent === 70),
    true
  )
  assert.equal(f.service.get().phase, 'restarting')
  f.deferred[0]()
  assert.equal(f.calls.installs, 1)
})
