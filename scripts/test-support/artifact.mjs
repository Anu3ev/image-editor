import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { PACKAGE_NAME, REPOSITORY } from '../build-artifact.mjs'

export const fixtureManifest = {
  name: PACKAGE_NAME,
  version: '1.2.3',
  sha: 'a'.repeat(40),
  filename: 'editor-1.2.3.tgz',
  sha256: 'c'.repeat(64),
  integrity: `sha512-${'a'.repeat(86)}==`,
  source: {
    runId: '100',
    attempt: 1,
    repository: REPOSITORY,
    event: 'push',
    ref: 'refs/heads/master',
    browserSuite: 'full',
    previousSha: 'b'.repeat(40),
    versionChanged: true
  }
}

/** A real tar archive lets gate/CLI tests exercise the production artifact validator. */
export async function writeArtifact(directory, manifest = fixtureManifest) {
  await mkdir(path.join(directory, 'package/dist/assets'), { recursive: true })
  const pkg = JSON.stringify({ name: manifest.name, version: manifest.version })
  await writeFile(path.join(directory, 'package/package.json'), pkg)
  await writeFile(path.join(directory, 'package/dist/main.js'), 'export default {}')
  await writeFile(path.join(directory, 'package/dist/assets/worker-test.js'), 'self.onmessage = () => {}')
  const tarball = path.join(directory, manifest.filename)
  execFileSync('tar', ['-czf', tarball, '-C', directory, 'package'])
  const bytes = await readFile(tarball)
  const packed = {
    ...manifest,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    integrity: `sha512-${createHash('sha512').update(bytes).digest('base64')}`
  }
  await writeFile(path.join(directory, 'manifest.json'), JSON.stringify(packed))
  return packed
}
