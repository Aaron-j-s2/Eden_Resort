# Photographs

Source: `/var/www/html/local/resort photos` (31 files). Originals are **read-only** — the pipeline never moves, edits or overwrites them.

## Inventory

| Category | Photos |
| --- | --- |
| The Stream | pavilion-bridge *(homepage hero)*, stream-wide, stream-rapids, bamboo-stream-rocks, stream-still-rock |
| Cottages & Rooms | cottage-evening, cottage-plantation, room-carved-bed, room-tall-ceiling, room-window-view |
| Pavilions & Gardens | lily-pond-pavilion, pond-pavilion-path, arched-hall-interior, arched-window-seats, arched-pavilion-front, pillared-mandapam, plantation-pavilion, garden-buddha |
| Life at Eden | evening-pond-deck, water-lilies, lily-pond-coracle, white-horse, horse-greeting, monkeys-roof |
| Unpublished — identifiable people (consent needed) | rocks-cascade-visitor, stream-bather, dog-by-stream, horse-at-stream, evening-with-dog |

**Excluded:** `a5155da35e682ac2f7ddb3d74f57f752.jpg` (a contact sheet of other photos, not a photograph) and `unnamed.jpg` (141 × 177 px).

**Missing:** no photographs of the **swimming pool**, **dining** or **events in use**. The site shows a clearly labelled "Photograph to come" panel in those places; nothing is substituted with stock or AI imagery.

## Quality notes

- The largest originals are 1024 px wide. Variants are generated at 480 / 768 / 1024 px (never larger than the original) in AVIF and WebP.
- **Enhancement:** for the two full-screen hero photos (pavilion-bridge, stream-wide) a separate `*-enhanced-1600` file is produced with a Lanczos3 upscale and a mild unsharp mask. This is interpolation — it softens pixelation on large screens but does **not** add real detail. Originals and standard variants are kept separately.
- Six photos (water-lilies, lily-pond-coracle, white-horse, horse-greeting, monkeys-roof, evening-with-dog) are only 287 px wide and look soft at full gallery-column width; evening-pond-deck is 238 px. **Higher-resolution originals of these would noticeably improve the gallery.** Ideally supply 2000 px+ originals for the hero and room photos too.

## Adding photos

1. Copy originals into the photo folder.
2. Add an entry to `scripts/image-catalog.json` (`file`, `slug`, `category`, `alt`, optional `focal`, `people`, `enhanceTo`).
3. `npm run images`, then apply the regenerated `supabase/seed.gallery.sql` (new rows only — existing rows are kept).
