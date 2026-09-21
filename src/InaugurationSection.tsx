import { useEffect, useRef } from 'react';

const GUESTS = [
  {
    initials: 'SR',
    name: 'Mr. Santosh Rebello',
    org: 'Salesforce',
    role: 'Guest of Honor',
    label: 'Keynote Speaker',
    labelColor: '#22d3ee',
    borderColor: 'rgba(139, 92, 246, 0.5)',
  },
  {
    initials: 'SP',
    name: 'Mr. Stephen Pinto',
    org: 'Salesforce & SJEC Alumnus',
    role: 'Technical Mentor',
    label: 'Alumni Guide',
    labelColor: '#22d3ee',
    borderColor: 'rgba(139, 92, 246, 0.5)',
  },
  {
    initials: 'RD',
    name: "Dr. Rio D'Souza",
    org: 'Principal, SJEC',
    role: 'Presidential Address',
    label: 'Patron',
    labelColor: '#d4a84b',
    borderColor: 'rgba(249, 115, 22, 0.5)',
  },
  {
    initials: 'MD',
    name: "Dr. Melwyn D'Souza",
    org: 'HOD, Computer Science & Engg',
    role: 'Program Chair',
    label: 'Department Head',
    labelColor: '#a78bfa',
    borderColor: 'rgba(139, 92, 246, 0.5)',
  },
];

/* Lightweight canvas-based network/particle effect */
function NetworkCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let w = 0, h = 0;

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
    }

    const particles: Particle[] = [];
    const COUNT = 40;
    const MAX_DIST = 140;

    function resize() {
      w = canvas!.clientWidth;
      h = canvas!.clientHeight;
      canvas!.width = w * devicePixelRatio;
      canvas!.height = h * devicePixelRatio;
      ctx!.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    }

    function init() {
      resize();
      for (let i = 0; i < COUNT; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          r: Math.random() * 1.5 + 0.5,
        });
      }
    }

    function draw() {
      ctx!.clearRect(0, 0, w, h);
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fillStyle = 'rgba(139,92,246,0.35)';
        ctx!.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MAX_DIST) {
            ctx!.beginPath();
            ctx!.moveTo(p.x, p.y);
            ctx!.lineTo(q.x, q.y);
            ctx!.strokeStyle = `rgba(139,92,246,${0.12 * (1 - dist / MAX_DIST)})`;
            ctx!.lineWidth = 0.6;
            ctx!.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    }

    init();
    draw();
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}

export default function InaugurationSection() {
  return (
    <section className="inaug-section" style={{ position: 'relative', overflow: 'hidden' }}>
      <NetworkCanvas />
      {/* subtle top-left radial glow */}
      <div
        style={{
          position: 'absolute',
          top: -80,
          left: -80,
          width: 500,
          height: 500,
          background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: 1400,
          margin: '0 auto',
          padding: '56px 64px 48px',
        }}
        className="inaug-inner"
      >
        {/* ── HEADER ROW ── */}
        <div className="inaug-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 40, marginBottom: 32 }}>
          <h2
            style={{
              margin: 0,
              lineHeight: 1.15,
              maxWidth: 540,
            }}
          >
            <span style={{ fontWeight: 900, fontSize: 40, color: 'var(--text-primary)' }}>
              Inauguration &amp;{' '}
            </span>
            <span
              style={{
                fontFamily: "'Playfair Display', serif",
                fontStyle: 'italic',
                fontWeight: 500,
                fontSize: 40,
                color: 'var(--accent-gold)',
              }}
            >
              Mentorship
            </span>
            <br />
            <span
              style={{
                fontFamily: "'Playfair Display', serif",
                fontStyle: 'italic',
                fontWeight: 500,
                fontSize: 40,
                color: 'var(--accent-gold)',
              }}
            >
              Council
            </span>
          </h2>

          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: 14,
              lineHeight: 1.7,
              maxWidth: 400,
              margin: 0,
              textAlign: 'right',
            }}
          >
            Fostering technical curiosity, genuine mentorship, and bridging classroom theory with autonomous AI engineering practices.
          </p>
        </div>

        {/* ── DIVIDER ── */}
        <div
          style={{
            height: 1,
            background: 'linear-gradient(90deg, var(--border-medium), transparent)',
            marginBottom: 36,
          }}
        />

        {/* ── LAUNCH CARD ── */}
        <div
          className="inaug-launch-card"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 20,
            padding: '36px 40px',
            display: 'flex',
            gap: 40,
            alignItems: 'stretch',
            marginBottom: 48,
          }}
        >
          {/* Left content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <span
              className="badge badge-green"
              style={{ marginBottom: 18, display: 'inline-flex' }}
            >
              Official Launch &amp; Keynote
            </span>

            <h3 style={{ margin: '0 0 14px', lineHeight: 1.25 }}>
              <span style={{ fontWeight: 800, fontSize: 26, color: 'var(--text-primary)' }}>
                AgentBlazer Club Launch &amp;{' '}
              </span>
              <span
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontStyle: 'italic',
                  fontWeight: 500,
                  fontSize: 26,
                  color: 'var(--accent-gold)',
                }}
              >
                Agentforce Symposium
              </span>
            </h3>

            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: 13,
                lineHeight: 1.7,
                maxWidth: 520,
                margin: 0,
              }}
            >
              The Department of Computer Science &amp; Engineering founded the AgentBlazer Club to build
              an authentic student collective centered on autonomous intelligence, open agent frameworks,
              and industry partnership.
            </p>
          </div>

          {/* Right date card */}
          <div
            className="inaug-date-card"
            style={{
              flexShrink: 0,
              width: 260,
              background: 'linear-gradient(135deg, var(--bg-secondary), var(--bg-primary))',
              border: '1px solid var(--border-medium)',
              borderRadius: 16,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '28px 24px',
              textAlign: 'center',
              gap: 14,
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--accent-cyan)',
              }}
            >
              INAUGURATED ON
            </span>
            <span
              style={{
                fontFamily: "'Playfair Display', serif",
                fontStyle: 'italic',
                fontSize: 26,
                fontWeight: 500,
                color: 'var(--accent-gold)',
              }}
            >
              August 25, 2025
            </span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              <span className="badge badge-orange">Academic Year 2025–2026</span>
              <span className="badge badge-cyan">SJEC Campus</span>
            </div>
          </div>
        </div>

        {/* ── HONORED GUESTS HEADING ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div
            style={{
              width: 4,
              height: 28,
              background: 'var(--accent-gold)',
              borderRadius: 2,
            }}
          />
          <h3 style={{ margin: 0 }}>
            <span style={{ fontWeight: 800, fontSize: 22, color: 'var(--text-primary)' }}>
              Honored Guests{' '}
            </span>
            <span
              style={{
                fontFamily: "'Playfair Display', serif",
                fontStyle: 'italic',
                fontWeight: 500,
                fontSize: 22,
                color: 'var(--accent-gold)',
              }}
            >
              &amp; College Leadership
            </span>
          </h3>

          {/* decorative geo shape */}
          <svg
            style={{ marginLeft: 'auto', opacity: 0.15, width: 60, color: 'var(--geo-stroke)' }}
            viewBox="0 0 100 100"
            fill="none"
          >
            <polyline
              points="50,5 95,30 95,70 50,95 5,70 5,30 50,5"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            />
            <line x1="50" y1="5" x2="5" y2="70" stroke="currentColor" strokeWidth="0.8" />
          </svg>
        </div>

        {/* ── GUEST CARDS GRID ── */}
        <div
          className="inaug-guests-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 16,
          }}
        >
          {GUESTS.map((g) => (
            <div
              key={g.name}
              style={{
                background: 'var(--bg-card)',
                border: `1px solid ${g.borderColor}`,
                borderRadius: 14,
                padding: '20px 18px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 0,
                transition: 'border-color 0.3s, background 0.3s',
              }}
            >
              {/* top row: initials + name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    border: `2px solid ${g.borderColor}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 14,
                    color: g.labelColor,
                    flexShrink: 0,
                    background: 'var(--bg-secondary)',
                  }}
                >
                  {g.initials}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 15,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {g.name}
                  </div>
                  <div
                    style={{
                      color: 'var(--text-muted)',
                      fontSize: 11,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {g.org}
                  </div>
                </div>
              </div>

              {/* subtle divider */}
              <div
                style={{
                  height: 1,
                  background: 'var(--border-subtle)',
                  margin: '12px 0 10px',
                }}
              />

              {/* bottom row: role + label */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 500 }}>
                  {g.role}
                </span>
                <span
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontStyle: 'italic',
                    fontSize: 12,
                    color: g.labelColor,
                  }}
                >
                  {g.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── RESPONSIVE STYLES ── */}
      <style>{`
        .inaug-section {
          padding: 0;
        }
        @media (max-width: 1024px) {
          .inaug-inner {
            padding: 40px 32px 36px !important;
          }
          .inaug-header-row {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 16px !important;
          }
          .inaug-header-row p {
            text-align: left !important;
          }
          .inaug-launch-card {
            flex-direction: column !important;
          }
          .inaug-date-card {
            width: 100% !important;
          }
          .inaug-guests-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 640px) {
          .inaug-inner {
            padding: 28px 16px 24px !important;
          }
          .inaug-guests-grid {
            grid-template-columns: 1fr !important;
          }
          .inaug-header-row h2 span {
            font-size: 28px !important;
          }
        }
      `}</style>
    </section>
  );
}
