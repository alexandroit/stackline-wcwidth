import assert from 'node:assert/strict'
import { chmod, copyFile, lstat, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const sourceSiteDir = path.dirname(fileURLToPath(import.meta.url))
const projectDir = path.resolve(sourceSiteDir, '..')
const destination = path.join(sourceSiteDir, 'dist')
const siteFiles = ['index.html', 'styles.css', 'app.js', 'robots.txt', 'sitemap.xml', 'llms.txt', 'llms-full.txt', 'package-meta.json']
const rootFiles = ['README.md', 'CHANGELOG.md', 'COMPATIBILITY.md', 'COMPATIBILITY_CONTRACT.md', 'CONTRIBUTING.md', 'LICENSE', 'MIGRATION.md', 'NOTICE', 'PUBLISHING.md', 'SECURITY.md', 'THIRD_PARTY_LICENSES.md', 'VERIFICATION.md']
const exampleFiles = {
  '{{EXAMPLE_INSTALL}}': 'install.sh',
  '{{EXAMPLE_COMMONJS}}': 'commonjs.cjs',
  '{{EXAMPLE_ESM}}': 'esm.mjs',
  '{{EXAMPLE_ALIAS}}': 'legacy-alias.json'
}

function escapeHtml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

async function copyRegularFile(source, target) {
  const metadata = await lstat(source)
  assert(metadata.isFile(), `documentation input must be a regular file: ${source}`)
  await copyFile(source, target)
  await chmod(target, 0o644)
}

let staging = await mkdtemp(path.join(sourceSiteDir, '.dist-staging-'))
try {
  await chmod(staging, 0o755)
  for (const siteFile of siteFiles.filter((name) => name !== 'index.html')) {
    await copyRegularFile(path.join(sourceSiteDir, siteFile), path.join(staging, siteFile))
  }
  let html = await readFile(path.join(sourceSiteDir, 'index.html'), 'utf8')
  for (const [token, filename] of Object.entries(exampleFiles)) {
    const source = (await readFile(path.join(projectDir, 'examples', filename), 'utf8')).trimEnd()
    assert(html.includes(token), `documentation template is missing ${token}`)
    html = html.replace(token, escapeHtml(source))
  }
  assert(!html.includes('{{EXAMPLE_'), 'documentation template contains an unresolved example token')
  await writeFile(path.join(staging, 'index.html'), html, { mode: 0o644 })
  for (const rootFile of rootFiles) await copyRegularFile(path.join(projectDir, rootFile), path.join(staging, rootFile))
  const preparedFiles = (await readdir(staging)).sort()
  assert.deepEqual(preparedFiles, [...siteFiles, ...rootFiles].sort(), 'prepared site inventory is incomplete')
  await rm(destination, { force: true, recursive: true })
  await rename(staging, destination)
  staging = null
  console.log(`Prepared self-contained wcwidth documentation tree: ${preparedFiles.length} files`)
} finally {
  if (staging) await rm(staging, { force: true, recursive: true })
}
