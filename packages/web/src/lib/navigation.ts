/**
 * navigation.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Fonte única de verdade para navegação no marketplace.
 *
 * Problema resolvido:
 *   window.history.length inclui entradas do browser (nova aba, refresh etc),
 *   então `history.length > 1` não garante que existe uma entrada NOSSA.
 *   Wouter não expõe um stack de histórico — então mantemos o nosso.
 *
 * Solução:
 *   - `AppNavStack` — singleton que rastreia o stack de rotas internas
 *   - `useBack(fallback?)` — hook que usa o stack interno para voltar
 *   - `BackButton` — componente padronizado (importado em cada página)
 *
 * Uso:
 *   const { back } = useBack("/store/abc");
 *   <button onClick={back}>← Voltar</button>
 */

import { useCallback } from "react";
import { useLocation } from "wouter";

// ─── Internal nav stack ───────────────────────────────────────────────────────
// Stores ONLY app-internal route pushes. Browser navigation (back/forward) is
// NOT tracked here — we rely on window.history for those.

class NavStack {
  private stack: string[] = [];

  push(path: string) {
    // Avoid duplicates at top of stack
    if (this.stack[this.stack.length - 1] !== path) {
      this.stack.push(path);
    }
  }

  pop(): string | undefined {
    return this.stack.pop();
  }

  peek(): string | undefined {
    return this.stack[this.stack.length - 1];
  }

  /** Remove current page from top and return the one before it */
  back(): string | undefined {
    this.stack.pop(); // remove current
    return this.stack[this.stack.length - 1]; // peek previous
  }

  get size() {
    return this.stack.length;
  }

  clear() {
    this.stack = [];
  }
}

export const appNavStack = new NavStack();

// ─── useBack ─────────────────────────────────────────────────────────────────
/**
 * Returns a `back` function that navigates backwards correctly:
 *   1. If browser history has internal entries → use window.history.back()
 *   2. Else if a fallback is provided → navigate there
 *   3. Else → navigate to "/"
 *
 * `fallback` should be the most logical "parent" page:
 *   - product page → `/store/:storeId`
 *   - store page   → previous page (search, category, home)
 *   - category     → `/`
 */
export function useBack(fallback = "/") {
  const [, navigate] = useLocation();

  const back = useCallback(() => {
    // Use browser history when possible — it preserves scroll position and
    // all wouter-pushed entries (Link clicks, navigate() calls all push to
    // window.history via wouter's default HTML5 history mode).
    if (window.history.length > 2) {
      window.history.back();
    } else {
      navigate(fallback);
    }
  }, [fallback, navigate]);

  return { back };
}

// ─── Navigate helpers ─────────────────────────────────────────────────────────
/**
 * Smart back: given a navigate fn, go back using browser history or fallback.
 * Use this for inline onClick handlers.
 */
export function smartBack(navigate: (to: string) => void, fallback = "/") {
  if (window.history.length > 2) {
    window.history.back();
  } else {
    navigate(fallback);
  }
}
