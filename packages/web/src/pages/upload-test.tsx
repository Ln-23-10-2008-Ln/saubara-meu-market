import { useState } from "react";
import { uploadImageWithFallback, fileToDataUrl, type UploadType } from "../lib/upload";

type TestResult = {
  type: UploadType;
  url: string | null;
  fileName: string | null;
  isLocal: boolean | null;
  error: string | null;
  onChangeFired: boolean;
};

function UploadSlot({ label, uploadType }: { label: string; uploadType: UploadType }) {
  const [result, setResult] = useState<TestResult>({
    type: uploadType,
    url: null,
    fileName: null,
    isLocal: null,
    error: null,
    onChangeFired: false,
  });
  const [loading, setLoading] = useState(false);

  async function handleFile(file: File) {
    console.log(`[upload-test][${uploadType}] handleFile called`, file.name, file.type, file.size);
    setLoading(true);
    setResult((r) => ({ ...r, url: null, fileName: null, isLocal: null, error: null, onChangeFired: false }));

    try {
      console.log(`[upload-test][${uploadType}] calling uploadImageWithFallback`);
      const { url, isLocal } = await uploadImageWithFallback(file, uploadType);
      console.log(`[upload-test][${uploadType}] SUCCESS isLocal=${isLocal}`, url?.slice(0, 60));

      console.log(`[upload-test][${uploadType}] firing onChange with url`);
      setResult({
        type: uploadType,
        url,
        fileName: file.name,
        isLocal,
        error: null,
        onChangeFired: true,
      });
    } catch (err: any) {
      console.error(`[upload-test][${uploadType}] CATCH error (não tratado por uploadImageWithFallback)`, err);
      setResult((r) => ({
        ...r,
        error: err?.message || String(err),
        onChangeFired: false,
      }));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ border: "2px solid #ccc", borderRadius: 8, padding: 16, marginBottom: 16, background: "#fff" }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 14, color: "#333" }}>
        {label} <code style={{ fontSize: 11, background: "#eee", padding: "2px 4px", borderRadius: 3 }}>{uploadType}</code>
      </h3>

      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          console.log(`[upload-test][${uploadType}] input onChange`, e.target.files?.[0]?.name);
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
        style={{ display: "block", marginBottom: 8 }}
      />

      {loading && <p style={{ color: "#888", fontSize: 12 }}>Processando...</p>}

      {result.onChangeFired && result.url && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
          <img
            src={result.url}
            alt="preview"
            style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 6, border: "2px solid #22c55e" }}
          />
          <div>
            <p style={{ margin: 0, fontSize: 12, color: "#22c55e", fontWeight: "bold" }}>✅ onChange disparado</p>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#555" }}>Arquivo: {result.fileName}</p>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#555" }}>Método: {result.isLocal ? "base64 local" : "R2/S3 remoto"}</p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "#999", wordBreak: "break-all" }}>
              URL: {result.url?.slice(0, 80)}...
            </p>
          </div>
        </div>
      )}

      {result.error && (
        <div style={{ marginTop: 8, padding: 8, background: "#fee2e2", borderRadius: 4 }}>
          <p style={{ margin: 0, fontSize: 12, color: "#dc2626", fontWeight: "bold" }}>❌ ERRO</p>
          <p style={{ margin: "4px 0 0", fontSize: 11, color: "#7f1d1d" }}>{result.error}</p>
        </div>
      )}

      {!result.onChangeFired && !result.error && !loading && (
        <p style={{ fontSize: 12, color: "#aaa", margin: "8px 0 0" }}>Aguardando seleção de arquivo...</p>
      )}

      <button
        onClick={() =>
          setResult({ type: uploadType, url: null, fileName: null, isLocal: null, error: null, onChangeFired: false })
        }
        style={{ marginTop: 8, fontSize: 11, padding: "2px 8px", cursor: "pointer" }}
      >
        Limpar
      </button>
    </div>
  );
}

export default function UploadTest() {
  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: 24, fontFamily: "sans-serif", background: "#f5f5f5", minHeight: "100vh" }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>🧪 Upload Test Page</h1>
      <p style={{ fontSize: 13, color: "#666", marginBottom: 24 }}>
        Teste visual de uploadImageWithFallback para cada tipo. Abra o console para logs detalhados.
      </p>

      <UploadSlot label="Foto do Responsável" uploadType="avatar" />
      <UploadSlot label="Logo da Loja" uploadType="store-logo" />
      <UploadSlot label="Fachada da Loja" uploadType="store-cover" />
      <UploadSlot label="Avatar (client.tsx)" uploadType="avatar" />

      <div style={{ marginTop: 24, padding: 12, background: "#1e293b", borderRadius: 8 }}>
        <p style={{ color: "#94a3b8", fontSize: 12, margin: 0 }}>
          ✅ = onChange disparado + miniatura apareceu<br />
          ❌ = fluxo morreu — verifique console para linha exata
        </p>
      </div>
    </div>
  );
}
