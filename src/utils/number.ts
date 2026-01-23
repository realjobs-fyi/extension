/**
 * Format a number to a string with commas
 * @param number - The number to format
 * @returns The formatted number
 */
export function formatNumber(number: number, language: string = 'en-US'): string {
  return number.toLocaleString(language);
}