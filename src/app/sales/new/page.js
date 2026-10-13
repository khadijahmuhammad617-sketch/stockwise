
"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../../../lib/firebase";

export default function NewSalePage() {
  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
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

  const selectedProduct = products.find(
    (product) => product.id === productId
  );
  const amount = Number(quantity);
  const total = selectedProduct
    ? Number(selectedProduct.sellingPrice) * amount
    : 0;

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    if (!auth.currentUser) {
      setMessage("Please sign in first.");
      return;
    }

    if (
      !selectedProduct ||
      !Number.isInteger(amount) ||
      amount <= 0 ||
      !customerName.trim()
    ) {
      setMessage("Choose a product, enter a valid quantity, and enter the customer name.");
      return;
    }

    setSaving(true);

    try {
      const saleRef = doc(collection(db, "sales"));
      const movementRef = doc(collection(db, "stockMovements"));
      const productRef = doc(db, "products", productId);

      await runTransaction(db, async (transaction) => {
        const productSnap = await transaction.get(productRef);

        if (!productSnap.exists()) {
          throw new Error("Product not found.");
        }

        const product = productSnap.data();
        const currentQuantity = Number(product.quantity) || 0;

        if (currentQuantity < amount) {
          throw new Error("Not enough stock available.");
        }

        const saleTotal = Number(product.sellingPrice) * amount;

        transaction.update(productRef, {
          quantity: currentQuantity - amount,
        });

        transaction.set(saleRef, {
          repId: auth.currentUser.uid,
          repName: auth.currentUser.email || "Sales staff",
          customerName: customerName.trim(),
          customerPhone: "",
          items: [{
            productId,
            name: product.name,
            qty: amount,
            unitPrice: Number(product.sellingPrice),
          }],
          total: saleTotal,
          paymentMethod,
          status: "completed",
          voidReason: "",
          createdAt: serverTimestamp(),
        });

        transaction.set(movementRef, {
          productId,
          productName: product.name,
          type: "sale",
          quantity: amount,
          reason: "Customer sale",
          reference: saleRef.id,
          byId: auth.currentUser.uid,
          byName: auth.currentUser.email || "Sales staff",
          createdAt: serverTimestamp(),
        });
      });

      setQuantity("1");
      setCustomerName("");
      setMessage("Sale recorded successfully. Stock has been reduced.");
    } catch (error) {
      setMessage("Could not record sale: " + error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f4ec] p-6 text-[#34483b] md:p-10">
      <h1 className="mb-2 text-3xl font-bold">Record a Sale</h1>
      <p className="mb-8 text-[#6b776b]">
        Record a customer purchase and update inventory.
      </p>

      <form
        onSubmit={handleSubmit}
        className="max-w-xl space-y-5 rounded-2xl border border-[#e6e3d8] bg-white p-6"
      >
        <div>
          <label className="mb-2 block font-medium">Customer name</label>
          <input
            className="w-full rounded-lg border p-3"
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            required
          />
        </div>

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
                {product.name} — {product.quantity} available
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block font-medium">Quantity sold</label>
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
          <label className="mb-2 block font-medium">Payment method</label>
          <select
            className="w-full rounded-lg border p-3"
            value={paymentMethod}
            onChange={(event) => setPaymentMethod(event.target.value)}
          >
            <option value="cash">Cash</option>
            <option value="transfer">Bank transfer</option>
            <option value="pos">POS</option>
          </select>
        </div>

        <div className="rounded-lg bg-[#f7f4ec] p-4">
          <p className="text-sm">Sale total</p>
          <p className="text-2xl font-bold">
            ₦{total >= 0 ? total.toLocaleString("en-NG") : "0"}
          </p>
        </div>

        <button
          disabled={saving}
          className="w-full rounded-lg bg-[#526b53] p-3 font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Recording..." : "Complete Sale"}
        </button>

        {message && <p className="text-sm">{message}</p>}
      </form>
    </main>
  );
}
