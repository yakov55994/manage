import { useEffect, useRef, useCallback } from "react";

const INACTIVITY_TIMEOUT = 7 * 60 * 60 * 1000; // 7 שעות במילישניות
const CHECK_INTERVAL = 60 * 1000; // בדיקה כל דקה

export default function useInactivityTimeout(onTimeout, enabled = true) {
  const lastActivityRef = useRef(Date.now());
  const intervalRef = useRef(null);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const events = [
      "mousemove",
      "mousedown",
      "keypress",
      "scroll",
      "touchstart",
      "click",
    ];

    events.forEach((event) => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= INACTIVITY_TIMEOUT) {
        clearInterval(intervalRef.current);
        onTimeout();
      }
    }, CHECK_INTERVAL);

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [onTimeout, resetTimer, enabled]);
}
