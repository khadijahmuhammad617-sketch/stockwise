
"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";

export default function SalesHistoryPage() {
  const [sales, setSales] = useState([]);
  const [message, setMessage] = useState("Loading sales history...");

  useEffect(() => {
    const salesQuery = query(
      collection(db, "sales"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      salesQuery,
      (snapshot) => {
        setSales(snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        })));
        setMessage("");
      },
      (error) => setMessage("Could not load sales: " + error.message)
    );

    return () => unsubscribe();
  }, []);

  return (
    <main className="min-h-screen bg-[#f7f4ec] p-6 text-[#34483b] md:p-10">
      <h1 className="mb-2 text-3xl font-bold">Sales History</h1>
      <p className="mb-8 text-[#6b776b]">
        Review recorded customer transactions.
      </p>

      <section className="overflow-x-auto rounded-2xl border border-[#e6e3d8] bg-white p-6">
        <h2 className="mb-4 text-xl font-bold">
          Recorded Sales ({sales.length})
        </h2>

        {message && <p className="mb-4 text-sm">{message}</p>}

        {!message && sales.length === 0 && (
          <p>No sales recorded yet.</p>
        )}

        {sales.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
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
                <tr key={sale.id} className="border-b">
                  <td className="p-3">{sale.customerName}</td>
                  <td className="p-3">{sale.repName}</td>
                  <td className="p-3 font-medium">
                    ₦{Number(sale.total || 0).toLocaleString("en-NG")}
                  </td>
                  <td className="p-3 capitalize">{sale.paymentMethod}</td>
                  <td className="p-3 capitalize">{sale.status}</td>
                  <td className="p-3">
                    {sale.createdAt?.toDate
                      ? sale.createdAt.toDate().toLocaleString()
                      : "Just recorded"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
