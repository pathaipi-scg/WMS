export function SlotResourceIcons({ icon: Icon, count, keyPrefix, titles = [] }) {
  const visibleCount = Math.min(count, 4);
  const remainingCount = Math.max(count - visibleCount, 0);
  //  component ใช้แสดงไอคอนรถในช่องจ่าย
  return (
    <>
      {Array.from({ length: visibleCount }, (_, index) => (
        <span key={`${keyPrefix}-${index}`} title={titles[index] ?? undefined}>
          <Icon className="text-[18px]!" />
        </span>
      ))}
      {remainingCount > 0 ? (
        <span
          className="cursor-default shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-gray-700 ring-1 ring-black/5"
          title={titles.slice(visibleCount).join(', ') || undefined}
        >
          + {remainingCount}
        </span>
      ) : null}
    </>
  );
}
