import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { artisanApi, dashboardApi, type ArtisanProfile } from "@/api/artisanApi";
import { orderApi, type Order } from "@/api/orderApi";
import { productApi, type ProductInput } from "@/api/productApi";
import { useAuth } from "@/lib/auth";
import {
  DEMO_ARTISAN,
  type LanguageId,
  type Product,
  type ProductStatus,
  type Sale,
} from "./mock-data";

export type Artisan = { name: string; craft: string; location: string };

export type Draft = {
  image: string | null;
  enhanced: boolean;
  name: string;
  description: string;
  category: string;
  quantity: number;
  craft: string;
  color: string;
  materials: string;
  price: number | null;
  priceLow: number | null;
  priceHigh: number | null;
  priceReason: string;
};

export const EMPTY_DRAFT: Draft = {
  image: null,
  enhanced: false,
  name: "",
  description: "",
  category: "",
  quantity: 1,
  craft: "",
  color: "",
  materials: "",
  price: null,
  priceLow: null,
  priceHigh: null,
  priceReason: "",
};

export type LoadStatus = "idle" | "loading" | "ready" | "error";

export type Dashboard = {
  totalProducts: number;
  listedProducts: number;
  totalOrders: number;
  pendingOrders: number;
  totalSales: number;
  unitsSold: number;
  stockValue: number;
};

const DEMO_PROFILE: ArtisanProfile = {
  id: "demo",
  name: DEMO_ARTISAN.name,
  phone: "",
  language: "en",
  location: DEMO_ARTISAN.location,
  craft_type: "Handloom Sarees",
  experience_years: 10,
  is_demo: true,
};

type Store = {
  language: LanguageId;
  setLanguage: (id: LanguageId) => void;

  artisan: Artisan;
  setArtisan: (a: Partial<Artisan>) => Promise<void>;
  profile: ArtisanProfile | null;
  profileStatus: LoadStatus;
  profileError: string | null;
  refreshProfile: () => Promise<void>;

  products: Product[];
  productsStatus: LoadStatus;
  productsError: string | null;
  addProduct: (draft: Draft) => Promise<Product>;
  updateProduct: (id: string, patch: Partial<ProductInput>) => Promise<void>;
  setProductStatus: (id: string, status: ProductStatus) => Promise<void>;
  removeProduct: (id: string) => Promise<void>;
  findProduct: (words: string | undefined) => Product | undefined;
  refreshProducts: () => Promise<void>;

  orders: Order[];
  ordersStatus: LoadStatus;
  refreshOrders: () => Promise<void>;
  sales: Sale[];

  dashboard: Dashboard;
  dashboardStatus: LoadStatus;

  draft: Draft;
  patchDraft: (patch: Partial<Draft>) => void;
  resetDraft: () => void;

  assistantOpen: boolean;
  assistantSeed: string | null;
  openAssistant: () => void;
  openAssistantWith: (text: string) => void;
  closeAssistant: () => void;

  notice: string | null;
  say: (message: string) => void;
  clearNotice: () => void;
};

const StoreContext = createContext<Store | null>(null);

/**
 * All application data comes from the backend, which in turn uses Supabase.
 *
 * Merchant data loads only for an authenticated merchant. If the backend cannot
 * be reached, the store falls back to local storage so the workspace remains usable.
 */
export function AppStoreProvider({ children }: { children: ReactNode }) {
  const { status: authStatus, user } = useAuth();
  const [language, setLanguage] = useState<LanguageId>("en");

  const [profile, setProfile] = useState<ArtisanProfile | null>(DEMO_PROFILE);
  const [profileStatus, setProfileStatus] = useState<LoadStatus>("idle");
  const [profileError, setProfileError] = useState<string | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [productsStatus, setProductsStatus] = useState<LoadStatus>("loading");
  const [productsError, setProductsError] = useState<string | null>(null);

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersStatus, setOrdersStatus] = useState<LoadStatus>("loading");

  const [dashboard, setDashboard] = useState<Dashboard>({
    totalProducts: 0,
    listedProducts: 0,
    totalOrders: 0,
    pendingOrders: 0,
    totalSales: 0,
    unitsSold: 0,
    stockValue: 0,
  });
  const [dashboardStatus, setDashboardStatus] = useState<LoadStatus>("loading");

  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantSeed, setAssistantSeed] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // ------------------------------------------------------------------ loads --
  const refreshProducts = useCallback(async () => {
    setProductsStatus("loading");
    setProductsError(null);
    try {
      const list = await productApi.getProducts();
      setProducts(list);
      setProductsStatus("ready");
    } catch (error) {
      setProducts([]);
      setProductsError(error instanceof Error ? error.message : "Unable to load products.");
      setProductsStatus("error");
    }
  }, []);

  const refreshOrders = useCallback(async () => {
    setOrdersStatus("loading");
    try {
      setOrders(await orderApi.getOrders());
      setOrdersStatus("ready");
    } catch {
      setOrders([]);
      setOrdersStatus("error");
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    setProfileStatus("loading");
    try {
      setProfile(await artisanApi.getProfile());
      setProfileStatus("ready");
    } catch (error) {
      setProfile(DEMO_PROFILE);
      setProfileError(error instanceof Error ? error.message : "Unable to load your profile.");
      setProfileStatus("error");
    }
  }, []);

  const refreshDashboard = useCallback(async () => {
    setDashboardStatus("loading");
    try {
      setDashboard(await dashboardApi.getSummary());
      setDashboardStatus("ready");
    } catch {
      setDashboardStatus("error");
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshProducts(), refreshOrders(), refreshProfile(), refreshDashboard()]);
  }, [refreshProducts, refreshOrders, refreshProfile, refreshDashboard]);

  useEffect(() => {
    if (authStatus === "loading") return;
    if (authStatus === "authenticated" && user?.role === "merchant") {
      void refreshAll();
      return;
    }
    setProducts([]);
    setOrders([]);
    setProfile(null);
    setProfileStatus("idle");
    setProductsStatus("idle");
    setOrdersStatus("idle");
    setDashboardStatus("idle");
  }, [authStatus, user?.role, refreshAll]);

  // ------------------------------------------------------------- mutations --
  const addProduct = useCallback(
    async (draftInput: Draft) => {
      const input: ProductInput = {
        name: draftInput.name || "New craft product",
        description: draftInput.description,
        category: draftInput.category || "Craft",
        craft: draftInput.craft || "Handmade",
        material: draftInput.materials || "Handmade materials",
        color: draftInput.color || "Natural",
        price: draftInput.price ?? 0,
        quantity: draftInput.quantity,
        image_url: draftInput.image ?? "",
      };

      const created = await productApi.createProduct(input);
      setProducts((list) => [created, ...list]);
      void refreshDashboard();
      return created;
    },
    [refreshDashboard],
  );

  const updateProduct = useCallback(
    async (id: string, patch: Partial<ProductInput>) => {
      const updated = await productApi.updateProduct(id, patch);
      setProducts((list) => list.map((p) => (p.id === id ? updated : p)));
      void refreshDashboard();
    },
    [refreshDashboard],
  );

  const setProductStatus = useCallback(
    async (id: string, status: ProductStatus) => {
      await updateProduct(id, { status });
    },
    [updateProduct],
  );

  const removeProduct = useCallback(
    async (id: string) => {
      await productApi.deleteProduct(id);
      setProducts((list) => list.filter((p) => p.id !== id));
      void refreshDashboard();
    },
    [refreshDashboard],
  );

  const findProduct = useCallback(
    (words: string | undefined) => {
      if (!words) return products[0];
      const needle = words.toLowerCase().replace("sari", "saree");
      return (
        products.find((p) =>
          `${p.name} ${p.category} ${p.craft} ${p.materials}`.toLowerCase().includes(needle),
        ) ?? products[0]
      );
    },
    [products],
  );

  // --------------------------------------------------------------- artisan --
  const artisan: Artisan = useMemo(
    () => ({
      name: profile?.name || DEMO_ARTISAN.name,
      craft: profile?.craft_type || DEMO_ARTISAN.craft,
      location: profile?.location || DEMO_ARTISAN.location,
    }),
    [profile],
  );

  const setArtisan = useCallback(
    async (patch: Partial<Artisan>) => {
      const next = { ...artisan, ...patch };
      setProfile((current) => ({
        ...(current ?? DEMO_PROFILE),
        name: next.name,
        craft_type: next.craft,
        location: next.location,
      }));
      await artisanApi.updateProfile({
        name: next.name,
        craft_type: next.craft,
        location: next.location,
      });
    },
    [artisan],
  );

  // ----------------------------------------------------------------- sales --
  const sales: Sale[] = useMemo(
    () =>
      orders.map((order) => ({
        id: order.id,
        product: order.product_name,
        buyer: order.buyer_name,
        amount: order.amount,
        when: new Date(order.created_at).toLocaleDateString("en-IN"),
      })),
    [orders],
  );

  const patchDraft = useCallback(
    (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch })),
    [],
  );
  const resetDraft = useCallback(() => setDraft(EMPTY_DRAFT), []);

  const value = useMemo<Store>(
    () => ({
      language,
      setLanguage,
      artisan,
      setArtisan,
      profile,
      profileStatus,
      profileError,
      refreshProfile,
      products,
      productsStatus,
      productsError,
      addProduct,
      updateProduct,
      setProductStatus,
      removeProduct,
      findProduct,
      refreshProducts,
      orders,
      ordersStatus,
      refreshOrders,
      sales,
      dashboard,
      dashboardStatus,
      draft,
      patchDraft,
      resetDraft,
      assistantOpen,
      assistantSeed,
      openAssistant: () => {
        setAssistantSeed(null);
        setAssistantOpen(true);
      },
      openAssistantWith: (text: string) => {
        setAssistantSeed(text);
        setAssistantOpen(true);
      },
      closeAssistant: () => setAssistantOpen(false),
      notice,
      say: (message: string) => setNotice(message),
      clearNotice: () => setNotice(null),
    }),
    [
      language,
      artisan,
      setArtisan,
      profile,
      profileStatus,
      profileError,
      refreshProfile,
      products,
      productsStatus,
      productsError,
      addProduct,
      updateProduct,
      setProductStatus,
      removeProduct,
      findProduct,
      refreshProducts,
      orders,
      ordersStatus,
      refreshOrders,
      sales,
      dashboard,
      dashboardStatus,
      draft,
      patchDraft,
      resetDraft,
      assistantOpen,
      assistantSeed,
      notice,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore must be used inside AppStoreProvider");
  return store;
}
