import { info } from '@actions/core'
import { getExecOutput } from '@actions/exec'
import { which } from '@actions/io'
import { tmpdir } from 'os'
import { valid } from 'semver'

/**
 * Path of a `pnpm` already on PATH whose version is exactly `targetVersion`,
 * e.g. one shipped by the job's container image. Ranges never match: only an
 * exact version proves the install would produce the same pnpm.
 */
export async function findInstalledPnpm(targetVersion: string): Promise<string | undefined> {
  if (valid(targetVersion) !== targetVersion) return undefined

  const pnpmPath = await which('pnpm', false)
  if (!pnpmPath) return undefined

  // Run outside the workspace: there, pnpm could switch itself to the
  // version its packageManager field names and print that one instead.
  let versionOutput: { exitCode: number; stdout: string }
  try {
    versionOutput = await getExecOutput(`"${pnpmPath}"`, ['--version'], {
      cwd: tmpdir(),
      ignoreReturnCode: true,
      silent: true,
    })
  } catch (error: unknown) {
    // A pnpm that cannot even start is no reason to fail: install as usual.
    const message = error instanceof Error ? error.message : String(error)
    info(`Ignoring the pnpm at ${JSON.stringify(pnpmPath)}: ${JSON.stringify(message)}`)
    return undefined
  }
  const { exitCode, stdout } = versionOutput
  return exitCode === 0 && stdout.trim() === targetVersion ? pnpmPath : undefined
}

export default findInstalledPnpm
