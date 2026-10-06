import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { assertBuildIdentity, validateEvidence } from './validate-gate.mjs'
import { REPOSITORY } from './release-package.mjs'

export function validateSourceRun(run) {
  if (run.repository?.full_name !== REPOSITORY || run.head_repository?.full_name !== REPOSITORY ||
      run.path !== '.github/workflows/test.yml' || run.event !== 'push' || run.head_branch !== 'master' ||
      run.conclusion !== 'success' || run.status !== 'completed' || !/^[a-f0-9]{40}$/.test(run.head_sha)) {
    throw new Error('Pages requires the successful Validate master-push run in the trusted repository')
  }
  return { sha: run.head_sha, runId: String(run.id), buildId: `${run.id}-${run.run_attempt}` }
}

export function assertCurrentMaster({ expectedSha, actualSha }) {
  if (expectedSha !== actualSha) throw new Error(`Stale Pages candidate ${expectedSha}; master is now ${actualSha}`)
}

export async function verifyLiveIdentity({
  url,
  evidence,
  fetcher = fetch,
  wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)),
  attempts = 18
}) {
  const base = new URL(url)
  if (base.protocol !== 'https:') throw new Error('Expected the HTTPS URL returned by deploy-pages')
  base.pathname = `${base.pathname.replace(/\/$/, '')}/build-info.json`
  base.searchParams.set('validation', evidence.buildId)
  let lastError
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetcher(base, { cache: 'no-store', signal: AbortSignal.timeout(20_000) })
      if (!response.ok) throw new Error(`Pages build identity returned ${response.status}`)
      assertBuildIdentity({
        identity: await response.json(),
        expectedSha: evidence.sha,
        expectedBuildId: evidence.buildId,
        expectedVersion: evidence.package.version
      })
      return
    } catch (error) {
      lastError = error
      if (attempt + 1 < attempts) await wait(10_000)
    }
  }
  throw new Error(`Deployed Pages identity could not be verified: ${lastError?.message}`)
}

async function main() {
  const [command] = process.argv.slice(2)
  const evidence = JSON.parse(await readFile('validation-evidence/validation.json', 'utf8'))
  validateEvidence({ evidence, manifest: evidence.package, expectedSha: process.env.VALIDATED_SHA, full: true })
  if (evidence.buildId !== process.env.BUILD_ID) throw new Error('Evidence belongs to a different validation run or attempt')
  if (command === 'local') {
    assertBuildIdentity({
      identity: JSON.parse(await readFile('validated-pages/build-info.json', 'utf8')),
      expectedSha: evidence.sha,
      expectedBuildId: evidence.buildId,
      expectedVersion: evidence.package.version
    })
    const html = await readFile('validated-pages/index.html', 'utf8')
    if (!html.trim()) throw new Error('Pages artifact has no index.html')
  } else if (command === 'live') {
    await verifyLiveIdentity({ url: process.env.PAGE_URL, evidence })
  } else {
    throw new Error('Expected local or live Pages verification')
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) await main()
