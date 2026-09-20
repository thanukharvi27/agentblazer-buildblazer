import { useState, useEffect, useRef } from 'react';
import logoImg from './assets/screen5.png';
import IntroScreen from './IntroScreen';
import ThemeCursor from './ThemeCursor';

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
  { initials: 'KF', name: 'Mr. Keith Fernandes', role: 'Assistant Professor, CSE • Faculty Coordinator' },
];

const TEAM = [
  {
    role: 'Executive President',
    name: 'Ruben Saldanha',
    title: 'President',
    titleClass: 'badge-green',
    description: 'Guiding club vision, university collaborations, and strategic workshop series.',
    highlighted: false,
  },
  {
    role: 'Executive Vice President',
    name: 'Ajay Preenal Dsouza',
    title: 'Vice President',
    titleClass: 'badge-gold',
    description: 'Coordinating student mentorship, event operations, and community growth.',
    highlighted: true,
  },
  {
    role: 'Technical Direction',
    name: 'Stevin Dsouza',
    title: 'Tech Lead',
    titleClass: 'badge-cyan',
    description: 'Technical architectures, hands-on lab environments, and repository supervision.',
    highlighted: false,
  },
  {
    role: 'Operations & Logistics',
    name: 'Frenny Chrystal Saldanha',
    title: 'Resource Head',
    titleClass: 'badge-gold',
    description: 'Managing cloud compute budgets, venue infrastructure, and participant toolkits.',
    highlighted: false,
  },
  {
    role: 'Administration',
    name: 'Joyline Galbao',
    title: 'Secretary',
    titleClass: 'badge-gold',
    description: 'Documentation, accreditation reporting, meeting minutes, and member onboarding.',
    highlighted: false,
  },
  {
    role: 'Creative Outreach',
    name: 'Chinthan N V',
    title: 'Media Head',
    titleClass: 'badge-violet',
    description: 'Brand storytelling, photo documentation, visual design, and social publications.',
    highlighted: false,
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
          <div className="relative">
            <div style={{
              width: 280,
              height: 280,
              background: 'linear-gradient(135deg, var(--ambient-1), var(--ambient-2))',
              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
              border: '2px solid var(--border-medium)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}>
              <div style={{
                width: 240,
                height: 240,
                clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                background: 'linear-gradient(135deg, var(--bg-secondary), var(--bg-primary))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}>
                <div style={{ fontSize: 80 }}>🤖</div>
              </div>
            </div>
            <div style={{
              position: 'absolute',
              inset: -2,
              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
              background: 'linear-gradient(135deg, var(--accent-glow), transparent)',
              filter: 'blur(8px)',
              zIndex: -1,
            }} />
          </div>
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

function AboutPage() {
  return (
    <div className="relative min-h-screen">
      <div className="relative z-10 px-16 py-16" style={{ maxWidth: 1400, margin: '0 auto' }}>
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div style={{ width: 4, height: 24, background: 'var(--accent-violet)', borderRadius: 2 }} />
            <h2 className="text-xl font-bold">Faculty Advisory Council</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {FACULTY.map(f => (
              <div key={f.name} className="card p-5 flex items-center gap-4">
                <div style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: 'linear-gradient(135deg, var(--btn-primary-start), var(--btn-primary-end))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 14, flexShrink: 0
                }}>{f.initials}</div>
                <div className="flex-1">
                  <div className="font-semibold">{f.name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{f.role}</div>
                </div>
                <button className="badge badge-violet" style={{ cursor: 'pointer' }}>Portrait View</button>
              </div>
            ))}
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
              <TeamCard key={m.name} member={m} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function TeamCard({ member }: { member: typeof TEAM[0] }) {
  return (
    <div className={`p-6 rounded-xl flex flex-col gap-3 ${member.highlighted ? 'member-card-highlighted' : 'card'}`}>
      <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em' }}>{member.role}</div>
      <h3 className={`text-xl font-bold ${member.highlighted ? '' : ''}`}
        style={{ color: member.highlighted ? 'var(--accent-gold)' : 'var(--text-primary)' }}>
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
