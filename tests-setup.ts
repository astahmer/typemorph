import { Node } from 'ts-morph'
import { expect } from 'vitest'
import { Pattern } from './src/pattern-matching'

expect.addSnapshotSerializer({
  serialize(value) {
    return value.getKindName()
  },
  test(val) {
    return Node.isNode(val)
  },
})

// expect.addSnapshotSerializer({
//   serialize(value) {
//     if (!value) return
//     console.log(value)
//     return `Pattern<${value.kindName}> ${JSON.stringify(
//       {
//         match: value.match?.getKindName(),
//         // params: Object.entries(value.params ?? {}).map(([key, value]) => [key, value?.getKindName()]),
//         params: value.params,
//         text: value.match?.getText(),
//       },
//       (_key, value) => {
//         if (Node.isNode(value)) return value.getKindName()
//         if (value instanceof Pattern) return value.kindName
//         return value
//       },
//       2,
//     )}`
//   },
//   test(val) {
//     return val instanceof Pattern
//   },
// })
