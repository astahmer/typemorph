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

expect.addSnapshotSerializer({
  serialize(value) {
    if (!value) return 'undefined'
    return `Pattern<${value.kindName}> ${
      value.match
        ? JSON.stringify(
            {
              params: value.params,
              matchKind: value.match?.getKindName(),
              match: value.match?.getText(),
            },
            (_key, value) => {
              if (Node.isNode(value)) return value.getKindName()
              if (value instanceof Pattern) return value.kindName
              return value
            },
            2,
          )
        : 'no match'
    }`
  },
  test(val) {
    return val instanceof Pattern
  },
})
