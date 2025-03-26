export class GameRoom {
  constructor(state) {
    this.state = state;
    this.clients = []; // Array of { ws, symbol }
  }

  async fetch(request) {
    const upgradeHeader = request.headers.get("Upgrade") || "";

    if (upgradeHeader.toLowerCase() !== "websocket") {
      return new Response("Expected Upgrade: websocket", { status: 426 });
    }

    const pair = new WebSocketPair();
    const client = pair[1];
    const ws = pair[0];

    ws.accept();

    this._cleanDuplicates();

    const takenSymbols = this.clients.map(c => c.symbol);
    const symbol = takenSymbols.includes("X") ? "O" : "X";

    this.clients.push({ ws, symbol });
    ws.send(JSON.stringify({ type: "assign", symbol }));

    if (this.clients.length === 2) {
      for (const client of this.clients) {
        client.ws.send(JSON.stringify({ type: "force_reset", starter: "X" }));
      }
    }

    ws.addEventListener("message", (event) => {
      try {
        const data = JSON.parse(event.data);

        if (
          data.type === "move" ||
          data.type === "rematch_request" ||
          data.type === "rematch_accept" ||
          data.type === "hide_room_info"
        ) {
          for (const client of this.clients) {
            if (client.ws !== ws) {
              client.ws.send(JSON.stringify(data));
            }
          }
        }
      } catch (err) {
        console.error("WebSocket message error:", err);
      }
    });

    ws.addEventListener("close", () => {
      this.clients = this.clients.filter(c => c.ws !== ws);
    });

    return new Response(null, {
      status: 101,
      webSocket: client
    });
  }

  _cleanDuplicates() {
    const cleaned = [];
    const symbolsSeen = new Set();

    for (const client of this.clients) {
      if (
        client.ws.readyState === WebSocket.OPEN &&
        !symbolsSeen.has(client.symbol)
      ) {
        cleaned.push(client);
        symbolsSeen.add(client.symbol);
      } else {
        try {
          client.ws.close();
        } catch (e) {}
      }
    }

    this.clients = cleaned;
  }
}