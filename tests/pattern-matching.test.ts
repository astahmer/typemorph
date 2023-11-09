import { Node, SyntaxKind, ts } from 'ts-morph'
import { describe, expect, test } from 'vitest'
import { ast } from '../src/pattern-matching'
import { parse, traverse } from './tests-utils'

test('ast.node', () => {
  const code = `
        someFn()
        another(1, true, 3, "str")
        find({ id: 1 })
    `

  const sourceFile = parse(code)

  expect(traverse(sourceFile, ast.node(ts.SyntaxKind.CallExpression))).toMatchInlineSnapshot(`
    Pattern<CallExpression> {
      "matches": [
        {
          "kind": "CallExpression",
          "text": "someFn()",
          "line": 2,
          "column": 1
        },
        {
          "kind": "CallExpression",
          "text": "another(1, true, 3, \\"str\\")",
          "line": 3,
          "column": 18
        },
        {
          "kind": "CallExpression",
          "text": "find({ id: 1 })",
          "line": 4,
          "column": 53
        }
      ]
    }
  `)
})

test('ast.node - no match', () => {
  const code = `
        someFn()
        another(1, true, 3, "str")
        find({ id: 1 })
    `

  const sourceFile = parse(code)
  const pattern = traverse(sourceFile, ast.node(ts.SyntaxKind.CallExpression, { expression: ast.identifier('xxx') }))

  expect(pattern).toMatchInlineSnapshot('undefined')
})

test('ast.nodeList', () => {
  const code = `
        someFn({})
        another(1, true, 3, "str")
        find({ id: 1 })
        thing({ aaa: 1, bbb: 2 })
    `

  const sourceFile = parse(code)

  expect(
    traverse(
      sourceFile,
      ast.node(ts.SyntaxKind.ObjectLiteralExpression, {
        properties: ast.nodeList(),
      }),
    ),
  ).toMatchInlineSnapshot(`
    Pattern<ObjectLiteralExpression> {
      "matches": [
        {
          "kind": "ObjectLiteralExpression",
          "text": "{}",
          "line": 2,
          "column": 1
        },
        {
          "kind": "ObjectLiteralExpression",
          "text": "{ id: 1 }",
          "line": 4,
          "column": 55
        },
        {
          "kind": "ObjectLiteralExpression",
          "text": "{ aaa: 1, bbb: 2 }",
          "line": 5,
          "column": 79
        }
      ]
    }
  `)

  expect(
    traverse(
      sourceFile,
      ast.node(ts.SyntaxKind.ObjectLiteralExpression, {
        properties: ast.nodeList(
          ast.when((node) => {
            if (Array.isArray(node) && node.length === 1) {
              return node[0]
            }
          }),
        ),
      }),
    ),
  ).toMatchInlineSnapshot(`
    Pattern<ObjectLiteralExpression> {
      "matches": [
        {
          "kind": "ObjectLiteralExpression",
          "text": "{ id: 1 }",
          "line": 4,
          "column": 55
        }
      ]
    }
  `)

  expect(
    traverse(
      sourceFile,
      ast.node(ts.SyntaxKind.ObjectLiteralExpression, {
        properties: ast.refine(ast.nodeList(), (node) => {
          if (Array.isArray(node) && node.length > 1) {
            return true
          }
        }),
      }),
    ),
  ).toMatchInlineSnapshot(`
    Pattern<ObjectLiteralExpression> {
      "matches": [
        {
          "kind": "ObjectLiteralExpression",
          "text": "{ aaa: 1, bbb: 2 }",
          "line": 5,
          "column": 79
        }
      ]
    }
  `)
})

test('ast.each - list options', () => {
  const code = `
        someFn({})
        another(1, true, 3, "str")
        find({ id: 1 })
        thing({ xxx: 1, yyy: 2, zzz: 3 })
        thing({ aaa: 1, bbb: 2 })
    `

  const sourceFile = parse(code)

  expect(
    traverse(
      sourceFile,
      ast.node(ts.SyntaxKind.ObjectLiteralExpression, {
        properties: ast.every(ast.any(), { min: 1 }),
      }),
    ),
  ).toMatchInlineSnapshot(`
    Pattern<ObjectLiteralExpression> {
      "matches": [
        {
          "kind": "ObjectLiteralExpression",
          "text": "{ id: 1 }",
          "line": 4,
          "column": 55
        },
        {
          "kind": "ObjectLiteralExpression",
          "text": "{ xxx: 1, yyy: 2, zzz: 3 }",
          "line": 5,
          "column": 79
        },
        {
          "kind": "ObjectLiteralExpression",
          "text": "{ aaa: 1, bbb: 2 }",
          "line": 6,
          "column": 121
        }
      ]
    }
  `)
  expect(
    traverse(
      sourceFile,
      ast.node(ts.SyntaxKind.ObjectLiteralExpression, {
        properties: ast.every(ast.any(), { min: 2 }),
      }),
    ),
  ).toMatchInlineSnapshot(`
    Pattern<ObjectLiteralExpression> {
      "matches": [
        {
          "kind": "ObjectLiteralExpression",
          "text": "{ xxx: 1, yyy: 2, zzz: 3 }",
          "line": 5,
          "column": 79
        },
        {
          "kind": "ObjectLiteralExpression",
          "text": "{ aaa: 1, bbb: 2 }",
          "line": 6,
          "column": 121
        }
      ]
    }
  `)
  expect(
    traverse(
      sourceFile,
      ast.node(ts.SyntaxKind.ObjectLiteralExpression, {
        properties: ast.every(ast.any(), { min: 2, max: 2 }),
      }),
    ),
  ).toMatchInlineSnapshot(`
    Pattern<ObjectLiteralExpression> {
      "matches": [
        {
          "kind": "ObjectLiteralExpression",
          "text": "{ aaa: 1, bbb: 2 }",
          "line": 6,
          "column": 121
        }
      ]
    }
  `)
})

test('ast.each', () => {
  const code = `
        someFn({})
        another(1, true, 3, "str")
        find({ id: 1 })
        thing({ xxx: 1, yyy: 2, zzz: 3 })
        thing({ aaa: 1, bbb: 2 })
    `

  const sourceFile = parse(code)

  expect(
    traverse(
      sourceFile,
      ast.node(ts.SyntaxKind.ObjectLiteralExpression, {
        properties: ast.every(ast.any()),
      }),
    ),
  ).toMatchInlineSnapshot(`
    Pattern<ObjectLiteralExpression> {
      "matches": [
        {
          "kind": "ObjectLiteralExpression",
          "text": "{}",
          "line": 2,
          "column": 1
        },
        {
          "kind": "ObjectLiteralExpression",
          "text": "{ id: 1 }",
          "line": 4,
          "column": 55
        },
        {
          "kind": "ObjectLiteralExpression",
          "text": "{ xxx: 1, yyy: 2, zzz: 3 }",
          "line": 5,
          "column": 79
        },
        {
          "kind": "ObjectLiteralExpression",
          "text": "{ aaa: 1, bbb: 2 }",
          "line": 6,
          "column": 121
        }
      ]
    }
  `)
  expect(
    traverse(
      sourceFile,
      ast.node(ts.SyntaxKind.ObjectLiteralExpression, {
        properties: ast.every(ast.node(SyntaxKind.AbstractKeyword), { min: 1 }),
      }),
    ),
  ).toMatchInlineSnapshot('undefined')
  expect(
    traverse(
      sourceFile,
      ast.node(ts.SyntaxKind.ObjectLiteralExpression, {
        properties: ast.every(ast.node(SyntaxKind.PropertyAssignment), { min: 1 }),
      }),
    ),
  ).toMatchInlineSnapshot(`
    Pattern<ObjectLiteralExpression> {
      "matches": [
        {
          "kind": "ObjectLiteralExpression",
          "text": "{ id: 1 }",
          "line": 4,
          "column": 55
        },
        {
          "kind": "ObjectLiteralExpression",
          "text": "{ xxx: 1, yyy: 2, zzz: 3 }",
          "line": 5,
          "column": 79
        },
        {
          "kind": "ObjectLiteralExpression",
          "text": "{ aaa: 1, bbb: 2 }",
          "line": 6,
          "column": 121
        }
      ]
    }
  `)

  const incompleteUnion = ast.node(SyntaxKind.PropertyAssignment, {
    name: ast.union(ast.named('xxx')),
  })
  expect(
    traverse(
      sourceFile,
      ast.node(ts.SyntaxKind.ObjectLiteralExpression, {
        properties: ast.every(
          ast.when((node) => {
            return incompleteUnion.matchFn(node)
          }),
          { min: 1 },
        ),
      }),
    ),
  ).toMatchInlineSnapshot('undefined')
  const union = ast.node(SyntaxKind.PropertyAssignment, {
    name: ast.union(ast.named('xxx'), ast.named('yyy'), ast.named('zzz')),
  })
  expect(
    traverse(
      sourceFile,
      ast.node(ts.SyntaxKind.ObjectLiteralExpression, {
        properties: ast.every(
          ast.when((node) => union.matchFn(node)),
          { min: 1 },
        ),
      }),
    ),
  ).toMatchInlineSnapshot(`
    Pattern<ObjectLiteralExpression> {
      "matches": [
        {
          "kind": "ObjectLiteralExpression",
          "text": "{ xxx: 1, yyy: 2, zzz: 3 }",
          "line": 5,
          "column": 79
        }
      ]
    }
  `)
})

test('ast.any', () => {
  const code = `
        another(1, true, 3, "str")
        someFn()
        find({ id: 1 })
    `

  const sourceFile = parse(code)

  expect(traverse(sourceFile, ast.any())).toMatchInlineSnapshot(`
    Pattern<Unknown> {
      "matches": [
        {
          "kind": "ExpressionStatement",
          "text": "another(1, true, 3, \\"str\\")",
          "line": 2,
          "column": 1
        },
        {
          "kind": "CallExpression",
          "text": "another(1, true, 3, \\"str\\")",
          "line": 2,
          "column": 1
        },
        {
          "kind": "Identifier",
          "text": "another",
          "line": 2,
          "column": 1
        },
        {
          "kind": "NumericLiteral",
          "text": "1",
          "line": 2,
          "column": 1
        },
        {
          "kind": "TrueKeyword",
          "text": "true",
          "line": 2,
          "column": 1
        },
        {
          "kind": "NumericLiteral",
          "text": "3",
          "line": 2,
          "column": 1
        },
        {
          "kind": "StringLiteral",
          "text": "\\"str\\"",
          "line": 2,
          "column": 1
        },
        {
          "kind": "ExpressionStatement",
          "text": "someFn()",
          "line": 3,
          "column": 36
        },
        {
          "kind": "CallExpression",
          "text": "someFn()",
          "line": 3,
          "column": 36
        },
        {
          "kind": "Identifier",
          "text": "someFn",
          "line": 3,
          "column": 36
        },
        {
          "kind": "ExpressionStatement",
          "text": "find({ id: 1 })",
          "line": 4,
          "column": 53
        },
        {
          "kind": "CallExpression",
          "text": "find({ id: 1 })",
          "line": 4,
          "column": 53
        },
        {
          "kind": "Identifier",
          "text": "find",
          "line": 4,
          "column": 53
        },
        {
          "kind": "ObjectLiteralExpression",
          "text": "{ id: 1 }",
          "line": 4,
          "column": 53
        },
        {
          "kind": "PropertyAssignment",
          "text": "id: 1",
          "line": 4,
          "column": 53
        },
        {
          "kind": "Identifier",
          "text": "id",
          "line": 4,
          "column": 53
        },
        {
          "kind": "NumericLiteral",
          "text": "1",
          "line": 4,
          "column": 53
        },
        {
          "kind": "EndOfFileToken",
          "text": "",
          "line": 5,
          "column": 77
        }
      ]
    }
  `)
})

test('ast.when', () => {
  const code = `
        another(1, true, 3, "str")
        someFn()
        find({ id: 1 })
    `

  const sourceFile = parse(code)

  expect(
    traverse(
      sourceFile,
      ast.when((node) => (Array.isArray(node) ? undefined : Node.isIdentifier(node) && node.getText() === 'find')),
    ),
  ).toMatchInlineSnapshot(`
    Pattern<Unknown> {
      "matches": [
        {
          "kind": "Identifier",
          "text": "find",
          "line": 4,
          "column": 53
        }
      ]
    }
  `)
})

test('ast.refine', () => {
  const code = `
        another(1, true, 3, "str")
        someFn()
        find({ id: 1 })
    `

  const sourceFile = parse(code)

  expect(
    traverse(
      sourceFile,
      ast.refine(ast.callExpression('find'), (node) => (Array.isArray(node) ? undefined : node.getArguments()[0])),
    ),
  ).toMatchInlineSnapshot(`
    Pattern<CallExpression> {
      "matches": [
        {
          "kind": "ObjectLiteralExpression",
          "text": "{ id: 1 }",
          "line": 4,
          "column": 53
        }
      ]
    }
  `)
})

test('ast.named', () => {
  const code = `
    import xxx from "some-module"

        another(1, true, 3, "str")
        someFn()
        find({ id: 1 })
    `

  const sourceFile = parse(code)

  expect(traverse(sourceFile, ast.named('find'))).toMatchInlineSnapshot(`
    Pattern<Unknown> {
      "params": {
        "name": "find"
      },
      "matches": [
        {
          "kind": "CallExpression",
          "text": "find({ id: 1 })",
          "line": 6,
          "column": 88
        }
      ]
    }
  `)

  const someModule = traverse(sourceFile, ast.named('xxx'))
  expect(someModule).toMatchInlineSnapshot(`
    Pattern<Unknown> {
      "params": {
        "name": "xxx"
      },
      "matches": [
        {
          "kind": "ImportClause",
          "text": "xxx",
          "line": 2,
          "column": 1
        }
      ]
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
      "matches": [
        {
          "kind": "Identifier",
          "text": "find",
          "line": 6,
          "column": 88
        }
      ]
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
      "matches": [
        {
          "kind": "StringLiteral",
          "text": "\\"some-module\\"",
          "line": 2,
          "column": 1
        },
        {
          "kind": "NumericLiteral",
          "text": "1",
          "line": 4,
          "column": 36
        },
        {
          "kind": "TrueKeyword",
          "text": "true",
          "line": 4,
          "column": 36
        },
        {
          "kind": "NumericLiteral",
          "text": "3",
          "line": 4,
          "column": 36
        },
        {
          "kind": "StringLiteral",
          "text": "\\"str\\"",
          "line": 4,
          "column": 36
        },
        {
          "kind": "NumericLiteral",
          "text": "1",
          "line": 6,
          "column": 88
        }
      ]
    }
  `)
  expect(traverse(sourceFile, ast.literal(3))).toMatchInlineSnapshot(`
    Pattern<NumericLiteral> {
      "params": {
        "value": 3
      },
      "matches": [
        {
          "kind": "NumericLiteral",
          "text": "3",
          "line": 4,
          "column": 36
        }
      ]
    }
  `)
  expect(traverse(sourceFile, ast.literal('str'))).toMatchInlineSnapshot(`
    Pattern<StringLiteral> {
      "params": {
        "value": "str"
      },
      "matches": [
        {
          "kind": "StringLiteral",
          "text": "\\"str\\"",
          "line": 4,
          "column": 36
        }
      ]
    }
  `)
  expect(traverse(sourceFile, ast.literal(true))).toMatchInlineSnapshot(`
    Pattern<TrueKeyword> {
      "params": {
        "value": true
      },
      "matches": [
        {
          "kind": "TrueKeyword",
          "text": "true",
          "line": 4,
          "column": 36
        }
      ]
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
      "matches": [
        {
          "kind": "NumericLiteral",
          "text": "3",
          "line": 4,
          "column": 36
        }
      ]
    }
  `)
})

test('ast.string', () => {
  const code = `
    import xxx from "some-module"

        another(1, true, 3, "str")
        someFn()
        find({ id: 1 })
    `

  const sourceFile = parse(code)
  const first = traverse(sourceFile, ast.string())

  expect(first).toMatchInlineSnapshot(`
    Pattern<StringLiteral> {
      "params": {},
      "matches": [
        {
          "kind": "StringLiteral",
          "text": "\\"some-module\\"",
          "line": 2,
          "column": 1
        },
        {
          "kind": "StringLiteral",
          "text": "\\"str\\"",
          "line": 4,
          "column": 36
        }
      ]
    }
  `)

  const pattern = traverse(sourceFile, ast.string('str'))

  expect(pattern).toMatchInlineSnapshot(`
    Pattern<StringLiteral> {
      "params": {
        "value": "str"
      },
      "matches": [
        {
          "kind": "StringLiteral",
          "text": "\\"str\\"",
          "line": 4,
          "column": 36
        }
      ]
    }
  `)
})

test('ast.number', () => {
  const code = `
    import xxx from "some-module"

        another(1, true, 3, "str")
        someFn()
        find({ id: 1 })
    `

  const sourceFile = parse(code)
  const first = traverse(sourceFile, ast.number())

  expect(first).toMatchInlineSnapshot(`
    Pattern<NumericLiteral> {
      "params": {},
      "matches": [
        {
          "kind": "NumericLiteral",
          "text": "1",
          "line": 4,
          "column": 36
        },
        {
          "kind": "NumericLiteral",
          "text": "3",
          "line": 4,
          "column": 36
        },
        {
          "kind": "NumericLiteral",
          "text": "1",
          "line": 6,
          "column": 88
        }
      ]
    }
  `)
  const pattern = traverse(sourceFile, ast.number(3))

  expect(pattern).toMatchInlineSnapshot(`
    Pattern<NumericLiteral> {
      "params": {
        "value": 3
      },
      "matches": [
        {
          "kind": "NumericLiteral",
          "text": "3",
          "line": 4,
          "column": 36
        }
      ]
    }
  `)
})

test('ast.boolean', () => {
  const code = `
    import xxx from "some-module"

        another(1, true, 3, "str")
        someFn(false)
        find({ id: 1 })
    `

  const sourceFile = parse(code)

  expect(traverse(sourceFile, ast.boolean())).toMatchInlineSnapshot(`
    Pattern<TrueKeyword> {
      "params": {},
      "matches": [
        {
          "kind": "TrueKeyword",
          "text": "true",
          "line": 4,
          "column": 36
        },
        {
          "kind": "FalseKeyword",
          "text": "false",
          "line": 5,
          "column": 71
        }
      ]
    }
  `)
  const truthy = traverse(sourceFile, ast.boolean(true))

  expect(truthy).toMatchInlineSnapshot(`
    Pattern<TrueKeyword> {
      "params": {
        "value": true
      },
      "matches": [
        {
          "kind": "TrueKeyword",
          "text": "true",
          "line": 4,
          "column": 36
        }
      ]
    }
  `)

  const falsy = traverse(sourceFile, ast.boolean(false))

  expect(falsy).toMatchInlineSnapshot(`
    Pattern<TrueKeyword> {
      "params": {
        "value": false
      },
      "matches": [
        {
          "kind": "FalseKeyword",
          "text": "false",
          "line": 5,
          "column": 71
        }
      ]
    }
  `)
})

test('ast.null', () => {
  const code = `
    import xxx from "some-module"

        another(1, true, 3, "str")
        someFn()
        find({ id: null })
    `

  const sourceFile = parse(code)
  const pattern = traverse(sourceFile, ast.null())

  expect(pattern).toMatchInlineSnapshot(`
    Pattern<NullKeyword> {
      "matches": [
        {
          "kind": "NullKeyword",
          "text": "null",
          "line": 6,
          "column": 88
        }
      ]
    }
  `)
})

test('ast.undefined', () => {
  const code = `
    import xxx from "some-module"

        another(1, true, 3, "str")
        someFn()
        find({ id: undefined })
    `

  const sourceFile = parse(code)
  const pattern = traverse(sourceFile, ast.undefined())

  expect(pattern).toMatchInlineSnapshot(`
    Pattern<UndefinedKeyword> {
      "matches": [
        {
          "kind": "Identifier",
          "text": "undefined",
          "line": 6,
          "column": 88
        }
      ]
    }
  `)
})

test('ast.tuple', () => {
  const code = `
    import xxx from "some-module"

        fn(1, 2, 3, 4, 5)
        another(1, true, 3, "str")
        someFn()
        find({ id: undefined })
    `

  const sourceFile = parse(code)
  const pattern = traverse(
    sourceFile,
    ast.node(ts.SyntaxKind.CallExpression, {
      arguments: ast.tuple(ast.number(1), ast.boolean(true), ast.number(3), ast.string('str')),
    }),
  )

  expect(pattern).toMatchInlineSnapshot(`
    Pattern<CallExpression> {
      "matches": [
        {
          "kind": "CallExpression",
          "text": "another(1, true, 3, \\"str\\")",
          "line": 5,
          "column": 62
        }
      ]
    }
  `)
})

test('ast.enum', () => {
  const code = `
    import xxx from "some-module"

    enum SomeEnum {
      A = "a",
      B = "b",
      C = "c",
    }

    fn(1, 2, 3, 4, 5)
    another(1, true, 3, "str")
    someFn()
    find({ id: undefined })
    `

  const sourceFile = parse(code)
  const byName = traverse(sourceFile, ast.enum('SomeEnum'))

  expect(byName).toMatchInlineSnapshot(`
    Pattern<EnumDeclaration> {
      "params": {},
      "matches": [
        {
          "kind": "EnumDeclaration",
          "text": "enum SomeEnum {\\n      A = \\"a\\",\\n      B = \\"b\\",\\n      C = \\"c\\",\\n    }",
          "line": 4,
          "column": 36
        }
      ]
    }
  `)

  const pattern = traverse(sourceFile, ast.enum('SomeEnum', { A: 'a', B: 'b', C: 'c' }))

  expect(pattern).toMatchInlineSnapshot(`
    Pattern<EnumDeclaration> {
      "params": {
        "enumObj": {
          "A": "a",
          "B": "b",
          "C": "c"
        }
      },
      "matches": [
        {
          "kind": "EnumDeclaration",
          "text": "enum SomeEnum {\\n      A = \\"a\\",\\n      B = \\"b\\",\\n      C = \\"c\\",\\n    }",
          "line": 4,
          "column": 36
        }
      ]
    }
  `)
})

test('ast.union', () => {
  const code = `
    import xxx from "some-module"

    enum SomeEnum {
      A = "a",
      B = "b",
      C = "c",
    }

    fn(1, 2, 3, 4, 5)
    another(1, true, 3, "str")
    someFn()
    find({ id: undefined })
    `

  const sourceFile = parse(code)
  const withModuleFirst = traverse(sourceFile, ast.union(ast.string('some-module'), ast.callExpression('someFn')))

  expect(withModuleFirst).toMatchInlineSnapshot(`
    Pattern<UnionType> {
      "params": {
        "patterns": [
          "StringLiteral",
          "CallExpression"
        ]
      },
      "matches": [
        {
          "kind": "StringLiteral",
          "text": "\\"some-module\\"",
          "line": 2,
          "column": 1
        },
        {
          "kind": "CallExpression",
          "text": "someFn()",
          "line": 12,
          "column": 161
        }
      ]
    }
  `)

  const withFnFirst = traverse(sourceFile, ast.union(ast.callExpression('someFn'), ast.string('some-module')))

  expect(withFnFirst).toMatchInlineSnapshot(`
    Pattern<UnionType> {
      "params": {
        "patterns": [
          "CallExpression",
          "StringLiteral"
        ]
      },
      "matches": [
        {
          "kind": "StringLiteral",
          "text": "\\"some-module\\"",
          "line": 2,
          "column": 1
        },
        {
          "kind": "CallExpression",
          "text": "someFn()",
          "line": 12,
          "column": 161
        }
      ]
    }
  `)

  const withOneMatch = traverse(sourceFile, ast.union(ast.string('wrong-module'), ast.callExpression('someFn')))

  expect(withOneMatch).toMatchInlineSnapshot(`
    Pattern<UnionType> {
      "params": {
        "patterns": [
          "StringLiteral",
          "CallExpression"
        ]
      },
      "matches": [
        {
          "kind": "CallExpression",
          "text": "someFn()",
          "line": 12,
          "column": 161
        }
      ]
    }
  `)
})

test('ast.intersection', () => {
  const code = `
    import xxx from "some-module"

    enum SomeEnum {
      A = "a",
      B = "b",
      C = "c",
    }

    fn(1, 2, 3, 4, 5)
    another(1, true, 3, "str")
    someFn()
    find({ id: undefined })
    `

  const sourceFile = parse(code)

  const simple = traverse(sourceFile, ast.intersection(ast.node(ts.SyntaxKind.CallExpression), ast.any()))
  expect(simple).toMatchInlineSnapshot(`
    Pattern<IntersectionType> {
      "params": {
        "patterns": [
          "CallExpression",
          "Unknown"
        ]
      },
      "matches": [
        {
          "kind": "CallExpression",
          "text": "fn(1, 2, 3, 4, 5)",
          "line": 10,
          "column": 108
        },
        {
          "kind": "CallExpression",
          "text": "another(1, true, 3, \\"str\\")",
          "line": 11,
          "column": 130
        },
        {
          "kind": "CallExpression",
          "text": "someFn()",
          "line": 12,
          "column": 161
        },
        {
          "kind": "CallExpression",
          "text": "find({ id: undefined })",
          "line": 13,
          "column": 174
        }
      ]
    }
  `)

  const wrong = traverse(sourceFile, ast.intersection(ast.node(ts.SyntaxKind.CallExpression), ast.literal()))
  expect(wrong).toMatchInlineSnapshot('undefined')

  const pattern = traverse(
    sourceFile,
    ast.intersection(
      ast.node(ts.SyntaxKind.CallExpression),
      ast.any(),
      ast.callExpression('someFn'),
      ast.when((node) =>
        Array.isArray(node) ? undefined : Node.isCallExpression(node) && node.getArguments().length === 0,
      ),
    ),
  )

  expect(pattern).toMatchInlineSnapshot(`
    Pattern<IntersectionType> {
      "params": {
        "patterns": [
          "CallExpression",
          "Unknown",
          "CallExpression",
          "Unknown"
        ]
      },
      "matches": [
        {
          "kind": "CallExpression",
          "text": "someFn()",
          "line": 12,
          "column": 161
        }
      ]
    }
  `)
})

describe('ast.callExpression', () => {
  test('ast.callExpresion - simple', () => {
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
        "matches": [
          {
            "kind": "CallExpression",
            "text": "someFn()",
            "line": 2,
            "column": 1
          }
        ]
      }
    `)

    expect(traverse(sourceFile, ast.node(ts.SyntaxKind.CallExpression, { expression: ast.identifier('someFn') })))
      .toMatchInlineSnapshot(`
        Pattern<CallExpression> {
          "matches": [
            {
              "kind": "CallExpression",
              "text": "someFn()",
              "line": 2,
              "column": 1
            }
          ]
        }
      `)
  })

  test('ast.callExpresion - with params', () => {
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
        "matches": [
          {
            "kind": "CallExpression",
            "text": "find({ id: 1 })",
            "line": 4,
            "column": 57
          }
        ]
      }
    `,
    )
  })

  test('ast.callExpresion - with multiple params', () => {
    const code = `
          someFn()
          another(1, true, 3, "str")
          find({ id: 1 })
      `

    const sourceFile = parse(code)

    expect(
      traverse(
        sourceFile,
        ast.callExpression('another', ast.tuple(ast.any(), ast.boolean(true), ast.number(), ast.any())),
      ),
    ).toMatchInlineSnapshot(`
      Pattern<CallExpression> {
        "params": {
          "arguments": [
            "TupleType"
          ]
        },
        "matches": [
          {
            "kind": "CallExpression",
            "text": "another(1, true, 3, \\"str\\")",
            "line": 3,
            "column": 20
          }
        ]
      }
    `)

    expect(traverse(sourceFile, ast.callExpression('find', ast.tuple(ast.object())))).toMatchInlineSnapshot(`
      Pattern<CallExpression> {
        "params": {
          "arguments": [
            "TupleType"
          ]
        },
        "matches": [
          {
            "kind": "CallExpression",
            "text": "find({ id: 1 })",
            "line": 4,
            "column": 57
          }
        ]
      }
    `)
  })

  test('ast.callExpresion - with rest param', () => {
    const code = `
      someFn()
      another(1, true, 3, "str")
      find({ id: 1 })
  `

    const sourceFile = parse(code)

    expect(traverse(sourceFile, ast.callExpression('another', ast.literal(1)))).toMatchInlineSnapshot('undefined')

    expect(traverse(sourceFile, ast.callExpression('another', ast.literal(1), ast.boolean()))).toMatchInlineSnapshot(
      'undefined',
    )

    expect(
      traverse(sourceFile, ast.callExpression('another', ast.tuple(ast.literal(1), ast.boolean()))),
    ).toMatchInlineSnapshot('undefined')

    expect(traverse(sourceFile, ast.callExpression('another', ast.tuple(ast.rest(ast.any()))))).toMatchInlineSnapshot(
      `
      Pattern<CallExpression> {
        "params": {
          "arguments": [
            "TupleType"
          ]
        },
        "matches": [
          {
            "kind": "CallExpression",
            "text": "another(1, true, 3, \\"str\\")",
            "line": 3,
            "column": 16
          }
        ]
      }
    `,
    )

    expect(
      traverse(sourceFile, ast.callExpression('another', ast.tuple(ast.literal(1), ast.rest(ast.any())))),
    ).toMatchInlineSnapshot(
      `
      Pattern<CallExpression> {
        "params": {
          "arguments": [
            "TupleType"
          ]
        },
        "matches": [
          {
            "kind": "CallExpression",
            "text": "another(1, true, 3, \\"str\\")",
            "line": 3,
            "column": 16
          }
        ]
      }
    `,
    )

    expect(
      traverse(
        sourceFile,
        ast.callExpression('another', ast.tuple(ast.literal(1), ast.boolean(), ast.rest(ast.any()))),
      ),
    ).toMatchInlineSnapshot(
      `
      Pattern<CallExpression> {
        "params": {
          "arguments": [
            "TupleType"
          ]
        },
        "matches": [
          {
            "kind": "CallExpression",
            "text": "another(1, true, 3, \\"str\\")",
            "line": 3,
            "column": 16
          }
        ]
      }
    `,
    )

    expect(
      traverse(sourceFile, ast.callExpression('another', ast.literal(1), ast.boolean(), ast.literal(), ast.any())),
    ).toMatchInlineSnapshot(
      `
      Pattern<CallExpression> {
        "params": {
          "arguments": [
            "NumericLiteral",
            "TrueKeyword",
            "Unknown",
            "Unknown"
          ]
        },
        "matches": [
          {
            "kind": "CallExpression",
            "text": "another(1, true, 3, \\"str\\")",
            "line": 3,
            "column": 16
          }
        ]
      }
    `,
    )
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
        "matches": [
          {
            "kind": "CallExpression",
            "text": "another(1, true, 3, \\"str\\")",
            "line": 3,
            "column": 20
          }
        ]
      }
    `)
    expect(traverse(sourceFile, ast.callExpression('another', ast.rest(ast.any())))).toMatchInlineSnapshot(`
      Pattern<CallExpression> {
        "params": {
          "arguments": [
            "RestType"
          ]
        },
        "matches": [
          {
            "kind": "CallExpression",
            "text": "another(1, true, 3, \\"str\\")",
            "line": 3,
            "column": 20
          }
        ]
      }
    `)

    expect(traverse(sourceFile, ast.callExpression('another', ast.tuple(ast.number(), ast.rest(ast.any())))))
      .toMatchInlineSnapshot(`
        Pattern<CallExpression> {
          "params": {
            "arguments": [
              "TupleType"
            ]
          },
          "matches": [
            {
              "kind": "CallExpression",
              "text": "another(1, true, 3, \\"str\\")",
              "line": 3,
              "column": 20
            }
          ]
        }
      `)

    expect(
      traverse(sourceFile, ast.callExpression('another', ast.tuple(ast.number(), ast.boolean(), ast.rest(ast.any())))),
    ).toMatchInlineSnapshot(`
      Pattern<CallExpression> {
        "params": {
          "arguments": [
            "TupleType"
          ]
        },
        "matches": [
          {
            "kind": "CallExpression",
            "text": "another(1, true, 3, \\"str\\")",
            "line": 3,
            "column": 20
          }
        ]
      }
    `)
  })
})

describe('ast.object', () => {
  test('any object', () => {
    const code = `
    import xxx from "some-module"

        another(1, true, 3, "str")
        someFn()
        find({ id: 1 })
        find({ first: true, second: false, third: 3 })
        withEmpty({})
    `

    const sourceFile = parse(code)

    expect(traverse(sourceFile, ast.object())).toMatchInlineSnapshot(`
      Pattern<ObjectLiteralExpression> {
        "params": {},
        "matches": [
          {
            "kind": "ObjectLiteralExpression",
            "text": "{ id: 1 }",
            "line": 6,
            "column": 88
          },
          {
            "kind": "ObjectLiteralExpression",
            "text": "{ first: true, second: false, third: 3 }",
            "line": 7,
            "column": 112
          },
          {
            "kind": "ObjectLiteralExpression",
            "text": "{}",
            "line": 8,
            "column": 167
          }
        ]
      }
    `)
  })

  test('empty object', () => {
    const code = `
    import xxx from "some-module"

        another(1, true, 3, "str")
        someFn()
        find({ id: 1 })
        find({ first: true, second: false, third: 3 })
        withEmpty({})
    `

    const sourceFile = parse(code)

    expect(traverse(sourceFile, ast.object({}))).toMatchInlineSnapshot(`
      Pattern<ObjectLiteralExpression> {
        "params": {
          "properties": {}
        },
        "matches": [
          {
            "kind": "ObjectLiteralExpression",
            "text": "{}",
            "line": 8,
            "column": 167
          }
        ]
      }
    `)
  })

  test('object with key/value', () => {
    const code = `
    import xxx from "some-module"

        another(1, true, 3, "str")
        someFn()
        find({ id: 1 })
        find({ first: true, second: false, third: 3 })
        withEmpty({})
    `

    const sourceFile = parse(code)

    expect(traverse(sourceFile, ast.object({ id: ast.number() }))).toMatchInlineSnapshot(`
      Pattern<ObjectLiteralExpression> {
        "params": {
          "properties": {
            "id": "NumericLiteral"
          }
        },
        "matches": [
          {
            "kind": "ObjectLiteralExpression",
            "text": "{ id: 1 }",
            "line": 6,
            "column": 88
          }
        ]
      }
    `)
  })

  test('partial object', () => {
    const code = `
    import xxx from "some-module"

        another(1, true, 3, "str")
        someFn()
        find({ id: 1 })
        find({ first: true, second: false, third: 3 })
        withEmpty({})
    `

    const sourceFile = parse(code)

    expect(traverse(sourceFile, ast.object({ first: ast.boolean() }))).toMatchInlineSnapshot('undefined')
    expect(traverse(sourceFile, ast.object({ first: ast.boolean() }, true))).toMatchInlineSnapshot(`
      Pattern<ObjectLiteralExpression> {
        "params": {
          "properties": {
            "first": "TrueKeyword"
          }
        },
        "matches": [
          {
            "kind": "ObjectLiteralExpression",
            "text": "{}",
            "line": 8,
            "column": 167
          }
        ]
      }
    `)
    expect(traverse(sourceFile, ast.object({ wrong: ast.boolean() }, true))).toMatchInlineSnapshot(`
      Pattern<ObjectLiteralExpression> {
        "params": {
          "properties": {
            "wrong": "TrueKeyword"
          }
        },
        "matches": [
          {
            "kind": "ObjectLiteralExpression",
            "text": "{}",
            "line": 8,
            "column": 167
          }
        ]
      }
    `)
    expect(traverse(sourceFile, ast.object({ wrong: ast.boolean(), first: ast.boolean() }, true)))
      .toMatchInlineSnapshot(`
        Pattern<ObjectLiteralExpression> {
          "params": {
            "properties": {
              "wrong": "TrueKeyword",
              "first": "TrueKeyword"
            }
          },
          "matches": [
            {
              "kind": "ObjectLiteralExpression",
              "text": "{}",
              "line": 8,
              "column": 167
            }
          ]
        }
      `)
  })
})

test('ast.object', () => {
  const code = `
    import xxx from "some-module"

        another(1, true, 3, "str")
        someFn()
        find({ id: 1 })
        withEmpty({})
        multipleArgs({ prop: "aaa" }, { prop: "bbb" })
        multipleKeys({ xxx: 999, yyy: 888 })
    `

  const sourceFile = parse(code)
  const first = traverse(sourceFile, ast.object())

  expect(first).toMatchInlineSnapshot(`
    Pattern<ObjectLiteralExpression> {
      "params": {},
      "matches": [
        {
          "kind": "ObjectLiteralExpression",
          "text": "{ id: 1 }",
          "line": 6,
          "column": 88
        },
        {
          "kind": "ObjectLiteralExpression",
          "text": "{}",
          "line": 7,
          "column": 112
        },
        {
          "kind": "ObjectLiteralExpression",
          "text": "{ prop: \\"aaa\\" }",
          "line": 8,
          "column": 134
        },
        {
          "kind": "ObjectLiteralExpression",
          "text": "{ prop: \\"bbb\\" }",
          "line": 8,
          "column": 134
        },
        {
          "kind": "ObjectLiteralExpression",
          "text": "{ xxx: 999, yyy: 888 }",
          "line": 9,
          "column": 189
        }
      ]
    }
  `)
  const empty = traverse(sourceFile, ast.object({}))

  expect(empty).toMatchInlineSnapshot(`
    Pattern<ObjectLiteralExpression> {
      "params": {
        "properties": {}
      },
      "matches": [
        {
          "kind": "ObjectLiteralExpression",
          "text": "{}",
          "line": 7,
          "column": 112
        }
      ]
    }
  `)

  const pattern = traverse(sourceFile, ast.object({ id: ast.number() }))

  expect(pattern).toMatchInlineSnapshot(`
    Pattern<ObjectLiteralExpression> {
      "params": {
        "properties": {
          "id": "NumericLiteral"
        }
      },
      "matches": [
        {
          "kind": "ObjectLiteralExpression",
          "text": "{ id: 1 }",
          "line": 6,
          "column": 88
        }
      ]
    }
  `)

  expect(traverse(sourceFile, ast.object({ prop: ast.string() }))).toMatchInlineSnapshot(`
    Pattern<ObjectLiteralExpression> {
      "params": {
        "properties": {
          "prop": "StringLiteral"
        }
      },
      "matches": [
        {
          "kind": "ObjectLiteralExpression",
          "text": "{ prop: \\"aaa\\" }",
          "line": 8,
          "column": 134
        },
        {
          "kind": "ObjectLiteralExpression",
          "text": "{ prop: \\"bbb\\" }",
          "line": 8,
          "column": 134
        }
      ]
    }
  `)

  expect(traverse(sourceFile, ast.object({ prop: ast.string('bbb') }))).toMatchInlineSnapshot(`
    Pattern<ObjectLiteralExpression> {
      "params": {
        "properties": {
          "prop": "StringLiteral"
        }
      },
      "matches": [
        {
          "kind": "ObjectLiteralExpression",
          "text": "{ prop: \\"bbb\\" }",
          "line": 8,
          "column": 134
        }
      ]
    }
  `)

  expect(traverse(sourceFile, ast.object({ xxx: ast.union(ast.number(), ast.string()), yyy: ast.any() })))
    .toMatchInlineSnapshot(`
      Pattern<ObjectLiteralExpression> {
        "params": {
          "properties": {
            "xxx": "UnionType",
            "yyy": "Unknown"
          }
        },
        "matches": [
          {
            "kind": "ObjectLiteralExpression",
            "text": "{ xxx: 999, yyy: 888 }",
            "line": 9,
            "column": 189
          }
        ]
      }
    `)
})

test('ast.array', () => {
  const code = `
    import xxx from "some-module"

        another(1, true, 3, "str")
        someFn()
        find({ id: 1 })
        withEmpty([])
        multipleArgs(["aaa"], ["bbb"])
        multipleKeys([999, 888])
    `

  const sourceFile = parse(code)

  expect(traverse(sourceFile, ast.array())).toMatchInlineSnapshot(`
    Pattern<ArrayLiteralExpression> {
      "params": {},
      "matches": [
        {
          "kind": "ArrayLiteralExpression",
          "text": "[]",
          "line": 7,
          "column": 112
        },
        {
          "kind": "ArrayLiteralExpression",
          "text": "[\\"aaa\\"]",
          "line": 8,
          "column": 134
        },
        {
          "kind": "ArrayLiteralExpression",
          "text": "[\\"bbb\\"]",
          "line": 8,
          "column": 134
        },
        {
          "kind": "ArrayLiteralExpression",
          "text": "[999, 888]",
          "line": 9,
          "column": 173
        }
      ]
    }
  `)

  expect(traverse(sourceFile, ast.array(ast.any()))).toMatchInlineSnapshot(`
    Pattern<ArrayLiteralExpression> {
      "params": {
        "pattern": "Unknown"
      },
      "matches": [
        {
          "kind": "ArrayLiteralExpression",
          "text": "[\\"aaa\\"]",
          "line": 8,
          "column": 134
        },
        {
          "kind": "ArrayLiteralExpression",
          "text": "[\\"bbb\\"]",
          "line": 8,
          "column": 134
        },
        {
          "kind": "ArrayLiteralExpression",
          "text": "[999, 888]",
          "line": 9,
          "column": 173
        }
      ]
    }
  `)

  expect(traverse(sourceFile, ast.array(ast.number()))).toMatchInlineSnapshot(`
    Pattern<ArrayLiteralExpression> {
      "params": {
        "pattern": "NumericLiteral"
      },
      "matches": [
        {
          "kind": "ArrayLiteralExpression",
          "text": "[999, 888]",
          "line": 9,
          "column": 173
        }
      ]
    }
  `)

  expect(traverse(sourceFile, ast.array(ast.string()))).toMatchInlineSnapshot(`
    Pattern<ArrayLiteralExpression> {
      "params": {
        "pattern": "StringLiteral"
      },
      "matches": [
        {
          "kind": "ArrayLiteralExpression",
          "text": "[\\"aaa\\"]",
          "line": 8,
          "column": 134
        },
        {
          "kind": "ArrayLiteralExpression",
          "text": "[\\"bbb\\"]",
          "line": 8,
          "column": 134
        }
      ]
    }
  `)

  expect(traverse(sourceFile, ast.array(ast.string('bbb')))).toMatchInlineSnapshot(`
    Pattern<ArrayLiteralExpression> {
      "params": {
        "pattern": "StringLiteral"
      },
      "matches": [
        {
          "kind": "ArrayLiteralExpression",
          "text": "[\\"bbb\\"]",
          "line": 8,
          "column": 134
        }
      ]
    }
  `)

  expect(traverse(sourceFile, ast.array(ast.union(ast.number(), ast.string())))).toMatchInlineSnapshot(`
    Pattern<ArrayLiteralExpression> {
      "params": {
        "pattern": "UnionType"
      },
      "matches": [
        {
          "kind": "ArrayLiteralExpression",
          "text": "[\\"aaa\\"]",
          "line": 8,
          "column": 134
        },
        {
          "kind": "ArrayLiteralExpression",
          "text": "[\\"bbb\\"]",
          "line": 8,
          "column": 134
        },
        {
          "kind": "ArrayLiteralExpression",
          "text": "[999, 888]",
          "line": 9,
          "column": 173
        }
      ]
    }
  `)
})

describe('ast.propertyAccessExpression', () => {
  test('using same text', () => {
    const code = `
      import xxx from "some-module"

          another(1, true, 3, "str")
          someFn()
          find({ id: null })
          styled.div({ color: "red" })
          this.props.xxx
          aaa.bbb.ccc
          using?.optional?.chaining;
          ((wrapped?.around! as any)?.multiple as any)?.things
      `

    const sourceFile = parse(code)

    expect(traverse(sourceFile, ast.propertyAccessExpression('styled.div'))).toMatchInlineSnapshot(`
      Pattern<PropertyAccessExpression> {
        "params": {
          "name": "styled.div"
        },
        "matches": [
          {
            "kind": "PropertyAccessExpression",
            "text": "styled.div",
            "line": 7,
            "column": 123
          }
        ]
      }
    `)

    expect(traverse(sourceFile, ast.propertyAccessExpression('this.props.xxx'))).toMatchInlineSnapshot(`
      Pattern<PropertyAccessExpression> {
        "params": {
          "name": "this.props.xxx"
        },
        "matches": [
          {
            "kind": "PropertyAccessExpression",
            "text": "this.props.xxx",
            "line": 8,
            "column": 162
          }
        ]
      }
    `)
    expect(traverse(sourceFile, ast.propertyAccessExpression('using?.optional?.chaining'))).toMatchInlineSnapshot(
      `
      Pattern<PropertyAccessExpression> {
        "params": {
          "name": "using?.optional?.chaining"
        },
        "matches": [
          {
            "kind": "PropertyAccessExpression",
            "text": "using?.optional?.chaining",
            "line": 10,
            "column": 209
          }
        ]
      }
    `,
    )
    expect(
      traverse(sourceFile, ast.propertyAccessExpression('((wrapped?.around! as any)?.multiple as any)?.things')),
    ).toMatchInlineSnapshot(
      `
      Pattern<PropertyAccessExpression> {
        "params": {
          "name": "((wrapped?.around! as any)?.multiple as any)?.things"
        },
        "matches": [
          {
            "kind": "PropertyAccessExpression",
            "text": "((wrapped?.around! as any)?.multiple as any)?.things",
            "line": 11,
            "column": 246
          }
        ]
      }
    `,
    )
  })

  test('with dot path', () => {
    const code = `
      import xxx from "some-module"

          another(1, true, 3, "str")
          someFn()
          find({ id: null })
          styled.div({ color: "red" })
          this.props.xxx
          aaa.bbb.ccc
          using?.optional?.chaining;
          ((wrapped?.around! as any)?.multiple as any)?.things
      `

    const sourceFile = parse(code)

    expect(traverse(sourceFile, ast.propertyAccessExpression('using.optional.chaining'))).toMatchInlineSnapshot(
      `
      Pattern<PropertyAccessExpression> {
        "params": {
          "name": "using.optional.chaining"
        },
        "matches": [
          {
            "kind": "PropertyAccessExpression",
            "text": "using?.optional?.chaining",
            "line": 10,
            "column": 209
          }
        ]
      }
    `,
    )
    expect(traverse(sourceFile, ast.propertyAccessExpression('wrapped.around.multiple.things'))).toMatchInlineSnapshot(
      `
      Pattern<PropertyAccessExpression> {
        "params": {
          "name": "wrapped.around.multiple.things"
        },
        "matches": [
          {
            "kind": "PropertyAccessExpression",
            "text": "((wrapped?.around! as any)?.multiple as any)?.things",
            "line": 11,
            "column": 246
          }
        ]
      }
    `,
    )
  })
})

test('ast.elementAccessExpression', () => {
  const code = `
      import xxx from "some-module"

          another(1, true, 3, "str")
          someFn()
          find({ id: null })
          styled["div"]({ color: "red" })
          this["props"]["xxx"]
          aaa.bbb["ccc"]
          using?.["optional"]?.["chaining"];
          ((wrapped?.["around"]! as any)?.["multiple"] as any)?.["things"]
      `

  const sourceFile = parse(code)

  expect(traverse(sourceFile, ast.elementAccessExpression('styled', ast.string('div')))).toMatchInlineSnapshot(
    `
    Pattern<ElementAccessExpression> {
      "params": {
        "name": "styled",
        "arg": "StringLiteral"
      },
      "matches": [
        {
          "kind": "ElementAccessExpression",
          "text": "styled[\\"div\\"]",
          "line": 7,
          "column": 123
        }
      ]
    }
  `,
  )
  expect(traverse(sourceFile, ast.elementAccessExpression('wrapped', ast.any()))).toMatchInlineSnapshot(`
    Pattern<ElementAccessExpression> {
      "params": {
        "name": "wrapped",
        "arg": "Unknown"
      },
      "matches": [
        {
          "kind": "ElementAccessExpression",
          "text": "wrapped?.[\\"around\\"]",
          "line": 11,
          "column": 266
        }
      ]
    }
  `)

  expect(traverse(sourceFile, ast.elementAccessExpression(ast.any(), ast.string('things')))).toMatchInlineSnapshot(`
    Pattern<ElementAccessExpression> {
      "params": {
        "name": "Unknown",
        "arg": "StringLiteral"
      },
      "matches": [
        {
          "kind": "ElementAccessExpression",
          "text": "((wrapped?.[\\"around\\"]! as any)?.[\\"multiple\\"] as any)?.[\\"things\\"]",
          "line": 11,
          "column": 266
        }
      ]
    }
  `)
})

test('ast.unwrap', () => {
  const code = `
    import xxx from "some-module"

        another(1, (true as any), 3, "str")
        someFn()
        find(({ id: null }) as any)
    `

  const sourceFile = parse(code)

  expect(
    traverse(
      sourceFile,
      ast.node(ts.SyntaxKind.CallExpression, {
        arguments: ast.tuple(ast.number(), ast.boolean(), ast.rest(ast.any())),
      }),
    ),
  ).toMatchInlineSnapshot('undefined')
  expect(
    traverse(
      sourceFile,
      ast.node(ts.SyntaxKind.CallExpression, {
        arguments: ast.tuple(ast.number(), ast.unwrap(ast.boolean()), ast.rest(ast.any())),
      }),
    ),
  ).toMatchInlineSnapshot(`
    Pattern<CallExpression> {
      "matches": [
        {
          "kind": "CallExpression",
          "text": "another(1, (true as any), 3, \\"str\\")",
          "line": 4,
          "column": 36
        }
      ]
    }
  `)

  expect(traverse(sourceFile, ast.callExpression('find', ast.object({ id: ast.null() })))).toMatchInlineSnapshot(
    'undefined',
  )
  expect(traverse(sourceFile, ast.callExpression('find', ast.unwrap(ast.object({ id: ast.null() })))))
    .toMatchInlineSnapshot(`
      Pattern<CallExpression> {
        "params": {
          "arguments": [
            "Unknown"
          ]
        },
        "matches": [
          {
            "kind": "CallExpression",
            "text": "find(({ id: null }) as any)",
            "line": 6,
            "column": 97
          }
        ]
      }
    `)
})

test('ast.conditionalExpression', () => {
  const code = `
    import xxx from "some-module"

        another(cond ? 1 : 2)
        nested(cond5 ? (cond6 ? 7 : 8) : 9)
    `

  const sourceFile = parse(code)

  expect(traverse(sourceFile, ast.conditionalExpression(ast.any(), ast.number(), ast.number()))).toMatchInlineSnapshot(
    `
    Pattern<ConditionalExpression> {
      "params": {
        "condition": "Unknown",
        "whenTrue": "NumericLiteral",
        "whenFalse": "NumericLiteral"
      },
      "matches": [
        {
          "kind": "ConditionalExpression",
          "text": "cond ? 1 : 2",
          "line": 4,
          "column": 36
        },
        {
          "kind": "ConditionalExpression",
          "text": "cond6 ? 7 : 8",
          "line": 5,
          "column": 66
        }
      ]
    }
  `,
  )

  expect(
    traverse(
      sourceFile,
      ast.conditionalExpression(
        ast.any(),
        ast.unwrap(ast.conditionalExpression(ast.identifier('cond6'), ast.number(), ast.number(8))),
        ast.number(9),
      ),
    ),
  ).toMatchInlineSnapshot(`
    Pattern<ConditionalExpression> {
      "params": {
        "condition": "Unknown",
        "whenTrue": "Unknown",
        "whenFalse": "NumericLiteral"
      },
      "matches": [
        {
          "kind": "ConditionalExpression",
          "text": "cond5 ? (cond6 ? 7 : 8) : 9",
          "line": 5,
          "column": 66
        }
      ]
    }
  `)
})

test('ast.binaryExpression', () => {
  const code = `
    import xxx from "some-module"

        someFn(cond2 ?? 3)
        find(cond3 && 4)
        getter(cond4 || 5)
        nested(cond5 && (cond6 ?? 7))
    `

  const sourceFile = parse(code)

  expect(traverse(sourceFile, ast.binaryExpression(ast.identifier('cond2'), '??', ast.number()))).toMatchInlineSnapshot(
    `
    Pattern<BinaryExpression> {
      "params": {
        "left": "Identifier",
        "operatorPattern": "QuestionQuestionToken",
        "right": "NumericLiteral"
      },
      "matches": [
        {
          "kind": "BinaryExpression",
          "text": "cond2 ?? 3",
          "line": 4,
          "column": 36
        }
      ]
    }
  `,
  )

  expect(
    traverse(
      sourceFile,
      ast.binaryExpression(
        ast.any(),
        ast.any(),
        ast.unwrap(ast.binaryExpression(ast.identifier('cond6'), '??', ast.number(7))),
      ),
    ),
  ).toMatchInlineSnapshot(`
    Pattern<BinaryExpression> {
      "params": {
        "left": "Unknown",
        "operatorPattern": "Unknown",
        "right": "Unknown"
      },
      "matches": [
        {
          "kind": "BinaryExpression",
          "text": "cond5 && (cond6 ?? 7)",
          "line": 7,
          "column": 115
        }
      ]
    }
  `)
})

describe('ast.importDeclaration', () => {
  test('with name', () => {
    const code = `
      import xxx from "some-module"
      import type yyy from "type-module"
      import { aaa, bbb, ccc } from "with-bindings"

      another(1, true, 3, "str")
      someFn()
      find({ id: 1 })
      withEmpty({})
      `

    const sourceFile = parse(code)

    expect(traverse(sourceFile, ast.importDeclaration('some-module'))).toMatchInlineSnapshot(
      `
      Pattern<ImportDeclaration> {
        "params": {
          "moduleSpecifier": "some-module"
        },
        "matches": [
          {
            "kind": "ImportDeclaration",
            "text": "import xxx from \\"some-module\\"",
            "line": 2,
            "column": 1
          }
        ]
      }
    `,
    )

    expect(traverse(sourceFile, ast.importDeclaration('some-module', 'abc'))).toMatchInlineSnapshot('undefined')
    expect(traverse(sourceFile, ast.importDeclaration('some-module', 'xxx', true))).toMatchInlineSnapshot('undefined')
    expect(traverse(sourceFile, ast.importDeclaration('some-module', 'xxx'))).toMatchInlineSnapshot(
      `
      Pattern<ImportDeclaration> {
        "params": {
          "moduleSpecifier": "some-module",
          "name": "xxx"
        },
        "matches": [
          {
            "kind": "ImportDeclaration",
            "text": "import xxx from \\"some-module\\"",
            "line": 2,
            "column": 1
          }
        ]
      }
    `,
    )
  })

  test('is type only', () => {
    const code = `
      import xxx from "some-module"
      import type yyy from "type-module"
      import { aaa, bbb, ccc } from "with-bindings"

      another(1, true, 3, "str")
      someFn()
      find({ id: 1 })
      withEmpty({})
      `

    const sourceFile = parse(code)

    expect(traverse(sourceFile, ast.importDeclaration('type-module', 'yyy'))).toMatchInlineSnapshot(
      `
      Pattern<ImportDeclaration> {
        "params": {
          "moduleSpecifier": "type-module",
          "name": "yyy"
        },
        "matches": [
          {
            "kind": "ImportDeclaration",
            "text": "import type yyy from \\"type-module\\"",
            "line": 3,
            "column": 37
          }
        ]
      }
    `,
    )
    expect(traverse(sourceFile, ast.importDeclaration('type-module', 'yyy', true))).toMatchInlineSnapshot(
      `
      Pattern<ImportDeclaration> {
        "params": {
          "moduleSpecifier": "type-module",
          "name": "yyy",
          "isTypeOnly": true
        },
        "matches": [
          {
            "kind": "ImportDeclaration",
            "text": "import type yyy from \\"type-module\\"",
            "line": 3,
            "column": 37
          }
        ]
      }
    `,
    )

    expect(traverse(sourceFile, ast.importDeclaration('type-module', ast.any(), true))).toMatchInlineSnapshot(
      `
      Pattern<ImportDeclaration> {
        "params": {
          "moduleSpecifier": "type-module",
          "name": "Unknown",
          "isTypeOnly": true
        },
        "matches": [
          {
            "kind": "ImportDeclaration",
            "text": "import type yyy from \\"type-module\\"",
            "line": 3,
            "column": 37
          }
        ]
      }
    `,
    )
  })

  test('with named bindings', () => {
    const code = `
      import xxx from "some-module"
      import type yyy from "type-module"
      import { aaa, bbb, ccc } from "with-bindings"

      another(1, true, 3, "str")
      someFn()
      find({ id: 1 })
      withEmpty({})
      `

    const sourceFile = parse(code)

    expect(traverse(sourceFile, ast.importDeclaration('with-bindings'))).toMatchInlineSnapshot(`
      Pattern<ImportDeclaration> {
        "params": {
          "moduleSpecifier": "with-bindings"
        },
        "matches": [
          {
            "kind": "ImportDeclaration",
            "text": "import { aaa, bbb, ccc } from \\"with-bindings\\"",
            "line": 4,
            "column": 78
          }
        ]
      }
    `)

    expect(traverse(sourceFile, ast.importDeclaration('with-bindings', ['aaa', 'bbb', 'ccc']))).toMatchInlineSnapshot(`
      Pattern<ImportDeclaration> {
        "params": {
          "moduleSpecifier": "with-bindings",
          "name": [
            "aaa",
            "bbb",
            "ccc"
          ]
        },
        "matches": [
          {
            "kind": "ImportDeclaration",
            "text": "import { aaa, bbb, ccc } from \\"with-bindings\\"",
            "line": 4,
            "column": 78
          }
        ]
      }
    `)
    expect(traverse(sourceFile, ast.importDeclaration('with-bindings', ast.rest(ast.any())))).toMatchInlineSnapshot(`
      Pattern<ImportDeclaration> {
        "params": {
          "moduleSpecifier": "with-bindings",
          "name": "RestType"
        },
        "matches": [
          {
            "kind": "ImportDeclaration",
            "text": "import { aaa, bbb, ccc } from \\"with-bindings\\"",
            "line": 4,
            "column": 78
          }
        ]
      }
    `)
    expect(
      traverse(
        sourceFile,
        ast.importDeclaration(
          'with-bindings',
          ast.tuple(ast.importSpecifier('aaa'), ast.importSpecifier('bbb'), ast.importSpecifier('ccc')),
        ),
      ),
    ).toMatchInlineSnapshot(`
      Pattern<ImportDeclaration> {
        "params": {
          "moduleSpecifier": "with-bindings",
          "name": "TupleType"
        },
        "matches": [
          {
            "kind": "ImportDeclaration",
            "text": "import { aaa, bbb, ccc } from \\"with-bindings\\"",
            "line": 4,
            "column": 78
          }
        ]
      }
    `)
    expect(
      traverse(
        sourceFile,
        ast.importDeclaration('with-bindings', ast.tuple(ast.importSpecifier('aaa'), ast.rest(ast.any()))),
      ),
    ).toMatchInlineSnapshot(`
      Pattern<ImportDeclaration> {
        "params": {
          "moduleSpecifier": "with-bindings",
          "name": "TupleType"
        },
        "matches": [
          {
            "kind": "ImportDeclaration",
            "text": "import { aaa, bbb, ccc } from \\"with-bindings\\"",
            "line": 4,
            "column": 78
          }
        ]
      }
    `)
  })

  test("with named bindings rename using 'as' keyword", () => {
    const code = `
      // import xxx from "some-module"
      // import type yyy from "type-module"
      // import { aaa, bbb, ccc as ddd } from "with-bindings"
      import { aaa, bbb, ccc as ddd } from "with-bindings"

      another(1, true, 3, "str")
      someFn()
      find({ id: 1 })
      withEmpty({})
      `

    const sourceFile = parse(code)

    expect(
      traverse(
        sourceFile,
        ast.importDeclaration(
          'with-bindings',
          ast.tuple(ast.importSpecifier('aaa'), ast.importSpecifier('bbb'), ast.importSpecifier('ddd', 'ccc')),
        ),
      ),
    ).toMatchInlineSnapshot(`
      Pattern<ImportDeclaration> {
        "params": {
          "moduleSpecifier": "with-bindings",
          "name": "TupleType"
        },
        "matches": [
          {
            "kind": "ImportDeclaration",
            "text": "import { aaa, bbb, ccc as ddd } from \\"with-bindings\\"",
            "line": 5,
            "column": 146
          }
        ]
      }
    `)

    expect(traverse(sourceFile, ast.importDeclaration('with-bindings', ['aaa', 'bbb', 'ddd']))).toMatchInlineSnapshot(
      `
      Pattern<ImportDeclaration> {
        "params": {
          "moduleSpecifier": "with-bindings",
          "name": [
            "aaa",
            "bbb",
            "ddd"
          ]
        },
        "matches": [
          {
            "kind": "ImportDeclaration",
            "text": "import { aaa, bbb, ccc as ddd } from \\"with-bindings\\"",
            "line": 5,
            "column": 146
          }
        ]
      }
    `,
    )
  })

  test('named bindings with mixed string and Patterns', () => {
    const code = `
    import { aaa, bbb, ccc as ddd } from "with-bindings"

    another(1, true, 3, "str")
    someFn()
    find({ id: 1 })
    withEmpty({})
    `

    const sourceFile = parse(code)

    expect(traverse(sourceFile, ast.importDeclaration('with-bindings', ['aaa', 'bbb', ast.any()])))
      .toMatchInlineSnapshot(`
        Pattern<ImportDeclaration> {
          "params": {
            "moduleSpecifier": "with-bindings",
            "name": [
              "aaa",
              "bbb",
              "Unknown"
            ]
          },
          "matches": [
            {
              "kind": "ImportDeclaration",
              "text": "import { aaa, bbb, ccc as ddd } from \\"with-bindings\\"",
              "line": 2,
              "column": 1
            }
          ]
        }
      `)

    expect(traverse(sourceFile, ast.importDeclaration('with-bindings', ['aaa', 'bbb', ast.identifier('ddd')])))
      .toMatchInlineSnapshot(`
        Pattern<ImportDeclaration> {
          "params": {
            "moduleSpecifier": "with-bindings",
            "name": [
              "aaa",
              "bbb",
              "Identifier"
            ]
          },
          "matches": [
            {
              "kind": "ImportDeclaration",
              "text": "import { aaa, bbb, ccc as ddd } from \\"with-bindings\\"",
              "line": 2,
              "column": 1
            }
          ]
        }
      `)
  })

  test('ast.importSpecifier with type only', () => {
    const code = `
    import { aaa, type bbb, ccc as ddd } from "with-bindings"

    another(1, true, 3, "str")
    someFn()
    find({ id: 1 })
    withEmpty({})
    `

    const sourceFile = parse(code)

    expect(traverse(sourceFile, ast.importSpecifier('aaa'))).toMatchInlineSnapshot(`
      Pattern<ImportSpecifier> {
        "params": {
          "name": "aaa"
        },
        "matches": [
          {
            "kind": "ImportSpecifier",
            "text": "aaa",
            "line": 2,
            "column": 1
          }
        ]
      }
    `)
    expect(traverse(sourceFile, ast.importSpecifier('aaa', undefined, true))).toMatchInlineSnapshot('undefined')
    expect(traverse(sourceFile, ast.importSpecifier('aaa', undefined, false))).toMatchInlineSnapshot('undefined')
    expect(traverse(sourceFile, ast.importSpecifier('bbb'))).toMatchInlineSnapshot(`
      Pattern<ImportSpecifier> {
        "params": {
          "name": "bbb"
        },
        "matches": [
          {
            "kind": "ImportSpecifier",
            "text": "type bbb",
            "line": 2,
            "column": 1
          }
        ]
      }
    `)
    expect(traverse(sourceFile, ast.importSpecifier('bbb', undefined, true))).toMatchInlineSnapshot(`
      Pattern<ImportSpecifier> {
        "params": {
          "name": "bbb",
          "isTypeOnly": true
        },
        "matches": [
          {
            "kind": "ImportSpecifier",
            "text": "type bbb",
            "line": 2,
            "column": 1
          }
        ]
      }
    `)
  })

  test('with namespace', () => {
    const code = `
    import { aaa } from "./mod"
    import type * from "./types"
    import * from "./mod"
    `

    const sourceFile = parse(code)

    expect(traverse(sourceFile, ast.importDeclaration('./mod'))).toMatchInlineSnapshot(
      `
      Pattern<ImportDeclaration> {
        "params": {
          "moduleSpecifier": "./mod"
        },
        "matches": [
          {
            "kind": "ImportDeclaration",
            "text": "import { aaa } from \\"./mod\\"",
            "line": 2,
            "column": 1
          },
          {
            "kind": "ImportDeclaration",
            "text": "import * from \\"./mod\\"",
            "line": 4,
            "column": 66
          }
        ]
      }
    `,
    )
    expect(traverse(sourceFile, ast.importDeclaration('./mod', ast.tuple(ast.any())))).toMatchInlineSnapshot(
      `
      Pattern<ImportDeclaration> {
        "params": {
          "moduleSpecifier": "./mod",
          "name": "TupleType"
        },
        "matches": [
          {
            "kind": "ImportDeclaration",
            "text": "import { aaa } from \\"./mod\\"",
            "line": 2,
            "column": 1
          }
        ]
      }
    `,
    )

    expect(
      traverse(
        sourceFile,
        ast.refine(ast.importDeclaration('./mod'), (node) => {
          if (Array.isArray(node)) return
          if (!Node.isImportDeclaration(node)) return undefined
          return node.getNamespaceImport() ? node : undefined
        }),
      ),
    ).toMatchInlineSnapshot(`
      Pattern<ImportDeclaration> {
        "matches": [
          {
            "kind": "ImportDeclaration",
            "text": "import * from \\"./mod\\"",
            "line": 4,
            "column": 66
          }
        ]
      }
    `)
    expect(
      traverse(
        sourceFile,
        ast.refine(
          ast.node(ts.SyntaxKind.ImportDeclaration, {
            moduleSpecifier: ast.string('./mod'),
          }),
          (node) => {
            if (Array.isArray(node)) return
            if (!Node.isImportDeclaration(node)) return undefined
            if (node.getNamespaceImport()) {
              console
              return node
            }
          },
        ),
      ),
    ).toMatchInlineSnapshot(`
      Pattern<ImportDeclaration> {
        "matches": [
          {
            "kind": "ImportDeclaration",
            "text": "import * from \\"./mod\\"",
            "line": 4,
            "column": 66
          }
        ]
      }
    `)
  })

  test('combining patterns into a more complex one', () => {
    const code = `
      // import xxx from "some-module"
      // import type yyy from "type-module"
      // import { aaa, bbb, ccc as ddd } from "with-bindings"
      import { aaa, bbb, ccc as ddd } from "with-bindings"

      another(1, true, 3, "str")
      someFn()
      find({ id: 1 })
      withEmpty({})
      `

    const sourceFile = parse(code)

    expect(traverse(sourceFile, ast.importDeclaration('with-bindings', ast.nodeList(ast.any()))))
      .toMatchInlineSnapshot(`
        Pattern<ImportDeclaration> {
          "params": {
            "moduleSpecifier": "with-bindings",
            "name": "SyntaxList"
          },
          "matches": [
            {
              "kind": "ImportDeclaration",
              "text": "import { aaa, bbb, ccc as ddd } from \\"with-bindings\\"",
              "line": 5,
              "column": 146
            }
          ]
        }
      `)

    // Expected, this will match a list with only ONE element
    expect(traverse(sourceFile, ast.importDeclaration('with-bindings', ast.tuple(ast.any())))).toMatchInlineSnapshot(
      'undefined',
    )

    // Instead, we can use the ast.rest() as the last (or only) element
    // to match a list with any number of elements with given pattern
    expect(traverse(sourceFile, ast.importDeclaration('with-bindings', ast.tuple(ast.rest(ast.any())))))
      .toMatchInlineSnapshot(`
        Pattern<ImportDeclaration> {
          "params": {
            "moduleSpecifier": "with-bindings",
            "name": "TupleType"
          },
          "matches": [
            {
              "kind": "ImportDeclaration",
              "text": "import { aaa, bbb, ccc as ddd } from \\"with-bindings\\"",
              "line": 5,
              "column": 146
            }
          ]
        }
      `)
    expect(
      traverse(
        sourceFile,
        ast.importDeclaration(
          'with-bindings',
          ast.tuple(ast.identifier('aaa'), ast.identifier('bbb'), ast.rest(ast.any())),
        ),
      ),
    ).toMatchInlineSnapshot('undefined')
    expect(
      traverse(
        sourceFile,
        ast.importDeclaration(
          'with-bindings',
          ast.nodeList(
            ast.refine(ast.any(), (list) => {
              // do stuff
              return list
            }),
          ),
        ),
      ),
    ).toMatchInlineSnapshot(`
      Pattern<ImportDeclaration> {
        "params": {
          "moduleSpecifier": "with-bindings",
          "name": "SyntaxList"
        },
        "matches": [
          {
            "kind": "ImportDeclaration",
            "text": "import { aaa, bbb, ccc as ddd } from \\"with-bindings\\"",
            "line": 5,
            "column": 146
          }
        ]
      }
    `)
    expect(
      traverse(
        sourceFile,
        ast.importDeclaration(
          'with-bindings',
          ast.refine(ast.nodeList(), (list) => {
            // do stuff
            return list
          }),
        ),
      ),
    ).toMatchInlineSnapshot(`
      Pattern<ImportDeclaration> {
        "params": {
          "moduleSpecifier": "with-bindings",
          "name": "SyntaxList"
        },
        "matches": [
          {
            "kind": "ImportDeclaration",
            "text": "import { aaa, bbb, ccc as ddd } from \\"with-bindings\\"",
            "line": 5,
            "column": 146
          }
        ]
      }
    `)

    const union = ast.union(ast.importSpecifier('aaa'), ast.importSpecifier('ddd'), ast.importSpecifier('bbb'))
    expect(
      traverse(
        sourceFile,
        ast.importDeclaration(
          'with-bindings',
          ast.nodeList(
            ast.refine(ast.any(), (list) => {
              if (Array.isArray(list)) {
                return list.every((item) => union.matchFn(item)) ? list : undefined
              }
            }),
          ),
        ),
      ),
    ).toMatchInlineSnapshot(`
      Pattern<ImportDeclaration> {
        "params": {
          "moduleSpecifier": "with-bindings",
          "name": "SyntaxList"
        },
        "matches": [
          {
            "kind": "ImportDeclaration",
            "text": "import { aaa, bbb, ccc as ddd } from \\"with-bindings\\"",
            "line": 5,
            "column": 146
          }
        ]
      }
    `)

    const tuple = ast.tuple(ast.importSpecifier('aaa'), ast.importSpecifier('bbb'), ast.importSpecifier('ddd', 'ccc'))
    expect(
      traverse(
        sourceFile,
        ast.importDeclaration(
          'with-bindings',
          ast.refine(ast.nodeList(), (list) => {
            if (Array.isArray(list)) {
              return tuple.matchFn(list)
            }
          }),
        ),
      ),
    ).toMatchInlineSnapshot(`
      Pattern<ImportDeclaration> {
        "params": {
          "moduleSpecifier": "with-bindings",
          "name": "SyntaxList"
        },
        "matches": [
          {
            "kind": "ImportDeclaration",
            "text": "import { aaa, bbb, ccc as ddd } from \\"with-bindings\\"",
            "line": 5,
            "column": 146
          }
        ]
      }
    `)

    expect(traverse(sourceFile, ast.importDeclaration('with-bindings', tuple))).toMatchInlineSnapshot(`
      Pattern<ImportDeclaration> {
        "params": {
          "moduleSpecifier": "with-bindings",
          "name": "TupleType"
        },
        "matches": [
          {
            "kind": "ImportDeclaration",
            "text": "import { aaa, bbb, ccc as ddd } from \\"with-bindings\\"",
            "line": 5,
            "column": 146
          }
        ]
      }
    `)
  })
})

describe('ast.exportDeclaration', () => {
  test('with name', () => {
    const code = `
      export default xxx
      export type { yyy }
      export { aaa, type bbb, ccc as ddd }
      export * from "./namespaced"
      `

    const sourceFile = parse(code)

    expect(traverse(sourceFile, ast.exportDeclaration())).toMatchInlineSnapshot(`
      Pattern<ExportDeclaration> {
        "params": {},
        "matches": [
          {
            "kind": "ExportDeclaration",
            "text": "export type { yyy }",
            "line": 3,
            "column": 26
          },
          {
            "kind": "ExportDeclaration",
            "text": "export { aaa, type bbb, ccc as ddd }",
            "line": 4,
            "column": 52
          },
          {
            "kind": "ExportDeclaration",
            "text": "export * from \\"./namespaced\\"",
            "line": 5,
            "column": 95
          }
        ]
      }
    `)

    expect(traverse(sourceFile, ast.exportDeclaration(['aaa', 'bbb', 'ddd']))).toMatchInlineSnapshot(`
      Pattern<ExportDeclaration> {
        "params": {
          "name": [
            "aaa",
            "bbb",
            "ddd"
          ]
        },
        "matches": [
          {
            "kind": "ExportDeclaration",
            "text": "export { aaa, type bbb, ccc as ddd }",
            "line": 4,
            "column": 52
          }
        ]
      }
    `)

    expect(traverse(sourceFile, ast.exportDeclaration(ast.identifier('xxx')))).toMatchInlineSnapshot('undefined')
  })

  test('is type only', () => {
    const code = `
      export default xxx
      export type { yyy }
      export { aaa, type bbb, ccc as ddd }
      export * from "./namespaced"
      `

    const sourceFile = parse(code)

    expect(traverse(sourceFile, ast.exportDeclaration(['yyy']))).toMatchInlineSnapshot(`
      Pattern<ExportDeclaration> {
        "params": {
          "name": [
            "yyy"
          ]
        },
        "matches": [
          {
            "kind": "ExportDeclaration",
            "text": "export type { yyy }",
            "line": 3,
            "column": 26
          }
        ]
      }
    `)
    expect(traverse(sourceFile, ast.exportDeclaration(['yyy'], false))).toMatchInlineSnapshot('undefined')
    expect(traverse(sourceFile, ast.exportDeclaration(['yyy'], true))).toMatchInlineSnapshot(`
      Pattern<ExportDeclaration> {
        "params": {
          "name": [
            "yyy"
          ],
          "isTypeOnly": true
        },
        "matches": [
          {
            "kind": "ExportDeclaration",
            "text": "export type { yyy }",
            "line": 3,
            "column": 26
          }
        ]
      }
    `)

    expect(traverse(sourceFile, ast.exportDeclaration(ast.any(), true))).toMatchInlineSnapshot(`
      Pattern<ExportDeclaration> {
        "params": {
          "name": "Unknown",
          "isTypeOnly": true
        },
        "matches": [
          {
            "kind": "ExportDeclaration",
            "text": "export type { yyy }",
            "line": 3,
            "column": 26
          }
        ]
      }
    `)
  })

  test('named exports with mixed string and Patterns', () => {
    const code = `
    export { aaa, bbb, ccc as ddd }
    `

    const sourceFile = parse(code)

    expect(traverse(sourceFile, ast.exportDeclaration(['aaa', 'bbb', ast.any()]))).toMatchInlineSnapshot(`
      Pattern<ExportDeclaration> {
        "params": {
          "name": [
            "aaa",
            "bbb",
            "Unknown"
          ]
        },
        "matches": [
          {
            "kind": "ExportDeclaration",
            "text": "export { aaa, bbb, ccc as ddd }",
            "line": 2,
            "column": 1
          }
        ]
      }
    `)

    expect(traverse(sourceFile, ast.exportDeclaration(['aaa', 'bbb', ast.identifier('ddd')]))).toMatchInlineSnapshot(`
      Pattern<ExportDeclaration> {
        "params": {
          "name": [
            "aaa",
            "bbb",
            "Identifier"
          ]
        },
        "matches": [
          {
            "kind": "ExportDeclaration",
            "text": "export { aaa, bbb, ccc as ddd }",
            "line": 2,
            "column": 1
          }
        ]
      }
    `)
  })

  test('with module specifier', () => {
    const code = `
    export { aaa, bbb, ccc as ddd } from "./mod"
    `

    const sourceFile = parse(code)

    expect(traverse(sourceFile, ast.exportDeclaration(ast.nodeList(), undefined, './wrong'))).toMatchInlineSnapshot(
      'undefined',
    )
    expect(traverse(sourceFile, ast.exportDeclaration(ast.nodeList(), undefined, './mod'))).toMatchInlineSnapshot(`
      Pattern<ExportDeclaration> {
        "params": {
          "moduleSpecifier": "./mod",
          "name": "SyntaxList"
        },
        "matches": [
          {
            "kind": "ExportDeclaration",
            "text": "export { aaa, bbb, ccc as ddd } from \\"./mod\\"",
            "line": 2,
            "column": 1
          }
        ]
      }
    `)
  })

  test('with namespace', () => {
    const code = `
    // export { aaa } from "./mod"
    export type * from "./types"
    export * from "./mod"
    `

    const sourceFile = parse(code)

    expect(traverse(sourceFile, ast.exportDeclaration(undefined, undefined, './mod'))).toMatchInlineSnapshot(
      `
      Pattern<ExportDeclaration> {
        "params": {
          "moduleSpecifier": "./mod"
        },
        "matches": [
          {
            "kind": "ExportDeclaration",
            "text": "export * from \\"./mod\\"",
            "line": 4,
            "column": 69
          }
        ]
      }
    `,
    )

    expect(
      traverse(
        sourceFile,
        ast.refine(ast.exportDeclaration(undefined, undefined, './mod'), (node) => {
          if (Array.isArray(node)) return
          if (!Node.isExportDeclaration(node)) return undefined
          return node.isNamespaceExport() ? node : undefined
        }),
      ),
    ).toMatchInlineSnapshot(`
      Pattern<ExportDeclaration> {
        "matches": [
          {
            "kind": "ExportDeclaration",
            "text": "export * from \\"./mod\\"",
            "line": 4,
            "column": 69
          }
        ]
      }
    `)
    expect(
      traverse(
        sourceFile,
        ast.refine(
          ast.node(ts.SyntaxKind.ExportDeclaration, {
            moduleSpecifier: ast.string('./mod'),
          }),
          (node) => {
            if (Array.isArray(node)) return
            if (!Node.isExportDeclaration(node)) return undefined
            if (node.isNamespaceExport()) {
              return node
            }
          },
        ),
      ),
    ).toMatchInlineSnapshot(`
      Pattern<ExportDeclaration> {
        "matches": [
          {
            "kind": "ExportDeclaration",
            "text": "export * from \\"./mod\\"",
            "line": 4,
            "column": 69
          }
        ]
      }
    `)
    expect(
      traverse(
        sourceFile,
        ast.node(ts.SyntaxKind.ExportDeclaration, {
          moduleSpecifier: ast.string('./mod'),
          exportClause: ast.maybeNode(ast.node(ts.SyntaxKind.NamespaceExport)),
        }),
      ),
    ).toMatchInlineSnapshot(`
      Pattern<ExportDeclaration> {
        "matches": [
          {
            "kind": "ExportDeclaration",
            "text": "export * from \\"./mod\\"",
            "line": 4,
            "column": 69
          }
        ]
      }
    `)
  })
})

test('ast.exportAssignment', () => {
  const code = `
  export { aaa, type bbb, renamed as ccc }
  export default xxx;
  export = yyy;
  export type zzz;
    `

  const sourceFile = parse(code)

  expect(traverse(sourceFile, ast.exportAssignment(ast.identifier('xxx')))).toMatchInlineSnapshot(`
    Pattern<ExportAssignment> {
      "params": {
        "expression": "Identifier"
      },
      "matches": [
        {
          "kind": "ExportAssignment",
          "text": "export default xxx;",
          "line": 3,
          "column": 44
        }
      ]
    }
  `)
  expect(traverse(sourceFile, ast.exportAssignment(ast.identifier('xxx'), true))).toMatchInlineSnapshot('undefined')

  expect(traverse(sourceFile, ast.exportAssignment(ast.identifier('yyy'), false))).toMatchInlineSnapshot('undefined')
  expect(traverse(sourceFile, ast.exportAssignment(ast.identifier('yyy'), true))).toMatchInlineSnapshot(`
    Pattern<ExportAssignment> {
      "params": {
        "expression": "Identifier",
        "isExportEquals": true
      },
      "matches": [
        {
          "kind": "ExportAssignment",
          "text": "export = yyy;",
          "line": 4,
          "column": 66
        }
      ]
    }
  `)
})
