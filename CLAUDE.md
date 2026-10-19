# CLAUDE.md — קפה פנוי (Kafe Panuy)

> **קפה פנוי — איפה אין תור עכשיו**

A map app that shows which cafés and coffee carts (עגלות קפה) in Israel are free right now, which are busy, and when each one is usually quiet. It must stay **free to run**: no paid APIs.

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

- Do not add paid services or secret API keys. Everything must run with `npm install && npm run dev`. The only optional config is the free Supabase project (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — public by design).
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

## 3. Visual Design

- **Fonts:** `IBM Plex Sans Hebrew` for all UI (`font-body`); `Secular One` (`font-display`) only for the big status word and the logo chip. Both load from Google Fonts in `index.html`.
- **Color:** cool white surfaces + ink. **Crowd status is the only color** in the UI: `calm` (green), `moderate` (amber), `busy` (red), `closed` (gray). Small colored text uses the `*-ink` variants. Don't use status colors for decoration, and don't add a brand accent color.
- Tokens live in `@theme` in `src/index.css` and are redefined for dark mode there. Components use tokens only (`bg-surface`, `text-muted`, …) — no hex in components.
- Never rely on color alone for status: pair it with the Hebrew label (פנוי / בינוני / עמוס / סגור).
- Map pins: rounded square = café, circle = cart.

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
  lib/               # pure logic + data access, tested in lib.test.ts
    overpass.ts      # cafés/carts from OSM (Overpass), 24h localStorage cache, mirror fallback
    hours.ts         # small opening_hours parser (common OSM subset) + typical-hours fallback
    busyness.ts      # status: live reports > learned profile > estimate; hourly forecast
    backend.ts       # reports + user-added places: Supabase RPC, or localStorage when not configured
    rank.ts          # list ordering + "calmer place nearby" suggestion
    geo.ts, links.ts, storage.ts
  hooks/             # usePlaces, useCrowd, useGeolocation, useNow, useViewport
  components/        # MapView, Sheet, TopBar, PlaceList, PlaceDetail, HourChart, AddPlace, StatusTag, Toast
  App.tsx            # composition + UI state only
supabase/schema.sql  # tables locked (RLS, no policies); all access via SECURITY DEFINER functions
public/_redirects    # Netlify proxy for Overpass mirrors + SPA fallback
public/sw.js         # offline shell + small tile cache (production only)
```

### Honesty rules (critical)
- Every status shows its source: `live` (reports in the last 45 min), `learned` (past reports for that weekday/hour, ≥3 samples), `estimate` (Israeli weekday/hour pattern in `busyness.ts`), or `closed`. Never present an estimate as live, and never invent crowd data, ratings or reviews.
- Guessed opening hours are labeled "שעות משוערות".
- There is no free real-time crowd API; Google Popular Times has no official API and scraping it breaks its terms. Don't add scrapers. The Google Maps link is the free way to show Google's live busyness.

### Data
- Place keys: `osm:<type>/<id>` or `user:<uuid>`. The SQL validates this format.
- Overpass is a shared free service: keep the search-size cap, the cache, and the mirror fallback. Keep the OSM attribution.
- Supabase writes are rate-limited per anonymous device id in SQL. Never open direct table access or add permissive RLS policies.

## 6. Verification

- **After completing every task, run `npm run build` and `npm test`** and confirm zero TypeScript/CSS errors and all tests passing. Add or update tests in `src/**/*.test.ts` when you change logic in `lib/`.
- If you change `supabase/schema.sql`, test it against a real Postgres (roles `anon`, `authenticated`): it must apply twice cleanly and anon must not be able to touch the tables directly.
- If the build fails, fix it before reporting the task as done. Never claim success without a passing build.
- Don't silence errors with `// @ts-ignore`, `any`, or by loosening `tsconfig` — fix the root cause.
