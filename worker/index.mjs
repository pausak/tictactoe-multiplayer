import { getAssetFromKV } from "@cloudflare/kv-asset-handler";
import { GameRoom } from './GameRoom.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const upgrade = request.headers.get("Upgrade");

    if (url.searchParams.has("room") && upgrade === "websocket") {
      const roomId = url.searchParams.get("room");
      const id = env.GAME_ROOMS.idFromName(roomId);
      const stub = env.GAME_ROOMS.get(id);
      return stub.fetch(request);
    }

    try {
      return await getAssetFromKV(
        { request, waitUntil: ctx.waitUntil.bind(ctx) },
        { ASSET_NAMESPACE: env.__STATIC_CONTENT }
      );
    } catch (err) {
      return new Response("Asset fetch failed: " + err.message, { status: 500 });
    }
  }
};

export { GameRoom };