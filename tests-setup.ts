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
    return value.toString()
  },
  test(val) {
    return val instanceof Pattern
  },
})
