import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildTruckQueueLookup,
  findMatchedTruckQueue,
  resolveMatchedTruckQueue,
} from '../src/utils/yard/yardMatching.js';
import {
  normalizeLicensePlateKey,
  normalizePostLocationKey,
} from '../src/utils/yard/yardNormalize.js';

function createQueue(overrides = {}) {
  return {
    rowKey: 'queue-1',
    sequence: 1,
    licensePlate: '71-6625',
    queueType: 'smartq',
    status: 'รอคิว',
    waitingTime: 20,
    customer_name: 'Customer A',
    post_location_name: 'ลานจ่าย 1 ช่อง 1',
    cpac: 0,
    prestige: 0,
    neustile: 0,
    fitting: 0,
    accessories: 0,
    tileStatus: '',
    fittingStatus: '',
    accStatus: '',
    ...overrides,
  };
}

function createChannel(overrides = {}) {
  return {
    truck_seq_no: 1,
    car_no: '71-6625',
    post_location_name: 'ลานจ่าย 1 ช่อง 1',
    ...overrides,
  };
}

test('buildTruckQueueLookup indexes queues with normalized sequence, license plate, and post location keys', () => {
  const queue = createQueue({
    sequence: '15',
    licensePlate: '71 - 6625',
    post_location_name: 'ลายจ่าย 1 ช่องจ่าย 1 (CPAC)',
  });

  const lookup = buildTruckQueueLookup([queue]);

  assert.deepEqual(lookup.bySequence.get('15'), [queue]);
  assert.deepEqual(lookup.byLicensePlate.get(normalizeLicensePlateKey('71-6625')), [queue]);
  assert.deepEqual(
    lookup.byPostLocation.get(normalizePostLocationKey('ลานจ่าย 1 ช่อง 1 CPAC')),
    [queue],
  );
});

test('resolveMatchedTruckQueue prefers the loading queue when multiple candidates still match', () => {
  const waitingQueue = createQueue({
    rowKey: 'waiting',
    status: 'รอคิว',
    licensePlate: '71-6625',
    post_location_name: 'ลานจ่าย 1 ช่อง 1',
  });
  const loadingQueue = createQueue({
    rowKey: 'loading',
    status: 'Loading',
    licensePlate: '71-6625',
    post_location_name: 'ลานจ่าย 1 ช่อง 1',
  });

  const matchedQueue = resolveMatchedTruckQueue(createChannel(), [waitingQueue, loadingQueue]);

  assert.equal(matchedQueue, loadingQueue);
});

test('findMatchedTruckQueue prefers a sequence match before falling back to license plate matching', () => {
  const firstQueue = createQueue({
    rowKey: 'first',
    sequence: '101',
    licensePlate: '71-6625',
    status: 'รอคิว',
  });
  const secondQueue = createQueue({
    rowKey: 'second',
    sequence: '102',
    licensePlate: '71-6625',
    status: 'Loading',
  });
  const lookup = buildTruckQueueLookup([firstQueue, secondQueue]);

  const matchedQueue = findMatchedTruckQueue(
    createChannel({
      truck_seq_no: '101',
      car_no: '71-6625',
    }),
    lookup,
  );

  assert.equal(matchedQueue, firstQueue);
});
