import { memo } from 'react';

export const ModalIconHeader = memo(function ModalIconHeader({ icon, left, right, align = 'start' }) {
  return (
    <div className={`flex items-${align} justify-between`}>
      <div className={`flex items-${align} gap-4`}>
        <div className="flex h-15 w-15 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
          {icon}
        </div>
        {left}
      </div>
      {right && <div className={`flex items-${align} gap-4`}>{right}</div>}
    </div>
  );
});
