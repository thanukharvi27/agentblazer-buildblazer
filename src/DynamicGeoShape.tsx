import React, { useEffect, useRef } from 'react';

interface DynamicGeoShapeProps {
  position?: 'left' | 'right';
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

interface Point3D {
  x: number;
  y: number;
  z: number;
}

export function DynamicGeoShape({
  position = 'left',
  size = 140,
  className = '',
  style = {},
}: DynamicGeoShapeProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId: number;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.floor(size * dpr);
    canvas.height = Math.floor(size * dpr);
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Theme color cache
    let strokeColor = '#7c3aed';
    let cyanColor = '#22d3ee';
    let glowColor = 'rgba(139, 92, 246, 0.5)';

    const updateColors = () => {
      const computed = getComputedStyle(document.body);
      const geo = computed.getPropertyValue('--geo-stroke').trim();
      const cyan = computed.getPropertyValue('--accent-cyan').trim();
      const glow = computed.getPropertyValue('--accent-glow').trim();

      if (geo) strokeColor = geo;
      if (cyan) cyanColor = cyan;
      if (glow) glowColor = glow;
    };

    updateColors();
    const observer = new MutationObserver(updateColors);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class', 'data-theme'] });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });

    // 1. Geometry Definitions:
    // Outer Cube Vertices (s = 1)
    const cubeVerticesRaw: Point3D[] = [
      { x: -1, y: -1, z: -1 },
      { x: 1, y: -1, z: -1 },
      { x: 1, y: 1, z: -1 },
      { x: -1, y: 1, z: -1 },
      { x: -1, y: -1, z: 1 },
      { x: 1, y: -1, z: 1 },
      { x: 1, y: 1, z: 1 },
      { x: -1, y: 1, z: 1 },
    ];

    // Outer Cube Edges
    const cubeEdges: [number, number][] = [
      // Front & Back rings
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      // Connectors
      [0, 4], [1, 5], [2, 6], [3, 7],
    ];

    // Outer Cross-Facets (Diagonal surface facets creating crystalline complexity)
    const facetEdges: [number, number][] = [
      [0, 2], [1, 3], // Front cross
      [4, 6], [5, 7], // Back cross
      [0, 5], [1, 4], // Top cross
      [3, 6], [2, 7], // Bottom cross
    ];

    // Inner Octahedron / Crystal Vertices (s = 0.6)
    const sInner = 0.58;
    const octaVerticesRaw: Point3D[] = [
      { x: 0, y: -sInner, z: 0 }, // Top
      { x: 0, y: sInner, z: 0 },  // Bottom
      { x: sInner, y: 0, z: 0 },  // Right
      { x: -sInner, y: 0, z: 0 }, // Left
      { x: 0, y: 0, z: sInner },  // Front
      { x: 0, y: 0, z: -sInner }, // Back
    ];

    // Inner Octahedron Edges
    const octaEdges: [number, number][] = [
      // Top to equator
      [0, 2], [0, 3], [0, 4], [0, 5],
      // Bottom to equator
      [1, 2], [1, 3], [1, 4], [1, 5],
      // Equator perimeter
      [2, 4], [4, 3], [3, 5], [5, 2],
    ];

    // Rotation angles
    let rotX = position === 'left' ? 0.3 : 0.6;
    let rotY = position === 'left' ? 0.5 : 0.2;
    let rotZ = 0.2;

    let innerRotX = 0;
    let innerRotY = 0;
    let innerRotZ = 0;

    // 3D rotation projection helper
    const rotateAndProject = (
      v: Point3D,
      rx: number,
      ry: number,
      rz: number,
      scaleMultiplier: number
    ) => {
      // Rotation around X
      const cosX = Math.cos(rx);
      const sinX = Math.sin(rx);
      const y1 = v.y * cosX - v.z * sinX;
      const z1 = v.y * sinX + v.z * cosX;

      // Rotation around Y
      const cosY = Math.cos(ry);
      const sinY = Math.sin(ry);
      const x2 = v.x * cosY + z1 * sinY;
      const z2 = -v.x * sinY + z1 * cosY;

      // Rotation around Z
      const cosZ = Math.cos(rz);
      const sinZ = Math.sin(rz);
      const x3 = x2 * cosZ - y1 * sinZ;
      const y3 = x2 * sinZ + y1 * cosZ;

      // Perspective Projection
      const cameraDist = 3.2;
      const proj = 1 / (cameraDist + z2);
      const fovScale = size * 0.72 * scaleMultiplier;

      return {
        x2d: size / 2 + x3 * proj * fovScale,
        y2d: size / 2 + y3 * proj * fovScale,
        depth: z2,
      };
    };

    const render = () => {
      ctx.clearRect(0, 0, size, size);

      // Continuous rotation
      // Outer cube rotates smoothly
      rotX += 0.006;
      rotY += 0.009;
      rotZ += 0.003;

      // Inner crystal counter-rotates with inverted and varied speeds
      innerRotX -= 0.012;
      innerRotY -= 0.015;
      innerRotZ += 0.008;

      // Project outer vertices
      const projectedCube = cubeVerticesRaw.map((v) =>
        rotateAndProject(v, rotX, rotY, rotZ, 1.0)
      );

      // Project inner vertices
      const projectedOcta = octaVerticesRaw.map((v) =>
        rotateAndProject(v, innerRotX, innerRotY, innerRotZ, 1.0)
      );

      ctx.save();

      // --- 1. Draw Outer Cross-Facets (Faint crystalline depth lines) ---
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 0.65;
      ctx.globalAlpha = 0.22;
      facetEdges.forEach(([i1, i2]) => {
        const p1 = projectedCube[i1];
        const p2 = projectedCube[i2];
        ctx.beginPath();
        ctx.moveTo(p1.x2d, p1.y2d);
        ctx.lineTo(p2.x2d, p2.y2d);
        ctx.stroke();
      });

      // --- 2. Draw Outer Cube Edges (Translucent neon wireframe) ---
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1.4;
      ctx.globalAlpha = 0.65;
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 8;

      cubeEdges.forEach(([i1, i2]) => {
        const p1 = projectedCube[i1];
        const p2 = projectedCube[i2];
        ctx.beginPath();
        ctx.moveTo(p1.x2d, p1.y2d);
        ctx.lineTo(p2.x2d, p2.y2d);
        ctx.stroke();
      });

      // --- 3. Draw Inner Counter-Rotating Crystal Octahedron ---
      // Inner crystal rendered in luminous accent cyan with dynamic neon glow
      ctx.strokeStyle = cyanColor;
      ctx.lineWidth = 1.1;
      ctx.globalAlpha = 0.75;
      ctx.shadowColor = cyanColor;
      ctx.shadowBlur = 10;

      octaEdges.forEach(([i1, i2]) => {
        const p1 = projectedOcta[i1];
        const p2 = projectedOcta[i2];
        ctx.beginPath();
        ctx.moveTo(p1.x2d, p1.y2d);
        ctx.lineTo(p2.x2d, p2.y2d);
        ctx.stroke();
      });

      // --- 4. Draw Inner Vertices (Glowing cyan crystal points) ---
      projectedOcta.forEach((p) => {
        ctx.shadowColor = cyanColor;
        ctx.shadowBlur = 6;
        // Outer halo
        ctx.fillStyle = cyanColor;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(p.x2d, p.y2d, 2.2, 0, Math.PI * 2);
        ctx.fill();
        // Inner white spark
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 1.0;
        ctx.beginPath();
        ctx.arc(p.x2d, p.y2d, 1.0, 0, Math.PI * 2);
        ctx.fill();
      });

      // --- 5. Draw Outer Cube Vertices (Glowing neon dots) ---
      projectedCube.forEach((p) => {
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 8;
        // Outer glow
        ctx.fillStyle = strokeColor;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.arc(p.x2d, p.y2d, 2.8, 0, Math.PI * 2);
        ctx.fill();
        // Inner white hot core
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 1.0;
        ctx.beginPath();
        ctx.arc(p.x2d, p.y2d, 1.3, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();

      animFrameId = requestAnimationFrame(render);
    };

    animFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrameId);
      observer.disconnect();
    };
  }, [position, size]);

  const floatClass = position === 'left' ? 'dynamic-geo-float-left' : 'dynamic-geo-float-right';

  return (
    <div
      className={`dynamic-geo-container ${floatClass} ${className}`}
      style={{
        position: 'absolute',
        pointerEvents: 'none',
        zIndex: 1,
        width: size,
        height: size,
        ...style,
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  );
}
