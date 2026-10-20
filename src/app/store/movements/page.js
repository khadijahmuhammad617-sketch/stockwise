
"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../../lib/firebase";

export default function StockMovementsPage() {
  const [movements, setMovements] = useState([]);
  const [message, setMessage] = useState("Loading stock movements...");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeMovements = null;
    let cancelled = false;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (unsubscribeMovements) {
        unsubscribeMovements();
        unsubscribeMovements = null;
      }

      setMovements([]);
      setLoading(true);
      setMessage("");

      if (!user) {
        setMessage("Please sign in to view stock movements.");
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (cancelled) return;

        if (!userSnap.exists()) {
          setMessage("Your user profile could not be found.");
          setLoading(false);
          return;
        }

        const userData = userSnap.data();

        if (userData.active !== true) {
          setMessage("Your account is not active.");
          setLoading(false);
          return;
        }

        if (!["admin", "storekeeper"].includes(userData.role)) {
          setMessage(
            "Only admins and storekeepers can view stock movements."
          );
          setLoading(false);
          return;
        }

        if (!userData.businessId) {
          setMessage("Your account has no business assigned.");
          setLoading(false);
          return;
        }

        const movementsQuery = query(
          collection(db, "stockMovements"),
          where("businessId", "==", userData.businessId)
        );

        unsubscribeMovements = onSnapshot(
          movementsQuery,
          (snapshot) => {
            if (cancelled) return;

            const movementList = snapshot.docs.map((item) => ({
              id: item.id,
              ...item.data(),
            }));

            movementList.sort((a, b) => {
              const dateA = a.createdAt?.toMillis?.() || 0;
              const dateB = b.createdAt?.toMillis?.() || 0;
              return dateB - dateA;
            });

            setMovements(movementList);
            setMessage("");
            setLoading(false);
          },
          (error) => {
            console.error("Stock movements error:", error);

            if (!cancelled) {
              setMessage(
                "Could not load movements: " + error.message
              );
              setLoading(false);
            }
          }
        );
      } catch (error) {
        console.error("Stock movements setup error:", error);

        if (!cancelled) {
          setMessage(
            "Could not load your account: " + error.message
          );
          setLoading(false);
        }
      }
    });

    return () => {
      cancelled = true;
      unsubscribeAuth();

      if (unsubscribeMovements) {
        unsubscribeMovements();
      }
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#f7f4ec] p-6 text-[#34483b] md:p-10">
      <div className="mx-auto max-w-6xl">
        <a href="/" className="text-sm text-orange-700 underline">
          Back to Dashboard
        </a>

        <h1 className="mb-2 mt-5 text-3xl font-bold">
          Stock Movements
        </h1>

        <p className="mb-8 text-[#6b776b]">
          Track stock coming into and leaving your inventory.
        </p>

        <section className="overflow-x-auto rounded-2xl border border-[#e6e3d8] bg-white p-6">
          <h2 className="mb-4 text-xl font-bold">
            Movement History ({movements.length})
          </h2>

          {message && (
            <p className="mb-4 break-words text-sm" role="status">
              {message}
            </p>
          )}

          {loading && <p>Loading stock movements...</p>}

          {!loading && !message && movements.length === 0 && (
            <p>No stock movements recorded for this business yet.</p>
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
                    <td className="p-3">
                      {movement.productName || "Unknown"}
                    </td>

                    <td className="p-3 capitalize">
                      {movement.type || "Other"}
                    </td>

                    <td className="p-3">
                      {movement.quantity ?? 0}
                    </td>

                    <td className="p-3">
                      {movement.reason || "—"}
                    </td>

                    <td className="p-3">
                      {movement.byName || "—"}
                    </td>

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
      </div>
    </main>
  );
}
