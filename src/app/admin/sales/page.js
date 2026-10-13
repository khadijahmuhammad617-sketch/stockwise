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
        setError("Could not load sales. Check your login and Firestore rules.");
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
    <main className="min-h-screen bg-[#fffaf0] p-6 text-gray-800">
      <div className="mx-auto max-w-6xl">
        <a href="/" className="text-orange-700 underline">
          Back to Dashboard
        </a>

        <h1 className="mt-5 text-3xl font-bold">Admin Sales Report</h1>
        <p className="mt-2 text-gray-600">
          Review recorded sales and revenue from StockWise.
        </p>

        {error && (
          <p className="mt-4 rounded bg-red-100 p-3 text-red-700">
            {error}
          </p>
        )}

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Total Revenue</p>
            <h2 className="mt-2 text-2xl font-bold">
              ₦{totalRevenue.toLocaleString("en-NG")}
            </h2>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Completed Sales</p>
            <h2 className="mt-2 text-2xl font-bold">
              {completedSales.length}
            </h2>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Sales Today</p>
            <h2 className="mt-2 text-2xl font-bold">
              {todaySales.length}
            </h2>
          </div>
        </section>

        <section className="mt-8 overflow-x-auto rounded-xl border bg-white">
          <h2 className="p-5 text-xl font-bold">Sales History</h2>

          <table className="w-full text-left text-sm">
            <thead className="bg-orange-100">
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
                <tr key={sale.id} className="border-t">
                  <td className="p-3">{sale.customerName || "Walk-in"}</td>
                  <td className="p-3">{sale.repName || "Unknown"}</td>
                  <td className="p-3">
                    ₦{(Number(sale.total) || 0).toLocaleString("en-NG")}
                  </td>
                  <td className="p-3">{sale.paymentMethod || "—"}</td>
                  <td className="p-3">{sale.status || "Unknown"}</td>
                  <td className="p-3">
                    {sale.createdAt?.toDate
                      ? sale.createdAt.toDate().toLocaleString("en-NG")
                      : "Pending"}
                  </td>
                </tr>
              ))}

              {sales.length === 0 && !error && (
                <tr>
                  <td colSpan={6} className="p-5 text-center text-gray-500">
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