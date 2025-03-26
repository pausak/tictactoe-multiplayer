# Tic-Tac-Toe Multiplayer

A fully responsive, browser-based Tic-Tac-Toe game built with vanilla JavaScript. Supports:

- Play vs AI
- 2-Player Local
- Remote Multiplayer via link sharing (WebSockets)

Deployed using Cloudflare Workers — no backend server required.

---

### Features

- Remote multiplayer with real-time gameplay
- Smart AI opponent
- Rematch system with countdown for remote games
- Shareable room links via copy or native sharing
- Fully responsive design for mobile, tablet, and desktop
- Dark mode toggle (icon-only, top-right)
- Confetti win effect for game winners

---

### Technologies Used

- Vanilla JavaScript
- HTML/CSS
- WebSockets via Cloudflare Durable Objects
- Cloudflare Workers for backend
- Canvas Confetti for win animation

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/tictactoe-multiplayer.git
cd tictactoe-multiplayer
```

---

### 2. Install Wrangler

Install [Wrangler](https://developers.cloudflare.com/workers/wrangler/) CLI tool:

```bash
npm install -g wrangler
```

Or using [pnpm](https://pnpm.io/):

```bash
pnpm add -g wrangler
```

---

### 3. Set Up Environment

Login to your Cloudflare account:

```bash
wrangler login
```

---

### 4. Configure `wrangler.toml`

Make sure your `wrangler.toml` file is configured like this:

```toml
name = "tictactoe"
main = "worker/index.mjs"
compatibility_date = "2024-03-01"
workers_dev = true

[durable_objects]
bindings = [
  { name = "ROOM", class_name = "GameRoom" }
]

[[migrations]]
tag = "v1"
new_classes = ["GameRoom"]

[[kv_namespaces]]
binding = "TIC_TAC_TOE_KV"
id = "<your_kv_namespace_id>"

[build]
command = ""
```

> Update `kv_namespaces.id` with the ID from your Cloudflare dashboard (or remove if not using KV).

---

### 5. Run Locally

Start your local dev server:

```bash
wrangler dev
```

Visit: [http://localhost:8788](http://localhost:8788)

---

### 6. Deploy to Cloudflare

```bash
wrangler publish
```

Your game will be live at your `workers.dev` subdomain or custom domain if configured.

---

## Folder Structure

```
/public
  index.html
  app.js
  style.css

/worker
  index.mjs         (main Worker logic and routing)
  GameRoom.js       (Durable Object handling WebSocket rooms)
```

---

## License

MIT License. Free to use, share, and modify.