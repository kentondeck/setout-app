// Returns the greeting split into a prefix and the name, so the name can be
// rendered in brand orange while the rest stays in the normal text colour.
// `name` is '' when none was given, and `prefix` already carries any spacing
// or punctuation needed before it.
export function getGreeting(name: string): { prefix: string; name: string; sub: string } {
  const hour = new Date().getHours();
  const first = name.trim().split(' ')[0];

  let base: string;
  let joiner = ' ';
  if (hour < 12) base = 'Morning';
  else if (hour < 17) base = 'Afternoon';
  else if (hour < 22) base = 'Evening';
  else { base = 'Late one tonight'; joiner = ', '; }

  return {
    prefix: first ? `${base}${joiner}` : base,
    name: first,
    sub: 'What are we building?',
  };
}
