export function ErrorBadge({ minutes }) {
  if (minutes === null || minutes === undefined) return <span className="text-gray-400">-</span>;
  const abs = Math.abs(minutes);
  const isGood = abs <= 15;
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
        isGood ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
      }`}
    >
      {minutes > 0 ? '+' : ''}{minutes} นาที
    </span>
  );
}
