// Escape single quotes in strings used inside Airtable filterByFormula expressions.
// Prevents formula injection: a value like "O'Brien" becomes "O''Brien" which is valid Airtable syntax.
export const esc = (str) => String(str ?? '').replace(/'/g, "''");
