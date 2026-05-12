export function getGreeting(name: string): { greeting: string; sub: string } {
  const hour = new Date().getHours();
  const first = name.trim().split(' ')[0] || 'there';
  let greeting: string;

  if (hour < 12) greeting = `Morning ${first}`;
  else if (hour < 17) greeting = `Afternoon ${first}`;
  else if (hour < 22) greeting = `Evening ${first}`;
  else greeting = `Late one tonight ${first}`;

  return { greeting, sub: 'What are we building?' };
}
