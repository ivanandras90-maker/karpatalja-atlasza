# Kárpátalja Atlasz

Professzionális, moduláris frontend szerkezet az eredeti atlasz funkcióinak megtartásával.

## Indítás
A helyi JSON/fetch működés miatt az oldalt helyi HTTP szerveren érdemes futtatni, nem közvetlen `file://` URL-ről. Például VS Code Live Server vagy Python HTTP szerver használható.

## Fő modulok
- `frontend/index.html` — főoldal
- `frontend/geography.html` — interaktív földrajzi térkép
- `frontend/history.html` — interaktív történelmi térkép
- `frontend/gallery.html` — galéria
- `frontend/sources.html` — források
- `admin/index.html` — admin felület
- `data/atlasz.json` — központi atlaszadat
