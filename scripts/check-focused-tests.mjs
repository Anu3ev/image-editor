import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

export function focusedTests(source, filename = 'test.ts') {
  const tree = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true)
  const failures = []
  const roots = new Set(['test', 'it', 'describe', 'fit', 'fdescribe'])
  function rootName(node) {
    if (ts.isIdentifier(node)) return node.text
    if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) return rootName(node.expression)
    if (ts.isCallExpression(node) || ts.isTaggedTemplateExpression(node)) return rootName(node.expression ?? node.tag)
    if (ts.isParenthesizedExpression(node)) return rootName(node.expression)
    return undefined
  }
  function visit(node) {
    let property
    if (ts.isPropertyAccessExpression(node)) {
      property = node.name.text
    } else if (ts.isElementAccessExpression(node) && ts.isStringLiteral(node.argumentExpression)) {
      property = node.argumentExpression.text
    }
    const directFocus = ts.isIdentifier(node) && ['fit', 'fdescribe'].includes(node.text)
    if (directFocus || (property === 'only' && roots.has(rootName(node)))) {
      failures.push(tree.getLineAndCharacterOfPosition(node.getStart()).line + 1)
    }
    ts.forEachChild(node, visit)
  }
  visit(tree)
  return [...new Set(failures)]
}
async function scan(directory) {
  const failures = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name)
    if (entry.isDirectory()) failures.push(...await scan(file))
    else if (/\.[cm]?[jt]sx?$/.test(file)) {
      for (const line of focusedTests(await readFile(file, 'utf8'), file)) failures.push(`${file}:${line}`)
    }
  }
  return failures
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const failures = await scan('specs')
  if (failures.length) throw new Error(`Focused Jest tests are forbidden:\n${failures.join('\n')}`)
}
