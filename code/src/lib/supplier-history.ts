import type { PoolClient } from "pg";
import { getDb } from "@/db/pool";

export type SupplierActionType =
  | "initialize_stock"
  | "add_batch"
  | "remove_stock"
  | "remove_ingredient"
  | "manual_update"
  | "order_status_update"
  | "order_fulfilled";

type LogActionInput = {
  supplierId: string;
  actionType: SupplierActionType;
  inventoryItemId?: string | null;
  ingredientId?: string | null;
  supplierOrderId?: string | null;
  quantityChange?: number | null;
  note?: string | null;
};

export async function logSupplierAction(input: LogActionInput, client?: PoolClient) {
  const executor = client ?? getDb();
  await executor.query(
    `INSERT INTO supplier_inventory_history
      (supplier_id, inventory_item_id, ingredient_id, supplier_order_id, action_type, quantity_change, note)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      input.supplierId,
      input.inventoryItemId ?? null,
      input.ingredientId ?? null,
      input.supplierOrderId ?? null,
      input.actionType,
      input.quantityChange ?? null,
      input.note ?? null,
    ],
  );
}
