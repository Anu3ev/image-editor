import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

/** Detect focused Jest/Playwright invocations, not ordinary fit identifiers or data. */
export function focusedTests(source, filename = 'test.ts') {
  const tree = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true)
  const failures = new Set()
  const roots = new Set(['test', 'it', 'describe'])
  const focusedRoots = new Set(['fit', 'fdescribe'])
  // Aliased imports are common in Playwright fixtures and Jest ESM tests.
  for (const statement of tree.statements) {
    if (!ts.isImportDeclaration(statement)) continue
    const bindings = statement.importClause?.namedBindings
    if (!bindings || !ts.isNamedImports(bindings)) continue
    for (const binding of bindings.elements) {
      const original = (binding.propertyName ?? binding.name).text
      if (roots.has(original)) roots.add(binding.name.text)
      if (focusedRoots.has(original)) focusedRoots.add(binding.name.text)
    }
  }
  function chain(node) {
    if (ts.isIdentifier(node)) return [node.text]
    if (ts.isPropertyAccessExpression(node)) return [...chain(node.expression), node.name.text]
    if (ts.isElementAccessExpression(node) && ts.isStringLiteralLike(node.argumentExpression)) {
      return [...chain(node.expression), node.argumentExpression.text]
    }
    if (ts.isCallExpression(node) || ts.isParenthesizedExpression(node)) return chain(node.expression)
    if (ts.isTaggedTemplateExpression(node)) return chain(node.tag)
    return []
  }
  function visit(node) {
    if (ts.isCallExpression(node) || ts.isTaggedTemplateExpression(node)) {
      const [root, ...properties] = chain(ts.isCallExpression(node) ? node.expression : node.tag)
      if (focusedRoots.has(root) || (roots.has(root) && properties.includes('only'))) {
        failures.add(tree.getLineAndCharacterOfPosition(node.getStart()).line + 1)
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(tree)
  return [...failures]
}

async function scan(directory) {
  const failures = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      failures.push(...await scan(file))
    } else if (/\.[cm]?[jt]sx?$/.test(file)) {
      for (const line of focusedTests(await readFile(file, 'utf8'), file)) failures.push(`${file}:${line}`)
    }
  }
  return failures
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const failures = [...await scan('specs'), ...await scan('e2e')]
  if (failures.length) throw new Error(`Focused tests are forbidden:\n${failures.join('\n')}`)
}
