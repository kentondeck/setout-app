import { useNavigate } from 'react-router-dom';
import { CalcHeader } from '../components/CalcHeader';

const CONTACT_EMAIL = 'setoutapp@gmail.com';

const FAQS: { q: string; a: string }[] = [
  {
    q: 'Do the calculators work offline?',
    a: 'Yes — once the app has loaded once, all calculators work with no internet.',
  },
  {
    q: 'Which building codes does Setout follow?',
    a: 'Setout applies NZS 3604 for New Zealand and AS 1684 / AS 1657 / NCC for Australia, based on the region you pick during onboarding. You can change the region in Settings any time.',
  },
  {
    q: 'How do I build a quote?',
    a: 'Open the Quotes tab and tap New quote. You can add materials by hand or price them up from any calculator — after you calculate, tap Add to quote and the materials flow straight in with quantities.',
  },
  {
    q: 'Where are my calculations stored?',
    a: 'On your device only. Nothing about the numbers you calculate ever leaves your phone or browser. If you clear the app\'s data or uninstall, your history is gone — export important jobs first.',
  },
  {
    q: 'How do I export or share a calculation?',
    a: 'After any calculation, tap the Share button at the bottom of the results. It opens your phone\'s share sheet — AirDrop, Mail, Messages, WhatsApp, Notes, anywhere you like.',
  },
  {
    q: 'The app is showing an old version — how do I get the update?',
    a: 'Hard-refresh: on iOS Safari, hold the reload button and pick "Reload Without Content Blockers", or delete the home-screen icon and re-add it. On the TestFlight/App Store app, updates come through automatically.',
  },
  {
    q: 'Can I use Setout on a shared work phone?',
    a: 'Yes, but each person\'s calculations, jobs and saved name live on that specific device. There\'s no login or sync between devices yet.',
  },
  {
    q: 'Something\'s wrong — how do I report it?',
    a: 'Use the Feedback tile on the home screen, or email ' + CONTACT_EMAIL + '. Tell us what you were doing, what happened, and what you expected. Screenshots help.',
  },
];

export function Support() {
  const navigate = useNavigate();

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <CalcHeader title="Support" />

      <div style={{ padding: '24px 20px', paddingBottom: 40, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Quick actions */}
        <div style={{
          background: 'var(--color-card)',
          border: '0.5px solid var(--color-border)',
          borderRadius: 'var(--radius-card)',
          padding: '18px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 500, color: 'var(--color-text)' }}>
            Got a problem or an idea?
          </p>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.5 }}>
            The fastest way to reach us is via feedback in the app, or straight to <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--color-orange)', textDecoration: 'none' }}>{CONTACT_EMAIL}</a>.
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button
              onClick={() => navigate('/calc/feedback')}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: 12,
                border: 'none',
                background: 'var(--color-orange)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 500,
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              Send feedback
            </button>
            <a
              href={`mailto:${CONTACT_EMAIL}?subject=Setout%20support`}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: 12,
                border: '0.5px solid var(--color-border)',
                background: 'var(--color-bg)',
                color: 'var(--color-text)',
                fontSize: 14,
                fontWeight: 500,
                fontFamily: 'inherit',
                cursor: 'pointer',
                textAlign: 'center',
                textDecoration: 'none',
                lineHeight: 1.2,
              }}
            >
              Email us
            </a>
          </div>
        </div>

        {/* FAQs */}
        <div>
          <p style={{
            margin: '8px 0 12px',
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--color-muted)',
            letterSpacing: '0.6px',
            textTransform: 'uppercase',
          }}>
            Frequently asked
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {FAQS.map((f, i) => (
              <details
                key={i}
                style={{
                  background: 'var(--color-card)',
                  border: '0.5px solid var(--color-border)',
                  borderRadius: 12,
                  padding: '14px 16px',
                }}
              >
                <summary
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: 'var(--color-text)',
                    cursor: 'pointer',
                    listStyle: 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <span>{f.q}</span>
                  <span style={{ fontSize: 12, color: 'var(--color-muted)', flexShrink: 0 }}>+</span>
                </summary>
                <p style={{
                  margin: '10px 0 0',
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: 'var(--color-muted)',
                }}>
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </div>

        {/* Footer links */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          padding: '20px 0 8px',
        }}>
          <button
            onClick={() => navigate('/privacy')}
            style={{
              background: 'none',
              border: 'none',
              padding: 4,
              fontSize: 12,
              color: 'var(--color-muted)',
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            Privacy Policy
          </button>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--color-muted)' }}>
            Setout PTY Ltd
          </p>
        </div>
      </div>
    </div>
  );
}
