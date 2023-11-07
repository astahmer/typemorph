import { Node, SyntaxKind, ts, type KindToNodeMappings } from 'ts-morph'
import { getSyntaxKindName } from './get-syntax-kind-name'
import { binaryOperators } from './operators'
import { isLiteral, isStringLike, unwrapExpression } from './ast-utils'
import { isNotNullish } from './asserts'

type AnyParams = Record<string, any>
export interface PatternOptions<TSyntax extends SyntaxKind, Params> {
  kind: TSyntax
  match: (node: Node | Node[]) => boolean | Node | Node[] | undefined
  params?: Params
}

export class Pattern<
  TSyntax extends SyntaxKind = SyntaxKind,
  TMatch = NodeOfKind<TSyntax>,
  Params extends AnyParams = AnyParams,
> {
  kind: SyntaxKind
  kindName: string | undefined
  matchFn: (node: Node | Node[]) => TMatch | undefined
  params: Params
  match?: TMatch | undefined

  constructor({ kind, match: assert, params }: PatternOptions<TSyntax, Params>) {
    this.kind = kind
    this.kindName = getSyntaxKindName(kind)
    this.matchFn = (node) => {
      const result = assert(node)
      if (result) {
        const match = Node.isNode(result) ? result : node
        this.match = match as TMatch
        return match as TMatch
      }
    }
    this.params = params as Params
  }
}

export type NodeOfKind<TKind extends SyntaxKind> = KindToNodeMappings[TKind]
export type CompilerNodeOfKind<TKind extends SyntaxKind> = KindToNodeMappings[TKind]['compilerNode']

export type ExtractNodeKeys<T> = Exclude<keyof T, keyof ts.Node | `_${string}`>
export type NodeParams<TKind extends SyntaxKind> = {
  [K in ExtractNodeKeys<CompilerNodeOfKind<TKind>>]?: Pattern<TKind, any>
}

export type PatternNode<TPattern extends Pattern> = TPattern extends Pattern<infer _, infer TMatch> ? TMatch : never

export class ast {
  static kind(syntaxKind: SyntaxKind) {
    return new Pattern({ kind: syntaxKind, match: Node.isNode })
  }

  static node<TKind extends SyntaxKind>(type: TKind, props?: NodeParams<TKind>) {
    return new Pattern({
      kind: type,
      match: (node: Node | Node[]) => {
        if (Array.isArray(node)) return false
        if (!node.isKind(type)) return false
        if (!props) return true

        for (const [key, pattern] of Object.entries(props)) {
          if (!pattern) continue

          const prop = node.getNodeProperty(key as any)

          if (!prop) {
            return false
          }

          const match = (pattern as Pattern<TKind>).matchFn(prop)
          if (!match) {
            // console.log(node.getText())
            // console.log(prop)
            // console.log({ node: node.getKindName(), key }, pattern)
            return false
          }
        }

        return true
      },
    })
  }

  static any() {
    return new Pattern({ kind: SyntaxKind.Unknown, match: () => true })
  }

  static when<TNode extends Node>(condition: (node: Node) => node is TNode) {
    return new Pattern<ReturnType<TNode['getKind']>, TNode>({
      kind: SyntaxKind.Unknown as any,
      match: (node) => (Array.isArray(node) ? false : condition(node)),
    })
  }

  static refine<TPattern extends Pattern, RNode extends Node>(
    pattern: TPattern,
    transform: (node: PatternNode<TPattern>) => RNode | undefined,
  ) {
    return new Pattern<ReturnType<RNode['getKind']>, RNode>({
      kind: pattern.kind as any,
      match: (node) => {
        if (Array.isArray(node)) return
        if (!pattern.matchFn(node)) return
        return transform(node as PatternNode<TPattern>)
      },
    })
  }

  static named(name: string) {
    return new Pattern({
      kind: SyntaxKind.Unknown,
      match: (node) => {
        if (Array.isArray(node)) return
        if (Node.hasName(node)) return node.getName() === name
        if (Node.isIdentifier(node) && node.getText() === name) return node.getParent()
      },
      params: { name },
    })
  }

  static identifier(name: string) {
    return new Pattern({
      params: { name },
      kind: SyntaxKind.Identifier,
      match: (node) => !Array.isArray(node) && Node.isIdentifier(node) && node.getText() === name,
    })
  }

  static literal(value?: string | number | boolean | null | undefined) {
    if (arguments.length === 0) return ast.when(isLiteral)

    const type = typeof value
    switch (typeof value) {
      case 'string':
        return ast.string(value)
      case 'number':
        return ast.number(value)
      case 'boolean':
        return ast.boolean(value)
      case 'object':
        return ast.null()
      case 'undefined':
        return ast.undefined()
      default:
        throw new Error(`Unknown literal type ${type}`)
    }
  }

  static string(value?: string) {
    return new Pattern({
      params: { value },
      kind: SyntaxKind.StringLiteral,
      match: (node) => {
        if (Array.isArray(node)) return
        if (isStringLike(node)) return isNotNullish(value) ? node.getLiteralText() === value : true
      },
    })
  }

  static number(value?: number) {
    return new Pattern({
      params: { value },
      kind: SyntaxKind.NumericLiteral,
      match: (node) => {
        if (Array.isArray(node)) return
        if (Node.isNumericLiteral(node)) return isNotNullish(value) ? node.getLiteralValue() === value : true
      },
    })
  }

  static boolean(value?: boolean) {
    return new Pattern({
      params: { value },
      kind: SyntaxKind.TrueKeyword,
      match: (node) => {
        if (Array.isArray(node)) return
        if (Node.isTrueLiteral(node) || Node.isFalseLiteral(node))
          return isNotNullish(value) ? node.getLiteralValue() === value : true
      },
    })
  }

  static null() {
    return new Pattern({
      kind: SyntaxKind.NullKeyword,
      match: (node) => {
        if (Array.isArray(node)) return
        if (Node.isNullLiteral(node)) return true
      },
    })
  }

  static undefined() {
    return new Pattern({
      kind: SyntaxKind.UndefinedKeyword,
      match: (node) => {
        if (Array.isArray(node)) return
        if (Node.isIdentifier(node) && node.getText() === 'undefined') return true
      },
    })
  }

  /**
   * Ensure that the node is a tuple of a fixed length with elements matching the given patterns in the same order
   * Unless the last pattern is a rest pattern, in which case the tuple can have any number of elements as long as the first patterns match
   */
  static tuple<TList extends Pattern[]>(...patterns: TList) {
    const last = patterns[patterns.length - 1]

    // If the last pattern is a rest pattern, remove it from the list and use it as the rest pattern
    // When the nodeList length has reached the number of patterns, use the rest pattern for the remaining nodes
    if (last instanceof Pattern && last.params?.isRest) {
      const restPattern = patterns.pop()?.params?.pattern
      return new Pattern({
        params: { patterns, restPattern },
        kind: SyntaxKind.TupleType,
        match: (nodeList) => {
          if (!Array.isArray(nodeList)) return
          if (nodeList.length < patterns.length) return
          return nodeList.every((child, index) => {
            const pattern = patterns[index] ?? restPattern
            if (!patterns[index]) {
              return restPattern.matchFn(child)
            }
            return pattern.matchFn(child)
          })
        },
      })
    }

    // Basic tuple of fixed length
    return new Pattern({
      params: { children: patterns },
      kind: SyntaxKind.TupleType,
      match: (nodeList) => {
        if (!Array.isArray(nodeList)) return
        if (nodeList.length !== patterns.length) return
        return nodeList.every((child, index) => {
          const pattern = patterns[index]
          if (!pattern) return
          return pattern.matchFn(child)
        })
      },
    })
  }

  static rest<TPattern extends Pattern>(pattern: TPattern) {
    return new Pattern({
      params: { pattern, isRest: true },
      kind: SyntaxKind.RestType,
      match: (nodeList) => {
        if (!Array.isArray(nodeList)) return
        return nodeList.every((child) => pattern.matchFn(child))
      },
    })
  }

  static enum<TEnum extends Record<string, string | number>>(name: string, enumObj?: TEnum) {
    const pattern = ast.node(SyntaxKind.EnumDeclaration, {
      name: ast.identifier(name),
      members: enumObj
        ? ast.tuple(
            ...Object.entries(enumObj).map(([key, value]) => {
              return ast.node(SyntaxKind.EnumMember, {
                name: ast.identifier(key),
                initializer: ast.literal(value),
              })
            }),
          )
        : undefined,
    })

    return new Pattern({
      params: { enumObj },
      kind: SyntaxKind.EnumDeclaration,
      match: single(pattern),
    })
  }

  static union<TList extends Pattern[]>(...patterns: TList) {
    return new Pattern({
      params: { patterns },
      kind: SyntaxKind.UnionType,
      match: (nodeList) => {
        return patterns.some((pattern) => pattern.matchFn(nodeList))
      },
    })
  }

  static intersection<TList extends Pattern[]>(...patterns: TList) {
    return new Pattern({
      params: { patterns },
      kind: SyntaxKind.IntersectionType,
      match: (nodeList) => {
        return patterns.every((pattern) => pattern.matchFn(nodeList))
      },
    })
  }

  static object<TProps extends Record<string, Pattern>>(properties?: TProps) {
    const props = properties
      ? Object.entries(properties).map(([key, value]) => {
          return ast.node(SyntaxKind.PropertyAssignment, {
            name: ast.identifier(key),
            initializer: value,
          })
        })
      : undefined

    const pattern = ast.node(
      SyntaxKind.ObjectLiteralExpression,
      props ? { properties: ast.tuple(...props) } : undefined,
    )

    return new Pattern({
      params: { properties },
      kind: SyntaxKind.ObjectLiteralExpression,
      match: single(pattern),
    })
  }

  static array<TArr extends Pattern>(pattern?: TArr) {
    return new Pattern({
      params: { pattern },
      kind: SyntaxKind.ArrayLiteralExpression,
      match: (node) => {
        if (Array.isArray(node)) return
        if (!Node.isArrayLiteralExpression(node)) return
        if (!pattern) return true

        const elements = node.getElements()
        if (elements.length === 0) return false
        return elements.every((child) => pattern.matchFn(child))
      },
    })
  }

  static callExpression<TArgs extends Pattern>(name: NamePattern, ...args: TArgs[]) {
    const namePattern = getNamePattern(name)
    const _args = getArguments(...args)
    const pattern = ast.node(SyntaxKind.CallExpression, {
      expression: namePattern,
      arguments: _args,
    })

    return new Pattern({
      params: { arguments: args },
      kind: SyntaxKind.CallExpression,
      match: single(pattern),
    })
  }

  static propertyAccessExpression(name: NamePattern) {
    const namePattern = getNamePattern(name)
    const isString = typeof name === 'string'

    return new Pattern({
      params: { name },
      kind: SyntaxKind.PropertyAccessExpression,
      match: (node) => {
        if (Array.isArray(node)) return
        if (!Node.isPropertyAccessExpression(node)) return

        if (isString) {
          if (node.getText() === name) return true

          const propPath = getPropertyAccessExpressionName(node)
          return propPath === name
        }

        return namePattern.matchFn(node)
      },
    })
  }

  static elementAccessExpression(name: NamePattern, arg?: Pattern) {
    const expression = getNamePattern(name)
    const pattern = ast.node(SyntaxKind.ElementAccessExpression, {
      expression,
      argumentExpression: arg,
    })

    return new Pattern({
      params: { name, arg },
      kind: SyntaxKind.ElementAccessExpression,
      match: single(pattern),
    })
  }

  /**
   * Unwrap an expression
   * @example `ast.unwrap(ast.propertyAccessExpression('foo'))` will match `foo` in `(foo.bar) as any`
   */
  static unwrap<TPattern extends Pattern>(pattern: TPattern) {
    return new Pattern({
      params: { pattern },
      kind: SyntaxKind.Unknown,
      match: (node) => {
        if (Array.isArray(node)) return
        return pattern.matchFn(unwrapExpression(node))
      },
    })
  }

  static conditionalExpression(condition: Pattern, whenTrue: Pattern, whenFalse: Pattern) {
    const pattern = ast.node(SyntaxKind.ConditionalExpression, { condition, whenTrue, whenFalse })
    return new Pattern({
      params: { condition, whenTrue, whenFalse },
      kind: SyntaxKind.ConditionalExpression,
      match: single(pattern),
    })
  }

  static binaryExpression<
    TLeft extends Pattern,
    TOperator extends Pattern | keyof typeof binaryOperators | ts.LogicalOperator,
    TRight extends Pattern,
  >(left: TLeft, operator: TOperator, right: TRight) {
    const operatorPattern = getOperatorPattern(operator)
    const pattern = ast.node(SyntaxKind.BinaryExpression, {
      left,
      operatorToken: operatorPattern,
      right,
    })

    return new Pattern({
      params: { left, operatorPattern, right },
      kind: SyntaxKind.BinaryExpression,
      match: single(pattern),
    })
  }

  /**
   * @example ast.importDeclaration("node:path", "path", true) -> import type * as path from 'path'
   * @example ast.importDeclaration("node:fs", ["writeFile", "readFile"]) -> import { writeFile, readFile } from 'fs'
   * @example ast.importDeclaration("node:fs", ast.tuple(ast.importSpecifier("writeFile"), ast.importSpecifier("readFile"))) -> import { writeFile, readFile } from 'fs'
   * @example ast.importDeclaration("node:fs", ast.rest(ast.any())) -> import { ... } from 'fs'
   */
  static importDeclaration(moduleSpecifier: NamePattern, name?: Pattern | string | string[], isTypeOnly?: boolean) {
    const modPattern = isPattern(moduleSpecifier) ? moduleSpecifier : ast.string(moduleSpecifier)
    const pattern = ast.node(SyntaxKind.ImportDeclaration, {
      importClause: name ? ast.node(SyntaxKind.ImportClause, createImportClauseParams(name)) : undefined,
      moduleSpecifier: modPattern,
    })
    const withTypeOnly = isNotNullish(isTypeOnly)

    return new Pattern({
      params: { moduleSpecifier, name, isTypeOnly },
      kind: SyntaxKind.ImportDeclaration,
      match: (node) => {
        if (Array.isArray(node)) return
        if (!Node.isImportDeclaration(node)) return
        if (withTypeOnly && node.isTypeOnly() !== isTypeOnly) return
        return pattern.matchFn(node)
      },
    })
  }
  static importSpecifier(name: NamePattern, propertyName?: NamePattern, isTypeOnly?: boolean) {
    const namePattern = getNamePattern(name)
    const pattern = ast.node(SyntaxKind.ImportSpecifier, {
      name: namePattern,
      propertyName: propertyName ? getNamePattern(propertyName) : undefined,
      isTypeOnly: isNotNullish(isTypeOnly) ? ast.boolean(isTypeOnly) : undefined,
    })

    return new Pattern({
      params: { name, propertyName, isTypeOnly },
      kind: SyntaxKind.ImportSpecifier,
      match: single(pattern),
    })
  }

  // TODO block + variablestatement + variable declaration + expressionstatement + return
  // TODO if statement + else statement + else if statement
  // TODO arrow function / function declaration + parameter
  // TODO class delcaration + method declaration + new expression
  // TODO type parameter + type reference + literaltype + indexedaccesstype
  // TODO as expression + type assertion + non null assertion + parenthesized expression + satisfies expression + prefix unary expression
  // TODO property assignment + shorthand property assignment + spread assignment

  // TODO resolve identifier declaration, resolve static value, resolve TS type
  // find unresolvable()
}

const syntaxListKinds = [SyntaxKind.TupleType, SyntaxKind.RestType]

const getArguments = (...args: Pattern[]) => {
  if (args.length) {
    if (args.length === 1) {
      const first = args[0] as Pattern
      if (syntaxListKinds.includes(first.kind)) {
        return first
      }
    }

    return ast.tuple(...args)
  }

  return
}

const isPattern = (value: any): value is Pattern => value instanceof Pattern
const single = (pattern: Pattern) => (node: Node | Node[]) => {
  if (Array.isArray(node)) return
  return Boolean(pattern.matchFn(node))
}

type NamePattern = string | Pattern
const getNamePattern = (value: NamePattern): Pattern => (isPattern(value) ? value : ast.identifier(value))

/**
 * Returns the string name of a property access expression
 * It will ignore any expression wrapper and tokens, like: `?` `!` `()` `as`
 * @example `foo.bar` will match `foo.bar`
 * @example `foo.bar.baz` will also match `(foo?.bar as any)!.baz`
 */
const getPropertyAccessExpressionName = (node: Node): string | undefined => {
  const names: string[] = []

  let expression = node
  while (Node.isPropertyAccessExpression(expression)) {
    names.unshift(expression.getName())
    expression = unwrapExpression(expression.getExpression())
  }

  if (!Node.isIdentifier(expression)) {
    return
  }

  names.unshift(expression.getText())

  return names.join('.')
}

const getOperatorPattern = (value: Pattern | keyof typeof binaryOperators | ts.LogicalOperator) => {
  if (isPattern(value)) return value
  if (typeof value === 'string') return ast.kind(binaryOperators[value])
  return ast.kind(value)
}

/**
 * @example ast.importDeclaration("node:path", "path")
 * @example ast.importDeclaration("node:fs", ["writeFile", "readFile"])
 * @example ast.importDeclaration("node:fs", ast.tuple(ast.importSpecifier("writeFile"), ast.importSpecifier("readFile")))
 * @example ast.importDeclaration("node:fs", ast.rest(ast.any()))
 */
function createImportClauseParams(name: Pattern | string | string[]): NodeParams<SyntaxKind.ImportClause> {
  if (Array.isArray(name)) {
    return {
      namedBindings: ast.node(SyntaxKind.NamedImports, {
        elements: ast.tuple(...name.map((n) => ast.importSpecifier(n))),
      }),
    }
  }

  if (isPattern(name)) {
    if (syntaxListKinds.includes(name.kind)) {
      return { namedBindings: ast.node(SyntaxKind.NamedImports, { elements: name }) }
    } else {
      return { name: name }
    }
  }

  return { name: ast.identifier(name) }
}
