# SkillForge Frontend Design System

## Brand signal
**SkillForge** is the hero on every branded surface. Product name first, then one purpose line. Navigation is secondary to the wordmark.

## Visual direction — "Cold Forge"
A cool, industrial-learning look: forged steel, teal arc light, and a sharp lime spark. Light-first. Feels corporate-training for regulated industries without looking like a generic SaaS dashboard.

### Palette
| Token | Hex | Use |
|-------|-----|-----|
| `--ink` | `#07161C` | Primary text, wordmark |
| `--ink-soft` | `#3A5360` | Secondary copy |
| `--canvas` | `#E7F0F2` | Page background |
| `--panel` | `#F7FBFC` | Content panels |
| `--line` | `#C5D5DB` | Dividers / hairlines |
| `--arc` | `#2EC4B6` | Primary accent / links |
| `--arc-deep` | `#1A8F85` | Hover / pressed |
| `--spark` | `#D6FF3A` | Primary CTA highlight |
| `--alert` | `#E85D04` | Risk / overdue |
| `--ok` | `#2A9D8F` | Passed / complete |
| `--warn` | `#E9C46A` | Approaching deadline |

### Type scale
| Role | Family | Sizes |
|------|--------|-------|
| Display | **Bricolage Grotesque** | 40 / 32 / 28 |
| Body | **Figtree** | 18 / 16 / 14 |
| Label | **Figtree** medium | 12–13, tracking wide |

### Atmosphere
- Canvas uses a soft teal wash plus a faint diagonal hatch (not flat white).
- Login / auth first viewport is one composition: wordmark, one headline, one supporting line, one CTA group, and a full-bleed forge-plate visual plane.
- No purple gradients. No cream/terracotta pairing. No newspaper/broadsheet layout.

### Motion (minimum set)
1. Auth panel fades up (`fade-rise`, 400ms).
2. Nav active indicator slides (`nav-ink`, 200ms).
3. Primary buttons press with a 1px translate + spark flash.

### Layout rules
- Shell: left rail on desktop (≥900px), top drawer toggle on tablet.
- Role-based nav groups — employee / manager / content / HR only see relevant links.
- Cards only when they wrap a discrete interaction (course enrol, quiz start, publish). Prefer open sections otherwise.

### Chart colours (later chunks)
Arc / ink / spark / alert on cool canvas — keep axes and labels in ink-soft.
