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
    if (pattern.matchFn(node)) {
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

  bench('pattern matching', () => {
    const sourceFile = parse(code)
    const pattern = traverse(sourceFile, ast.callExpression('find', ast.object({ id: ast.any() })))

    if (!pattern?.match) {
      throw new Error('no match')
    }
  })

  bench('raw traversal', () => {
    const sourceFile = parse(code)

    let match: Node | undefined
    sourceFile.forEachDescendant((node, traversal) => {
      if (Node.isCallExpression(node) && node.getExpression().getText() === 'find') {
        const args = node.getArguments()
        if (args.length === 1 && Node.isObjectLiteralExpression(args[0])) {
          const prop = args[0].getProperty('id')
          if (prop) {
            match = node
            traversal.stop()
          }
        }
      }
    })

    if (!match) {
      throw new Error('no match')
    }
  })
})

describe('simple ast.importDeclaration case', () => {
  const code = `
    import xxx from "some-module"
    import type yyy from "type-module"
    import { aaa, bbb, ccc } from "with-bindings"

    another(1, true, 3, "str")
    someFn()
    find({ id: 1 })
    withEmpty({})
          `

  bench('pattern matching', () => {
    const sourceFile = parse(code)
    const pattern = traverse(
      sourceFile,
      ast.importDeclaration(
        'with-bindings',
        ast.tuple(ast.importSpecifier('aaa'), ast.importSpecifier('bbb'), ast.importSpecifier('ccc')),
      ),
    )

    if (!pattern?.match) {
      throw new Error('no match')
    }
  })

  bench('raw traversal', () => {
    const sourceFile = parse(code)

    let match: Node | undefined
    sourceFile.forEachDescendant((node, traversal) => {
      if (Node.isImportDeclaration(node) && node.getModuleSpecifierValue() === 'with-bindings') {
        const bindings = node.getNamedImports()
        if (
          bindings.length === 3 &&
          bindings[0].getText() === 'aaa' &&
          bindings[1].getText() === 'bbb' &&
          bindings[2].getText() === 'ccc'
        ) {
          match = node
          traversal.stop()
        }
      }
    })

    if (!match) {
      throw new Error('no match')
    }
  })
})

describe('simple ast.object case', () => {
  const code = `
    another(1, true, 3, "str")
    someFn()
    find({ id: 1 })
    withEmpty({})
    multipleArgs({ prop: "aaa" }, { prop: "bbb" })
    multipleKeys({ xxx: 999, yyy: 888 })
          `

  bench('pattern matching', () => {
    const sourceFile = parse(code)
    const pattern = traverse(sourceFile, ast.object({ prop: ast.string('bbb') }))

    if (!pattern?.match) {
      throw new Error('no match')
    }
  })

  bench('raw traversal', () => {
    const sourceFile = parse(code)

    let match: Node | undefined
    sourceFile.forEachDescendant((node, traversal) => {
      if (Node.isObjectLiteralExpression(node)) {
        const prop = node.getProperty('prop')
        if (prop && Node.isPropertyAssignment(prop)) {
          const init = prop.getInitializer()
          if (init && Node.isStringLiteral(init) && init.getLiteralValue() === 'bbb') {
            match = node
            traversal.stop()
          }
        }
      }
    })

    if (!match) {
      throw new Error('no match')
    }
  })
})
