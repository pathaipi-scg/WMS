import { prepareTruckQueues } from '../queue/queueTransforms';
import { getYardStats, mapPostLocationsToZones } from '../yard/yardTransforms';
import { DEFAULT_PLANT_NAME } from '../../constants/app';
import { getText } from '../common/text';

export function createDashboardState(snapshot = {}) {
  const truckQueues = prepareTruckQueues(snapshot.truck_queues ?? []);
  const yardZones = mapPostLocationsToZones(snapshot.yards ?? [], truckQueues);
  const plantName = getText(snapshot.plant_name);

  return {
    summaryData: snapshot.summary ?? {},
    truckQueues,
    yardZones,
    yardStats: getYardStats(yardZones),
    plantCode: getText(snapshot.plant_code),
    plantName: plantName ? `${plantName} Plant` : DEFAULT_PLANT_NAME,
    capturedAt: snapshot.captured_at ?? null,
  };
}
