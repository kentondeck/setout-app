interface AvatarProps {
  name: string;
}

export function Avatar({ name }: AvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';

  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        backgroundColor: '#ffffff',
        border: '0.5px solid rgba(0,0,0,0.08)',
        color: 'var(--color-text)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 500,
        fontSize: 13,
        flexShrink: 0,
        cursor: 'default',
        userSelect: 'none',
      }}
    >
      {initial}
    </div>
  );
}
