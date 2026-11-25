import { useEffect, useRef } from 'react';

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const nodeCount = Math.min(42, Math.max(18, Math.floor((width * height) / 38000)));
    const nodes: Node[] = Array.from({ length: nodeCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.28,
      vy: (Math.random() - 0.5) * 0.28,
      r: Math.random() * 1.6 + 1,
    }));

    const onResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize, { passive: true });

    const draw = () => {
      if (document.hidden) {
        animId = requestAnimationFrame(draw);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        a.x += a.vx;
        a.y += a.vy;

        if (a.x < 0 || a.x > width) a.vx *= -1;
        if (a.y < 0 || a.y > height) a.vy *= -1;

        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 103, 79, 0.22)';
        ctx.fill();

        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < 22500) {
            const alpha = (1 - Math.sqrt(distSq) / 150) * 0.14;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(0, 103, 79, ${alpha.toFixed(3)})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#FFFAEB]" aria-hidden="true">
      {/* Subtle warm editorial paper grid */}
      <div
        className="absolute inset-0 opacity-[0.45]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(27,28,21,0.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(27,28,21,0.045) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
        }}
      />

      {/* Warm dawn & forest valley atmospheric blobs */}
      <div className="animate-aurora-slow absolute -top-36 -left-24 h-[520px] w-[520px] rounded-full bg-[#00674F]/10 blur-[120px]" />
      <div className="animate-aurora-reverse absolute top-1/3 -right-28 h-[480px] w-[480px] rounded-full bg-[#FFEE8C]/35 blur-[130px]" />
      <div className="animate-aurora-slow absolute -bottom-40 left-1/3 h-[440px] w-[440px] rounded-full bg-[#F4EDD9]/85 blur-[130px]" />

      {/* Network constellation canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full opacity-75" />
    </div>
  );
}
