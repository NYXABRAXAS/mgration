# Suryoday APPX to OPTIM Migration Hub

This is a static migration workspace for six product branches. It includes product-wise field catalogs, stage comparison, policy and module assessments, a searchable gap tracker, and a local evidence preview. Choose a product to inspect fields, control types, lookup evidence, required markers and validation notes, or use the comparison and tracker views for migration work.

## Preview locally

From the workspace root, run:

```powershell
python -m http.server 8000 --directory site
```

Open `http://localhost:8000` in a browser. The site fetches `data/migration-data.json`, so it must be served over HTTP rather than opened as a `file://` page.

The tracker saves edits in the current browser's local storage. Use JSON export/import to hand off a review snapshot. There is no shared database or API behind this static site.

## Deploy to Render

The repository's `render.yaml` configures a Render static site with `site/` as the publish directory. Push changes to the connected Git repository; Render can then deploy the static files from that branch.

## Refresh the field data

The site data is in `site/data/migration-data.json`. `build_site_data.py` is an earlier field extraction generator; running it replaces the enriched migration catalog with its older base schema. Do not use it to refresh the deployed site as-is. Refreshing the catalog requires regenerating fields and reapplying the stage, evidence, policy, and gap records.

If the UI source changes, refresh the extraction with `python inspect_fields.py` and merge those changes into the enriched JSON catalog.

## Source limitations shown in the site

- Six ProductId branches are visible in `SuryodayWeb`; confirm the active full Suryoday product master before treating these as the complete portfolio.
- API/backend code and authoritative policy schedules are not supplied. Dynamic lookup values and many rules are therefore marked for confirmation.
- `SuryodayaBank` contains both Suryoday and ESAF references. Confirm the actual deployed APPX source baseline before using legacy ASP.NET pages as Suryoday policy evidence.
- The timestamped screen archives do not include a screen-to-stage index.

The site is an implementation reference. It does not create or alter Suryoday policy values.
