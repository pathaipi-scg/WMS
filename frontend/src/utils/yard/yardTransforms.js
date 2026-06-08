import { QUEUE_STATUSES } from '../../constants/queue';
import {
  YARD_EMPTY_STATS,
  YARD_STATUSES,
  YARD_STATUS_LABELS,
  YARD_TYPES,
} from '../../constants/yard';
import {
  buildQueueSummaries,
  buildQueueSummary,
  buildTruckQueueLookup,
  findMatchedTruckQueue,
  sortQueuesByWaitingTimeDesc,
} from './yardMatching';
import {
  decodeHtmlEntities,
  formatDashboardTime,
  formatSlotName,
  formatYardName,
  getText,
  getYardEntryKey,
  getNormalizedText,
  isDisplayableYard,
  isEquipmentYardName,
  normalizePostLocationKey,
} from './yardNormalize';

function getChannelProgressValue(channel) {
  const lastPostPallet = formatDashboardTime(channel.last_post_pallet);
  const firstPostPallet = formatDashboardTime(channel.first_post_pallet);
  const postingTime = formatDashboardTime(channel.posting_time);
  const pickingTime = formatDashboardTime(channel.picking_time);
  const queueTime = formatDashboardTime(channel.queue_time);

  if (lastPostPallet) {
    return lastPostPallet;
  }

  if (firstPostPallet) {
    return firstPostPallet;
  }

  if (postingTime) {
    return postingTime;
  }

  if (pickingTime) {
    return pickingTime;
  }

  if (queueTime) {
    return queueTime;
  }

  return null;
}

function getBayStatus(channel) {
  const statusCode = getNormalizedText(channel.channel_status_code);

  if (statusCode === 'empty') {
    return {
      status: YARD_STATUSES.available,
      statusLabel: getText(channel.channel_status) || YARD_STATUS_LABELS.available,
    };
  }

  return {
    status: YARD_STATUSES.loading,
    statusLabel: getText(channel.channel_status) || QUEUE_STATUSES.loading,
  };
}

function mapChannelToBay(channel, yardCode, yardName, channelIndex, truckQueueLookup) {
  const { status, statusLabel } = getBayStatus(channel);
  const slotSortKey = Number(channel.slot_code ?? channelIndex + 1);
  const progressMetaValue = getChannelProgressValue(channel);
  const matchedTruckQueue = findMatchedTruckQueue(channel, truckQueueLookup);
  const postLocationKey = normalizePostLocationKey(channel.post_location_name);
  const assignedQueues = sortQueuesByWaitingTimeDesc(
    truckQueueLookup.byPostLocation.get(postLocationKey) ?? [],
  );
  const primaryQueue = assignedQueues[0] ?? matchedTruckQueue ?? null;
  const matchedQueueSummary = buildQueueSummary(primaryQueue);
  const queuedCandidates = assignedQueues.filter((queue) => queue.rowKey !== matchedQueueSummary?.rowKey);
  const queuedSummaries = buildQueueSummaries(queuedCandidates);
  const waitingTime = matchedQueueSummary?.waitingTime ?? channel.waiting_time;
  const assignedTruckId = matchedQueueSummary?.licensePlate || getText(channel.car_no) || null;
  const customerName = matchedQueueSummary?.customerName || getText(channel.customer_name) || null;
  const fallbackNextQueueCount = Math.max((Number(channel.truck_count) || 0) - 1, 0);

  return {
    id: channel.post_location_code ?? `${yardCode}-${channel.slot_code ?? channelIndex + 1}`,
    yardName,
    name: formatSlotName(channel.slot_name, channel.slot_code),
    slotCode: getText(channel.slot_code),
    slotSortKey: Number.isFinite(slotSortKey) ? slotSortKey : Number.MAX_SAFE_INTEGER,
    status,
    statusLabel,
    postLocationCode: channel.post_location_code,
    postLocationName: channel.post_location_name,
    assignedTruckId,
    customerName,
    truckCount: Number(channel.truck_count) || 0,
    forkliftCount: Number(channel.forklift_count) || 0,
    forkliftDriverNames: decodeHtmlEntities(channel.forklift_driver_names),
    truckSeqNo: channel.truck_seq_no ?? null,
    truckStatus: matchedQueueSummary?.status || getText(channel.truck_status),
    queueType: matchedQueueSummary?.queueType || null,
    queueSequence: matchedQueueSummary?.sequence || getText(channel.truck_seq_no),
    packlistStatus: getText(channel.packlist_status),
    queueTime: formatDashboardTime(channel.queue_time),
    pickingTime: formatDashboardTime(channel.picking_time),
    postingTime: formatDashboardTime(channel.posting_time),
    firstPostPallet: formatDashboardTime(channel.first_post_pallet),
    lastPostPallet: formatDashboardTime(channel.last_post_pallet),
    waitingTime: Math.max(0, Number(waitingTime) || 0),
    progressMetaValue,
    products: {
      cpac: matchedQueueSummary?.cpac ?? 0,
      prestige: matchedQueueSummary?.prestige ?? 0,
      neustile: matchedQueueSummary?.neustile ?? 0,
      fitting: matchedQueueSummary?.fitting ?? 0,
      accessories: matchedQueueSummary?.accessories ?? 0,
    },
    activeQueue: matchedQueueSummary,
    nextQueues: queuedSummaries,
    nextQueueCount: Math.max(queuedSummaries.length, fallbackNextQueueCount),
  };
}

export function mapPostLocationsToZones(yards = [], truckQueues = []) {
  const truckQueueLookup = buildTruckQueueLookup(truckQueues);
  const groupedYards = yards
    .filter(isDisplayableYard)
    .reduce((accumulator, yard) => {
      const yardCode = getText(yard.main_code) || getText(yard.main_name);
      const yardEntryKey = getYardEntryKey(yard);
      const yardSortKey = Number(yard.main_code);
      const isEquipmentYard = isEquipmentYardName(yard.main_name);

      if (!accumulator.has(yardEntryKey)) {
        accumulator.set(yardEntryKey, {
          id: `yard-${yardCode}`,
          name: formatYardName(yard),
          sortKey: Number.isFinite(yardSortKey) ? yardSortKey : Number.MAX_SAFE_INTEGER,
          type: isEquipmentYard ? YARD_TYPES.equipment : YARD_TYPES.yard,
          baysById: new Map(),
        });
      }

      const yardEntry = accumulator.get(yardEntryKey);
      const yardName = formatYardName(yard);

      (yard.channels ?? []).forEach((channel, channelIndex) => {
        const mappedChannel = mapChannelToBay(
          channel,
          yardCode,
          yardName,
          channelIndex,
          truckQueueLookup,
        );
        yardEntry.baysById.set(mappedChannel.id, mappedChannel);
      });

      return accumulator;
    }, new Map());

  return Array.from(groupedYards.values())
    .map((yard) => ({
      id: yard.id,
      name: yard.name,
      sortKey: yard.sortKey,
      type: yard.type,
      bays: Array.from(yard.baysById.values()).sort(
        (firstBay, secondBay) =>
          firstBay.slotSortKey - secondBay.slotSortKey ||
          firstBay.name.localeCompare(secondBay.name, 'th'),
      ),
    }))
    .sort(
      (firstYard, secondYard) =>
        firstYard.sortKey - secondYard.sortKey || firstYard.name.localeCompare(secondYard.name, 'th'),
    );
}

export function getYardStats(yards = []) {
  return yards.reduce(
    (stats, yard) => {
      yard.bays.forEach((bay) => {
        stats.totalBays += 1;

        if (bay.status === YARD_STATUSES.available) {
          stats.availableBays += 1;
          return;
        }

        stats.loadingBays += 1;
      });

      return stats;
    },
    { ...YARD_EMPTY_STATS },
  );
}
