import { Router } from "express";

import { requireSupabase } from "../db.js";
import { requireArtisan } from "../middleware/auth.js";

const router = Router();

/**
 * GET /api/dashboard
 *
 * Totals are counted by the database so the frontend does not have to
 * download every row just to add them up.
 */
router.get("/", requireArtisan, async (req, res, next) => {
  try {
    const supabase = requireSupabase();
    const artisanId = req.artisan.id;

    const [products, orders] = await Promise.all([
      supabase
        .from("products")
        .select("id,status,review_status,quantity,price")
        .eq("artisan_id", artisanId),
      supabase.from("orders").select("id,status,amount,quantity").eq("artisan_id", artisanId),
    ]);

    if (products.error) throw products.error;
    if (orders.error) throw orders.error;

    const productRows = products.data ?? [];
    const orderRows = orders.data ?? [];

    const sold = orderRows.filter((row) => row.status === "completed" || row.status === "shipped");

    res.json({
      totalProducts: productRows.length,
      listedProducts: productRows.filter(
        (row) => row.status === "listed" && row.review_status === "approved",
      ).length,
      totalOrders: orderRows.length,
      pendingOrders: orderRows.filter((row) => row.status === "pending").length,
      totalSales: sold.reduce((sum, row) => sum + Number(row.amount ?? 0), 0),
      unitsSold: sold.reduce((sum, row) => sum + Number(row.quantity ?? 0), 0),
      stockValue: productRows
        .filter((row) => row.status !== "sold")
        .reduce((sum, row) => sum + Number(row.price ?? 0) * Number(row.quantity ?? 0), 0),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
