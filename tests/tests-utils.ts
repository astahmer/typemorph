import { SourceFile, ts } from 'ts-morph'
import { Pattern } from '../src/pattern-matching'
import { createProject } from './create-project'

const project = createProject()
export const parse = (code: string) =>
  project.createSourceFile('file.tsx', code, { overwrite: true, scriptKind: ts.ScriptKind.TSX })

export const traverse = <TPattern extends Pattern>(
  sourceFile: SourceFile,
  pattern: TPattern,
  stopOnMatch: boolean = false,
) => {
  let match: Pattern | undefined
  sourceFile.forEachDescendant((node, traversal) => {
    // console.log(node.getKindName())
    if (pattern.match(node)) {
      match = pattern
      stopOnMatch && traversal.stop()
    }
  })

  return match
}
