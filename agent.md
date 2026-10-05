# Agent entrypoint

Read [AGENTS.md](AGENTS.md) before working. It is the canonical instruction file that supported editors discover automatically; this file is an entrypoint for tools or prompts that ask for `agent.md`.

On a first app-building prompt, read [.agents/skills/starter-setup/SKILL.md](.agents/skills/starter-setup/SKILL.md), prepare the local environment, then continue the requested feature. Users do not need to ask for database setup separately.

Database operations and troubleshooting: [.agents/skills/dev-database/SKILL.md](.agents/skills/dev-database/SKILL.md).

Backend features use API routes, Better Auth session checks, validators, services for all queries, and separate Drizzle table files. Read [docs/backend.md](docs/backend.md) and follow the Notes example.

## Frontend UI & Design System Guide (Impeccable & Anti-Slop)

When designing, building, or refining frontend interfaces (pages, dialogs, forms, tables, cards, navigation), always combine **Impeccable** (craft & lifecycle) with **Anti-Slop** (guardrails & anti-pattern filter). Never produce generic, repetitive "AI template" aesthetics.

### 1. Visual Source of Truth
- Always read and follow [docs/DESIGN.md](docs/DESIGN.md) for brand identity, tokens, typography, and layout rules.
- **Brand Tokens:** Use Reaksan's core palette (`#F9B129` primary yellow, `#FEF1CC` primary soft, `#212121` ink, `#F5F5F5` canvas, `#FFFFFF` panel surface).
- **Typography:** Inter for all UI text, Alfa Slab One strictly reserved for the `Reaksan Unpad` wordmark (`src/components/reaksan-logo.tsx`).
- **Mode:** Reaksan dashboards, PLP inventory tools, and admin interfaces use **Mode Operate** (task-driven, scanability, precise data hierarchy). Landing pages use **Mode Persuade**.

### 2. Impeccable (Craft, Lifecycle & Evaluation)
- Core skill: [.agents/skills/impeccable/SKILL.md](.agents/skills/impeccable/SKILL.md).
- Quality floor: Before touching or editing UI code, read [.agents/skills/impeccable/reference/craft-floor.md](.agents/skills/impeccable/reference/craft-floor.md) to adhere to absolute craft standards and quality locks.
- Key workflows & commands:
  - `shape [feature]`: Plan UX and information architecture before writing component code ([reference/shape.md](.agents/skills/impeccable/reference/shape.md)).
  - `audit [target]`: Technical audit covering WCAG AA contrast, responsive behavior, layout stability, and accessibility ([reference/audit.md](.agents/skills/impeccable/reference/audit.md)).
  - `critique [target]`: UX heuristic evaluation for visual hierarchy, clutter, and cognitive load ([reference/critique.md](.agents/skills/impeccable/reference/critique.md)).
  - `polish [target]`: Final quality pass for micro-spacing, alignment, and optical balance ([reference/polish.md](.agents/skills/impeccable/reference/polish.md)).
  - `harden [target]`: Production resilience: empty states, loading skeletons, long strings, text truncation, error handling ([reference/harden.md](.agents/skills/impeccable/reference/harden.md)).
  - Deterministic Anti-Pattern Detector: Run `.\.agents\skills\impeccable\scripts\impeccable.cmd detect <file-or-dir>` to scan UI code for 61+ design anti-patterns without LLM tokens.

### 3. Anti-Slop (Quality Guardrails & Anti-AI Filters)
- Core filter: [.agents/skills/antislop/SKILL.md](.agents/skills/antislop/SKILL.md).
- Apply during implementation:
  - **Visual & UI** ([.agents/skills/antislop-ui/SKILL.md](.agents/skills/antislop-ui/SKILL.md)): Ban AI clichés (no gratuitous purple/blue gradients, no floating geometric blobs, no nested cards-inside-cards, no decorative icons with zero semantic function).
  - **Mobile & Layout** ([.agents/skills/antislop-layoutmobile/SKILL.md](.agents/skills/antislop-layoutmobile/SKILL.md)): Strict mobile responsiveness (minimum 44x44px touch targets, zero horizontal scrolling, fluid stacks).
  - **Accessibility** ([.agents/skills/antislop-human/SKILL.md](.agents/skills/antislop-human/SKILL.md)): High contrast (>= 4.5:1), visible keyboard focus rings, semantic HTML tags.
  - **Copywriting** ([.agents/skills/antislop-copywriting/SKILL.md](.agents/skills/antislop-copywriting/SKILL.md)): Concrete, concise Indonesian terms for lab workflows; ban filler AI marketing hype ("elevate", "seamless", "powerful").
  - **Code Comments** ([.agents/skills/antislop-code/SKILL.md](.agents/skills/antislop-code/SKILL.md)): Strip obvious/redundant AI comments.

### 4. Frontend Execution Checklist
1. **Check Design System:** Verify color tokens and components in [docs/DESIGN.md](docs/DESIGN.md).
2. **Reuse Existing UI:** Use primitives in `src/components/ui/` with `cn()` utility.
3. **Build Fully:** Implement empty states, loading states, error states, and responsive breakpoints (mobile and desktop).
4. **Audit & Detect:** Run `.\.agents\skills\impeccable\scripts\impeccable.cmd detect <target>` to eliminate anti-patterns.
5. **Delivery Gate:** Confirm contrast, keyboard navigation, and layout stability before finalizing.

