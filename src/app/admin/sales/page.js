
"use client";

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../../lib/firebase";

export default function AdminSalesReport() {
  const [sales, setSales] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeSales = null;
    let cancelled = false;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (unsubscribeSales) {
        unsubscribeSales();
        unsubscribeSales = null;
      }

      if (!user) {
        setSales([]);
        setError("Please sign in to view sales reports.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (cancelled) return;

        if (!userSnap.exists()) {
          setError("Your user profile could not be found.");
          setSales([]);
          setLoading(false);
          return;
        }

        const userData = userSnap.data();

        if (userData.active !== true) {
          setError("Your account is not active.");
          setSales([]);
          setLoading(false);
          return;
        }

        if (userData.role !== "admin") {
          setError("Only an admin can view Sales Reports.");
          setSales([]);
          setLoading(false);
          return;
        }

        if (!userData.businessId) {
          setError("Your account has no business assigned.");
          setSales([]);
          setLoading(false);
          return;
        }

        const salesQuery = query(
          collection(db, "sales"),
          where("businessId", "==", userData.businessId)
        );

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
            setError("");
            setLoading(false);
          },
          (err) => {
            console.error("Sales report error:", err);
            setError(
              "Could not load sales. " + (err.message || "Check Firestore permissions.")
            );
            setLoading(false);
          }
        );
      } catch (err) {
        console.error("Sales report setup error:", err);

        if (!cancelled) {
          setError(
            "Could not load your business profile. " +
              (err.message || "Please try again.")
          );
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
          Review recorded sales and revenue from your business.
        </p>

        {error && (
          <p className="mt-4 rounded-lg bg-red-100 p-3 text-red-700">
            {error}
          </p>
        )}

        {loading && (
          <p className="mt-4">Loading sales reports...</p>
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

              {sales.length === 0 && !loading && !error && (
                <tr>
                  <td
                    colSpan={6}
                    className="p-5 text-center opacity-70"
                  >
                    No sales have been recorded for this business yet.
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
