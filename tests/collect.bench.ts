import { Node, SourceFile, ts } from 'ts-morph'
import { bench, describe } from 'vitest'
import { Pattern, ast } from '../src/pattern-matching'
import { createProject } from './create-project'

const project = createProject()
const parse = (code: string) =>
  project.createSourceFile('file.tsx', code, { overwrite: true, scriptKind: ts.ScriptKind.TSX })

const traverse = <TPattern extends Pattern>(sourceFile: SourceFile, pattern: TPattern) => {
  let match: Pattern | undefined
  sourceFile.forEachDescendant((node, traversal) => {
    if (pattern.match(node)) {
      match = pattern
      traversal.stop()
    }
  })

  return match
}

describe('simple ast.callExpression case', () => {
  const code = `
              someFn()
              another(1, true, 3, "str")
              find({ id: 1 })
          `

  bench('with recursion', () => {
    const sourceFile = parse(code)
    const pattern = traverse(
      sourceFile,
      ast.node(ts.SyntaxKind.CallExpression, {
        expression: ast.ref('fn'),
        arguments: ast.tuple(ast.ref('arg1'), ast.ref('arg2'), ast.rest(ast.ref('rest'))),
      }),
    )

    if (!pattern?.match) {
      throw new Error('no match')
    }

    collectWithRecursion(pattern)
  })

  bench('with while + stack', () => {
    const sourceFile = parse(code)
    const pattern = traverse(
      sourceFile,
      ast.node(ts.SyntaxKind.CallExpression, {
        expression: ast.ref('fn'),
        arguments: ast.tuple(ast.ref('arg1'), ast.ref('arg2'), ast.rest(ast.ref('rest'))),
      }),
    )

    if (!pattern?.match) {
      throw new Error('no match')
    }

    collectWithStack(pattern)
  })
})

function collectWithRecursion(pattern: Pattern): Record<string, Pattern> {
  if (!pattern) return {}

  const captures = {} as Record<string, Pattern>
  const process = (obj: Record<string, any>) => {
    for (const [key, value] of Object.entries(obj)) {
      if (!value) continue

      if (value instanceof Pattern) {
        if (value.refName) {
          captures[value.refName] = value
        }

        const nested = value.collectCaptures()
        Object.assign(captures, nested)
        continue
      }

      if (Array.isArray(value)) {
        for (const p of value) {
          if (p instanceof Pattern) {
            if (p.refName) {
              captures[p.refName] = p
            }

            const nested = p.collectCaptures()
            Object.assign(captures, nested)
          }
        }

        continue
      }

      if (typeof value === 'object' && value !== null && !Node.isNode(value)) {
        process(value)
      }
    }
  }

  process(pattern)

  return captures
}

function collectWithStack(pattern: Pattern): Record<string, Pattern> {
  if (!pattern.params) return {}

  const captures = {} as Record<string, Pattern>
  const stack = [pattern.params]

  while (stack.length > 0) {
    const obj = stack.pop() as Record<string, any>

    for (const [_key, value] of Object.entries(obj)) {
      if (!value) continue

      if (value instanceof Pattern) {
        if (value.refName) {
          captures[value.refName] = value
        }

        const nested = value.collectCaptures()
        Object.assign(captures, nested)
        continue
      }

      if (Array.isArray(value)) {
        for (const p of value) {
          if (p instanceof Pattern) {
            if (p.refName) {
              captures[p.refName] = p
            }

            const nested = p.collectCaptures()
            Object.assign(captures, nested)
          }
        }

        continue
      }

      if (typeof value === 'object' && value !== null && !Node.isNode(value)) {
        stack.push(value)
      }
    }
  }

  return captures
}
