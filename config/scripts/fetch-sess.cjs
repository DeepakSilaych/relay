const { createHash } = require('node:crypto')
const {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
  copyFileSync,
  chmodSync
} = require('node:fs')
const { join, resolve } = require('node:path')
const { tmpdir } = require('node:os')
const { execFileSync } = require('node:child_process')
const version = '0.7.0'
const hashes = {
  'darwin-arm64': '95709fb61da9e9f895ec19f0ba03077ba90487a478631137fe0562bd969e17d7',
  'darwin-amd64': '632182ff12e1a59270af0d3ff689c2e26778efd836c63f96b1817953fa2b52e1',
  'linux-amd64': 'a5bbf071087c422a508705ccec802e5436af179853b499c5a1d7ccbf6903be3e',
  'linux-arm64': '760a90430fc0bd22edc5dc3d0435722155db0e7bf58fe5a82546bfd19e769b4f'
}
;(async () => {
  const target =
    process.argv[2] || `${process.platform}-${process.arch === 'x64' ? 'amd64' : process.arch}`
  if (!hashes[target]) throw new Error(`Unsupported sess platform: ${target}`)
  const dir = resolve(__dirname, '../../resources/relay/bin')
  const temp = mkdtempSync(join(tmpdir(), 'relay-sess-'))
  try {
    const name = `sess-${target}.tar.gz`
    const response = await fetch(
      `https://github.com/DeepakSilaych/sess/releases/download/v${version}/${name}`
    )
    if (!response.ok) throw new Error(`sess download failed: ${response.status}`)
    const data = Buffer.from(await response.arrayBuffer())
    if (createHash('sha256').update(data).digest('hex') !== hashes[target])
      throw new Error('sess checksum mismatch')
    writeFileSync(join(temp, name), data)
    execFileSync('tar', ['-xzf', join(temp, name), '-C', temp, 'sess', 'LICENSE'])
    mkdirSync(dir, { recursive: true })
    copyFileSync(join(temp, 'sess'), join(dir, 'sess'))
    copyFileSync(join(temp, 'LICENSE'), join(dir, 'LICENSE'))
    chmodSync(join(dir, 'sess'), 0o755)
    console.log(`Verified sess ${version} (${target})`)
  } finally {
    rmSync(temp, { recursive: true, force: true })
  }
})().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
