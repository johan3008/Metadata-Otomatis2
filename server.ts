import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Set payload size limits to handle image framing base64 sequences
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API Proxy Route for Gemini
  app.post("/api/proxy/gemini", async (req: express.Request, res: express.Response) => {
    try {
      const { model, key, payload } = req.body;
      if (!key) {
        return res.status(400).json({ error: { message: "API Key Gemini kosong atau tidak valid" } });
      }
      
      const modelName = model || "gemini-2.0-flash";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));
      return res.status(response.status).json(data);
    } catch (error: any) {
      console.error("Gemini Proxy Error:", error);
      return res.status(500).json({ 
        error: { message: error?.message || "Internal server error on Gemini Proxy" } 
      });
    }
  });

  // API Proxy Route for Groq
  app.post("/api/proxy/groq", async (req: express.Request, res: express.Response) => {
    try {
      const { key, payload } = req.body;
      if (!key) {
        return res.status(400).json({ error: { message: "API Key Groq kosong" } });
      }

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${key}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));
      return res.status(response.status).json(data);
    } catch (error: any) {
      console.error("Groq Proxy Error:", error);
      return res.status(500).json({ 
        error: { message: error?.message || "Internal server error on Groq Proxy" } 
      });
    }
  });

  // Vite development / static production middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running internally on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start full-stack server:", error);
});
