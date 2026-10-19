import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mountMcp } from "./server/mcp.js";
import { mountOAuth } from "./server/oauth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TICKSPOT_BASE_URL = "https://www.tickspot.com";

const app = express();
app.use(express.json());
const oauth = mountOAuth(app, { publicUrl: process.env.MCP_PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}` });
mountMcp(app, { oauth });

// Tickspot's API rejects requests whose User-Agent looks like a browser.
// Browsers refuse to let client JS override User-Agent, so this call has
// to be relayed from the server, which has no such restriction.
app.all("/tickapi/*splat", async (req, res) => {
  const targetPath = req.originalUrl.replace(/^\/tickapi/, "");
  const email = req.headers["x-tick-email"] || "unknown";

  const response = await fetch(`${TICKSPOT_BASE_URL}${targetPath}`, {
    method: req.method,
    headers: {
      Authorization: req.headers.authorization ?? "",
      "User-Agent": `TickClient (${email})`,
      "Content-Type": "application/json",
    },
    body: ["GET", "HEAD"].includes(req.method)
      ? undefined
      : JSON.stringify(req.body),
  });

  const body = await response.text();
  res.status(response.status);
  const contentType = response.headers.get("content-type");
  if (contentType) res.type(contentType);
  res.send(body);
});

app.use(express.static(path.join(__dirname, "build")));
app.get("/*splat", (_req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on port ${port}`));
