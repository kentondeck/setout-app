import { useContext, useState } from 'react';
import { SettingsContext } from '../contexts';
import { ApprenticeToggle } from '../components/ApprenticeToggle';
import type { Employee } from '../types';

const textInputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: 10,
  border: '0.5px solid var(--color-border)', background: 'var(--color-bg)',
  fontSize: 14, fontFamily: 'inherit', color: 'var(--color-text)',
  outline: 'none', boxSizing: 'border-box', WebkitAppearance: 'none',
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 500,
        color: 'var(--color-muted)',
        letterSpacing: '0.6px',
        textTransform: 'uppercase',
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}


export function Settings() {
  const { settings, updateSettings } = useContext(SettingsContext);
  const [nameInput, setNameInput] = useState(settings.userName);
  const [nameSaved, setNameSaved] = useState(false);

  function handleSaveName() {
    updateSettings({ userName: nameInput.trim() });
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2000);
  }

  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [empName, setEmpName] = useState('');
  const [empRole, setEmpRole] = useState('');
  const [empPayRate, setEmpPayRate] = useState('');
  const [empChargeRate, setEmpChargeRate] = useState('');

  function resetEmployeeForm() {
    setEmpName(''); setEmpRole(''); setEmpPayRate(''); setEmpChargeRate('');
    setEditingEmployeeId(null);
    setShowEmployeeForm(false);
  }

  function handleEditEmployee(emp: Employee) {
    setEditingEmployeeId(emp.id);
    setEmpName(emp.name);
    setEmpRole(emp.role);
    setEmpPayRate(String(emp.payRate || ''));
    setEmpChargeRate(String(emp.chargeRate || ''));
    setShowEmployeeForm(true);
  }

  function handleSaveEmployee() {
    const name = empName.trim();
    if (!name) return;
    const role = empRole.trim();
    const payRate = parseFloat(empPayRate) || 0;
    const chargeRate = parseFloat(empChargeRate) || 0;
    if (editingEmployeeId) {
      updateSettings({
        employees: settings.employees.map(e => e.id === editingEmployeeId ? { ...e, name, role, payRate, chargeRate } : e),
      });
    } else {
      updateSettings({
        employees: [...settings.employees, { id: crypto.randomUUID(), name, role, payRate, chargeRate }],
      });
    }
    resetEmployeeForm();
  }

  function handleRemoveEmployee(id: string) {
    updateSettings({ employees: settings.employees.filter(e => e.id !== id) });
    if (editingEmployeeId === id) resetEmployeeForm();
  }

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '28px 20px',
        paddingBottom: 24,
        gap: 28,
      }}
    >
      <h1
        style={{
          margin: 0,
          fontWeight: 500,
          fontSize: 28,
          letterSpacing: '-0.8px',
          color: 'var(--color-text)',
        }}
      >
        Settings
      </h1>

      <div>
        <SectionLabel>Units</SectionLabel>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
          }}
        >
          {(['metric', 'imperial'] as const).map(unit => {
            const active = settings.unit === unit;
            return (
              <button
                key={unit}
                onClick={() => updateSettings({ unit })}
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-card)',
                  border: active
                    ? '1.5px solid var(--color-orange)'
                    : '0.5px solid var(--color-border)',
                  background: active ? 'rgba(255, 90, 31, 0.06)' : 'var(--color-card)',
                  color: active ? 'var(--color-orange)' : 'var(--color-text)',
                  fontWeight: active ? 500 : 400,
                  fontSize: 14,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  letterSpacing: '-0.2px',
                }}
              >
                {unit === 'metric' ? 'Metric (m, mm)' : 'Imperial (ft, in)'}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <SectionLabel>Building compliance</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {(['AU', 'NZ'] as const).map(r => {
            const active = settings.region === r;
            return (
              <button
                key={r}
                onClick={() => updateSettings({ region: r })}
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-card)',
                  border: active ? '1.5px solid var(--color-orange)' : '0.5px solid var(--color-border)',
                  background: active ? 'rgba(255,90,31,0.06)' : 'var(--color-card)',
                  color: active ? 'var(--color-orange)' : 'var(--color-text)',
                  fontWeight: active ? 500 : 400,
                  fontSize: 14,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  letterSpacing: '-0.2px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <span>{r === 'AU' ? '🇦🇺' : '🇳🇿'}</span>
                <span>{r === 'AU' ? 'Australia' : 'New Zealand'}</span>
                <span style={{ fontSize: 11, opacity: 0.7 }}>{r === 'AU' ? 'NCC 2022' : 'NZBC 2022'}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <SectionLabel>Learning</SectionLabel>
        <ApprenticeToggle
          enabled={settings.apprenticeMode}
          onChange={val => updateSettings({ apprenticeMode: val })}
        />
      </div>


      <div>
        <SectionLabel>Your name</SectionLabel>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="Dave"
            value={nameInput}
            onChange={e => { setNameInput(e.target.value); setNameSaved(false); }}
            onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); }}
            style={{
              flex: 1,
              padding: '14px 16px',
              borderRadius: 'var(--radius-card)',
              border: '0.5px solid var(--color-border)',
              background: 'var(--color-card)',
              fontSize: 15,
              fontFamily: 'inherit',
              color: 'var(--color-text)',
              outline: 'none',
              minWidth: 0,
              WebkitAppearance: 'none',
            }}
          />
          <button
            onClick={handleSaveName}
            disabled={!nameInput.trim() || nameSaved}
            style={{
              padding: '0 18px',
              borderRadius: 'var(--radius-card)',
              border: 'none',
              background: nameSaved ? '#22c55e' : nameInput.trim() ? 'var(--color-orange)' : 'var(--color-border)',
              color: nameInput.trim() ? '#fff' : 'var(--color-muted)',
              fontSize: 14,
              fontWeight: 500,
              fontFamily: 'inherit',
              cursor: nameInput.trim() && !nameSaved ? 'pointer' : 'default',
              flexShrink: 0,
              transition: 'background 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            {nameSaved ? '✓ Saved' : 'Save'}
          </button>
        </div>
      </div>

      <div>
        <SectionLabel>Your team</SectionLabel>
        <p style={{ margin: '-4px 0 10px', fontSize: 12, color: 'var(--color-muted)', lineHeight: 1.4 }}>
          Add your employees once — pick them when pricing labour on a quote and their pay and charge-out rates fill in automatically.
        </p>

        {settings.employees.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
            {settings.employees.map(emp => (
              <div
                key={emp.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 14px', borderRadius: 'var(--radius-card)',
                  border: '0.5px solid var(--color-border)', background: 'var(--color-card)',
                }}
              >
                <button
                  onClick={() => handleEditEmployee(emp)}
                  style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
                >
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: 'var(--color-text)' }}>{emp.name}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-muted)' }}>
                    {emp.role || 'No role set'} · ${emp.payRate}/hr pay · ${emp.chargeRate}/hr charge
                  </p>
                </button>
                <button
                  onClick={() => handleRemoveEmployee(emp.id)}
                  aria-label="Remove teammate"
                  style={{
                    flexShrink: 0, width: 24, height: 24, borderRadius: '50%', border: 'none',
                    background: 'rgba(0,0,0,0.05)', color: 'var(--color-muted)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {showEmployeeForm ? (
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 8,
            padding: '14px', borderRadius: 'var(--radius-card)',
            border: '0.5px solid var(--color-border)', background: 'var(--color-card)',
          }}>
            <input
              type="text" placeholder="Name" value={empName}
              onChange={e => setEmpName(e.target.value)}
              style={textInputStyle}
            />
            <input
              type="text" placeholder="Role — e.g. 2nd year apprentice" value={empRole}
              onChange={e => setEmpRole(e.target.value)}
              style={textInputStyle}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4, background: 'var(--color-bg)', border: '0.5px solid var(--color-border)', borderRadius: 10, padding: '0 12px' }}>
                <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>$</span>
                <input
                  type="number" inputMode="decimal" min="0" step="1" placeholder="0"
                  value={empPayRate}
                  onChange={e => setEmpPayRate(e.target.value)}
                  style={{ flex: 1, minWidth: 0, padding: '12px 0', border: 'none', background: 'transparent', fontSize: 14, fontFamily: 'inherit', color: 'var(--color-text)', outline: 'none' }}
                />
                <span style={{ fontSize: 11, color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>/hr pay</span>
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4, background: 'var(--color-bg)', border: '0.5px solid var(--color-border)', borderRadius: 10, padding: '0 12px' }}>
                <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>$</span>
                <input
                  type="number" inputMode="decimal" min="0" step="1" placeholder="0"
                  value={empChargeRate}
                  onChange={e => setEmpChargeRate(e.target.value)}
                  style={{ flex: 1, minWidth: 0, padding: '12px 0', border: 'none', background: 'transparent', fontSize: 14, fontFamily: 'inherit', color: 'var(--color-text)', outline: 'none' }}
                />
                <span style={{ fontSize: 11, color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>/hr charge</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={resetEmployeeForm}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 10, border: '0.5px solid var(--color-border)',
                  background: 'var(--color-bg)', color: 'var(--color-muted)', fontSize: 14, fontWeight: 500,
                  fontFamily: 'inherit', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEmployee}
                disabled={!empName.trim()}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 10, border: 'none',
                  background: empName.trim() ? 'var(--color-orange)' : 'var(--color-border)',
                  color: empName.trim() ? '#fff' : 'var(--color-muted)', fontSize: 14, fontWeight: 500,
                  fontFamily: 'inherit', cursor: empName.trim() ? 'pointer' : 'default',
                }}
              >
                {editingEmployeeId ? 'Save changes' : 'Add teammate'}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowEmployeeForm(true)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              width: '100%', padding: '12px 0', borderRadius: 'var(--radius-card)',
              border: '0.5px dashed rgba(0,0,0,0.18)', background: 'none', color: 'var(--color-orange)',
              fontSize: 13.5, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer',
            }}
          >
            + Add teammate
          </button>
        )}
      </div>

      <div style={{ marginTop: 'auto', textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: 'var(--color-muted)' }}>
          Setout v0.1.0 — built for builders
        </p>
      </div>
    </div>
  );
}
