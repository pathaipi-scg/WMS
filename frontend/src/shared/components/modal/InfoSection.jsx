import { memo } from 'react';

export const InfoSection = memo(function InfoSection({ className = '', children }) {
  return (
    <section className={`rounded-[11px] border border-slate-200 bg-gray-50 p-5 ${className}`}>
      {children}
    </section>
  );
});
