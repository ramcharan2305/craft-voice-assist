import sareeImg from "@/assets/product-saree.jpg";
import basketImg from "@/assets/product-basket.jpg";
import potteryImg from "@/assets/product-pottery.jpg";
import woodImg from "@/assets/product-wood.jpg";
import embroideryImg from "@/assets/product-embroidery.jpg";
import jewelryImg from "@/assets/product-jewelry.jpg";

export type ProductStatus = "listed" | "draft" | "sold";

export type Product = {
  id: string;
  name: string;
  description: string;
  category: string;
  craft: string;
  color: string;
  materials: string;
  price: number;
  status: ProductStatus;
  image: string;
  views: number;
  interest: number;
  availability: string;
};

export type Buyer = {
  id: string;
  name: string;
  group: BuyerGroupId;
  lookingFor: string;
  location: string;
  quantity: string;
  match: "High" | "Medium" | "Growing";
};

export type BuyerGroupId =
  | "retail"
  | "wholesale"
  | "business"
  | "institution"
  | "government"
  | "local";

export type BuyerGroup = {
  id: BuyerGroupId;
  title: string;
  note: string;
  matches: number;
};

export type Sale = {
  id: string;
  product: string;
  buyer: string;
  amount: number;
  when: string;
};

export const LANGUAGES = [
  { id: "te", native: "తెలుగు", name: "Telugu", short: "తె" },
  { id: "hi", native: "हिन्दी", name: "Hindi", short: "हि" },
  { id: "en", native: "English", name: "English", short: "En" },
  { id: "ta", native: "தமிழ்", name: "Tamil", short: "த" },
  { id: "kn", native: "ಕನ್ನಡ", name: "Kannada", short: "ಕ" },
  { id: "mr", native: "मराठी", name: "Marathi", short: "म" },
] as const;

export type LanguageId = (typeof LANGUAGES)[number]["id"];

export const DEMO_ARTISAN = {
  name: "Lakshmi",
  craft: "Handloom textiles",
  location: "Telangana",
};

export const PRODUCT_IMAGES = {
  saree: sareeImg,
  basket: basketImg,
  pottery: potteryImg,
  wood: woodImg,
  embroidery: embroideryImg,
  jewelry: jewelryImg,
};

export const DEMO_PRODUCTS: Product[] = [
  {
    id: "p1",
    name: "Blue Handloom Saree",
    description: "Handwoven cotton saree with traditional floral motifs and a silver border.",
    category: "Saree",
    craft: "Handloom",
    color: "Indigo blue",
    materials: "Cotton, zari thread",
    price: 1300,
    status: "listed",
    image: sareeImg,
    views: 214,
    interest: 12,
    availability: "4 pieces ready",
  },
  {
    id: "p2",
    name: "Woven Bamboo Basket",
    description: "Hand-woven bamboo storage basket, made from locally cut cane.",
    category: "Basket",
    craft: "Bamboo weaving",
    color: "Natural",
    materials: "Bamboo cane",
    price: 450,
    status: "listed",
    image: basketImg,
    views: 96,
    interest: 5,
    availability: "10 pieces ready",
  },
  {
    id: "p3",
    name: "Terracotta Water Pot",
    description: "Wheel-thrown terracotta pot with hand-etched border patterns.",
    category: "Pottery",
    craft: "Terracotta pottery",
    color: "Earth red",
    materials: "River clay",
    price: 620,
    status: "sold",
    image: potteryImg,
    views: 143,
    interest: 8,
    availability: "Sold out",
  },
  {
    id: "p4",
    name: "Carved Teak Elephant",
    description: "Hand-carved teak wood elephant, finished with natural oil.",
    category: "Wooden craft",
    craft: "Wood carving",
    color: "Warm brown",
    materials: "Teak wood",
    price: 1850,
    status: "listed",
    image: woodImg,
    views: 78,
    interest: 4,
    availability: "2 pieces ready",
  },
  {
    id: "p5",
    name: "Mirror Work Cushion Cover",
    description: "Hand-embroidered cotton cushion cover with mirror and thread work.",
    category: "Embroidery",
    craft: "Hand embroidery",
    color: "Cream, multicolour",
    materials: "Cotton, mirror, silk thread",
    price: 700,
    status: "draft",
    image: embroideryImg,
    views: 0,
    interest: 0,
    availability: "6 pieces ready",
  },
  {
    id: "p6",
    name: "Silver Tribal Necklace",
    description: "Handmade oxidised silver necklace with beaded drop detailing.",
    category: "Jewelry",
    craft: "Silver smithing",
    color: "Oxidised silver",
    materials: "Silver alloy",
    price: 2400,
    status: "listed",
    image: jewelryImg,
    views: 187,
    interest: 8,
    availability: "3 pieces ready",
  },
];

export const BUYER_GROUPS: BuyerGroup[] = [
  { id: "retail", title: "Retail buyers", note: "Shops that sell to customers", matches: 12 },
  { id: "wholesale", title: "Wholesalers", note: "Large repeat orders", matches: 7 },
  { id: "business", title: "Businesses", note: "Gifting and corporate orders", matches: 5 },
  { id: "institution", title: "Institutional buyers", note: "Hotels, museums, stores", matches: 4 },
  { id: "government", title: "Government opportunities", note: "Emporium and fair listings", matches: 3 },
  { id: "local", title: "Local stores", note: "Buyers near you", matches: 9 },
];

export const DEMO_BUYERS: Buyer[] = [
  {
    id: "b1",
    name: "Demo Handicrafts Store",
    group: "retail",
    lookingFor: "Handloom sarees",
    location: "Hyderabad",
    quantity: "50–100 pieces",
    match: "High",
  },
  {
    id: "b2",
    name: "Sample Weaves Wholesale",
    group: "wholesale",
    lookingFor: "Cotton sarees, stoles",
    location: "Bengaluru",
    quantity: "200+ pieces",
    match: "High",
  },
  {
    id: "b3",
    name: "Example Gifting Co.",
    group: "business",
    lookingFor: "Wooden crafts, pottery",
    location: "Pune",
    quantity: "100 pieces",
    match: "Medium",
  },
  {
    id: "b4",
    name: "Demo Heritage Hotels",
    group: "institution",
    lookingFor: "Terracotta, baskets",
    location: "Jaipur",
    quantity: "40–60 pieces",
    match: "Medium",
  },
  {
    id: "b5",
    name: "Sample State Emporium",
    group: "government",
    lookingFor: "Handloom textiles",
    location: "Telangana",
    quantity: "Seasonal orders",
    match: "High",
  },
  {
    id: "b6",
    name: "Demo Local Craft Corner",
    group: "local",
    lookingFor: "Embroidery, jewelry",
    location: "Warangal",
    quantity: "20–30 pieces",
    match: "Growing",
  },
];

export const DEMO_SALES: Sale[] = [
  { id: "s1", product: "Terracotta Water Pot", buyer: "Demo Heritage Hotels", amount: 6200, when: "This week" },
  { id: "s2", product: "Blue Handloom Saree", buyer: "Demo Handicrafts Store", amount: 9100, when: "Last week" },
  { id: "s3", product: "Woven Bamboo Basket", buyer: "Demo Local Craft Corner", amount: 4500, when: "This month" },
  { id: "s4", product: "Silver Tribal Necklace", buyer: "Example Gifting Co.", amount: 4700, when: "This month" },
];

export const MONTHLY_SALES = [
  { month: "Apr", value: 2800 },
  { month: "May", value: 4100 },
  { month: "Jun", value: 3600 },
  { month: "Jul", value: 5200 },
  { month: "Aug", value: 4400 },
  { month: "Sep", value: 4400 },
];

export const rupees = (value: number) => `₹${value.toLocaleString("en-IN")}`;
