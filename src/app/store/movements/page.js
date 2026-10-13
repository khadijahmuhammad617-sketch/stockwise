
"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../../../lib/firebase";

export default function StockMovementsPage() {
  const [movements, setMovements] = useState([]);
  const [message, setMessage] = useState("Loading stock movements...");

  useEffect(() => {
    const movementsQuery = query(
      collection(db, "stockMovements"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      movementsQuery,
      (snapshot) => {
        setMovements(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }))
        );
        setMessage("");
      },
      (error) => setMessage("Could not load movements: " + error.message)
    );

    return () => unsubscribe();
  }, []);

  return (
    <main className="min-h-screen bg-[#f7f4ec] p-6 text-[#34483b] md:p-10">
      <h1 className="mb-2 text-3xl font-bold">Stock Movements</h1>
      <p className="mb-8 text-[#6b776b]">
        Track stock coming into and leaving your inventory.
      </p>

      <section className="overflow-x-auto rounded-2xl border border-[#e6e3d8] bg-white p-6">
        <h2 className="mb-4 text-xl font-bold">
          Movement History ({movements.length})
        </h2>

        {message && <p className="mb-4 text-sm">{message}</p>}

        {!message && movements.length === 0 && (
          <p>No stock movements recorded yet.</p>
        )}

        {movements.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-3">Product</th>
                <th className="p-3">Movement</th>
                <th className="p-3">Quantity</th>
                <th className="p-3">Reason</th>
                <th className="p-3">Recorded by</th>
                <th className="p-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((movement) => (
                <tr key={movement.id} className="border-b">
                  <td className="p-3">{movement.productName || "Unknown"}</td>
                  <td className="p-3 capitalize">{movement.type || "Other"}</td>
                  <td className="p-3">{movement.quantity ?? 0}</td>
                  <td className="p-3">{movement.reason || "—"}</td>
                  <td className="p-3">{movement.byName || "—"}</td>
                  <td className="p-3">
                    {movement.createdAt?.toDate
                      ? movement.createdAt.toDate().toLocaleString()
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
