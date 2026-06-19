import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { smartBack } from "../../lib/navigation";
import { useAuth, UserType, LOCALIDADES, Localidade } from "../../lib/auth";
import { IS_DEV_MODE } from "../../lib/devmode";
import { uploadImageWithFallback, fileToDataUrl, type UploadType } from "../../lib/upload";

// ─── CPF helpers ─────────────────────────────────────────────────────────────

function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0,3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6)}`;
  return `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6,9)}-${digits.slice(9)}`;
}

function validateCPF(cpf: string): boolean {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(d[i]) * (10 - i);
  let r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  if (r !== parseInt(d[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(d[i]) * (11 - i);
  r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  return r === parseInt(d[10]);
}

const CATEGORIES = [
  { value: "construcao", label: "Construção", icon: "🏗️" },
  { value: "informatica", label: "Informática", icon: "💻" },
  { value: "celulares", label: "Celulares", icon: "📱" },
  { value: "moda", label: "Moda", icon: "👗" },
  { value: "cosmeticos", label: "Cosméticos", icon: "💄" },
  { value: "papelaria", label: "Papelaria", icon: "📚" },
  { value: "utilidades", label: "Utilidades", icon: "🏠" },
  { value: "artesanato", label: "Artesanato", icon: "🎨" },
  { value: "servicos", label: "Serviços", icon: "🔧" },
];

// ─── Photo Upload Field ───────────────────────────────────────────────────────

interface PhotoFieldProps {
  label: string;
  hint: string;
  required?: boolean;
  value: string;
  onChange: (url: string) => void;
  accent?: string;
  uploadType?: UploadType;
}

function PhotoField({ label, hint, required, value, onChange, accent = "#0F9D8A", uploadType = "store-logo" }: PhotoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const { url } = await uploadImageWithFallback(file, uploadType);
      onChange(url);
    } catch (_err) {
      // qualquer falha no upload: base64 inline direto, sem depender de backend
      try {
        const url = await fileToDataUrl(file);
        onChange(url);
      } catch (_e2) {
        // silenciar apenas se base64 também falhar (impossível em browser normal)
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ marginBottom: "16px" }}>
      <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#444", marginBottom: "6px" }}>
        {label}
        {required && <span style={{ color: "#e53935", marginLeft: "3px" }}>*</span>}
        {!required && <span style={{ color: "#aaa", fontWeight: 400, marginLeft: "6px" }}>(opcional)</span>}
      </label>
      <p style={{ fontSize: "11px", color: "#888", margin: "0 0 8px" }}>{hint}</p>

      {value ? (
        <div style={{ position: "relative", borderRadius: "12px", overflow: "hidden", border: `2px solid ${accent}`, boxShadow: `0 0 0 4px ${accent}18` }}>
          <img src={value} alt={label} style={{ width: "100%", height: "140px", objectFit: "cover", display: "block" }} />
          <button
            type="button"
            onClick={() => onChange("")}
            style={{ position: "absolute", top: "8px", right: "8px", background: "rgba(0,0,0,0.6)", border: "none", color: "white", borderRadius: "8px", padding: "4px 10px", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}
          >
            ✕ Remover
          </button>
          <div style={{ position: "absolute", bottom: "8px", left: "8px", background: `${accent}ee`, color: "white", borderRadius: "6px", padding: "3px 8px", fontSize: "10px", fontWeight: 700 }}>
            ✓ Foto carregada
          </div>
        </div>
      ) : (
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          style={{
            border: `2px dashed ${dragging ? accent : "#d0d0d0"}`,
            borderRadius: "12px",
            padding: "24px 16px",
            textAlign: "center",
            cursor: uploading ? "wait" : "pointer",
            background: dragging ? `${accent}08` : "#fafafa",
            transition: "all 0.2s",
            opacity: uploading ? 0.7 : 1,
          }}
        >
          <div style={{ fontSize: "28px", marginBottom: "8px" }}>{uploading ? "⏳" : "📷"}</div>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "#555", marginBottom: "4px" }}>
            {uploading ? "Enviando..." : "Clique para selecionar ou arraste aqui"}
          </div>
          <div style={{ fontSize: "11px", color: "#aaa" }}>JPG, PNG, WEBP — máx. 5MB</div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RegisterPage() {
  const [, navigate] = useLocation();
  const { register } = useAuth();

  const params = new URLSearchParams(window.location.search);
  const presetType = params.get("type") as UserType | null;

  // Steps: 1=tipo, 2=dados, 3=fotos (seller only)
  const [step, setStep] = useState<1 | 2 | 3>(presetType ? 2 : 1);
  const [accountType, setAccountType] = useState<UserType>(presetType || "client");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);

  const [form, setForm] = useState({
    name: "", email: "", phone: "", password: "", confirmPassword: "",
    cpf: "", storeName: "", storeCategory: "", storeWhatsapp: "",
    storeBio: "", storeHours: "", storeAddress: "",
    localidade: "" as Localidade | "",
    rua: "", numero: "", complemento: "", referencia: "",
  });

  // Service area multi-select (seller only)
  // Kept in a ref-like state so it NEVER resets between step transitions
  const [serviceArea, setServiceArea] = useState<Localidade[]>([]);
  const toggleServiceArea = (loc: Localidade) => {
    setServiceArea(prev =>
      prev.includes(loc) ? prev.filter(l => l !== loc) : [...prev, loc]
    );
  };

  // Photo state
  const [photoResponsavel, setPhotoResponsavel] = useState("");
  const [logoLoja, setLogoLoja] = useState("");
  const [fotoFachada, setFotoFachada] = useState("");

  const isSeller = accountType === "seller";

  const handleTypeSelect = (type: UserType) => {
    setAccountType(type);
    setStep(2);
  };

  // Validate step 2 fields before going to step 3
  const validateStep2 = () => {
    if (!form.name.trim()) return "Preencha o nome completo.";
    if (!form.email.trim()) return "Preencha o e-mail.";
    if (!form.phone.trim()) return "Preencha o telefone.";
    if (!form.password) return "Preencha a senha.";
    if (form.password.length < 6) return "A senha deve ter pelo menos 6 caracteres.";
    if (form.password !== form.confirmPassword) return "As senhas não coincidem.";
    if (isSeller && !form.storeName.trim()) return "Preencha o nome da loja.";
    if (isSeller && !form.storeCategory) return "Selecione a categoria da loja.";
    if (!form.cpf) return "CPF é obrigatório.";
    if (!validateCPF(form.cpf)) return "CPF inválido. Verifique e tente novamente.";
    if (!form.localidade) return "Selecione a sua localidade.";
    // Service area: sellers don't need to select, it's optional
    return "";
  };

  const handleNextToPhotos = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateStep2();
    if (err) { setError(err); return; }
    setError("");
    setStep(3);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (isSeller && !photoResponsavel) {
      setError("A foto do responsável é obrigatória.");
      return;
    }

    setLoading(true);
    const res = await register({
      type: accountType,
      name: form.name,
      email: form.email,
      phone: form.phone,
      password: form.password,
      cpf: form.cpf.replace(/\D/g, ""),
      storeName: form.storeName || undefined,
      storeCategory: form.storeCategory || undefined,
      storeWhatsapp: form.storeWhatsapp || undefined,
      storeBio: form.storeBio || undefined,
      storeHours: form.storeHours || undefined,
      storeAddress: form.storeAddress || undefined,
      storeLocalidade: form.localidade as Localidade || undefined,
      address: {
        localidade: form.localidade as Localidade,
        rua: form.rua || undefined,
        numero: form.numero || undefined,
        complemento: form.complemento || undefined,
        referencia: form.referencia || undefined,
      },
      serviceArea: isSeller && serviceArea.length > 0 ? serviceArea : undefined,
      photoResponsavel: photoResponsavel || undefined,
      logoLoja: logoLoja || undefined,
      fotoFachada: fotoFachada || undefined,
    });
    setLoading(false);

    if (res.success) {
      navigate("/auth/verify");
    } else {
      setError(res.error || "Erro ao cadastrar.");
    }
  };

  const inp: React.CSSProperties = {
    width: "100%", padding: "12px 14px", border: "1.5px solid #e0e0e0",
    borderRadius: "10px", fontSize: "14px", outline: "none", boxSizing: "border-box",
    transition: "border-color 0.2s", fontFamily: "inherit",
  };

  const totalSteps = isSeller ? 3 : 2;
  const stepLabels = isSeller
    ? ["Tipo de conta", "Seus dados", "Fotos"]
    : ["Tipo de conta", "Seus dados"];

  return (
    <div style={{ fontFamily: "'Poppins', system-ui, sans-serif", minHeight: "100vh", background: "linear-gradient(135deg, #0F9D8A 0%, #0B7A6E 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ width: "100%", maxWidth: "480px" }}>

        {/* Dev Mode Banner */}
        {IS_DEV_MODE && (
          <div style={{ background: "#FFF3CD", border: "1.5px solid #FFC107", borderRadius: "12px", padding: "10px 14px", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "16px" }}>🧪</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: "12px", color: "#7A4F00" }}>Modo Sandbox — Desenvolvimento</div>
              <div style={{ fontSize: "11px", color: "#7A4F00", marginTop: "1px" }}>
                Após cadastrar, use o código <strong>123456</strong> ou clique em "Entrar sem verificar".
              </div>
            </div>
          </div>
        )}

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <button onClick={() => navigate("/")} style={{ background: "none", border: "none", cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
              <div style={{ width: "40px", height: "40px", background: "white", borderRadius: "11px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: "20px" }}>🛍️</span>
              </div>
              <span style={{ color: "white", fontSize: "24px", fontWeight: 700 }}>Saubara</span>
            </div>
          </button>
        </div>

        <div style={{ background: "white", borderRadius: "20px", padding: "28px 32px", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>

          {/* Step indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "24px" }}>
            {stepLabels.map((label, idx) => {
              const s = idx + 1;
              const active = step >= s;
              const done = step > s;
              return (
                <div key={s} style={{ display: "flex", alignItems: "center", gap: "6px", flex: s < totalSteps ? "1" : undefined }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                    <div style={{
                      width: "26px", height: "26px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                      background: active ? (s === 3 ? "#FF8A50" : "#0F9D8A") : "#e0e0e0",
                      color: active ? "white" : "#999",
                      fontSize: "12px", fontWeight: 700, flexShrink: 0,
                    }}>
                      {done ? "✓" : s}
                    </div>
                    <span style={{ fontSize: "11px", color: active ? "#333" : "#aaa", fontWeight: active ? 600 : 400, whiteSpace: "nowrap" }}>
                      {label}
                    </span>
                  </div>
                  {s < totalSteps && (
                    <div style={{ flex: 1, height: "2px", background: step > s ? "#0F9D8A" : "#e0e0e0", minWidth: "16px" }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Step 1: Choose type ──────────────────────────────────────────── */}
          {step === 1 && (
            <div>
              <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#1a1a1a", margin: "0 0 6px" }}>Criar conta</h1>
              <p style={{ color: "#777", fontSize: "13px", margin: "0 0 24px" }}>Como você quer usar o Saubara?</p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <button onClick={() => handleTypeSelect("client")}
                  style={{ border: "2px solid #e0e0e0", borderRadius: "14px", padding: "24px 16px", cursor: "pointer", background: "white", textAlign: "center", transition: "all 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#0F9D8A"; e.currentTarget.style.background = "#f0faf9"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#e0e0e0"; e.currentTarget.style.background = "white"; }}>
                  <div style={{ fontSize: "36px", marginBottom: "10px" }}>🛒</div>
                  <div style={{ fontWeight: 700, color: "#1a1a1a", fontSize: "15px", marginBottom: "6px" }}>Cliente</div>
                  <div style={{ fontSize: "12px", color: "#777", lineHeight: 1.4 }}>Compre produtos e serviços locais</div>
                </button>

                <button onClick={() => handleTypeSelect("seller")}
                  style={{ border: "2px solid #e0e0e0", borderRadius: "14px", padding: "24px 16px", cursor: "pointer", background: "white", textAlign: "center", transition: "all 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#FF8A50"; e.currentTarget.style.background = "#fff8f5"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#e0e0e0"; e.currentTarget.style.background = "white"; }}>
                  <div style={{ fontSize: "36px", marginBottom: "10px" }}>🏪</div>
                  <div style={{ fontWeight: 700, color: "#1a1a1a", fontSize: "15px", marginBottom: "6px" }}>Comerciante</div>
                  <div style={{ fontSize: "12px", color: "#777", lineHeight: 1.4 }}>Venda seus produtos para a região</div>
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Fill form ────────────────────────────────────────────── */}
          {step === 2 && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                <div style={{ background: isSeller ? "#fff8f5" : "#f0faf9", borderRadius: "10px", padding: "8px 12px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "20px" }}>{isSeller ? "🏪" : "🛒"}</span>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: isSeller ? "#FF8A50" : "#0F9D8A" }}>
                    {isSeller ? "Conta Comerciante" : "Conta Cliente"}
                  </span>
                </div>
                {!presetType && (
                  <button onClick={() => setStep(1)} style={{ background: "none", border: "none", cursor: "pointer", color: "#999", fontSize: "12px" }}>
                    Mudar →
                  </button>
                )}
              </div>

              <form onSubmit={isSeller ? handleNextToPhotos : handleSubmit}>
                {/* Name */}
                <div style={{ marginBottom: "14px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#555", marginBottom: "5px" }}>Nome completo *</label>
                  <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Seu nome" style={inp}
                    onFocus={e => (e.target.style.borderColor = "#0F9D8A")} onBlur={e => (e.target.style.borderColor = "#e0e0e0")} />
                </div>

                {/* Seller extras */}
                {isSeller && (
                  <>
                    <div style={{ marginBottom: "14px" }}>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#555", marginBottom: "5px" }}>Nome da loja *</label>
                      <input type="text" value={form.storeName} onChange={e => setForm({ ...form, storeName: e.target.value })} placeholder="Ex: Maria Cosméticos" style={inp}
                        onFocus={e => (e.target.style.borderColor = "#FF8A50")} onBlur={e => (e.target.style.borderColor = "#e0e0e0")} />
                    </div>
                    <div style={{ marginBottom: "14px" }}>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#555", marginBottom: "5px" }}>Categoria *</label>
                      <select value={form.storeCategory} onChange={e => setForm({ ...form, storeCategory: e.target.value })}
                        style={{ ...inp, cursor: "pointer", background: "white" }}
                        onFocus={e => (e.target.style.borderColor = "#FF8A50")} onBlur={e => (e.target.style.borderColor = "#e0e0e0")}>
                        <option value="">Selecione uma categoria</option>
                        {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
                      </select>
                    </div>
                    <div style={{ marginBottom: "14px", padding: "14px 16px", background: "#f0fff8", border: "1.5px solid #b2f5e0", borderRadius: "12px" }}>
                      <div style={{ fontSize: "12px", fontWeight: 700, color: "#1a7a50", marginBottom: "8px" }}>
                        💬 WhatsApp Comercial
                      </div>
                      <input type="tel" value={form.storeWhatsapp} onChange={e => setForm({ ...form, storeWhatsapp: e.target.value.replace(/\D/g, "") })}
                        placeholder="5571999990001 (com DDD e código do país)" style={{ ...inp, borderColor: "#25D366" }}
                        onFocus={e => (e.target.style.borderColor = "#25D366")} onBlur={e => (e.target.style.borderColor = "#25D366")} />
                      <p style={{ fontSize: "11px", color: "#888", margin: "6px 0 0" }}>Formato: 55 + DDD + número. Ex: 5571999990001</p>
                    </div>
                    {/* Store Bio */}
                    <div style={{ marginBottom: "14px" }}>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#555", marginBottom: "5px" }}>
                        Descrição da loja
                        <span style={{ fontWeight: 400, color: "#aaa", marginLeft: "6px" }}>— aparece na vitrine pública (opcional)</span>
                      </label>
                      <textarea
                        value={form.storeBio}
                        onChange={e => setForm({ ...form, storeBio: e.target.value })}
                        placeholder="Ex: Vendemos cosméticos e produtos de beleza com entrega em Saubara."
                        rows={3}
                        style={{ ...inp, resize: "vertical" }}
                        onFocus={e => (e.target.style.borderColor = "#FF8A50")}
                        onBlur={e => (e.target.style.borderColor = "#e0e0e0")}
                      />
                    </div>

                    {/* Store Hours */}
                    <div style={{ marginBottom: "14px" }}>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#555", marginBottom: "5px" }}>
                        Horário de funcionamento
                        <span style={{ fontWeight: 400, color: "#aaa", marginLeft: "6px" }}>— opcional</span>
                      </label>
                      <input
                        type="text"
                        value={form.storeHours}
                        onChange={e => setForm({ ...form, storeHours: e.target.value })}
                        placeholder="Ex: Seg-Sex 8h–18h, Sáb 8h–12h"
                        style={inp}
                        onFocus={e => (e.target.style.borderColor = "#FF8A50")}
                        onBlur={e => (e.target.style.borderColor = "#e0e0e0")}
                      />
                    </div>

                    {/* Store Address (public) */}
                    <div style={{ marginBottom: "14px" }}>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#555", marginBottom: "5px" }}>
                        Endereço público da loja
                        <span style={{ fontWeight: 400, color: "#aaa", marginLeft: "6px" }}>— opcional</span>
                      </label>
                      <input
                        type="text"
                        value={form.storeAddress}
                        onChange={e => setForm({ ...form, storeAddress: e.target.value })}
                        placeholder="Ex: Rua das Flores, 45 – Centro, Saubara"
                        style={inp}
                        onFocus={e => (e.target.style.borderColor = "#FF8A50")}
                        onBlur={e => (e.target.style.borderColor = "#e0e0e0")}
                      />
                    </div>

                    <div style={{ marginBottom: "14px" }}>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#555", marginBottom: "5px" }}>
                        CPF do responsável *
                        <span style={{ fontWeight: 400, color: "#aaa", marginLeft: "6px" }}>— apenas um cadastro ativo por CPF</span>
                      </label>
                      <input type="text" inputMode="numeric" value={form.cpf} onChange={e => setForm({ ...form, cpf: formatCPF(e.target.value) })}
                        placeholder="000.000.000-00" maxLength={14} style={inp}
                        onFocus={e => (e.target.style.borderColor = "#FF8A50")} onBlur={e => (e.target.style.borderColor = "#e0e0e0")} />
                      <p style={{ fontSize: "11px", color: "#999", margin: "5px 0 0" }}>
                        Usado para controle de assinatura. Não será exibido publicamente.
                      </p>
                    </div>
                  </>
                )}

                {/* Email */}
                <div style={{ marginBottom: "14px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#555", marginBottom: "5px" }}>E-mail *</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="seu@email.com" style={inp}
                    onFocus={e => (e.target.style.borderColor = "#0F9D8A")} onBlur={e => (e.target.style.borderColor = "#e0e0e0")} />
                </div>

                {/* Phone */}
                <div style={{ marginBottom: "14px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#555", marginBottom: "5px" }}>Telefone / WhatsApp *</label>
                  <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, "") })} placeholder="11999990001" style={inp}
                    onFocus={e => (e.target.style.borderColor = "#0F9D8A")} onBlur={e => (e.target.style.borderColor = "#e0e0e0")} />
                </div>

                {/* CPF — all users */}
                {!isSeller && (
                  <div style={{ marginBottom: "14px" }}>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#555", marginBottom: "5px" }}>
                      CPF *
                      <span style={{ fontWeight: 400, color: "#aaa", marginLeft: "6px" }}>— um cadastro por CPF</span>
                    </label>
                    <input type="text" inputMode="numeric" value={form.cpf} onChange={e => setForm({ ...form, cpf: formatCPF(e.target.value) })}
                      placeholder="000.000.000-00" maxLength={14} style={inp}
                      onFocus={e => (e.target.style.borderColor = "#0F9D8A")} onBlur={e => (e.target.style.borderColor = "#e0e0e0")} />
                    <p style={{ fontSize: "11px", color: "#999", margin: "5px 0 0" }}>
                      Usado para identificação. Não será exibido publicamente.
                    </p>
                  </div>
                )}

                {/* Address */}
                <div style={{ marginBottom: "14px", padding: "14px 16px", background: "#f8fffe", border: "1.5px solid #d0f0ec", borderRadius: "12px" }}>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#0B7A6E", marginBottom: "12px" }}>📍 Localidade em Saubara</div>
                  <div style={{ marginBottom: "12px" }}>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#555", marginBottom: "5px" }}>Localidade *</label>
                    <select value={form.localidade} onChange={e => setForm({ ...form, localidade: e.target.value as Localidade | "" })}
                      style={{ ...inp, cursor: "pointer", background: "white" }}
                      onFocus={e => (e.target.style.borderColor = isSeller ? "#FF8A50" : "#0F9D8A")} onBlur={e => (e.target.style.borderColor = "#e0e0e0")}>
                      <option value="">Selecione a localidade</option>
                      {LOCALIDADES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                    </select>
                  </div>
                  <div style={{ marginBottom: "12px" }}>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#555", marginBottom: "5px" }}>Rua / Logradouro</label>
                    <input type="text" value={form.rua} onChange={e => setForm({ ...form, rua: e.target.value })} placeholder="Ex: Rua das Flores" style={inp}
                      onFocus={e => (e.target.style.borderColor = isSeller ? "#FF8A50" : "#0F9D8A")} onBlur={e => (e.target.style.borderColor = "#e0e0e0")} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "10px", marginBottom: "12px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#555", marginBottom: "5px" }}>Número</label>
                      <input type="text" value={form.numero} onChange={e => setForm({ ...form, numero: e.target.value })} placeholder="S/N" style={inp}
                        onFocus={e => (e.target.style.borderColor = isSeller ? "#FF8A50" : "#0F9D8A")} onBlur={e => (e.target.style.borderColor = "#e0e0e0")} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#555", marginBottom: "5px" }}>Complemento</label>
                      <input type="text" value={form.complemento} onChange={e => setForm({ ...form, complemento: e.target.value })} placeholder="Apto, casa..." style={inp}
                        onFocus={e => (e.target.style.borderColor = isSeller ? "#FF8A50" : "#0F9D8A")} onBlur={e => (e.target.style.borderColor = "#e0e0e0")} />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#555", marginBottom: "5px" }}>Ponto de referência</label>
                    <input type="text" value={form.referencia} onChange={e => setForm({ ...form, referencia: e.target.value })} placeholder="Ex: Próximo à Igreja Matriz" style={inp}
                      onFocus={e => (e.target.style.borderColor = isSeller ? "#FF8A50" : "#0F9D8A")} onBlur={e => (e.target.style.borderColor = "#e0e0e0")} />
                  </div>
                </div>

                {/* Service area — sellers only */}
                {isSeller && (
                  <div style={{ marginBottom: "14px", padding: "14px 16px", background: "#fff9f4", border: "1.5px solid #ffe0cc", borderRadius: "12px" }}>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#e8540a", marginBottom: "4px" }}>🚚 Área de atendimento / entrega</div>
                    <p style={{ fontSize: "11px", color: "#888", marginBottom: "12px", lineHeight: "1.5" }}>
                      Selecione todas as localidades onde sua loja entrega ou atende. Isso aparecerá na página pública da sua loja e nos filtros do marketplace.
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {LOCALIDADES.map(loc => {
                        const active = serviceArea.includes(loc.value);
                        return (
                          <button
                            key={loc.value}
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleServiceArea(loc.value); }}
                            style={{
                              padding: "8px 14px",
                              borderRadius: "20px",
                              border: active ? "2px solid #FF8A50" : "1.5px solid #e0e0e0",
                              background: active ? "#FF8A50" : "white",
                              color: active ? "white" : "#555",
                              fontSize: "12px",
                              fontWeight: active ? 700 : 500,
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                              display: "flex",
                              alignItems: "center",
                              gap: "5px",
                              userSelect: "none",
                              WebkitTapHighlightColor: "transparent",
                            }}
                          >
                            {active ? "✓" : "📍"}
                            {loc.label}
                          </button>
                        );
                      })}
                    </div>
                    <p style={{ fontSize: "11px", marginTop: "10px", margin: "10px 0 0" }}>
                      {serviceArea.length > 0
                        ? <span style={{ color: "#0B7A6E", fontWeight: 600 }}>✓ {serviceArea.length} localidade{serviceArea.length > 1 ? "s" : ""} selecionada{serviceArea.length > 1 ? "s" : ""}: {serviceArea.map(v => LOCALIDADES.find(l => l.value === v)?.label).filter(Boolean).join(", ")}</span>
                        : <span style={{ color: "#aaa" }}>Nenhuma selecionada — selecione onde você atende (opcional)</span>
                      }
                    </p>
                  </div>
                )}

                {/* Password */}
                <div style={{ marginBottom: "14px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#555", marginBottom: "5px" }}>Senha *</label>
                  <div style={{ position: "relative" }}>
                    <input type={showPass ? "text" : "password"} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                      placeholder="Mínimo 6 caracteres" style={{ ...inp, paddingRight: "44px" }}
                      onFocus={e => (e.target.style.borderColor = "#0F9D8A")} onBlur={e => (e.target.style.borderColor = "#e0e0e0")} />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: "16px", color: "#999" }}>
                      {showPass ? "🙈" : "👁️"}
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#555", marginBottom: "5px" }}>Confirmar senha *</label>
                  <input type="password" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                    placeholder="Repita a senha" style={inp}
                    onFocus={e => (e.target.style.borderColor = "#0F9D8A")} onBlur={e => (e.target.style.borderColor = "#e0e0e0")} />
                </div>

                {error && (
                  <div style={{ background: "#FFF3F3", border: "1px solid #ffcdd2", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px", color: "#c62828", fontSize: "13px" }}>
                    ⚠️ {error}
                  </div>
                )}

                <button type="submit" disabled={loading}
                  style={{ width: "100%", padding: "14px", background: loading ? "#ccc" : (isSeller ? "#FF8A50" : "#0F9D8A"), color: "white", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer" }}>
                  {isSeller ? "Continuar → Fotos" : (loading ? "Cadastrando..." : "Criar conta")}
                </button>
              </form>
            </div>
          )}

          {/* ── Step 3: Photos (seller only) ──────────────────────────────────── */}
          {step === 3 && (
            <div>
              {/* Header */}
              <div style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                  <div style={{ width: "36px", height: "36px", background: "#fff8f5", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", border: "1.5px solid #ffe0cf" }}>
                    📸
                  </div>
                  <div>
                    <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#1a1a1a", margin: 0 }}>Fotos para verificação</h2>
                    <p style={{ fontSize: "12px", color: "#777", margin: 0 }}>Enviadas apenas ao administrador da plataforma</p>
                  </div>
                </div>

                {/* Info banner */}
                <div style={{ background: "linear-gradient(135deg, #fff8f5 0%, #fff3ee 100%)", border: "1.5px solid #ffe0cf", borderRadius: "12px", padding: "12px 14px" }}>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#c05020", marginBottom: "6px" }}>🔒 Por que solicitamos essas fotos?</div>
                  <ul style={{ margin: 0, padding: "0 0 0 16px", fontSize: "11px", color: "#8a4020", lineHeight: 1.7 }}>
                    <li>Confirmar que o comerciante é real e está localizado em Saubara</li>
                    <li>Garantir autenticidade antes de exibir a loja para os clientes</li>
                    <li>Conceder o <strong>Selo de Comerciante Verificado</strong> após aprovação</li>
                  </ul>
                  <p style={{ fontSize: "11px", color: "#999", margin: "8px 0 0" }}>
                    As fotos são visíveis apenas para a administração. Nunca serão exibidas publicamente.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                <PhotoField
                  label="Foto do responsável"
                  hint="Selfie segurando um documento com foto (RG ou CNH). Deve estar legível."
                  required
                  value={photoResponsavel}
                  onChange={setPhotoResponsavel}
                  accent="#FF8A50"
                  uploadType="avatar"
                />
                <PhotoField
                  label="Logo da loja"
                  hint="Logotipo ou imagem que representa sua loja. Será usada na vitrine pública."
                  required
                  value={logoLoja}
                  onChange={setLogoLoja}
                  accent="#0F9D8A"
                  uploadType="store-logo"
                />
                <PhotoField
                  label="Foto da fachada da empresa"
                  hint="Foto da frente do seu estabelecimento, barraca ou local de vendas."
                  value={fotoFachada}
                  onChange={setFotoFachada}
                  accent="#7c3aed"
                  uploadType="store-cover"
                />

                {/* Photo checklist summary */}
                <div style={{ background: "#f8f8f8", border: "1px solid #e0e0e0", borderRadius: "10px", padding: "12px 14px", marginBottom: "16px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#666", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Status do envio
                  </div>
                  {[
                    { label: "Foto do responsável", value: photoResponsavel, required: true },
                    { label: "Logo da loja", value: logoLoja, required: true },
                    { label: "Foto da fachada", value: fotoFachada, required: false },
                  ].map(item => (
                    <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "5px" }}>
                      <div style={{
                        width: "18px", height: "18px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                        background: item.value ? "#22c55e" : (item.required ? "#fee2e2" : "#f3f4f6"),
                        fontSize: "10px", flexShrink: 0,
                      }}>
                        {item.value ? "✓" : (item.required ? "!" : "–")}
                      </div>
                      <span style={{ fontSize: "12px", color: item.value ? "#166534" : (item.required ? "#991b1b" : "#9ca3af"), fontWeight: item.value ? 600 : 400 }}>
                        {item.label}
                        {!item.required && <span style={{ color: "#aaa", fontWeight: 400 }}> (opcional)</span>}
                      </span>
                    </div>
                  ))}
                </div>

                {error && (
                  <div style={{ background: "#FFF3F3", border: "1px solid #ffcdd2", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px", color: "#c62828", fontSize: "13px" }}>
                    ⚠️ {error}
                  </div>
                )}

                <div style={{ display: "flex", gap: "10px" }}>
                  <button type="button" onClick={() => { setStep(2); setError(""); }}
                    style={{ flex: 1, padding: "14px", background: "white", color: "#555", border: "1.5px solid #e0e0e0", borderRadius: "10px", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>
                    ← Voltar
                  </button>
                  <button type="submit" disabled={loading}
                    style={{ flex: 2, padding: "14px", background: loading ? "#ccc" : "#FF8A50", color: "white", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer" }}>
                    {loading ? "Cadastrando..." : "✓ Finalizar cadastro"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Login link */}
          {step !== 3 && (
            <p style={{ textAlign: "center", fontSize: "13px", color: "#666", margin: "20px 0 0" }}>
              Já tem conta?{" "}
              <button onClick={() => navigate("/auth/login")} style={{ background: "none", border: "none", cursor: "pointer", color: "#0F9D8A", fontWeight: 700, fontSize: "13px" }}>
                Entrar
              </button>
            </p>
          )}
        </div>

        <p style={{ textAlign: "center", marginTop: "16px" }}>
          <button onClick={() => smartBack(navigate)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.8)", fontSize: "13px" }}>
            ← Voltar ao início
          </button>
        </p>
      </div>
    </div>
  );
}
