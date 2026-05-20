// 이 파일은 iOS 온디바이스 Gemma 4 E2B Capacitor 플러그인을 안전하게 호출합니다.
import { Capacitor, registerPlugin } from "@capacitor/core";

export type GemmaStatus = {
  supported: boolean;
  modelName: string;
  fileName: string;
  installed: boolean;
  sizeBytes: number;
  downloadedBytes: number;
  downloadURL: string;
  backend: string;
};

export type GemmaGenerateResult = {
  text: string;
  modelName: string;
  backend: string;
};

type JipbabGemmaPlugin = {
  status: () => Promise<GemmaStatus>;
  download: () => Promise<GemmaStatus>;
  remove: () => Promise<GemmaStatus>;
  generate: (options: { prompt: string; maxTokens?: number }) => Promise<GemmaGenerateResult>;
};

const NativeGemma = registerPlugin<JipbabGemmaPlugin>("JipbabGemma");

export function isNativeGemmaAvailable() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}

export async function getGemmaStatus(): Promise<GemmaStatus> {
  if (!isNativeGemmaAvailable()) {
    return {
      supported: false,
      modelName: "Gemma-4-E2B-it",
      fileName: "gemma-4-E2B-it.litertlm",
      installed: false,
      sizeBytes: 2_583_085_056,
      downloadedBytes: 0,
      downloadURL: "https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm",
      backend: "cpu",
    };
  }

  return NativeGemma.status();
}

export async function downloadGemmaModel() {
  return NativeGemma.download();
}

export async function removeGemmaModel() {
  return NativeGemma.remove();
}

export async function generateWithGemma(prompt: string) {
  return NativeGemma.generate({ prompt, maxTokens: 512 });
}

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0MB";
  }

  const gb = bytes / 1_000_000_000;
  if (gb >= 1) {
    return `${gb.toFixed(2)}GB`;
  }

  return `${Math.round(bytes / 1_000_000)}MB`;
}
