import { useModal } from '../hooks/useModal';

// BottomSheet component สำหรับแสดง modal แบบ slide-up จากด้านล่าง
export function BottomSheet({ isOpen, onClose, children, className = '' }) {
  const { isVisible, handleClose } = useModal({ isOpen, onClose });

  if (!isOpen) {
    return null;
  }

  const renderedChildren =
    typeof children === 'function' ? children({ handleClose }) : children;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end bg-slate-950/40 transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'
        }`}
      onClick={handleClose}
    >
      <div
        className={`w-full rounded-t-[15px] bg-white shadow-2xl transition-transform duration-300 ${isVisible ? 'translate-y-0' : 'translate-y-full'
          }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className={`queue-scrollbar max-h-[70vh] overflow-y-auto p-4 sm:p-6 ${className}`.trim()}
        >
          {renderedChildren}
        </div>
      </div>
    </div>
  );
}
