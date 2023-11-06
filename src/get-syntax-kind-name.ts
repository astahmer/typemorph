import { ts } from 'ts-morph'

// taken from https://github.com/dsherret/ts-morph/blob/a90dc9118166ec484ea486a9d952c08d761dc6bc/packages/common/src/helpers/getSyntaxKindName.ts#L7
// pasted to avoid the dependency on @ts-morph/common

/**
 * Gets the enum name for the specified syntax kind.
 * @param kind - Syntax kind.
 */
export function getSyntaxKindName(kind: ts.SyntaxKind) {
  return getKindCache()[kind]
}

let kindCache: { [kind: number]: string } | undefined = undefined

function getKindCache() {
  if (kindCache != null) return kindCache
  kindCache = {}

  // some SyntaxKinds are repeated, so only use the first one
  for (const name of Object.keys(ts.SyntaxKind).filter((k) => isNaN(parseInt(k, 10)))) {
    const value = (ts.SyntaxKind as any)[name] as number
    if (kindCache[value] == null) kindCache[value] = name
  }
  return kindCache
}
