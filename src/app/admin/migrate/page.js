
"use client";

import { useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "../../../lib/firebase";

export default function MigrateBusinessData() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function migrateData() {
    setLoading(true);
    setMessage("");

    try {
      const currentUser = auth.currentUser;

      if (!currentUser) {
        throw new Error("Please sign in with your admin account first.");
      }

      const userRef = doc(db, "users", currentUser.uid);
      const userSnapshot = await getDoc(userRef);

      if (!userSnapshot.exists()) {
        throw new Error("Your user profile was not found.");
      }

      const profile = userSnapshot.data();

      if (
        profile.role !== "admin" ||
        profile.active !== true ||
        profile.businessId !== "stockwise-main"
      ) {
        throw new Error(
          "Only the active admin connected to stockwise-main can run this migration."
        );
      }

      const collectionsToMigrate = [
        "products",
        "sales",
        "stockMovements",
        "suppliers",
        "productCosts",
        "users",
      ];

      let updated = 0;
      let skipped = 0;

      for (const collectionName of collectionsToMigrate) {
        const snapshot = await getDocs(
          collection(db, collectionName)
        );

        for (const item of snapshot.docs) {
          if (item.data().businessId === "stockwise-main") {
            skipped++;
            continue;
          }

          if (item.data().businessId) {
            throw new Error(
              `Document ${collectionName}/${item.id} already belongs to a different business. Migration stopped to protect its data.`
            );
          }

          await updateDoc(
            doc(db, collectionName, item.id),
            { businessId: "stockwise-main" }
          );

          updated++;
        }
      }

      setMessage(
        `Migration complete. Updated ${updated} records and skipped ${skipped} records already linked to this business.`
      );
    } catch (error) {
      console.error("Business migration error:", error);
      setMessage(
        "Migration stopped: " + (error.message || "Unknown error")
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background p-6 text-foreground">
      <div className="mx-auto max-w-2xl rounded-xl border border-(--border) bg-(--card) p-6">
        <h1 className="text-2xl font-bold">
          StockWise Business Data Setup
        </h1>

        <p className="mt-3 opacity-80">
          This one-time operation links existing StockWise records to
          your current business. It does not delete records or change
          their existing values.
        </p>

        <p className="mt-3 text-sm opacity-70">
          Business ID: stockwise-main
        </p>

        <button
          onClick={migrateData}
          disabled={loading}
          className="mt-6 rounded-lg bg-green-800 px-5 py-3 font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Migrating data..." : "Migrate Existing Data"}
        </button>

        {message && (
          <p className="mt-5 break-words rounded-lg border border-(--border) p-4">
            {message}
          </p>
        )}
      </div>
    </main>
  );
}
