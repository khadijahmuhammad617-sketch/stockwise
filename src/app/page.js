

"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";

export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "products"),
      (snapshot) => {
        setProducts(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }))
        );
        setLoading(false);
        setError("");
      },
      (err) => {
        setError("Could not load inventory: " + err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const totalUnits = products.reduce(
    (total, product) => total + (Number(product.quantity) || 0),
    0
  );

  const lowStockProducts = products.filter(
    (product) =>
      Number(product.quantity) <= Number(product.reorderLevel)
  );

  const inventoryValue = products.reduce(
    (total, product) =>
      total +
      (Number(product.quantity) || 0) *
        (Number(product.sellingPrice) || 0),
    0
  );

  return (
    <main className="min-h-screen bg-[#f7f4ec] p-6 text-[#34483b] md:p-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">StockWise Dashboard</h1>
          <p className="mt-2 text-[#6b776b]">
            Building materials inventory overview
          </p>
        </div>

        <a
          href="/products"
          className="rounded-lg bg-[#526b53] px-5 py-3 font-semibold text-white"
        >
          Manage Products
        </a>
      </header>

      {error && (
        <p className="mb-6 rounded-lg bg-red-100 p-4 text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <p>Loading your inventory...</p>
      ) : (
        <>
          <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-[#e6e3d8] bg-white p-6">
              <p className="text-sm text-[#6b776b]">Total Products</p>
              <p className="mt-3 text-3xl font-bold">{products.length}</p>
            </div>

            <div className="rounded-2xl border border-[#e6e3d8] bg-white p-6">
              <p className="text-sm text-[#6b776b]">Total Units in Stock</p>
              <p className="mt-3 text-3xl font-bold">
                {totalUnits.toLocaleString("en-NG")}
              </p>
            </div>

            <div className="rounded-2xl border border-[#e6e3d8] bg-white p-6">
              <p className="text-sm text-[#6b776b]">Low-Stock Products</p>
              <p className="mt-3 text-3xl font-bold text-amber-700">
                {lowStockProducts.length}
              </p>
            </div>

            <div className="rounded-2xl border border-[#e6e3d8] bg-white p-6">
              <p className="text-sm text-[#6b776b]">
                Potential Stock Value
              </p>
              <p className="mt-3 text-2xl font-bold">
                ₦{inventoryValue.toLocaleString("en-NG")}
              </p>
              <p className="mt-1 text-xs text-[#6b776b]">
                Based on selling prices, not profit
              </p>
            </div>
          </section>

          <section className="mt-8 rounded-2xl border border-[#e6e3d8] bg-white p-6">
            <h2 className="mb-5 text-xl font-bold">Current Inventory</h2>

            {products.length === 0 ? (
              <p>No products yet. Add products to see your inventory here.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="p-3">Product</th>
                      <th className="p-3">SKU</th>
                      <th className="p-3">Selling Price</th>
                      <th className="p-3">Quantity</th>
                      <th className="p-3">Stock Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => {
                      const low =
                        Number(product.quantity) <=
                        Number(product.reorderLevel);

                      return (
                        <tr key={product.id} className="border-b">
                          <td className="p-3 font-medium">
                            {product.name}
                          </td>
                          <td className="p-3">{product.sku}</td>
                          <td className="p-3">
                            ₦{Number(product.sellingPrice || 0).toLocaleString("en-NG")}
                          </td>
                          <td className="p-3">
                            {product.quantity} {product.unit}
                          </td>
                          <td className="p-3">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                low
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-green-100 text-green-800"
                              }`}
                            >
                              {low ? "Low Stock" : "In Stock"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="mt-8 rounded-2xl border border-[#e6e3d8] bg-white p-6">
            <h2 className="mb-4 text-xl font-bold">Restock Alerts</h2>

            {lowStockProducts.length === 0 ? (
              <p>All products are above their restock levels.</p>
            ) : (
              <ul className="space-y-3">
                {lowStockProducts.map((product) => (
                  <li
                    key={product.id}
                    className="flex flex-wrap justify-between gap-2 rounded-lg bg-amber-50 p-4"
                  >
                    <span className="font-medium">{product.name}</span>
                    <span>
                      {product.quantity} {product.unit} remaining
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <footer className="mt-8 text-sm text-[#6b776b]">
        StockWise Inventory Management System
      </footer>
    </main>
  );
}
