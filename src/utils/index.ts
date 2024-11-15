
/* eslint-disable no-useless-escape */
export const isEn = (srcText: string) => {
  return /^[a-zA-Z\d\s\/\-\._]+$/.test(srcText)
}
