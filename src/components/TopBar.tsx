import { Logo } from './Logo';

export function TopBar() {
  return (
    <div
      style={{
        padding: 'calc(env(safe-area-inset-top) + 20px) 20px 0',
      }}
    >
      <Logo />
    </div>
  );
}
