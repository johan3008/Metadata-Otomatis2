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
    const { model, key, payload } = req.body;
    const modelName = model || "gemini-2.0-flash";
    const apiKey = String(key || "").trim();
    
    console.log(`[PROXY] Gemini Request: model=${modelName}, hasKey=${!!apiKey}`);
    
    if (!apiKey) {
      return res.status(400).json({ error: { message: "API Key Gemini kosong atau tidak valid" } });
    }
    
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      console.log(`[PROXY] Gemini Downstream Status: ${response.status}`);
      const data = await response.json().catch(() => ({}));
      
      if (!response.ok) {
        console.error("[PROXY] Gemini Downstream Error Response:", data);
        // If Google returned a 404, clearly label it
        if (response.status === 404) {
          const detailMsg = data?.error?.message || "Model tidak ditemukan atau dinonaktifkan di wilayah Anda";
          return res.status(404).json({
            error: { message: `Google API 404: ${detailMsg} (Model: ${modelName})` }
          });
        }
      }

      return res.status(response.status).json(data);
    } catch (error: any) {
      console.error("[PROXY] Gemini Network Error:", error);
      return res.status(500).json({ 
        error: { message: `Proxy Network Error: ${error?.message || "Internal server error"}` } 
      });
    }
  });

  // API Proxy Route for Groq
  app.post("/api/proxy/groq", async (req: express.Request, res: express.Response) => {
    const { key, payload } = req.body;
    const apiKey = String(key || "").trim();
    
    console.log(`[PROXY] Groq Request: model=${payload?.model || "default"}, hasKey=${!!apiKey}`);
    
    if (!apiKey) {
      return res.status(400).json({ error: { message: "API Key Groq kosong atau tidak valid" } });
    }

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload)
      });

      console.log(`[PROXY] Groq Downstream Status: ${response.status}`);
      const data = await response.json().catch(() => ({}));
      
      if (!response.ok) {
        console.error("[PROXY] Groq Downstream Error Response:", data);
        if (response.status === 404) {
          const detailMsg = data?.error?.message || "Endpoint Groq tidak ditemukan";
          return res.status(404).json({
            error: { message: `Groq API 404: ${detailMsg}` }
          });
        }
      }

      return res.status(response.status).json(data);
    } catch (error: any) {
      console.error("[PROXY] Groq Network Error:", error);
      return res.status(500).json({ 
        error: { message: `Proxy Network Error: ${error?.message || "Internal server error"}` } 
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
