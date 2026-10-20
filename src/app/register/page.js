"use client";

import { useState } from "react";
import Link from "next/link";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  signOut,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../../lib/firebase";

export default function RegisterPage() {
  const [accountType, setAccountType] = useState("owner");
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(event) {
    event.preventDefault();

    setError("");
    setMessage("");
    setLoading(true);

    let newUser = null;
    let profileCreated = false;
    let joinRequestCreated = false;
    let newBusinessRef = null;
    let step = "validating registration";

    try {
      const cleanName = name.trim();
      const cleanEmail = email.trim();
      const cleanBusinessId = businessId.trim();
      const cleanBusinessName = businessName.trim();

      if (!cleanName) {
        throw new Error("Please enter your full name.");
      }

      if (password.length < 6) {
        throw new Error("Your password must contain at least 6 characters.");
      }

      if (accountType === "owner" && !cleanBusinessName) {
        throw new Error("Please enter your business name.");
      }

      if (accountType !== "owner" && !cleanBusinessId) {
        throw new Error("Please enter your Business ID.");
      }

      step = "creating authentication account";

      const credential = await createUserWithEmailAndPassword(
        auth,
        cleanEmail,
        password
      );

      newUser = credential.user;

      if (accountType === "owner") {
        step = "creating business";

        newBusinessRef = doc(collection(db, "businesses"));

        await setDoc(newBusinessRef, {
          name: cleanBusinessName,
          ownerId: newUser.uid,
          createdAt: serverTimestamp(),
        });

        step = "creating administrator profile";

        await setDoc(doc(db, "users", newUser.uid), {
          name: cleanName,
          email: cleanEmail,
          role: "admin",
          active: true,
          businessId: newBusinessRef.id,
          createdAt: serverTimestamp(),
        });

        profileCreated = true;

        window.location.href = "/admin";
        return;
      }

      // Authenticate first, then check the Business ID.
      // This allows Firestore rules to recognize the signed-in user.
      step = "checking business";

      const businessRef = doc(db, "businesses", cleanBusinessId);
      const businessSnapshot = await getDoc(businessRef);

      if (!businessSnapshot.exists()) {
        throw new Error(
          "Business ID not found. Check the ID with your administrator."
        );
      }

      step = "creating pending staff profile";

      await setDoc(doc(db, "users", newUser.uid), {
        name: cleanName,
        email: cleanEmail,
        role: "pending",
        active: false,
        businessId: cleanBusinessId,
        requestedRole: accountType,
        createdAt: serverTimestamp(),
      });

      profileCreated = true;

      step = "creating staff join request";

      await setDoc(doc(db, "joinRequests", newUser.uid), {
        userId: newUser.uid,
        name: cleanName,
        email: cleanEmail,
        requestedRole: accountType,
        businessId: cleanBusinessId,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      joinRequestCreated = true;

      step = "signing out new staff account";

      await signOut(auth);
      newUser = null;

      setMessage(
        "Your request has been submitted. Your business administrator must approve your account before you can sign in."
      );

      setName("");
      setBusinessId("");
      setEmail("");
      setPassword("");
    } catch (err) {
      console.error("Registration failed during:", step);
      console.error("Firebase error code:", err.code);
      console.error("Firebase error message:", err.message);

      // Clean up only the account created by this attempt.
      // Do not delete an account if its Firestore profile was created.
      if (newUser && !profileCreated) {
        try {
          await deleteUser(newUser);
          newUser = null;

          // Remove an owner business created by this failed attempt.
          // Current rules prohibit business deletion, so this may be denied.
          if (newBusinessRef) {
            try {
              await deleteDoc(newBusinessRef);
            } catch (cleanupError) {
              console.error(
                "Business cleanup failed:",
                cleanupError.code,
                cleanupError.message
              );
            }
          }
        } catch (cleanupError) {
          console.error(
            "Account cleanup failed:",
            cleanupError.code,
            cleanupError.message
          );
        }
      } else if (newUser) {
        try {
          await signOut(auth);
        } catch (signOutError) {
          console.error("Sign-out error:", signOutError);
        }
      }

      if (err.code === "auth/email-already-in-use") {
        setError(
          "This email already has a Firebase account. Use an unused email for registration. Previous incomplete accounts may need administrator cleanup."
        );
      } else if (err.code === "auth/weak-password") {
        setError("Your password must contain at least 6 characters.");
      } else if (err.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (err.code === "permission-denied") {
        if (profileCreated && !joinRequestCreated) {
          setError(
            "Your account profile was created, but the join request could not be saved. Ask your administrator to check Firestore permissions before trying again."
          );
        } else {
          setError(
            "Firestore denied the operation at: " +
              step +
              ". Check the browser console for the exact error."
          );
        }
      } else {
        setError(err.message || "Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f3e8] px-4 py-10 text-[#34483b]">
      <div className="mx-auto max-w-lg rounded-2xl border border-[#d9dfd2] bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-3xl font-bold">
          Create your StockWise account
        </h1>

        <p className="mt-2 text-[#647568]">
          Manage your business inventory and sales with StockWise.
        </p>

        <div className="mt-6">
          <label
            htmlFor="accountType"
            className="mb-2 block font-semibold"
          >
            What would you like to do?
          </label>

          <select
            id="accountType"
            value={accountType}
            onChange={(event) => setAccountType(event.target.value)}
            className="w-full rounded-lg border border-[#cbd5c5] bg-white p-3"
          >
            <option value="owner">Create a new business account</option>
            <option value="storekeeper">Join as a storekeeper</option>
            <option value="salesRep">Join as a sales representative</option>
          </select>
        </div>

        <form onSubmit={handleRegister} className="mt-6 space-y-4">
          <div>
            <label htmlFor="name" className="mb-2 block font-semibold">
              Full name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              autoComplete="name"
              className="w-full rounded-lg border border-[#cbd5c5] p-3"
              placeholder="Enter your full name"
            />
          </div>

          {accountType === "owner" ? (
            <div>
              <label
                htmlFor="businessName"
                className="mb-2 block font-semibold"
              >
                Business name
              </label>
              <input
                id="businessName"
                type="text"
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
                required
                className="w-full rounded-lg border border-[#cbd5c5] p-3"
                placeholder="Enter your business name"
              />
            </div>
          ) : (
            <div>
              <label
                htmlFor="businessId"
                className="mb-2 block font-semibold"
              >
                Business ID
              </label>
              <input
                id="businessId"
                type="text"
                value={businessId}
                onChange={(event) => setBusinessId(event.target.value)}
                required
                className="w-full rounded-lg border border-[#cbd5c5] p-3"
                placeholder="Ask your administrator for this ID"
              />
              <p className="mt-1 text-sm text-[#647568]">
                Your administrator must approve your request before you can
                use StockWise.
              </p>
            </div>
          )}

          <div>
            <label htmlFor="email" className="mb-2 block font-semibold">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-lg border border-[#cbd5c5] p-3"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block font-semibold">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full rounded-lg border border-[#cbd5c5] p-3"
              placeholder="At least 6 characters"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-100 p-3 text-red-700"
            >
              {error}
            </p>
          )}

          {message && (
            <p
              role="status"
              className="rounded-lg bg-[#e5efdf] p-3 text-[#34483b]"
            >
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#e9b66b] p-3 font-bold hover:bg-[#dfaa5d] disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-[#647568]">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-bold text-[#34483b] underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
