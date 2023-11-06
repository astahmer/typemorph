import { expect, test } from 'vitest'
import { createProject } from './create-project'
import { SourceFile, ts } from 'ts-morph'
import { Pattern, ast } from '../src/pattern-matching'

const project = createProject()
const parse = (code: string) =>
  project.createSourceFile('file.tsx', code, { overwrite: true, scriptKind: ts.ScriptKind.TSX })

const traverse = (sourceFile: SourceFile, pattern: Pattern) => {
  let match: Pattern | undefined
  sourceFile.forEachDescendant((node, traversal) => {
    // console.log(node.getKindName())
    if (pattern.matchFn(node)) {
      match = pattern
      traversal.stop()
    }
  })

  return match
}

test('CallExpression', () => {
  const code = `
        someFn()
        another()
        find({ id: 1 })
    `

  const sourceFile = parse(code)

  expect(traverse(sourceFile, ast.callExpression('someFn'))).toMatchInlineSnapshot(`
    Pattern {
      "kind": 213,
      "match": CallExpression,
      "matchFn": [Function],
      "params": {
        "arguments": [],
      },
    }
  `)

  expect(traverse(sourceFile, ast.node(ts.SyntaxKind.CallExpression, { expression: ast.identifier('someFn') })))
    .toMatchInlineSnapshot(`
      Pattern {
        "kind": 213,
        "match": CallExpression,
        "matchFn": [Function],
        "params": undefined,
      }
    `)

  const oui = ast.callExpression('someFn', ast.object({ id: ast.number(1) }))
  const id = oui.params?.arguments?.[0].params?.properties.id
  //    ^?

  expect(traverse(sourceFile, ast.callExpression('someFn', ast.object({ id: ast.any() })))).toMatchInlineSnapshot('undefined')
})
