import { YARD_KEYWORDS } from '../constants/index.js';
import { getText, getNormalizedText } from '../../../shared/utils/text.js';
import { formatTimeHHMM } from '../../../shared/utils/dateTime.js';

export { getText, getNormalizedText };

function escapeRegExp(value) {
  return String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function isEquipmentYardName(value) {
  return getText(value).includes(YARD_KEYWORDS.equipment);
}

export function normalizeLicensePlateKey(value) {
  return getNormalizedText(value).replace(/\s+/g, '');
}

export function normalizePostLocationKey(value) {
  return getNormalizedText(value)
    .replace(new RegExp(escapeRegExp(YARD_KEYWORDS.legacyYard), 'g'), YARD_KEYWORDS.yard)
    .replace(new RegExp(escapeRegExp(YARD_KEYWORDS.slot), 'g'), YARD_KEYWORDS.shortSlot)
    .replace(/[()]/g, '')
    .replace(/\s+/g, '');
}

export function decodeHtmlEntities(value) {
  const text = getText(value);

  if (!text.includes('&#') || typeof document === 'undefined') {
    return text;
  }

  const textArea = document.createElement('textarea');
  textArea.innerHTML = text;
  return textArea.value;
}

export function formatDashboardTime(value) {
  return formatTimeHHMM(value);
}

export function isDisplayableYard(yard) {
  const yardName = getNormalizedText(yard.main_name);
  return (
    yardName.includes(YARD_KEYWORDS.yard) ||
    yardName.includes(YARD_KEYWORDS.legacyYard) ||
    isEquipmentYardName(yard.main_name)
  );
}

export function formatYardName(yard) {
  const yardName = getText(yard.main_name);

  if (isEquipmentYardName(yard.main_name)) {
    return 'ลานอุปกรณ์';
  }

  if (yard.main_code) {
    return `${YARD_KEYWORDS.yard} ${yard.main_code}`;
  }

  return yardName.replace(YARD_KEYWORDS.legacyYard, YARD_KEYWORDS.yard);
}

export function getYardEntryKey(yard) {
  const yardCode = getText(yard.main_code);
  const yardName = getText(yard.main_name);

  if (yardCode && yardName) {
    return `${yardCode}::${yardName}`;
  }

  return yardCode || yardName;
}

export function formatSlotName(slotName, slotCode) {
  const normalizedName = getText(slotName).replace(YARD_KEYWORDS.slot, YARD_KEYWORDS.shortSlot).trim();

  if (normalizedName) {
    return normalizedName;
  }

  return slotCode ? `${YARD_KEYWORDS.shortSlot} ${slotCode}` : YARD_KEYWORDS.slot;
}
