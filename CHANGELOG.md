# typemorph

## 0.1.0

### Minor Changes

- 08c809b: ast.kind, ast.exportDeclaration, ast.some, ast.every, ast.object Partial, ast.when/refine list matching,
  Pattern.toString, Pattern.matches, ast.maybeNode, ast.not, ast.contains, Pattern.collectCaptures

### Patch Changes

- 7e1324b: Add `ast.refine`

  ```ts
  const code = `
          another(1, true, 3, "str")
          someFn()
          find({ id: 1 })
      `

  const sourceFile = parse(code)
  const pattern = traverse(
    sourceFile,
    ast.refine(ast.callExpression('find'), (node) => node.getArguments()[0]),
  )

  //     Pattern<CallExpression> {
  //       "matchKind": "ObjectLiteralExpression",
  //       "text": "{ id: 1 }",
  //       "line": 4,
  //       "column": 53
  //     }
  ```

## 0.0.1

### Patch Changes

- 65590a3: initial release
