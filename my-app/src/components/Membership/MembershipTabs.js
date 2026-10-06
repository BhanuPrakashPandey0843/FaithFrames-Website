"use client";

import React from "react";
import Link from "next/link";
import { Crown, User } from "lucide-react";

/**
 * Switcher shown at the top of both membership pages so the admin can move
 * between paying and non-paying users. Counts are optional (shown as "—" while unknown).
 */
export default function MembershipTabs({ active, premiumCount, nonPremiumCount }) {
  const tabs = [
    {
      key: "premium",
      href: "/admin/premium-users",
      label: "Premium Users",
      hint: "Paid for a subscription",
      icon: Crown,
      count: premiumCount,
    },
    {
      key: "non-premium",
      href: "/admin/uploads/profile",
      label: "Profile · Non-Premium",
      hint: "No subscription yet",
      icon: User,
      count: nonPremiumCount,
    },
  ];

  return (
    <nav
      aria-label="User membership sections"
      className="inline-flex flex-wrap gap-2 bg-white border border-gray-200 rounded-2xl p-1.5 shadow-sm"
    >
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm transition ${
              isActive
                ? "bg-indigo-600 text-white shadow"
                : "text-gray-600 hover:bg-indigo-50 hover:text-indigo-600"
            }`}
          >
            <tab.icon className="w-4 h-4 flex-shrink-0" />
            <span className="text-left leading-tight">
              <span className="block font-bold">{tab.label}</span>
              <span className={`block text-[11px] font-medium ${isActive ? "text-indigo-100" : "text-gray-400"}`}>
                {tab.hint}
              </span>
            </span>
            <span
              className={`min-w-[2rem] text-center text-xs font-extrabold rounded-full px-2 py-1 ${
                isActive ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              {typeof tab.count === "number" ? tab.count.toLocaleString() : "—"}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
