# Brutjagd

3D-Browserspiel (three.js) mit Multiplayer über Cloudflare Workers und Durable Objects.

- `public/index.html`: das komplette Spiel (eine Datei)
- `src/worker.js`: Worker und Durable Object für die Multiplayer-Räume (max. 6 Spieler pro Raum)
- `wrangler.toml`: Konfiguration (Worker-Name `brutjagd`)

## Deployen

```
npx wrangler deploy
```

Oder in Cloudflare unter Workers & Pages ein Git-Repository verbinden. Der Worker-Name in `wrangler.toml` muss zum bestehenden Worker passen, damit die Adresse (und damit die Spielstände im Browser) gleich bleibt.

Spielstände liegen im Browser (localStorage) und lassen sich im Menü „Gebiete“ per Code auf andere Geräte übertragen.
