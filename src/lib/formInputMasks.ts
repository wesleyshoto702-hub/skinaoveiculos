/**
 * Brazilian mobile phone: DDD plus 9 digits, 11 digits total.
 * Example: (35) 99999-9999.
 */
export function formatBrazilWhatsApp(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (!digits) return "";
  if (digits.length < 3) return "(" + digits + (digits.length === 2 ? ")" : "");
  const local = digits.slice(2);
  // Add the hyphen when the user starts the last four digits;
  // no trailing hyphen to trap Backspace after the first five.
  return "(" + digits.slice(0, 2) + ") " + local.slice(0, 5) +
    (local.length > 5 ? "-" + local.slice(5) : "");
}

/**
 * Brazilian amount. The currency prefix is separate, not editable.
 * Dots group thousands; one comma permits up to two decimal digits.
 * Removes anything else, including pasted letters or currency symbols.
 */
export function formatBrazilAmount(value: string): string {
  const safe = value.replace(/[^\d.,]/g, "");
  const comma = safe.indexOf(",");
  const integerText = comma >= 0 ? safe.slice(0, comma) : safe;
  const integerDigits = integerText.replace(/\D/g, "").slice(0, 12);
  const grouped = integerDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  if (comma < 0) return grouped;
  const cents = safe.slice(comma + 1).replace(/\D/g, "").slice(0, 2);
  return grouped + "," + cents;
}
