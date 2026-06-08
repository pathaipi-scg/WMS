import { getWaitingTimeTextColor } from '../../dashboard/utils/waitingTimeStyles';
import { buildSlotCardModel } from '../utils/slotCardModel';

export function useSlotCard(bay, onSelect) {
  const slotCardModel = buildSlotCardModel(bay);

  return {
    ...slotCardModel,
    waitingTimeTextClassName: getWaitingTimeTextColor(bay.waitingTime),
    handleSelect: () => onSelect?.(bay),
  };
}
