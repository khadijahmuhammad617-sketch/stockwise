
"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  runTransaction,
  doc,
  getDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../../lib/firebase";

export default function ReceiveStockPage() {
  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("New stock delivery");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [businessId, setBusinessId] = useState("");

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
      setLoading(true);
      setMessage("");

      if (!user) {
        setMessage("Please sign in first.");
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
          setMessage("Only admins and storekeepers can receive stock.");
          setLoading(false);
          return;
        }

        if (!userData.businessId) {
          setMessage("Your account has no business assigned.");
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

            const productList = snapshot.docs.map((item) => ({
              id: item.id,
              ...item.data(),
            }));

            setProducts(productList);
            setLoading(false);
            setMessage("");

            setProductId((currentId) =>
              productList.some((product) => product.id === currentId)
                ? currentId
                : ""
            );
          },
          (error) => {
            console.error("Products loading error:", error);

            if (!cancelled) {
              setMessage("Could not load products: " + error.message);
              setLoading(false);
            }
          }
        );
      } catch (error) {
        console.error("Receive Stock setup error:", error);

        if (!cancelled) {
          setMessage("Could not load your account: " + error.message);
          setLoading(false);
        }
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

  async function handleReceive(event) {
    event.preventDefault();
    setMessage("");

    const amount = Number(quantity);
    const selectedProduct = products.find(
      (product) => product.id === productId
    );
    const user = auth.currentUser;

    if (!user) {
      setMessage("Please sign in first.");
      return;
    }

    if (!selectedProduct || !Number.isInteger(amount) || amount <= 0) {
      setMessage("Select a product and enter a positive whole quantity.");
      return;
    }

    if (!businessId) {
      setMessage("Your business could not be identified. Refresh and try again.");
      return;
    }

    setSaving(true);

    try {
      const productRef = doc(db, "products", productId);
      const movementRef = doc(collection(db, "stockMovements"));

      await runTransaction(db, async (transaction) => {
        const productSnap = await transaction.get(productRef);

        if (!productSnap.exists()) {
          throw new Error("Product no longer exists.");
        }

        const productData = productSnap.data();

        if (productData.businessId !== businessId) {
          throw new Error("This product does not belong to your business.");
        }

        const currentQuantity = Number(productData.quantity) || 0;

        transaction.update(productRef, {
          quantity: currentQuantity + amount,
        });

        transaction.set(movementRef, {
          businessId,
          productId,
          productName: productData.name || selectedProduct.name || "Product",
          type: "in",
          quantity: amount,
          reason: reason.trim() || "Stock received",
          reference: "",
          byId: user.uid,
          byName: user.email || "Staff",
          createdAt: serverTimestamp(),
        });
      });

      setQuantity("");
      setReason("New stock delivery");
      setMessage("Stock received successfully. The stock movement was recorded.");
    } catch (error) {
      console.error("Receive Stock error:", error);
      setMessage("Could not receive stock: " + error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f4ec] p-6 text-[#34483b] md:p-10">
      <div className="mx-auto max-w-xl">
        <a href="/" className="text-sm text-orange-700 underline">
          Back to Dashboard
        </a>

        <h1 className="mb-2 mt-5 text-3xl font-bold">Receive Stock</h1>

        <p className="mb-8 text-[#6b776b]">
          Record incoming building materials.
        </p>

        <form
          onSubmit={handleReceive}
          className="space-y-5 rounded-2xl border border-[#e6e3d8] bg-white p-6"
        >
          <div>
            <label className="mb-2 block font-medium">Product</label>

            <select
              className="w-full rounded-lg border p-3"
              value={productId}
              onChange={(event) => setProductId(event.target.value)}
              required
              disabled={loading || products.length === 0}
            >
              <option value="">
                {loading
                  ? "Loading products..."
                  : products.length === 0
                    ? "No products available"
                    : "Choose a product"}
              </option>

              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} — Current stock: {product.quantity ?? 0}
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
            type="submit"
            disabled={saving || loading || products.length === 0}
            className="w-full rounded-lg bg-[#526b53] p-3 font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Saving..." : "Receive Stock"}
          </button>

          {message && (
            <p className="break-words text-sm" role="status">
              {message}
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
