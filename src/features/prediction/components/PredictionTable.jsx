import { CheckCircle2 } from 'lucide-react';
import { ErrorBadge } from './ErrorBadge';

export function PredictionTable({ tableScrollRef, loading, paginatedTrucks, filteredTrucks, trucks, currentPage, hasModelFilter = false }) {
  return (
    <div ref={tableScrollRef} className="flex-1 min-h-0 overflow-auto queue-scrollbar">
      <table aria-label="ตารางผลทำนายเวลารถ" className="table-fixed w-full min-w-200 text-left text-md">
        <colgroup>
          <col className="w-12" />
          <col className="w-22" />
          <col className="w-20" />
          <col className="w-20" />
          <col className="w-24" />
          <col className="w-24" />
          <col className="w-24" />
          <col className="w-28" />
          <col className="w-26" />
        </colgroup>
        <thead className="sticky top-0 z-10 bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
          <tr>
            <th scope="col" className="p-3 text-center whitespace-nowrap">ลำดับ</th>
            <th scope="col" className="p-3 text-center whitespace-nowrap">ทะเบียน</th>
            <th scope="col" className="p-3 text-center whitespace-nowrap">ประเภทรถ</th>
            <th scope="col" className="p-3 text-center whitespace-nowrap">ประเภทคิว</th>
            <th scope="col" className="p-3 text-center whitespace-nowrap">เวลาเข้า</th>
            <th scope="col" className="p-3 text-center whitespace-nowrap">คาดว่าเสร็จ</th>
            <th scope="col" className="p-3 text-center whitespace-nowrap">เวลาเสร็จจริง</th>
            <th scope="col" className="p-3 text-center whitespace-nowrap">ความคลาดเคลื่อน</th>
            <th scope="col" className="p-3 text-center whitespace-nowrap">สถานะ</th>
          </tr>
        </thead>
        <tbody key={currentPage} className="text-gray-700">
          {loading ? (
            <tr>
              <td colSpan={9} className="p-8 text-center text-gray-400">
                กำลังโหลดข้อมูล...
              </td>
            </tr>
          ) : paginatedTrucks.length === 0 ? (
            <tr>
              <td colSpan={9} className="p-8 text-center text-gray-400">
                {filteredTrucks.length === 0 && trucks.length > 0
                  ? 'ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา'
                  : hasModelFilter
                    ? 'ไม่มีข้อมูลของโมเดลนี้ในช่วงที่เลือก — ลองขยายช่วงวันที่ (เช่น 7 วัน / 30 วัน)'
                    : 'ยังไม่มีข้อมูลรถวันนี้'}
              </td>
            </tr>
          ) : (
            paginatedTrucks.map((truck, idx) => (
              <tr key={idx} className="border-b border-gray-100 transition-colors hover:bg-gray-50">
                <td className="p-3 text-center font-medium">{truck.sequence}</td>
                <td className="p-3 text-center">{truck.licensePlate}</td>
                <td className="p-3 text-center text-gray-500">{truck.carType ?? '-'}</td>
                <td className="p-3 text-center text-gray-500">{truck.queueType}</td>
                <td className="p-3 text-center">{truck.arrivalTime ?? '-'}</td>
                <td className="p-3 text-center font-semibold text-blue-700">
                  {truck.predictedFinishTime ?? '-'}
                </td>
                <td className="p-3 text-center font-semibold text-green-700">
                  {truck.actualFinishTime ?? '-'}
                </td>
                <td className="p-3 text-center">
                  <ErrorBadge minutes={truck.errorMin} />
                </td>
                <td className="p-3 text-center">
                  {truck.isCompleted ? (
                    <span className="inline-flex items-center gap-1 rounded-xl bg-green-100 px-2 py-2 text-xs font-semibold text-green-800">
                      <CheckCircle2 className="h-3 w-3" /> เสร็จแล้ว
                    </span>
                  ) : (
                    <span className="inline-block rounded-xl bg-blue-100 px-2 py-2 text-xs font-semibold text-blue-800">
                      กำลังดำเนินการ
                    </span>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
