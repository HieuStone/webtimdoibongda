export function formatViDateTime(dateStr: string) {
  if (!dateStr) return 'N/A';
  // dateStr format: 2026-04-18T20:30:00 or 2026-04-18T20:30:00Z
  try {
    const parts = dateStr.split('T');
    const datePart = parts[0]; // 2026-04-18
    const timePart = parts[1].slice(0, 5); // 20:30
    
    const [y, m, d] = datePart.split('-');
    return `${timePart} ${d}/${m}/${y}`;
  } catch (e) {
    return dateStr;
  }
}

export function formatViTime(dateStr: string) {
  if (!dateStr) return 'N/A';
  try {
    const parts = dateStr.split('T');
    return parts[1].slice(0, 5); // 20:30
  } catch (e) {
    return dateStr;
  }
}
