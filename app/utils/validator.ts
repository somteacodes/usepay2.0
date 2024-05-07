 
export const containsOnlyAlphabets = (str: string): boolean => {
  const regex = /^[A-Za-z]+$/
  return regex.test(str)
}

export const containsOnlyNumbers = (str: string): boolean => {
  const regex = /^[0-9]+$/
  return regex.test(str)
}

export const containsOnlyAlphabetsAndNumbers = (str: string): boolean => {
  const regex = /^[A-Za-z0-9]+$/
  return regex.test(str)
}

export const validatePIN = (pin: string): boolean => {
  //check if pin is in range of 6 to 8 digits and contains only numbers
  const regex = /^[0-9]{6,8}$/
  return regex.test(pin)
}

export const validatePINChallengeLength = (pin: string): boolean => {
  // check if pin is 3 digits
  const regex = /^[0-9]{3}$/
  return regex.test(pin)
}


export const containsOnlyAlphabetsAndNumbersAndSpaces = (str: string): boolean => {
  const regex = /^[A-Za-z0-9\s]+$/
  return regex.test(str)
}