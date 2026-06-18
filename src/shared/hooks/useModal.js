import { useCallback, useEffect, useState } from 'react';

const CLOSE_ANIMATION_DURATION = 220;

// Hook สำหรับจัดการ modal รวม 
export function useModal({ isOpen, onClose }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsVisible(false);
      return undefined;
    }

    const frameId = window.requestAnimationFrame(() => setIsVisible(true));
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.cancelAnimationFrame(frameId);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);


  const handleClose = useCallback(() => {
    setIsVisible(false);
    window.setTimeout(onClose, CLOSE_ANIMATION_DURATION);
  }, [onClose]);

  // Escape key
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  return { isVisible, handleClose };
}
