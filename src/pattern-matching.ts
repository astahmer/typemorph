import {
  Node,
  SyntaxKind,
  ts,
  type KindToNodeMappings,
  NoSubstitutionTemplateLiteral,
  StringLiteral,
  TemplateHead,
  TemplateMiddle,
  TemplateTail,
} from 'ts-morph'

type ExtractNodeKeys<T> = Exclude<keyof T, keyof ts.Node | `_${string}`>

type AnyParams = Record<string, any>
interface PatternOptions<Params> {
  kind: SyntaxKind
  match: (node: Node | Node[]) => boolean | undefined
  params?: Params
}

const isStringLike = (
  node: Node,
): node is StringLiteral | NoSubstitutionTemplateLiteral | TemplateHead | TemplateMiddle | TemplateTail => {
  if (
    Node.isStringLiteral(node) ||
    Node.isNoSubstitutionTemplateLiteral(node) ||
    Node.isTemplateHead(node) ||
    Node.isTemplateMiddle(node) ||
    Node.isTemplateTail(node)
  )
    return true

  return false
}

type InferPredicate<T> = T extends (x: any) => x is infer U ? U : never

const isLiteral = (
  node: Node,
): node is
  | InferPredicate<typeof isStringLike>
  | InferPredicate<(typeof Node)['isNumericLiteral']>
  | InferPredicate<(typeof Node)['isTrueLiteral']>
  | InferPredicate<(typeof Node)['isFalseLiteral']>
  | InferPredicate<(typeof Node)['isNullLiteral']>
  | InferPredicate<(typeof Node)['isUndefinedKeyword']> => {
  if (
    isStringLike(node) ||
    Node.isNumericLiteral(node) ||
    Node.isTrueLiteral(node) ||
    Node.isFalseLiteral(node) ||
    Node.isNullLiteral(node) ||
    Node.isUndefinedKeyword(node)
  )
    return true

  return false
}

type Nullable<T> = T | null | undefined
const isNotNullish = <T>(element: Nullable<T>): element is T => element != null
// const isNullish = <T>(element: Nullable<T>): element is null | undefined => element == null

const binaryOperators = {
  '||': ts.SyntaxKind.BarBarToken,
  '??': ts.SyntaxKind.QuestionQuestionToken,
  '&&': ts.SyntaxKind.AmpersandAmpersandToken,
  '===': ts.SyntaxKind.EqualsEqualsEqualsToken,
  '==': ts.SyntaxKind.EqualsEqualsToken,
  '!==': ts.SyntaxKind.ExclamationEqualsEqualsToken,
  '!=': ts.SyntaxKind.ExclamationEqualsToken,
  '>=': ts.SyntaxKind.GreaterThanEqualsToken,
  '>': ts.SyntaxKind.GreaterThanToken,
  '<=': ts.SyntaxKind.LessThanEqualsToken,
  '<': ts.SyntaxKind.LessThanToken,
  instanceof: ts.SyntaxKind.InstanceOfKeyword,
  in: ts.SyntaxKind.InKeyword,
  '*': ts.SyntaxKind.AsteriskToken,
  '/': ts.SyntaxKind.SlashToken,
  '%': ts.SyntaxKind.PercentToken,
  '**': ts.SyntaxKind.AsteriskAsteriskToken,
  '++': ts.SyntaxKind.PlusPlusToken,
} as const

export class Pattern<Params extends AnyParams = AnyParams> {
  kind: SyntaxKind
  matchFn: (node: Node | Node[]) => Node | Node[] | undefined
  params?: Params
  match?: Node | Node[]

  constructor({ kind, match: assert, params }: PatternOptions<Params>) {
    this.kind = kind
    this.matchFn = (node) => {
      if (assert(node)) {
        this.match = node
        return node
      }
    }
    this.params = params as Params
  }
}

export class ast {
  static kind(syntaxKind: SyntaxKind) {
    return new Pattern({ kind: syntaxKind, match: Node.isNode })
  }

  static node<TKind extends SyntaxKind>(
    type: TKind,
    props?: {
      [K in ExtractNodeKeys<KindToNodeMappings[TKind]['compilerNode']>]?: Pattern
    },
  ) {
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

          const match = (pattern as Pattern).matchFn(prop)
          if (!match) {
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
    return new Pattern({ kind: SyntaxKind.Unknown, match: (node) => (Array.isArray(node) ? false : condition(node)) })
  }

  static named(name: string) {
    return new Pattern({
      kind: SyntaxKind.Unknown,
      match: (node) => {
        return !Array.isArray(node) && Node.hasName(node) && node.getName() === name
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
        if (Array.isArray(node)) return false
        if (isStringLike(node)) return isNotNullish(value) ? node.getLiteralText() === value : true
      },
    })
  }

  static number(value?: number) {
    return new Pattern({
      params: { value },
      kind: SyntaxKind.NumericLiteral,
      match: (node) => {
        if (Array.isArray(node)) return false
        if (Node.isNumericLiteral(node)) return isNotNullish(value) ? node.getLiteralValue() === value : true
      },
    })
  }

  static boolean(value: boolean) {
    return new Pattern({
      params: { value },
      kind: SyntaxKind.TrueKeyword,
      match: (node) => {
        if (Array.isArray(node)) return false
        if (Node.isTrueLiteral(node) || Node.isFalseLiteral(node))
          return isNotNullish(value) ? node.getLiteralValue() === value : true
      },
    })
  }

  static null() {
    return new Pattern({
      kind: SyntaxKind.NullKeyword,
      match: (node) => {
        if (Array.isArray(node)) return false
        if (Node.isNullLiteral(node)) return true
      },
    })
  }

  static undefined() {
    return new Pattern({
      kind: SyntaxKind.UndefinedKeyword,
      match: (node) => {
        if (Array.isArray(node)) return false
        if (Node.isIdentifier(node) && node.getText() === 'undefined') return true
      },
    })
  }

  static list<TList extends Pattern>(...patterns: TList[]) {
    return new Pattern({
      params: { children: patterns },
      kind: SyntaxKind.SyntaxList,
      match: (nodeList) => {
        if (!Array.isArray(nodeList)) return
        if (nodeList.length !== patterns.length) return
        return nodeList.every((child, index) => patterns[index].matchFn(child))
      },
    })
  }

  static object<TProps extends Record<string, Pattern>>(properties?: TProps) {
    return new Pattern({
      params: { properties },
      kind: SyntaxKind.ObjectLiteralExpression,
      match: (node) =>
        Boolean(!Array.isArray(node) && ast.node(SyntaxKind.ObjectLiteralExpression, properties).matchFn(node)),
    })
  }

  static array<TArr extends Pattern>(pattern: TArr) {
    return new Pattern({
      params: { pattern },
      kind: SyntaxKind.ArrayLiteralExpression,
      match: (nodeList) => {
        if (!Array.isArray(nodeList)) return
        return nodeList.every((child) => pattern.matchFn(child))
      },
    })
  }

  static callExpression<TArgs extends Pattern>(name: string, ...args: TArgs[]) {
    return new Pattern({
      params: { arguments: args },
      kind: SyntaxKind.CallExpression,
      match: (node) => {
        if (Array.isArray(node)) return
        return Boolean(
          ast
            .node(SyntaxKind.CallExpression, {
              expression: ast.identifier(name),
              arguments: args && args.length ? ast.list(...args) : undefined,
            })
            .matchFn(node),
        )
      },
    })
  }

  static propertyAccessExpression(name: string) {
    return new Pattern({
      params: { name },
      kind: SyntaxKind.PropertyAccessExpression,
      match: (node) => {
        if (Array.isArray(node)) return
        return Boolean(ast.node(SyntaxKind.PropertyAccessExpression, { name: ast.identifier(name) }).matchFn(node))
      },
    })
  }

  static elementAccessExpression(name: string, arg?: Pattern) {
    return new Pattern({
      params: { name, arg },
      kind: SyntaxKind.ElementAccessExpression,
      match: (node) => {
        if (Array.isArray(node)) return
        return Boolean(
          ast
            .node(SyntaxKind.ElementAccessExpression, { expression: ast.identifier(name), argumentExpression: arg })
            .matchFn(node),
        )
      },
    })
  }

  static templateExpression(head: Pattern, ...patterns: Pattern[]) {
    return new Pattern({
      params: { patterns },
      kind: SyntaxKind.TemplateExpression,
      match: (node) => {
        if (Array.isArray(node)) return
        return Boolean(
          ast.node(SyntaxKind.TemplateExpression, { head, templateSpans: ast.list(...patterns) }).matchFn(node),
        )
      },
    })
  }

  static conditionalExpression(condition: Pattern, whenTrue: Pattern, whenFalse: Pattern) {
    return new Pattern({
      params: { condition, whenTrue, whenFalse },
      kind: SyntaxKind.ConditionalExpression,
      match: (node) => {
        if (Array.isArray(node)) return
        return Boolean(ast.node(SyntaxKind.ConditionalExpression, { condition, whenTrue, whenFalse }).matchFn(node))
      },
    })
  }

  static binaryExpression<
    TLeft extends Pattern,
    TOperator extends keyof typeof binaryOperators | ts.LogicalOperator,
    TRight extends Pattern,
  >(left: TLeft, operator: TOperator, right: TRight) {
    const operatorToken = (
      typeof operator === 'string' ? binaryOperators[operator] : operator
    ) as TOperator extends keyof typeof binaryOperators ? (typeof binaryOperators)[TOperator] : TOperator
    return new Pattern({
      params: { left, operatorToken, right },
      kind: SyntaxKind.BinaryExpression,
      match: (node) => {
        if (Array.isArray(node)) return
        return Boolean(
          ast
            .node(SyntaxKind.BinaryExpression, {
              left,
              operatorToken: ast.kind(operatorToken),
              right,
            })
            .matchFn(node),
        )
      },
    })
  }
}

ast.binaryExpression(ast.identifier('a'), ts.SyntaxKind.AmpersandAmpersandToken, ast.identifier('b'))
ast.binaryExpression(ast.identifier('a'), '&&', ast.identifier('b'))
