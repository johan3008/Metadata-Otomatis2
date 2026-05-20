export type AssetType = 'image' | 'vector' | 'video';

export interface Metadata {
  title: string;
  description: string;
  keywords: string[];
  categories: {
    shutterstock1?: string;
    shutterstock2?: string;
    adobeStock?: string;
    dreamstime?: string;
    vecteezy?: string;
    canva?: string;
    freepik?: string;
  };
}

export interface ItemSettings {
  titleLength: number;
  descLength: number;
  keywordsCount: number;
  keyConcepts: string;
}

export interface QueueItem {
  id: string;
  name: string;
  type: AssetType;
  preview: string | null; // objectURL or base64
  base64: string; // compressed base64 for image API payload
  videoFrames: string[]; // 3 base64 frames for video
  status: 'pending' | 'processing' | 'success' | 'error';
  errorMsg: string | null;
  metadata: Metadata;
  settings: ItemSettings;
}

export type AuthProvider = 'gemini' | 'groq' | 'helper';

export interface TargetPlatforms {
  shutterstock: boolean;
  adobeStock: boolean;
  freepik: boolean;
  istock: boolean;
  vecteezy: boolean;
  canva: boolean;
  dreamstime: boolean;
}
