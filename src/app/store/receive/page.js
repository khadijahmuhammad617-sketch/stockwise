
"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  runTransaction,
  doc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../../../lib/firebase";

export default function ReceiveStockPage() {
  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("New stock delivery");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "products"),
      (snapshot) => {
        setProducts(snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        })));
      },
      (error) => setMessage(error.message)
    );

    return () => unsubscribe();
  }, []);

  async function handleReceive(event) {
    event.preventDefault();
    setMessage("");

    const amount = Number(quantity);
    const selectedProduct = products.find(
      (product) => product.id === productId
    );

    if (!auth.currentUser) {
      setMessage("Please sign in first.");
      return;
    }

    if (!selectedProduct || !Number.isInteger(amount) || amount <= 0) {
      setMessage("Select a product and enter a positive whole quantity.");
      return;
    }

    setSaving(true);

    try {
      await runTransaction(db, async (transaction) => {
        const productRef = doc(db, "products", productId);
        const productSnap = await transaction.get(productRef);

        if (!productSnap.exists()) {
          throw new Error("Product no longer exists.");
        }

        const currentQuantity = Number(productSnap.data().quantity) || 0;

        transaction.update(productRef, {
          quantity: currentQuantity + amount,
        });
      });

      await addDoc(collection(db, "stockMovements"), {
        productId,
        productName: selectedProduct.name,
        type: "in",
        quantity: amount,
        reason: reason.trim() || "Stock received",
        reference: "",
        byId: auth.currentUser.uid,
        byName: auth.currentUser.email || "Staff",
        createdAt: serverTimestamp(),
      });

      setQuantity("");
      setMessage("Stock received successfully.");
    } catch (error) {
      setMessage("Could not receive stock: " + error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f4ec] p-6 text-[#34483b] md:p-10">
      <h1 className="mb-2 text-3xl font-bold">Receive Stock</h1>
      <p className="mb-8 text-[#6b776b]">
        Record incoming building materials.
      </p>

      <form
        onSubmit={handleReceive}
        className="max-w-xl space-y-5 rounded-2xl border border-[#e6e3d8] bg-white p-6"
      >
        <div>
          <label className="mb-2 block font-medium">Product</label>
          <select
            className="w-full rounded-lg border p-3"
            value={productId}
            onChange={(event) => setProductId(event.target.value)}
            required
          >
            <option value="">Choose a product</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} — Current stock: {product.quantity}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block font-medium">
            Quantity received
          </label>
          <input
            className="w-full rounded-lg border p-3"
            type="number"
            min="1"
            step="1"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            required
          />
        </div>

        <div>
          <label className="mb-2 block font-medium">Reason</label>
          <input
            className="w-full rounded-lg border p-3"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            required
          />
        </div>

        <button
          disabled={saving}
          className="w-full rounded-lg bg-[#526b53] p-3 font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Saving..." : "Receive Stock"}
        </button>

        {message && <p className="text-sm">{message}</p>}
      </form>
    </main>
  );
}
