import React, { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  z: number; // Depth 0.2 - 1.0 (controls scale & parallax speed)
  vx: number;
  vy: number;
  baseRadius: number;
  baseAlpha: number;
  twinklePhase: number;
  twinkleSpeed: number;
  isBeacon: boolean;
  beaconColorOffset: number;
}

interface Ember {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  maxLife: number;
  life: number;
  color: string;
}

interface Comet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  speed: number;
  tailLength: number;
  active: boolean;
}

export function StarField() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId: number;
    let width = 0;
    let height = 0;
    let dpr = 1;

    // Theme color cache
    let themeStarColor = 'rgba(255, 255, 255, 0.75)';
    let themeAccentViolet = 'rgba(139, 92, 246, 0.9)';
    let themeAccentCyan = 'rgba(34, 211, 238, 0.9)';
    let themeAccentGlow = 'rgba(139, 92, 246, 0.4)';

    const updateThemeColors = () => {
      const computed = getComputedStyle(document.body);
      const star = computed.getPropertyValue('--star-color').trim();
      const violet = computed.getPropertyValue('--accent-violet').trim() || computed.getPropertyValue('--accent-primary').trim();
      const cyan = computed.getPropertyValue('--accent-cyan').trim();
      const glow = computed.getPropertyValue('--accent-glow').trim();

      if (star) themeStarColor = star;
      if (violet) themeAccentViolet = violet;
      if (cyan) themeAccentCyan = cyan;
      if (glow) themeAccentGlow = glow;
    };

    updateThemeColors();
    const observer = new MutationObserver(updateThemeColors);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class', 'data-theme'] });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });

    // Handle canvas size with device pixel ratio
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    window.addEventListener('resize', resize);
    resize();

    // 1. Generate 125 stars (within 100–140 range)
    const STAR_COUNT = 125;
    const stars: Star[] = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      const isBeacon = Math.random() < 0.08; // ~8% beacon stars
      const z = 0.2 + Math.random() * 0.8; // Depth: 0.2 - 1.0
      // Gentle cosmic drift speed scaled by depth
      const angle = Math.random() * Math.PI * 2;
      const baseSpeed = 0.08 + Math.random() * 0.18;
      const speed = baseSpeed * (0.4 + z * 0.6);

      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        z,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        baseRadius: isBeacon ? 2.0 + Math.random() * 0.8 : 0.6 + z * 1.3,
        baseAlpha: isBeacon ? 0.9 : 0.35 + z * 0.55,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.015 + Math.random() * 0.035,
        isBeacon,
        beaconColorOffset: Math.random(),
      });
    }

    // 2. Comet State & Embers
    let comet: Comet | null = null;
    const embers: Ember[] = [];
    let cometWaitTimeout: number | null = null;

    const spawnComet = () => {
      // Choose random edge: 0 = Top, 1 = Right, 2 = Bottom, 3 = Left
      const edge = Math.floor(Math.random() * 4);
      let startX = 0;
      let startY = 0;
      let targetX = 0;
      let targetY = 0;

      const buffer = 80;

      switch (edge) {
        case 0: // Top -> moves downward
          startX = Math.random() * width;
          startY = -buffer;
          targetX = Math.random() * width;
          targetY = height + buffer;
          break;
        case 1: // Right -> moves leftward
          startX = width + buffer;
          startY = Math.random() * height;
          targetX = -buffer;
          targetY = Math.random() * height;
          break;
        case 2: // Bottom -> moves upward
          startX = Math.random() * width;
          startY = height + buffer;
          targetX = Math.random() * width;
          targetY = -buffer;
          break;
        case 3: // Left -> moves rightward
        default:
          startX = -buffer;
          startY = Math.random() * height;
          targetX = width + buffer;
          targetY = Math.random() * height;
          break;
      }

      const dx = targetX - startX;
      const dy = targetY - startY;
      const dist = Math.hypot(dx, dy) || 1;
      const speed = 3.5; // ~3.5 px/frame cinematic glide
      const angle = Math.atan2(dy, dx);

      comet = {
        x: startX,
        y: startY,
        vx: (dx / dist) * speed,
        vy: (dy / dist) * speed,
        angle,
        speed,
        tailLength: 340 + Math.random() * 80, // 320–420px tail
        active: true,
      };
    };

    // Initial comet spawn after 1.5s
    cometWaitTimeout = window.setTimeout(() => {
      spawnComet();
    }, 1500);

    const onCometExited = () => {
      comet = null;
      // Wait exactly 5 seconds before spawning a new comet
      cometWaitTimeout = window.setTimeout(() => {
        spawnComet();
      }, 5000);
    };

    // 3. Main Animation Loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // --- Draw & Move Stars ---
      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];

        // Move star
        star.x += star.vx;
        star.y += star.vy;

        // Seamless screen wrapping with generous padding
        const wrapPadding = 25;
        if (star.x < -wrapPadding) star.x = width + wrapPadding;
        else if (star.x > width + wrapPadding) star.x = -wrapPadding;
        if (star.y < -wrapPadding) star.y = height + wrapPadding;
        else if (star.y > height + wrapPadding) star.y = -wrapPadding;

        // Twinkle pulsating opacity
        star.twinklePhase += star.twinkleSpeed;
        const twinkleFactor = 0.5 + 0.5 * Math.sin(star.twinklePhase);
        const currentAlpha = star.baseAlpha * (0.4 + 0.6 * twinkleFactor);

        if (star.isBeacon) {
          // Multi-layered radial glowing halo & bright white core
          const haloRadius = 14 + twinkleFactor * 6;
          const haloColor = star.beaconColorOffset > 0.5 ? themeAccentCyan : themeAccentViolet;

          // Layer 1: Outer diffuse halo
          const gradOuter = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, haloRadius);
          gradOuter.addColorStop(0, haloColor);
          gradOuter.addColorStop(0.35, themeAccentGlow);
          gradOuter.addColorStop(1, 'rgba(0, 0, 0, 0)');

          ctx.save();
          ctx.globalAlpha = currentAlpha * 0.7;
          ctx.fillStyle = gradOuter;
          ctx.beginPath();
          ctx.arc(star.x, star.y, haloRadius, 0, Math.PI * 2);
          ctx.fill();

          // Layer 2: Mid bright flare / 4-point diamond glint
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 0.75;
          ctx.globalAlpha = currentAlpha * 0.85;
          const glintLen = 4 + twinkleFactor * 4;
          ctx.beginPath();
          ctx.moveTo(star.x - glintLen, star.y);
          ctx.lineTo(star.x + glintLen, star.y);
          ctx.moveTo(star.x, star.y - glintLen);
          ctx.lineTo(star.x, star.y + glintLen);
          ctx.stroke();

          // Layer 3: Solid white-hot core
          ctx.fillStyle = '#ffffff';
          ctx.globalAlpha = 1.0;
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.baseRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else {
          // Standard star with dynamic theme color
          ctx.save();
          ctx.globalAlpha = currentAlpha;
          ctx.fillStyle = themeStarColor;
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.baseRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // --- Draw & Update Stardust Embers ---
      for (let i = embers.length - 1; i >= 0; i--) {
        const ember = embers[i];
        ember.x += ember.vx;
        ember.y += ember.vy;
        ember.life++;
        const lifeRatio = 1 - ember.life / ember.maxLife;

        if (lifeRatio <= 0) {
          embers.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = ember.alpha * lifeRatio;
        ctx.fillStyle = ember.color;
        ctx.beginPath();
        ctx.arc(ember.x, ember.y, ember.radius * lifeRatio, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // --- Draw & Update Comet ---
      if (comet && comet.active) {
        comet.x += comet.vx;
        comet.y += comet.vy;

        const { x, y, angle, tailLength } = comet;
        const oppAngle = angle + Math.PI;

        // Tail tip position
        const tailTipX = x + Math.cos(oppAngle) * tailLength;
        const tailTipY = y + Math.sin(oppAngle) * tailLength;

        // Emit sparkling stardust embers behind comet head
        if (Math.random() < 0.85) {
          const count = Math.floor(Math.random() * 3) + 1;
          for (let k = 0; k < count; k++) {
            const spreadDist = (Math.random() - 0.5) * 12;
            const perpAngle = angle + Math.PI / 2;
            const emberColor = Math.random() > 0.4 ? '#ffffff' : (Math.random() > 0.5 ? themeAccentCyan : themeAccentViolet);
            embers.push({
              x: x + Math.cos(oppAngle) * (Math.random() * 25) + Math.cos(perpAngle) * spreadDist,
              y: y + Math.sin(oppAngle) * (Math.random() * 25) + Math.sin(perpAngle) * spreadDist,
              vx: Math.cos(oppAngle) * (0.8 + Math.random() * 1.5) + (Math.random() - 0.5) * 0.6,
              vy: Math.sin(oppAngle) * (0.8 + Math.random() * 1.5) + (Math.random() - 0.5) * 0.6,
              radius: 1.0 + Math.random() * 1.8,
              alpha: 0.7 + Math.random() * 0.3,
              maxLife: 35 + Math.floor(Math.random() * 30),
              life: 0,
              color: emberColor,
            });
          }
        }

        ctx.save();

        // 3-TIER GLOWING GRADIENT TAIL:
        // Tier 1: Outer diffuse glow (wide, soft aura)
        const gradTier1 = ctx.createLinearGradient(x, y, tailTipX, tailTipY);
        gradTier1.addColorStop(0, 'rgba(139, 92, 246, 0.45)');
        gradTier1.addColorStop(0.25, 'rgba(34, 211, 238, 0.22)');
        gradTier1.addColorStop(0.7, 'rgba(124, 58, 237, 0.08)');
        gradTier1.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.strokeStyle = gradTier1;
        ctx.lineWidth = 22;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(tailTipX, tailTipY);
        ctx.stroke();

        // Tier 2: Inner luminous spine (mid-thickness, concentrated neon glow)
        const gradTier2 = ctx.createLinearGradient(x, y, tailTipX, tailTipY);
        gradTier2.addColorStop(0, 'rgba(34, 211, 238, 0.85)');
        gradTier2.addColorStop(0.3, 'rgba(168, 85, 247, 0.6)');
        gradTier2.addColorStop(0.7, 'rgba(56, 189, 248, 0.2)');
        gradTier2.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.strokeStyle = gradTier2;
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(tailTipX, tailTipY);
        ctx.stroke();

        // Tier 3: Core hyper-bright laser beam (narrow, pure white/electric core)
        const gradTier3 = ctx.createLinearGradient(x, y, tailTipX, tailTipY);
        gradTier3.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
        gradTier3.addColorStop(0.2, 'rgba(224, 242, 254, 0.9)');
        gradTier3.addColorStop(0.5, 'rgba(56, 189, 248, 0.4)');
        gradTier3.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.strokeStyle = gradTier3;
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(tailTipX, tailTipY);
        ctx.stroke();

        // COMET HEAD:
        // Expanded radial glowing corona (radius ~38px)
        const coronaRadius = 38;
        const gradCorona = ctx.createRadialGradient(x, y, 0, x, y, coronaRadius);
        gradCorona.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        gradCorona.addColorStop(0.18, 'rgba(34, 211, 238, 0.7)');
        gradCorona.addColorStop(0.5, 'rgba(139, 92, 246, 0.35)');
        gradCorona.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradCorona;
        ctx.beginPath();
        ctx.arc(x, y, coronaRadius, 0, Math.PI * 2);
        ctx.fill();

        // Brilliant white-hot core nucleus (radius ~6.5px)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, 6.5, 0, Math.PI * 2);
        ctx.fill();

        // Micro glint across nucleus
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x - 9, y);
        ctx.lineTo(x + 9, y);
        ctx.moveTo(x, y - 9);
        ctx.lineTo(x, y + 9);
        ctx.stroke();

        ctx.restore();

        // Check if comet AND its full tail have completely exited screen boundaries
        const boundMargin = tailLength + 50;
        const isCometOffScreen =
          (comet.vx < 0 && x < -boundMargin && tailTipX < -boundMargin) ||
          (comet.vx > 0 && x > width + boundMargin && tailTipX > width + boundMargin) ||
          (comet.vy < 0 && y < -boundMargin && tailTipY < -boundMargin) ||
          (comet.vy > 0 && y > height + boundMargin && tailTipY > height + boundMargin);

        if (isCometOffScreen) {
          onCometExited();
        }
      }

      animFrameId = requestAnimationFrame(render);
    };

    animFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', resize);
      observer.disconnect();
      if (cometWaitTimeout) clearTimeout(cometWaitTimeout);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="stars-bg-canvas"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        display: 'block',
      }}
    />
  );
}
