import { Logo } from './Logo';
import { Avatar } from './Avatar';

interface TopBarProps {
  userName: string;
}

export function TopBar({ userName }: TopBarProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 20px 0',
      }}
    >
      <Logo />
      <Avatar name={userName || 'U'} />
    </div>
  );
}
