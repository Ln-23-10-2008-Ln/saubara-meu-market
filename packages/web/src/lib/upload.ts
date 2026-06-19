/**
 * Upload helper — cliente frontend para upload de imagens via R2 presigned URL
 *
 * Uso:
 *   import { uploadImage } from "@/lib/upload";
 *   const url = await uploadImage(file, "product");
 *   const url = await uploadImage(file, "store-logo");
 *   const url = await uploadImage(file, "store-cover");
 */

export type UploadType = "product" | "store-logo" | "store-cover" | "avatar";

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export class UploadError extends Error {
  constructor(
    message: string,
    public readonly code: "INVALID_TYPE" | "TOO_LARGE" | "AUTH_REQUIRED" | "UPLOAD_FAILED" | "PRESIGN_FAILED" | "S3_NOT_CONFIGURED"
  ) {
    super(message);
    this.name = "UploadError";
  }
}

/**
 * Faz upload de uma imagem para o R2 via presigned URL.
 * Retorna a URL pública da imagem após upload bem-sucedido.
 *
 * @param file        Arquivo de imagem (jpg/jpeg/png/webp, máx 5MB)
 * @param uploadType  Contexto do upload: "product" | "store-logo" | "store-cover"
 * @returns           URL pública da imagem no R2
 */
export async function uploadImage(file: File, uploadType: UploadType = "product"): Promise<string> {
  // ── Validação local antes de chamar API ──────────────────────────────────
  if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
    throw new UploadError(
      `Formato não permitido: ${file.type}. Use JPG, PNG ou WebP.`,
      "INVALID_TYPE"
    );
  }

  if (file.size > MAX_SIZE_BYTES) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(1);
    throw new UploadError(
      `Imagem muito grande: ${sizeMB}MB. Máximo permitido: 5MB.`,
      "TOO_LARGE"
    );
  }

  if (file.size === 0) {
    throw new UploadError("Arquivo inválido (tamanho zero).", "UPLOAD_FAILED");
  }

  // ── Solicitar URL presigned ao backend ────────────────────────────────────
  let presignedUrl: string;
  let imageUrl: string;

  try {
    const res = await fetch("/api/upload/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // envia cookie smm_session
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
        uploadType,
        fileSize: file.size,
      }),
    });

    if (res.status === 401) {
      throw new UploadError("Sessão expirada. Faça login novamente.", "AUTH_REQUIRED");
    }
    if (res.status === 503) {
      throw new UploadError("Upload temporariamente indisponível.", "S3_NOT_CONFIGURED");
    }

    const data = await res.json() as {
      success: boolean;
      presignedUrl?: string;
      imageUrl?: string;
      error?: string;
    };

    if (!data.success || !data.presignedUrl || !data.imageUrl) {
      throw new UploadError(data.error || "Falha ao preparar upload.", "PRESIGN_FAILED");
    }

    presignedUrl = data.presignedUrl;
    // imageUrl do backend é URL do proxy /api/upload/serve?key=...
    imageUrl = data.imageUrl;
  } catch (err) {
    if (err instanceof UploadError) throw err;
    throw new UploadError("Erro de conexão ao preparar upload.", "PRESIGN_FAILED");
  }

  // ── Enviar arquivo diretamente ao R2 ──────────────────────────────────────
  try {
    const putRes = await fetch(presignedUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
    });

    if (!putRes.ok) {
      throw new UploadError(
        `Falha ao enviar imagem ao servidor (${putRes.status}).`,
        "UPLOAD_FAILED"
      );
    }
  } catch (err) {
    if (err instanceof UploadError) throw err;
    throw new UploadError("Erro ao enviar imagem. Verifique sua conexão.", "UPLOAD_FAILED");
  }

  return imageUrl;
}

/**
 * Converte File para data URL (fallback local, sem upload).
 * Usado apenas quando R2 não está disponível.
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Tenta upload para R2; se falhar por configuração, faz fallback para base64.
 * Útil durante desenvolvimento local sem R2 configurado.
 */
export async function uploadImageWithFallback(
  file: File,
  uploadType: UploadType = "product"
): Promise<{ url: string; isLocal: boolean }> {
  try {
    const url = await uploadImage(file, uploadType);
    return { url, isLocal: false };
  } catch (err) {
    if (err instanceof UploadError && (
      err.code === "S3_NOT_CONFIGURED" ||
      err.code === "AUTH_REQUIRED"
    )) {
      // S3_NOT_CONFIGURED: R2 não configurado (esperado sem env vars)
      // AUTH_REQUIRED: usuário não autenticado (ex: formulário de cadastro pré-login)
      // Em ambos os casos usa base64 local como fallback
      console.warn(`[UPLOAD] fallback base64 (${err.code})`);
      const url = await fileToDataUrl(file);
      return { url, isLocal: true };
    }
    throw err;
  }
}
