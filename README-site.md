# Suryoday APPX to OPTIM Migration Hub

This is a static, searchable reference site for the six product branches identified in the supplied `SuryodayWeb` React source. Select a product, then choose a stage in the left navigation to view its fields, control types, lookup evidence, required markers and validation notes.

## Preview locally

From the workspace root, run:

```powershell
python -m http.server 8000 --directory site
```

Open `http://localhost:8000` in a browser. The site fetches `data/migration-data.json`, so it must be served over HTTP rather than opened as a `file://` page.

## Deploy to Render

The workspace includes `render.yaml`, configured as a Render static site with `site/` as the publish directory. The current workspace is not a Git repository, so it cannot be connected to Render as-is. Put these site files and `render.yaml` in a Git repository, push it to a Git provider, then create a Render Blueprint from that repository. Render supports static sites in a Blueprint with `type: web`, `runtime: static`, and `staticPublishPath`; this configuration follows that format. See [Render Blueprint reference](https://render.com/docs/blueprint-spec) and [Render static sites](https://render.com/docs/static-sites).

## Refresh the field data

The generated JSON is in `site/data/migration-data.json`. To regenerate it from the supplied field extraction, run:

```powershell
python build_site_data.py
```

If the UI source changes, refresh the extraction first with `python inspect_fields.py` and then regenerate the JSON.

## Source limitations shown in the site

- Six ProductId branches are visible in `SuryodayWeb`; confirm the active full Suryoday product master before treating these as the complete portfolio.
- API/backend code and authoritative policy schedules are not supplied. Dynamic lookup values and many rules are therefore marked for confirmation.
- `SuryodayaBank` contains both Suryoday and ESAF references. Confirm the actual deployed APPX source baseline before using legacy ASP.NET pages as Suryoday policy evidence.
- The timestamped screen archives do not include a screen-to-stage index.

The site is an implementation reference. It does not create or alter Suryoday policy values.
