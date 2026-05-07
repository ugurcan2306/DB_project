"use client";

import { useEffect, useState } from "react";

type SupplierOrder = {
  supplierOrderId: string;
  supplierId: string;
  supplierName: string;
  status: "pending" | "accepted" | "packed" | "fulfilled" | "cancelled";
  totalPrice: number;
  items: Array<{ ingredientName: string; quantity: string; unit: string; lineTotal: string }>;
};

type OrderGroup = {
  id: string;
  createdAt: string;
  updatedAt: string;
  totalPrice: number;
  suppliers: SupplierOrder[];
};

function statusLabel(status: SupplierOrder["status"]) {
  if (status === "fulfilled") return "Sent";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function OrdersClient() {
  const [activeOrders, setActiveOrders] = useState<OrderGroup[]>([]);
  const [historyOrders, setHistoryOrders] = useState<OrderGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch("/api/orders");
        const json = (await res.json()) as { error?: string; activeOrders?: OrderGroup[]; historyOrders?: OrderGroup[] };
        if (!res.ok) {
          setError(json.error ?? "Could not load orders.");
          return;
        }
        setActiveOrders(json.activeOrders ?? []);
        setHistoryOrders(json.historyOrders ?? []);
      } catch {
        setError("Could not load orders.");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, []);

  if (loading) return <p>Loading orders...</p>;
  if (error) return <p className="error-text">{error}</p>;

  const primaryActive = activeOrders[0] ?? null;

  return (
    <div className="orders-layout">
      <section className="filter-section">
        <h2 className="dashboard-title">Active Order</h2>
        {!primaryActive ? (
          <p>No active orders right now.</p>
        ) : (
          <div className="orders-card">
            <p className="orders-headline">
              Order #{primaryActive.id.slice(0, 8)} · ${primaryActive.totalPrice.toFixed(2)}
            </p>
            <p className="orders-subline">Placed {new Date(primaryActive.createdAt).toLocaleString()}</p>
            <div className="orders-suppliers">
              {primaryActive.suppliers.map((s) => (
                <div key={s.supplierOrderId} className="orders-supplier-block">
                  <div className="orders-supplier-top">
                    <strong>{s.supplierName}</strong>
                    <span className={`orders-status orders-status-${s.status}`}>{statusLabel(s.status)}</span>
                  </div>
                  <ul className="orders-items-list">
                    {s.items.map((item, idx) => (
                      <li key={`${item.ingredientName}-${idx}`}>
                        {item.quantity} {item.unit} {item.ingredientName} — ${Number(item.lineTotal).toFixed(2)}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="filter-section">
        <h2 className="dashboard-title">Order History</h2>
        {!historyOrders.length ? (
          <p>No completed orders yet.</p>
        ) : (
          <div className="supplier-table-wrap">
            <table className="supplier-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Date</th>
                  <th>Suppliers</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {historyOrders.map((order) => (
                  <tr key={order.id}>
                    <td>#{order.id.slice(0, 8)}</td>
                    <td>{new Date(order.createdAt).toLocaleString()}</td>
                    <td>{order.suppliers.length}</td>
                    <td>${order.totalPrice.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

