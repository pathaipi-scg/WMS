import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, LogOut, ShieldCheck } from 'lucide-react';

import { useAuth } from '../context/AuthProvider';

const ROLE_LABELS = {
  admin: 'ผู้ดูแลส่วนกลาง',
  factory: 'ผู้ดูแลโรงงาน',
};

// เมนูผู้ใช้ตรง Header
// - ผู้ใช้ทั่วไป (ไม่ได้ login) → ปุ่ม "เข้าสู่ระบบ"
// - login แล้ว → แสดงชื่อผู้ใช้ + ปุ่มออกจากระบบ
export function UserMenu() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // ยังไม่ได้ login → ปุ่มเข้าสู่ระบบ
  if (!user) {
    return (
      <button
        type="button"
        onClick={() => navigate('/login')}
        className="flex items-center gap-1.5 rounded-full bg-red-500 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-600 cursor-pointer"
      >
        <LogIn className="h-4 w-4" />
        <span className="hidden md:inline">เข้าสู่ระบบ</span>
      </button>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`relative flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm ring-2 transition-colors cursor-pointer ${
          isAdmin
            ? 'bg-gradient-to-br from-red-500 to-rose-700 ring-red-200 hover:from-red-600 hover:to-rose-800'
            : 'bg-gradient-to-br from-slate-500 to-slate-700 ring-slate-200 hover:from-slate-600 hover:to-slate-800'
        }`}
        aria-label="เมนูผู้ใช้"
      >
        {(user.username[0] || '?').toUpperCase()}
        {isAdmin && (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white">
            <ShieldCheck className="h-3.5 w-3.5 text-red-600" />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-gray-100 bg-white py-2 shadow-lg">
          <div className="border-b border-gray-100 px-4 pb-2">
            <p className="text-sm font-semibold text-gray-800">{user.username}</p>
            <p className="text-xs text-gray-400">{ROLE_LABELS[user.role] || user.role}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              logout();
              navigate('/', { replace: true });
            }}
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-red-600 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            ออกจากระบบ
          </button>
        </div>
      )}
    </div>
  );
}
