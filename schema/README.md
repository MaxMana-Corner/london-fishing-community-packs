# File formats

Everything in this repository is plain JSON, fetched read-only by the app.
There is no server. If you can write JSON and open a pull request, you can
contribute; from a later release you will also be able to submit straight
from inside the app.

## The three entry types

| Type | Folder | What it is |
|---|---|---|
| `pack` | `packs/` | A Field Guide Pack — custom spots, species, baits, knots and tips |
| `locations` | `locations/` | Spots only, optionally with one photo each |
| `pins` | `pins/` | Map pins — snag, pollution, hazard, good-spot, access-rating |

`pack` and `locations` **use the same file format** — a `locations` file is
simply a pack whose catalog contains only `spots`. They are separated so the
in-app directory can list them apart.

## Pack / locations format

This is exactly the app's own "Field Guide Pack" export, so the safest way to
make one is to build the content in the app and use **Export → Field Guide
Pack**. The required envelope:

```json
{
  "app": "london-fishing-companion",
  "schema": 2,
  "kind": "pack",
  "exportedAt": "2026-09-06T00:00:00Z",
  "note": "One line on what this pack is.",
  "catalog": { "spots": [], "species": [], "baits": [], "knots": [], "tips": [] }
}
```

Rules the importer enforces — a file that breaks them is rejected whole, never
partly merged:

- `app` must be exactly `london-fishing-companion`.
- `schema` must not be higher than the app's own (currently `2`).
- Every record needs a **unique, non-empty string `id`**.
- Spots, species, baits and knots need a **non-empty `name`**. Tips do not.
- Every record should carry `"custom": true` and an `updatedAt` epoch-ms
  number. Merging is by `id`, and the **newer `updatedAt` wins**.
- Only user-created content travels. Do not include the app's built-in spots,
  species, baits, knots or tips — they already exist in every copy and would
  create duplicates.

See `packs/example-starter-pack.json` for a working template with every field
annotated.

## Pins format

```json
{
  "app": "london-fishing-companion",
  "schema": 1,
  "kind": "pins",
  "exportedAt": "2026-09-06T00:00:00Z",
  "note": "One line on what this pin set covers.",
  "pins": []
}
```

Each pin:

| Field | Required | Notes |
|---|---|---|
| `id` | yes | Unique, non-empty string |
| `type` | yes | `snag` · `pollution` · `hazard` · `good-spot` · `access-rating` |
| `ll` | yes | `[latitude, longitude]`, decimal degrees |
| `title` | yes | Short, factual |
| `note` | no | A few sentences at most |
| `author` | no | Display name only — never an email or account handle |
| `createdAt` / `updatedAt` | yes | Epoch milliseconds |
| `spotId` | access-rating only | The `id` of the spot the rating belongs to |
| `access` | access-rating only | `{ parking, walk, footing, amenities, cost }`, each 1–5 |

Pins **do not expire**. They are sorted by community score, and nothing is
ever hidden automatically — a heavily downvoted pin is flagged for a human to
look at.

## Photos

A location may carry **one** photo, committed alongside it as
`locations/<id>/photo.webp` and referenced from the record.

- Longest edge **1600 px max**, WebP, **under 500 KB**.
- **A photo of the place, not of people.** No faces, no licence plates, no
  identifying details of anyone who did not ask to be in it.
- Any submission carrying a photo is held for manual review before it appears
  in the app — an automated word filter cannot check an image.

## Contributing

1. Fork this repository.
2. Add your file under `packs/`, `locations/` or `pins/`.
3. Open a pull request. Do **not** edit `index.json` — it is generated.
4. An automated check scans your text against `moderation/blocklist.txt`, and
   a human reads the change before it is merged.

Write what you actually know. A pack full of guesses is worse than no pack.

## What gets rejected

- Content copied from another app, book or website you do not own.
- Anything naming or targeting a private individual.
- Spots on private land without permission, or anywhere access is prohibited.
- Photos containing people.
- Deliberately wrong safety or regulation information.

## Licence

This repository is **CC0-1.0** — a public domain dedication. **By opening a
pull request you agree to release your contribution under CC0-1.0**, meaning
anyone may use, adapt and redistribute it for any purpose without asking and
without crediting you.

Your `author` display name still travels with the record and is shown in the
app's community directory, so contributors are credited in the product.

Only submit content that is yours to give. Do not paste in material from
another app, book, website or map you do not own — CC0 means you are
dedicating it to the public domain, which you cannot do with someone else's
work.
