import { lazy, Suspense, useState, Component } from "react";
import type { ReactNode, ErrorInfo } from "react";
import { Route, Switch } from "wouter";
import { AuthProvider, useAuth } from "./lib/auth";
import { CartProvider } from "./lib/cart";
import { FavoritesProvider } from "./lib/favorites";
import { OrdersProvider } from "./lib/orders";
import { NotificationsProvider } from "./lib/notifications";
import { Provider } from "./components/provider";
import RequireAuth from "./components/RequireAuth";
import { AgentFeedback, RunableBadge } from "@runablehq/website-runtime";
import { SplashScreen, shouldShowSplash } from "./components/SplashScreen";

// ─── ErrorBoundary global para rotas lazy (evita tela branca em crash) ───────
class RouteErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[RouteErrorBoundary] Crash capturado:", error, info);
    this.setState({ error });
  }
  override render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: "100vh", background: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "monospace" }}>
          <div style={{ background: "#fee2e2", borderRadius: 16, padding: "28px 32px", maxWidth: 700, width: "100%" }}>
            <h2 style={{ color: "#991b1b", margin: "0 0 12px", fontSize: 18 }}>❌ Erro ao carregar painel</h2>
            <pre style={{ background: "#fff", borderRadius: 8, padding: 12, fontSize: 12, color: "#333", overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
              {this.state.error.toString()}
            </pre>
            <button onClick={() => { this.setState({ error: null }); window.location.reload(); }}
              style={{ marginTop: 16, padding: "10px 20px", background: "#0f3460", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14 }}>
              Recarregar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Componentes leves — carregados imediatamente (sempre visíveis) ────────────
import FloatingCart from "./components/FloatingCart";
import MobileBottomBar from "./components/MobileBottomBar";

// ─── S3.1-W4: Code splitting via React.lazy ───────────────────────────────────
// Páginas carregadas sob-demanda — reduz bundle inicial
// Críticas (pré-carregadas pelo browser idle):
const HomePage      = lazy(() => import("./pages/index"));
const StorePage     = lazy(() => import("./pages/store"));
const SearchPage    = lazy(() => import("./pages/search"));
const CategoryPage  = lazy(() => import("./pages/category"));
const ProductPage   = lazy(() => import("./pages/product"));
const CartPage      = lazy(() => import("./pages/cart"));

// Secundárias (carregadas apenas quando acessadas):
const SupportPage         = lazy(() => import("./pages/suporte"));
const SellerProfilePage   = lazy(() => import("./pages/seller-profile"));
const LoginPage           = lazy(() => import("./pages/auth/login"));
const RegisterPage        = lazy(() => import("./pages/auth/register"));
const VerifyPage          = lazy(() => import("./pages/auth/verify"));
const ForgotPasswordPage  = lazy(() => import("./pages/auth/forgot-password"));
const ClientDashboard     = lazy(() => import("./pages/dashboard/client"));
const SellerDashboard     = lazy(() => import("./pages/dashboard/seller"));
const AdminDashboard      = lazy(() => import("./pages/dashboard/admin"));
const UploadTest          = lazy(() => import("./pages/upload-test"));

// ─── Loading fallback simples ─────────────────────────────────────────────────
function PageLoader() {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "60vh",
      background: "transparent",
    }}>
      <div style={{
        width: 36,
        height: 36,
        border: "3px solid #e5e7eb",
        borderTop: "3px solid #0F9D8A",
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Inner wrapper — lê usuário do AuthProvider ───────────────────────────────
function AppInner({
  splashDone,
  setSplashDone,
}: {
  splashDone: boolean;
  setSplashDone: (v: boolean) => void;
}) {
  const { user } = useAuth();

  return (
    <OrdersProvider>
      <NotificationsProvider userId={user?.id ?? null}>
        {!splashDone && <SplashScreen onComplete={() => setSplashDone(true)} />}

        <Suspense fallback={<PageLoader />}>
          <Switch>
            {/* ── Públicas ── */}
            <Route path="/" component={HomePage} />
            <Route path="/store/:id" component={StorePage} />
            <Route path="/search" component={SearchPage} />
            <Route path="/seller/:id" component={SellerProfilePage} />
            <Route path="/category/:id" component={CategoryPage} />
            <Route path="/product/:storeId/:productId" component={ProductPage} />
            <Route path="/cart" component={CartPage} />
            <Route path="/suporte" component={SupportPage} />

            {/* ── Auth ── */}
            <Route path="/auth/login" component={LoginPage} />
            <Route path="/auth/register" component={RegisterPage} />
            <Route path="/auth/forgot-password" component={ForgotPasswordPage} />
            <Route path="/auth/verify">
              <RequireAuth allowUnverified>
                <VerifyPage />
              </RequireAuth>
            </Route>

            {/* ── Protegidas ── */}
            <Route path="/dashboard/client">
              <RequireAuth type="client">
                <ClientDashboard />
              </RequireAuth>
            </Route>
            <Route path="/dashboard/seller">
              <RequireAuth type="seller">
                <SellerDashboard />
              </RequireAuth>
            </Route>

            {/* ── Upload Test (temp) ── */}
            <Route path="/upload-test" component={UploadTest} />

            {/* Admin com auth própria — RouteErrorBoundary evita tela branca */}
            <Route path="/admin">
              {() => (
                <RouteErrorBoundary>
                  <AdminDashboard />
                </RouteErrorBoundary>
              )}
            </Route>
            {/* G7: redirect legado /dashboard/admin → /admin */}
            <Route path="/dashboard/admin">
              {() => {
                window.location.replace("/admin");
                return null;
              }}
            </Route>
          </Switch>
        </Suspense>

        <FloatingCart />
        <MobileBottomBar />
        {import.meta.env.DEV && <AgentFeedback />}
        {<RunableBadge />}
      </NotificationsProvider>
    </OrdersProvider>
  );
}

// ─── App root ─────────────────────────────────────────────────────────────────
function App() {
  const [splashDone, setSplashDone] = useState(() => !shouldShowSplash());

  return (
    <Provider>
      <AuthProvider>
        <CartProvider>
          <FavoritesProvider>
            <AppInner splashDone={splashDone} setSplashDone={setSplashDone} />
          </FavoritesProvider>
        </CartProvider>
      </AuthProvider>
    </Provider>
  );
}

export default App;
