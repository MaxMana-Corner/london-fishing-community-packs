# London Fishing Companion — community packs

Community-contributed content for the [London Fishing Companion](https://london-fishing-companion-app.netlify.app)
app: field guide packs, shared locations, and map pins.

The app fetches these files read-only and lets people browse and import them.
There is no server anywhere in this — it is a folder of JSON on GitHub, and
that is the whole architecture.

## What's here

```
index.json      the catalog the app reads (generated — do not hand-edit)
stats.json      community up/down vote tallies (generated)
packs/          field guide packs — spots, species, baits, knots, tips
locations/      shared locations, optionally one photo each
pins/           map pins — snag, pollution, hazard, good-spot, access-rating
schema/         the file formats, and how to contribute
moderation/     the word blocklist the automated check uses
```

## Contributing

Read **[schema/README.md](schema/README.md)**. In short: fork, add a JSON
file under the right folder, open a pull request. Don't touch `index.json` —
it's generated on merge.

The easiest way to produce a valid pack is to build the content in the app
and use **Export → Field Guide Pack**.

Every submission is scanned against a word blocklist automatically and read
by a person before it is merged. Anything carrying a photo is always reviewed
by hand.

## Ground rules

- Write what you actually know. Guesses are worse than nothing.
- No content copied from other apps, books or sites you don't own.
- No photos of people. Photograph the place.
- Nothing that names or targets a private individual.
- No spots on private land without permission.

## Licence

This repository is released under **CC0-1.0** (Creative Commons Zero) — see
[LICENSE](LICENSE). Contributions are dedicated to the public domain: anyone
may use, adapt and redistribute this content for any purpose, without asking
and without attribution.

Credit still happens where it matters — every pack, location and pin carries an
`author` display name, and the app shows it in the community directory. You get
named in the product, not in a legal file.

**By opening a pull request you agree to release your contribution under CC0-1.0.**
Only submit content that is yours to give.

