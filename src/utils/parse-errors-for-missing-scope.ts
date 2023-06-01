/* eslint max-depth: ["error", 6] */

export const parseErrorsForMissingScope = (errors: {
  [key: string]: Set<string>;
}): Array<string> => {
  const missingScopes: Array<string> = []
  try {
    for (const key in errors) {
      if (Object.prototype.hasOwnProperty.call(errors, key)) {
        for (const error of errors[key]) {
          const parsedError = JSON.parse(error)
          // This should probably be replaced by a regex
          if (parsedError.error.includes('Unknown scope value at')) {
            const value = parsedError.error.split(' for value ')
            if (value[1] !== undefined && !missingScopes.includes(value[1])) {
              missingScopes.push(value[1])
            }
          }
        }
      }
    }
  } catch (error) {
    console.log(error)
  }

  return missingScopes
}
