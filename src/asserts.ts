type Nullable<T> = T | null | undefined
export const isNotNullish = <T>(element: Nullable<T>): element is T => element != null
export const isNullish = <T>(element: Nullable<T>): element is null | undefined => element == null
