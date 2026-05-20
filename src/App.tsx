import React, { useState, useEffect, useRef } from 'react';
import { 
  Zap, 
  KeyRound, 
  Sliders, 
  Upload, 
  CheckSquare, 
  Trash2, 
  Sparkles, 
  FileText, 
  Tag, 
  Layers, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  CheckCircle2, 
  RefreshCw, 
  TrendingUp, 
  FileCheck, 
  VolumeX, 
  HelpCircle,
  Video,
  PenTool,
  Image as ImageIcon,
  FolderOpen,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Import Types and Constants
import { AssetType, QueueItem, AuthProvider, TargetPlatforms, Metadata } from './types';
import { 
  BANNED_TRADEMARKS, 
  TRENDING_KEYWORDS, 
  SHUTTERSTOCK_CATEGORIES, 
  ADOBE_STOCK_CATEGORIES, 
  DREAMSTIME_CATEGORIES, 
  VECTEEZY_CATEGORIES, 
  CANVA_CATEGORIES 
} from './constants';
import { 
  scanIPViolations, 
  measureSEOQuality, 
  resizeAndCompressImage, 
  extractVideoFrames, 
  generatePlatformCSV 
} from './utils';

export default function App() {
  // Application states
  const [items, setItems] = useState<QueueItem[]>([]);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [currentAssetType, setCurrentAssetType] = useState<AssetType>('image');
  const [activeAuthProvider, setActiveAuthProvider] = useState<AuthProvider>('gemini');
  const [sidebarTab, setSidebarTab] = useState<'seo' | 'api'>('seo');
  
  // API key states (5 slots each for token rotation)
  const [geminiKeys, setGeminiKeys] = useState<string[]>(['', '', '', '', '']);
  const [groqKeys, setGroqKeys] = useState<string[]>(['', '', '', '', '']);
  
  // Selected Models for each engine
  const [selectedGeminiModels, setSelectedGeminiModels] = useState<Record<string, boolean>>({
    'gemini-3-flash-preview': true,
    'gemini-3.1-flash-lite': true,
    'gemini-2.5-flash-preview-05-20': true,
    'gemini-2.0-flash': true,
    'gemini-3.1-pro-preview': false,
    'gemini-1.5-flash': false,
  });

  const [selectedGroqModels, setSelectedGroqModels] = useState<Record<string, boolean>>({
    'llama-3.1-8b-instant': true,
    'mixtral-8x7b-32768': true,
    'llama-3.2-90b-vision-preview': false,
    'meta-llama/llama-4-maverick-17b-128e-instruct': false,
    'meta-llama/llama-4-scout-17b-16e-instruct': false,
  });

  // Toggles & Customization State
  const [speed3x, setSpeed3x] = useState<boolean>(true);
  const [noLimitMode, setNoLimitMode] = useState<boolean>(false);
  const [targetPlatforms, setTargetPlatforms] = useState<TargetPlatforms>({
    shutterstock: true,
    adobeStock: true,
    freepik: false,
    istock: false,
    vecteezy: false,
    canva: false,
    dreamstime: false,
  });

  // Sliders for dynamic constraints
  const [titleLength, setTitleLength] = useState<number>(80);
  const [descLength, setDescLength] = useState<number>(200);
  const [keywordsCount, setKeywordsCount] = useState<number>(40);
  const [keyConcepts, setKeyConcepts] = useState<string>('');
  const [activePrefTab, setActivePrefTab] = useState<'title' | 'desc' | 'keywords'>('title');
  const [showTrending, setShowTrending] = useState<boolean>(false);

  // Queue Vault & Accordeons Visibility
  const [isGeminiVaultOpen, setIsGeminiVaultOpen] = useState<boolean>(false);
  const [isGroqVaultOpen, setIsGroqVaultOpen] = useState<boolean>(false);

  // Connection diagnostics states
  const [testGeminiMsg, setTestGeminiMsg] = useState<string>('Belum diuji');
  const [testGeminiStatus, setTestGeminiStatus] = useState<'idle' | 'testing' | 'success' | 'err'>('idle');
  const [testGroqMsg, setTestGroqMsg] = useState<string>('Belum diuji');
  const [testGroqStatus, setTestGroqStatus] = useState<'idle' | 'testing' | 'success' | 'err'>('idle');

  // Loading & Progress metrics
  const [isProcessingAll, setIsProcessingAll] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Rate Limit cooldown trackers
  const [modelCooldowns, setModelCooldowns] = useState<Record<string, number>>({});
  const [activeGeminiKeyIndex, setActiveGeminiKeyIndex] = useState<number>(0);
  const [activeGroqKeyIndex, setActiveGroqKeyIndex] = useState<number>(0);

  // Uploader ref & drag over helper
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Load API keys from LocalStorage on mount
  useEffect(() => {
    const loadedGemini = [...geminiKeys];
    for (let i = 1; i <= 5; i++) {
      const key = localStorage.getItem(`shophub_api_key_${i}`);
      if (key) {
        loadedGemini[i - 1] = key;
      }
    }
    setGeminiKeys(loadedGemini);

    const loadedGroq = [...groqKeys];
    for (let i = 1; i <= 5; i++) {
      const key = localStorage.getItem(`shophub_groq_key_${i}`);
      if (key) {
        loadedGroq[i - 1] = key;
      }
    }
    setGroqKeys(loadedGroq);

    // Auto open API Vaults if keys exist
    const hasGemini = loadedGemini.some(k => k.trim().length > 5);
    const hasGroq = loadedGroq.some(k => k.trim().length > 5);

    if (hasGemini) setIsGeminiVaultOpen(true);
    if (hasGroq) setIsGroqVaultOpen(true);

    if (hasGroq && !hasGemini) {
      setActiveAuthProvider('groq');
    }
  }, []);

  // Sync state modifications back to LocalStorage
  const handleGeminiKeyChange = (index: number, val: string) => {
    const updated = [...geminiKeys];
    updated[index] = val.trim();
    setGeminiKeys(updated);
    localStorage.setItem(`shophub_api_key_${index + 1}`, val.trim());
  };

  const handleGroqKeyChange = (index: number, val: string) => {
    const updated = [...groqKeys];
    updated[index] = val.trim();
    setGroqKeys(updated);
    localStorage.setItem(`shophub_groq_key_${index + 1}`, val.trim());
  };

  // Toggle checklist platform
  const togglePlatform = (key: keyof TargetPlatforms) => {
    setTargetPlatforms(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Dynamic model activations helpers
  const toggleGeminiModel = (model: string) => {
    setSelectedGeminiModels(prev => ({ ...prev, [model]: !prev[model] }));
  };

  const toggleGroqModel = (model: string) => {
    setSelectedGroqModels(prev => ({ ...prev, [model]: !prev[model] }));
  };

  // Extract non-blank keys
  const getActiveKeys = (provider: 'gemini' | 'groq'): string[] => {
    const arr = provider === 'gemini' ? geminiKeys : groqKeys;
    return arr.map(k => k.trim()).filter(k => k.length > 5);
  };

  // Connection testing - Gemini
  const testGeminiConn = async () => {
    const active = getActiveKeys('gemini');
    if (active.length === 0) {
      setTestGeminiStatus('err');
      setTestGeminiMsg('❌ Kode Kosong');
      return;
    }

    setTestGeminiStatus('testing');
    setTestGeminiMsg(`⏳ Memeriksa ${active.length} Kunci...`);

    // Determine testing model
    const testModel = 'gemini-2.0-flash';
    let working = 0;
    let lastErr = '';

    for (let i = 0; i < active.length; i++) {
      const k = active[i];
      try {
        const response = await fetch('/api/proxy/gemini', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: testModel,
            key: k,
            payload: {
              contents: [{ parts: [{ text: "Hi" }] }],
              generationConfig: { maxOutputTokens: 5 }
            }
          })
        });

        if (response.ok) {
          working++;
        } else {
          const body = await response.json().catch(() => ({}));
          lastErr = body?.error?.message || `HTTP ${response.status}`;
        }
      } catch (e: any) {
        lastErr = e.message || 'CORS / Network Error';
      }
    }

    if (working === active.length) {
      setTestGeminiStatus('success');
      setTestGeminiMsg(`✅ Semua Aktif (${working}/${active.length}) • Stable`);
    } else if (working > 0) {
      setTestGeminiStatus('success');
      setTestGeminiMsg(`⚠️ Sebagian Aktif (${working}/${active.length})`);
    } else {
      setTestGeminiStatus('err');
      setTestGeminiMsg(`❌ Gagal: ${lastErr.slice(0, 45)}`);
    }
  };

  // Connection testing - Groq
  const testGroqConn = async () => {
    const active = getActiveKeys('groq');
    if (active.length === 0) {
      setTestGroqStatus('err');
      setTestGroqMsg('❌ Kode Kosong');
      return;
    }

    setTestGroqStatus('testing');
    setTestGroqMsg(`⏳ Memeriksa ${active.length} Kunci...`);

    let working = 0;
    let lastErr = '';

    for (let i = 0; i < active.length; i++) {
      const k = active[i];
      try {
        const response = await fetch('/api/proxy/groq', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            key: k,
            payload: {
              model: 'llama-3.1-8b-instant',
              messages: [{ role: 'user', content: 'Hi' }],
              max_tokens: 1
            }
          })
        });

        if (response.ok) {
          working++;
        } else {
          const body = await response.json().catch(() => ({}));
          lastErr = body?.error?.message || `HTTP ${response.status}`;
        }
      } catch (e: any) {
        lastErr = e.message || 'Network / API Error';
      }
    }

    if (working === active.length) {
      setTestGroqStatus('success');
      setTestGroqMsg('✅ Semua Aktif (' + working + '/' + active.length + ')');
    } else if (working > 0) {
      setTestGroqStatus('success');
      setTestGroqMsg('⚠️ Sebagian Aktif (' + working + '/' + active.length + ')');
    } else {
      setTestGroqStatus('err');
      setTestGroqMsg('❌ Gagal: ' + lastErr.slice(0, 45));
    }
  };

  // Handle Drag Events for file area uploader
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToQueue(Array.from(e.dataTransfer.files));
    }
  };

  const triggerUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToQueue(Array.from(e.target.files));
    }
  };

  // Add files to the reactive state queue
  const addFilesToQueue = (files: File[]) => {
    const newItems: QueueItem[] = [];

    files.forEach((file, idx) => {
      const id = `${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 9)}`;

      const item: QueueItem = {
        id,
        name: file.name,
        type: currentAssetType,
        preview: null,
        base64: '',
        videoFrames: [],
        status: 'pending',
        errorMsg: null,
        metadata: {
          title: '',
          description: '',
          keywords: [],
          categories: {}
        },
        settings: {
          titleLength,
          descLength,
          keywordsCount,
          keyConcepts
        }
      };

      if (currentAssetType === 'video') {
        // Asynchronously extract and compress video frames in frontend
        extractVideoFrames(file).then(async (frames) => {
          const compressed: string[] = [];
          for (const f of frames) {
            const comp = await resizeAndCompressImage(f, 800, 800);
            compressed.push(comp);
          }

          setItems(prevItems => 
            prevItems.map(i => {
              if (i.id === id) {
                return {
                  ...i,
                  videoFrames: compressed,
                  preview: compressed[1] ? `data:image/jpeg;base64,${compressed[1]}` : null
                };
              }
              return i;
            })
          );
        });
      } else if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const raw = (reader.result as string).split(',')[1];
          const comp = await resizeAndCompressImage(raw, 1024, 1024);

          setItems(prevItems => 
            prevItems.map(i => {
              if (i.id === id) {
                return {
                  ...i,
                  base64: comp,
                  preview: `data:image/jpeg;base64,${comp}`
                };
              }
              return i;
            })
          );
        };
        reader.readAsDataURL(file);
      } else {
        // Vector icon support mockup
        item.preview = 'vector-placeholder';
      }

      newItems.push(item);
    });

    setItems(prev => [...prev, ...newItems]);
    setGlobalError(null);
  };

  // Remove specific queue item
  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    if (expandedItemId === id) {
      setExpandedItemId(null);
    }
  };

  // Clear all list
  const clearAllQueue = () => {
    setItems([]);
    setExpandedItemId(null);
    setGlobalError(null);
  };

  // Update field value within active elements editing form
  const updateItemField = (itemId: string, field: 'title' | 'description' | 'keywords' | 'categories', val: any) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const updatedMeta = { ...item.metadata };
        if (field === 'keywords') {
          if (Array.isArray(val)) {
            updatedMeta.keywords = val;
          } else if (typeof val === 'string') {
            updatedMeta.keywords = val.split(',').map(k => k.trim()).filter(Boolean);
          }
        } else if (field === 'categories') {
          updatedMeta.categories = { ...updatedMeta.categories, ...val };
        } else {
          updatedMeta[field] = val;
        }
        return { ...item, metadata: updatedMeta };
      }
      return item;
    }));
  };

  // Copy to clipboard helper
  const [copiedStatus, setCopiedStatus] = useState<Record<string, boolean>>({});

  const copyToClipboard = (text: string, refId: string) => {
    if (!text) return;
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);

    setCopiedStatus(prev => ({ ...prev, [refId]: true }));
    setTimeout(() => {
      setCopiedStatus(prev => ({ ...prev, [refId]: false }));
    }, 1500);
  };

  // System instructions Builder
  const buildPromptInstructions = (item: QueueItem) => {
    const platformsStr = Object.keys(targetPlatforms)
      .filter(p => targetPlatforms[p as keyof TargetPlatforms])
      .join(', ');
      
    const minT = Math.floor(item.settings.titleLength * 0.8);
    const maxT = Math.ceil(item.settings.titleLength * 1.2);
    const minD = Math.floor(item.settings.descLength * 0.8);
    const maxD = Math.ceil(item.settings.descLength * 1.2);
    const kwTarget = item.settings.keywordsCount;

    let specificGuides = "";
    if (item.type === 'video') {
      specificGuides = `
CONTOH FORMULA VIDEO TITLE & KEYWORDS:
- Frame 1 = wanita mengetik laptop, Frame 2 = chart naik di layar, Frame 3 = senyum senang.
- Layer 1 (Isi): "Co-worker Typing on Laptop Beside Rising Business Graph"
- Layer 2 (Alur): "Evolving analytical data and expressing accomplishment"
- Layer 3 (Konsep): Success, digital transformation.
- HASIL TITLE: "Young Dynamic Female Worker Analyzing Financial Growth Charts on Laptop and Celebrating Innovation Concept"
- KEYWORDS video wajib berisi: aksi progresif ("growing", "transitioning", "analyzing") serta konsep komersial. Dilarang memasukkan "4k", "resolution", "frame rate", "camera".`;
    } else if (item.type === 'vector') {
      specificGuides = `
CONTOH FORMULA VEKTOR TITLE & KEYWORDS:
- Vektor panah naik + diagram lingkaran berwarna neon.
- Layer 1 (Isi): "Bright Neon Pie Chart with Upward Pointing Arrow"
- Layer 2 (Alur): "Connecting financial statistics with market trends"
- Layer 3 (Konsep): Profit, financial report.
- HASIL TITLE: "Vivid Neon Circular Infographic Pie Chart with Growing Arrow Symbolizing Profit Growth and Business Statistics Analysis"
- KEYWORDS vector wajib berisi: "vector asset", "icon", "infographic element", "graphic resource" serta bebas format teknis.`;
    } else {
      specificGuides = `
CONTOH FORMULA FOTO TITLE & KEYWORDS:
- Foto close-up kopi pagi di atas meja bersanding dengan kacamata ditiup sinar matahari fajar.
- Layer 1 (Isi): "Cozy Coffee Cup on Wooden Table with Glasses"
- Layer 2 (Alur): "Morning sunlight breathing warmth into the frame"
- Layer 3 (Konsep): Starting the day, freelance mood.
- HASIL TITLE: "Steaming Hot Morning Coffee on Rustic Table Set with Reading Glasses Embracing Freelance Lifestyle"
- KEYWORDS harus benar-benar valid, menggambarkan apa yang secara fisik nyata di foto + suasana + commercial intent.`;
    }

    return `ROLE: Pakar Senior Metadata Hub Microstock & Specialist SEO Komersial.
ASSET TYPE: ${item.type}
TARGET AGENSI: ${platformsStr || 'Shutterstock, Adobe Stock, Freepik, Canva'}

MISI:
Buatlah judul komersial yang komprehensif, deskripsi kreatif yang memikat, klasifikasi kategori per platform, serta tag kata kunci ramah mesin pencari yang sepenuhnya "GROUNDED" (berpijak nyata) pada aset ini.

ATURAN METADATA 100% SUKSES:
1. JUDUL SEO: Wajib mengandung formula 3-Layer: [Elemen fisik nyata] + [Aksi / Alur cerita] + [Makna komersial / Niche]. Panjang harus ${minT}-${maxT} karakter.
2. DESKRIPSI: Ceritakan alur visual gambar secara natural dan menarik bagi pembeli antara ${minD}-${maxD} karakter.
3. KATA KUNCI (KEYWORDS): Hasilkan TEPAT ${kwTarget} kata kunci unik. No spasi (single keywords).
   - Urutan 1-10: Subjek & visual dominan nyata yang terlihat di frame.
   - Urutan 11-25: Aksi, gerak tubuh, emosi, warna, pencahayaan.
   - Urutan 26-${kwTarget}: Hubungan konsep bisnis, kegunaan komersial, trend microstock.
   ${item.settings.keyConcepts ? `- ⭐ PRIORITAS UTAMA: Kata kunci "${item.settings.keyConcepts}" wajib ditempatkan di posisi 1-5!` : ''}
4. LEGAL & TRADEMARK SAFETY: Hindari nama brand terlarang (Nike, Apple, iPhone, BMW, Sony, dsb). Ganti dengan nama generik (modern smartphone, athletic shoes, luxury car, dsb). Dilarang keras menulis brand kamera!
5. KATEGORI PLATFORM RESMI (WAJIB PILIH DARI DAFTAR DI BAWAH): 
   - Shutterstock: Berikan "shutterstock1" dan "shutterstock2" berisi 2 kategori resmi berbeda yang dipilih HANYA dari daftar ini: [${SHUTTERSTOCK_CATEGORIES.slice(0, 30).join(', ')}]
   - Adobe Stock: Berikan "adobeStock" berisi kategori tunggal yang wajib dipilih HANYA dari daftar ini: [${ADOBE_STOCK_CATEGORIES.slice(0, 25).join(', ')}]
   - Dreamstime: Berikan "dreamstime" berisi kategori tunggal yang wajib dipilih HANYA dari daftar ini: [${DREAMSTIME_CATEGORIES.slice(0, 20).join(', ')}]
   - Vecteezy: Berikan "vecteezy" berisi kategori tunggal yang wajib dipilih HANYA dari daftar ini: [${VECTEEZY_CATEGORIES.slice(0, 20).join(', ')}]
   - Canva: Berikan "canva" berisi kategori tunggal yang wajib dipilih HANYA dari daftar ini: [${CANVA_CATEGORIES.slice(0, 10).join(', ')}]

${specificGuides}

OUTPUT WAJIB: KELUARKAN HANYA FORMAT JSON BERIKUT (TANPA RAW TEXT / BACKTICKS):
{
  "title": "Judul 3-Layer Bahasa Inggris padat SEO, panjang sekitar ${item.settings.titleLength} karakter",
  "description": "Deskripsi kreatif Bahasa Inggris berbobot komersial, panjang sekitar ${item.settings.descLength} karakter",
  "keywords": [sekumpulan kata kunci tunggal dipisah koma sejumlah tepat ${kwTarget} elemen unik],
  "categories": {
    "shutterstock1": "Kategori ke-1",
    "shutterstock2": "Kategori ke-2 berbeda",
    "adobeStock": "Kategori Adobe",
    "dreamstime": "Kategori Dreamstime",
    "vecteezy": "Kategori Vecteezy",
    "canva": "Kategori Canva"
  }
}`;
  };

  // POST PROCESSING: Validate and Repair output payload structures
  const repairParsedOutput = (parsed: any, settings: any, fileName: string): Metadata => {
    // 1. Repair Title
    let repairedTitle = (parsed?.title || '').toString().trim();
    const minT = Math.floor(settings.titleLength * 0.8);
    const maxT = Math.ceil(settings.titleLength * 1.2);

    if (repairedTitle.length < minT) {
      const suffixes = [" for commercial lifestyle use", " designed with creative concepts", " perfect for advertising design", " ideal for social media contents", " in high quality modern style"];
      const hash = fileName ? fileName.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) : Date.now();
      repairedTitle += suffixes[hash % suffixes.length];
    }
    if (repairedTitle.length > maxT) {
      repairedTitle = repairedTitle.substring(0, maxT).trim();
    }

    // 2. Repair Description
    let repairedDesc = (parsed?.description || '').toString().trim();
    const minD = Math.floor(settings.descLength * 0.8);
    const maxD = Math.ceil(settings.descLength * 1.2);

    if (repairedDesc.length < minD) {
      repairedDesc += " Highly recommended for graphic designers, digital marketers, and agencies looking for premium microstock assets.";
    }
    if (repairedDesc.length > maxD) {
      repairedDesc = repairedDesc.substring(0, maxD).trim();
    }

    // 3. Repair Keywords
    let kws: string[] = [];
    if (Array.isArray(parsed?.keywords)) {
      kws = parsed.keywords;
    } else if (typeof parsed?.keywords === 'string') {
      kws = parsed.keywords.split(/[\s,]+/);
    }

    // Unify, extract alphanumeric characters, remove spaces
    let uniqueKws = Array.from(new Set(
      kws.flatMap((k: any) => {
        if (!k) return [];
        return String(k)
          .toLowerCase()
          .replace(/[^a-z0-9,\s-]/gi, "")
          .split(/[\s,]+/)
          .map(x => x.trim())
          .filter(x => x.length > 1);
      })
    ));

    // Ensure compliance and remove forbidden indicators
    const forbidden = ["4k", "hd", "8k", "ultra", "camera", "dslr", "megapixel", "canon", "nikon", "sony", "photography", "photo", "vector", "illustration"];
    uniqueKws = uniqueKws.filter(k => !forbidden.some(word => k.toLowerCase().includes(word)));

    const expectedCount = settings.keywordsCount;
    if (uniqueKws.length < expectedCount) {
      const backupKws = ["background", "design", "element", "concept", "abstract", "commercial", "asset", "contemporary", "creative", "clean", "minimalist", "modern", "lifestyle", "composition", "presentation"];
      for (const b of backupKws) {
        if (uniqueKws.length >= expectedCount) break;
        if (!uniqueKws.includes(b)) {
          uniqueKws.push(b);
        }
      }
    } else if (uniqueKws.length > expectedCount) {
      uniqueKws = uniqueKws.slice(0, expectedCount);
    }

    // Ensure key concepts
    if (settings.keyConcepts) {
      const concepts = settings.keyConcepts.toLowerCase().split(',').map(c => c.trim()).filter(Boolean);
      concepts.forEach(concept => {
        // Enforce in keywords and boost to the front
        if (!uniqueKws.includes(concept)) {
          uniqueKws.unshift(concept);
        } else {
          // Pull to front
          uniqueKws = uniqueKws.filter(x => x !== concept);
          uniqueKws.unshift(concept);
        }
      });
      uniqueKws = uniqueKws.slice(0, expectedCount);
    }

    return {
      title: repairedTitle,
      description: repairedDesc,
      keywords: uniqueKws,
      categories: parsed?.categories || {}
    };
  };

  // Direct fetch to Gemini Model API
  const fetchGeminiDirect = async (item: QueueItem, systemPrompt: string, userPrompt: string): Promise<string> => {
    const activeKeys = getActiveKeys('gemini');
    if (activeKeys.length === 0) {
      throw new Error("Mohon masukkan minimal 1 API Key Gemini aktif di tab brankas!");
    }

    const payload = {
      contents: [{
        role: "user",
        parts: [
          { text: userPrompt },
          ...item.videoFrames.map(f => ({ inlineData: { mimeType: 'image/png', data: f } })),
          ...(item.base64 && item.videoFrames.length === 0 ? [{ inlineData: { mimeType: 'image/png', data: item.base64 } }] : [])
        ]
      }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.15
      }
    };

    // Get selected active model list
    const activeModels = Object.keys(selectedGeminiModels).filter(m => selectedGeminiModels[m]);
    if (activeModels.length === 0) {
      throw new Error("Pilih minimal satu model prioritas Gemini!");
    }

    let lastError = "";

    // Rotate over active models and keys
    for (let m = 0; m < activeModels.length; m++) {
      const model = activeModels[m];

      for (let k = 0; k < activeKeys.length; k++) {
        const kIndex = (k + activeGeminiKeyIndex) % activeKeys.length;
        const key = activeKeys[kIndex];

        try {
          const response = await fetch('/api/proxy/gemini', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: model,
              key: key,
              payload: payload
            })
          });

          if (response.ok) {
            const resData = await response.json();
            const text = resData?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              setActiveGeminiKeyIndex(kIndex); // Save last working state
              return text;
            }
          } else {
            const errBody = await response.json().catch(() => ({}));
            lastError = `[${model}] slot k-${kIndex + 1}: ${errBody?.error?.message || response.statusText}`;
          }
        } catch (e: any) {
          lastError = `[${model}] slot k-${kIndex + 1}: ${e.message || 'Network Fail'}`;
        }

        // Delay between failovers
        await new Promise(r => setTimeout(r, speed3x ? 50 : 200));
      }
    }

    throw new Error(lastError || "Semua model & kunci API gagal merespons.");
  };

  // Direct fetch to Groq API Model
  const fetchGroqDirect = async (item: QueueItem, systemPrompt: string, userPrompt: string): Promise<string> => {
    const activeKeys = getActiveKeys('groq');
    if (activeKeys.length === 0) {
      throw new Error("Mohon masukkan minimal 1 API Key Groq di tab!");
    }

    const activeModels = Object.keys(selectedGroqModels).filter(m => selectedGroqModels[m]);
    if (activeModels.length === 0) {
      throw new Error("Pilih minimal satu model aktif Groq!");
    }

    let lastError = "";
    const totalAttempts = activeModels.length * activeKeys.length * 2;

    for (let attempt = 0; attempt < totalAttempts; attempt++) {
      const mIdx = attempt % activeModels.length;
      const kIdx = Math.floor(attempt / activeModels.length) % activeKeys.length;

      const model = activeModels[mIdx];
      const testKeyIndex = (kIdx + activeGroqKeyIndex) % activeKeys.length;
      const key = activeKeys[testKeyIndex];

      // Safe guard against daily rate limits (TPDs)
      if (modelCooldowns[model] && Date.now() < modelCooldowns[model]) {
        continue;
      }

      const isVisionModel = model.includes('scout') || model.includes('maverick') || model.includes('vision');
      const base64s = item.videoFrames.length > 0 ? item.videoFrames : (item.base64 ? [item.base64] : []);

      // Build content structure compatible with Groq Multimodal vision formats
      const userContent: any[] = [{ type: 'text', text: userPrompt }];
      if (isVisionModel && base64s.length > 0) {
        base64s.forEach(b6 => {
          userContent.push({
            type: 'image_url',
            image_url: { url: `data:image/png;base64,${b6}` }
          });
        });
      }

      try {
        const response = await fetch('/api/proxy/groq', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            key: key,
            payload: {
              model: model,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: isVisionModel ? userContent : userPrompt }
              ],
              temperature: 0.15,
              max_tokens: isVisionModel ? 1400 : 900,
              ...(isVisionModel ? {} : { response_format: { type: "json_object" } })
            }
          })
        });

        if (response.ok) {
          const data = await response.json();
          const rawText = (data.choices?.[0]?.message?.content || '').trim();
          if (rawText) {
            setActiveGroqKeyIndex(testKeyIndex);
            return rawText;
          }
        } else {
          const errBody = await response.json().catch(() => ({}));
          const errMsg = errBody?.error?.message || response.statusText;

          if (response.status === 429 || errMsg.includes("rate limit") || errMsg.includes("TPD")) {
            // Check if full daily limit exhausted (500k TPD)
            if (errMsg.includes("tokens per day") || errMsg.includes("TPD")) {
              const cooldownUntil = Date.now() + 10 * 60 * 1000; // block for 10 mins
              setModelCooldowns(prev => ({ ...prev, [model]: cooldownUntil }));
              lastError = `Model [${model}] Kunci #${testKeyIndex + 1}: Batas Harian Habis (TPD). Skip model ini.`;
            } else {
              lastError = `Model [${model}] Kunci #${testKeyIndex + 1}: Rate Limit per-menit. Menunggu antrean...`;
              await new Promise(r => setTimeout(r, 1000));
            }
          } else {
            lastError = `[${model}] Kunci #${testKeyIndex + 1}: ${errMsg}`;
          }
        }
      } catch (e: any) {
        lastError = `[${model}] Kunci #${testKeyIndex + 1}: ${e.message || 'Network Fail'}`;
      }

      await new Promise(r => setTimeout(r, speed3x ? 50 : 200));
    }

    throw new Error(lastError || "Semua model & kunci API Groq gagal merespons.");
  };

  // Process single metadata generation
  const processSingle = async (itemId: string) => {
    // Locate element
    const queueItem = items.find(i => i.id === itemId);
    if (!queueItem) return;

    // Toggle status indicator
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, status: 'processing', errorMsg: null } : i));

    const sysPrompt = buildPromptInstructions(queueItem);
    const userPrompt = `Lakukan analisis mendalam terhadap aset "${queueItem.name}". Hasilkan JSON sesuai instruksi dengan ${queueItem.settings.keywordsCount} kata kunci komersial serta model 3-Layer Title.`;

    try {
      let resultText = "";
      if (activeAuthProvider === 'gemini') {
        resultText = await fetchGeminiDirect(queueItem, sysPrompt, userPrompt);
      } else if (activeAuthProvider === 'groq') {
        resultText = await fetchGroqDirect(queueItem, sysPrompt, userPrompt);
      } else {
        throw new Error("Pilih provider koneksi (Gemini / Groq) terlebih dahulu!");
      }

      // JSON Extractor
      let cleanJson = resultText.trim();
      const mdMatch = cleanJson.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (mdMatch) {
        cleanJson = mdMatch[1].trim();
      }

      const bStart = cleanJson.indexOf('{');
      const bEnd = cleanJson.lastIndexOf('}');
      if (bStart !== -1 && bEnd > bStart) {
        cleanJson = cleanJson.slice(bStart, bEnd + 1);
      }

      const parsedObj = JSON.parse(cleanJson);
      
      // Perform validation and error recoveries
      const normalizedMeta = repairParsedOutput(parsedObj, queueItem.settings, queueItem.name);

      setItems(prev => prev.map(i => {
        if (i.id === itemId) {
          return {
            ...i,
            status: 'success',
            metadata: normalizedMeta
          };
        }
        return i;
      }));

    } catch (e: any) {
      const errMsg = e.message || 'Katalog gagal di-generate.';
      
      // Automatic silent retry
      console.warn(`Retry automatic triggered for ${queueItem.name}`);
      await new Promise(r => setTimeout(r, 1000));

      try {
        let resultText = "";
        if (activeAuthProvider === 'gemini') {
          resultText = await fetchGeminiDirect(queueItem, sysPrompt, userPrompt);
        } else {
          resultText = await fetchGroqDirect(queueItem, sysPrompt, userPrompt);
        }

        let cleanJson = resultText.trim();
        const bStart = cleanJson.indexOf('{');
        const bEnd = cleanJson.lastIndexOf('}');
        if (bStart !== -1 && bEnd > bStart) {
          cleanJson = cleanJson.slice(bStart, bEnd + 1);
        }

        const parsedObj = JSON.parse(cleanJson);
        const normalizedMeta = repairParsedOutput(parsedObj, queueItem.settings, queueItem.name);

        setItems(prev => prev.map(i => i.id === itemId ? { ...i, status: 'success', metadata: normalizedMeta } : i));
      } catch (retryError: any) {
        setItems(prev => prev.map(i => i.id === itemId ? { ...i, status: 'error', errorMsg: `${errMsg} (Retry gagal: ${retryError.message})` } : i));
      }
    }
  };

  // Run all entries in queue
  const processBatchQueue = async () => {
    const listPending = items.filter(i => i.status === 'pending' || i.status === 'error');
    if (listPending.length === 0) return;

    setIsProcessingAll(true);
    setGlobalError(null);
    setProgressPercent(0);
    setProgressStatus("Menyiapkan pemrosesan batch...");

    const concurrencyLimit = speed3x ? 3 : 1;
    let finished = 0;
    const total = listPending.length;

    // Direct multi-worker scheduler
    const executeInParallel = async () => {
      const workers: Promise<void>[] = [];
      let index = 0;

      const worker = async () => {
        while (index < total) {
          const currentIdx = index++;
          const currentItem = listPending[currentIdx];

          setProgressStatus(`Menganalisis: ${currentItem.name} (${currentIdx + 1}/${total})`);
          await processSingle(currentItem.id);

          finished++;
          const progress = Math.round((finished / total) * 100);
          setProgressPercent(progress);
        }
      };

      const workersCount = Math.min(concurrencyLimit, total);
      for (let w = 0; w < workersCount; w++) {
        workers.push(worker());
      }

      await Promise.all(workers);
    };

    await executeInParallel();

    setIsProcessingAll(false);
    setProgressStatus("Semua metadata massal sukses dibuat!");
    
    // Auto collapse progress bar soon after completion
    setTimeout(() => {
      setProgressPercent(0);
    }, 2500);
  };

  // Check overall compliance averages
  const successItems = items.filter(i => i.status === 'success');
  const totalIssuesCount = successItems.reduce((acc, curr) => {
    const seo = measureSEOQuality(curr);
    const ip = scanIPViolations(curr.metadata.title) || [];
    return acc + seo.issues.length + ip.length;
  }, 0);

  const calculateAverageScore = (): number => {
    if (successItems.length === 0) return 0;
    const total = successItems.reduce((acc, curr) => acc + measureSEOQuality(curr).score, 0);
    return Math.round(total / successItems.length);
  };

  const avgSEO = calculateAverageScore();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Premium Elegant Sticky Navbar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-600 p-2.5 rounded-2xl text-white shadow-md shadow-purple-500/20 hover:scale-105 transition-transform duration-200">
              <Zap className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-purple-600 to-pink-500 bg-clip-text text-transparent">
                  Metazo AI
                </h1>
                <span className="text-[9px] font-bold bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  V2.8 PRO
                </span>
              </div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">
                Batch Metadata & Keyboard Organizer Suite
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <span className="hidden sm:inline-flex items-center px-4 py-2 rounded-full text-xs font-bold bg-emerald-50 border border-emerald-200/60 text-emerald-800 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500 mr-2.5 animate-pulse"></span>
              Client Mode Active
            </span>
          </div>
        </div>
      </header>

      {/* Main Container Wrapper */}
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Global Error Alerts */}
        {globalError && (
          <div className="w-full mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-semibold flex items-center space-x-2.5 shadow-sm animate-fade-in">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <span>{globalError}</span>
          </div>
        )}

        {/* Outer 2-Column Desktop Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT SIDEBAR: CONFIGURATORS & MEDIA LOADERS (col-span-4) */}
          <div className="lg:col-span-4 space-y-5">
            
            {/* Elegant Tab-dedicated Selector for API Configurations & Dasbor */}
            <div className="flex bg-white/90 backdrop-blur-sm p-1.5 rounded-2xl border border-slate-200/80 shadow-sm gap-1 hover:border-slate-300 transition-all duration-200">
              <button
                type="button"
                onClick={() => setSidebarTab('seo')}
                className={`flex-1 py-3 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center space-x-1.5 transition-all duration-200 cursor-pointer ${
                  sidebarTab === 'seo'
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/15'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Sliders className="w-3.5 h-3.5 text-current" />
                <span>Dasbor & SEO</span>
              </button>
              <button
                type="button"
                onClick={() => setSidebarTab('api')}
                className={`flex-1 py-3 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center space-x-1.5 transition-all duration-200 cursor-pointer relative ${
                  sidebarTab === 'api'
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/15'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5 text-current" />
                <span>Kunci API AI</span>
                {!getActiveKeys('gemini').length && !getActiveKeys('groq').length && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />
                )}
              </button>
            </div>

            {sidebarTab === 'seo' && (
              <>
                {/* 1. ASSET SELECTOR CARD */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
                  <div>
                    <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center mb-3.5">
                      <Sliders className="w-4 h-4 mr-2 text-violet-500" />
                      1. Pilih Tipe Aset
                    </h3>
                    <div className="grid grid-cols-3 gap-2 bg-slate-100/80 p-1.5 rounded-2xl">
                      {(['image', 'vector', 'video'] as AssetType[]).map((type) => {
                        const isActive = currentAssetType === type;
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setCurrentAssetType(type)}
                            className={`py-3 px-2 rounded-xl text-xs font-bold transition-all duration-200 flex flex-col items-center gap-1.5 ${
                              isActive 
                                ? 'bg-white text-violet-600 shadow-sm font-extrabold' 
                                : 'text-slate-500 hover:text-slate-900 hover:bg-white/40'
                            }`}
                          >
                            {type === 'image' && <ImageIcon className="w-4 h-4" />}
                            {type === 'vector' && <PenTool className="w-4 h-4" />}
                            {type === 'video' && <Video className="w-4 h-4" />}
                            <span className="capitalize">{type === 'image' ? 'Gambar' : type === 'vector' ? 'Vektor' : 'Video'}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 2. MEDIA UPLOADER CARD */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center">
                        <Upload className="w-4 h-4 mr-2 text-violet-500" />
                        2. Unggah {currentAssetType === 'image' ? 'Gambar' : currentAssetType === 'vector' ? 'Vektor' : 'Video'}
                      </h3>
                      <p className="text-[10px] text-slate-400 font-semibold mt-1">Multi upload didukung</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">
                      Batch Drag
                    </span>
                  </div>

                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={triggerUploadClick}
                    className={`group border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 relative overflow-hidden ${
                      isDragOver 
                        ? 'border-violet-500 bg-violet-50/40 scale-[0.99] shadow-inner' 
                        : 'border-slate-300 bg-slate-50/50 hover:bg-white hover:border-violet-400 shadow-sm'
                    }`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      multiple
                      accept={currentAssetType === 'image' ? 'image/*' : currentAssetType === 'video' ? 'video/*' : '.eps,.ai,.svg'}
                      className="hidden"
                    />

                    <div className="h-14 w-14 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-200 shadow-sm shadow-violet-100">
                      {currentAssetType === 'image' && <ImageIcon className="w-6 h-6 animate-pulse" />}
                      {currentAssetType === 'vector' && <PenTool className="w-6 h-6 animate-pulse" />}
                      {currentAssetType === 'video' && <Video className="w-6 h-6 animate-pulse" />}
                    </div>

                    <h4 className="text-sm font-bold text-slate-800">
                      Pilih atau Drop File {currentAssetType === 'image' ? 'Gambar' : currentAssetType === 'vector' ? 'Vektor' : 'Video'}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-2 max-w-xs leading-normal font-medium">
                      {currentAssetType === 'image' && 'Mendukung JPG, PNG, WEBP. Ukuran file akan otomatis dikompresi demi performa API.'}
                      {currentAssetType === 'vector' && 'Mendukung EPS, AI, SVG. Unggah file ilustrasi pelengkap Anda.'}
                      {currentAssetType === 'video' && 'Mendukung MP4, MOV. Sistem secara otomatis membaca alur dari 3 frame cuplikan video!'}
                    </p>

                    <div className="mt-4 flex flex-wrap justify-center gap-1.5 opacity-80">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[9px] font-bold text-slate-500">Fast Payload</span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[9px] font-bold text-slate-500">CORS OK</span>
                    </div>
                  </div>

                  {/* Progress Panel for batch running */}
                  {isProcessingAll && (
                    <div className="mt-2 bg-violet-100/10 border border-violet-200/55 p-3.5 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                        <span className="text-violet-700 animate-pulse">{progressStatus}</span>
                        <span className="text-violet-850">{progressPercent}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden shadow-inner">
                        <div 
                          className="bg-gradient-to-r from-violet-600 via-purple-600 to-pink-500 h-full transition-all duration-300 rounded-full"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Batch Actions Launcher buttons */}
                  {items.length > 0 && (
                    <div className="pt-2 border-t border-slate-100">
                      <button
                        onClick={processBatchQueue}
                        disabled={isProcessingAll || getActiveKeys(activeAuthProvider).length === 0}
                        className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 hover:from-indigo-700 hover:to-pink-600 text-white font-extrabold py-3.5 px-4 rounded-2xl flex items-center justify-center space-x-2 text-xs shadow-md active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <Sparkles className={`w-4 h-4 text-violet-200 ${isProcessingAll ? 'animate-spin' : 'animate-pulse'}`} />
                        <span>GENERATE SEMUA METADATA ({items.filter(i => i.status === 'pending' || i.status === 'error').length} BERKAS)</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* 3. CONFIG CARD */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6">
              
              {sidebarTab === 'seo' && (
                <>
                  {/* Preferences Configuration Layer */}
                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest flex items-center">
                        <Sliders className="w-4 h-4 mr-2 text-violet-600" />
                        3. Preferensi Output AI
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-violet-100 text-[10px] font-bold text-violet-700">
                        SEO Engine v2.5
                      </span>
                    </div>

                    {/* Compact Toggle Tabs for Parameters Selection */}
                    <div className="bg-slate-100/90 p-1 rounded-2xl flex gap-1 shadow-inner">
                      <button
                        type="button"
                        onClick={() => setActivePrefTab('title')}
                        className={`flex-1 py-2 px-1 rounded-xl text-[10px] font-extrabold text-center transition-all ${
                          activePrefTab === 'title' 
                            ? 'bg-white text-violet-700 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        Judul ({titleLength} ch)
                      </button>
                      <button
                        type="button"
                        onClick={() => setActivePrefTab('desc')}
                        className={`flex-1 py-2 px-1 rounded-xl text-[10px] font-extrabold text-center transition-all ${
                          activePrefTab === 'desc' 
                            ? 'bg-white text-violet-700 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        Deskripsi ({descLength} ch)
                      </button>
                      <button
                        type="button"
                        onClick={() => setActivePrefTab('keywords')}
                        className={`flex-1 py-2 px-1 rounded-xl text-[10px] font-extrabold text-center transition-all ${
                          activePrefTab === 'keywords' 
                            ? 'bg-white text-violet-700 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        Keywords ({keywordsCount} tag)
                      </button>
                    </div>

                    {/* Dynamically active parameter controller */}
                    {activePrefTab === 'title' && (
                      <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-100 space-y-3 transition-opacity duration-200">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold text-slate-700 block">Panjang Judul SEO Target</span>
                            <span className="text-[10px] text-slate-400 font-semibold block">Panjang optimal indeks pencarian</span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-xs font-extrabold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-md border border-violet-100">
                              {titleLength} Ch
                            </span>
                            <span className={`text-[9px] font-bold mt-1 uppercase ${
                              titleLength < 50 
                                ? 'text-amber-600' 
                                : titleLength <= 120 
                                  ? 'text-emerald-600' 
                                  : 'text-rose-500'
                            }`}>
                              {titleLength < 50 
                                ? '⚠️ Terlalu Pendek' 
                                : titleLength <= 120 
                                  ? '✨ Sangat Baik (Optimal)' 
                                  : '⚠️ Agak Panjang'}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <input
                            type="range"
                            min="15"
                            max="200"
                            step="5"
                            value={titleLength}
                            onChange={(e) => setTitleLength(parseInt(e.target.value))}
                            className="w-full accent-violet-600 cursor-pointer h-2 bg-slate-200 rounded-lg appearance-none transition-all duration-150 hover:bg-slate-300/80"
                          />
                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                            <span>Min: 15 ch</span>
                            <span>Max: 200 ch</span>
                          </div>
                        </div>

                        {/* Fast choice preset buttons for title length */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-slate-100/50">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mr-1 mb-0.5">Presets:</span>
                          {[60, 80, 110, 155].map((preset) => {
                            const isSelected = titleLength === preset;
                            const label = preset === 60 ? 'Ringkas' : preset === 80 ? 'Optimal' : preset === 110 ? 'Lengkap' : 'Panjang';
                            return (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => setTitleLength(preset)}
                                className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all border ${
                                  isSelected 
                                    ? 'bg-violet-600 text-white border-violet-600 shadow-sm shadow-violet-100' 
                                    : 'bg-white hover:bg-slate-100 border-slate-200/80 text-slate-500 hover:text-slate-800'
                                }`}
                              >
                                {label} ({preset})
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {activePrefTab === 'desc' && (
                      <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-100 space-y-3 transition-opacity duration-200">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold text-slate-700 block">Panjang Deskripsi SEO</span>
                            <span className="text-[10px] text-slate-400 font-semibold block">Rentang jumlah karakter penjelasan</span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-xs font-extrabold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-md border border-violet-100">
                              {descLength} Ch
                            </span>
                            <span className={`text-[9px] font-bold mt-1 uppercase ${
                              descLength < 100 
                                ? 'text-amber-500' 
                                : descLength <= 300 
                                  ? 'text-emerald-600' 
                                  : 'text-blue-600'
                            }`}>
                              {descLength < 100 
                                ? 'Singkat' 
                                : descLength <= 300 
                                  ? '✨ Ideal (Informatif)' 
                                  : 'Sangat Detail'}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <input
                            type="range"
                            min="30"
                            max="400"
                            step="10"
                            value={descLength}
                            onChange={(e) => setDescLength(parseInt(e.target.value))}
                            className="w-full accent-violet-600 cursor-pointer h-2 bg-slate-200 rounded-lg appearance-none transition-all duration-150 hover:bg-slate-300/80"
                          />
                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                            <span>Min: 30 ch</span>
                            <span>Max: 400 ch</span>
                          </div>
                        </div>

                        {/* Fast choice preset buttons for desc length */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-slate-100/50">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mr-1 mb-0.5">Presets:</span>
                          {[100, 200, 300, 400].map((preset) => {
                            const isSelected = descLength === preset;
                            const label = preset === 100 ? 'Pendek' : preset === 200 ? 'Standard' : preset === 300 ? 'Kaya' : 'Maksimal';
                            return (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => setDescLength(preset)}
                                className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all border ${
                                  isSelected 
                                    ? 'bg-violet-600 text-white border-violet-600 shadow-sm shadow-violet-100' 
                                    : 'bg-white hover:bg-slate-100 border-slate-200/80 text-slate-500 hover:text-slate-800'
                                }`}
                              >
                                {label} ({preset})
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {activePrefTab === 'keywords' && (
                      <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-100 space-y-3 transition-opacity duration-200">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold text-slate-700 block">Target Jumlah Kata Kunci</span>
                            <span className="text-[10px] text-slate-400 font-semibold block">Sesuai batasan metadata agensi</span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-xs font-extrabold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-md border border-violet-100">
                              {keywordsCount} Tag
                            </span>
                            <span className="text-[9px] font-bold mt-1 uppercase text-emerald-600">
                              {keywordsCount >= 40 ? '🔥 Eksplorasi Maksimal' : '⚖️ Seimbang'}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <input
                            type="range"
                            min="15"
                            max="50"
                            step="5"
                            value={keywordsCount}
                            onChange={(e) => setKeywordsCount(parseInt(e.target.value))}
                            className="w-full accent-violet-600 cursor-pointer h-2 bg-slate-200 rounded-lg appearance-none transition-all duration-150 hover:bg-slate-300/80"
                          />
                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                            <span>Min: 15 kata</span>
                            <span>Max: 50 kata</span>
                          </div>
                        </div>

                        {/* Fast choice preset buttons for keywords limit */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-slate-100/50">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mr-1 mb-0.5">Presets:</span>
                          {[20, 35, 45, 50].map((preset) => {
                            const isSelected = keywordsCount === preset;
                            return (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => setKeywordsCount(preset)}
                                className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all border ${
                                  isSelected 
                                    ? 'bg-violet-600 text-white border-violet-600 shadow-sm shadow-violet-100' 
                                    : 'bg-white hover:bg-slate-100 border-slate-200/80 text-slate-500 hover:text-slate-800'
                                }`}
                              >
                                {preset} Tag {preset === 50 ? '👑' : ''}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Key Concepts Input (Prioritas Niche & Kata Kunci SEO) */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                        <span className="flex items-center">
                          <TrendingUp className="w-4 h-4 mr-1.5 text-violet-600" />
                          Prioritas Niche & Kata Kunci SEO Utama
                        </span>
                        <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full">
                          Wajib Disisipkan
                        </span>
                      </label>
                      
                      <div className="relative">
                        <input
                          type="text"
                          value={keyConcepts}
                          onChange={(e) => setKeyConcepts(e.target.value)}
                          placeholder="Contoh: travel, business, sustainability, flat icon"
                          className="w-full text-xs p-3 pr-8 border border-slate-200 rounded-2xl focus:outline-none focus:border-violet-500 bg-slate-50/50 hover:bg-white focus:bg-white transition-all shadow-sm focus:ring-4 focus:ring-violet-500/10 placeholder:text-slate-400/90 font-medium"
                        />
                        {keyConcepts && (
                          <button
                            type="button"
                            onClick={() => setKeyConcepts('')}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold bg-slate-200/50 hover:bg-slate-200 p-1 rounded-full transition-colors"
                            title="Hapus kata kunci prioritas"
                          >
                            ×
                          </button>
                        )}
                      </div>

                      <p className="text-[10px] text-slate-400 font-semibold leading-normal">
                        Ketik beberapa kata dipisah koma. Kata kunci ini dijamin masuk urutan paling atas.
                      </p>

                      {/* Interactive suggestions folder style (collapsible!) */}
                      <div className="pt-1.5 space-y-1.5">
                        <button
                          type="button"
                          onClick={() => setShowTrending(!showTrending)}
                          className="text-[10px] font-extrabold text-violet-600 hover:text-violet-800 uppercase tracking-wider flex items-center transition-colors"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-500 mr-1" />
                          {showTrending ? 'Sembunyikan Ide Niche ▲' : 'Lihat Ide Niche Populer ▼'}
                        </button>
                        
                        {showTrending && (
                          <div className="flex flex-wrap gap-1 border border-slate-100 p-2 rounded-2xl bg-amber-50/10 max-h-24 overflow-y-auto">
                            {TRENDING_KEYWORDS.map((tag) => {
                              const parsedTags = keyConcepts.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
                              const isSelected = parsedTags.includes(tag.toLowerCase());
                              return (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={() => {
                                    if (isSelected) {
                                      const updated = keyConcepts.split(',')
                                        .map(t => t.trim())
                                        .filter(t => t.toLowerCase() !== tag.toLowerCase())
                                        .filter(Boolean)
                                        .join(', ');
                                      setKeyConcepts(updated);
                                    } else {
                                      const trimmed = keyConcepts.trim();
                                      const updated = trimmed 
                                        ? trimmed.endsWith(',') 
                                          ? `${trimmed} ${tag}` 
                                          : `${trimmed}, ${tag}` 
                                        : tag;
                                      setKeyConcepts(updated);
                                    }
                                  }}
                                  className={`px-2 py-1 rounded-xl text-[9px] font-bold transition-all duration-150 flex items-center ${
                                    isSelected 
                                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm border border-violet-600' 
                                      : 'bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200/80 active:scale-95'
                                  }`}
                                >
                                  {isSelected && <span className="mr-0.5 text-[8px]">✓</span>}
                                  {tag}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Platform Targets checklists */}
                  <div className="pt-4 border-t border-slate-100 space-y-2.5">
                    <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center">
                      <CheckSquare className="w-4 h-4 mr-2 text-violet-500" />
                      4. Agensi Target Ekspor
                    </h3>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {Object.keys(targetPlatforms).map((platform) => {
                        const isChecked = targetPlatforms[platform as keyof TargetPlatforms];
                        const label = platform === 'adobeStock' ? 'Adobe Stock' : platform.charAt(0).toUpperCase() + platform.slice(1);
                        return (
                          <button
                            key={platform}
                            type="button"
                            onClick={() => togglePlatform(platform as keyof TargetPlatforms)}
                            className={`px-3 py-1.5 border rounded-full text-[11px] font-bold transition-all duration-150 flex items-center space-x-1.5 ${
                              isChecked 
                                ? 'border-violet-600 bg-violet-600 text-white font-extrabold shadow-sm' 
                                : 'border-slate-200 bg-white text-slate-500 hover:bg-purple-50 hover:text-purple-600'
                            }`}
                          >
                            <span>{isChecked ? '✓' : '+'}</span>
                            <span>{label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {sidebarTab === 'api' && (
                <div className="space-y-5">
                  {/* API Client Credentials & Rotation */}
                  <div>
                    <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center mb-3">
                      <KeyRound className="w-4 h-4 mr-2 text-violet-500" />
                      Konfigurasi API AI & Vault
                    </h3>

                    {/* Engine Source Selection Tabs */}
                    <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-2xl mb-4 text-center">
                      {(['gemini', 'groq', 'helper'] as AuthProvider[]).map((p) => {
                        const isTabActive = activeAuthProvider === p;
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setActiveAuthProvider(p)}
                            className={`py-2.5 rounded-xl text-[11px] font-extrabold transition-all border border-transparent ${
                              isTabActive 
                                ? 'bg-white text-violet-600 shadow-sm border-slate-100' 
                                : 'text-slate-500 hover:text-slate-900'
                            }`}
                          >
                            {p === 'gemini' ? '🔮 Gemini' : p === 'groq' ? '⚡ Groq' : 'Bantuan'}
                          </button>
                        );
                      })}
                    </div>

                    {/* Gemini Config Tab View */}
                    {activeAuthProvider === 'gemini' && (
                      <div className="space-y-4">
                        
                        {/* Visual API Vault Box Accordion */}
                        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50">
                          <div 
                            onClick={() => setIsGeminiVaultOpen(!isGeminiVaultOpen)}
                            className="flex items-center justify-between p-3.5 bg-slate-100/50 hover:bg-slate-100 cursor-pointer transition-colors border-b border-slate-200"
                          >
                            <span className="text-xs font-extrabold text-slate-700 flex items-center">
                              <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500" />
                              Vault Key Gemini ({getActiveKeys('gemini').length}/5)
                            </span>
                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isGeminiVaultOpen ? 'rotate-180' : ''}`} />
                          </div>

                          <AnimatePresence>
                            {isGeminiVaultOpen && (
                              <motion.div 
                                initial={{ height: 0 }}
                                animate={{ height: 'auto' }}
                                exit={{ height: 0 }}
                                className="overflow-hidden bg-white p-4 space-y-3 border-t border-slate-100"
                              >
                                {geminiKeys.map((k, idx) => (
                                  <div key={`gem-key-${idx}`} className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-[10px] font-bold text-slate-400">
                                      #{idx + 1}
                                    </span>
                                    <input
                                      type="password"
                                      value={k}
                                      onChange={(e) => handleGeminiKeyChange(idx, e.target.value)}
                                      placeholder={`Masukkan Kunci Gemini Ke-${idx + 1}`}
                                      className="w-full text-xs pl-8 pr-3 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-violet-500 font-mono bg-slate-50/50 hover:bg-white focus:bg-white transition-colors"
                                    />
                                  </div>
                                ))}

                                {/* Diagnose Testing Buttons */}
                                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100">
                                  <button
                                    type="button"
                                    disabled={testGeminiStatus === 'testing'}
                                    onClick={testGeminiConn}
                                    className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-[10px] font-bold transition-all flex items-center space-x-1.5 active:scale-95"
                                  >
                                    {testGeminiStatus === 'testing' ? (
                                      <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin text-violet-500" />
                                    ) : (
                                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
                                    )}
                                    <span>Uji Koneksi Kunci</span>
                                  </button>
                                  <span className={`text-[10px] font-bold truncate max-w-[140px] ${
                                    testGeminiStatus === 'success' ? 'text-emerald-600 font-semibold' :
                                    testGeminiStatus === 'err' ? 'text-red-500 font-semibold' : 'text-slate-400'
                                  }`}>
                                    {testGeminiMsg}
                                  </span>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Gemini Models Selection List */}
                        <div className="space-y-2">
                          <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                            Model Prioritas Gemini
                          </label>
                          <div className="space-y-1.5 bg-violet-50/40 p-3 rounded-2xl border border-violet-100/80 font-medium">
                            {Object.keys(selectedGeminiModels).map((model) => (
                              <label 
                                key={model} 
                                className="flex items-center space-x-2.5 text-xs font-semibold text-slate-700 cursor-pointer p-1.5 hover:bg-white/60 rounded-xl transition-all"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedGeminiModels[model]}
                                  onChange={() => toggleGeminiModel(model)}
                                  className="rounded border-slate-300 text-violet-600 focus:ring-violet-500 h-4 w-4"
                                />
                                <span className="truncate flex items-center justify-between w-full">
                                  <span>{model}</span>
                                  {model.includes('3.1-flash-lite') && (
                                    <span className="text-[8px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full font-bold">
                                      Lite gratis
                                    </span>
                                  )}
                                  {model.includes('3-flash') && (
                                    <span className="text-[8px] bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded-full font-bold">
                                      Flash 3
                                    </span>
                                  )}
                                  {model.includes('pro') && (
                                    <span className="text-[8px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-bold">
                                      Pro Spec
                                    </span>
                                  )}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>

                      </div>
                    )}

                    {/* Groq Config Tab View */}
                    {activeAuthProvider === 'groq' && (
                      <div className="space-y-4">
                        
                        {/* Groq Vault box */}
                        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50">
                          <div 
                            onClick={() => setIsGroqVaultOpen(!isGroqVaultOpen)}
                            className="flex items-center justify-between p-3.5 bg-slate-100/50 hover:bg-slate-100 cursor-pointer transition-colors border-b border-slate-200"
                          >
                            <span className="text-xs font-extrabold text-slate-700 flex items-center">
                              <CheckCircle2 className="w-4 h-4 mr-2 text-violet-500" />
                              Vault Key Groq ({getActiveKeys('groq').length}/5)
                            </span>
                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isGroqVaultOpen ? 'rotate-180' : ''}`} />
                          </div>

                          <AnimatePresence>
                            {isGroqVaultOpen && (
                              <motion.div 
                                initial={{ height: 0 }}
                                animate={{ height: 'auto' }}
                                exit={{ height: 0 }}
                                className="overflow-hidden bg-white p-4 space-y-3 border-t border-slate-100"
                              >
                                {groqKeys.map((k, idx) => (
                                  <div key={`groq-key-${idx}`} className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-[10px] font-bold text-slate-400">
                                      #{idx + 1}
                                    </span>
                                    <input
                                      type="password"
                                      value={k}
                                      onChange={(e) => handleGroqKeyChange(idx, e.target.value)}
                                      placeholder={`gsk_... (Masukkan Kunci Groq Ke-${idx + 1})`}
                                      className="w-full text-xs pl-8 pr-3 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-violet-500 font-mono bg-slate-50/50 hover:bg-white focus:bg-white transition-colors"
                                    />
                                  </div>
                                ))}

                                {/* Diagnose Testing Buttons */}
                                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100">
                                  <button
                                    type="button"
                                    disabled={testGroqStatus === 'testing'}
                                    onClick={testGroqConn}
                                    className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-[10px] font-bold transition-all flex items-center space-x-1.5 active:scale-95"
                                  >
                                    {testGroqStatus === 'testing' ? (
                                      <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin text-violet-500" />
                                    ) : (
                                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-violet-500" />
                                    )}
                                    <span>Uji Koneksi Kunci</span>
                                  </button>
                                  <span className={`text-[10px] font-bold truncate max-w-[140px] ${
                                    testGroqStatus === 'success' ? 'text-emerald-600 font-semibold' :
                                    testGroqStatus === 'err' ? 'text-red-500 font-semibold' : 'text-slate-400'
                                  }`}>
                                    {testGroqMsg}
                                  </span>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Groq Model List Checks */}
                        <div className="space-y-2">
                          <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                            Model Groq Aktif
                          </label>
                          <div className="space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-200 font-medium">
                            {Object.keys(selectedGroqModels).map((model) => (
                              <label 
                                key={model} 
                                className="flex flex-col text-xs font-semibold text-slate-700 cursor-pointer p-2 hover:bg-slate-200/40 rounded-xl transition-all border border-transparent hover:border-slate-100"
                              >
                                <div className="flex items-center space-x-2.5">
                                  <input
                                    type="checkbox"
                                    checked={selectedGroqModels[model]}
                                    onChange={() => toggleGroqModel(model)}
                                    className="rounded border-slate-300 text-violet-600 focus:ring-violet-500 h-4 w-4"
                                  />
                                  <span className="truncate flex items-center justify-between w-full">
                                    <span className="font-mono text-[10px] font-bold">{model.split('/').pop()}</span>
                                    {model.includes('llama-3.1-8b') && (
                                      <span className="text-[8px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full font-bold">
                                        Fast / Stable
                                      </span>
                                    )}
                                    {model.includes('scout') && (
                                      <span className="text-[8px] bg-purple-100 text-purple-850 px-1.5 py-0.5 rounded-full font-bold">
                                        Vision+Text
                                      </span>
                                    )}
                                  </span>
                                </div>
                                <span className="text-[9px] text-slate-400 font-medium ml-6.5 mt-0.5">
                                  {model.includes('3.2-90b') ? 'High-end general purpose model.' :
                                   model.includes('mixtral') ? 'Mixture of experts model with larger context window.' :
                                   model.includes('8b-instant') ? 'Highly scalable, minimal delay ideal for bulk batches.' :
                                   'Llama-4 trial vision capabilities.'}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>

                      </div>
                    )}

                    {/* Guide Tab */}
                    {activeAuthProvider === 'helper' && (
                      <div className="p-4 bg-violet-50/50 rounded-2xl border border-violet-100 text-xs space-y-3">
                        <p className="font-bold text-slate-800 flex items-center">
                          <HelpCircle className="w-4 h-4 mr-1.5 text-violet-600" />
                          Cara Membuka Kunci API Gratis:
                        </p>
                        <div className="space-y-2.5 text-slate-600 font-medium leading-relaxed animate-fade-in">
                          <div>
                            <p className="font-bold text-violet-800 border-b border-violet-200/40 pb-0.5">🚀 Google Gemini Key:</p>
                            <ol className="list-decimal list-inside pl-1 space-y-1">
                              <li>Buka <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="text-violet-600 underline font-bold hover:text-violet-700">Google AI Studio ↗</a></li>
                              <li>Klik tombol <strong>"Create API Key"</strong> lalu salin kodenya.</li>
                            </ol>
                          </div>
                          <div>
                            <p className="font-bold text-violet-800 border-b border-violet-200/40 pb-0.5">⚡ Groq API Key (Fast):</p>
                            <ol className="list-decimal list-inside pl-1 space-y-1">
                              <li>Kunjungi <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-violet-600 underline font-bold hover:text-violet-700">Groq Developer Console ↗</a></li>
                              <li>Login akun gratis dan pilih menu <strong>API Keys</strong>.</li>
                              <li>Salin kuncinya yang berawalan <span className="font-mono text-[9px] bg-slate-100 px-1 py-0.5 rounded">gsk_...</span></li>
                            </ol>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Speed Toggle & Limit controllers */}
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between p-3 bg-slate-100/40 rounded-2xl border border-slate-200">
                        <label className="flex items-center space-x-2.5 text-xs font-bold text-slate-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={speed3x}
                            onChange={(e) => setSpeed3x(e.target.checked)}
                            className="rounded border-slate-300 text-violet-600 focus:ring-violet-500 h-4 w-4"
                          />
                          <span>Auto Rotate & Parallel Speed 3x</span>
                        </label>
                      </div>

                      <div className="p-3 bg-gradient-to-r from-emerald-50/20 to-teal-50/10 rounded-2xl border border-emerald-200/50">
                        <label className="flex items-start space-x-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={noLimitMode}
                            onChange={(e) => setNoLimitMode(e.target.checked)}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4 mt-0.5"
                          />
                          <div>
                            <span className="text-xs font-bold text-emerald-800 block">🔓 No Limit Mode (Rotation)</span>
                            <span className="text-[9px] text-emerald-600 font-semibold leading-normal block">
                              Gunakan rotasi antar ke-5 slot API key secara bergantian untuk menghindari rate-limit model.
                            </span>
                          </div>
                        </label>
                      </div>
                    </div>

                  </div>
                </div>
              )}

            </div>

          </div>

          {/* RIGHT SCREEN: QUEUE CONTROLLERS & LIVE METADATA FORM EDITOR (col-span-8) */}
          <div className="lg:col-span-8 flex flex-col space-y-6">
            
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm min-h-[660px] flex flex-col justify-between">
              
              <div className="space-y-4">
                
                {/* Section Header Controls */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-800 flex items-center">
                      <FolderOpen className="w-5 h-5 mr-2 text-violet-500" />
                      Daftar Antrean & Editor Metadata ({items.length})
                    </h2>
                    <p className="text-xs text-slate-400 font-semibold mt-0.5">
                      Kelola, sunting, ekspor, dan unduh hasil optimasi AI di panel terpadu
                    </p>
                  </div>

                  {items.length > 0 && (
                    <button 
                      onClick={clearAllQueue}
                      className="px-3.5 py-2 bg-red-50 hover:bg-red-100 rounded-xl text-red-600 transition-all flex items-center space-x-1.5 active:scale-95 text-[11px] font-bold cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Kosongkan</span>
                    </button>
                  )}
                </div>

                {/* Microstock Analytics Scorecards - Only visible when metadata runs success */}
                {successItems.length > 0 && (
                  <div className="p-4 rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/30 to-teal-50/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center space-x-3">
                      <div className="h-11 w-11 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800 shadow-sm">
                        <FileCheck className="w-5.5 h-4.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-800">AI Microstock Optimizer Score</h4>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                          Commercial • SEO Weight • IP Compliance • Approval Success
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-center sm:text-right">
                        <span className="block text-[8px] text-slate-400 font-extrabold uppercase">Rata-Rata SEO</span>
                        <span className="text-xl font-black text-emerald-600">{avgSEO}%</span>
                      </div>
                      <div className="text-center sm:text-right border-l border-slate-200 pl-4">
                        <span className="block text-[8px] text-slate-400 font-extrabold uppercase">Isu Kebocoran IP</span>
                        <span className={`text-xl font-black ${totalIssuesCount > 0 ? 'text-amber-500' : 'text-emerald-600'}`}>
                          {totalIssuesCount} Terdeteksi
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* CSV Bulk Downloads Drawer Panel */}
                {successItems.length > 0 && (
                  <div className="p-5 bg-gradient-to-r from-violet-50/30 via-pink-50/10 to-transparent border border-violet-100 rounded-2xl space-y-3 shadow-inner">
                    <div className="flex items-center space-x-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <p className="text-xs font-black text-slate-800">
                        Unduh File CSV Agensi Microstock ({successItems.length} Selesai)
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {Object.keys(targetPlatforms).map((pKey) => {
                        const isEnabled = targetPlatforms[pKey as keyof TargetPlatforms];
                        if (isEnabled) {
                          const label = pKey === 'adobeStock' ? 'Adobe Stock' : pKey.toUpperCase();
                          return (
                            <button
                              key={`dl-${pKey}`}
                              onClick={() => generatePlatformCSV(successItems, pKey)}
                              className="px-3.5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-[10px] font-bold rounded-xl transition-all shadow-sm active:scale-95 flex items-center space-x-1 cursor-pointer hover:border-violet-300 hover:text-violet-600"
                            >
                              <Copy className="w-3.5 h-3.5 mr-1 text-slate-400 hover:text-violet-500" />
                              <span>{label} Export CSV</span>
                            </button>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>
                )}

                {/* Main Queue elements accordion wrap list */}
                <div className="space-y-4 max-h-[580px] overflow-y-auto pr-1">
                  
                  {items.length === 0 ? (
                    <div className="h-[430px] rounded-3xl flex flex-col items-center justify-center text-center text-slate-400 border-2 border-dashed border-slate-200 bg-slate-50/40 p-6">
                      <Sparkles className="w-12 h-12 text-violet-300 mb-4 animate-pulse" />
                      <h4 className="text-sm font-extrabold text-slate-800">Antrean Aset Kosong</h4>
                      <p className="text-xs text-slate-400 mt-2 max-w-sm leading-relaxed font-semibold">
                        Gunakan panel pengunggah atau drop gambar/video Anda di sebelah kiri. Metadata komersial SEO akan terorganisir di sini.
                      </p>
                    </div>
                  ) : (
                    items.map((item, index) => {
                      const isExpanded = expandedItemId === item.id;
                      const seoDetail = measureSEOQuality(item);
                      const titleBrandViolations = scanIPViolations(item.metadata.title);
                      const descBrandViolations = scanIPViolations(item.metadata.description);
                      const kwsBrandViolations = item.metadata.keywords.filter(k => scanIPViolations(k).length > 0);
                      const totalBrands = Array.from(new Set([...titleBrandViolations, ...descBrandViolations, ...kwsBrandViolations]));

                      return (
                        <div 
                          key={item.id} 
                          className={`border rounded-2xl overflow-hidden transition-all duration-300 ${
                            isExpanded 
                              ? 'border-violet-400 bg-violet-55/5 shadow-md shadow-violet-100/40' 
                              : 'border-slate-200 bg-white hover:border-violet-200 shadow-sm'
                          }`}
                        >
                          {/* Accordion clickable header row */}
                          <div 
                            onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/50 transition-colors"
                          >
                            <div className="flex items-center space-x-3.5 min-w-0">
                              
                              {/* Visual Mini Thumbnails */}
                              <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-sm flex-shrink-0 flex items-center justify-center">
                                {item.preview ? (
                                  <img 
                                    src={item.preview} 
                                    alt={item.name} 
                                    className="w-full h-full object-cover" 
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  item.type === 'video' ? <Video className="w-4 h-4 text-violet-500" /> :
                                  item.type === 'vector' ? <PenTool className="w-4 h-4 text-violet-500" /> :
                                  <ImageIcon className="w-4 h-4 text-slate-400" />
                                )}
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center space-x-2">
                                  <span className="text-[8px] font-extrabold uppercase tracking-wider bg-slate-100 border border-slate-200 text-slate-500 px-2 py-0.5 rounded">
                                    {item.type}
                                  </span>
                                  <h4 className="text-xs font-bold text-slate-800 truncate max-w-[160px] sm:max-w-[240px]">
                                    {item.name}
                                  </h4>
                                </div>
                                {item.status === 'success' && item.metadata.title ? (
                                  <p className="text-[10px] text-slate-400 truncate mt-1 italic">
                                    "{item.metadata.title}"
                                  </p>
                                ) : (
                                  <p className="text-[9px] text-slate-400 mt-1 font-semibold">
                                    Klik untuk merinci editor metadata
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Status badges, diagnostics and runners */}
                            <div className="flex items-center justify-between sm:justify-end gap-3.5" onClick={(e) => e.stopPropagation()}>
                              
                              {/* Dynamic state check badge */}
                              {item.status === 'processing' && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-extrabold bg-violet-50 border border-violet-100 text-violet-700 animate-pulse">
                                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                  Proses AI...
                                </span>
                              )}
                              {item.status === 'success' && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-extrabold bg-emerald-50 border border-emerald-100 text-emerald-800">
                                  ✓ Selesai
                                </span>
                              )}
                              {item.status === 'error' && (
                                <span 
                                  title={item.errorMsg || 'API Error'}
                                  className="inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-extrabold bg-red-50 border border-red-100 text-red-700 max-w-[120px] truncate"
                                >
                                  ⚠ Gagal / Error
                                </span>
                              )}
                              {item.status === 'pending' && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-extrabold bg-slate-100 border border-slate-200 text-slate-500">
                                  Antrean
                                </span>
                              )}

                              {/* Manual run button */}
                              <button
                                onClick={() => processSingle(item.id)}
                                disabled={item.status === 'processing' || getActiveKeys(activeAuthProvider).length === 0}
                                className="px-3.5 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 text-white font-extrabold rounded-lg text-[10px] shadow-sm flex items-center active:scale-95 transition-all disabled:opacity-40 disabled:scale-100 cursor-pointer"
                              >
                                <Sparkles className="w-3.5 h-3.5 mr-1" />
                                <span>Generate</span>
                              </button>

                              {/* Remove specific */}
                              <button
                                onClick={() => removeItem(item.id)}
                                className="p-1 px-1.5 text-slate-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors cursor-pointer"
                                title="Hapus dari antrean"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>

                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-slate-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                              )}

                            </div>
                          </div>

                          {/* EXPANDED INNER LIVE PANEL EDITOR FORM */}
                          {isExpanded && (
                            <div className="p-6 border-t border-slate-100 bg-slate-50/20 space-y-5">
                              
                              {/* Display error message details if crashed */}
                              {item.status === 'error' && item.errorMsg && (
                                <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start space-x-2 text-red-800 text-[11px] font-semibold">
                                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />
                                  <span>{item.errorMsg}</span>
                                </div>
                              )}

                              {item.status === 'pending' ? (
                                <div className="py-12 text-center space-y-3">
                                  <Sparkles className="w-8 h-8 mx-auto text-violet-450 animate-bounce" />
                                  <h4 className="text-xs font-extrabold text-slate-700">Metadata Belum Dibuat</h4>
                                  <p className="text-[10px] text-slate-400 font-semibold max-w-xs mx-auto leading-normal">
                                    Klik tombol <b className="text-violet-600">"Generate"</b> di samping kanan untuk memicu model AI memproses judul, tags, dan deskripsi ramah SEO.
                                  </p>
                                </div>
                              ) : item.status === 'processing' ? (
                                <div className="py-12 text-center space-y-3">
                                  <RefreshCw className="w-8 h-8 mx-auto text-violet-600 animate-spin" />
                                  <h4 className="text-xs font-extrabold text-slate-705">Menganalisis Visual dengan AI</h4>
                                  <p className="text-[10px] text-slate-400 font-semibold max-w-xs mx-auto leading-normal">
                                    Sedang mengunggah visual payload dan mengekstrak kategori komersial microstock...
                                  </p>
                                </div>
                              ) : (
                                <>
                                  {/* Diagnostic indicators block: IP compliance and SEO score rating */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    
                                    {/* IP Compliance Panel */}
                                    <div className={`p-4 rounded-2xl border ${
                                      totalBrands.length > 0 
                                        ? 'bg-amber-50/30 border-amber-200/80 text-amber-900' 
                                        : 'bg-emerald-50/20 border-emerald-100/80 text-emerald-900'
                                    } flex flex-col justify-between`}>
                                      <div>
                                        <div className="flex items-center space-x-2 text-xs font-bold">
                                          <span>Validasi Keselamatan Haki / IP:</span>
                                          {totalBrands.length > 0 ? (
                                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[9px] rounded font-black max-w-xs truncate">
                                              Saran Brand Ganti ({totalBrands.length})
                                            </span>
                                          ) : (
                                            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] rounded font-black">
                                              Lolos (Sangat Aman)
                                            </span>
                                          )}
                                        </div>
                                        {totalBrands.length > 0 ? (
                                          <p className="text-[9.5px] mt-1.5 leading-normal text-slate-550 font-semibold">
                                            Sistem mendeteksi kemungkinan kata bermerek dagang: <b className="underline text-red-500">{totalBrands.join(', ')}</b>. Harap ubah ke padanan generik sebelum unggah ke Adobe Stock.
                                          </p>
                                        ) : (
                                          <p className="text-[9.5px] mt-1.5 leading-normal text-slate-400 font-semibold">
                                            Bebas klaim hak cipta komersial. Siap disubmit ke Shutterstock & Adobe Stock.
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    {/* SEO Quality Metrics progress indicator */}
                                    <div className="p-4 rounded-2xl border bg-slate-50 border-slate-250 flex flex-col justify-between">
                                      <div className="flex justify-between items-center text-xs font-bold">
                                        <span className="text-slate-600">Bobot SEO Komersial</span>
                                        <span className={`${
                                          seoDetail.score > 80 ? 'text-emerald-600' :
                                          seoDetail.score > 55 ? 'text-violet-600' : 'text-red-500'
                                        }`}>{seoDetail.score}% / 100</span>
                                      </div>
                                      
                                      {seoDetail.issues.length > 0 ? (
                                        <p className="text-[9px] text-slate-400 mt-1 leading-normal font-semibold max-h-[46px] overflow-y-auto">
                                          <b>Tips Optimasi:</b> {seoDetail.issues[0]}
                                        </p>
                                      ) : (
                                        <p className="text-[9px] text-emerald-600 mt-1 leading-normal font-bold">
                                          ✓ Sempurna! Judul 3-layer padat dan target keywords terpenuhi.
                                        </p>
                                      )}

                                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1.5">
                                        <div 
                                          className={`h-full ${
                                            seoDetail.score > 80 ? 'bg-emerald-500' :
                                            seoDetail.score > 55 ? 'bg-violet-600' : 'bg-red-500'
                                          }`} 
                                          style={{ width: `${seoDetail.score}%` }}
                                        />
                                      </div>
                                    </div>

                                  </div>

                                  {/* Editable Title input */}
                                  <div className="space-y-1.5">
                                    <div className="flex justify-between items-center text-xs font-bold">
                                      <label className="text-slate-600 flex items-center">
                                        <FileText className="w-4 h-4 mr-1.5 text-violet-500" />
                                        Judul Komersial SEO (Title)
                                      </label>
                                      <div className="flex items-center space-x-2">
                                        <span className={`text-[10px] ${item.metadata.title.length > item.settings.titleLength ? 'text-amber-500 font-bold' : 'text-slate-400 font-semibold'}`}>
                                          {item.metadata.title.length} / {item.settings.titleLength} ch
                                        </span>
                                        <button 
                                          onClick={() => copyToClipboard(item.metadata.title, `title-${item.id}`)}
                                          className="text-[10px] text-violet-600 hover:text-violet-700 font-bold flex items-center space-x-0.5 cursor-pointer"
                                        >
                                          <Copy className="w-3 h-3 mr-0.5" />
                                          <span>{copiedStatus[`title-${item.id}`] ? 'Tersalin ✓' : 'Salin'}</span>
                                        </button>
                                      </div>
                                    </div>
                                    <input 
                                      type="text" 
                                      value={item.metadata.title}
                                      onChange={(e) => updateItemField(item.id, 'title', e.target.value)}
                                      className="w-full text-xs p-3.5 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-violet-500 font-semibold shadow-inner text-slate-800"
                                    />
                                  </div>

                                  {/* Editable Description text area */}
                                  <div className="space-y-1.5">
                                    <div className="flex justify-between items-center text-xs font-bold">
                                      <label className="text-slate-600 flex items-center">
                                        <FileText className="w-4 h-4 mr-1.5 text-violet-500" />
                                        Deskripsi Kreatif (Description)
                                      </label>
                                      <div className="flex items-center space-x-2">
                                        <span className="text-[10px] text-slate-400 font-semibold">
                                          {item.metadata.description.length} / {item.settings.descLength} ch
                                        </span>
                                        <button 
                                          onClick={() => copyToClipboard(item.metadata.description, `desc-${item.id}`)}
                                          className="text-[10px] text-violet-600 hover:text-violet-700 font-bold flex items-center space-x-0.5 cursor-pointer"
                                        >
                                          <Copy className="w-3 h-3 mr-0.5" />
                                          <span>{copiedStatus[`desc-${item.id}`] ? 'Tersalin ✓' : 'Salin'}</span>
                                        </button>
                                      </div>
                                    </div>
                                    <textarea 
                                      rows={2}
                                      value={item.metadata.description}
                                      onChange={(e) => updateItemField(item.id, 'description', e.target.value)}
                                      className="w-full text-xs p-3.5 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-violet-500 font-medium resize-none shadow-inner text-slate-800"
                                    />
                                  </div>

                                  {/* Categories mapping panels */}
                                  {Object.keys(item.metadata.categories || {}).length > 0 && (
                                    <div className="space-y-2 pt-3 border-t border-slate-150">
                                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center mb-1">
                                        <Layers className="w-4 h-4 mr-1.5 text-violet-500" />
                                        Kategori Oficial Platform Target
                                      </label>
                                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {Object.entries(item.metadata.categories).map(([platform, rawName]) => {
                                          if (!rawName) return null;
                                          const name = rawName as string;
                                          let isPlatformEnabled = false;
                                          let friendlyName = platform;
                                          let optionsList: string[] = [];

                                          if (platform === 'shutterstock1' && targetPlatforms.shutterstock) {
                                            friendlyName = 'Shutterstock Cat 1';
                                            isPlatformEnabled = true;
                                            optionsList = SHUTTERSTOCK_CATEGORIES;
                                          } else if (platform === 'shutterstock2' && targetPlatforms.shutterstock) {
                                            friendlyName = 'Shutterstock Cat 2';
                                            isPlatformEnabled = true;
                                            optionsList = SHUTTERSTOCK_CATEGORIES;
                                          } else if (platform === 'adobeStock' && targetPlatforms.adobeStock) {
                                            friendlyName = 'Adobe Stock';
                                            isPlatformEnabled = true;
                                            optionsList = ADOBE_STOCK_CATEGORIES;
                                          } else if (platform === 'dreamstime' && targetPlatforms.dreamstime) {
                                            friendlyName = 'Dreamstime';
                                            isPlatformEnabled = true;
                                            optionsList = DREAMSTIME_CATEGORIES;
                                          } else if (platform === 'vecteezy' && targetPlatforms.vecteezy) {
                                            friendlyName = 'Vecteezy';
                                            isPlatformEnabled = true;
                                            optionsList = VECTEEZY_CATEGORIES;
                                          } else if (platform === 'canva' && targetPlatforms.canva) {
                                            friendlyName = 'Canva';
                                            isPlatformEnabled = true;
                                            optionsList = CANVA_CATEGORIES;
                                          } else if (platform !== 'shutterstock1' && platform !== 'shutterstock2' && targetPlatforms[platform as keyof TargetPlatforms]) {
                                            friendlyName = platform.charAt(0).toUpperCase() + platform.slice(1);
                                            isPlatformEnabled = true;
                                          }

                                          if (!isPlatformEnabled) return null;

                                          const listToUse = [...optionsList];
                                          // Add AI-suggested category to options if not present in default options
                                          if (name && !listToUse.includes(name)) {
                                            listToUse.unshift(name);
                                          }

                                          return (
                                            <div 
                                              key={`cat-list-${platform}`}
                                              className="bg-slate-50 border border-slate-200/80 hover:border-violet-300 hover:bg-white p-2.5 rounded-2xl shadow-sm transition-all duration-200 flex flex-col justify-between"
                                            >
                                              <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                                {friendlyName}
                                              </span>
                                              {listToUse.length > 0 ? (
                                                <select
                                                  value={name}
                                                  onChange={(e) => updateItemField(item.id, 'categories', { [platform]: e.target.value })}
                                                  className="block w-full text-xs font-bold text-slate-700 bg-transparent border-none p-0 focus:outline-none focus:ring-0 cursor-pointer pr-4"
                                                >
                                                  {listToUse.map(opt => (
                                                    <option key={opt} value={opt} className="font-semibold text-slate-850">
                                                      {opt}
                                                    </option>
                                                  ))}
                                                </select>
                                              ) : (
                                                <input
                                                  type="text"
                                                  value={name}
                                                  onChange={(e) => updateItemField(item.id, 'categories', { [platform]: e.target.value })}
                                                  className="block w-full text-xs font-bold text-slate-700 bg-transparent border-none p-0 focus:outline-none focus:ring-0"
                                                />
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  {/* Keywords copy tags and editable area */}
                                  <div className="space-y-2 pt-3 border-t border-slate-150">
                                    <div className="flex justify-between items-center text-xs font-bold">
                                      <label className="text-slate-600 flex items-center">
                                        <Tag className="w-4 h-4 mr-1.5 text-violet-500" />
                                        Tags Kata Kunci ({item.metadata.keywords.length})
                                      </label>
                                      <button 
                                        onClick={() => copyToClipboard(item.metadata.keywords.join(', '), `kws-${item.id}`)}
                                        className="text-[10px] text-violet-600 hover:text-violet-700 font-bold flex items-center space-x-0.5 cursor-pointer"
                                      >
                                        <Copy className="w-3 h-3 mr-0.5" />
                                        <span>{copiedStatus[`kws-${item.id}`] ? 'Tersalin Selesai ✓' : 'Salin Semua (Separator Koma)'}</span>
                                      </button>
                                    </div>

                                    {/* Scrollable list grid of tags */}
                                    <div className="p-3 bg-white hover:border-slate-300 rounded-2xl border border-slate-200 max-h-36 overflow-y-auto shadow-inner">
                                      <div className="flex flex-wrap gap-1.5">
                                        {item.metadata.keywords.map((kw, kwIdx) => (
                                          <button
                                            key={`kw-badge-${kwIdx}`}
                                            onClick={() => copyToClipboard(kw, `kw-tag-${item.id}-${kwIdx}`)}
                                            className="text-[10px] bg-slate-50 hover:bg-violet-50 border border-slate-200 hover:border-violet-300 text-slate-600 hover:text-violet-600 font-bold px-2.5 py-1.5 rounded-xl transition-all flex items-center space-x-1 cursor-pointer"
                                          >
                                            <span>{kw}</span>
                                            {copiedStatus[`kw-tag-${item.id}-${kwIdx}`] && (
                                              <span className="text-[8px] text-emerald-600 font-bold ml-1">✓</span>
                                            )}
                                          </button>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Manual keywords string editing */}
                                    <div className="pt-1 select-none">
                                      <p className="text-[9px] text-slate-400 font-semibold mb-1">
                                        Atau sunting kata kunci secara manual (pisahkan dengan koma):
                                      </p>
                                      <input 
                                        type="text"
                                        value={item.metadata.keywords.join(', ')}
                                        onChange={(e) => updateItemField(item.id, 'keywords', e.target.value)}
                                        placeholder="Kata kunci dipisahkan koma..."
                                        className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:border-violet-500 bg-white shadow-inner text-slate-800"
                                      />
                                    </div>
                                  </div>

                                </>
                              )}

                            </div>
                          )}
                        </div>
                      );
                    })
                  )}

                </div>

              </div>

              {/* Informative Footer notes and legalities within editor column */}
              <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-400 font-bold gap-3">
                <div className="flex items-center space-x-1">
                  <Info className="w-3.5 h-3.5 text-violet-500" />
                  <span>Sistem secara otomatis mengabaikan metadata sampah & trademark brand terlarang.</span>
                </div>
                <span>Sesuai standar Adobe Stock, Shutterstock & Canva Studio</span>
              </div>

            </div>

          </div>

        </div>

      </main>

      {/* Structured Minimalist Premium Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-black text-slate-800">METAZO AI SUITE</span>
              <span className="h-1.5 w-1.5 rounded-full bg-violet-600 animate-pulse"></span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Microstock Hub</span>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-semibold">
              Sistem optimalisasi metadata visual microstock terintegrasi berbasis Gemini & Groq.
            </p>
          </div>

          <div className="flex items-center space-x-5 text-xs text-slate-400 font-bold">
            <span className="hover:text-slate-900 cursor-pointer">Panduan SEO</span>
            <span className="hover:text-slate-900 cursor-pointer">Bantuan API</span>
            <span className="hover:text-slate-900 cursor-pointer">Kebijakan Hak Cipta</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
