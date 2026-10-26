/**
 * Seeds H-Connect with demo data so the app works immediately after setup.
 *
 *   cd backend && npm run seed
 *
 * It is safe to run more than once: artisans are matched by email and products
 * and orders are deleted before being recreated.
 */
import "dotenv/config";

import { createClient } from "@supabase/supabase-js";

import {
  REFERENCE_SCHEMES,
  REFERENCE_TRAINING,
  REFERENCE_MARKET,
} from "./services/referenceData.js";

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error("Missing Supabase URL or server secret key. Copy .env.example to .env first.");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey);
const DEMO_PASSWORD = "hconnect123";

const ARTISANS = [
  {
    email: "lakshmi@hconnect.app",
    name: "Lakshmi",
    craft_type: "Handloom Sarees",
    location: "Telangana",
    phone: "+91 90000 00001",
    language: "en",
    experience_years: 10,
    products: [
      [
        "Blue Cotton Saree",
        "Handwoven cotton saree with a simple floral border.",
        "Saree",
        "Handloom",
        "Cotton",
        "Indigo blue",
        2500,
        5,
        "listed",
      ],
      [
        "Red Silk Saree",
        "Silk saree woven on a pit loom with a zari border.",
        "Saree",
        "Handloom",
        "Silk",
        "Red",
        4800,
        3,
        "listed",
      ],
      [
        "Green Cotton Dupatta",
        "Light cotton dupatta with a woven edge.",
        "Dupatta",
        "Handloom",
        "Cotton",
        "Green",
        900,
        8,
        "listed",
      ],
      [
        "Unbleached Cotton Stole",
        "Plain handwoven stole, ready to print.",
        "Stole",
        "Handloom",
        "Cotton",
        "Natural",
        700,
        12,
        "draft",
      ],
      [
        "Temple Border Saree",
        "Saree with a woven temple border in contrast thread.",
        "Saree",
        "Handloom",
        "Cotton",
        "Maroon",
        3200,
        4,
        "listed",
      ],
    ],
    // [product name, buyer name, quantity, amount, status]
    orders: [
      ["Blue Cotton Saree", "Ananya Handlooms", 4, 10000, "confirmed"],
      ["Red Silk Saree", "Demo Craft Store", 2, 9600, "completed"],
      ["Green Cotton Dupatta", "Gift Box Company", 3, 2700, "pending"],
    ],
  },
  {
    email: "ravi@hconnect.app",
    name: "Ravi",
    craft_type: "Basketry",
    location: "Odisha",
    phone: "+91 90000 00002",
    language: "en",
    experience_years: 7,
    products: [
      [
        "Woven Bamboo Basket",
        "Hand-woven bamboo storage basket from local cane.",
        "Basket",
        "Basketry",
        "Bamboo",
        "Natural",
        450,
        10,
        "listed",
      ],
      [
        "Cane Planter Pot",
        "Small woven cane planter with a coir liner.",
        "Basket",
        "Basketry",
        "Cane",
        "Natural",
        620,
        6,
        "listed",
      ],
      [
        "Bamboo Fruit Hamper",
        "Woven hamper with a carrying handle.",
        "Basket",
        "Basketry",
        "Bamboo",
        "Natural",
        850,
        4,
        "listed",
      ],
    ],
    orders: [
      ["Woven Bamboo Basket", "Sample Stores", 5, 2250, "shipped"],
      ["Bamboo Fruit Hamper", "Demo Local Shop", 2, 1700, "pending"],
    ],
  },
  {
    email: "meera@hconnect.app",
    name: "Meera",
    craft_type: "Terracotta Pottery",
    location: "Rajasthan",
    phone: "+91 90000 00003",
    language: "hi",
    experience_years: 15,
    products: [
      [
        "Terracotta Water Pot",
        "Wheel-thrown terracotta pot with etched borders.",
        "Pottery",
        "Terracotta",
        "River clay",
        "Earth red",
        620,
        4,
        "sold",
      ],
      [
        "Clay Diya Set",
        "Set of twelve decorated oil lamps.",
        "Pottery",
        "Terracotta",
        "Clay",
        "Earth red",
        360,
        20,
        "listed",
      ],
      [
        "Terracotta Vase",
        "Tall etched vase for dry flowers.",
        "Pottery",
        "Terracotta",
        "River clay",
        "Earth red",
        780,
        5,
        "listed",
      ],
    ],
    orders: [
      ["Terracotta Water Pot", "Demo Heritage Hotels", 10, 6200, "completed"],
      ["Clay Diya Set", "Sample Stores", 12, 4320, "confirmed"],
    ],
  },
  {
    email: "suresh@hconnect.app",
    name: "Suresh",
    craft_type: "Wood Carving",
    location: "Kerala",
    phone: "+91 90000 00004",
    language: "en",
    experience_years: 20,
    products: [
      [
        "Carved Teak Elephant",
        "Hand-carved teak elephant finished with natural oil.",
        "Wooden craft",
        "Wood carving",
        "Teak",
        "Brown",
        1850,
        2,
        "listed",
      ],
      [
        "Wooden Nesting Boxes",
        "Set of four nesting boxes.",
        "Wooden craft",
        "Wood carving",
        "Teak",
        "Brown",
        1400,
        5,
        "listed",
      ],
      [
        "Wooden Spice Box",
        "Carved box with a sliding lid.",
        "Wooden craft",
        "Wood carving",
        "Teak",
        "Brown",
        950,
        8,
        "listed",
      ],
    ],
    orders: [
      ["Carved Teak Elephant", "Example Gifting Co.", 2, 3700, "pending"],
      ["Wooden Nesting Boxes", "Demo Local Shop", 1, 1400, "shipped"],
    ],
  },
  {
    email: "anjali@hconnect.app",
    name: "Anjali",
    craft_type: "Embroidery",
    location: "Gujarat",
    phone: "+91 90000 00005",
    language: "en",
    experience_years: 5,
    products: [
      [
        "Mirror Work Cushion Cover",
        "Hand-embroidered cushion cover with mirror work.",
        "Embroidery",
        "Hand embroidery",
        "Cotton",
        "Cream",
        700,
        6,
        "listed",
      ],
      [
        "Embroidered Wall Hanging",
        "Floral wall hanging on cotton canvas.",
        "Embroidery",
        "Hand embroidery",
        "Cotton",
        "Multicolour",
        1200,
        3,
        "draft",
      ],
      [
        "Block Print Table Runner",
        "Block-printed cotton table runner.",
        "Embroidery",
        "Block printing",
        "Cotton",
        "Indigo",
        850,
        7,
        "listed",
      ],
    ],
    orders: [
      ["Mirror Work Cushion Cover", "Demo Local Craft Corner", 6, 4200, "confirmed"],
      ["Block Print Table Runner", "Sample Stores", 4, 3400, "pending"],
    ],
  },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function ensureAuthUser(email) {
  // The Supabase admin API occasionally drops a connection; a couple of retries
  // keeps the seed reliable without leaving half-created demo accounts behind.
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: DEMO_PASSWORD,
      email_confirm: true,
    });
    if (!error) return data.user;
    if (error.message === "fetch failed") {
      if (attempt < 3) {
        await sleep(1500 * attempt);
        continue;
      }
      throw error;
    }
    // Already exists: look the user up so re-running the seed stays safe.
    const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    return list?.users?.find((user) => user.email === email) ?? null;
  }
  return null;
}

async function main() {
  console.log("Seeding reference data…");

  await supabase.from("schemes").delete().eq("is_demo", true);
  await supabase.from("training_resources").delete().eq("is_demo", true);
  await supabase.from("market_insights").delete().eq("is_demo", true);

  await supabase.from("schemes").insert(REFERENCE_SCHEMES.map(({ id, ...row }) => row));

  await supabase.from("training_resources").insert(REFERENCE_TRAINING.map(({ id, ...row }) => row));

  await supabase.from("market_insights").insert(REFERENCE_MARKET.map(({ id, ...row }) => row));

  console.log(
    `Seeded ${REFERENCE_SCHEMES.length} schemes, ${REFERENCE_TRAINING.length} training resources, ${REFERENCE_MARKET.length} market insights.`,
  );

  for (const artisan of [ARTISANS[0]]) {
    const user = await ensureAuthUser(artisan.email);
    if (!user) {
      console.warn(`Could not create or find the login for ${artisan.email} — skipping.`);
      continue;
    }

    await supabase.from("artisans").delete().eq("user_id", user.id);
    const { data: created, error } = await supabase
      .from("artisans")
      .insert({
        user_id: user.id,
        name: artisan.name,
        phone: artisan.phone,
        language: artisan.language,
        location: artisan.location,
        craft_type: artisan.craft_type,
        experience_years: artisan.experience_years,
        verification_status: "approved",
        is_demo: true,
      })
      .select()
      .single();
    if (error) throw error;

    const productRows = [];
    for (const [
      name,
      description,
      category,
      craft,
      material,
      color,
      price,
      quantity,
      status,
    ] of artisan.products) {
      productRows.push({
        artisan_id: created.id,
        name,
        description,
        category,
        craft,
        material,
        color,
        price,
        quantity,
        status,
        review_status: "approved",
        image_url: "",
        views: 20,
        interest: 3,
      });
    }
    const { data: products, error: productError } = await supabase
      .from("products")
      .insert(productRows)
      .select();
    if (productError) throw productError;

    const byName = Object.fromEntries((products ?? []).map((row) => [row.name, row]));
    const orderRows = artisan.orders
      .filter(([productName]) => byName[productName])
      .map(([productName, buyer_name, quantity, amount, status]) => ({
        artisan_id: created.id,
        product_id: byName[productName].id,
        buyer_name,
        quantity,
        amount,
        status,
      }));
    if (orderRows.length) await supabase.from("orders").insert(orderRows);

    console.log(
      `Seeded ${artisan.name} (${artisan.email}) with ${productRows.length} products and ${orderRows.length} orders.`,
    );
  }

  console.log(`\nDone. Lakshmi merchant login: ${ARTISANS[0].email} / ${DEMO_PASSWORD}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
