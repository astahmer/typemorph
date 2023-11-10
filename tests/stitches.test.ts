import { Node, PropertyAssignment, SourceFile, SyntaxKind, ts } from 'ts-morph'
import { describe, expect, test } from 'vitest'
import { Pattern, ast } from '../src/pattern-matching'
import { parse, traverse } from './tests-utils'
import { getPropertyAccessExpressionName } from '../src/ast-utils'

const filter = (node: SourceFile, pattern: Pattern) => {
  traverse(node, pattern, false)
  return pattern
}

describe('stitches', () => {
  test('styled', () => {
    const code = `
        import styled from 'styled-components'

        const StyledButton = styled.button(({ theme: userTheme }) => ({
            color: theme.colors.primary,
            display: 'block',
            textDecoration: 'none'
        }))

        const StyledLink = styled.a(({ theme }) => ({
            color: theme.colors.primary,
            display: 'block',
            textDecoration: 'none'
        }))

        `

    const sourceFile = parse(code)

    expect(
      traverse(
        sourceFile,
        ast.callExpression(
          ast.propertyAccessExpression(
            ast.when<PropertyAssignment>((node) => {
              const name = getPropertyAccessExpressionName(node)
              return name?.startsWith('styled.a')
            }),
          ),
        ),
      ),
    ).toMatchInlineSnapshot(`
      Pattern<CallExpression> {
        "params": {
          "arguments": []
        },
        "matches": [
          {
            "kind": "CallExpression",
            "text": "styled.a(({ theme }) => ({\\n            color: theme.colors.primary,\\n            display: 'block',\\n            textDecoration: 'none'\\n        }))",
            "line": 10,
            "column": 240
          }
        ]
      }
    `)
  })

  test('theme fn', () => {
    const code = `
        import styled from 'styled-components'

        const StyledButton = styled.button(({ theme: userTheme }) => ({
            color: theme.colors.primary,
            display: 'block',
            textDecoration: 'none'
        }))

        const StyledLink = styled.a(({ theme }) => ({
            color: theme.colors.primary,
            display: 'block',
            textDecoration: 'none'
        }))

        `

    const sourceFile = parse(code)

    expect(filter(sourceFile, ast.node(SyntaxKind.ObjectBindingPattern))).toMatchInlineSnapshot(`
      Pattern<ObjectBindingPattern> {
        "params": {
          "type": 206
        },
        "matches": [
          {
            "kind": "ObjectBindingPattern",
            "text": "{ theme: userTheme }",
            "line": 4,
            "column": 49
          },
          {
            "kind": "ObjectBindingPattern",
            "text": "{ theme }",
            "line": 10,
            "column": 240
          }
        ]
      }
    `)

    expect(
      filter(
        sourceFile,
        ast.node(SyntaxKind.ObjectBindingPattern, {
          elements: ast.some(
            ast.refine(ast.node(SyntaxKind.BindingElement), (node) => {
              return node.getName() === 'theme' || node.getPropertyNameNode()?.getText() === 'theme'
            }),
          ),
        }),
      ),
    ).toMatchInlineSnapshot(`
      Pattern<ObjectBindingPattern> {
        "params": {
          "type": 206,
          "props": {
            "elements": "SyntaxList"
          }
        },
        "matches": [
          {
            "kind": "ObjectBindingPattern",
            "text": "{ theme: userTheme }",
            "line": 4,
            "column": 49
          },
          {
            "kind": "ObjectBindingPattern",
            "text": "{ theme }",
            "line": 10,
            "column": 240
          }
        ]
      }
    `)
  })
})
