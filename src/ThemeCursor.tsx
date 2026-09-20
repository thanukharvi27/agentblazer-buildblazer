import { useEffect, useRef } from 'react';

type Theme = 'violet' | 'inferno' | 'frost';

interface ThemeCursorProps {
  theme: Theme;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  decay: number;
  color: string;
}

const THEME_PALETTES: Record<Theme, { primary: string; glow: string; sparks: string[] }> = {
  violet: {
    primary: '#A855F7',
    glow: 'rgba(139, 92, 246, 0.7)',
    sparks: ['#A855F7', '#8B5CF6', '#6366F1', '#C4B5FD'],
  },
  inferno: {
    primary: '#FF6A00',
    glow: 'rgba(249, 115, 22, 0.7)',
    sparks: ['#FF6A00', '#F97316', '#EA3D18', '#FFC247'],
  },
  frost: {
    primary: '#0EA5E9',
    glow: 'rgba(56, 189, 248, 0.75)',
    sparks: ['#0EA5E9', '#38BDF8', '#2563EB', '#7DD3FC'],
  },
};

export default function ThemeCursor({ theme }: ThemeCursorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const themeRef = useRef<Theme>(theme);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  useEffect(() => {
    // Skip cursor canvas on touch-only devices
    if (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Mouse coordinates
    let mouseX = -100;
    let mouseY = -100;
    let currentX = -100;
    let currentY = -100;
    let prevMouseX = -100;
    let prevMouseY = -100;
    let isVisible = false;
    let isHovered = false;

    const particles: Particle[] = [];

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!isVisible) {
        currentX = mouseX;
        currentY = mouseY;
        prevMouseX = mouseX;
        prevMouseY = mouseY;
        isVisible = true;
      }

      // Calculate distance moved for trail emission
      const dist = Math.hypot(mouseX - prevMouseX, mouseY - prevMouseY);
      if (dist > 3) {
        const currentPalette = THEME_PALETTES[themeRef.current];
        const numParticles = dist > 20 ? 2 : 1;
        for (let i = 0; i < numParticles; i++) {
          particles.push({
            x: mouseX + (Math.random() - 0.5) * 4,
            y: mouseY + (Math.random() - 0.5) * 4,
            vx: (Math.random() - 0.5) * 1.2,
            vy: (Math.random() - 0.5) * 1.2,
            size: Math.random() * 2.2 + 1,
            alpha: 0.9,
            decay: Math.random() * 0.045 + 0.035,
            color: currentPalette.sparks[Math.floor(Math.random() * currentPalette.sparks.length)],
          });
        }
        prevMouseX = mouseX;
        prevMouseY = mouseY;
      }
    };

    const handleMouseLeave = () => {
      isVisible = false;
    };

    const handleMouseEnter = () => {
      isVisible = true;
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const isInteractive = Boolean(
        target.closest('button, a, input, select, textarea, [role="button"], .card, .theme-btn')
      );
      isHovered = isInteractive;
    };

    const handleClick = (e: MouseEvent) => {
      const currentPalette = THEME_PALETTES[themeRef.current];
      const count = 12;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
        const speed = Math.random() * 2.8 + 1.5;
        particles.push({
          x: e.clientX,
          y: e.clientY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: Math.random() * 2.5 + 1.2,
          alpha: 1,
          decay: Math.random() * 0.04 + 0.04,
          color: currentPalette.sparks[Math.floor(Math.random() * currentPalette.sparks.length)],
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseover', handleMouseOver, { passive: true });
    window.addEventListener('mousedown', handleClick, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    let currentRadius = 4.5;
    let targetRadius = 4.5;

    // Animation loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const currentPalette = THEME_PALETTES[themeRef.current];

      // Update & render trail particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        p.size *= 0.96;

        if (p.alpha <= 0 || p.size <= 0.3) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Smooth lag for main orb
      if (isVisible) {
        currentX += (mouseX - currentX) * 0.28;
        currentY += (mouseY - currentY) * 0.28;

        targetRadius = isHovered ? 7.5 : 4.5;
        currentRadius += (targetRadius - currentRadius) * 0.2;

        const glowRadius = isHovered ? 24 : 14;

        // Soft outer blur glow
        ctx.save();
        const gradient = ctx.createRadialGradient(
          currentX,
          currentY,
          0,
          currentX,
          currentY,
          glowRadius
        );
        gradient.addColorStop(0, currentPalette.glow);
        gradient.addColorStop(0.5, currentPalette.glow);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(currentX, currentY, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Small bright center orb
        ctx.fillStyle = currentPalette.primary;
        ctx.shadowColor = currentPalette.primary;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(currentX, currentY, currentRadius, 0, Math.PI * 2);
        ctx.fill();

        // Tiny white hot-core in the center
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(currentX, currentY, currentRadius * 0.45, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseover', handleMouseOver);
      window.removeEventListener('mousedown', handleClick);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 99998,
        display: 'block',
      }}
    />
  );
}
