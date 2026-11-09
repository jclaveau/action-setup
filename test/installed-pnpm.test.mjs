import assert from 'node:assert/strict'
import { tmpdir } from 'node:os'
import { beforeEach, mock, test } from 'node:test'

let pnpmOnPath
let versionOutput
const which = mock.fn(async () => pnpmOnPath)
const getExecOutput = mock.fn(async () => versionOutput)
mock.module('@actions/io', { namedExports: { which } })
mock.module('@actions/exec', { namedExports: { getExecOutput } })
const { findInstalledPnpm } = await import('../src/install-pnpm/installed-pnpm.ts')

beforeEach(() => {
  pnpmOnPath = '/usr/local/bin/pnpm'
  versionOutput = { exitCode: 0, stdout: '12.16.1\n', stderr: '' }
  which.mock.resetCalls()
  getExecOutput.mock.resetCalls()
})

test('finds a pnpm on PATH at exactly the target version', async () => {
  assert.equal(await findInstalledPnpm('12.16.1'), '/usr/local/bin/pnpm')
  assert.deepEqual(getExecOutput.mock.calls[0].arguments, [
    '"/usr/local/bin/pnpm"',
    ['--version'],
    { cwd: tmpdir(), ignoreReturnCode: true, silent: true },
  ])
})

test('ignores a pnpm on PATH at another version', async () => {
  versionOutput = { exitCode: 0, stdout: '12.6.0\n', stderr: '' }
  assert.equal(await findInstalledPnpm('12.16.1'), undefined)
})

test('ignores a pnpm on PATH whose --version fails', async () => {
  versionOutput = { exitCode: 1, stdout: '12.16.1\n', stderr: 'boom' }
  assert.equal(await findInstalledPnpm('12.16.1'), undefined)
})

test('finds nothing when pnpm is not on PATH', async () => {
  pnpmOnPath = ''
  assert.equal(await findInstalledPnpm('12.16.1'), undefined)
  assert.equal(getExecOutput.mock.callCount(), 0)
})

test('never matches a range, even one the installed pnpm satisfies', async () => {
  assert.equal(await findInstalledPnpm('12'), undefined)
  assert.equal(await findInstalledPnpm('^12.16.0'), undefined)
  assert.equal(await findInstalledPnpm('latest-12'), undefined)
  assert.equal(which.mock.callCount(), 0)
})
