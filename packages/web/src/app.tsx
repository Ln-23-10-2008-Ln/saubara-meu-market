import { lazy, Suspense, useState } from "react";
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

            {/* Admin com auth própria */}
            <Route path="/admin" component={AdminDashboard} />
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
