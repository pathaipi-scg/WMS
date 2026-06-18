import { useEffect, useRef } from 'react';

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.4);
  } catch {
    // browser may block AudioContext before user interaction
  }
}

export function useNotificationSound(notifications) {
  const prevCountRef = useRef(notifications.length);

  useEffect(() => {
    if (notifications.length > prevCountRef.current) {
      playBeep();
    }
    prevCountRef.current = notifications.length;
  }, [notifications]);
}
