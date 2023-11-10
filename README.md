# TypeMorph

TypeMorph is a TypeScript library designed to streamline working with abstract syntax trees (ASTs). With a focus on
pattern matching, TypeMorph simplifies the process of analyzing and manipulating TypeScript code.

## Pattern Matching

TypeMorph provides the `ast` class for creating pattern matchers for TypeScript syntax, enabling complex AST queries and
transformations to be expressed in a simple and concise manner.

## Installation

```sh
pnpm install typemorph
```

## Usage

Here is a basic example of how to use TypeMorph to match TypeScript AST nodes:

```typescript
import { ast } from 'typemorph'

// Match a string literal
const stringMatcher = ast.string('hello')
// will match: `const myString = 'hello'`
//                                ^^^^^^^

// Match a numeric literal
const numberMatcher = ast.number(42)
// will match: `const myNumber = 42`
//                                ^^

// Match any node
const anyMatcher = ast.any()
// will match: `const myNumber = 42`
//               ^^^^^^^^^^^^^^^^^^^

// Will resolve to any node with a name or identifier of 'something'
const namedMatcher = ast.named('something')
// will match: `const something = 42`
//                     ^^^^^^^^^

// Match a type-only import declaration
ast.importDeclaration('node:path', 'path', true)
// will match: `import type * as path from 'node:path'`

// Match a named import declaration
ast.importDeclaration('node:fs', ['writeFile', 'readFile'])
// will match: `import { writeFile, readFile } from 'node:fs'`

// Match using a tuple pattern for a more complex case
ast.importDeclaration('node:fs', ast.tuple(ast.importSpecifier('writeFile'), ast.rest(ast.any())))
// will match: `import { writeFile, readFile, readFileSync, readdir } from "node:fs";`
// the ast.rest() pattern will match any number of import specifiers after the previous patterns have been matched.
```

### Project setup example

```ts
import { Node, Project, SourceFile, ts } from 'ts-morph'
import { Pattern, ast } from 'typemorph'

const createProject = () => {
  return new Project({
    compilerOptions: {
      jsx: ts.JsxEmit.React,
      jsxFactory: 'React.createElement',
      jsxFragmentFactory: 'React.Fragment',
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ESNext,
      noUnusedParameters: false,
      noEmit: true,
      useVirtualFileSystem: true,
      allowJs: true,
    },
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
    skipLoadingLibFiles: true,
    useInMemoryFileSystem: true,
  })
}

const project = createProject()

const traverse = <TPattern extends Pattern>(
  sourceFile: SourceFile,
  pattern: TPattern,
  stopOnMatch: boolean = false,
) => {
  let match: Pattern | undefined
  sourceFile.forEachDescendant((node, traversal) => {
    if (pattern.match(node)) {
      match = pattern
      stopOnMatch && traversal.stop()
    }
  })

  return match
}

const sourceFile = project.addSourceFileAtPath('./file.tsx')
const pattern = traverse(
  sourceFile,
  ast.node(ts.SyntaxKind.CallExpression, {
    expression: ast.ref('fn'),
    arguments: ast.tuple(ast.ref('arg1'), ast.ref('arg2'), ast.rest(ast.ref('rest'))),
  }),
)

// file.tsx = `someFunction({ arg1: { foo: 'bar' }}, true, "a", 2, "c")`
if (pattern) {
  const captured = pattern.collectCaptures()
  captured.fn // Pattern<Identifier>
  captured.fn.lastMatch // Identifier
  captured.fn.lastMatch.getText() // 'someFunction'

  captured.arg1 // Pattern<ObjectLiteral>
  captured.arg1.lastMatch // ObjectLiteral
  captured.arg1.lastMatch.getText() // '{ foo: "bar" }'

  captured.arg2 // Pattern<TrueKeyword>
  captured.arg2.lastMatch // TrueKeyword

  captured.rest // Pattern<[StringLiteral, NumericLiteral, StringLiteral]>
}
```

## Examples

### Example 1: Escape hatch

Anytime you need to match a node that does not have a dedicated method, you can use the `ast.node` matcher to match any
AST node of a specific kind.

```ts
const specificImportSpecifierMatcher = ast.node(SyntaxKind.ImportSpecifier, {
  name: ast.identifier('specificName'),
  propertyName: ast.identifier('specificPropertyName'),
})

// will match:
// `import { specificName as specificPropertyName } from 'my-module'`
// `import { specificName } from 'my-module'`
```

### Example 1: Flexible Patterns

```ts
const flexibleMatcherWithRest = ast.importDeclaration(
  'node:fs',
  ast.rest(ast.any()), // This will match any number of import specifiers in the import.
)

// will match:
// `import { readFile } from 'fs'`
// `import { readFile, writeFile } from 'fs'`
// `import { type writeFile, createReadStream } from 'fs'`
```

### Example 2: Refining Matchers

```ts
const typeImportMatcher = ast.refine(
  ast.importDeclaration(ast.any(), ast.any(), true), // This matches any import declaration that is a type import.
  (importDeclarationNode) => {
    // This function can further process the node if needed.
    return importDeclarationNode.isTypeOnly() // Returns true if the import is type-only.
  },
)

// will match:
// `import type { MyType, MyOtherType } from 'my-module'`
// `import type { MyType as MyRenamedType } from 'another-module'`
```

### Example 3: Combining Matchers for Complex Patterns

```ts
const functionReturningPromiseOfSpecificTypeMatcher = ast.node(SyntaxKind.FunctionDeclaration, {
  name: ast.identifier('myFunction'), // Match a function declaration named "myFunction".
  type: ast.node(SyntaxKind.TypeReference, {
    // Match the return type.
    typeName: ast.identifier('Promise'),
    typeArguments: ast.tuple(
      ast.node(SyntaxKind.TypeReference, {
        typeName: ast.identifier('MySpecificType'), // Match "Promise" that resolves to "MySpecificType".
      }),
    ),
  }),
})

// will match:
// `function myFunction(): Promise<MySpecificType> { ... }`
```

For more advanced use-cases, refer to the ~~detailed API documentation provided with the library~~
[test folder](./tests/pattern-matching.test.ts).

## Performance

There's a few simple cases benchmarked in the [pattern-matching.bench.ts](./tests/pattern-matching.bench.ts) file. The
results are as follows:

```
  raw traversal - tests/pattern-matching.bench.ts > simple ast.callExpression case
    1.22x faster than pattern matching

  raw traversal - tests/pattern-matching.bench.ts > simple ast.importDeclaration case
    1.22x faster than pattern matching

  raw traversal - tests/pattern-matching.bench.ts > simple ast.object case
    1.03x faster than pattern matching

```

So, it's not as fast as raw traversal, but it's not too far off either. The performance is good enough for most use
cases especially when you consider the DX benefits of pattern matching over raw traversal.

## Contributing

Contributions are welcome! If you have an idea for an improvement or have found a bug, please open an issue or submit a
pull request.

- `pnpm i`
- `pnpm build`
- `pnpm test`
- `pnpm changeset`

When you're done with your changes, please run `pnpm changeset` in the root of the repo and follow the instructions
described [here](https://github.com/changesets/changesets/blob/main/docs/intro-to-using-changesets.md).

tl;dr: `pnpm changeset` will create a new changeset file in the `.changeset` folder. Please commit this file along with
your changes. Don't consume the changeset, as this will be done by the CI.

---

Please refer to the actual codebase of TypeMorph for more complex and detailed patterns and utilities. This README
provides a starting point for understanding and integrating the library into your projects.
