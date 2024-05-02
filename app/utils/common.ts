function toSentenceCase(str: string): string {
  const lowerCaseStr = str.toLowerCase()
  return lowerCaseStr.charAt(0).toUpperCase() + lowerCaseStr.slice(1)
}
function randomUniqueNumbersInRange(
  wordLength: number,
  count: number = 3,
  excludeFirstCharacter: boolean = true
) {
  const positions: number[] = []
  let attempts = 0
  while (positions.length < count && attempts < 10) {
    const position = Math.floor(Math.random() * (wordLength - (excludeFirstCharacter ? 1 : 0))) // Exclude the first character for security
    //   + (excludeFirstCharacter ? 1 : 0)
    if (!positions.includes(position)) {
      positions.push(position)
    }
    attempts++
  }

  return positions
}
function toCurrencyCase(amount: number): string {
  return amount.toLocaleString('en-GB', { style: 'currency', currency: 'NGN' })
}
export { toCurrencyCase, toSentenceCase, randomUniqueNumbersInRange }
