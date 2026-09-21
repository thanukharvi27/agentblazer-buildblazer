import { useState, useEffect, useRef } from 'react';
import logoImg from './assets/AgentBlazer_Logo.png';
import IntroScreen from './IntroScreen';
import ThemeCursor from './ThemeCursor';
import InaugurationSection from './InaugurationSection';

import rubenImg from './assets/Images/Ruben Saldana.WEBP';
import ajayImg from './assets/Images/Ajay Preenal Dsouza .jpg';
import stevinImg from './assets/Images/Stevin D Souza.jpg';
import frennyImg from './assets/Images/Frenny Chrystal Saldanha.jpg';
import joylineImg from './assets/Images/joyline V.jpg';
import chinthanImg from './assets/Images/Chinthan N V.jpg';
import keithImg from './assets/Images/mr-keith-raymond-fernandes.jpg';

type Page = 'home' | 'about' | 'events' | 'join';
type Theme = 'violet' | 'inferno' | 'frost';

const THEMES: { id: Theme; label: string; icon: string }[] = [
  { id: 'violet', label: 'Violet', icon: '⚡' },
  { id: 'inferno', label: 'Inferno', icon: '🔥' },
  { id: 'frost', label: 'Frost', icon: '❄️' },
];

const NAV_LINKS: { id: Page; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About Us' },
  { id: 'events', label: 'Events & Workshops' },
  { id: 'join', label: 'Join & Connect' },
];

const EVENTS = [
  {
    date: 'February 14, 2026',
    badge: 'FLAGSHIP MASTERCLASS',
    badgeClass: 'badge-violet',
    title: 'Master the Future: A Hands-on GSoC & LLMs Workshop',
    description: 'Practical masterclass on open-source Git PR workflows, Retrieval-Augmented Generation (RAG), Gemini AI, LangChain, LlamaIndex, CrewAI, and live Gradio prototyping.',
    meta: '80 Shortlisted Students',
    tracks: null,
  },
  {
    date: 'March 25, 2026',
    badge: 'LIVE CONTEST',
    badgeClass: 'badge-orange',
    title: 'PROMPT OPS-2K26 Challenge',
    description: 'Fast-paced prompt engineering hackathon featuring automated test suites, iterative refinement, teamwork, and live algorithmic problem solving.',
    meta: '10 Contest Photos',
    tracks: ['Track 1: 1st Year Engineers', 'Track 2: 2nd Year Engineers'],
  },
  {
    date: 'August 25, 2025',
    badge: 'SYMPOSIUM KEYNOTE',
    badgeClass: 'badge-cyan',
    title: 'Agentforce Technical Deep-Dive',
    description: 'Guiding undergraduate engineers from prompt prediction to autonomous agentic architectures, Salesforce Data Cloud integration, and real-time enterprise workflows.',
    meta: 'CSE Auditorium',
    tracks: null,
  },
  {
    date: 'March 18, 2026',
    badge: 'STUDENT LAB',
    badgeClass: 'badge-green',
    title: 'Demystifying Generative Models',
    description: 'Exploring Transformer mechanics, multi-agent consensus networks, and comparative latency benchmarks.',
    meta: null,
    tracks: null,
    leads: 'Session Leads: Prajwal Royston Cordiero & Chacko P Abraham',
  },
  {
    date: 'April 01, 2026',
    badge: 'SECURITY WORKSHOP',
    badgeClass: 'badge-red',
    title: 'Cyber Security & Career Pathways',
    description: 'Interactive demonstrations covering Shodan discovery, OSINT methods, CVE vulnerability analysis, SQL injection scenarios, and the Cyber Kill Chain.',
    meta: null,
    tracks: null,
  },
  {
    date: 'May 22, 2026',
    badge: 'DEVELOPER LAB',
    badgeClass: 'badge-blue',
    title: 'Hands-on Agentforce & AI Agents',
    description: 'Applied development lab creating Flex Prompts, dynamic contextual Sales Email templates, and agentic AI pipelines.',
    meta: null,
    tracks: null,
    platform: 'Platform: Salesforce Developer Sandbox',
  },
];

const FACULTY = [
  { initials: 'NR', name: 'Ms. Nisha Roche', role: 'Assistant Professor, CSE • Faculty Coordinator' },
  {
    initials: 'KF',
    name: 'Mr. Keith Fernandes',
    role: 'Assistant Professor, CSE • Faculty Coordinator',
    title: 'Faculty Coordinator',
    titleClass: 'badge-violet',
    description: 'Guiding student researchers in computer science and engineering at SJEC.',
    image: keithImg,
  },
];

const TEAM = [
  {
    role: 'Executive President',
    name: 'Ruben Saldanha',
    title: 'President',
    titleClass: 'badge-green',
    description: 'Guiding club vision, university collaborations, and strategic workshop series.',
    highlighted: false,
    image: rubenImg,
  },
  {
    role: 'Executive Vice President',
    name: 'Ajay Preenal Dsouza',
    title: 'Vice President',
    titleClass: 'badge-gold',
    description: 'Coordinating student mentorship, event operations, and community growth.',
    highlighted: true,
    image: ajayImg,
  },
  {
    role: 'Technical Direction',
    name: 'Stevin Dsouza',
    title: 'Tech Lead',
    titleClass: 'badge-cyan',
    description: 'Technical architectures, hands-on lab environments, and repository supervision.',
    highlighted: false,
    image: stevinImg,
  },
  {
    role: 'Operations & Logistics',
    name: 'Frenny Chrystal Saldanha',
    title: 'Resource Head',
    titleClass: 'badge-gold',
    description: 'Managing cloud compute budgets, venue infrastructure, and participant toolkits.',
    highlighted: false,
    image: frennyImg,
  },
  {
    role: 'Administration',
    name: 'Joyline Galbao',
    title: 'Secretary',
    titleClass: 'badge-gold',
    description: 'Documentation, accreditation reporting, meeting minutes, and member onboarding.',
    highlighted: false,
    image: joylineImg,
  },
  {
    role: 'Creative Outreach',
    name: 'Chinthan N V',
    title: 'Media Head',
    titleClass: 'badge-violet',
    description: 'Brand storytelling, photo documentation, visual design, and social publications.',
    highlighted: false,
    image: chinthanImg,
  },
];

function StarField() {
  const stars = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 0.5,
    dur: (Math.random() * 4 + 2).toFixed(1),
    delay: (Math.random() * 4).toFixed(1),
  }));
  return (
    <div className="stars-bg">
      {stars.map(s => (
        <div
          key={s.id}
          className="star"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            '--dur': `${s.dur}s`,
            '--delay': `${s.delay}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

function GeoShapeLeft() {
  return (
    <svg className="geo-shape" style={{ left: 20, top: '20%', width: 120, color: 'var(--geo-stroke)' }} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polyline points="60,5 115,35 115,85 60,115 5,85 5,35 60,5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <line x1="60" y1="5" x2="5" y2="85" stroke="currentColor" strokeWidth="0.8"/>
      <line x1="5" y1="35" x2="115" y2="85" stroke="currentColor" strokeWidth="0.8"/>
      <line x1="115" y1="35" x2="60" y2="115" stroke="currentColor" strokeWidth="0.8"/>
    </svg>
  );
}

function GeoShapeRight() {
  return (
    <svg className="geo-shape" style={{ right: 20, bottom: '10%', width: 100, color: 'var(--geo-stroke)' }} viewBox="0 0 100 100" fill="none">
      <polyline points="50,5 95,30 95,70 50,95 5,70 5,30 50,5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <line x1="50" y1="5" x2="5" y2="70" stroke="currentColor" strokeWidth="0.8"/>
      <line x1="95" y1="30" x2="50" y2="95" stroke="currentColor" strokeWidth="0.8"/>
    </svg>
  );
}

function Navbar({ page, setPage, theme, setTheme }: {
  page: Page; setPage: (p: Page) => void;
  theme: Theme; setTheme: (t: Theme) => void;
}) {
  return (
    <nav style={{ background: 'var(--nav-bg)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--border-subtle)' }}
      className="sticky top-0 z-50 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => setPage('home')}>
        <div style={{ background: 'var(--ambient-1)', border: '1px solid var(--border-medium)' }}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-sm">⬡</div>
        <div>
          <div className="flex items-baseline gap-1">
            <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Agent</span>
            <span style={{ color: 'var(--accent-violet)' }} className="font-bold text-sm">Blazer</span>
            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 10 }} className="font-light">collective</span>
          </div>
          <div style={{ color: 'var(--accent-cyan)', fontSize: 9, fontWeight: 500 }}>Department of Computer Science &amp; Engineering</div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {NAV_LINKS.map(link => (
          <button
            key={link.id}
            onClick={() => setPage(link.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors rounded-lg ${page === link.id ? 'nav-active' : ''}`}
            style={{ color: page === link.id ? 'var(--text-primary)' : 'var(--text-secondary)' }}
          >
            {page === link.id && <span style={{ color: 'var(--accent-cyan)' }} className="mr-1.5">•</span>}
            {link.label}
          </button>
        ))}
        {page === 'join' && (
          <button className="btn-primary ml-2 px-4 py-2 text-sm rounded-lg">Join &amp; Connect</button>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        {THEMES.map(t => (
          <button
            key={t.id}
            className={`theme-btn theme-btn-${t.id} ${theme === t.id ? 'active' : ''}`}
            onClick={() => setTheme(t.id)}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

function HomePage({ setPage }: { setPage: (p: Page) => void }) {
  return (
    <div className="relative min-h-screen flex flex-col">
      <GeoShapeLeft />
      <GeoShapeRight />
      <div className="relative z-10 flex-1 flex items-center px-16 py-20" style={{ maxWidth: 1400, margin: '0 auto', width: '100%' }}>
        <div className="flex-1 max-w-2xl">
          <div className="pill-badge mb-8 inline-flex" style={{ borderColor: 'rgba(34,211,238,0.3)', color: '#22d3ee' }}>
            Collegiate AI Initiative • St Joseph Engineering College
          </div>
          <h1 className="text-5xl font-black leading-tight mb-2" style={{ color: 'var(--text-primary)' }}>
            Pioneering Autonomous
          </h1>
          <h1 className="text-5xl font-black leading-tight mb-6">
            <span className="accent-italic">&amp; Agentic AI Systems</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 14, marginBottom: 16 }}>
            Department of Computer Science &amp; Engineering · St Joseph Engineering College, Mangaluru
          </p>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 32, maxWidth: 520 }}>
            A dedicated student-led laboratory shaping tomorrow's software engineers through autonomous
            agent architectures, open-source AI tooling, collaborative workshops, and premier Salesforce
            Trailblazer community synergy.
          </p>
          <div className="flex items-center gap-4 mb-12">
            <button className="btn-primary px-6 py-3 rounded-xl text-sm flex items-center gap-2" onClick={() => setPage('events')}>
              Explore Workshops &amp; Events <span>→</span>
            </button>
            <button className="btn-outline px-6 py-3 rounded-xl text-sm flex items-center gap-2">
              Read Club Charter <span>📄</span>
            </button>
          </div>

          <div className="card flex divide-x" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="px-8 py-5 flex-1">
              <div className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>8+</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>Workshops &amp; Challenges</div>
            </div>
            <div className="px-8 py-5 flex-1" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>500+</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>Engineering Students Reached</div>
            </div>
            <div className="px-8 py-5 flex-1" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Salesforce</div>
              <div className="mt-1">
                <span className="badge badge-cyan" style={{ fontSize: 9 }}>Community Partner</span>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>Active Trailblazer Mentorship</div>
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 ml-20 flex flex-col items-center">
          <img
            src={logoImg}
            alt="AgentBlazer Logo"
            style={{
              width: 280,
              height: 280,
              objectFit: 'contain',
            }}
          />
          <div className="mt-4 text-center">
            <div className="font-black text-2xl" style={{ background: 'linear-gradient(90deg, var(--accent-cyan), var(--accent-violet))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              AgentBlazer
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase' }}>CLUB</div>
          </div>
        </div>
      </div>

      <Footer setPage={setPage} />
    </div>
  );
}

function EventsPage() {
  return (
    <div className="relative min-h-screen">
      <GeoShapeLeft />
      <div className="relative z-10 px-16 py-16" style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div className="text-center mb-12">
          <div className="pill-badge inline-flex mb-6" style={{ letterSpacing: '0.08em', fontSize: 10, color: 'var(--text-muted)' }}>
            WORKSHOPS &amp; LIVE SESSIONS • ACADEMIC YEAR 2025–2026
          </div>
          <h1 className="text-5xl font-black mb-4">
            Workshops, Contests <span className="accent-italic">&amp; Masterclasses</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 640, margin: '0 auto', lineHeight: 1.7 }}>
            Hands-on technical deep dives, algorithmic challenges, and real-world system deployments with seasoned engineers.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-5">
          {EVENTS.map((ev, i) => (
            <EventCard key={i} event={ev} />
          ))}
        </div>
      </div>
    </div>
  );
}

function EventCard({ event }: { event: typeof EVENTS[0] }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="card p-6 flex flex-col gap-3 cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ borderColor: hovered ? 'rgba(124,95,245,0.3)' : undefined }}
    >
      <div className="flex items-center justify-between">
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{event.date}</span>
        <span className={`badge ${event.badgeClass}`}>{event.badge}</span>
      </div>
      <h3 className="font-bold text-lg leading-snug" style={{ color: 'var(--text-primary)' }}>{event.title}</h3>
      {event.tracks && (
        <div className="flex gap-2 flex-wrap">
          {event.tracks.map(t => (
            <span key={t} className="badge badge-violet">{t}</span>
          ))}
        </div>
      )}
      {'leads' in event && event.leads && (
        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{event.leads}</div>
      )}
      {'platform' in event && event.platform && (
        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{event.platform}</div>
      )}
      <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6, flex: 1 }}>{event.description}</p>
      <div className="flex items-center justify-between mt-2 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
          {hovered ? 'View details →' : 'Hover to inspect gallery'}
        </span>
        {event.meta && <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{event.meta}</span>}
      </div>
    </div>
  );
}

const CORE_WORKING_COMMITTEE = [
  {
    initials: 'PR',
    initialsColor: '#22d3ee',
    name: 'Prajwal Royston Cordiero',
    role: 'AI & LLM Research Group',
  },
  {
    initials: 'CA',
    initialsColor: '#c084fc',
    name: 'Chacko P Abraham',
    role: 'Model Evaluation Benchmarks',
  },
  {
    initials: 'AR',
    initialsColor: '#f59e0b',
    name: 'Alma Roxane Pereira',
    role: 'Project Operations & Labs',
  },
];

function FloatingPortrait({
  member,
  position,
  isOpen,
  onMouseEnter,
  onMouseLeave,
  onClose,
}: {
  member: {
    name: string;
    role: string;
    title?: string;
    titleClass?: string;
    description?: string;
    image: string;
  } | null;
  position: { left: number; top: number };
  isOpen: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClose: () => void;
}) {
  if (!member) return null;

  return (
    <>
      {/* Tap-outside backdrop for mobile/tablet */}
      <div
        className="fixed inset-0 z-40 md:hidden"
        style={{
          background: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(4px)',
          opacity: isOpen ? 1 : 0,
          transition: 'opacity 0.3s ease',
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
        onClick={onClose}
      />

      {/* Floating Portrait Card */}
      <div
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={{
          position: 'fixed',
          left: `${position.left}px`,
          top: `${position.top}px`,
          width: '340px',
          maxWidth: 'calc(100vw - 32px)',
          height: '470px',
          maxHeight: 'calc(100vh - 32px)',
          zIndex: 9999,
          borderRadius: '20px',
          overflow: 'hidden',
          background: 'rgba(10, 8, 24, 0.94)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1.5px solid rgba(34, 211, 238, 0.65)',
          boxShadow:
            '0 25px 60px -10px rgba(0, 0, 0, 0.85), 0 0 35px rgba(34, 211, 238, 0.4), 0 0 70px rgba(124, 58, 237, 0.3), inset 0 0 20px rgba(34, 211, 238, 0.12)',
          opacity: isOpen ? 1 : 0,
          transform: isOpen
            ? 'scale(1) translateY(0px)'
            : 'scale(0.92) translateY(12px)',
          transition:
            'opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          pointerEvents: isOpen ? 'auto' : 'none',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        {/* Full bleed image */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden' }}>
          <img
            src={member.image}
            alt={member.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: member.name === 'Frenny Chrystal Saldanha' ? 'center 30%' : 'center 15%',
              transform: isOpen ? 'scale(1)' : 'scale(1.05)',
              transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />

          {/* Vignette & Gradient Overlays */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(180deg, rgba(7, 5, 18, 0.82) 0%, rgba(7, 5, 18, 0.12) 32%, rgba(7, 5, 18, 0.25) 50%, rgba(7, 5, 18, 0.95) 85%, rgba(5, 4, 14, 0.99) 100%)',
            }}
          />
        </div>

        {/* Top Header Row */}
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            className="pill-badge"
            style={{
              borderColor: 'rgba(34, 211, 238, 0.45)',
              color: '#22d3ee',
              background: 'rgba(5, 4, 14, 0.75)',
              backdropFilter: 'blur(10px)',
              fontSize: '10px',
              padding: '4px 12px',
              fontWeight: 700,
              letterSpacing: '0.05em',
              boxShadow: '0 0 12px rgba(34, 211, 238, 0.2)',
            }}
          >
            ⬡ AgentBlazer Club
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="Close portrait"
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'rgba(10, 8, 22, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '13px',
              lineHeight: 1,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.8)';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(10, 8, 22, 0.75)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
            }}
          >
            ✕
          </button>
        </div>

        {/* Bottom Details Content */}
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            padding: '20px 22px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              color: 'var(--accent-cyan)',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '4px',
            }}
          >
            {member.role}
          </div>

          <h3
            style={{
              fontSize: '22px',
              fontWeight: 800,
              lineHeight: 1.2,
              marginBottom: '8px',
              background: 'linear-gradient(135deg, #ffffff 40%, #38bdf8 75%, #c084fc 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 10px rgba(34, 211, 238, 0.5))',
            }}
          >
            {member.name}
          </h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span
              className={`badge ${member.titleClass || 'badge-violet'}`}
              style={{ fontSize: '11px', padding: '3px 10px' }}
            >
              {member.title}
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>• SJEC CSE</span>
          </div>

          {member.description && (
            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: '12px',
                lineHeight: 1.55,
                margin: 0,
                opacity: 0.95,
              }}
            >
              {member.description}
            </p>
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '14px',
              paddingTop: '10px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              fontSize: '10px',
              color: 'var(--text-muted)',
            }}
          >
            <span>Autonomous AI Lab</span>
            <span>Academic Year 2025–2026</span>
          </div>
        </div>
      </div>
    </>
  );
}

function AboutPage() {
  const [activeMember, setActiveMember] = useState<{
    name: string;
    role: string;
    title?: string;
    titleClass?: string;
    description?: string;
    image: string;
  } | null>(null);

  const [portraitPos, setPortraitPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
  const [isOpen, setIsOpen] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  const handleActivate = (
    member: {
      name: string;
      role: string;
      title?: string;
      titleClass?: string;
      description?: string;
      image?: string;
    },
    cardEl: HTMLElement
  ) => {
    if (!member.image) return;
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    const rect = cardEl.getBoundingClientRect();
    const PORTRAIT_WIDTH = Math.min(340, window.innerWidth - 32);
    const PORTRAIT_HEIGHT = Math.min(480, window.innerHeight - 32);

    let left = rect.left + (rect.width - PORTRAIT_WIDTH) / 2;
    let top = rect.top + (rect.height - PORTRAIT_HEIGHT) / 2;

    const margin = 16;
    if (left < margin) left = margin;
    if (left + PORTRAIT_WIDTH > window.innerWidth - margin) {
      left = window.innerWidth - PORTRAIT_WIDTH - margin;
    }
    if (top < margin) top = margin;
    if (top + PORTRAIT_HEIGHT > window.innerHeight - margin) {
      top = window.innerHeight - PORTRAIT_HEIGHT - margin;
    }

    setPortraitPos({ left, top });
    setActiveMember({
      name: member.name,
      role: member.role,
      title: member.title || 'Core Member',
      titleClass: member.titleClass || 'badge-violet',
      description: member.description || '',
      image: member.image,
    });
    setIsOpen(true);
  };

  const handleDeactivate = () => {
    closeTimerRef.current = window.setTimeout(() => {
      setIsOpen(false);
      setTimeout(() => {
        setActiveMember((curr) => (curr ? null : null));
      }, 320);
    }, 120);
  };

  const cancelDeactivate = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const forceClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsOpen(false);
    setTimeout(() => {
      setActiveMember(null);
    }, 320);
  };

  useEffect(() => {
    const handleScrollOrResize = () => {
      if (isOpen) {
        forceClose();
      }
    };
    window.addEventListener('scroll', handleScrollOrResize, { passive: true });
    window.addEventListener('resize', handleScrollOrResize, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  return (
    <div className="relative min-h-screen">
      <InaugurationSection />
      <div className="relative z-10 px-16 py-16" style={{ maxWidth: 1400, margin: '0 auto' }}>
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div style={{ width: 4, height: 24, background: 'var(--accent-violet)', borderRadius: 2 }} />
            <h2 className="text-xl font-bold">Faculty Advisory Council</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {FACULTY.map(f => {
              const isKeith = f.name === 'Mr. Keith Fernandes';
              const isKeithActive = isOpen && activeMember?.name === f.name;
              return (
                <div
                  key={f.name}
                  className={`card p-5 flex items-center gap-4 transition-all duration-300 ${isKeith ? 'cursor-pointer' : ''}`}
                  style={{
                    ...(isKeithActive
                      ? {
                          background:
                            'linear-gradient(135deg, rgba(34, 211, 238, 0.16) 0%, rgba(139, 92, 246, 0.22) 50%, rgba(13, 11, 28, 0.9) 100%)',
                          borderColor: 'rgba(34, 211, 238, 0.8)',
                          boxShadow:
                            '0 0 28px rgba(34, 211, 238, 0.45), 0 0 55px rgba(139, 92, 246, 0.3), inset 0 0 16px rgba(34, 211, 238, 0.12)',
                          transform: 'translateY(-2px)',
                        }
                      : {}),
                  }}
                  onMouseEnter={(e) => {
                    if (isKeith) handleActivate(f, e.currentTarget);
                  }}
                  onMouseLeave={() => {
                    if (isKeith) handleDeactivate();
                  }}
                  onClick={(e) => {
                    if (isKeith) handleActivate(f, e.currentTarget);
                  }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: isKeith && isKeithActive
                      ? 'linear-gradient(135deg, #06b6d4, #8b5cf6)'
                      : 'linear-gradient(135deg, var(--btn-primary-start), var(--btn-primary-end))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 14, flexShrink: 0,
                    transition: 'all 0.3s ease',
                  }}>{f.initials}</div>
                  <div className="flex-1">
                    <div
                      className="font-semibold"
                      style={{
                        transition: 'all 0.35s ease',
                        ...(isKeithActive
                          ? {
                              background: 'linear-gradient(135deg, #ffffff 20%, #38bdf8 65%, #c084fc 100%)',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                              filter: 'drop-shadow(0 0 10px rgba(34, 211, 238, 0.6))',
                            }
                          : {}),
                      }}
                    >
                      {f.name}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{f.role}</div>
                  </div>
                  <button
                    className="badge badge-violet"
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isKeith) handleActivate(f, e.currentTarget.closest('.card') as HTMLElement);
                    }}
                  >
                    Portrait View
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div style={{ width: 4, height: 24, background: 'var(--accent-violet)', borderRadius: 2 }} />
              <h2 className="text-xl font-bold">
                Student Core Team <span className="accent-italic">&amp; Officers</span>
              </h2>
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Academic Year 2025–2026</span>
          </div>
          <div className="grid grid-cols-3 gap-5 mt-6">
            {TEAM.map(m => (
              <TeamCard
                key={m.name}
                member={m}
                isActive={isOpen && activeMember?.name === m.name}
                hasAnyActive={isOpen}
                onActivate={(el) => handleActivate(m, el)}
                onDeactivate={handleDeactivate}
              />
            ))}
          </div>
        </section>

        {/* Core Working Committee Section */}
        <section className="mt-14" style={{
          background: 'rgba(10, 14, 26, 0.75)',
          border: '1px solid rgba(139, 92, 246, 0.25)',
          borderRadius: '16px',
          padding: '24px 28px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
        }}>
          <div className="flex items-center justify-between">
            <span style={{
              color: '#22d3ee',
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}>
              CORE WORKING COMMITTEE
            </span>
            <span style={{
              color: '#94a3b8',
              fontSize: 12,
              fontWeight: 400,
            }}>
              Departmental Representatives
            </span>
          </div>

          <div style={{
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            margin: '16px 0 20px 0',
          }} />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {CORE_WORKING_COMMITTEE.map(m => (
              <div
                key={m.name}
                style={{
                  background: 'rgba(18, 22, 36, 0.65)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    minWidth: 44,
                    borderRadius: 10,
                    background: 'rgba(30, 27, 60, 0.85)',
                    border: '1px solid rgba(139, 92, 246, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 13,
                    color: m.initialsColor,
                    flexShrink: 0,
                  }}
                >
                  {m.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    style={{
                      color: 'var(--text-primary)',
                      fontSize: 14,
                      fontWeight: 600,
                      lineHeight: 1.3,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {m.name}
                  </div>
                  <div
                    style={{
                      color: '#94a3b8',
                      fontSize: 12,
                      marginTop: 4,
                      lineHeight: 1.3,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {m.role}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Floating Portrait Overlay */}
      <FloatingPortrait
        member={activeMember}
        position={portraitPos}
        isOpen={isOpen}
        onMouseEnter={cancelDeactivate}
        onMouseLeave={handleDeactivate}
        onClose={forceClose}
      />
    </div>
  );
}

function TeamCard({
  member,
  isActive,
  hasAnyActive,
  onActivate,
  onDeactivate,
}: {
  member: typeof TEAM[0];
  isActive: boolean;
  hasAnyActive: boolean;
  onActivate: (el: HTMLElement) => void;
  onDeactivate: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  const showOriginalHighlight = member.highlighted && !hasAnyActive;

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => {
        if (cardRef.current) onActivate(cardRef.current);
      }}
      onMouseLeave={onDeactivate}
      onClick={() => {
        if (cardRef.current) onActivate(cardRef.current);
      }}
      className={`p-6 rounded-xl flex flex-col gap-3 cursor-pointer ${
        isActive
          ? ''
          : showOriginalHighlight
          ? 'member-card-highlighted'
          : 'card'
      }`}
      style={{
        transition:
          'background 0.35s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.35s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.35s cubic-bezier(0.16, 1, 0.3, 1), transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        ...(isActive
          ? {
              background:
                'linear-gradient(135deg, rgba(34, 211, 238, 0.16) 0%, rgba(139, 92, 246, 0.22) 50%, rgba(13, 11, 28, 0.9) 100%)',
              borderColor: 'rgba(34, 211, 238, 0.8)',
              borderWidth: '1px',
              borderStyle: 'solid',
              boxShadow:
                '0 0 28px rgba(34, 211, 238, 0.45), 0 0 55px rgba(139, 92, 246, 0.3), inset 0 0 16px rgba(34, 211, 238, 0.12)',
              transform: 'translateY(-2px)',
            }
          : {}),
      }}
    >
      <div
        style={{
          color: isActive ? '#38bdf8' : 'var(--text-muted)',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.04em',
          transition: 'color 0.3s ease',
        }}
      >
        {member.role}
      </div>
      <h3
        className="text-xl font-bold"
        style={{
          transition: 'all 0.35s ease',
          ...(isActive
            ? {
                background: 'linear-gradient(135deg, #ffffff 20%, #38bdf8 65%, #c084fc 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 10px rgba(34, 211, 238, 0.6))',
              }
            : {
                color: showOriginalHighlight ? 'var(--accent-gold)' : 'var(--text-primary)',
              }),
        }}
      >
        {member.name}
      </h3>
      <span className={`badge ${member.titleClass} self-start`}>{member.title}</span>
      <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6 }}>{member.description}</p>
    </div>
  );
}

function JoinPage({ setPage }: { setPage: (p: Page) => void }) {
  const [form, setForm] = useState({ name: '', email: '', year: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="relative min-h-screen flex flex-col">
      <GeoShapeLeft />
      <GeoShapeRight />
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-20">
        <div style={{ width: 56, height: 56, background: 'var(--ambient-1)', border: '1px solid var(--border-medium)', borderRadius: 14 }}
          className="flex items-center justify-center text-2xl mb-6">⬡</div>

        <div className="pill-badge mb-6" style={{ color: 'var(--accent-cyan)', borderColor: 'rgba(34,211,238,0.3)' }}>
          Membership Intake • Academic Year 2025–2026
        </div>

        <h1 className="text-5xl font-black text-center mb-4" style={{ maxWidth: 700 }}>
          Ready to Build with <span className="accent-italic">Autonomous Intelligence?</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 520, lineHeight: 1.7, marginBottom: 32 }}>
          Join the AgentBlazer Club at SJEC CSE. Collaborate with peers, gain hands-on access to
          Salesforce Trailhead developer orgs, and shape real AI agent projects.
        </p>

        <div className="flex items-center gap-4 mb-12">
          <button className="btn-primary px-6 py-3 rounded-xl text-sm font-semibold" onClick={() => {
            document.getElementById('join-form')?.scrollIntoView({ behavior: 'smooth' });
          }}>
            Become a Member
          </button>
          <button className="btn-outline px-6 py-3 rounded-xl text-sm font-semibold">
            Contact CSE Department
          </button>
        </div>

        <div className="card p-6 w-full max-w-xl mb-12">
          <div className="flex items-start gap-4">
            <div style={{ width: 40, height: 40, background: 'var(--ambient-1)', border: '1px solid var(--border-medium)', borderRadius: 10 }}
              className="flex items-center justify-center text-lg flex-shrink-0">🏫</div>
            <div>
              <div className="font-bold mb-1">Department of Computer Science &amp; Engineering</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>St Joseph Engineering College, Vamanjoor</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Mangaluru, Karnataka – 575028, India</div>
              <div style={{ marginTop: 8, fontSize: 13 }}>
                Direct Inquiries: <a href="mailto:agentblazer@sjec.ac.in" style={{ color: 'var(--accent-cyan)' }}>agentblazer@sjec.ac.in</a>
              </div>
            </div>
          </div>
        </div>

        <div id="join-form" className="card p-8 w-full max-w-xl">
          <h3 className="font-bold text-lg mb-6">Membership Application</h3>
          {submitted ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">✅</div>
              <div className="font-semibold text-lg mb-2">Application Submitted!</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>We'll reach out to you at your email shortly.</div>
            </div>
          ) : (
            <form className="flex flex-col gap-4" onSubmit={e => { e.preventDefault(); setSubmitted(true); }}>
              {[
                { key: 'name', label: 'Full Name', placeholder: 'Your full name', type: 'text' },
                { key: 'email', label: 'College Email', placeholder: 'you@sjec.ac.in', type: 'email' },
                { key: 'year', label: 'Year of Study', placeholder: '1st / 2nd / 3rd / 4th Year', type: 'text' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>{f.label}</label>
                  <input
                    type={f.type}
                    placeholder={f.placeholder}
                    value={form[f.key as keyof typeof form]}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    required
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 10,
                      background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-medium)',
                      color: 'var(--text-primary)', fontSize: 14, outline: 'none',
                    }}
                  />
                </div>
              ))}
              <div>
                <label style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Why do you want to join?</label>
                <textarea
                  rows={3}
                  placeholder="Tell us about your interest in AI and agentic systems..."
                  value={form.message}
                  onChange={e => setForm(prev => ({ ...prev, message: e.target.value }))}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 10,
                    background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)', fontSize: 14, outline: 'none', resize: 'vertical',
                  }}
                />
              </div>
              <button type="submit" className="btn-primary w-full py-3 rounded-xl text-sm font-semibold mt-2">
                Submit Application
              </button>
            </form>
          )}
        </div>
      </div>

      <Footer setPage={setPage} />
    </div>
  );
}

function Footer({ setPage }: { setPage: (p: Page) => void }) {
  return (
    <footer style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--footer-bg)' }} className="relative z-10 px-16 py-12">
      <div className="grid grid-cols-3 gap-12" style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div style={{ width: 36, height: 36, background: 'var(--ambient-1)', border: '1px solid var(--border-medium)', borderRadius: 8 }}
              className="flex items-center justify-center text-sm">⬡</div>
            <span className="font-bold">AgentBlazer Club</span>
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Department of Computer Science &amp; Engineering</div>
        </div>
        <div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 12 }}>QUICK LINKS</div>
          {[
            { label: 'About & Charter', page: 'about' },
            { label: 'Workshops & Contests', page: 'events' },
            { label: 'Salesforce Trailhead Community', page: null },
          ].map(l => (
            <div key={l.label} style={{ marginBottom: 8 }}>
              <span
                style={{ color: l.page ? 'var(--accent-cyan)' : 'var(--text-muted)', fontSize: 13, cursor: l.page ? 'pointer' : 'default' }}
                onClick={() => l.page && setPage(l.page as Page)}
              >{l.label}</span>
            </div>
          ))}
        </div>
        <div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 12 }}>AFFILIATIONS</div>
          <div className="flex gap-2 flex-wrap mb-3">
            {['SJEC CSE', 'Agentforce', 'Trailblazer'].map(a => (
              <span key={a} className="badge badge-violet">{a}</span>
            ))}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
            Empowered by faculty and student innovation.
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  const [showIntro, setShowIntro] = useState(true);
  const [page, setPage] = useState<Page>('home');
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('agentblazer-theme') : null;
    return (saved === 'violet' || saved === 'inferno' || saved === 'frost') ? saved : 'violet';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('agentblazer-theme', theme);
  }, [theme]);

  return (
    <div className={`theme-${theme}`} style={{ minHeight: '100vh' }}>
      {showIntro && <IntroScreen onEnter={() => setShowIntro(false)} />}
      <ThemeCursor theme={theme} />
      <StarField />
      <Navbar page={page} setPage={setPage} theme={theme} setTheme={setTheme} />
      <main className="relative z-10">
        {page === 'home' && <HomePage setPage={setPage} />}
        {page === 'about' && <AboutPage />}
        {page === 'events' && <EventsPage />}
        {page === 'join' && <JoinPage setPage={setPage} />}
      </main>
    </div>
  );
}
