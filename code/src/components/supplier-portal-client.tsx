"use client";

import { useEffect, useState } from "react";

type InventoryItem = {
  id: string;
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
  const [newIngredient, setNewIngredient] = useState("");
  const [newUnit, setNewUnit] = useState("kg");
  const [newPrice, setNewPrice] = useState("");
  const [newStock, setNewStock] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  async function addInventoryItem() {
    setError(null);
    setMessage(null);
    if (!newIngredient.trim() || !newUnit.trim() || !newPrice || !newStock) {
      setError("Please fill all inventory fields before adding.");
      return;
    }

    const res = await fetch("/api/supplier/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ingredientName: newIngredient,
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
    setNewIngredient("");
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

  return (
    <div className="supplier-layout">
      <section className="filter-section">
        <h2 className="dashboard-title">Inventory Dashboard</h2>
        <p>Add and maintain ingredient stock for your supplier account.</p>

        <div className="supplier-form-grid">
          <div className="supplier-field">
            <label className="supplier-label" htmlFor="ingredientName">
              Ingredient Name
            </label>
            <input
              id="ingredientName"
              className="supplier-input"
              placeholder="e.g. Roma Tomato"
              value={newIngredient}
              onChange={(event) => setNewIngredient(event.target.value)}
            />
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
