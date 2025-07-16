export const cleanString = (userInput) => {
  if (!userInput) return '';
  
  // Only remove characters that are problematic for Airtable formulas
  // Keep spaces, dots, dashes, and other common characters that are safe
  return userInput.replace(/['{}&]/g, '').trim();
}
