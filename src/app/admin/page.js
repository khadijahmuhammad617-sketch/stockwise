
"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { db, auth } from "../../lib/firebase";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [businessName, setBusinessName] = useState("");
  const [staff, setStaff] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [copyMessage, setCopyMessage] = useState("");
  const [processing, setProcessing] = useState("");

  useEffect(() => {
    let unsubscribeStaff = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (unsubscribeStaff) {
        unsubscribeStaff();
        unsubscribeStaff = null;
      }

      setUser(null);
      setStaff([]);
      setError("");
      setLoading(true);

      if (!currentUser) {
        setLoading(false);
        router.replace("/login");
        return;
      }

      try {
        const userSnapshot = await getDoc(
          doc(db, "users", currentUser.uid)
        );

        if (!userSnapshot.exists()) {
          setError("Your user profile could not be found.");
          setLoading(false);
          return;
        }

        const userData = userSnapshot.data();

        if (
          userData.role !== "admin" ||
          userData.active !== true ||
          !userData.businessId
        ) {
          setError("You do not have administrator access.");
          setLoading(false);
          return;
        }

        setUser({ ...userData, uid: currentUser.uid });

        const businessSnapshot = await getDoc(
          doc(db, "businesses", userData.businessId)
        );

        setBusinessName(
          businessSnapshot.exists()
            ? businessSnapshot.data().name || "Your Business"
            : "Business details unavailable"
        );

        const staffQuery = query(
          collection(db, "users"),
          where("businessId", "==", userData.businessId),
          where("role", "==", "pending"),
          where("active", "==", false)
        );

        unsubscribeStaff = onSnapshot(
          staffQuery,
          (snapshot) => {
            setStaff(
              snapshot.docs.map((item) => ({
                id: item.id,
                ...item.data(),
              }))
            );
          },
          (err) => {
            console.error("Staff loading error:", err);
            setError(
              "Staff requests could not load. Check Firestore permissions."
            );
          }
        );
      } catch (err) {
        console.error("Dashboard loading error:", err);
        setError("Could not load your dashboard. Please try again.");
      }

      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeStaff) unsubscribeStaff();
    };
  }, [router]);

  async function handleApprove(member, role) {
    setProcessing(member.id);

    try {
      await updateDoc(doc(db, "users", member.id), {
        role,
        active: true,
      });

      alert("Staff member approved successfully!");
    } catch (err) {
      console.error("Approval error:", err);
      alert(
        "Approval failed. Check Firestore permissions. " + err.message
      );
    } finally {
      setProcessing("");
    }
  }

  async function handleReject(member) {
    const confirmed = window.confirm(
      "Reject this staff request? Their user profile will be deleted."
    );

    if (!confirmed) return;

    setProcessing(member.id);

    try {
      await deleteDoc(doc(db, "users", member.id));
      alert("Staff request rejected.");
    } catch (err) {
      console.error("Rejection error:", err);
      alert(
        "Rejection failed. Check Firestore permissions. " + err.message
      );
    } finally {
      setProcessing("");
    }
  }

  async function handleCopyBusinessId() {
    if (!user?.businessId) return;

    try {
      await navigator.clipboard.writeText(user.businessId);
      setCopyMessage("Business ID copied!");
    } catch (err) {
      console.error(err);
      setCopyMessage("Copy failed. Copy the ID manually.");
    }
  }

  async function handleShareBusinessId() {
    if (!user?.businessId) return;

    const message =
      "Join my business on StockWise!\nBusiness: " +
      businessName +
      "\nBusiness ID: " +
      user.businessId;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Join my business on StockWise",
          text: message,
        });
      } else {
        await navigator.clipboard.writeText(message);
        setCopyMessage("Invitation details copied.");
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error(err);
        setCopyMessage("Sharing failed. Copy the Business ID manually.");
      }
    }
  }

  async function handleLogout() {
    await signOut(auth);
    router.replace("/login");
  }

  if (loading) {
    return <main className="min-h-screen p-8">Loading dashboard...</main>;
  }

  if (!user) {
    return (
      <main className="min-h-screen p-8">
        {error || "Loading your account..."}
      </main>
    );
  }

  const navigationItems = [
    {
      title: "Products",
      description: "Manage and view business products.",
      path: "/products",
    },
    {
      title: "Inventory Overview",
      description: "View stock quantities and low-stock alerts.",
      path: "/",
    },
    {
      title: "Receive Stock",
      description: "Record new stock arriving at the warehouse.",
      path: "/store/receive",
    },
    {
      title: "Stock Movements",
      description: "Review recorded stock movements.",
      path: "/store/movements",
    },
    {
      title: "Record a Sale",
      description: "Record a customer purchase.",
      path: "/sales/new",
    },
    {
      title: "Sales History",
      description: "Review recorded sales.",
      path: "/sales/history",
    },
    {
      title: "Sales Reports",
      description: "View sales and revenue reports.",
      path: "/admin/sales",
    },
  ];

  return (
    <main className="min-h-screen bg-[#f7f3e8] p-6 text-[#34483b] md:p-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">StockWise Admin Dashboard</h1>
            <p className="mt-2 text-[#647568]">
              Manage your business, inventory, sales, and staff.
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-lg border border-[#cbd5c5] px-4 py-2 hover:bg-white"
          >
            Log Out
          </button>
        </header>

        <section className="mt-8 rounded-xl border border-[#d9dfd2] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Business Details</h2>

          <p className="mt-4 text-sm text-[#647568]">Business Name</p>
          <p className="text-lg font-semibold">{businessName}</p>

          <p className="mt-4 text-sm text-[#647568]">Your Business ID</p>
          <p className="mt-1 break-all rounded-lg bg-[#f7f3e8] p-3 font-mono">
            {user.businessId}
          </p>

          <p className="mt-3 text-sm text-[#647568]">
            Share this ID with employees so they can request to join.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={handleCopyBusinessId}
              className="rounded-lg bg-[#dce7d5] px-4 py-2 font-semibold"
            >
              Copy Business ID
            </button>

            <button
              onClick={handleShareBusinessId}
              className="rounded-lg bg-[#e9b66b] px-4 py-2 font-semibold"
            >
              Share with Employees
            </button>
          </div>

          {copyMessage && (
            <p className="mt-3 text-sm" aria-live="polite">
              {copyMessage}
            </p>
          )}
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-[#d9dfd2] bg-white p-5">
            <p className="text-[#647568]">Pending Staff Requests</p>
            <p className="mt-2 text-3xl font-bold">{staff.length}</p>
          </div>

          <button
            onClick={() => router.push("/admin/sales")}
            className="rounded-xl border border-[#d9dfd2] bg-white p-5 text-left hover:shadow-sm"
          >
            <p className="text-xl font-bold">Sales Reports</p>
            <p className="mt-2 text-[#647568]">
              Review business sales and revenue.
            </p>
          </button>
        </section>

        <section className="mt-8">
          <h2 className="text-2xl font-bold">Quick Navigation</h2>
          <p className="mt-2 text-[#647568]">
            Choose a section to manage your business.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {navigationItems.map((item) => (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className="rounded-xl border border-[#d9dfd2] bg-white p-5 text-left transition hover:shadow-md"
              >
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-[#647568]">
                  {item.description}
                </p>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-xl border border-[#d9dfd2] bg-white p-6">
          <h2 className="text-xl font-bold">Staff Approval Requests</h2>
          <p className="mt-2 text-sm text-[#647568]">
            Approve employees and assign their roles.
          </p>

          {error && (
            <p className="mt-4 rounded-lg bg-red-100 p-3 text-red-700">
              {error}
            </p>
          )}

          {staff.length === 0 && !error && (
            <p className="mt-4">No pending requests found.</p>
          )}

          {staff.map((member) => (
            <div
              key={member.id}
              className="mt-4 rounded-lg border border-[#d9dfd2] p-4"
            >
              <p className="font-semibold">
                {member.name || member.email || "Staff member"}
              </p>

              <p className="text-sm text-[#647568]">{member.email}</p>

              <p className="mt-2 text-sm">
                Requested role: {member.requestedRole || "Not specified"}
              </p>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  disabled={processing === member.id}
                  onClick={() => handleApprove(member, "storekeeper")}
                  className="rounded-lg bg-[#dce7d5] px-4 py-2 font-semibold disabled:opacity-50"
                >
                  Approve as Storekeeper
                </button>

                <button
                  disabled={processing === member.id}
                  onClick={() => handleApprove(member, "salesRep")}
                  className="rounded-lg bg-[#e9b66b] px-4 py-2 font-semibold disabled:opacity-50"
                >
                  Approve as Sales Rep
                </button>

                <button
                  disabled={processing === member.id}
                  onClick={() => handleReject(member)}
                  className="rounded-lg border border-red-300 px-4 py-2 text-red-700 disabled:opacity-50"
                >
                  Reject Request
                </button>
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
