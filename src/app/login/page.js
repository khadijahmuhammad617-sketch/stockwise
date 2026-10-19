"use client";

import { useState } from "react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { auth, db } from "../../lib/firebase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event) {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, "users", result.user.uid));

      if (!userDoc.exists() || userDoc.data().active !== true) {
        await signOut(auth);
        setMessage("Your account is inactive or not configured.");
        return;
      }

      router.push("/products");
    } catch (error) {
      console.error("StockWise login error:", error);
      setMessage("Error: " + error.code + " - " + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f4ec] p-6 text-[#34483b]">
      <form onSubmit={handleLogin} className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold">StockWise</h1>
        <p className="mb-8 mt-2 text-[#6b776b]">Sign in to manage inventory.</p>

        <label className="mb-2 block">Email</label>
        <input className="mb-5 w-full rounded-lg border p-3" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

        <label className="mb-2 block">Password</label>
        <input className="mb-5 w-full rounded-lg border p-3" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

        <button disabled={loading} className="w-full rounded-lg bg-[#526b53] p-3 font-semibold text-white">
          {loading ? "Signing in..." : "Sign In"}
        </button>

        {message && <p className="mt-4 text-sm text-red-600">{message}</p>}
      </form>
    </main>
  );
}
