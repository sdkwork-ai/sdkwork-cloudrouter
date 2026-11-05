# Catalog And Store Media

Source media for the app catalog and store submissions. Nothing in this directory is imported by application source, bundled into the client, or served from the application origin.

- `icons/` — application icon exports (`icon-1024.png` and platform sizes).
- `covers/` — `<locale>/cover-1920x1080.png`.
- `screenshots/` — `<platform>/<display-type>/<locale>/<nn>-<slug>.png`.
- `previews/` — preview images and `video/<locale>/<slug>.mp4`.
- `store/` — store-specific derivatives.

Empty subdirectories carry a `.gitkeep`; a directory holds real media only when the manifest entry exists.
