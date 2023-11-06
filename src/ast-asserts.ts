import {
  NoSubstitutionTemplateLiteral,
  Node,
  StringLiteral,
  TemplateHead,
  TemplateMiddle,
  TemplateTail,
} from 'ts-morph'
import type * as morph from 'ts-morph'

export const isStringLike = (
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

export const isLiteral = (
  node: Node,
): node is
  | InferPredicate<typeof isStringLike>
  | morph.NumericLiteral
  | morph.TrueLiteral
  | morph.FalseLiteral
  | morph.NullLiteral
  | morph.Expression => {
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
