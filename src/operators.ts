import { ts } from 'ts-morph'

export const binaryOperators = {
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
