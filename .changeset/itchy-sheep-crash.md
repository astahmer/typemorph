---
'typemorph': patch
---

Add `ast.refine`

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
