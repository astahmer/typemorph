import { JsxOpeningElement, JsxSelfClosingElement, SyntaxKind, ts } from 'ts-morph'
import { expect, test } from 'vitest'
import { ast } from '../src/pattern-matching'
import { parse, traverse } from './tests-utils'

// https://twitter.com/peterpme/status/1729518124939018532/photo/1

test('AST View twitter example', () => {
  const code = `
    function MyView () {
      return <>
        <View flex={1} />
        <View wrong={2} />
        <View f={3} />
        <View flex={4} style={{ color: "red" }} />
      </>
    }
        `

  const sourceFile = parse(code)

  const pattern = ast.is(
    ast.union(ast.kind(ts.SyntaxKind.JsxOpeningElement), ast.kind(ts.SyntaxKind.JsxSelfClosingElement)),
    {
      tagName: ast.named('View'),
      attributes: ast.node(ts.SyntaxKind.JsxAttributes, {
        properties: ast.some(
          ast.node(ts.SyntaxKind.JsxAttribute, {
            name: ast.union(ast.named('flex'), ast.named('f')),
          }),
        ),
      }),
    },
  )

  expect(traverse(sourceFile, pattern)).toMatchInlineSnapshot(`
    Pattern<Unknown> {
      "params": {
        "pattern": "UnionType",
        "props": {
          "tagName": "Unknown",
          "attributes": "JsxAttributes"
        }
      },
      "matches": [
        {
          "kind": "JsxSelfClosingElement",
          "text": "<View flex={1} />",
          "line": 4,
          "column": 42
        },
        {
          "kind": "JsxSelfClosingElement",
          "text": "<View f={3} />",
          "line": 6,
          "column": 95
        },
        {
          "kind": "JsxSelfClosingElement",
          "text": "<View flex={4} style={{ color: \\"red\\" }} />",
          "line": 7,
          "column": 118
        }
      ]
    }
  `)

  pattern.matches.forEach((match) => {
    const node = match as JsxSelfClosingElement | JsxOpeningElement

    const styleAttribute = (
      node.getAttribute('style') ?? node.addAttribute({ name: 'style', initializer: '{{}}' })
    ).asKindOrThrow(SyntaxKind.JsxAttribute)

    const styleObj = styleAttribute
      .getInitializerOrThrow()
      .asKind(SyntaxKind.JsxExpression)
      ?.getExpressionOrThrow()
      .asKindOrThrow(SyntaxKind.ObjectLiteralExpression)

    node.getAttributes().forEach((attribute) => {
      if (attribute.getKind() === SyntaxKind.JsxAttribute) {
        const jsxAttribute = attribute.asKind(SyntaxKind.JsxAttribute)
        if (!jsxAttribute) return
        const attributeName = jsxAttribute.getNameNode().getText()

        if (attributeName === 'flex' || attributeName === 'f') {
          const flexValue = jsxAttribute
            .getInitializerOrThrow()
            ?.asKindOrThrow(SyntaxKind.JsxExpression)
            .getExpressionOrThrow()
            .getText()
          styleObj?.addPropertyAssignment({ name: 'flex', initializer: flexValue })
          jsxAttribute.remove()
        }
      }
    })
  })

  sourceFile.saveSync()

  expect(sourceFile.getText()).toMatchInlineSnapshot(`
    "function MyView () {
          return <>
            <View style={{
                flex: 1
            }} />
            <View wrong={2} />
            <View style={{
                flex: 3
            }} />
            <View style={{ color: "red",
                flex: 4
            }} />
          </>
        }
            "
  `)
})
