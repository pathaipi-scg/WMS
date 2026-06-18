import { memo } from 'react';
import { YARD_TYPES } from '../constants';
import { SlotCard } from './SlotCard';

// เเสดงข้อมูลลานจ่าย เเละช่องจ่าย
export const ZoneSection = memo(function ZoneSection({ zone, onSelectBay }) {
  const gridClassName =
    zone.type === YARD_TYPES.equipment ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2';

  return (
    <section className="space-y-3">
      <h3 className="text-base font-bold text-gray-700">{zone.name}</h3>
      <div className={`grid gap-3 ${gridClassName}`}>
        {zone.bays.map((bay) => (
          <SlotCard key={bay.id} bay={bay} onSelect={onSelectBay} />
        ))}
      </div>
    </section>
  );
});
