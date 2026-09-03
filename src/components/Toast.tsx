import { useEffect } from 'react';

interface ToastProps {
  message: string | null;
  onDismiss: () => void;
}

export function Toast({ message, onDismiss }: ToastProps) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDismiss, 2200);
    return () => clearTimeout(t);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'calc(env(safe-area-inset-bottom) + 72px)',
        left: '50%',
        transform: 'translateX(-50%)',
        background: '#0a0a0a',
        color: '#fff',
        borderRadius: 22,
        padding: '10px 20px',
        fontSize: 14,
        fontWeight: 500,
        zIndex: 400,
        whiteSpace: 'nowrap',
        boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
        pointerEvents: 'none',
      }}
    >
      {message}
    </div>
  );
}
