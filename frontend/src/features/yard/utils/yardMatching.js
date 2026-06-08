import { normalizeQueueType, normalizeStatus } from '../../queue/utils/queueTransforms.js';
import {
  getNormalizedText,
  getText,
  normalizeLicensePlateKey,
  normalizePostLocationKey,
} from './yardNormalize.js';

export function buildTruckQueueLookup(truckQueues = []) {
  return truckQueues.reduce(
    (lookup, queue) => {
      const sequenceKey = getText(queue.sequence);
      const licensePlateKey = normalizeLicensePlateKey(queue.licensePlate);
      const postLocationKey = normalizePostLocationKey(queue.post_location_name);

      if (sequenceKey) {
        const queues = lookup.bySequence.get(sequenceKey) ?? [];
        queues.push(queue);
        lookup.bySequence.set(sequenceKey, queues);
      }

      if (licensePlateKey) {
        const queues = lookup.byLicensePlate.get(licensePlateKey) ?? [];
        queues.push(queue);
        lookup.byLicensePlate.set(licensePlateKey, queues);
      }

      if (postLocationKey) {
        const queues = lookup.byPostLocation.get(postLocationKey) ?? [];
        queues.push(queue);
        lookup.byPostLocation.set(postLocationKey, queues);
      }

      return lookup;
    },
    {
      bySequence: new Map(),
      byLicensePlate: new Map(),
      byPostLocation: new Map(),
    },
  );
}

export function buildQueueSummary(queue) {
  if (!queue) {
    return null;
  }

  return {
    rowKey: queue.rowKey,
    sequence: getText(queue.sequence),
    licensePlate: getText(queue.licensePlate),
    queueType: normalizeQueueType(queue.queueType),
    status: normalizeStatus(queue.status),
    waitingTime: Math.max(0, Number(queue.waitingTime) || 0),
    customerName: getText(queue.customer_name),
    postLocationName: getText(queue.post_location_name),
    cpac: Number(queue.cpac) || 0,
    prestige: Number(queue.prestige) || 0,
    neustile: Number(queue.neustile) || 0,
    fitting: Number(queue.fitting) || 0,
    accessories: Number(queue.accessories) || 0,
    tileStatus: getText(queue.tileStatus),
    fittingStatus: getText(queue.fittingStatus),
    accStatus: getText(queue.accStatus),
  };
}

export function buildQueueSummaries(queues = []) {
  return queues.map((queue) => buildQueueSummary(queue)).filter(Boolean);
}

export function sortQueuesByWaitingTimeDesc(queues = []) {
  return [...queues].sort((firstQueue, secondQueue) => {
    const waitingTimeDiff = Number(secondQueue.waitingTime ?? 0) - Number(firstQueue.waitingTime ?? 0);

    if (waitingTimeDiff !== 0) {
      return waitingTimeDiff;
    }

    return Number(firstQueue.sequence ?? 0) - Number(secondQueue.sequence ?? 0);
  });
}

export function resolveMatchedTruckQueue(channel, candidates = []) {
  if (candidates.length === 0) {
    return null;
  }

  // เฉพาะรถที่ได้รับ assign ลานแล้วเท่านั้น (มี post_location_name)
  const validCandidates = candidates.filter((queue) =>
    Boolean(normalizePostLocationKey(queue.post_location_name)),
  );

  if (validCandidates.length === 0) {
    return null;
  }

  if (validCandidates.length === 1) {
    return validCandidates[0];
  }

  let matchedCandidates = validCandidates;
  const licensePlateKey = normalizeLicensePlateKey(channel.car_no);

  if (licensePlateKey) {
    const matchedByLicensePlate = matchedCandidates.filter(
      (queue) => normalizeLicensePlateKey(queue.licensePlate) === licensePlateKey,
    );

    if (matchedByLicensePlate.length === 1) {
      return matchedByLicensePlate[0];
    }

    if (matchedByLicensePlate.length > 0) {
      matchedCandidates = matchedByLicensePlate;
    }
  }

  const postLocationKey = normalizePostLocationKey(channel.post_location_name);

  if (postLocationKey) {
    const matchedByPostLocation = matchedCandidates.filter(
      (queue) => normalizePostLocationKey(queue.post_location_name) === postLocationKey,
    );

    if (matchedByPostLocation.length === 1) {
      return matchedByPostLocation[0];
    }

    if (matchedByPostLocation.length > 0) {
      matchedCandidates = matchedByPostLocation;
    }
  }

  return matchedCandidates[0] ?? null;
}

export function findMatchedTruckQueue(channel, truckQueueLookup) {
  const sequenceKey = getText(channel.truck_seq_no);

  if (sequenceKey) {
    const matchedBySequence = resolveMatchedTruckQueue(
      channel,
      truckQueueLookup.bySequence.get(sequenceKey) ?? [],
    );

    if (matchedBySequence) {
      return matchedBySequence;
    }
  }

  const licensePlateKey = normalizeLicensePlateKey(channel.car_no);

  if (!licensePlateKey) {
    return null;
  }

  const matchedQueues = truckQueueLookup.byLicensePlate.get(licensePlateKey) ?? [];
  return resolveMatchedTruckQueue(channel, matchedQueues);
}
