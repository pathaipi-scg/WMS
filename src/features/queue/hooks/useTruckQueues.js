import { useMemo, useState } from 'react';
import {
  ALL_QUEUE_STATUSES,
  ALL_QUEUE_TYPES,
} from '../constants';
import { filterTruckQueues } from '../utils/queueTransforms';
// Hook สำหรับจัดการสถานะของคิวรถ โดยมีฟังก์ชันกรองคิวตามคำค้นหา ประเภทคิว และสถานะคิว

export function useTruckQueues(queues = []) {
  const [searchTerm, setSearchTerm] = useState('');
  const [queueTypeFilter, setQueueTypeFilter] = useState(ALL_QUEUE_TYPES);
  const [statusFilter, setStatusFilter] = useState(ALL_QUEUE_STATUSES);

  const filteredQueues = useMemo(
    () =>
      filterTruckQueues({
        queues,
        searchTerm,
        queueTypeFilter,
        statusFilter,
      }),
    [queues, searchTerm, queueTypeFilter, statusFilter],
  );

  return {
    filteredQueues,
    searchTerm,
    setSearchTerm,
    queueTypeFilter,
    setQueueTypeFilter,
    statusFilter,
    setStatusFilter,
  };
}
