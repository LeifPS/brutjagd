# Brutjagd online (Cloudflare)

1. `cd cloudflare && npm i -g wrangler` (oder `npx wrangler ...`)
2. `npx wrangler login`
3. `npx wrangler deploy`
4. Die ausgegebene URL öffnen. Freunde: gleiche URL mit `?raum=meinraum` – wer denselben Raumnamen hat, ist im selben Raum (max. 6 Spieler, 6 Plots).

Es wird nichts serverseitig gespeichert (Durable Object hält nur den Live-Zustand). Spielstände liegen im Browser.
Lokal testen: `npx wrangler dev --local`.
