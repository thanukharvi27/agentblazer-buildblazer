import React from 'react';

export interface CWCMember {
  id?: number;
  name: string;
  role: string;
  title?: string;
  description?: string;
  initials: string;
  initialsColor?: string;
}

interface CoreWorkingCommitteeProps {
  cwc: CWCMember[];
}

export function CoreWorkingCommittee({ cwc }: CoreWorkingCommitteeProps) {
  return (
    <section
      className="cwc-container mt-14 card"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-medium)',
        borderRadius: '16px',
        padding: '24px 28px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          style={{
            color: 'var(--neon-secondary)',
            fontWeight: 700,
            fontSize: 12,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          CORE WORKING COMMITTEE
        </span>
        <span
          style={{
            color: 'var(--text-muted)',
            fontSize: 12,
            fontWeight: 400,
          }}
        >
          Departmental Representatives
        </span>
      </div>

      <div
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          margin: '16px 0 20px 0',
        }}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cwc.map((m, i) => (
          <div
            key={m.name || i}
            className="cwc-card card"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                minWidth: 44,
                borderRadius: 10,
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-medium)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 13,
                color: m.initialsColor || 'var(--neon-secondary)',
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
                  color: 'var(--neon-primary)',
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
  );
}

export default CoreWorkingCommittee;
