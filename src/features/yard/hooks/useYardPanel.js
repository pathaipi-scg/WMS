import { useMemo, useState } from 'react';
import { YARD_FILTERS, YARD_STATUSES } from '../constants';

// ฟังก์ชันช่วยกรองโซนและช่องจ่ายตามสถานะที่เลือก 
function filterZonesByStatus(zones, statusFilter) {
  return zones
    .map((zone) => ({
      ...zone,
      bays: zone.bays.filter((bay) => {
        if (statusFilter === YARD_FILTERS.available) {
          return bay.status === YARD_STATUSES.available;
        }

        if (statusFilter === YARD_FILTERS.loading) {
          return bay.status !== YARD_STATUSES.available;
        }

        return true;
      }),
    }))
    .filter((zone) => zone.bays.length > 0);
}

export function useYardPanel(zones = []) {
  const [statusFilter, setStatusFilter] = useState(YARD_FILTERS.all);
  const [selectedBay, setSelectedBay] = useState(null);

  const filteredZones = useMemo(
    () => filterZonesByStatus(zones, statusFilter),
    [statusFilter, zones],
  );

  // ฟังก์ชันเลือกช่องจ่าย เพื่อเปิด modal 
  const handleSelectBay = (bay) => setSelectedBay(bay);

  // ฟังก์ชันปิด modal 
  const handleCloseModal = () => setSelectedBay(null);

  return {
    statusFilter,
    setStatusFilter,
    filteredZones,
    selectedBay,
    handleSelectBay,
    handleCloseModal,
  };
}
