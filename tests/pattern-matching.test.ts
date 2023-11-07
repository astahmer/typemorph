import { describe, expect, test } from 'vitest'
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
      "text": "someFn()",
      "line": 2,
      "column": 1
    }
  `)
  expect(pattern?.match?.getText()).toMatchInlineSnapshot('"someFn()"')
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
  expect(pattern?.match?.getText()).toMatchInlineSnapshot('undefined')
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
      "text": "another(1, true, 3, \\"str\\")",
      "line": 2,
      "column": 1
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
      "text": "find",
      "line": 4,
      "column": 53
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
      "text": "find({ id: 1 })",
      "line": 6,
      "column": 88
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
      "text": "xxx",
      "line": 2,
      "column": 1
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
      "text": "find",
      "line": 6,
      "column": 88
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
      "text": "\\"some-module\\"",
      "line": 2,
      "column": 1
    }
  `)
  expect(traverse(sourceFile, ast.literal(3))).toMatchInlineSnapshot(`
    Pattern<NumericLiteral> {
      "params": {
        "value": 3
      },
      "matchKind": "NumericLiteral",
      "text": "3",
      "line": 4,
      "column": 36
    }
  `)
  expect(traverse(sourceFile, ast.literal('str'))).toMatchInlineSnapshot(`
    Pattern<StringLiteral> {
      "params": {
        "value": "str"
      },
      "matchKind": "StringLiteral",
      "text": "\\"str\\"",
      "line": 4,
      "column": 36
    }
  `)
  expect(traverse(sourceFile, ast.literal(true))).toMatchInlineSnapshot(`
    Pattern<TrueKeyword> {
      "params": {
        "value": true
      },
      "matchKind": "TrueKeyword",
      "text": "true",
      "line": 4,
      "column": 36
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
      "text": "3",
      "line": 4,
      "column": 36
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
      "matchKind": "StringLiteral",
      "text": "\\"some-module\\"",
      "line": 2,
      "column": 1
    }
  `)

  const pattern = traverse(sourceFile, ast.string('str'))

  expect(pattern).toMatchInlineSnapshot(`
    Pattern<StringLiteral> {
      "params": {
        "value": "str"
      },
      "matchKind": "StringLiteral",
      "text": "\\"str\\"",
      "line": 4,
      "column": 36
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
      "matchKind": "NumericLiteral",
      "text": "1",
      "line": 4,
      "column": 36
    }
  `)
  const pattern = traverse(sourceFile, ast.number(3))

  expect(pattern).toMatchInlineSnapshot(`
    Pattern<NumericLiteral> {
      "params": {
        "value": 3
      },
      "matchKind": "NumericLiteral",
      "text": "3",
      "line": 4,
      "column": 36
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
  const first = traverse(sourceFile, ast.boolean())

  expect(first).toMatchInlineSnapshot(`
    Pattern<TrueKeyword> {
      "params": {},
      "matchKind": "TrueKeyword",
      "text": "true",
      "line": 4,
      "column": 36
    }
  `)
  const truthy = traverse(sourceFile, ast.boolean(true))

  expect(truthy).toMatchInlineSnapshot(`
    Pattern<TrueKeyword> {
      "params": {
        "value": true
      },
      "matchKind": "TrueKeyword",
      "text": "true",
      "line": 4,
      "column": 36
    }
  `)

  const falsy = traverse(sourceFile, ast.boolean(false))

  expect(falsy).toMatchInlineSnapshot(`
    Pattern<TrueKeyword> {
      "params": {
        "value": false
      },
      "matchKind": "FalseKeyword",
      "text": "false",
      "line": 5,
      "column": 71
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
      "matchKind": "NullKeyword",
      "text": "null",
      "line": 6,
      "column": 88
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
      "matchKind": "Identifier",
      "text": "undefined",
      "line": 6,
      "column": 88
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
      "matchKind": "CallExpression",
      "text": "another(1, true, 3, \\"str\\")",
      "line": 5,
      "column": 62
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
      "matchKind": "EnumDeclaration",
      "text": "enum SomeEnum {\\n      A = \\"a\\",\\n      B = \\"b\\",\\n      C = \\"c\\",\\n    }",
      "line": 4,
      "column": 36
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
      "matchKind": "EnumDeclaration",
      "text": "enum SomeEnum {\\n      A = \\"a\\",\\n      B = \\"b\\",\\n      C = \\"c\\",\\n    }",
      "line": 4,
      "column": 36
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
      "matchKind": "StringLiteral",
      "text": "\\"some-module\\"",
      "line": 2,
      "column": 1
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
      "matchKind": "StringLiteral",
      "text": "\\"some-module\\"",
      "line": 2,
      "column": 1
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
      "matchKind": "CallExpression",
      "text": "someFn()",
      "line": 12,
      "column": 161
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
      "matchKind": "CallExpression",
      "text": "fn(1, 2, 3, 4, 5)",
      "line": 10,
      "column": 108
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
      ast.when((node): node is Node => Node.isCallExpression(node) && node.getArguments().length === 0),
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
      "matchKind": "CallExpression",
      "text": "someFn()",
      "line": 12,
      "column": 161
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
        "matchKind": "CallExpression",
        "text": "someFn()",
        "line": 2,
        "column": 1
      }
    `)

    expect(traverse(sourceFile, ast.node(ts.SyntaxKind.CallExpression, { expression: ast.identifier('someFn') })))
      .toMatchInlineSnapshot(`
        Pattern<CallExpression> {
          "matchKind": "CallExpression",
          "text": "someFn()",
          "line": 2,
          "column": 1
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
        "matchKind": "CallExpression",
        "text": "find({ id: 1 })",
        "line": 4,
        "column": 57
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
        "matchKind": "CallExpression",
        "text": "another(1, true, 3, \\"str\\")",
        "line": 3,
        "column": 20
      }
    `)

    expect(traverse(sourceFile, ast.callExpression('find', ast.tuple(ast.object())))).toMatchInlineSnapshot(`
      Pattern<CallExpression> {
        "params": {
          "arguments": [
            "TupleType"
          ]
        },
        "matchKind": "CallExpression",
        "text": "find({ id: 1 })",
        "line": 4,
        "column": 57
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
        "matchKind": "CallExpression",
        "text": "another(1, true, 3, \\"str\\")",
        "line": 3,
        "column": 16
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
        "matchKind": "CallExpression",
        "text": "another(1, true, 3, \\"str\\")",
        "line": 3,
        "column": 16
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
        "matchKind": "CallExpression",
        "text": "another(1, true, 3, \\"str\\")",
        "line": 3,
        "column": 16
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
        "matchKind": "CallExpression",
        "text": "another(1, true, 3, \\"str\\")",
        "line": 3,
        "column": 16
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
        "matchKind": "CallExpression",
        "text": "another(1, true, 3, \\"str\\")",
        "line": 3,
        "column": 20
      }
    `)
    expect(traverse(sourceFile, ast.callExpression('another', ast.rest(ast.any())))).toMatchInlineSnapshot(`
      Pattern<CallExpression> {
        "params": {
          "arguments": [
            "RestType"
          ]
        },
        "matchKind": "CallExpression",
        "text": "another(1, true, 3, \\"str\\")",
        "line": 3,
        "column": 20
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
          "matchKind": "CallExpression",
          "text": "another(1, true, 3, \\"str\\")",
          "line": 3,
          "column": 20
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
        "matchKind": "CallExpression",
        "text": "another(1, true, 3, \\"str\\")",
        "line": 3,
        "column": 20
      }
    `)
  })
})

test('ast.list', () => {
  const code = `
    import xxx from "some-module"

        another(1, true, 3, "str")
        someFn(1, 2, 3)
        one("aaa")
        str("aaa", "bbb")
        find({ id: null })
    `

  const sourceFile = parse(code)

  expect(traverse(sourceFile, ast.node(ts.SyntaxKind.CallExpression, { arguments: ast.list(ast.any()) })))
    .toMatchInlineSnapshot(`
      Pattern<CallExpression> {
        "matchKind": "CallExpression",
        "text": "another(1, true, 3, \\"str\\")",
        "line": 4,
        "column": 36
      }
    `)

  expect(traverse(sourceFile, ast.node(ts.SyntaxKind.CallExpression, { arguments: ast.list(ast.number()) })))
    .toMatchInlineSnapshot(`
      Pattern<CallExpression> {
        "matchKind": "CallExpression",
        "text": "someFn(1, 2, 3)",
        "line": 5,
        "column": 71
      }
    `)

  expect(traverse(sourceFile, ast.node(ts.SyntaxKind.CallExpression, { arguments: ast.list(ast.string()) })))
    .toMatchInlineSnapshot(`
      Pattern<CallExpression> {
        "matchKind": "CallExpression",
        "text": "one(\\"aaa\\")",
        "line": 6,
        "column": 95
      }
    `)
})

test('ast.object', () => {
  const code = `
    import xxx from "some-module"

        another(1, true, 3, "str")
        someFn()
        find({ id: 1 })
        withEmpty({})
    `

  const sourceFile = parse(code)
  const first = traverse(sourceFile, ast.object())

  expect(first).toMatchInlineSnapshot(`
    Pattern<ObjectLiteralExpression> {
      "params": {},
      "matchKind": "ObjectLiteralExpression",
      "text": "{ id: 1 }",
      "line": 6,
      "column": 88
    }
  `)
  const empty = traverse(sourceFile, ast.object({}))

  expect(empty).toMatchInlineSnapshot(`
    Pattern<ObjectLiteralExpression> {
      "params": {
        "properties": {}
      },
      "matchKind": "ObjectLiteralExpression",
      "text": "{}",
      "line": 7,
      "column": 112
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
      "matchKind": "ObjectLiteralExpression",
      "text": "{ id: 1 }",
      "line": 6,
      "column": 88
    }
  `)
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
      "matchKind": "ObjectLiteralExpression",
      "text": "{ id: 1 }",
      "line": 6,
      "column": 88
    }
  `)
  const empty = traverse(sourceFile, ast.object({}))

  expect(empty).toMatchInlineSnapshot(`
    Pattern<ObjectLiteralExpression> {
      "params": {
        "properties": {}
      },
      "matchKind": "ObjectLiteralExpression",
      "text": "{}",
      "line": 7,
      "column": 112
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
      "matchKind": "ObjectLiteralExpression",
      "text": "{ id: 1 }",
      "line": 6,
      "column": 88
    }
  `)

  expect(traverse(sourceFile, ast.object({ prop: ast.string() }))).toMatchInlineSnapshot(`
    Pattern<ObjectLiteralExpression> {
      "params": {
        "properties": {
          "prop": "StringLiteral"
        }
      },
      "matchKind": "ObjectLiteralExpression",
      "text": "{ prop: \\"aaa\\" }",
      "line": 8,
      "column": 134
    }
  `)

  expect(traverse(sourceFile, ast.object({ prop: ast.string('bbb') }))).toMatchInlineSnapshot(`
    Pattern<ObjectLiteralExpression> {
      "params": {
        "properties": {
          "prop": "StringLiteral"
        }
      },
      "matchKind": "ObjectLiteralExpression",
      "text": "{ prop: \\"bbb\\" }",
      "line": 8,
      "column": 134
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
      "matchKind": "ObjectLiteralExpression",
      "text": "{ xxx: 999, yyy: 888 }",
      "line": 9,
      "column": 189
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
      "matchKind": "ArrayLiteralExpression",
      "text": "[]",
      "line": 7,
      "column": 112
    }
  `)

  expect(traverse(sourceFile, ast.array(ast.any()))).toMatchInlineSnapshot(`
    Pattern<ArrayLiteralExpression> {
      "params": {
        "pattern": "Unknown"
      },
      "matchKind": "ArrayLiteralExpression",
      "text": "[\\"aaa\\"]",
      "line": 8,
      "column": 134
    }
  `)

  expect(traverse(sourceFile, ast.array(ast.number()))).toMatchInlineSnapshot(`
    Pattern<ArrayLiteralExpression> {
      "params": {
        "pattern": "NumericLiteral"
      },
      "matchKind": "ArrayLiteralExpression",
      "text": "[999, 888]",
      "line": 9,
      "column": 173
    }
  `)

  expect(traverse(sourceFile, ast.array(ast.string()))).toMatchInlineSnapshot(`
    Pattern<ArrayLiteralExpression> {
      "params": {
        "pattern": "StringLiteral"
      },
      "matchKind": "ArrayLiteralExpression",
      "text": "[\\"aaa\\"]",
      "line": 8,
      "column": 134
    }
  `)

  expect(traverse(sourceFile, ast.array(ast.string('bbb')))).toMatchInlineSnapshot(`
    Pattern<ArrayLiteralExpression> {
      "params": {
        "pattern": "StringLiteral"
      },
      "matchKind": "ArrayLiteralExpression",
      "text": "[\\"bbb\\"]",
      "line": 8,
      "column": 134
    }
  `)

  expect(traverse(sourceFile, ast.array(ast.union(ast.number(), ast.string())))).toMatchInlineSnapshot(`
    Pattern<ArrayLiteralExpression> {
      "params": {
        "pattern": "UnionType"
      },
      "matchKind": "ArrayLiteralExpression",
      "text": "[\\"aaa\\"]",
      "line": 8,
      "column": 134
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
        "matchKind": "PropertyAccessExpression",
        "text": "styled.div",
        "line": 7,
        "column": 123
      }
    `)

    expect(traverse(sourceFile, ast.propertyAccessExpression('this.props.xxx'))).toMatchInlineSnapshot(`
      Pattern<PropertyAccessExpression> {
        "params": {
          "name": "this.props.xxx"
        },
        "matchKind": "PropertyAccessExpression",
        "text": "this.props.xxx",
        "line": 8,
        "column": 162
      }
    `)
    expect(traverse(sourceFile, ast.propertyAccessExpression('using?.optional?.chaining'))).toMatchInlineSnapshot(
      `
      Pattern<PropertyAccessExpression> {
        "params": {
          "name": "using?.optional?.chaining"
        },
        "matchKind": "PropertyAccessExpression",
        "text": "using?.optional?.chaining",
        "line": 10,
        "column": 209
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
        "matchKind": "PropertyAccessExpression",
        "text": "((wrapped?.around! as any)?.multiple as any)?.things",
        "line": 11,
        "column": 246
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
        "matchKind": "PropertyAccessExpression",
        "text": "using?.optional?.chaining",
        "line": 10,
        "column": 209
      }
    `,
    )
    expect(traverse(sourceFile, ast.propertyAccessExpression('wrapped.around.multiple.things'))).toMatchInlineSnapshot(
      `
      Pattern<PropertyAccessExpression> {
        "params": {
          "name": "wrapped.around.multiple.things"
        },
        "matchKind": "PropertyAccessExpression",
        "text": "((wrapped?.around! as any)?.multiple as any)?.things",
        "line": 11,
        "column": 246
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
      "matchKind": "ElementAccessExpression",
      "text": "styled[\\"div\\"]",
      "line": 7,
      "column": 123
    }
  `,
  )
  expect(traverse(sourceFile, ast.elementAccessExpression('wrapped', ast.any()))).toMatchInlineSnapshot(`
    Pattern<ElementAccessExpression> {
      "params": {
        "name": "wrapped",
        "arg": "Unknown"
      },
      "matchKind": "ElementAccessExpression",
      "text": "wrapped?.[\\"around\\"]",
      "line": 11,
      "column": 266
    }
  `)

  expect(traverse(sourceFile, ast.elementAccessExpression(ast.any(), ast.string('things')))).toMatchInlineSnapshot(`
    Pattern<ElementAccessExpression> {
      "params": {
        "name": "Unknown",
        "arg": "StringLiteral"
      },
      "matchKind": "ElementAccessExpression",
      "text": "((wrapped?.[\\"around\\"]! as any)?.[\\"multiple\\"] as any)?.[\\"things\\"]",
      "line": 11,
      "column": 266
    }
  `)
})
