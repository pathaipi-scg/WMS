// ฟังก์ชันช่วยแปลงค่าเป็น string ที่ตัด whitespace แล้ว
export function getText(value) {
  return String(value ?? '').trim();
}

export function getNormalizedText(value) {
  return getText(value).toLowerCase();
}
