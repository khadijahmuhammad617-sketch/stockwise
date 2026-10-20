"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { auth, db } from "../lib/firebase";
import { useTheme } from "./ThemeProvider";

export default function Navigation() {
  const [role, setRole] = useState("");
  const [userName, setUserName] = useState("");
  const [ready, setReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setRole("");
        setUserName("");
        setReady(true);
        return;
      }

      try {
        const userSnapshot = await getDoc(doc(db, "users", user.uid));

        if (
          userSnapshot.exists() &&
          userSnapshot.data().active === true
        ) {
          setRole(userSnapshot.data().role || "");
          setUserName(userSnapshot.data().name || user.email || "");
        } else {
          setRole("");
          setUserName("");
        }
      } catch (error) {
        console.error("Could not load user role:", error);
        setRole("");
        setUserName("");
      }

      setReady(true);
    });

    return () => unsubscribe();
  }, []);

  async function handleSignOut() {
    try {
      await signOut(auth);
      router.replace("/login");
    } catch (error) {
      console.error("Sign-out failed:", error);
      alert("Could not sign out. Please try again.");
    }
  }

  if (!ready || !role) {
    return null;
  }

  let links = [];

  if (role === "admin") {
    links = [
      { label: "Dashboard", href: "/" },
      { label: "Products", href: "/products" },
      { label: "Record Sale", href: "/sales/new" },
      { label: "Sales Reports", href: "/admin/sales" },
      { label: "Receive Stock", href: "/store/receive" },
      { label: "Stock Movements", href: "/store/movements" },
      { label: "Sales History", href: "/sales/history" },
    ];
  } else if (role === "storekeeper") {
    links = [
      { label: "Receive Stock", href: "/store/receive" },
      { label: "Stock Movements", href: "/store/movements" },
    ];
  } else if (role === "salesRep") {
    links = [
      { label: "Record Sale", href: "/sales/new" },
      { label: "Sales History", href: "/sales/history" },
    ];
  }

  if (links.length === 0) {
    return null;
  }

  return (
    <nav className="border-b border-[var(--border)] bg-[var(--card)] px-5 py-4 text-[var(--foreground)]">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
        <Link href="/" className="text-2xl font-bold">
          Stock<span className="text-[#d97736]">Wise</span>
        </Link>

        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="rounded-lg border border-[var(--border)] px-3 py-2 md:hidden"
        >
          {menuOpen ? "Close Menu" : "Open Menu"}
        </button>

        <div
          className={`${
            menuOpen ? "flex" : "hidden"
          } w-full flex-col gap-3 md:flex md:w-auto md:flex-row md:items-center`}
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-[var(--sage)]"
            >
              {link.label}
            </Link>
          ))}

          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium hover:opacity-80"
          >
            {theme === "light" ? "Dark Mode" : "Light Mode"}
          </button>

          <div className="text-sm opacity-70">{userName}</div>

          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-lg bg-[#526b53] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
}