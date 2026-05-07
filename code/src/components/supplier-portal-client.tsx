"use client";

import { useEffect, useMemo, useState } from "react";
import AsyncSelect from "react-select/async";

type IngredientAliasOption = { id: string; alias_name: string };
type AliasSelectOption = { value: string; label: string };

type InventoryItem = {
  id: string;
  ingredient_id: string;
  ingredient_name: string;
  unit: string;
  unit_price: string;
  current_stock: string;
  is_active: boolean;
};

type SupplierOrder = {
  id: string;
  status: "pending" | "accepted" | "packed" | "fulfilled" | "cancelled";
  total_price: string;
  created_at: string;
};

const ORDER_STATUSES: SupplierOrder["status"][] = ["pending", "accepted", "packed", "fulfilled", "cancelled"];

export function SupplierPortalClient() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  const [defaultAliasOptions, setDefaultAliasOptions] = useState<AliasSelectOption[]>([]);
  const [selectedAlias, setSelectedAlias] = useState<AliasSelectOption | null>(null);
  const [newUnit, setNewUnit] = useState("kg");
  const [newPrice, setNewPrice] = useState("");
  const [newStock, setNewStock] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectStyles = useMemo(
    () => ({
      control: (base: Record<string, unknown>, state: { isFocused: boolean }) => ({
        ...base,
        backgroundColor: "#faf8f5",
        borderColor: state.isFocused ? "#e07b39" : "#e8e0d8",
        borderWidth: 2,
        borderRadius: 10,
        minHeight: 44,
        boxShadow: "none",
        cursor: "text",
      }),
      menu: (base: Record<string, unknown>) => ({
        ...base,
        borderRadius: 12,
        border: "1px solid #f0ebe5",
        boxShadow: "0 18px 40px rgba(0, 0, 0, 0.12)",
        overflow: "hidden",
      }),
      option: (base: Record<string, unknown>, state: { isFocused: boolean; isSelected: boolean }) => ({
        ...base,
        backgroundColor: state.isSelected ? "#ffe7d6" : state.isFocused ? "#fff7ee" : "#ffffff",
        color: "#2d2d2d",
        cursor: "pointer",
      }),
    }),
    [],
  );

  async function loadAll() {
    const [inventoryRes, ordersRes] = await Promise.all([fetch("/api/supplier/inventory"), fetch("/api/supplier/orders")]);
    const inventoryJson = (await inventoryRes.json()) as { items?: InventoryItem[] };
    const ordersJson = (await ordersRes.json()) as { orders?: SupplierOrder[] };
    setInventory(inventoryJson.items ?? []);
    setOrders(ordersJson.orders ?? []);
  }

  useEffect(() => {
    let active = true;
    const init = async () => {
      try {
        await loadAll();
        const aliasesRes = await fetch("/api/ingredient-aliases");
        const aliasesJson = (await aliasesRes.json()) as { aliases?: IngredientAliasOption[] };
        if (active) setDefaultAliasOptions((aliasesJson.aliases ?? []).map((a) => ({ value: a.alias_name, label: a.alias_name })));
      } catch {
        if (active) {
          setError("Failed to load supplier data.");
        }
      }
    };
    void init();
    return () => {
      active = false;
    };
  }, []);

  async function loadAliasOptions(inputValue: string): Promise<AliasSelectOption[]> {
    const trimmed = inputValue.trim();
    const url = trimmed ? `/api/ingredient-aliases?q=${encodeURIComponent(trimmed)}` : "/api/ingredient-aliases";
    const res = await fetch(url);
    const json = (await res.json()) as { aliases?: IngredientAliasOption[]; error?: string };
    if (!res.ok) {
      setError(json.error ?? "Failed to load ingredient aliases.");
      return [];
    }
    return (json.aliases ?? []).map((a) => ({ value: a.alias_name, label: a.alias_name }));
  }

  async function addInventoryItem() {
    setError(null);
    setMessage(null);
    if (!selectedAlias?.value || !newUnit.trim() || !newPrice || !newStock) {
      setError("Please fill all inventory fields before adding.");
      return;
    }

    const res = await fetch("/api/supplier/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ingredientName: selectedAlias.value,
        unit: newUnit,
        unitPrice: Number(newPrice),
        initialStock: Number(newStock),
      }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? "Could not add item.");
      return;
    }
    setMessage("Inventory item added/updated.");
    setSelectedAlias(null);
    setNewPrice("");
    setNewStock("");
    await loadAll();
  }

  async function addBatch(inventoryItemId: string) {
    const quantityRaw = prompt("Quantity to add:");
    if (!quantityRaw) return;
    const quantity = Number(quantityRaw);
    if (!quantity || quantity <= 0) return;
    await fetch(`/api/supplier/inventory/${inventoryItemId}/batches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantityAdded: quantity }),
    });
    await loadAll();
  }

  async function updateOrderStatus(orderId: string, status: SupplierOrder["status"]) {
    await fetch(`/api/supplier/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await loadAll();
  }

  async function removeIngredient(inventoryItemId: string, ingredientName: string) {
    const quantityRaw = prompt(`How much "${ingredientName}" stock do you want to remove?`);
    if (!quantityRaw) return;
    const quantity = Number(quantityRaw);
    if (!quantity || quantity <= 0) {
      setError("Please enter a valid quantity to remove.");
      return;
    }

    setError(null);
    setMessage(null);
    const response = await fetch(`/api/supplier/inventory/${inventoryItemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ removeQuantity: quantity }),
    });
    const json = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(json.error ?? "Could not remove ingredient.");
      return;
    }

    setMessage(`Removed ${quantity} of ${ingredientName} from stock.`);
    await loadAll();
  }

  return (
    <div className="supplier-layout">
      <section className="filter-section">
        <h2 className="dashboard-title">Inventory Dashboard</h2>
        <p>Add and maintain ingredient stock for your supplier account.</p>

        <div className="supplier-form-grid">
          <div className="supplier-field">
            <label className="supplier-label" htmlFor="ingredientAlias">
              Ingredient (Taxonomy Alias)
            </label>
            <div style={{ marginTop: 6 }}>
              <AsyncSelect
                instanceId="ingredientAlias"
                inputId="ingredientAlias"
                value={selectedAlias}
                defaultOptions={defaultAliasOptions}
                loadOptions={loadAliasOptions}
                onChange={(opt) => {
                  setError(null);
                  setMessage(null);
                  setSelectedAlias(opt as AliasSelectOption | null);
                }}
                isClearable
                placeholder="Select an ingredient alias…"
                noOptionsMessage={({ inputValue }) =>
                  inputValue.trim() ? "No matches. Ask an admin to add/map it." : "No aliases yet."
                }
                styles={selectStyles as never}
              />
            </div>
          </div>
          <div className="supplier-field">
            <label className="supplier-label" htmlFor="unitSelect">
              Unit
            </label>
            <select id="unitSelect" className="supplier-select" value={newUnit} onChange={(event) => setNewUnit(event.target.value)}>
              <option value="kg">kg</option>
              <option value="g">g</option>
              <option value="lt">lt</option>
              <option value="ml">ml</option>
              <option value="piece">piece</option>
              <option value="pack">pack</option>
            </select>
          </div>
          <div className="supplier-field">
            <label className="supplier-label" htmlFor="unitPrice">
              Unit Price
            </label>
            <input
              id="unitPrice"
              className="supplier-input"
              placeholder="e.g. 8.50"
              type="number"
              min="0"
              step="0.01"
              value={newPrice}
              onChange={(event) => setNewPrice(event.target.value)}
            />
          </div>
          <div className="supplier-field">
            <label className="supplier-label" htmlFor="initialStock">
              Initial Stock
            </label>
            <input
              id="initialStock"
              className="supplier-input"
              placeholder="e.g. 25"
              type="number"
              min="0"
              step="0.001"
              value={newStock}
              onChange={(event) => setNewStock(event.target.value)}
            />
          </div>
          <div className="supplier-field supplier-field-action">
            <button type="button" className="btn btn-primary supplier-add-btn" onClick={addInventoryItem}>
              Add Inventory Item
            </button>
          </div>
        </div>

        {error ? <p className="error-text">{error}</p> : null}
        {message ? <p className="ok-text">{message}</p> : null}

        <div className="supplier-table-wrap">
          <table className="supplier-table">
            <thead>
              <tr>
                <th>Ingredient</th>
                <th>Stock</th>
                <th>Unit</th>
                <th>Unit Price</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item) => (
                <tr key={item.id}>
                  <td>{item.ingredient_name}</td>
                  <td>{item.current_stock}</td>
                  <td>{item.unit}</td>
                  <td>{item.unit_price}</td>
                  <td>{item.is_active ? "Active" : "Inactive"}</td>
                  <td>
                    <button type="button" className="btn btn-secondary supplier-action-btn" onClick={() => addBatch(item.id)}>
                      Add Batch
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary supplier-action-btn supplier-remove-btn"
                      onClick={() => removeIngredient(item.id, item.ingredient_name)}
                    >
                      Remove Stock
                    </button>
                  </td>
                </tr>
              ))}
              {!inventory.length ? (
                <tr>
                  <td colSpan={6}>No inventory entries yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="filter-section">
        <h2 className="dashboard-title">Order Fulfillment Queue</h2>
        <p>Orders routed to your supplier account after checkout stock deductions.</p>

        <div className="supplier-table-wrap">
          <table className="supplier-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Status</th>
                <th>Total</th>
                <th>Created</th>
                <th>Update</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>{order.id.slice(0, 8)}</td>
                  <td>{order.status}</td>
                  <td>{order.total_price}</td>
                  <td>{new Date(order.created_at).toLocaleString()}</td>
                  <td>
                    <select
                      className="supplier-select"
                      value={order.status}
                      onChange={(event) => updateOrderStatus(order.id, event.target.value as SupplierOrder["status"])}
                    >
                      {ORDER_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {!orders.length ? (
                <tr>
                  <td colSpan={5}>No supplier orders yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
