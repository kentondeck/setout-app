import { useState } from 'react';
import { Logo } from './Logo';
import { Avatar } from './Avatar';
import { ProfileSheet } from './ProfileSheet';

interface TopBarProps {
  userName: string;
}

export function TopBar({ userName }: TopBarProps) {
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 20px 0',
        }}
      >
        <Logo />
        <Avatar name={userName || 'U'} onClick={() => setProfileOpen(true)} />
      </div>

      {profileOpen && <ProfileSheet onClose={() => setProfileOpen(false)} />}
    </>
  );
}
