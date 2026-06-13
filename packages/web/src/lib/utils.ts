/**
 * Monta link WhatsApp para consulta de produto.
 * @param whatsapp  Número no formato internacional (ex: 5571999990001)
 * @param productName  Nome do produto
 * @param storeName  Nome da loja (opcional)
 * @param productUrl  URL pública do produto (opcional — gerado automaticamente quando disponível)
 */
export function buildWhatsAppLink(
  whatsapp: string,
  productName: string,
  storeName?: string,
  productUrl?: string,
): string {
  const storeInfo = storeName ? ` da *${storeName}*` : "";
  const linkLine = productUrl ? `\n🔗 ${productUrl}` : "";
  const message = encodeURIComponent(
    `Olá! Vi o produto *${productName}*${storeInfo} no *Saubara Meu Market* e gostaria de consultar disponibilidade e preço. 😊${linkLine}`
  );
  return `https://wa.me/${whatsapp}?text=${message}`;
}

/**
 * Monta link WhatsApp para contato direto com a loja.
 */
export function buildStoreWhatsAppLink(whatsapp: string, storeName: string): string {
  const message = encodeURIComponent(
    `Olá *${storeName}*! Vi a sua loja no *Saubara Meu Market* e gostaria de mais informações. 😊`
  );
  return `https://wa.me/${whatsapp}?text=${message}`;
}

/**
 * Retorna o número de WhatsApp efetivo da loja:
 * usa storeWhatsapp quando preenchido, senão cai no phone.
 */
export function resolveStoreWhatsapp(storeWhatsapp?: string, phone?: string): string {
  return (storeWhatsapp || phone || "").replace(/\D/g, "");
}

export function formatPrice(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatRating(r: number): string {
  return r.toFixed(1);
}
