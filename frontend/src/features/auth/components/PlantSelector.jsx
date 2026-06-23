import { ChevronDown, MapPin, Trash2 } from 'lucide-react';

import { DEFAULT_PLANT_NAME } from '../../../shared/constants/app';
import { useAuth } from '../context/AuthProvider';

// แสดงโรงงานปัจจุบันตรง Header
// - admin (เห็นได้หลายโรงงาน) → เป็น dropdown ให้เลือก + ปุ่มลบ (เฉพาะโรงงานที่เพิ่มเอง)
// - ผู้ดูแลประจำโรงงาน / ผู้ใช้ทั่วไป → เป็นป้ายชื่อโรงงานเฉย ๆ
export function PlantSelector({ plantName }) {
  const { plants, selectedPlantCode, setSelectedPlant, removePlant, isAdmin } = useAuth();

  const canSwitch = plants.length > 1;
  const selected = plants.find((plant) => plant.code === selectedPlantCode);

  async function handleDelete() {
    if (!selected) return;
    if (!window.confirm(`ต้องการลบโรงงาน "${selected.name}" ใช่ไหม?`)) return;
    try {
      await removePlant(selected.code);
    } catch {
      window.alert('ลบโรงงานไม่สำเร็จ กรุณาลองใหม่');
    }
  }

  // ป้ายชื่อโรงงานที่จะแสดงเมื่อเลือกไม่ได้
  const lockedLabel = selected?.name || plants[0]?.name || plantName || DEFAULT_PLANT_NAME;

  if (!canSwitch) {
    return (
      <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-1.5 text-sm">
        <MapPin className="h-4 w-4 text-red-500" />
        <span className="font-medium text-gray-700">{lockedLabel}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <div className="relative flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-1.5 text-sm transition-colors hover:border-red-300">
        <MapPin className="h-4 w-4 text-red-500" />
        <select
          value={selectedPlantCode || ''}
          onChange={(e) => setSelectedPlant(e.target.value)}
          className="cursor-pointer appearance-none bg-transparent pr-5 font-medium text-gray-700 outline-none"
          aria-label="เลือกโรงงาน"
        >
          {plants.map((plant) => (
            <option key={plant.code} value={plant.code}>
              {plant.name}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-gray-400" />
      </div>

      {isAdmin && selected?.removable && (
        <button
          type="button"
          onClick={handleDelete}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-400 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 cursor-pointer"
          title={`ลบโรงงาน ${selected.name}`}
          aria-label={`ลบโรงงาน ${selected.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
