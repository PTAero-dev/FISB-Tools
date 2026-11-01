# FISB Tools – Handover Notes
**Working file:** `FISB tools-AEROTHAI_MAY 26.html`  
**Backup file:** `FISB tools-AEROTHAI backup version.html` (untouched – use this to compare or revert)  
**Session date:** May 2026

---

## Changes Made This Session

### 1. Bug Fix – Gradient Tab: Tab-Switch Redraw
**Location:** `switchTab()` function, inside the `setTimeout` callback.  
**Problem:** When switching back to the Gradient tab, the redraw loop used `for (i = 1; i <= gradLegCount)` with a sequential counter. If a middle leg was deleted, `gradLegCount` was never decremented, so the loop tried to redraw deleted leg IDs (wasted/wrong iterations).  
**Fix:** Replaced the counter loop with a DOM scan:
```js
document.querySelectorAll('#grad-legs-container .card').forEach(card => {
    calculateGradient(card.id ? card.id.replace('card-', '') : 'grad');
});
```

---

### 2. Bug Fix – Gradient Tab: `addGradientLeg()` Previous-Leg Lookup
**Location:** `addGradientLeg()` function.  
**Problem:** The function used a backward sequential ID scan (`grad(N-1)`, `grad(N-2)`...) to find the previous leg's end altitude for auto-fill. If a middle leg was deleted, the scan could reference a non-existent ID.  
**Fix:** Replaced with a direct DOM lookup of the last card currently in the container:
```js
const existingCards = Array.from(container.querySelectorAll('.card'));
const lastExistingCard = existingCards[existingCards.length - 1];
const lastPrefix = lastExistingCard.id ? lastExistingCard.id.replace('card-', '') : 'grad';
```

---

### 3. Bug Fix – Gradient Tab: New Leg Title Number
**Location:** `addGradientLeg()` function, card `innerHTML` template.  
**Problem:** New leg cards used `Leg ${gradLegCount}` for their title. If legs were deleted first, the counter was already incremented so the displayed number would skip (e.g., "Leg 4" instead of "Leg 3").  
**Fix:** Changed to use actual DOM count:
```js
Leg ${existingCards.length + 1}
```

---

### 4. Bug Fix – Gradient Tab: `deleteGradientLeg()` Renumbering
**Location:** `deleteGradientLeg()` function.  
**Problem:** Deleting a middle leg left a gap in the visible leg titles (e.g., "Leg 1, Leg 3") with no "Leg 2".  
**Fix:** Added post-delete renumbering of all remaining card titles by DOM order:
```js
document.querySelectorAll('#grad-legs-container .card').forEach((c, idx) => {
    const titleEl = c.querySelector('.card-title');
    if (titleEl && titleEl.firstChild && titleEl.firstChild.nodeType === Node.TEXT_NODE) {
        titleEl.firstChild.textContent = `Leg ${idx + 1} `;
    }
});
```

---

### 5. Bug Fix – Gradient Tab: Auto-Sync Chain Broken After Delete
**Location:** `calculateGradient()` function, Section 3 "AUTO-SYNC NEXT LEG".  
**Problem:** When a leg finishes calculating, it auto-populates the next leg's start altitude. The lookup used `grad(N+1)` sequential ID. If leg 2 was deleted, leg 1 could not sync to leg 3 — the chain was permanently broken.  
**Fix:** Replaced sequential ID lookup with DOM-order lookup (find current card in container, take next sibling):
```js
const allLegCards = Array.from(gradCont.querySelectorAll('.card'));
const currentCard = (prefix === 'grad') ? allLegCards[0] : document.getElementById('card-' + prefix);
const currentIdx = allLegCards.indexOf(currentCard);
const nextCard = allLegCards[currentIdx + 1];
const nextPrefix = nextCard.id ? nextCard.id.replace('card-', '') : 'grad';
```

---

### 6. UI Change – App Title / Header
**Location:** `<title>` tag and sidebar brand text.  
**Change:** `AEROTHAI_FISB tools_APR 26` → `AEROTHAI_FISB tools_MAY 26`

---

### 7. UI Change – Theodolite Dropdown Label
**Location:** `<select id="theo-mode">`, option `value="elev"`.  
**Change:** `Elevation (X)` → `PAPI Lens Height (X)`  
**Reason:** The original label was unclear to users — it didn't explain what "X" referred to.

---

### 8. UI Change – Theodolite Dropdown Consistency
**Location:** Same dropdown, option `value="h1"`.  
**Change:** `Theodolite Hgt (H)` → `Theodolite Height (H)`  
**Reason:** Inconsistency — one option used full word "Height", the other used abbreviation "Hgt".

---

### 9. New Feature – Angle Converter Card (PAPI Tab)
**Location:** PAPI tab, inserted between the PAPI config cards and the Box Reference Guide card.  
**Description:** A new card titled "Angle Converter – Decimal ↔ Deg° Min'" with 4 independent rows. Each row converts between decimal degrees (e.g., `3.50`) and degree-minute format (e.g., `3° 30'`). Conversion is bidirectional and live (type either side, the other updates instantly).

**Input behaviour:**
- Decimal field: `maxlength="4"`, `inputmode="decimal"`, auto-tabs to next row's decimal after 4 chars
- Deg field: `maxlength="1"`, `inputmode="numeric"`, auto-tabs to Min after 1 char
- Min field: `maxlength="2"`, `inputmode="numeric"`, auto-tabs to next row's Deg after 2 chars
- Each row has an individual `×` clear button
- Card header has a **CLEAR** button that clears all 4 rows at once

**JS functions added** (before the VOR MODULE section):
- `convertAngDecToDM(row)` – decimal → Deg/Min
- `convertAngDMToDec(row)` – Deg/Min → decimal
- `clearAngRow(row)` – clears one row

---

### 10. UI Change – PAPI Card Label
**Location:** PAPI dynamic card template, `addPapiCard()` function.  
**Change:** `Comm. Angle (CA) °` → `Comm. Angle (°)`  
**Reason:** Label was wrapping to a new line on narrow screens due to extra length.

---

## If Something Looks Wrong

Compare against **`FISB tools-AEROTHAI backup version.html`** which is the untouched previous version. Key areas to check:

| Symptom | Likely cause | Where to look |
|---|---|---|
| Leg numbers wrong after delete | Renumbering logic | `deleteGradientLeg()` |
| Next leg not auto-filling start alt | Auto-sync chain | `calculateGradient()` Section 3 |
| Canvas blank after tab switch | Redraw loop | `switchTab()` setTimeout |
| Angle Converter not converting | JS functions missing | Search `convertAngDecToDM` |
| Numpad not showing on mobile | `inputmode` attribute | `ang-d-*` and `ang-m-*` inputs |
