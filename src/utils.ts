import { BANNED_TRADEMARKS } from './constants';
import { QueueItem } from './types';

// Scan text for potential IP or Trademark violations
export function scanIPViolations(text: string): string[] {
  if (!text) return [];
  const lowerText = text.toLowerCase();
  const detected: string[] = [];
  
  BANNED_TRADEMARKS.forEach(brand => {
    const regex = new RegExp(`\\b${brand}\\b`, 'i');
    if (regex.test(lowerText)) {
      detected.push(brand);
    }
  });
  
  return detected;
}

// Measure SEO quality of title and keywords
export function measureSEOQuality(item: QueueItem): { score: number; issues: string[] } {
  let score = 100;
  const issues: string[] = [];
  const title = item.metadata.title || "";
  const description = item.metadata.description || "";
  const keywords = item.metadata.keywords || [];

  // Title validation
  if (title.length < 15) {
    score -= 20;
    issues.push("Judul terlalu pendek (kurang dari 15 karakter)");
  } else if (title.length > (item.settings?.titleLength || 80) + 20) {
    score -= 10;
    issues.push("Judul melebihi preferensi target");
  }

  // Description validation
  if (description.length < 30) {
    score -= 15;
    issues.push("Deskripsi terlalu singkat (kurang dari 30 karakter)");
  }

  // Keywords counts
  const targetKeywords = item.settings?.keywordsCount || 40;
  if (keywords.length < 15) {
    score -= 25;
    issues.push("Jumlah kata kunci terlalu sedikit (kurang dari 15)");
  } else if (keywords.length < targetKeywords - 5) {
    score -= 10;
    issues.push(`Target kata kunci belum maksimal (baru ${keywords.length}/${targetKeywords})`);
  }

  // Low value keywords detection (spam metrics)
  const lowValueKeywords = ['cool', 'nice', 'beautiful', 'image', 'photo', 'vector', 'illustration', 'clipart', 'camera', 'dslr'];
  const spamDetected = keywords.filter(kw => lowValueKeywords.includes(kw.toLowerCase()));
  if (spamDetected.length > 0) {
    score -= (spamDetected.length * 5);
    issues.push(`Terdeteksi kata kunci bernilai rendah/spam (${spamDetected.slice(0, 3).join(', ')})`);
  }

  // Trademark detection in keywords check
  const trademarkKws = keywords.filter(kw => {
    const violations = scanIPViolations(kw);
    return violations.length > 0;
  });
  if (trademarkKws.length > 0) {
    score -= 30;
    issues.push(`Mengandung keyword trademark terlarang (${trademarkKws.join(', ')})`);
  }

  return {
    score: Math.max(score, 10),
    issues: issues
  };
}

// Image compression
export function resizeAndCompressImage(
  base64Str: string,
  maxWidth = 1024,
  maxHeight = 1024
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = `data:image/png;base64,${base64Str}`;
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Calculate optimal resolution
      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
      }

      // Compress to JPEG with 75% quality for performance
      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.75);
      resolve(compressedDataUrl.split(',')[1]);
    };
    img.onerror = () => {
      resolve(base64Str); // Fallback
    };
  });
}

// Extract three frames from video: Start (10%), Middle (50%), End (90%)
export function extractVideoFrames(file: File): Promise<string[]> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';

    video.onloadedmetadata = () => {
      const duration = video.duration;
      const timestamps = [duration * 0.1, duration * 0.5, duration * 0.9];
      const frames: string[] = [];
      let index = 0;

      const captureFrame = () => {
        if (index >= timestamps.length) {
          URL.revokeObjectURL(video.src);
          resolve(frames);
          return;
        }
        video.currentTime = timestamps[index];
      };

      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }
        const dataUrl = canvas.toDataURL('image/png');
        frames.push(dataUrl.split(',')[1]);
        index++;
        captureFrame();
      };

      captureFrame();
    };

    video.onerror = () => {
      resolve([]);
    };
  });
}

// CSV Generator conforming to microstock specifications
export function generatePlatformCSV(successItems: QueueItem[], platformKey: string): void {
  if (successItems.length === 0) return;

  let csvContent = "";
  let fileName = "";

  const sanitizeCSV = (str: string) => `"${str.replace(/"/g, '""')}"`;

  switch (platformKey) {
    case 'shutterstock':
      csvContent = "Filename,Description,Keywords,Category 1,Category 2\n" + 
        successItems.map(i => [
          sanitizeCSV(i.name),
          sanitizeCSV(i.metadata.description),
          sanitizeCSV(i.metadata.keywords.join(',')),
          sanitizeCSV(i.metadata.categories?.shutterstock1 || 'Abstract'),
          sanitizeCSV(i.metadata.categories?.shutterstock2 || '')
        ].join(",")).join("\n");
      fileName = `shutterstock_batch_${Date.now()}.csv`;
      break;

    case 'adobeStock':
      csvContent = "Filename,Title,Keywords,Category\n" + 
        successItems.map(i => [
          sanitizeCSV(i.name),
          sanitizeCSV(i.metadata.title),
          sanitizeCSV(i.metadata.keywords.join(',')),
          sanitizeCSV(i.metadata.categories?.adobeStock || 'Graphics')
        ].join(",")).join("\n");
      fileName = `adobe_stock_batch_${Date.now()}.csv`;
      break;

    case 'freepik':
      csvContent = "Filename,Title,Keywords\n" + 
        successItems.map(i => [
          sanitizeCSV(i.name),
          sanitizeCSV(i.metadata.title),
          sanitizeCSV(i.metadata.keywords.join(','))
        ].join(",")).join("\n");
      fileName = `freepik_batch_${Date.now()}.csv`;
      break;

    case 'istock':
      csvContent = "Filename,Title,Description,Keywords\n" + 
        successItems.map(i => [
          sanitizeCSV(i.name),
          sanitizeCSV(i.metadata.title),
          sanitizeCSV(i.metadata.description),
          sanitizeCSV(i.metadata.keywords.join(','))
        ].join(",")).join("\n");
      fileName = `istock_getty_batch_${Date.now()}.csv`;
      break;

    case 'vecteezy':
      csvContent = "Filename,Title,Description,Keywords,Category\n" + 
        successItems.map(i => [
          sanitizeCSV(i.name),
          sanitizeCSV(i.metadata.title),
          sanitizeCSV(i.metadata.description),
          sanitizeCSV(i.metadata.keywords.join(',')),
          sanitizeCSV(i.metadata.categories?.vecteezy || 'Backgrounds')
        ].join(",")).join("\n");
      fileName = `vecteezy_batch_${Date.now()}.csv`;
      break;

    case 'canva':
      csvContent = "Filename,Title,Description,Keywords,Theme\n" + 
        successItems.map(i => [
          sanitizeCSV(i.name),
          sanitizeCSV(i.metadata.title),
          sanitizeCSV(i.metadata.description),
          sanitizeCSV(i.metadata.keywords.join(',')),
          sanitizeCSV(i.metadata.categories?.canva || 'Elements')
        ].join(",")).join("\n");
      fileName = `canva_batch_${Date.now()}.csv`;
      break;

    case 'dreamstime':
      csvContent = "Filename,Title,Description,Keywords,Category\n" + 
        successItems.map(i => [
          sanitizeCSV(i.name),
          sanitizeCSV(i.metadata.title),
          sanitizeCSV(i.metadata.description),
          sanitizeCSV(i.metadata.keywords.join(',')),
          sanitizeCSV(i.metadata.categories?.dreamstime || 'Abstract')
        ].join(",")).join("\n");
      fileName = `dreamstime_batch_${Date.now()}.csv`;
      break;

    default:
      return;
  }

  // Trigger browser download in UTF-8
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
