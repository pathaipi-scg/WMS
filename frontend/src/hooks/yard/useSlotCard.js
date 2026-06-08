import { getWaitingTimeTextColor } from '../../utils/dashboard/waitingTimeStyles';
import { buildSlotCardModel } from '../../utils/yard/slotCardModel';

export function useSlotCard(bay, onSelect) {
  const slotCardModel = buildSlotCardModel(bay);

  return {
    ...slotCardModel,
    waitingTimeTextClassName: getWaitingTimeTextColor(bay.waitingTime),
    handleSelect: () => onSelect?.(bay),
  };
}
