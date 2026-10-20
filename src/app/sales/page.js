"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { auth, db } from "../../lib/firebase";

export default function SalesRepDashboard() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("Loading...");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));

        if (!userDoc.exists()) {
          await signOut(auth);
          router.replace("/login");
          return;
        }

        const userData = userDoc.data();

        if (userData.active !== true || !userData.businessId) {
          await signOut(auth);
          router.replace("/login");
          return;
        }

        if (userData.role !== "salesRep") {
          if (userData.role === "admin") {
            router.replace("/admin");
          } else if (userData.role === "storekeeper") {
            router.replace("/store");
          } else {
            router.replace("/login");
          }
          return;
        }

        const businessDoc = await getDoc(
          doc(db, "businesses", userData.businessId)
        );

        if (businessDoc.exists()) {
          setBusinessName(businessDoc.data().name || "Your Business");
        } else {
          setBusinessName("Your Business");
        }

        setLoading(false);
      } catch (err) {
        console.error(err);
        setError("Could not load your dashboard. Please refresh the page.");
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  async function handleLogout() {
    await signOut(auth);
    router.replace("/login");
  }

  if (loading) {
    return <main className="p-8">Loading your dashboard...</main>;
  }

  if (error) {
    return <main className="p-8 text-red-600">{error}</main>;
  }

  return (
    <main className="min-h-screen bg-[#f7f3e8] p-6 text-[#34483b] md:p-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Sales Rep Dashboard</h1>
            <p className="mt-2 text-[#647568]">{businessName}</p>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-lg border border-[#cbd5c5] px-4 py-2 hover:bg-white"
          >
            Log Out
          </button>
        </div>

        <p className="mt-6">
          Record customer sales and review your sales history.
        </p>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <a
            href="/sales/new"
            className="rounded-xl border border-[#d9dfd2] bg-white p-6 shadow-sm transition hover:shadow-md"
          >
            <h2 className="text-xl font-semibold">Record a Sale</h2>
            <p className="mt-2 text-sm text-[#647568]">
              Record a customer purchase and update stock.
            </p>
          </a>

          <a
            href="/sales/history"
            className="rounded-xl border border-[#d9dfd2] bg-white p-6 shadow-sm transition hover:shadow-md"
          >
            <h2 className="text-xl font-semibold">Sales History</h2>
            <p className="mt-2 text-sm text-[#647568]">
              Review your recorded sales.
            </p>
          </a>

          <a
            href="/products"
            className="rounded-xl border border-[#d9dfd2] bg-white p-6 shadow-sm transition hover:shadow-md"
          >
            <h2 className="text-xl font-semibold">Products</h2>
            <p className="mt-2 text-sm text-[#647568]">
              View available products and their selling prices.
            </p>
          </a>
        </div>
      </div>
    </main>
  );
}
