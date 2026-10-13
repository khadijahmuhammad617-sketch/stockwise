
"use client";

import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "../../lib/firebase";

export default function ProductsPage() {
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

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "products"),
      (snapshot) => {
        setProducts(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }))
        );
      },
      (error) => setMessage(error.message)
    );

    return () => unsubscribe();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    if (!auth.currentUser) {
      setMessage("Please sign in first.");
      return;
    }

    if (
      !name.trim() ||
      !sku.trim() ||
      !category.trim() ||
      Number(price) <= 0 ||
      Number(quantity) < 0 ||
      Number(reorderLevel) < 0
    ) {
      setMessage("Please enter valid product details.");
      return;
    }

    setSaving(true);

    try {
      await addDoc(collection(db, "products"), {
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
      setPrice("");
      setQuantity("");
      setReorderLevel("10");
      setMessage("Product saved successfully.");
    } catch (error) {
      setMessage("Could not save product: " + error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f4ec] p-6 text-[#34483b] md:p-10">
      <h1 className="mb-2 text-3xl font-bold">Products</h1>
      <p className="mb-8 text-[#6b776b]">
        Add and view your building materials inventory.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mb-8 grid gap-4 rounded-2xl border border-[#e6e3d8] bg-white p-6 md:grid-cols-2"
      >
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
          disabled={saving}
          className="rounded-lg bg-[#526b53] p-3 font-semibold text-white disabled:opacity-50 md:col-span-2"
        >
          {saving ? "Saving..." : "Add Product"}
        </button>

        {message && (
          <p className="text-sm md:col-span-2">{message}</p>
        )}
      </form>

      <section className="overflow-x-auto rounded-2xl border border-[#e6e3d8] bg-white p-6">
        <h2 className="mb-4 text-xl font-bold">
          Inventory ({products.length})
        </h2>

        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-3">Product</th>
              <th className="p-3">SKU</th>
              <th className="p-3">Price</th>
              <th className="p-3">Quantity</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-b">
                <td className="p-3">{product.name}</td>
                <td className="p-3">{product.sku}</td>
                <td className="p-3">
                  ₦{Number(product.sellingPrice).toLocaleString()}
                </td>
                <td className="p-3">
                  {product.quantity} {product.unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
