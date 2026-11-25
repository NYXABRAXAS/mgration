# Suryoday APPX to OPTIM Migration Hub

This is a static migration workspace for six product branches. It includes the React product journey field catalogs, a screen/module index from 185 legacy WebForms pages, stage comparison, policy and module assessments, a searchable gap tracker, and a local evidence preview. The public site contains extracted screen/field metadata only; the original source folders, customer documents and screenshot archives are not published.

The WebForms index contains 10,286 control/output entries, including inputs, hidden fields, actions, grid columns and code-behind summary fields. It records explicit markup validators, visible labels, static lookup options and output fields where detectable. Values and rules loaded from database procedures or runtime masters are flagged as unverified.

## Preview locally

From the workspace root, run:

```powershell
python -m http.server 8000 --directory site
```

Open `http://localhost:8000` in a browser. The site fetches `data/migration-data.json`, so it must be served over HTTP rather than opened as a `file://` page.

The tracker saves edits in the current browser's local storage. Use JSON export/import to hand off a review snapshot. There is no shared database or API behind this static site. “OPTIM Mapping Unverified” means the target evidence is not indexed; it is not a confirmed OPTIM defect.

In **Screen walkthrough**, load the APPX and OPTIM ZIP archives to browse their screenshots by filename and compare a selected capture for each candidate stage. ZIPs are read and images are decoded in the browser; they are not sent to the site host. The stage-to-capture assignment and field counterpart edits are saved only in that browser.

## Deploy to Render

The repository's `render.yaml` configures a Render static site with `site/` as the publish directory. Push changes to the connected Git repository; Render can then deploy the static files from that branch.

## Refresh the source index

The site data is in `site/data/migration-data.json` and `site/data/appx-screen-catalog.json`. With the local `SuryodayaBank` source folder present, run `python build_latest_source_catalog.py` to refresh the WebForms screen/field index and module screen links. The original `build_site_data.py` is an earlier field generator; running it replaces the enriched migration catalog with its older base schema, so do not use it to refresh the site as-is.

The current OPTIM archive contains 287 timestamped captures, but only login/OTP is directly indexed. Until target screens are matched, a requirement remains unverified rather than being marked as missing in OPTIM.

## Source limitations shown in the site

- Six ProductId branches are visible in `SuryodayWeb`; confirm the active full Suryoday product master before treating these as the complete portfolio.
- API/backend code and authoritative policy schedules are not supplied. Dynamic lookup values and many rules are therefore marked for confirmation.
- `SuryodayaBank` contains both Suryoday and ESAF references. Confirm the actual deployed APPX source baseline before using legacy ASP.NET pages as Suryoday policy evidence.
- The timestamped screen archives do not include a screen-to-stage index.

The site is an implementation reference. It does not create or alter Suryoday policy values.
