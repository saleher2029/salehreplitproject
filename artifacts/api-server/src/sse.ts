import type { Response } from "express";

const clients = new Set<Response>();

export function addSSEClient(res: Response) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  res.write("data: connected\n\n");

  clients.add(res);

  res.on("close", () => {
    clients.delete(res);
  });
}

export function broadcastChange(type: string = "update") {
  const payload = `data: ${JSON.stringify({ type, ts: Date.now() })}\n\n`;
  for (const res of clients) {
    try {
      res.write(payload);
    } catch {
      clients.delete(res);
    }
  }
}
