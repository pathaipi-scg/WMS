import { getText } from '../common/text';

function formatCountLabel(count, singularLabel, pluralLabel = singularLabel) {
  const normalizedCount = Number(count) || 0;
  const label = normalizedCount === 1 ? singularLabel : pluralLabel;
  return `${normalizedCount} ${label}`;
}

function buildLoadingItems(bay) {
  const activeQueue = bay?.activeQueue;
  const products = bay?.products ?? {};
  const tileTotal =
    Number(products.cpac ?? 0) +
    Number(products.prestige ?? 0) +
    Number(products.neustile ?? 0);

  return [
    {
      label: 'การโหลดกระเบื้อง',
      value: tileTotal > 0 ? String(tileTotal) : '',
      unit: 'แผ่น',
      status: activeQueue?.tileStatus || '-',
    },
    {
      label: 'การโหลด Fitting',
      value: Number(products.fitting ?? 0) > 0 ? String(Number(products.fitting ?? 0)) : '',
      unit: 'ชิ้น',
      status: activeQueue?.fittingStatus || '-',
    },
    {
      label: 'การโหลด Accessories',
      value: Number(products.accessories ?? 0) > 0 ? String(Number(products.accessories ?? 0)) : '',
      unit: 'ชิ้น',
      status: activeQueue?.accStatus || '-',
    },
  ];
}

function buildProductItems(bay) {
  const products = bay?.products ?? {};

  return [
    { label: 'CPAC', value: String(Number(products.cpac ?? 0)), hasValue: Number(products.cpac ?? 0) > 0 },
    {
      label: 'PRESTIGE',
      value: String(Number(products.prestige ?? 0)),
      hasValue: Number(products.prestige ?? 0) > 0,
    },
    {
      label: 'NEUSTILE',
      value: String(Number(products.neustile ?? 0)),
      hasValue: Number(products.neustile ?? 0) > 0,
    },
    {
      label: 'FITTING',
      value: String(Number(products.fitting ?? 0)),
      hasValue: Number(products.fitting ?? 0) > 0,
    },
    {
      label: 'ACC',
      value: String(Number(products.accessories ?? 0)),
      hasValue: Number(products.accessories ?? 0) > 0,
    },
  ];
}

function getForkliftDrivers(bay) {
  const rawNames = getText(bay?.forkliftDriverNames);

  if (!rawNames || rawNames === '-') {
    return [];
  }

  return rawNames
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);
}

export function buildYardDetailsViewModel(bay = {}) {
  const activeQueue = bay.activeQueue ?? null;
  const forkliftDrivers = getForkliftDrivers(bay);
  const forkliftFallbackCount = Math.max(Number(bay?.forkliftCount) || 0, forkliftDrivers.length);
  const nextQueues = Array.isArray(bay.nextQueues) ? bay.nextQueues.filter(Boolean) : [];
  const nextQueueCount = Math.max(Number(bay.nextQueueCount) || 0, nextQueues.length);

  return {
    title: `${getText(bay.yardName)} ${getText(bay.name)}`.trim(),
    assignedTruckLabel: getText(bay.assignedTruckId) || '-',
    customerName: getText(bay.customerName) || getText(activeQueue?.customerName) || '-',
    loadingItems: buildLoadingItems(bay),
    productItems: buildProductItems(bay),
    forkliftDrivers,
    forkliftFallbackCount,
    forkliftCountLabel: formatCountLabel(bay.forkliftCount, 'คัน'),
    nextQueueCountLabel: formatCountLabel(nextQueueCount, 'คิว'),
    nextQueues,
    remainingUnknownQueueCount: Math.max(nextQueueCount - nextQueues.length, 0),
    predictionStartTime: bay.firstPostPallet || bay.progressMetaValue || null,
    waitingTime: Number(bay.waitingTime) || 0,
  };
}
