import { createServer } from "http";
import { readFile } from "fs/promises";
import { join, extname } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CLIENT_BUILD = join(__dirname, ".vinxi/build/client/_build");
const PORT = 3001;

const mimeTypes = {
  ".js": "application/javascript",
  ".css": "text/css",
  ".html": "text/html",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml"
};

const server = createServer(async (req, res) => {
  try {
    let filePath = req.url === "/" ? "/index.html" : req.url;

    // Remove query strings
    filePath = filePath.split("?")[0];

    // Serve from assets if it's an asset request
    if (
      filePath.startsWith("/assets/") ||
      filePath.startsWith("/_build/assets/")
    ) {
      filePath = filePath.replace(/^\/?_build/, "");
    }

    const fullPath = join(CLIENT_BUILD, filePath);
    const ext = extname(fullPath);
    const contentType = mimeTypes[ext] || "application/octet-stream";

    const content = await readFile(fullPath);
    res.writeHead(200, { "Content-Type": contentType });
    res.end(content);
  } catch (err) {
    // Try serving index.html for SPA routing
    try {
      const indexPath = join(CLIENT_BUILD, "index.html");
      const content = await readFile(indexPath);
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  }
});

server.listen(PORT, () => {
  console.log(`Production test server running at http://localhost:${PORT}`);
  console.log(`Serving files from: ${CLIENT_BUILD}`);
});
