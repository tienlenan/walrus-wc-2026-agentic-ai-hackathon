import { useEffect, useRef, useState, type ReactNode } from "react";

export function DeferredSection({ children, fallback, minDelayMs = 1400 }: { children: ReactNode; fallback: ReactNode; minDelayMs?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [delayDone, setDelayDone] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDelayDone(true), minDelayMs);
    return () => window.clearTimeout(timer);
  }, [minDelayMs]);

  useEffect(() => {
    if (visible) return;
    const node = ref.current;
    if (!node || !("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  return <div ref={ref}>{visible && delayDone ? children : fallback}</div>;
}
