// A wordmark on its own is just big text, not an identity — the small orange
// tick underneath is the same device the onboarding screens use under the
// splash wordmark, reused here so the header reads as branded rather than
// as a bigger label.
export function Logo() {
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 6 }}>
      <span
        style={{
          fontWeight: 700,
          letterSpacing: '-1.6px',
          fontSize: '40px',
          lineHeight: 1,
        }}
      >
        <span style={{ color: 'var(--color-text)' }}>set</span>
        <span style={{ color: 'var(--color-orange)' }}>out</span>
      </span>
      <span style={{ width: 24, height: 3, borderRadius: 2, background: 'var(--color-orange)' }} />
    </span>
  );
}
