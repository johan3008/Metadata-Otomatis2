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
    
    if (apiKey.length < 10) {
      return res.status(400).json({ error: { message: "Format API Key Gemini terlalu pendek / tidak sahih" } });
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
      
      let rawText = "";
      try {
        rawText = await response.text();
      } catch (e) {
         rawText = "";
      }

      let data: any = {};
      let parseOk = false;
      if (rawText) {
        try {
          data = JSON.parse(rawText);
          parseOk = true;
        } catch (_) {
          // Non-JSON response
        }
      }

      if (!response.ok) {
        console.error("[PROXY] Gemini Downstream Error Response Status:", response.status);
        if (parseOk) {
          console.error("[PROXY] parsed error:", JSON.stringify(data));
        } else {
          console.error("[PROXY] raw error text:", rawText);
        }

        // Standardize the error message format
        let errMsg = "Terjadi kesalahan pada Google API";
        if (data?.error?.message) {
          errMsg = data.error.message;
        } else if (typeof data?.error === "string") {
          errMsg = data.error;
        } else if (rawText) {
          errMsg = rawText.slice(0, 300);
        } else {
          errMsg = `HTTP Error Code: ${response.status}`;
        }

        // Map typical HTTP status codes to helpful Indonesian troubleshooting steps
        if (response.status === 400) {
          if (errMsg.toLowerCase().includes("key") || errMsg.toLowerCase().includes("not valid") || errMsg.toLowerCase().includes("invalid")) {
            errMsg = `Kunci API tidak valid (API Key Salah). Mohon periksa kembali Kunci Gemini Anda dari Google AI Studio!`;
          } else {
            errMsg = `Bad Request (400): ${errMsg}`;
          }
        } else if (response.status === 403) {
          if (errMsg.toLowerCase().includes("location") || errMsg.toLowerCase().includes("not supported") || errMsg.toLowerCase().includes("region")) {
            errMsg = `Wilayah IP server saat ini tidak didukung oleh model "${modelName}". Silakan ganti model ke "gemini-1.5-flash" atau gunakan kunci cadangan lain!`;
          } else {
            errMsg = `Akses Ditolak (403 Forbidden): ${errMsg}`;
          }
        } else if (response.status === 404) {
          errMsg = `Model "${modelName}" tidak ditemukan atau dinonaktifkan di wilayah Anda (404 Not Found). Silakan pilih "gemini-1.5-flash" karena model tersebut didukung secara universal!`;
        } else if (response.status === 429) {
          errMsg = `Batas Kuota Tercapai (429 Rate Limit Meredup): ${errMsg}. Harap tunggu sebentar lalu coba lagi.`;
        }

        return res.status(response.status).json({
          error: {
            message: errMsg,
            raw: data?.error || data || rawText
          }
        });
      }

      // If response is OK, send json
      if (parseOk) {
        return res.status(200).json(data);
      } else {
        return res.status(200).json({ customText: rawText });
      }

    } catch (error: any) {
      console.error("[PROXY] Gemini Network Error:", error);
      return res.status(500).json({ 
        error: { message: `Koneksi Jaringan Gagal: ${error?.message || "Internal server error"}` } 
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

    if (apiKey.length < 10) {
      return res.status(400).json({ error: { message: "Format API Key Groq terlalu pendek / tidak sahih" } });
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
      
      let rawText = "";
      try {
        rawText = await response.text();
      } catch (e) {
         rawText = "";
      }

      let data: any = {};
      let parseOk = false;
      if (rawText) {
        try {
          data = JSON.parse(rawText);
          parseOk = true;
        } catch (_) {
          // Non-JSON response
        }
      }
      
      if (!response.ok) {
        console.error("[PROXY] Groq Downstream Error Response Status:", response.status);
        if (parseOk) {
          console.error("[PROXY] parsed error:", JSON.stringify(data));
        } else {
          console.error("[PROXY] raw error text:", rawText);
        }

        let errMsg = "Terjadi kesalahan pada Groq API";
        if (data?.error?.message) {
          errMsg = data.error.message;
        } else if (typeof data?.error === "string") {
          errMsg = data.error;
        } else if (rawText) {
          errMsg = rawText.slice(0, 300);
        } else {
          errMsg = `HTTP Error Code: ${response.status}`;
        }

        // Map typical Groq HTTP status codes to helpful Indonesian troubleshooting steps
        if (response.status === 401 || response.status === 403) {
          errMsg = `API Key Groq tidak valid atau Kedaluwarsa. Mohon masukkan Kunci Groq yang valid dari dashboard Groq Console!`;
        } else if (response.status === 404) {
          errMsg = `Model Groq "${payload?.model || 'default'}" atau endpoint tidak ditemukan (404 Not Found). Silakan pastikan model aktif terpilih!`;
        } else if (response.status === 429) {
          errMsg = `Batas Kuota Groq Terlampaui (429 Rate Limit): ${errMsg}. Silakan tunggu sebentar atau ganti kunci!`;
        }

        return res.status(response.status).json({
          error: {
            message: errMsg,
            raw: data?.error || data || rawText
          }
        });
      }

      if (parseOk) {
        return res.status(200).json(data);
      } else {
        return res.status(200).json({ customText: rawText });
      }

    } catch (error: any) {
      console.error("[PROXY] Groq Network Error:", error);
      return res.status(500).json({ 
        error: { message: `Koneksi Jaringan Gagal: ${error?.message || "Internal server error"}` } 
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
