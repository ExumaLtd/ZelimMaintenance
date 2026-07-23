/**
 * Auto-grow a textarea to fit its content.
 * Pass the change event or the textarea element directly.
 */
export const autoGrow = (e: any) => {
  const el = e.target || e;
  el.style.height = "78px";
  el.style.height = el.scrollHeight + "px";
};

/**
 * Today's date as YYYY-MM-DD in the device's local timezone. toISOString is
 * UTC, which is the wrong calendar day for vessels east of UTC in the
 * morning and west of UTC in the evening.
 */
export const localDateString = (d = new Date()) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
