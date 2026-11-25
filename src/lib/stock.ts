import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Atomically deducts stock for all items in a paid order.
 * Calls the PostgreSQL RPC `deduct_order_stock` first, with a TypeScript fallback.
 */
export async function deductOrderStock(
  supabase: SupabaseClient,
  orderId: string
): Promise<void> {
  const { error: rpcError } = await supabase.rpc("deduct_order_stock", {
    p_order_id: orderId,
  });

  if (!rpcError) return;

  // Fallback if RPC is not yet deployed in DB
  const { data: items } = await supabase
    .from("order_items")
    .select("menu_id, qty")
    .eq("order_id", orderId);

  if (!items) return;

  for (const item of items) {
    if (!item.menu_id) continue;
    const { data: menu } = await supabase
      .from("menus")
      .select("id, stock_mode, stock_qty")
      .eq("id", item.menu_id)
      .single();

    if (!menu) continue;

    if (menu.stock_mode === "direct") {
      const nextQty = Math.max(0, Number(menu.stock_qty || 0) - Number(item.qty || 1));
      await supabase
        .from("menus")
        .update({
          stock_qty: nextQty,
          ...(nextQty <= 0 ? { is_available: false } : {}),
        })
        .eq("id", menu.id);
    } else if (menu.stock_mode === "recipe") {
      const { data: recipes } = await supabase
        .from("menu_recipes")
        .select("ingredient_id, qty_needed")
        .eq("menu_id", menu.id);

      if (recipes) {
        for (const r of recipes) {
          const { data: ing } = await supabase
            .from("ingredients")
            .select("id, stock_qty")
            .eq("id", r.ingredient_id)
            .single();

          if (ing) {
            const nextIng = Math.max(
              0,
              Number(ing.stock_qty || 0) - Number(r.qty_needed || 0) * Number(item.qty || 1)
            );
            await supabase
              .from("ingredients")
              .update({ stock_qty: nextIng, updated_at: new Date().toISOString() })
              .eq("id", ing.id);
          }
        }
      }
    }
  }
}

/**
 * Restores stock for all items in a voided/cancelled paid order.
 */
export async function restoreOrderStock(
  supabase: SupabaseClient,
  orderId: string
): Promise<void> {
  const { error: rpcError } = await supabase.rpc("restore_order_stock", {
    p_order_id: orderId,
  });

  if (!rpcError) return;

  const { data: items } = await supabase
    .from("order_items")
    .select("menu_id, qty")
    .eq("order_id", orderId);

  if (!items) return;

  for (const item of items) {
    if (!item.menu_id) continue;
    const { data: menu } = await supabase
      .from("menus")
      .select("id, stock_mode, stock_qty")
      .eq("id", item.menu_id)
      .single();

    if (!menu) continue;

    if (menu.stock_mode === "direct") {
      const nextQty = Number(menu.stock_qty || 0) + Number(item.qty || 1);
      await supabase
        .from("menus")
        .update({
          stock_qty: nextQty,
          ...(nextQty > 0 ? { is_available: true } : {}),
        })
        .eq("id", menu.id);
    } else if (menu.stock_mode === "recipe") {
      const { data: recipes } = await supabase
        .from("menu_recipes")
        .select("ingredient_id, qty_needed")
        .eq("menu_id", menu.id);

      if (recipes) {
        for (const r of recipes) {
          const { data: ing } = await supabase
            .from("ingredients")
            .select("id, stock_qty")
            .eq("id", r.ingredient_id)
            .single();

          if (ing) {
            const nextIng =
              Number(ing.stock_qty || 0) +
              Number(r.qty_needed || 0) * Number(item.qty || 1);
            await supabase
              .from("ingredients")
              .update({ stock_qty: nextIng, updated_at: new Date().toISOString() })
              .eq("id", ing.id);
          }
        }
      }
    }
  }
}

/**
 * Automatically cancels unpaid cash orders older than 15 minutes.
 */
export async function cancelExpiredCashOrders(
  supabase: SupabaseClient,
  storeId?: string
): Promise<void> {
  const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  let query = supabase
    .from("orders")
    .update({
      order_status: "cancelled",
      payment_status: "failed",
      void_reason: "Otomatis dibatalkan (melewati batas waktu bayar tunai 15 menit)",
    })
    .eq("payment_method", "cash")
    .eq("payment_status", "pending")
    .lt("created_at", fifteenMinsAgo);

  if (storeId) {
    query = query.eq("store_id", storeId);
  }

  await query;
}
