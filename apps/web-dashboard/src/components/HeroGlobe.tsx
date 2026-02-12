import { useEffect, useRef } from 'react';

/* ------------------------------------------------------------------ */
/*  HeroGlobe — Canvas-based animated wireframe globe                  */
/*  Replicates the visual appeal of the old Three.js version using     */
/*  HTML5 Canvas 2D. Zero external dependencies.                       */
/* ------------------------------------------------------------------ */

/** Generate points on a sphere using Fibonacci spiral distribution */
function fibonacciSphere(samples: number): [number, number, number][] {
  const points: [number, number, number][] = [];
  const phi = Math.PI * (Math.sqrt(5) - 1); // golden angle
  for (let i = 0; i < samples; i++) {
    const y = 1 - (i / (samples - 1)) * 2;
    const radius = Math.sqrt(1 - y * y);
    const theta = phi * i;
    points.push([Math.cos(theta) * radius, y, Math.sin(theta) * radius]);
  }
  return points;
}

/** Generate great-circle arcs (longitude and latitude lines) */
function generateGridLines(
  segments: number,
  rings: number,
): { points: [number, number, number][] }[] {
  const lines: { points: [number, number, number][] }[] = [];
  const res = 64;

  // Longitude lines (meridians)
  for (let i = 0; i < segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    const pts: [number, number, number][] = [];
    for (let j = 0; j <= res; j++) {
      const phi = (j / res) * Math.PI;
      pts.push([Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta)]);
    }
    lines.push({ points: pts });
  }

  // Latitude lines (parallels)
  for (let i = 1; i < rings; i++) {
    const phi = (i / rings) * Math.PI;
    const pts: [number, number, number][] = [];
    for (let j = 0; j <= res; j++) {
      const theta = (j / res) * Math.PI * 2;
      pts.push([Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta)]);
    }
    lines.push({ points: pts });
  }

  return lines;
}

/** Rotate a 3D point around the Y axis */
function rotateY(p: [number, number, number], angle: number): [number, number, number] {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [p[0] * cos + p[2] * sin, p[1], -p[0] * sin + p[2] * cos];
}

/** Rotate a 3D point around the X axis */
function rotateX(p: [number, number, number], angle: number): [number, number, number] {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [p[0], p[1] * cos - p[2] * sin, p[1] * sin + p[2] * cos];
}

/** Project 3D point to 2D with perspective */
function project(
  p: [number, number, number],
  cx: number,
  cy: number,
  scale: number,
): { x: number; y: number; z: number } {
  const perspective = 3;
  const factor = perspective / (perspective + p[2]);
  return {
    x: cx + p[0] * scale * factor,
    y: cy - p[1] * scale * factor,
    z: p[2],
  };
}

export function HeroGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Generate geometry once
    const dots = fibonacciSphere(200);
    const gridLines = generateGridLines(12, 8);

    // Arcs — random connections between dot pairs to simulate data flow
    const arcs: { from: number; to: number; progress: number; speed: number }[] = [];
    for (let i = 0; i < 15; i++) {
      arcs.push({
        from: Math.floor(Math.random() * dots.length),
        to: Math.floor(Math.random() * dots.length),
        progress: Math.random(),
        speed: 0.002 + Math.random() * 0.004,
      });
    }

    let rotY = 0;
    const tiltX = -0.3; // slight tilt

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas!.getBoundingClientRect();
      canvas!.width = rect.width * dpr;
      canvas!.height = rect.height * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    window.addEventListener('resize', resize);

    function draw() {
      const w = canvas!.getBoundingClientRect().width;
      const h = canvas!.getBoundingClientRect().height;
      const cx = w / 2;
      const cy = h / 2;
      const scale = Math.min(w, h) * 0.38;

      ctx!.clearRect(0, 0, w, h);

      rotY += 0.003;

      // Update arcs
      for (const arc of arcs) {
        arc.progress += arc.speed;
        if (arc.progress > 1) {
          arc.progress = 0;
          arc.from = Math.floor(Math.random() * dots.length);
          arc.to = Math.floor(Math.random() * dots.length);
        }
      }

      // Draw glow background
      const glow = ctx!.createRadialGradient(cx, cy, 0, cx, cy, scale * 1.2);
      glow.addColorStop(0, 'rgba(200, 82, 40, 0.06)');
      glow.addColorStop(0.5, 'rgba(200, 82, 40, 0.02)');
      glow.addColorStop(1, 'rgba(200, 82, 40, 0)');
      ctx!.fillStyle = glow;
      ctx!.fillRect(0, 0, w, h);

      // Draw grid lines
      for (const line of gridLines) {
        ctx!.beginPath();
        let started = false;
        for (const pt of line.points) {
          const rotated = rotateX(rotateY(pt, rotY), tiltX);
          const p = project(rotated, cx, cy, scale);
          const alpha = Math.max(0, Math.min(0.15, (rotated[2] + 0.5) * 0.2));
          if (!started) {
            ctx!.moveTo(p.x, p.y);
            started = true;
          } else {
            ctx!.lineTo(p.x, p.y);
          }
          ctx!.strokeStyle = `rgba(200, 82, 40, ${alpha})`;
        }
        ctx!.lineWidth = 0.5;
        ctx!.stroke();
      }

      // Draw dots
      for (const dot of dots) {
        const rotated = rotateX(rotateY(dot, rotY), tiltX);
        const p = project(rotated, cx, cy, scale);
        const alpha = Math.max(0, (rotated[2] + 0.5) * 0.6);
        if (alpha <= 0) continue;

        ctx!.beginPath();
        ctx!.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(200, 82, 40, ${alpha})`;
        ctx!.fill();
      }

      // Draw arcs (data flow lines)
      for (const arc of arcs) {
        const fromDot = dots[arc.from];
        const toDot = dots[arc.to];

        // Interpolate along the great circle using slerp approximation
        const steps = 20;
        ctx!.beginPath();
        let arcStarted = false;
        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          // Simple lerp + normalize for sphere surface
          const raw: [number, number, number] = [
            fromDot[0] + (toDot[0] - fromDot[0]) * t,
            fromDot[1] + (toDot[1] - fromDot[1]) * t,
            fromDot[2] + (toDot[2] - fromDot[2]) * t,
          ];
          const len = Math.sqrt(raw[0] ** 2 + raw[1] ** 2 + raw[2] ** 2);
          const normalized: [number, number, number] = [raw[0] / len, raw[1] / len, raw[2] / len];
          // Lift the arc slightly above the surface
          const lift = 1.0 + 0.08 * Math.sin(t * Math.PI);
          const lifted: [number, number, number] = [
            normalized[0] * lift,
            normalized[1] * lift,
            normalized[2] * lift,
          ];

          const rotated = rotateX(rotateY(lifted, rotY), tiltX);
          const p = project(rotated, cx, cy, scale);

          // Fade based on depth and progress proximity
          const depthAlpha = Math.max(0, (rotated[2] + 0.5) * 0.5);
          const progressDist = Math.abs(t - arc.progress);
          const trailAlpha = Math.max(0, 1 - progressDist * 5);
          const alpha = depthAlpha * trailAlpha * 0.6;

          if (alpha <= 0.01) {
            if (arcStarted) {
              ctx!.stroke();
              ctx!.beginPath();
              arcStarted = false;
            }
            continue;
          }

          ctx!.strokeStyle = `rgba(212, 160, 68, ${alpha})`;
          if (!arcStarted) {
            ctx!.moveTo(p.x, p.y);
            arcStarted = true;
          } else {
            ctx!.lineTo(p.x, p.y);
          }
        }
        ctx!.lineWidth = 1.2;
        ctx!.stroke();

        // Draw pulse dot at arc progress point
        const pulseT = arc.progress;
        const pulseRaw: [number, number, number] = [
          fromDot[0] + (toDot[0] - fromDot[0]) * pulseT,
          fromDot[1] + (toDot[1] - fromDot[1]) * pulseT,
          fromDot[2] + (toDot[2] - fromDot[2]) * pulseT,
        ];
        const pulseLen = Math.sqrt(pulseRaw[0] ** 2 + pulseRaw[1] ** 2 + pulseRaw[2] ** 2);
        const pulseNorm: [number, number, number] = [
          pulseRaw[0] / pulseLen,
          pulseRaw[1] / pulseLen,
          pulseRaw[2] / pulseLen,
        ];
        const pulseLift = 1.0 + 0.08 * Math.sin(pulseT * Math.PI);
        const pulsePt: [number, number, number] = [
          pulseNorm[0] * pulseLift,
          pulseNorm[1] * pulseLift,
          pulseNorm[2] * pulseLift,
        ];
        const pulseRotated = rotateX(rotateY(pulsePt, rotY), tiltX);
        const pulseProj = project(pulseRotated, cx, cy, scale);
        const pulseAlpha = Math.max(0, (pulseRotated[2] + 0.5) * 0.8);

        if (pulseAlpha > 0) {
          ctx!.beginPath();
          ctx!.arc(pulseProj.x, pulseProj.y, 2.5, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(212, 160, 68, ${pulseAlpha})`;
          ctx!.fill();

          // Glow around pulse
          const pulseGlow = ctx!.createRadialGradient(
            pulseProj.x,
            pulseProj.y,
            0,
            pulseProj.x,
            pulseProj.y,
            8,
          );
          pulseGlow.addColorStop(0, `rgba(212, 160, 68, ${pulseAlpha * 0.4})`);
          pulseGlow.addColorStop(1, 'rgba(212, 160, 68, 0)');
          ctx!.fillStyle = pulseGlow;
          ctx!.fillRect(pulseProj.x - 8, pulseProj.y - 8, 16, 16);
        }
      }

      // Outer ring glow
      ctx!.beginPath();
      ctx!.arc(cx, cy, scale * 1.02, 0, Math.PI * 2);
      ctx!.strokeStyle = 'rgba(200, 82, 40, 0.08)';
      ctx!.lineWidth = 1;
      ctx!.stroke();

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ maxWidth: '500px', maxHeight: '500px' }}
      />
      {/* Center label */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <div className="text-[10px] font-mono uppercase tracking-widest text-rust/50">
            Global Financial
          </div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-rust/50">
            Simulation
          </div>
        </div>
      </div>
    </div>
  );
}
