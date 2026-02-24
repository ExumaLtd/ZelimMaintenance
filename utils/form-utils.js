/**
 * Auto-grow a textarea to fit its content.
 * Pass the change event or the textarea element directly.
 */
export const autoGrow = (e) => {
  const el = e.target || e;
  el.style.height = "78px";
  el.style.height = el.scrollHeight + "px";
};
