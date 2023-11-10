import { Node, SyntaxKind, ts, type KindToNodeMappings, createWrappedNode, SourceFile } from 'ts-morph'
import { getSyntaxKindName } from './get-syntax-kind-name'
import { binaryOperators } from './operators'
import { getPropertyAccessExpressionName, isLiteral, isStringLike, unwrapExpression } from './ast-utils'
import { compact, isNotNullish } from './utils'

type AnyParams = Record<string, any>
export interface PatternOptions<TSyntax extends SyntaxKind, Params> {
  kind: TSyntax
  match: (node: Node | Node[]) => boolean | Node | Node[] | undefined
  params?: Params
}

const toString = (node: Node) => ({
  kind: node.getKindName(),
  text: node.getText(),
  line: node.getStartLineNumber(),
  column: node.getStartLinePos(),
})

export class Pattern<
  TSyntax extends SyntaxKind = SyntaxKind,
  TMatch = NodeOfKind<TSyntax>,
  Params extends AnyParams = AnyParams,
> {
  kind: SyntaxKind
  kindName: string | undefined
  params: Params
  refName?: string

  lastMatch?: TMatch | undefined
  matches: Set<TMatch> = new Set()

  private assert: (node: Node | Node[]) => boolean | Node | Node[] | undefined

  constructor({ kind, match: assert, params }: PatternOptions<TSyntax, Params>) {
    this.kind = kind
    this.kindName = getSyntaxKindName(kind)
    this.assert = assert
    this.params = params as Params
  }

  match(node: Node | Node[]) {
    const result = this.assert(node)
    // Boolean(result) &&
    //   console.log(0, 'matchFn', {
    //     node: Array.isArray(node) ? node.length : node.getKindName(),
    //     kind: this.kindName,
    //     result: Boolean(result),
    //   })

    if (result) {
      const match = (Node.isNode(result) ? result : node) as TMatch
      // console.log(222, this.kindName, { result, isNOde: Node.isNode(result) })
      this.lastMatch = match
      this.matches.add(match)
      return match
    }
  }

  /**
   * Tag the pattern with the given name so it can be easily found later, or collected with `collectCaptures`
   */
  ref(name: string) {
    this.refName = name
    return this
  }

  /**
   * Returns every children patterns found in this.params in an object using their refName
   * Each refName is unique, so nested patterns with the same refName will override each other
   *
   * @example
   * ast.node(SyntaxKind.CallExpression, {
   *  expression: ast.ref('fn'),
   *  arguments: ast.tuple(ast.ref('arg1'), ast.ref('arg2'))
   * })
   *
   * //will return
   *
   * ({
   *  fn: expressionPattern,
   *  arg1: arg1Pattern,
   *  arg2: arg2Pattern,
   * })
   */
  collectCaptures() {
    if (!this.params) return {}

    const captures = {} as Record<string, Pattern>
    const stack = [this.params]

    while (stack.length > 0) {
      const obj = stack.pop() as Record<string, any>

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
          stack.push(value)
        }
      }
    }

    return captures
  }

  toString() {
    if (!this.lastMatch) `Pattern<${this.kindName}> no match`

    return `Pattern<${this.kindName}> ${JSON.stringify(
      {
        params: this.params,
        refName: this.refName,
        matches: Array.from(this.matches).map((n) => toString(n as Node)),
      },
      (_key, value) => {
        if (Node.isNode(value)) return value.getKindName()
        if (value instanceof Pattern) return value.kindName
        return value
      },
      2,
    )}`
  }
}

export type NodeOfKind<TKind extends SyntaxKind> = KindToNodeMappings[TKind]
export type CompilerNodeOfKind<TKind extends SyntaxKind> = KindToNodeMappings[TKind]['compilerNode']

export type ExtractNodeKeys<T> = Exclude<keyof T, keyof ts.Node | `_${string}`>
export type NodeParams<TKind extends SyntaxKind> = {
  [K in ExtractNodeKeys<CompilerNodeOfKind<TKind>>]?: Pattern<TKind, any>
}

export type PatternNode<TPattern extends Pattern> = TPattern extends Pattern<infer _, infer TMatch> ? TMatch : never

const booleans = {
  true: (sourceFile: SourceFile) => createWrappedNode(ts.factory.createTrue(), { sourceFile: sourceFile.compilerNode }),
  false: (sourceFile: SourceFile) =>
    createWrappedNode(ts.factory.createFalse(), { sourceFile: sourceFile.compilerNode }),
}

interface ListOptions {
  min?: number
  max?: number
}

export class ast {
  static kind(syntaxKind: SyntaxKind) {
    const matcher = Node.is(syntaxKind)
    return new Pattern({
      kind: syntaxKind,
      match: (node) => (Array.isArray(node) ? undefined : matcher(node)),
    })
  }

  static node<TKind extends SyntaxKind>(type: TKind, props?: NodeParams<TKind>) {
    const _props = (props ? compact(props) : undefined) as NodeParams<TKind> | undefined
    return new Pattern({
      params: { type, props: _props },
      kind: type,
      match: (node: Node | Node[]) => {
        if (Array.isArray(node)) return false
        if (!node.isKind(type)) return false
        if (!_props) return true

        for (const [key, _pattern] of Object.entries(_props)) {
          const pattern = _pattern as Pattern
          if (!pattern) {
            console.warn("Pattern doesn't have a value for key", key)
            continue
          }

          let prop = node.getNodeProperty(key as any)
          // console.log(1, key)

          if (!prop) {
            // special treatment for the `ast.maybeNode` pattern, which can match undefined values
            if (pattern.kind === SyntaxKind.JSDocUnknownType) {
              return true
            }
            // console.warn(`${node.getKindName()} doesn't have a value for key: ${key}\nin: ${node.getText()}`)
            return false
          }
          // console.log(2, key)

          // For booleans such as `exportAssignment.isExportEquals`, the prop will be a boolean
          // So we cast it to an artificial ts.Node and compare it to the pattern like any other node
          // not ideal, not that bad either I guess ? it keeps the pattern matching API consistent
          // e.g `ast.exportAssignment(xxx, ast.boolean(true))` will match `export = true`
          // and I don't need to think twice about if I should use `ast.boolean(true)` or `true`
          if (typeof prop === 'boolean') {
            prop = booleans[prop ? 'true' : 'false'](node.getSourceFile())
          }

          const match = (pattern as Pattern<TKind>).match(prop)
          // console.log(3, key, Boolean(match))
          if (!match) {
            return false
          }
        }

        return true
      },
    })
  }

  /**
   * Matches any list of nodes, optionally matching the list against the given pattern
   */
  static nodeList<TPattern extends Pattern>(pattern?: TPattern, options?: ListOptions) {
    const _opts = { min: 0, ...options }

    return new Pattern({
      params: { pattern },
      kind: SyntaxKind.SyntaxList as any,
      match: (nodeList) => {
        if (!Array.isArray(nodeList)) return
        if (nodeList.length < _opts.min) return
        if (_opts.max && nodeList.length > _opts.max) return
        return pattern ? pattern.match(nodeList) : true
      },
    })
  }

  /**
   * Will match ANYTHING, tag the match with the given name, and return the node
   */
  static ref(name: string) {
    return ast.maybeNode(ast.any()).ref(name)
  }

  /**
   * Returns true for any node list with every element matching the given pattern
   */
  static every<TPattern extends Pattern>(pattern: TPattern, options?: ListOptions) {
    const _opts = { min: 0, ...options }

    return new Pattern({
      params: { pattern },
      kind: SyntaxKind.SyntaxList as any,
      match: (nodeList) => {
        if (!Array.isArray(nodeList)) return
        if (nodeList.length < _opts.min) return
        if (_opts.max && nodeList.length > _opts.max) return
        return nodeList.every((child) => pattern.match(child))
      },
    })
  }

  /**
   * Returns true for any node list with some element matching the given pattern
   */
  static some<TPattern extends Pattern>(pattern: TPattern, options?: ListOptions) {
    const _opts = { min: 0, ...options }

    return new Pattern({
      params: { pattern },
      kind: SyntaxKind.SyntaxList as any,
      match: (nodeList) => {
        if (!Array.isArray(nodeList)) return
        if (nodeList.length < _opts.min) return
        if (_opts.max && nodeList.length > _opts.max) return
        return nodeList.some((child) => pattern.match(child))
      },
    })
  }

  /**
   * Allow matching a lack of AST node (node.prop === undefined) or use the given pattern when the node.prop is defined
   */
  static maybeNode<TPattern extends Pattern>(pattern?: TPattern) {
    return new Pattern({
      params: { pattern },
      kind: SyntaxKind.JSDocUnknownType as any,
      match: (node) => {
        return pattern ? pattern.match(node) : true
      },
    })
  }

  static any() {
    return new Pattern({ kind: SyntaxKind.Unknown, match: () => true })
  }

  static not<TPattern extends Pattern>(pattern: TPattern) {
    return new Pattern({
      params: { pattern },
      kind: SyntaxKind.Unknown,
      match: (node) => {
        return !pattern.match(node)
      },
    })
  }

  static contains<TInside extends Pattern, TUntil extends Pattern>(pattern: TInside, until?: TUntil) {
    const seen = new WeakSet()

    return new Pattern({
      params: { pattern, until },
      kind: SyntaxKind.Unknown,
      match: (node) => {
        if (Array.isArray(node)) return
        return node.forEachDescendant((child, traversal) => {
          if (seen.has(child)) return

          if (until && until.match(child)) {
            traversal.stop()
            return
          }

          const match = pattern.match(child)
          if (match) {
            traversal.stop()
            return node
          }

          seen.add(child)
        })
      },
    })
  }

  static when<TInput = Node | Node[]>(condition: (node: TInput) => boolean | Node | Node[] | undefined) {
    return new Pattern({
      params: { condition },
      kind: SyntaxKind.Unknown as any,
      match: condition as any,
    })
  }

  static refine<TPattern extends Pattern, RNode extends Node>(
    pattern: TPattern,
    transform: (nodeOrList: PatternNode<TPattern>) => RNode | RNode[] | boolean | undefined,
  ) {
    return new Pattern<ReturnType<RNode['getKind']>, RNode>({
      params: { pattern },
      kind: pattern.kind as any,
      match: (node) => {
        if (!pattern.match(node)) return
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
    if (arguments.length === 0) return ast.when((node) => (Array.isArray(node) ? undefined : isLiteral(node)))

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

  // TODO rename to list or fixedList since tuple is a specific type ?
  /**
   * Ensure that the node is a tuple of a fixed length with elements matching the given patterns in the same order
   * Unless the last pattern is a rest pattern, in which case the tuple can have any number of elements as long as the first patterns match
   */
  static tuple<TList extends Pattern[]>(...patterns: TList) {
    const last = patterns[patterns.length - 1]

    // If the last pattern is a rest pattern, remove it from the list and use it as the rest pattern
    // When the nodeList length has reached the number of patterns, use the rest pattern for the remaining nodes
    if (last instanceof Pattern && last.params?.isRest) {
      const restPattern = patterns.pop()?.params?.pattern as Pattern
      return new Pattern({
        params: { patterns, restPattern },
        kind: SyntaxKind.TupleType as any,
        match: (nodeList) => {
          if (!Array.isArray(nodeList)) return
          if (nodeList.length < patterns.length) return
          return nodeList.every((child, index) => {
            const pattern = patterns[index] ?? restPattern
            if (!patterns[index]) {
              return restPattern.match(child)
            }
            return pattern.match(child)
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
          return pattern.match(child)
        })
      },
    })
  }

  /**
   * Can be used as the last element of a tuple pattern to match any number of elements of the same type after the previous fixed length patterns
   */
  static rest<TPattern extends Pattern>(pattern: TPattern) {
    return new Pattern({
      params: { pattern, isRest: true },
      kind: SyntaxKind.RestType,
      match: (nodeList) => {
        if (!Array.isArray(nodeList)) return
        return nodeList.every((child) => pattern.match(child))
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

  /**
   * Returns any node or list that matches any of the given patterns
   */
  static union<TList extends Pattern[]>(...patterns: TList) {
    return new Pattern({
      params: { patterns },
      kind: SyntaxKind.UnionType as any,
      match: (node) => {
        return patterns.some((pattern) => pattern.match(node))
      },
    })
  }

  static intersection<TList extends Pattern[]>(...patterns: TList) {
    return new Pattern({
      params: { patterns },
      kind: SyntaxKind.IntersectionType as any,
      match: (nodeList) => {
        return patterns.every((pattern) => pattern.match(nodeList))
      },
    })
  }

  static object<TProps extends Record<string, Pattern>>(properties?: TProps, isPartial?: boolean) {
    const props = properties
      ? Object.entries(properties).map(([key, value]) => {
          return ast.node(SyntaxKind.PropertyAssignment, {
            name: ast.identifier(key),
            initializer: value,
          })
        })
      : undefined

    const list = props ? (isPartial ? ast.every(ast.union(...props)) : ast.tuple(...props)) : undefined
    const pattern = ast.node(SyntaxKind.ObjectLiteralExpression, props ? { properties: list } : undefined)

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
        return elements.every((child) => pattern.match(child))
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

        return namePattern.match(node)
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
        return pattern.match(unwrapExpression(node))
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
  static importDeclaration(
    moduleSpecifier: NamePattern,
    name?: Pattern | string | Array<string | Pattern>,
    isTypeOnly?: boolean,
  ) {
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
        return pattern.match(node)
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
      params: { name, propertyName, isTypeOnly, pattern },
      kind: SyntaxKind.ImportSpecifier,
      match: single(pattern),
    })
  }

  static exportDeclaration(
    name?: Pattern | Array<string | Pattern>,
    isTypeOnly?: boolean,
    moduleSpecifier?: NamePattern,
  ) {
    const pattern = ast.node(SyntaxKind.ExportDeclaration, {
      exportClause: name ? ast.node(SyntaxKind.NamedExports, createExportClauseParams(name)) : undefined,
      moduleSpecifier: moduleSpecifier
        ? isPattern(moduleSpecifier)
          ? moduleSpecifier
          : ast.string(moduleSpecifier)
        : undefined,
    })
    const withTypeOnly = isNotNullish(isTypeOnly)

    return new Pattern({
      params: { moduleSpecifier, name, isTypeOnly, pattern },
      kind: SyntaxKind.ExportDeclaration,
      match: (node) => {
        if (Array.isArray(node)) return
        if (!Node.isExportDeclaration(node)) return
        if (withTypeOnly && node.isTypeOnly() !== isTypeOnly) return
        return pattern.match(node)
      },
    })
  }

  static exportSpecifier(name: NamePattern, propertyName?: NamePattern, isTypeOnly?: boolean) {
    const namePattern = getNamePattern(name)
    const pattern = ast.node(SyntaxKind.ExportSpecifier, {
      name: namePattern,
      propertyName: propertyName ? getNamePattern(propertyName) : undefined,
      isTypeOnly: isNotNullish(isTypeOnly) ? ast.boolean(isTypeOnly) : undefined,
    })

    return new Pattern({
      params: { name, propertyName, isTypeOnly, pattern },
      kind: SyntaxKind.ExportSpecifier,
      match: single(pattern),
    })
  }

  static exportAssignment(expression: Pattern, isExportEquals?: boolean) {
    const pattern = ast.node(SyntaxKind.ExportAssignment, {
      expression,
      isExportEquals: isNotNullish(isExportEquals) ? ast.boolean(isExportEquals) : undefined,
    })
    return new Pattern({
      params: { expression, isExportEquals, pattern },
      kind: SyntaxKind.ExportAssignment,
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

  // TODO ast.from(node) -> create a pattern from a node
  // TODO factory -> ast.create(pattern) -> create a node from a pattern (using ts/ts-morph factory)
}

const syntaxListKinds = [SyntaxKind.SyntaxList, SyntaxKind.TupleType, SyntaxKind.RestType]

/**
 * Wrap each given patterns as a tuple, unless there is only one pattern and it is a itself a tuple or a rest pattern
 */
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
  return Boolean(pattern.match(node))
}

type NamePattern = string | Pattern
const getNamePattern = (value: NamePattern): Pattern => (isPattern(value) ? value : ast.identifier(value))

// type BoolPattern = boolean | Pattern
// const getBoolPattern = (value: BoolPattern): Pattern => (isPattern(value) ? value : ast.boolean(value))

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
function createImportClauseParams(
  name: Pattern | string | Array<string | Pattern>,
): NodeParams<SyntaxKind.ImportClause> {
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

function createExportClauseParams(name: Pattern | Array<string | Pattern>): NodeParams<SyntaxKind.NamedExports> {
  if (Array.isArray(name)) {
    return {
      elements: ast.tuple(...name.map((n) => ast.exportSpecifier(n))),
    }
  }

  if (syntaxListKinds.includes(name.kind)) {
    return { elements: name }
  } else {
    return { elements: ast.tuple(ast.exportSpecifier(name)) }
  }
}
