import { useState } from 'react';
import { Building2, Plus, X } from 'lucide-react';

import { useAuth } from '../context/AuthProvider';

// ปุ่มเพิ่มโรงงาน — แสดงเฉพาะผู้ดูแลส่วนกลาง (admin) เท่านั้น
export function AddPlantButton() {
  const { isAdmin, addPlant, setSelectedPlant } = useAuth();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isAdmin) return null;

  function closeModal() {
    setOpen(false);
    setCode('');
    setName('');
    setError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    setError('');
    setSubmitting(true);
    try {
      await addPlant(code.trim(), name.trim());
      setSelectedPlant(code.trim()); // สลับไปดูโรงงานที่เพิ่งเพิ่มทันที
      closeModal();
    } catch (err) {
      const status = err?.response?.status;
      if (status === 409) setError('มีรหัสโรงงานนี้อยู่แล้ว');
      else if (status === 400) setError('กรุณากรอกรหัสและชื่อโรงงานให้ครบ');
      else if (status === 403) setError('เฉพาะผู้ดูแลส่วนกลางเท่านั้น');
      else setError('เพิ่มโรงงานไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 rounded-full border border-dashed border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:border-red-300 hover:text-red-600 cursor-pointer"
        title="เพิ่มโรงงาน"
      >
        <Plus className="h-4 w-4" />
        <span className="hidden lg:inline">เพิ่มโรงงาน</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
          onMouseDown={closeModal}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-6 shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-red-500" />
                <h2 className="text-base font-semibold text-gray-800">เพิ่มโรงงาน</h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="text-gray-400 transition-colors hover:text-gray-600 cursor-pointer"
                aria-label="ปิด"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">รหัสโรงงาน</span>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  autoFocus
                  placeholder="เช่น COM20060004"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-red-400 focus:bg-white"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">ชื่อโรงงาน</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น SB4"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-red-400 focus:bg-white"
                />
              </label>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting || !code.trim() || !name.trim()}
                  className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                >
                  {submitting ? 'กำลังเพิ่ม…' : 'เพิ่มโรงงาน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
