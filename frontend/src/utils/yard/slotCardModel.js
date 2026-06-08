import { YARD_STATUSES } from '../../constants/yard';

const SLOT_CARD_STYLES = {
  loading: {
    container: 'border-blue-400 bg-white',
    icon: 'text-blue-700',
  },
  available: {
    container: 'border-green-500 bg-green-50/30',
    icon: 'text-green-600',
  },
};

function getForkliftDriverList(driverNames) {
  return String(driverNames ?? '')
    .split(',')
    .map((name) => name.trim())
    .filter((name) => name && name !== '-');
}

function getForkliftDriverTitles(driverNames, count) {
  const driverList = getForkliftDriverList(driverNames);
  const displayCount = Math.max(count, driverList.length);

  return Array.from({ length: displayCount }, (_, index) => {
    const driverName = driverList[index];
    return driverName ? `คนขับ: ${driverName}` : `รถโฟล์คลิฟท์คันที่ ${index + 1}`;
  });
}

export function buildSlotCardModel(bay) {
  const isAvailable = bay.status === YARD_STATUSES.available;
  const style = SLOT_CARD_STYLES[bay.status] ?? SLOT_CARD_STYLES.loading;
  const forkliftDriverCount = getForkliftDriverList(bay.forkliftDriverNames).length;
  const forkliftCount = Math.max(bay.forkliftCount ?? 0, forkliftDriverCount);
  const truckCount = bay.truckCount ?? 0;

  return {
    isAvailable,
    style,
    forkliftCount,
    truckCount,
    hasResourceRows: forkliftCount > 0 || truckCount > 0,
    forkliftDriverTitles: getForkliftDriverTitles(bay.forkliftDriverNames, forkliftCount),
  };
}
