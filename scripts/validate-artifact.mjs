import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const PACKAGE_NAME = '@anu3ev/fabric-image-editor'
export const SHA_PATTERN = /^[a-f0-9]{40}$/
export const VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/

export function validateManifest({ manifest, expectedSha }) {
  if (!SHA_PATTERN.test(expectedSha) || manifest.sha !== expectedSha) {
    throw new Error('Package commit does not match the exact validated SHA')
  }
  if (manifest.name !== PACKAGE_NAME || !VERSION_PATTERN.test(manifest.version)) {
    throw new Error('Unexpected package name or invalid semantic version')
  }
  if (typeof manifest.filename !== 'string' || !/^[a-zA-Z0-9_.-]+\.tgz$/.test(manifest.filename)) {
    throw new Error('The tarball filename must be a plain .tgz basename')
  }
  if (!/^[a-f0-9]{64}$/.test(manifest.sha256) || !/^sha512-[A-Za-z0-9+/]{86}==$/.test(manifest.integrity)) {
    throw new Error('Missing or invalid tarball SHA-256 / SHA-512 integrity')
  }
  return manifest
}

export async function validateArtifact({ directory, expectedSha }) {
  const manifest = validateManifest({
    manifest: JSON.parse(await readFile(path.join(directory, 'manifest.json'), 'utf8')),
    expectedSha
  })
  const tarballs = (await readdir(directory)).filter(name => name.endsWith('.tgz'))
  if (tarballs.length !== 1 || tarballs[0] !== manifest.filename) {
    throw new Error('Expected exactly the single validated tarball')
  }
  const bytes = await readFile(path.join(directory, manifest.filename))
  const sha256 = createHash('sha256').update(bytes).digest('hex')
  const integrity = `sha512-${createHash('sha512').update(bytes).digest('base64')}`
  if (sha256 !== manifest.sha256 || integrity !== manifest.integrity) {
    throw new Error('Tarball bytes differ from the validated manifest')
  }
  const { stdout } = await promisify(execFile)('tar', ['-xOf', path.join(directory, manifest.filename), 'package/package.json'], { maxBuffer: 1024 * 1024 })
  const packaged = JSON.parse(stdout)
  if (packaged.name !== manifest.name || packaged.version !== manifest.version) {
    throw new Error('The package inside the tarball differs from its validated manifest')
  }
  return manifest
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const [directory = 'package-artifacts', expectedSha = process.env.VALIDATED_SHA] = process.argv.slice(2)
  const manifest = await validateArtifact({ directory, expectedSha })
  console.log(`${manifest.name}@${manifest.version}: ${manifest.sha256}`)
}
