
"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { auth, db } from "../../lib/firebase";

export default function ProductsPage() {
  const router = useRouter();

  const [products, setProducts] = useState([]);
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState("bag");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reorderLevel, setReorderLevel] = useState("10");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [businessId, setBusinessId] = useState("");
  const [role, setRole] = useState("");
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
      setBusinessId("");
      setRole("");
      setMessage("");

      if (!user) {
        setLoading(false);
        router.replace("/login");
        return;
      }

      setLoading(true);

      try {
        const userSnapshot = await getDoc(doc(db, "users", user.uid));

        if (cancelled) return;

        if (!userSnapshot.exists()) {
          setMessage("Your user profile could not be found.");
          setLoading(false);
          return;
        }

        const userData = userSnapshot.data();

        console.log("StockWise profile:", {
          businessId: userData.businessId,
          role: userData.role,
          active: userData.active,
        });

        if (userData.active !== true || !userData.businessId) {
          setMessage("Your account is inactive or has no business assigned.");
          setLoading(false);
          return;
        }

        if (!["admin", "storekeeper", "salesRep"].includes(userData.role)) {
          setMessage("Your account does not have access to products.");
          setLoading(false);
          return;
        }

        setBusinessId(userData.businessId);
        setRole(userData.role);

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

            setMessage("");
            setLoading(false);
          },
          (error) => {
            if (cancelled) return;

            console.error(
              "StockWise inventory error:",
              error.code,
              error.message
            );

            setMessage(
              "Inventory error (" +
                error.code +
                "): " +
                error.message
            );
            setLoading(false);
          }
        );
      } catch (error) {
        if (cancelled) return;

        console.error("StockWise profile error:", error.code, error.message);
        setMessage("Could not load profile: " + error.message);
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
  }, [router]);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    const user = auth.currentUser;

    if (!user || !businessId) {
      setMessage("Please sign in and wait for your business to load.");
      return;
    }

    if (!["admin", "storekeeper"].includes(role)) {
      setMessage("You do not have permission to add products.");
      return;
    }

    if (
      !name.trim() ||
      !sku.trim() ||
      !category.trim() ||
      !Number.isFinite(Number(price)) ||
      Number(price) <= 0 ||
      quantity === "" ||
      !Number.isInteger(Number(quantity)) ||
      Number(quantity) < 0 ||
      reorderLevel === "" ||
      !Number.isInteger(Number(reorderLevel)) ||
      Number(reorderLevel) < 0
    ) {
      setMessage("Please enter valid product details.");
      return;
    }

    setSaving(true);

    try {
      await addDoc(collection(db, "products"), {
        businessId,
        name: name.trim(),
        sku: sku.trim(),
        category: category.trim(),
        unit,
        sellingPrice: Number(price),
        quantity: Number(quantity),
        reorderLevel: Number(reorderLevel),
        supplierId: "",
        createdAt: serverTimestamp(),
      });

      setName("");
      setSku("");
      setCategory("");
      setUnit("bag");
      setPrice("");
      setQuantity("");
      setReorderLevel("10");
      setMessage("Product saved successfully.");
    } catch (error) {
      console.error("StockWise save error:", error.code, error.message);
      setMessage("Could not save product: " + error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f4ec] p-6 text-[#34483b] md:p-10">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-2 text-3xl font-bold">Products</h1>

        <p className="mb-8 text-[#6b776b]">
          View your building materials inventory and selling prices.
        </p>

        {message && (
          <p
            className="mb-5 break-words rounded-lg border p-3 text-sm"
            role="status"
          >
            {message}
          </p>
        )}

        {loading ? (
          <p>Loading inventory...</p>
        ) : (
          <>
            {(role === "admin" || role === "storekeeper") && (
              <form
                onSubmit={handleSubmit}
                className="mb-8 grid gap-4 rounded-2xl border border-[#e6e3d8] bg-white p-6 md:grid-cols-2"
              >
                <h2 className="text-xl font-bold md:col-span-2">
                  Add Product
                </h2>

                <input
                  className="rounded-lg border p-3"
                  placeholder="Product name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />

                <input
                  className="rounded-lg border p-3"
                  placeholder="SKU (unique product code)"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  required
                />

                <input
                  className="rounded-lg border p-3"
                  placeholder="Category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                />

                <select
                  className="rounded-lg border p-3"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                >
                  <option value="bag">Bag</option>
                  <option value="piece">Piece</option>
                  <option value="carton">Carton</option>
                  <option value="length">Length</option>
                </select>

                <input
                  className="rounded-lg border p-3"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Selling price (₦)"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />

                <input
                  className="rounded-lg border p-3"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Opening quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />

                <input
                  className="rounded-lg border p-3 md:col-span-2"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Low-stock alert level"
                  value={reorderLevel}
                  onChange={(e) => setReorderLevel(e.target.value)}
                  required
                />

                <button
                  type="submit"
                  disabled={saving || !businessId}
                  className="rounded-lg bg-[#526b53] p-3 font-semibold text-white disabled:opacity-50 md:col-span-2"
                >
                  {saving ? "Saving..." : "Add Product"}
                </button>
              </form>
            )}

            <section className="overflow-x-auto rounded-2xl border border-[#e6e3d8] bg-white p-6">
              <h2 className="mb-4 text-xl font-bold">
                Inventory ({products.length})
              </h2>

              {products.length === 0 ? (
                <p>No products found for your business.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="p-3">Product</th>
                      <th className="p-3">SKU</th>
                      <th className="p-3">Selling Price</th>
                      <th className="p-3">Quantity</th>
                    </tr>
                  </thead>

                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id} className="border-b">
                        <td className="p-3">{product.name}</td>
                        <td className="p-3">{product.sku}</td>
                        <td className="p-3">
                          ₦
                          {Number(product.sellingPrice || 0).toLocaleString(
                            "en-NG"
                          )}
                        </td>
                        <td className="p-3">
                          {product.quantity} {product.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
