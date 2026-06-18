import { prepareTruckQueues } from '../../queue/utils/queueTransforms';
import { getYardStats, mapPostLocationsToZones } from '../../yard/utils/yardTransforms';
import { DEFAULT_PLANT_NAME } from '../../../shared/constants/app';
import { getText } from '../../../shared/utils/text';

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
  };
}
