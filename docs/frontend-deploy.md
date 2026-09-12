# Deploying the frontend (Vercel)

The backend is already live on Modal at **https://vyoj--movelog-backend.modal.run**
and needs nothing from this deploy. The frontend is a plain Next.js 15 app that
talks to it over HTTPS; the backend already sends permissive CORS headers, so
any Vercel domain works without a backend change.

## Steps

From a clone of this repo:

```sh
npm install
cd apps/web
npx vercel            # link/create the project when prompted
npx vercel env add NEXT_PUBLIC_API_URL production
#   paste: https://vyoj--movelog-backend.modal.run
npx vercel --prod
```

Set **Root Directory = `apps/web`** if the dashboard asks — this is an npm
workspace and the repo root is not the Next app.

To check the deploy before the demo, open `/admin`: it server-renders the move
list straight from the backend, so if that page lists TAN-001 the wiring is good.

## Pages

| Path | Who opens it |
|---|---|
| `/pack/pack-tan001` | the packer, on an **Android** phone with earbuds |
| `/m/cust-tan001` | the customer's manifest |
| `/admin`, `/admin/TAN-001` | ops dashboard and live event feed |

## Why the packer page needs a real HTTPS origin

`/pack/[token]` asks for the mic (and later the camera) via `getUserMedia`,
which browsers only allow in a secure context. A phone is not `localhost`, so
the page must be served over HTTPS — that is the whole reason it can't just run
off a laptop dev server. Vercel satisfies this.

iOS Safari suspends the mic when the screen locks, so use Android; the page
takes a screen wake lock but cannot defeat that iOS behaviour.

## If Vercel isn't available at demo time

The backend can serve a minimal packer page itself — ask Claude to add the
fallback route. Everything else (ops group, cards, buttons, photos, ClickHouse)
is already on Modal and does not depend on the frontend at all.
