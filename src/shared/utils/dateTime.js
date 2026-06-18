import {
  BANGKOK_TIME_ZONE,
  THAI_BUDDHIST_LOCALE,
  THAI_LOCALE,
} from '../constants/dateTime';

const thaiDateTimeFormatter = new Intl.DateTimeFormat(THAI_BUDDHIST_LOCALE, {
  timeZone: BANGKOK_TIME_ZONE,
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

export function parseNotificationDate(value) {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const normalizedValue = typeof value === 'string' ? value.trim().replace(' ', 'T') : value;
  const date = new Date(normalizedValue);

  return Number.isNaN(date.getTime()) ? null : date;
}

function toValidDate(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function getDateParts(formatter, value) {
  return formatter.formatToParts(value).reduce((parts, part) => {
    if (part.type !== 'literal') {
      parts[part.type] = part.value;
    }

    return parts;
  }, {});
}

// แปลงค่าเป็นเวลา HH:MM แบบ 24 ชั่วโมง โซนเวลาไทย — คืน null ถ้าค่าไม่ถูกต้อง
export function formatTimeHHMM(value) {
  const date = toValidDate(value);

  if (!date) {
    return null;
  }

  return date.toLocaleTimeString(THAI_LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: BANGKOK_TIME_ZONE,
  });
}

// ฟังก์ชันสำหรับแปลงวันที่และเวลาให้เป็นรูปแบบวันที่และเวลาของไทยที่มีปีพุทธศักราช โดยจะแสดงวัน เดือน ปี ชั่วโมง นาที และวินาที
export function formatThaiDateTime(value) {
  const date = toValidDate(value);

  if (!date) {
    return '-';
  }

  const { day, month, year, hour, minute, second } = getDateParts(thaiDateTimeFormatter, date);
  return `${day} ${month} ${year}, ${hour} : ${minute} : ${second} น.`;
}
