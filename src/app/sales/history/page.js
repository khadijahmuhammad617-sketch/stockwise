
"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../../lib/firebase";

export default function SalesHistoryPage() {
  const [sales, setSales] = useState([]);
  const [message, setMessage] = useState("Loading sales history...");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeSales = null;
    let cancelled = false;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (unsubscribeSales) {
        unsubscribeSales();
        unsubscribeSales = null;
      }

      setSales([]);
      setLoading(true);
      setMessage("");

      if (!user) {
        setMessage("Please sign in to view sales history.");
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

        if (!userData.businessId) {
          setMessage("Your account has no business assigned.");
          setLoading(false);
          return;
        }

        if (!["admin", "salesRep"].includes(userData.role)) {
          setMessage("Your account does not have access to Sales History.");
          setLoading(false);
          return;
        }

        let salesQuery;

        if (userData.role === "admin") {
          salesQuery = query(
            collection(db, "sales"),
            where("businessId", "==", userData.businessId)
          );
        } else {
          salesQuery = query(
            collection(db, "sales"),
            where("businessId", "==", userData.businessId),
            where("repId", "==", user.uid)
          );
        }

        unsubscribeSales = onSnapshot(
          salesQuery,
          (snapshot) => {
            if (cancelled) return;

            const salesList = snapshot.docs.map((item) => ({
              id: item.id,
              ...item.data(),
            }));

            salesList.sort((a, b) => {
              const dateA = a.createdAt?.toMillis?.() || 0;
              const dateB = b.createdAt?.toMillis?.() || 0;
              return dateB - dateA;
            });

            setSales(salesList);
            setMessage("");
            setLoading(false);
          },
          (error) => {
            console.error("Sales history error:", error);

            if (!cancelled) {
              setMessage("Could not load sales: " + error.message);
              setLoading(false);
            }
          }
        );
      } catch (error) {
        console.error("Sales history setup error:", error);

        if (!cancelled) {
          setMessage("Could not load your account: " + error.message);
          setLoading(false);
        }
      }
    });

    return () => {
      cancelled = true;
      unsubscribeAuth();

      if (unsubscribeSales) {
        unsubscribeSales();
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
          Sales History
        </h1>

        <p className="mb-8 text-[#6b776b]">
          Review recorded customer transactions.
        </p>

        <section className="overflow-x-auto rounded-2xl border border-[#e6e3d8] bg-white p-6">
          <h2 className="mb-4 text-xl font-bold">
            Recorded Sales ({sales.length})
          </h2>

          {message && (
            <p className="mb-4 break-words text-sm" role="status">
              {message}
            </p>
          )}

          {loading && <p>Loading sales history...</p>}

          {!loading && !message && sales.length === 0 && (
            <p>No sales recorded for your account yet.</p>
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
                    <td className="p-3">
                      {sale.customerName || "Walk-in"}
                    </td>

                    <td className="p-3">
                      {sale.repName || "Unknown"}
                    </td>

                    <td className="p-3 font-medium">
                      ₦{Number(sale.total || 0).toLocaleString("en-NG")}
                    </td>

                    <td className="p-3 capitalize">
                      {sale.paymentMethod || "—"}
                    </td>

                    <td className="p-3 capitalize">
                      {sale.status || "Unknown"}
                    </td>

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
      </div>
    </main>
  );
}
