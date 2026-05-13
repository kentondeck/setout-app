# Agent Instructions

You're working inside the **WAT framework** (Workflows, Agents, Tools). This architecture separates concerns so that probabilistic AI handles reasoning while deterministic code handles execution. That separation is what makes this system reliable.

## The WAT Architecture

**Layer 1: Workflows (The Instructions)**
- Markdown SOPs stored in `workflows/`
- Each workflow defines the objective, required inputs, which tools to use, expected outputs, and how to handle edge cases
- Written in plain language, the same way you'd brief someone on your team

**Layer 2: Agents (The Decision-Maker)**
- This is your role. You're responsible for intelligent coordination.
- Read the relevant workflow, run tools in the correct sequence, handle failures gracefully, and ask clarifying questions when needed
- You connect intent to execution without trying to do everything yourself
- Example: If you need to pull data from a website, don't attempt it directly. Read `workflows/scrape_website.md`, figure out the required inputs, then execute `tools/scrape_single_site.py`

**Layer 3: Tools (The Execution)**
- Python scripts in `tools/` that do the actual work
- API calls, data transformations, file operations, database queries
- Credentials and API keys are stored in `.env`
- These scripts are consistent, testable, and fast

**Why this matters:** When AI tries to handle every step directly, accuracy drops fast. If each step is 90% accurate, you're down to 59% success after just five steps. By offloading execution to deterministic scripts, you stay focused on orchestration and decision-making where you excel.

## How to Operate

**1. Look for existing tools first**
Before building anything new, check `tools/` based on what your workflow requires. Only create new scripts when nothing exists for that task.

**2. Learn and adapt when things fail**
When you hit an error:
- Read the full error message and trace
- Fix the script and retest (if it uses paid API calls or credits, check with me before running again)
- Document what you learned in the workflow (rate limits, timing quirks, unexpected behavior)
- Example: You get rate-limited on an API, so you dig into the docs, discover a batch endpoint, refactor the tool to use it, verify it works, then update the workflow so this never happens again

**3. Keep workflows current**
Workflows should evolve as you learn. When you find better methods, discover constraints, or encounter recurring issues, update the workflow. That said, don't create or overwrite workflows without asking unless I explicitly tell you to. These are your instructions and need to be preserved and refined, not tossed after one use.

## The Self-Improvement Loop

Every failure is a chance to make the system stronger:
1. Identify what broke
2. Fix the tool
3. Verify the fix works
4. Update the workflow with the new approach
5. Move on with a more robust system

This loop is how the framework improves over time.

## File Structure

**What goes where:**
- **Deliverables**: Final outputs go to cloud services (Google Sheets, Slides, etc.) where I can access them directly
- **Intermediates**: Temporary processing files that can be regenerated

**Directory layout:**
```
.tmp/           # Temporary files (scraped data, intermediate exports). Regenerated as needed.
tools/          # Python scripts for deterministic execution
workflows/      # Markdown SOPs defining what to do and how
.env            # API keys and environment variables (NEVER store secrets anywhere else)
credentials.json, token.json  # Google OAuth (gitignored)
```

**Core principle:** Local files are just for processing. Anything I need to see or use lives in cloud services. Everything in `.tmp/` is disposable.

## Bottom Line

You sit between what I want (workflows) and what actually gets done (tools). Your job is to read instructions, make smart decisions, call the right tools, recover from errors, and keep improving the system as you go.

Stay pragmatic. Stay reliable. Keep learning.

---

# Setout App — Project Context

**Setout** is a mobile-first construction calculator PWA (React 19 + TypeScript + Vite). Renders inside a 390×844px phone-frame shell on desktop.

## Commands

```bash
npm run dev       # Vite dev server → localhost:5173
npm run build     # tsc -b && vite build
npm run lint      # ESLint
npx tsc --noEmit  # type-check without building — run after every edit
```

No test suite. Type-check is the primary correctness gate.

## Adding a Calculator

Every calculator follows this exact 6-step pattern:

1. **`src/calculators/<name>.ts`** — pure math only. Export `<Name>Inputs`, `<Name>Outputs extends Record<string, number>`, `<Name>Result` (outputs + `steps: WorkingStep[]`), and `calculate<Name>(inputs)`.
2. **`src/types/index.ts`** — add the id to the `CalculatorId` union.
3. **`src/lib/calculators.ts`** — add a `CalcMeta` entry (label, subtitle, number, svgPath). `svgPath` is a raw SVG `d` attribute rendered at 24×24.
4. **`src/lib/compliance.ts`** — add AU and NZ strings under the calculator id key in `COMPLIANCE_NOTES`.
5. **`src/pages/<Name>Calc.tsx`** — page component following the existing pattern: `CalcHeader` → inputs card → Calculate button → result cards → `ApprenticeWorking` → `JobNameInput` → compliance note.
6. **`src/App.tsx`** — import the page and add `<Route path="/calc/<id>" element={<NameCalc />} />`.

## Key Conventions

- **All styling is inline** — `style={{}}` props only, no CSS modules or Tailwind. Use CSS variables: `--color-bg`, `--color-card`, `--color-border`, `--color-orange`, `--color-text`, `--color-muted`, `--radius-tile`, `--radius-card`.
- **Units within a single calculator must be consistent.** Heights and short dimensions use mm; standalone lengths (decking, framing) use metres. Don't mix in the same calculator — this causes silent pitch/lineal-metre bugs.
- **Stud/spacing counts**: always `Math.floor(lengthMm / spacing) + 1`.
- **Lineal metres totals** must include ALL timber (studs + plates + noggins), not just one category.
- **`ApprenticeWorking`** renders only when `settings.apprenticeMode` is true. Pass `steps`, `finalAnswer`, `finalLabel`, and a unique string `id`.
- **Cut lists** use `calculateCutlist` from `src/calculators/cutlist.ts` (first-fit decreasing, 3mm kerf). Import directly in the page — no wrapper.
- **`VoiceInputButton`** goes in the `right` slot of `CalcHeader`. `onValues` receives parsed numbers in speech order.

## State & Persistence

All state is client-only via two context hooks lifted in `App.tsx`:
- `SettingsContext` / `useSettings` → `localStorage` key `sitehand_settings`
- `HistoryContext` / `useHistory` → `localStorage` key `sitehand_history`