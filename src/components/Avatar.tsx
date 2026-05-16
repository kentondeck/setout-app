interface AvatarProps {
  name: string;
  onClick?: () => void;
}

export function Avatar({ name, onClick }: AvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';

  return (
    <button
      onClick={onClick}
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
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
        padding: 0,
        fontFamily: 'inherit',
      }}
      aria-label="Profile"
    >
      {initial}
    </button>
  );
}
