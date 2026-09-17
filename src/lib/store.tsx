import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import {
  DEMO_ARTISAN,
  DEMO_PRODUCTS,
  DEMO_SALES,
  type LanguageId,
  type Product,
  type ProductStatus,
} from "./mock-data";

export type Artisan = { name: string; craft: string; location: string };

export type Draft = {
  image: string | null;
  enhanced: boolean;
  name: string;
  description: string;
  category: string;
  craft: string;
  color: string;
  materials: string;
  price: number | null;
};

export const EMPTY_DRAFT: Draft = {
  image: null,
  enhanced: false,
  name: "",
  description: "",
  category: "",
  craft: "",
  color: "",
  materials: "",
  price: null,
};

type Store = {
  language: LanguageId;
  setLanguage: (id: LanguageId) => void;
  artisan: Artisan;
  setArtisan: (a: Artisan) => void;
  products: Product[];
  addProduct: (draft: Draft) => Product;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  setProductStatus: (id: string, status: ProductStatus) => void;
  removeProduct: (id: string) => void;
  findProduct: (words: string | undefined) => Product | undefined;
  draft: Draft;
  patchDraft: (patch: Partial<Draft>) => void;
  resetDraft: () => void;
  assistantOpen: boolean;
  openAssistant: () => void;
  closeAssistant: () => void;
  notice: string | null;
  say: (message: string) => void;
  clearNotice: () => void;
  sales: typeof DEMO_SALES;
};

const StoreContext = createContext<Store | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<LanguageId>("en");
  const [artisan, setArtisan] = useState<Artisan>(DEMO_ARTISAN);
  const [products, setProducts] = useState<Product[]>(DEMO_PRODUCTS);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const patchDraft = useCallback((patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
  }, []);

  const resetDraft = useCallback(() => setDraft(EMPTY_DRAFT), []);

  const addProduct = useCallback((d: Draft) => {
    const product: Product = {
      id: `p${Date.now()}`,
      name: d.name || "New craft product",
      description: d.description,
      category: d.category || "Craft",
      craft: d.craft || "Handmade",
      color: d.color || "Natural",
      materials: d.materials || "Handmade materials",
      price: d.price ?? 0,
      status: "listed",
      image: d.image ?? "",
      views: 0,
      interest: 0,
      availability: "Ready to sell",
    };
    setProducts((list) => [product, ...list]);
    return product;
  }, []);

  const updateProduct = useCallback((id: string, patch: Partial<Product>) => {
    setProducts((list) => list.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const setProductStatus = useCallback((id: string, status: ProductStatus) => {
    setProducts((list) => list.map((p) => (p.id === id ? { ...p, status } : p)));
  }, []);

  const removeProduct = useCallback((id: string) => {
    setProducts((list) => list.filter((p) => p.id !== id));
  }, []);

  const findProduct = useCallback(
    (words: string | undefined) => {
      if (!words) return products[0];
      const needle = words.toLowerCase();
      return (
        products.find((p) =>
          `${p.name} ${p.category} ${p.craft}`.toLowerCase().includes(needle.replace("sari", "saree")),
        ) ?? products[0]
      );
    },
    [products],
  );

  const value = useMemo<Store>(
    () => ({
      language,
      setLanguage,
      artisan,
      setArtisan,
      products,
      addProduct,
      updateProduct,
      setProductStatus,
      removeProduct,
      findProduct,
      draft,
      patchDraft,
      resetDraft,
      assistantOpen,
      openAssistant: () => setAssistantOpen(true),
      closeAssistant: () => setAssistantOpen(false),
      notice,
      say: (message: string) => setNotice(message),
      clearNotice: () => setNotice(null),
      sales: DEMO_SALES,
    }),
    [
      language,
      artisan,
      products,
      addProduct,
      updateProduct,
      setProductStatus,
      removeProduct,
      findProduct,
      draft,
      patchDraft,
      resetDraft,
      assistantOpen,
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
