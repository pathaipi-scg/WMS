import {
  BANGKOK_TIME_ZONE,
  RELATIVE_TIME_LIMITS,
  THAI_BUDDHIST_LOCALE,
} from '../../constants/dateTime';

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

const thaiShortDateFormatter = new Intl.DateTimeFormat(THAI_BUDDHIST_LOCALE, {
  timeZone: BANGKOK_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

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

// ฟังก์ชันสำหรับแปลงวันที่และเวลาให้เป็นรูปแบบวันที่และเวลาของไทยที่มีปีพุทธศักราช โดยจะแสดงวัน เดือน ปี ชั่วโมง นาที และวินาที
export function formatThaiDateTime(value) {
  const date = toValidDate(value);

  if (!date) {
    return '-';
  }

  const { day, month, year, hour, minute, second } = getDateParts(thaiDateTimeFormatter, date);
  return `${day} ${month} ${year}, ${hour} : ${minute} : ${second} น.`;
}

// ฟังก์ชันสำหรับแปลงวันที่ให้เป็นรูปแบบวันที่ของไทยที่มีปีพุทธศักราช โดยจะแสดงเฉพาะวัน เดือน และปี
export function formatThaiShortDate(value) {
  const date = toValidDate(value);

  if (!date) {
    return '-';
  }

  const { day, month, year } = getDateParts(thaiShortDateFormatter, date);
  return `${day} / ${month} / ${year}`;
}

// ฟังก์ชันสำหรับแปลงเวลาที่ผ่านมาจากวันที่ที่กำหนดให้เป็นรูปแบบข้อความที่อ่านง่าย เช่น "เมื่อสักครู่", "5 นาทีที่ผ่านมา", "2 ชั่วโมงที่ผ่านมา", "3 วันที่ผ่านมา" เป็นต้น
export function formatRelativeTime(value, now = new Date()) {
  const date = toValidDate(value);
  const currentDate = toValidDate(now);

  if (!date || !currentDate) {
    return '-';
  }

  const diffInSeconds = Math.max(0, Math.floor((currentDate.getTime() - date.getTime()) / 1000));

  if (diffInSeconds < RELATIVE_TIME_LIMITS.justNowThresholdSeconds) {
    return 'เมื่อสักครู่';
  }

  if (diffInSeconds < RELATIVE_TIME_LIMITS.secondsPerMinute) {
    return `${diffInSeconds} วินาทีที่ผ่านมา`;
  }

  const diffInMinutes = Math.floor(diffInSeconds / RELATIVE_TIME_LIMITS.secondsPerMinute);

  if (diffInMinutes < RELATIVE_TIME_LIMITS.minutesPerHour) {
    return `${diffInMinutes} นาทีที่ผ่านมา`;
  }

  const diffInHours = Math.floor(diffInMinutes / RELATIVE_TIME_LIMITS.minutesPerHour);

  if (diffInHours < RELATIVE_TIME_LIMITS.hoursPerDay) {
    return `${diffInHours} ชั่วโมงที่ผ่านมา`;
  }

  const diffInDays = Math.floor(diffInHours / RELATIVE_TIME_LIMITS.hoursPerDay);
  return `${diffInDays} วันที่ผ่านมา`;
}
