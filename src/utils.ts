type Nullable<T> = T | null | undefined
export const isNotNullish = <T>(element: Nullable<T>): element is T => element != null
export const isNullish = <T>(element: Nullable<T>): element is null | undefined => element == null

const isEmptyObject = (obj: any) => obj !== null && typeof obj === 'object' && Object.keys(obj).length === 0

export const compact = (obj: Record<string, any>) => {
  const result: any = {}
  for (const key in obj) {
    if (obj[key] !== undefined && !isEmptyObject(obj[key])) {
      result[key] = obj[key]
    }
  }
  return result
}
