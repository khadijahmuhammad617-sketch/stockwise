
"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";

export default function AdminSalesReport() {
  const [sales, setSales] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const salesQuery = query(
      collection(db, "sales"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      salesQuery,
      (snapshot) => {
        setSales(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }))
        );
        setError("");
      },
      (err) => {
        console.error(err);
        setError(
          "Could not load sales. Check your login and Firestore rules."
        );
      }
    );

    return () => unsubscribe();
  }, []);

  const completedSales = sales.filter(
    (sale) => sale.status === "completed"
  );

  const totalRevenue = completedSales.reduce(
    (total, sale) => total + (Number(sale.total) || 0),
    0
  );

  const today = new Date().toDateString();

  const todaySales = completedSales.filter((sale) => {
    if (!sale.createdAt?.toDate) return false;

    return sale.createdAt.toDate().toDateString() === today;
  });

  return (
    <main className="min-h-screen bg-background p-6 text-foreground">
      <div className="mx-auto max-w-6xl">
        <a href="/admin" className="text-orange-700 underline">
          Back to Admin Dashboard
        </a>

        <h1 className="mt-5 text-3xl font-bold">
          Admin Sales Report
        </h1>

        <p className="mt-2 opacity-70">
          Review recorded sales and revenue from StockWise.
        </p>

        {error && (
          <p className="mt-4 rounded-lg bg-red-100 p-3 text-red-700">
            {error}
          </p>
        )}

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-(--border) bg-(--card) p-5">
            <p className="text-sm opacity-70">Total Revenue</p>
            <h2 className="mt-2 text-2xl font-bold">
              ₦{totalRevenue.toLocaleString("en-NG")}
            </h2>
          </div>

          <div className="rounded-xl border border-(--border) bg-(--card) p-5">
            <p className="text-sm opacity-70">Completed Sales</p>
            <h2 className="mt-2 text-2xl font-bold">
              {completedSales.length}
            </h2>
          </div>

          <div className="rounded-xl border border-(--border) bg-(--card) p-5">
            <p className="text-sm opacity-70">Sales Today</p>
            <h2 className="mt-2 text-2xl font-bold">
              {todaySales.length}
            </h2>
          </div>
        </section>

        <section className="mt-8 overflow-x-auto rounded-xl border border-(--border) bg-(--card)">
          <h2 className="p-5 text-xl font-bold">Sales History</h2>

          <table className="w-full text-left text-sm">
            <thead className="bg-(--sage)">
              <tr>
                <th className="p-3">Customer</th>
                <th className="p-3">Sales Rep</th>
                <th className="p-3">Total</th>
                <th className="p-3">Payment</th>
                <th className="p-3">Status</th>
                <th className="p-3">Date</th>
              </tr>
            </thead>

            <tbody>
              {sales.map((sale) => (
                <tr
                  key={sale.id}
                  className="border-t border-(--border)"
                >
                  <td className="p-3">
                    {sale.customerName || "Walk-in"}
                  </td>

                  <td className="p-3">
                    {sale.repName || "Unknown"}
                  </td>

                  <td className="p-3">
                    ₦{(Number(sale.total) || 0).toLocaleString("en-NG")}
                  </td>

                  <td className="p-3">
                    {sale.paymentMethod || "—"}
                  </td>

                  <td className="p-3">
                    {sale.status || "Unknown"}
                  </td>

                  <td className="p-3">
                    {sale.createdAt?.toDate
                      ? sale.createdAt.toDate().toLocaleString("en-NG")
                      : "Pending"}
                  </td>
                </tr>
              ))}

              {sales.length === 0 && !error && (
                <tr>
                  <td
                    colSpan={6}
                    className="p-5 text-center opacity-70"
                  >
                    No sales have been recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
