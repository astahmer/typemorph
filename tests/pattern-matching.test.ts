import { expect, test } from 'vitest'
import { createProject } from './create-project'
import { SourceFile, ts, Node, Identifier } from 'ts-morph'
import { Pattern, ast } from '../src/pattern-matching'

const project = createProject()
const parse = (code: string) =>
  project.createSourceFile('file.tsx', code, { overwrite: true, scriptKind: ts.ScriptKind.TSX })

const traverse = <TPattern extends Pattern>(sourceFile: SourceFile, pattern: TPattern) => {
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

test('ast.node', () => {
  const code = `
        someFn()
        another(1, true, 3, "str")
        find({ id: 1 })
    `

  const sourceFile = parse(code)
  const pattern = traverse(sourceFile, ast.node(ts.SyntaxKind.CallExpression))

  expect(pattern).toMatchInlineSnapshot(`
    Pattern<CallExpression> {
      "matchKind": "CallExpression",
      "match": "someFn()"
    }
  `)
  expect(pattern?.match?.getText()).toMatchInlineSnapshot('"someFn()"')
})

test('ast.any', () => {
  const code = `
        another(1, true, 3, "str")
        someFn()
        find({ id: 1 })
    `

  const sourceFile = parse(code)
  const pattern = traverse(sourceFile, ast.any())

  expect(pattern).toMatchInlineSnapshot(`
    Pattern<Unknown> {
      "matchKind": "ExpressionStatement",
      "match": "another(1, true, 3, \\"str\\")"
    }
  `)
  expect(pattern?.match?.getText()).toMatchInlineSnapshot('"another(1, true, 3, \\"str\\")"')
})

test('ast.when', () => {
  const code = `
        another(1, true, 3, "str")
        someFn()
        find({ id: 1 })
    `

  const sourceFile = parse(code)
  const pattern = traverse(
    sourceFile,
    ast.when((node): node is Identifier => Node.isIdentifier(node) && node.getText() === 'find'),
  )

  expect(pattern).toMatchInlineSnapshot(`
    Pattern<Unknown> {
      "matchKind": "Identifier",
      "match": "find"
    }
  `)
  expect(pattern?.match?.getText()).toMatchInlineSnapshot('"find"')
})

test('ast.named', () => {
  const code = `
    import xxx from "some-module"

        another(1, true, 3, "str")
        someFn()
        find({ id: 1 })
    `

  const sourceFile = parse(code)
  const find = traverse(sourceFile, ast.named('find'))

  expect(find).toMatchInlineSnapshot(`
    Pattern<Unknown> {
      "params": {
        "name": "find"
      },
      "matchKind": "CallExpression",
      "match": "find({ id: 1 })"
    }
  `)
  expect(find?.match?.getText()).toMatchInlineSnapshot('"find({ id: 1 })"')

  const someModule = traverse(sourceFile, ast.named('xxx'))
  expect(someModule).toMatchInlineSnapshot(`
    Pattern<Unknown> {
      "params": {
        "name": "xxx"
      },
      "matchKind": "ImportClause",
      "match": "xxx"
    }
  `)
})

test('ast.identifier', () => {
  const code = `
    import xxx from "some-module"

        another(1, true, 3, "str")
        someFn()
        find({ id: 1 })
    `

  const sourceFile = parse(code)
  const pattern = traverse(sourceFile, ast.identifier('find'))

  expect(pattern).toMatchInlineSnapshot(`
    Pattern<Identifier> {
      "params": {
        "name": "find"
      },
      "matchKind": "Identifier",
      "match": "find"
    }
  `)
})

test('ast.literal', () => {
  const code = `
    import xxx from "some-module"

        another(1, true, 3, "str")
        someFn()
        find({ id: 1 })
    `

  const sourceFile = parse(code)

  expect(traverse(sourceFile, ast.literal())).toMatchInlineSnapshot(`
    Pattern<Unknown> {
      "matchKind": "StringLiteral",
      "match": "\\"some-module\\""
    }
  `)
  expect(traverse(sourceFile, ast.literal(3))).toMatchInlineSnapshot(`
    Pattern<NumericLiteral> {
      "params": {
        "value": 3
      },
      "matchKind": "NumericLiteral",
      "match": "3"
    }
  `)
  expect(traverse(sourceFile, ast.literal('str'))).toMatchInlineSnapshot(`
    Pattern<StringLiteral> {
      "params": {
        "value": "str"
      },
      "matchKind": "StringLiteral",
      "match": "\\"str\\""
    }
  `)
  expect(traverse(sourceFile, ast.literal(true))).toMatchInlineSnapshot(`
    Pattern<TrueKeyword> {
      "params": {
        "value": true
      },
      "matchKind": "TrueKeyword",
      "match": "true"
    }
  `)
})

test('ast.literal', () => {
  const code = `
    import xxx from "some-module"

        another(1, true, 3, "str")
        someFn()
        find({ id: 1 })
    `

  const sourceFile = parse(code)
  const pattern = traverse(sourceFile, ast.literal(3))

  expect(pattern).toMatchInlineSnapshot(`
    Pattern<NumericLiteral> {
      "params": {
        "value": 3
      },
      "matchKind": "NumericLiteral",
      "match": "3"
    }
  `)
})

test('CallExpression', () => {
  const code = `
        someFn()
        another(1, true, 3, "str")
        find({ id: 1 })
    `

  const sourceFile = parse(code)

  expect(traverse(sourceFile, ast.callExpression('someFn'))).toMatchInlineSnapshot(`
    Pattern<CallExpression> {
      "params": {
        "arguments": []
      },
      "matchKind": "CallExpression",
      "match": "someFn()"
    }
  `)

  expect(traverse(sourceFile, ast.node(ts.SyntaxKind.CallExpression, { expression: ast.identifier('someFn') })))
    .toMatchInlineSnapshot(`
      Pattern<CallExpression> {
        "matchKind": "CallExpression",
        "match": "someFn()"
      }
    `)
})

test('CallExpression with params', () => {
  const code = `
        someFn()
        another(1, true, 3, "str")
        find({ id: 1 })
    `

  const sourceFile = parse(code)
  expect(traverse(sourceFile, ast.callExpression('find', ast.object({ id: ast.any() })))).toMatchInlineSnapshot(
    `
    Pattern<CallExpression> {
      "params": {
        "arguments": [
          "ObjectLiteralExpression"
        ]
      },
      "matchKind": "CallExpression",
      "match": "find({ id: 1 })"
    }
  `,
  )

  expect(traverse(sourceFile, ast.callExpression('another', ast.any(), ast.boolean(true), ast.number(), ast.any())))
    .toMatchInlineSnapshot(`
      Pattern<CallExpression> {
        "params": {
          "arguments": [
            "Unknown",
            "TrueKeyword",
            "NumericLiteral",
            "Unknown"
          ]
        },
        "matchKind": "CallExpression",
        "match": "another(1, true, 3, \\"str\\")"
      }
    `)
})

test('CallExpression arguments with rest params', () => {
  const code = `
        someFn()
        another(1, true, 3, "str")
        find({ id: 1 })
    `

  const sourceFile = parse(code)

  expect(traverse(sourceFile, ast.callExpression('another'))).toMatchInlineSnapshot(`
    Pattern<CallExpression> {
      "params": {
        "arguments": []
      },
      "matchKind": "CallExpression",
      "match": "another(1, true, 3, \\"str\\")"
    }
  `)
  expect(traverse(sourceFile, ast.callExpression('another', ast.arguments(ast.any())))).toMatchInlineSnapshot(`
    Pattern<CallExpression> {
      "params": {
        "arguments": [
          "RestType"
        ]
      },
      "matchKind": "CallExpression",
      "match": "another(1, true, 3, \\"str\\")"
    }
  `)

  expect(traverse(sourceFile, ast.callExpression('another', ast.number(), ast.arguments(ast.any()))))
    .toMatchInlineSnapshot(`
      Pattern<CallExpression> {
        "params": {
          "arguments": [
            "NumericLiteral",
            "RestType"
          ]
        },
        "matchKind": "CallExpression",
        "match": "another(1, true, 3, \\"str\\")"
      }
    `)

  expect(traverse(sourceFile, ast.callExpression('another', ast.number(), ast.boolean(), ast.arguments(ast.any()))))
    .toMatchInlineSnapshot(`
      Pattern<CallExpression> {
        "params": {
          "arguments": [
            "NumericLiteral",
            "TrueKeyword",
            "RestType"
          ]
        },
        "matchKind": "CallExpression",
        "match": "another(1, true, 3, \\"str\\")"
      }
    `)

  // expect(traverse(sourceFile, ast.callExpression('another', ast.arguments(ast.any())))).toMatchInlineSnapshot('undefined')
})
