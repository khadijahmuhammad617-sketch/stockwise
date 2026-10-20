"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
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
  const [businessId, setBusinessId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProducts = null;
    let cancelled = false;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (unsubscribeProducts) {
        unsubscribeProducts();
        unsubscribeProducts = null;
      }

      setProducts([]);
      setProductId("");
      setBusinessId("");

      if (!user) {
        setLoading(false);
        setMessage("Please sign in first.");
        return;
      }

      setLoading(true);

      try {
        const userSnapshot = await getDoc(
          doc(db, "users", user.uid)
        );

        if (cancelled) return;

        if (!userSnapshot.exists()) {
          setMessage("Your user profile could not be found.");
          setLoading(false);
          return;
        }

        const userData = userSnapshot.data();

        if (userData.active !== true || !userData.businessId) {
          setMessage("Your account is inactive or has no business assigned.");
          setLoading(false);
          return;
        }

        if (!["admin", "salesRep"].includes(userData.role)) {
          setMessage("Your account does not have permission to record sales.");
          setLoading(false);
          return;
        }

        setBusinessId(userData.businessId);

        const productsQuery = query(
          collection(db, "products"),
          where("businessId", "==", userData.businessId)
        );

        unsubscribeProducts = onSnapshot(
          productsQuery,
          (snapshot) => {
            if (cancelled) return;

            setProducts(
              snapshot.docs.map((item) => ({
                id: item.id,
                ...item.data(),
              }))
            );
            setLoading(false);
            setMessage("");
          },
          (error) => {
            if (cancelled) return;
            console.error("Could not load sale products:", error);
            setMessage("Could not load products: " + error.message);
            setLoading(false);
          }
        );
      } catch (error) {
        if (cancelled) return;
        console.error("Could not prepare sale page:", error);
        setMessage("Could not load sale page: " + error.message);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      unsubscribeAuth();

      if (unsubscribeProducts) {
        unsubscribeProducts();
      }
    };
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

    const user = auth.currentUser;

    if (!user) {
      setMessage("Please sign in again.");
      return;
    }

    if (!businessId) {
      setMessage("Your business is still loading. Try again.");
      return;
    }

    if (
      !selectedProduct ||
      selectedProduct.businessId !== businessId ||
      !Number.isInteger(amount) ||
      amount <= 0 ||
      !customerName.trim()
    ) {
      setMessage(
        "Choose a product, enter a valid quantity, and enter the customer name."
      );
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

        if (product.businessId !== businessId) {
          throw new Error("This product does not belong to your business.");
        }

        const currentQuantity = Number(product.quantity) || 0;

        if (currentQuantity < amount) {
          throw new Error("Not enough stock available.");
        }

        const salePrice = Number(product.sellingPrice);

        if (!Number.isFinite(salePrice) || salePrice <= 0) {
          throw new Error("This product has an invalid selling price.");
        }

        const saleTotal = salePrice * amount;

        transaction.update(productRef, {
          quantity: currentQuantity - amount,
        });

        transaction.set(saleRef, {
          businessId,
          repId: user.uid,
          repName: user.email || "Sales staff",
          customerName: customerName.trim(),
          customerPhone: "",
          items: [
            {
              productId,
              name: product.name,
              qty: amount,
              unitPrice: salePrice,
            },
          ],
          total: saleTotal,
          paymentMethod,
          status: "completed",
          voidReason: "",
          createdAt: serverTimestamp(),
        });

        transaction.set(movementRef, {
          businessId,
          productId,
          productName: product.name,
          type: "sale",
          quantity: amount,
          reason: "Customer sale",
          reference: saleRef.id,
          byId: user.uid,
          byName: user.email || "Sales staff",
          createdAt: serverTimestamp(),
        });
      });

      setQuantity("1");
      setCustomerName("");
      setProductId("");
      setMessage("Sale recorded successfully. Stock has been reduced.");
    } catch (error) {
      console.error("Could not record sale:", error);
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
            disabled={loading}
          >
            <option value="">
              {loading ? "Loading products..." : "Choose a product"}
            </option>
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
          type="submit"
          disabled={saving || loading || !businessId || products.length === 0}
          className="w-full rounded-lg bg-[#526b53] p-3 font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Recording..." : "Complete Sale"}
        </button>

        {message && (
          <p className="break-words text-sm" role="status">
            {message}
          </p>
        )}
      </form>
    </main>
  );
}