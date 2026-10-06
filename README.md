# PhotoDrop

Send photos from your phone to your Meta Ray-Ban Display glasses.

```
 phone  ──upload──▶  your server (HTTPS)  ◀──checks every 2s──  glasses
 /                    keeps last 10 photos                       /glasses
```

The glasses can't reach your phone's camera roll directly, so a tiny server
sits in the middle. Your phone uploads to it; the glasses web app polls it.

- `server.js` — Node server, zero dependencies (Node 18+)
- `public/send.html` — phone page: pick or take a photo, shrinks it to 600px, uploads
- `public/glasses.html` — glasses viewer: fixed 600×600, dark background, D-pad controls

## 1. Deploy (free, ~5 minutes)

The glasses only load **HTTPS** URLs, so it has to be hosted somewhere public.
Render's free tier works:

1. Push this folder to a new GitHub repo.
2. On render.com → **New → Web Service** → pick the repo.
3. Build command: *(leave blank)* · Start command: `node server.js`
4. Add an environment variable `PHOTODROP_KEY` set to a random secret
   (e.g. `zay-` + a few random words). This is what keeps strangers out.
5. Deploy. You'll get a URL like `https://photodrop-xxxx.onrender.com`.

> Free Render instances sleep after ~15 min idle (first load takes ~30s to wake)
> and photos are kept in memory only, so they vanish on restart. Fine for this.

## 2. Add it to your glasses (one time)

1. Make sure developer mode is on in the Meta AI app
   (Settings → App Info → tap App version 5×). Glasses software v125+, Meta AI app v272+.
2. On your phone, open your Render URL and type your secret key.
3. Expand **Add to glasses** — it shows a QR code.
   Look at it with your glasses and confirm. It'll say "unverified"; that's normal.

## 3. Use it

**Phone:** open the URL → *Choose / take photo* → it shows up on the glasses in ~2s.

**Glasses:**

| Input | Action |
| --- | --- |
| ← / ↑ | previous photo (pauses Live) |
| → / ↓ | next photo; reaching the newest resumes Live |
| Select / pinch | toggle Live ↔ Paused |
| Back | exit |

**Live** = automatically jumps to each new photo you send.

Note: the display is additive, so black parts of a photo show as see-through.
Bright photos look best.

## Run locally

```
PHOTODROP_KEY=test node server.js
# phone page:   http://localhost:3000/
# viewer:       http://localhost:3000/glasses?key=test
```

To preview the viewer like the glasses do, use Meta's
*Meta Ray-Ban Display Web App Simulator* Chrome extension. To test on real
glasses before deploying, expose localhost over HTTPS with a tunnel
(e.g. `cloudflared tunnel --url http://localhost:3000`).

## Ideas to extend

- Swap polling for WebSockets/Server-Sent Events for instant delivery
- Add captions (text field on the phone, shown on the bar)
- Store photos in Cloudflare R2 / S3 so they survive restarts
