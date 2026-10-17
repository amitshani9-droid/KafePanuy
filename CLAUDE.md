# CLAUDE.md — קפה פנוי (Kafe Panuy)

> **קפה פנוי — הקפה שלך, בלי התור**

A real-time, Waze-style crowd tracking web app for coffee carts (עגלות קפה) in Israel. Users see how busy each cart is right now, report the crowd themselves, earn points, catch flash deals, and get smart recommendations for a calmer cart nearby.

The rules below are **strict**. Follow them on every task.

---

## 1. Language & Direction

- **All UI text MUST be in Hebrew** — natural, warm, conversational Israeli Hebrew. Talk like a friend at the cart, not like a government form.
  - ✅ `"וואו, פה ממש עמוס עכשיו 😅 יש עגלה רגועה 3 דקות מכאן"`
  - ❌ `"רמת העומס במיקום זה גבוהה. מומלץ לבחור חלופה."`
- `<html lang="he" dir="rtl">` in `index.html`. The entire app is RTL by default.
- Use logical Tailwind utilities where possible (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`) instead of `ml-*`/`mr-*`/`left-*`/`right-*`, so layout stays correct in RTL.
- Icons that imply direction (arrows, chevrons) must point the right way for RTL (e.g. "next" = `ChevronLeft`).
- Code, identifiers, comments, and commit messages stay in English.

## 2. Tech Stack

| Concern | Choice |
|---|---|
| Build | **Vite** |
| UI | **React 18** + **TypeScript** (strict) |
| Styling | **Tailwind CSS** |
| Icons | **`lucide-react`** |
| Maps | **`react-leaflet`** + **`leaflet`** |
| Map tiles | Free **OpenStreetMap** tiles, CSS-softened (CartoDB Positron preferred if it works keyless again) — **zero API keys** |

- Do not add paid services, API keys, or `.env` secrets. Everything must run with `npm install && npm run dev`.
- Do not introduce other UI/icon/map libraries without asking first.
- Tile layer: CartoDB Positron (`https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png`) currently returns an **"API KEY REQUIRED" placeholder** (checked 2026-10-17), so the app uses the **OpenStreetMap fallback**, desaturated via CSS on `.leaflet-tile-pane`:
  ```tsx
  <TileLayer
    url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  />
  ```
  Switch back to Positron only if it works again without a key. Always keep the OSM attribution.
- Import `leaflet/dist/leaflet.css` once (in `main.tsx`). Under Vite, set Leaflet's default marker icon URLs explicitly (or use custom `divIcon` markers) so markers don't render as broken images.

## 3. Brand Identity

### Fonts (Google Fonts)
- **`'Rubik'`** — headings, numbers, logo.
- **`'Heebo'`** — body text, tags, buttons, general UI.
- Load both in `index.html` via `<link>` with `display=swap` and Hebrew subset. Expose them in Tailwind as `font-display` (Rubik) and `font-body` (Heebo); `body` defaults to Heebo.

### Palette
Define these as Tailwind theme tokens and **always use the tokens** — never hardcode hex values in components.

| Token | Hex | Use |
|---|---|---|
| `cream` | `#FAF7F2` | App background (warm oat/cream) |
| `forest` | `#1B4332` | Primary — brand, headers, primary buttons |
| `espresso` | `#D97706` | Accent — CTAs, points, flash deals |
| `calm` | `#10B981` | Status: רגוע (calm) |
| `moderate` | `#F59E0B` | Status: בינוני (moderate) |
| `busy` | `#E11D48` | Status: עמוס (busy) |

- Traffic-light statuses (`calm` / `moderate` / `busy`) are reserved for crowd levels only — don't reuse them for unrelated decoration.
- **Dark mode** works by redefining these tokens in `src/index.css` (system preference, or `data-theme` set by `src/hooks/useTheme.ts`). So:
  - Cards/sheets use `bg-surface`, never `bg-white` (only the QR code keeps a white background on purpose).
  - Small green text on page/surface uses `text-calm-ink`; `calm-dark` is only for gradients behind white text.
  - Modal backdrops use `bg-black/50`, never `bg-ink/…` (ink turns light in dark mode).
  - New CSS colors go through `var(--color-…)`, not hex.
- Never rely on color alone for status: pair it with a Hebrew label and/or icon.

## 4. Map RTL Fix (critical)

Leaflet breaks under RTL (tiles misalign, controls flip, panning glitches). Always:

- Wrap the map so `.leaflet-container` has an **explicit height and width** and **`dir="ltr"`**.
- Keep **popups, tooltips, and overlay UI in `dir="rtl"`** so Hebrew content still reads correctly.

```tsx
<div dir="ltr" className="h-[60vh] w-full">
  <MapContainer center={[32.0853, 34.7818]} zoom={14} className="h-full w-full">
    <TileLayer /* OSM, see above */ />
    <Marker position={pos}>
      <Popup>
        <div dir="rtl" className="font-body text-start">…</div>
      </Popup>
    </Marker>
  </MapContainer>
</div>
```

```css
/* src/index.css — safety net */
.leaflet-container { direction: ltr; height: 100%; width: 100%; }
.leaflet-popup-content, .leaflet-tooltip { direction: rtl; text-align: right; }
```

Never remove these rules, and never let the map container collapse to zero height.

## 5. Architecture

```
src/
  components/        # small, focused, reusable components (one per file)
  services/
    cartService.ts   # single source of truth for app data + localStorage persistence
  types/             # shared TypeScript types (Cart, CrowdReport, FlashDeal, …)
  hooks/             # custom hooks (e.g. useCarts, useUserPoints)
  data/              # seed data for carts
  App.tsx
  main.tsx
  index.css
```

- **Modular components.** Keep components small and single-purpose; no giant `App.tsx`.
- **`src/services/cartService.ts`** owns all data access. Components never touch `localStorage` directly.
  - Persists **crowd reports**, **user points**, and **flash deals** to `localStorage` so they survive a page refresh.
  - Use namespaced, versioned keys (e.g. `kafe-panuy:v1:reports`).
  - Wrap every `localStorage` read/write in `try/catch` and fall back to seed data on missing or corrupt JSON.
  - Expose typed functions (e.g. `getCarts()`, `reportCrowd()`, `getPoints()`, `addPoints()`, `getFlashDeals()`, `getAlternatives()`), not raw storage.
- **Smart alternatives**: recommendation logic (distance + current crowd level + active deals) lives in the service layer, not in UI components.
- Shared types live in `src/types/`; no `any`.

### Cart data sources
- Every cart has a `source`: `curated` (seed in `src/data/initialCarts.ts`), `osm` (imported), or `user` (added in the app), and a `region` (`sharon` | `north` | `center` | `south`).
- **Curated seed:** coordinates were checked against OSM/Nominatim to be within ~2 km of their settlement. Ratings, hours, menus and crowd levels are demo values — don't present them as real.
- **OSM import** (`src/services/osmImportService.ts`): free public Overpass API, no key. It's a shared service that is often slow (20–50 s per query) and sometimes "at capacity" — keep the search-area cap, the retry-with-backoff, and the 60 s timeout. Never import unnamed cafés, and never invent ratings for imported or user-added carts (`rating: 0, reviewCount: 0` = "חדש במפה"). Keep the "© OpenStreetMap contributors" attribution.
- **Owner PIN** (`claimCart` / `verifyOwnerPin` in `cartService.ts`) is a client-only demo stand-in for real owner accounts — the hashed PIN lives in the browser, so it is not security. Real owner auth needs a backend; keep the in-app "מצב דמו" note until then.
- **"Notify me when free"** only fires on changes this browser sees (reports, owner updates). Real push alerts need a server.
- Map markers cluster below zoom 14 (`src/utils/clusters.ts`, no extra library).
- Imported/user carts are stored with the curated ones under `kafe-panuy:v2:carts`; `addCarts()` skips duplicate ids and anything within ~40 m of an existing cart.

## 6. Verification

- **After completing every task, run `npm run build`** and confirm it finishes with **zero TypeScript or CSS bundling errors**.
- If the build fails, fix it before reporting the task as done. Never claim success without a passing build.
- Don't silence errors with `// @ts-ignore`, `any`, or by loosening `tsconfig` — fix the root cause.
