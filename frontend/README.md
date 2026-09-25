# Utu — Solar Energy Marketplace (Iraq)

Homepage implementation for a verified solar marketplace: customers calculate
what they need, then compare companies that have actually built it.

Visual identity: **sunset light reflecting on a solar panel** — deep graphite
structure, golden solar energy, coral sunset accents.

---

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
```

Requires Node 18+.

---

## Where things live

```
src/
  styles/tokens.css        Design tokens — the single source of truth
  styles/globals.css       Base layer, focus ring, RTL/Arabic rules
  i18n/                    Language provider, EN/AR strings
  motion/                  Easings, reveal wrapper, reduced-motion hook
  components/
    icons/Icon.tsx         One 24px stroke set, 1.75 weight
    ui/                    Button, Input, VerificationBadge, Rating, Chip, SolarArray
    cards/                 Company, Project, Review, Step, Warranty, Trust
    calculator/            Appliance row, stepper, result stat, sizing maths
    layout/                Header, Footer
  sections/                One file per homepage section
  data/content.ts          Realistic placeholder content
```

---

## Design tokens

`src/styles/tokens.css` holds every colour, type step, space step, radius and
shadow as a CSS custom property. `tailwind.config.cjs` only gives them names —
it contains no raw values. **Never write a hex in a component.**

The token names map 1:1 to the Figma file's variable collections
(`1. Primitives`, `2. Semantic`), so a change in one place is traceable to the
other.

### Colour hierarchy — 60 / 30 / 10

| Share | Role | Tokens |
|---|---|---|
| 60% | Structure: page backgrounds, cards, text, dark panel sections | `sand-*`, `panel-*` |
| 30% | Brand: primary CTAs, energy figures, active states | `solar-*` |
| 10% | Accents: section eyebrows, trust icons, focus, data | `sunset-*`, `dusk-*`, `sage-*` |

Prefer the semantic aliases (`bg-bg-surface`, `text-content-secondary`,
`border-line-subtle`) over primitives in application code. Primitives are for
building new semantic tokens.

### Key contrast ratios (WCAG 2.1 AA)

| Pair | Ratio |
|---|---|
| `content-primary` on `bg-page` | 16.9:1 |
| `content-secondary` on `bg-page` | 7.4:1 |
| `content-on-brand` on `brand-primary` (primary button) | 9.5:1 |
| `solar-300` on `panel-900` (dark-section figures) | 11.2:1 |
| `content-on-dark-muted` on `bg-inverse` | 12.6:1 |

---

## The calculator

`components/calculator/useSolarEstimate.ts` does real arithmetic — it is not a
mock. Assumptions are exported as `ASSUMPTIONS` rather than buried in the
formula:

```
dailyWh    = Σ (watts × units × hours)
systemKWp  = dailyKWh / (peakSunHours × systemEfficiency)
batteryKWh = dailyKWh × eveningLoadShare / depthOfDischarge
panelCount = ceil(systemKWp × 1000 / panelWatts)
```

Defaults are Baghdad values (5.2 peak sun hours, 0.78 system efficiency). For
production, move these server-side and vary `PEAK_SUN_HOURS` by governorate.

Every surface that shows a figure also says it is an estimate — the section
header carries a "Demo values" tag and the CTA row repeats the disclaimer. Do
not remove those while the numbers are client-side.

---

## Accessibility

Built in, not retrofitted:

- **Skip link** is the first tab stop.
- **Status is never colour alone.** `VerificationBadge` carries icon + wording +
  colour, and adds a screen-reader description of the check behind it.
- **Ratings** always render the numeric score and expose an `aria-label`;
  stars are `aria-hidden`.
- **Focus** uses one global `:focus-visible` ring — dusk blue on light
  surfaces, solar amber inside `.on-dark` sections.
- **Loading buttons** keep their label mounted and set `aria-busy`, so the
  button never changes width and the accessible name never disappears.
- **Steppers** are real buttons with `aria-label`s, 36px targets, and a polite
  live region on the value.
- **Errors** in `Input` add an icon and a message, wired via `aria-describedby`
  and `aria-invalid`.
- **Empty state** in the calculator explains what to do instead of showing zeroes.
- **Mobile nav** is a disclosure with `aria-expanded` / `aria-controls`, closed
  by Escape.

Verify with keyboard-only navigation and axe-core before shipping changes.

---

## Motion

Adapted from the project's Motion Framework Kit — same easing curves and variant
names, retuned: hover lift reduced to 3px, glow recoloured to solar amber, no
travel over 24px.

`<Reveal>` owns scroll reveals for the whole page so the trigger point never
drifts between sections. `<Reveal stagger>` with `<RevealItem>` children
sequences a grid.

Reduced motion is handled twice over: `toReducedMotion()` collapses variants to
a plain fade, and `globals.css` neutralises any animation the motion layer does
not own.

---

## Responsive

Mobile-first. Tested at 320, 390, 768, 1024 and 1440px.

| Breakpoint | Behaviour |
|---|---|
| `< 640px` | Single column; nav collapses to a disclosure; auth buttons move inside the menu |
| `640–1023px` | Two-column card grids; calculator results go 2-up; nav still collapsed |
| `≥ 1024px` | Full nav; hero splits copy / visual; three-column card grids |

Type steps scale through the `--fs-*` tokens at 768 and 1024, so headings
re-scale without a single `text-` override in the components.

---

## Bilingual: English and Arabic

The product targets Iraqi users, so Arabic is a first-class language, not a
translation layer bolted on afterwards.

### How it works

`LanguageProvider` (`src/i18n/`) owns the language and writes `lang` and `dir`
onto `<html>`. Everything else keys off those two attributes:

```tsx
const { t, pick, lang, toggle } = useLanguage();

t('hero.h1')            // UI string from src/i18n/translations.ts
pick(company.name)      // the current language out of a Localized<T> pair
```

- **UI strings** live in `src/i18n/translations.ts`. `TranslationKey` is derived
  from the English object, so a key missing from Arabic is a build error.
- **Content** lives in `src/data/content.ts` as `Localized<T>` pairs
  (`{ en, ar }`). When this is wired to an API, the shape stays the same.
- **The choice persists** in `localStorage`, wrapped in try/catch — a private
  window falls back to English instead of throwing.

### Typography switches with the language

`tokens.css` redefines three tokens under `:root[lang='ar']`:

| Token | Latin | Arabic | Why |
|---|---|---|---|
| `--font-active` | Inter | Noto Sans Arabic | matched vertical metrics |
| `--leading-body` | 1.625 | 1.85 | Arabic ascenders/descenders need room |
| `--tracking-display` | -0.02em | 0 | **negative tracking breaks joined letters** |

The last one matters most: tracking that flatters Latin headings visibly breaks
Arabic, because the letters connect.

`.eyebrow` also drops `uppercase` and its letter-spacing in Arabic — case is a
Latin device, and Arabic has none.

### Mirroring

Layout uses logical properties throughout (`ms-`, `pe-`, `start-`, `text-end`),
so `dir="rtl"` mirrors the page without a second stylesheet. Three things
deliberately do **not** mirror:

- **The brand lockup** — `.brand-lockup` pins Utu to LTR and the Latin face.
  A brand name is not translated.
- **The hero illustration and project images** — `dir="ltr"` on `SolarArray`
  and the hero visual. They are pictures, not interfaces; the sun stays where
  it was composed. UI overlaid on them uses `dir="inherit"` and mirrors normally.
- **Numbers** — `.numeric` keeps figures LTR and tabular. Latin digits in both
  languages (`8.4 kWp`, `26.8 kWh`) is standard in Iraqi technical writing;
  Eastern Arabic numerals inside unit strings are harder to scan, not easier.

### When you add a component

Check it at `dir="rtl"` before merging, and prefer logical properties over
`left`/`right`. Headings are capped in `ch`, not `px`, so Arabic expansion
(typically 20–25% longer than English) wraps instead of overflowing.

---

## Known gaps

- Content is static; wire `data/content.ts` to the API.
- The "Calculate My System" button simulates a request with a timeout.
- Company, project and review links are placeholders (`#top`).
