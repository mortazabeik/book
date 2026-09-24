const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

async function startServer(root) {
  const staticRoot = path.join(root, ".vercel", "output", "static");
  const functionRoot = path.join(root, ".vercel", "output", "functions", "__server.func");
  const handler = (await import(pathToFileURL(path.join(functionRoot, "index.mjs")).href)).default;
  const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".pdf": "application/pdf", ".mjs": "text/javascript", ".woff2": "font/woff2", ".ttf": "font/ttf" };

  const server = http.createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url || "/", "http://localhost").pathname);
      const file = path.join(staticRoot, pathname === "/" ? "index.html" : pathname);
      if (file.startsWith(staticRoot) && fs.existsSync(file) && fs.statSync(file).isFile()) {
        res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
        fs.createReadStream(file).pipe(res);
        return;
      }
      const body = req.method === "GET" || req.method === "HEAD" ? undefined : await new Promise((resolve, reject) => {
        const chunks = [];
        req.on("data", (chunk) => chunks.push(chunk));
        req.on("end", () => resolve(Buffer.concat(chunks)));
        req.on("error", reject);
      });
      const request = new Request(`http://localhost${req.url}`, { method: req.method, headers: req.headers, body });
      const response = await handler.fetch(request);
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end(String(error));
    }
  });
  const port = Number(process.env.ELECTRON_PORT || 47832);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  return { server, port };
}

module.exports = { startServer };
