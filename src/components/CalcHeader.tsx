import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface CalcHeaderProps {
  title: string;
  right?: ReactNode;
}

export function CalcHeader({ title, right }: CalcHeaderProps) {
  const navigate = useNavigate();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '20px 20px 0',
      }}
    >
      <button
        onClick={() => navigate(-1)}
        style={{
          background: 'none',
          border: 'none',
          padding: '4px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          margin: '-4px',
        }}
        aria-label="Go back"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <h1
        style={{
          margin: 0,
          fontSize: 20,
          fontWeight: 500,
          color: 'var(--color-text)',
          letterSpacing: '-0.5px',
          flex: 1,
        }}
      >
        {title}
      </h1>
      {right}
    </div>
  );
}
