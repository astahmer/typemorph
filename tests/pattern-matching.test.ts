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
    Pattern {
      "kind": 213,
      "kindName": "CallExpression",
      "match": CallExpression,
      "matchFn": [Function],
      "params": undefined,
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
    Pattern {
      "kind": 0,
      "kindName": "Unknown",
      "match": ExpressionStatement,
      "matchFn": [Function],
      "params": undefined,
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
    Pattern {
      "kind": 0,
      "kindName": "Unknown",
      "match": Identifier,
      "matchFn": [Function],
      "params": undefined,
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
    Pattern {
      "kind": 0,
      "kindName": "Unknown",
      "match": CallExpression,
      "matchFn": [Function],
      "params": {
        "name": "find",
      },
    }
  `)
  expect(find?.match?.getText()).toMatchInlineSnapshot('"find({ id: 1 })"')

  const someModule = traverse(sourceFile, ast.named('xxx'))
  expect(someModule).toMatchInlineSnapshot(`
    Pattern {
      "kind": 0,
      "kindName": "Unknown",
      "match": ImportClause,
      "matchFn": [Function],
      "params": {
        "name": "xxx",
      },
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
    Pattern {
      "kind": 80,
      "kindName": "Identifier",
      "match": Identifier,
      "matchFn": [Function],
      "params": {
        "name": "find",
      },
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
    Pattern {
      "kind": 0,
      "kindName": "Unknown",
      "match": StringLiteral,
      "matchFn": [Function],
      "params": undefined,
    }
  `)
  expect(traverse(sourceFile, ast.literal(3))).toMatchInlineSnapshot(`
    Pattern {
      "kind": 9,
      "kindName": "NumericLiteral",
      "match": NumericLiteral,
      "matchFn": [Function],
      "params": {
        "value": 3,
      },
    }
  `)
  expect(traverse(sourceFile, ast.literal('str'))).toMatchInlineSnapshot(`
    Pattern {
      "kind": 11,
      "kindName": "StringLiteral",
      "match": StringLiteral,
      "matchFn": [Function],
      "params": {
        "value": "str",
      },
    }
  `)
  expect(traverse(sourceFile, ast.literal(true))).toMatchInlineSnapshot(`
    Pattern {
      "kind": 112,
      "kindName": "TrueKeyword",
      "match": TrueKeyword,
      "matchFn": [Function],
      "params": {
        "value": true,
      },
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
    Pattern {
      "kind": 9,
      "kindName": "NumericLiteral",
      "match": NumericLiteral,
      "matchFn": [Function],
      "params": {
        "value": 3,
      },
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
    Pattern {
      "kind": 213,
      "kindName": "CallExpression",
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
        "kindName": "CallExpression",
        "match": CallExpression,
        "matchFn": [Function],
        "params": undefined,
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
    Pattern {
      "kind": 213,
      "kindName": "CallExpression",
      "match": CallExpression,
      "matchFn": [Function],
      "params": {
        "arguments": [
          Pattern {
            "kind": 210,
            "kindName": "ObjectLiteralExpression",
            "match": ObjectLiteralExpression,
            "matchFn": [Function],
            "params": {
              "properties": {
                "id": Pattern {
                  "kind": 0,
                  "kindName": "Unknown",
                  "match": NumericLiteral,
                  "matchFn": [Function],
                  "params": undefined,
                },
              },
            },
          },
        ],
      },
    }
  `,
  )

  expect(traverse(sourceFile, ast.callExpression('another', ast.any(), ast.boolean(true), ast.number(), ast.any())))
    .toMatchInlineSnapshot(`
      Pattern {
        "kind": 213,
        "kindName": "CallExpression",
        "match": CallExpression,
        "matchFn": [Function],
        "params": {
          "arguments": [
            Pattern {
              "kind": 0,
              "kindName": "Unknown",
              "match": NumericLiteral,
              "matchFn": [Function],
              "params": undefined,
            },
            Pattern {
              "kind": 112,
              "kindName": "TrueKeyword",
              "match": TrueKeyword,
              "matchFn": [Function],
              "params": {
                "value": true,
              },
            },
            Pattern {
              "kind": 9,
              "kindName": "NumericLiteral",
              "match": NumericLiteral,
              "matchFn": [Function],
              "params": {
                "value": undefined,
              },
            },
            Pattern {
              "kind": 0,
              "kindName": "Unknown",
              "match": StringLiteral,
              "matchFn": [Function],
              "params": undefined,
            },
          ],
        },
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
    Pattern {
      "kind": 213,
      "kindName": "CallExpression",
      "match": CallExpression,
      "matchFn": [Function],
      "params": {
        "arguments": [],
      },
    }
  `)
  expect(traverse(sourceFile, ast.callExpression('another', ast.arguments(ast.any())))).toMatchInlineSnapshot(`
    Pattern {
      "kind": 213,
      "kindName": "CallExpression",
      "match": CallExpression,
      "matchFn": [Function],
      "params": {
        "arguments": [
          Pattern {
            "kind": 191,
            "kindName": "RestType",
            "match": undefined,
            "matchFn": [Function],
            "params": {
              "args": [
                Pattern {
                  "kind": 0,
                  "kindName": "Unknown",
                  "match": StringLiteral,
                  "matchFn": [Function],
                  "params": undefined,
                },
              ],
              "isRest": true,
            },
          },
        ],
      },
    }
  `)

  expect(traverse(sourceFile, ast.callExpression('another', ast.number(), ast.arguments(ast.any()))))
    .toMatchInlineSnapshot(`
      Pattern {
        "kind": 213,
        "kindName": "CallExpression",
        "match": CallExpression,
        "matchFn": [Function],
        "params": {
          "arguments": [
            Pattern {
              "kind": 9,
              "kindName": "NumericLiteral",
              "match": NumericLiteral,
              "matchFn": [Function],
              "params": {
                "value": undefined,
              },
            },
            Pattern {
              "kind": 191,
              "kindName": "RestType",
              "match": undefined,
              "matchFn": [Function],
              "params": {
                "args": [
                  Pattern {
                    "kind": 0,
                    "kindName": "Unknown",
                    "match": StringLiteral,
                    "matchFn": [Function],
                    "params": undefined,
                  },
                ],
                "isRest": true,
              },
            },
          ],
        },
      }
    `)

  expect(traverse(sourceFile, ast.callExpression('another', ast.number(), ast.boolean(), ast.arguments(ast.any()))))
    .toMatchInlineSnapshot(`
      Pattern {
        "kind": 213,
        "kindName": "CallExpression",
        "match": CallExpression,
        "matchFn": [Function],
        "params": {
          "arguments": [
            Pattern {
              "kind": 9,
              "kindName": "NumericLiteral",
              "match": NumericLiteral,
              "matchFn": [Function],
              "params": {
                "value": undefined,
              },
            },
            Pattern {
              "kind": 112,
              "kindName": "TrueKeyword",
              "match": TrueKeyword,
              "matchFn": [Function],
              "params": {
                "value": undefined,
              },
            },
            Pattern {
              "kind": 191,
              "kindName": "RestType",
              "match": undefined,
              "matchFn": [Function],
              "params": {
                "args": [
                  Pattern {
                    "kind": 0,
                    "kindName": "Unknown",
                    "match": StringLiteral,
                    "matchFn": [Function],
                    "params": undefined,
                  },
                ],
                "isRest": true,
              },
            },
          ],
        },
      }
    `)

  // expect(traverse(sourceFile, ast.callExpression('another', ast.arguments(ast.any())))).toMatchInlineSnapshot('undefined')
})
