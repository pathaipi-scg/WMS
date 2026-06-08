export function exportToCSV(trucks) {
  const headers = [
    'ลำดับ', 'ทะเบียน', 'ประเภทรถ', 'ประเภทคิว',
    'เวลาเข้า', 'คาดว่าเสร็จ', 'เวลาเสร็จจริง', 'ความคลาดเคลื่อน (นาที)', 'สถานะ',
  ];
  const rows = trucks.map((t) => [
    t.sequence,
    t.licensePlate,
    t.carType ?? '-',
    t.queueType,
    t.arrivalTime ?? '-',
    t.predictedFinishTime ?? '-',
    t.actualFinishTime ?? '-',
    t.errorMin ?? '-',
    t.isCompleted ? 'เสร็จแล้ว' : 'กำลังดำเนินการ',
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const bom = '﻿';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const dateStr = new Date()
    .toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' })
    .replace(/\//g, '-');
  link.download = `prediction_report_${dateStr}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
