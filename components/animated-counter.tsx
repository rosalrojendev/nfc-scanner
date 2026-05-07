"use client";

import * as React from "react";

export function AnimatedCounter({
  target,
  duration = 900,
}: {
  target: number;
  duration?: number;
}) {
  const [value, setValue] = React.useState(0);
  React.useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return <strong className="text-[1.6rem] font-semibold">{value}</strong>;
}
