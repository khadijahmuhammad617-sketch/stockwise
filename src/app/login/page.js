
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
      const result = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      const userDoc = await getDoc(
        doc(db, "users", result.user.uid)
      );

      if (!userDoc.exists()) {
        await signOut(auth);
        setMessage("Your user profile could not be found.");
        return;
      }

      const userData = userDoc.data();

      if (userData.active !== true) {
        await signOut(auth);
        setMessage(
          "Your account is waiting for approval or has been deactivated."
        );
        return;
      }

      if (!userData.businessId) {
        await signOut(auth);
        setMessage("Your account is not linked to a business.");
        return;
      }

      if (userData.role === "admin") {
        router.replace("/admin");
      } else if (userData.role === "storekeeper") {
        router.replace("/store");
      } else if (userData.role === "salesRep") {
        router.replace("/sales");
      } else {
        await signOut(auth);
        setMessage("Your account has an invalid role.");
      }
    } catch (error) {
      console.error("StockWise login error:", error);

      if (
        error.code === "auth/invalid-credential" ||
        error.code === "auth/wrong-password" ||
        error.code === "auth/user-not-found"
      ) {
        setMessage("Incorrect email or password. Please try again.");
      } else {
        setMessage(
          "Login failed: " +
            (error.message || "Please check your connection and try again.")
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f4ec] p-6 text-[#34483b]">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md rounded-2xl border border-[#e5ddce] bg-[#fffaf1] p-8 shadow-sm"
      >
        <h1 className="text-3xl font-bold">StockWise</h1>

        <p className="mb-8 mt-2 text-[#6b776b]">
          Sign in to your business dashboard.
        </p>

        <label className="mb-2 block">Email address</label>
        <input
          className="mb-5 w-full rounded-lg border border-[#e5ddce] bg-white p-3"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <label className="mb-2 block">Password</label>
        <input
          className="mb-5 w-full rounded-lg border border-[#e5ddce] bg-white p-3"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-[#526b53] p-3 font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>

        {message && (
          <p role="alert" className="mt-4 break-words text-sm text-red-600">
            {message}
          </p>
        )}

        <p className="mt-6 text-center text-sm">
          New to StockWise?{" "}
          <button
            type="button"
            onClick={() => router.push("/register")}
            className="font-semibold underline"
          >
            Create an account
          </button>
        </p>
      </form>
    </main>
  );
}
