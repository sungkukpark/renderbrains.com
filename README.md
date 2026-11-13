# Three.js Journey

## Tech Stack

- **Framework:** None (Vanilla JavaScript)
- **UI:** HTML, CSS, and JavaScript
- **Build tool:** Vite
- **3D library:** Three.js

## Setup

Download [Node.js](https://nodejs.org/en/download/).
Run this followed commands:

``` bash
# Install dependencies (only the first time)
npm install

# Run the local server at localhost:5189
npm run dev

# Build for production in the dist/ directory
npm run build
```

## Festival Tracker

The public app is available at https://renderbrains.com/festival-tracker/ and
is maintained as a snapshot in `public/festival-tracker/`.

To explicitly refresh it from a local HAESIN checkout:

```sh
npm run sync:festival-tracker -- "D:/wkspaces/zerosketch/haesin"
npm test
npm run build
npm run preview
```

The sync command copies only allowlisted runtime files, replaces the expense seed
with an empty array, and excludes receipts, documentation, and tests. Missing or
invalid source files leave the previous snapshot intact. Review the snapshot diff
before committing, including any new source data intended for public viewing.
Festival data is copied as-is; syncing does not research or regenerate schedules.

The normal build and GitHub Actions deployment require no HAESIN checkout. Builds
validate both the source snapshot and the output for unexpected files, nonempty
expense seeds, and private receipt references. Merging to `main` runs tests,
builds the site, syncs it to the existing S3 bucket, and invalidates CloudFront.
The tracker is part of every site build; existing game deployment exclusions
remain in place. Hidden lecture decks under `static/` are not published.

Tracking and newly entered expenses stay in each visitor's browser localStorage.
They are not shared between devices or synced with the local HAESIN app. To move
existing records, export tracking JSON from the local app and import it on the
public page. Expense JSON uses separate export/import controls; receipt PDFs are
not uploaded or hosted by this page. Filters remain shareable through URL hashes.
