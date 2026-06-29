"use client";

import { motion } from "framer-motion";
import {
  BookOpen,
  LayoutDashboard,
  Image as WallpaperIcon,
  FileQuestion,
  ClipboardList,
  LogOut,
  User,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Video,
  Star,
  Crown,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const menuItems = [
  { name: "Dashboard", icon: LayoutDashboard, path: "/admin" },
  { name: "Upload Wallpaper", icon: WallpaperIcon, path: "/admin/uploads/upload-wallpaper" },
  { name: "Upload Quiz Question", icon: FileQuestion, path: "/admin/uploads/upload-quiz" },
  { name: "Upload Daily Verse", icon: ClipboardList, path: "/admin/uploads/upload-verse" },
  { name: "Upload Daily Prayer", icon: ClipboardList, path: "/admin/uploads/upload-prayers" },
  { name: "Upload Witness", icon: MessageCircle, path: "/admin/uploads/upload-witness" },
  { name: "Upload Meet-Share", icon: Video, path: "/admin/uploads/upload-meetShare" },
  { name: "Upload Stories", icon: BookOpen, path: "/admin/uploads/upload-stories" },
  { name: "Upload Featured Story", icon: Star, path: "/admin/uploads/upload-featured-story" },
  { name: "Premium Users", icon: Crown, path: "/admin/premium-users" },
  { name: "Profile", icon: User, path: "/admin/uploads/profile" },
];

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsOpen(window.innerWidth >= 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch {
      // ignore — redirect regardless
    } finally {
      router.replace("/login");
    }
  };

  return (
    <motion.aside
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 80 }}
      className={`fixed top-0 left-0 h-screen ${
        isOpen ? "w-64" : "w-20"
      } bg-white shadow-xl border-r border-gray-200 text-gray-800 flex flex-col justify-between z-50 transition-all duration-300`}
    >
      {/* Toggle Button Row */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-end px-4 py-4 border-b border-gray-200">
          <button
            onClick={() => setIsOpen((o) => !o)}
            aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
            className="p-2 rounded-lg hover:bg-gray-100 transition"
          >
            {isOpen ? (
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div>

        {/* Nav Items */}
        <ul className="mt-3 space-y-1 px-3">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <li key={item.path}>
                <Link
                  href={item.path}
                  title={item.name}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all group ${
                    isActive
                      ? "bg-[#C9DAFF] text-[#558AFF] font-semibold"
                      : "hover:bg-blue-50 hover:text-[#558AFF] text-gray-700"
                  }`}
                >
                  <item.icon
                    className={`w-5 h-5 flex-shrink-0 ${
                      isActive ? "text-[#558AFF]" : "text-gray-500 group-hover:text-[#558AFF]"
                    } transition-all ${!isOpen ? "mx-auto" : ""}`}
                  />
                  {isOpen && (
                    <span className="text-sm font-medium tracking-wide truncate">
                      {item.name}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Logout */}
      <div className="px-3 pb-4 border-t border-gray-200 pt-4">
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          title="Logout"
          className="w-full flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-red-50 hover:text-red-500 text-gray-600 disabled:opacity-50"
        >
          <LogOut className={`w-5 h-5 flex-shrink-0 ${!isOpen ? "mx-auto" : ""}`} />
          {isOpen && (
            <span className="text-sm font-medium">
              {loggingOut ? "Logging out…" : "Logout"}
            </span>
          )}
        </button>
        {isOpen && (
          <p className="text-xs text-gray-400 text-center mt-3">© 2025 Faith Frames</p>
        )}
      </div>
    </motion.aside>
  );
}
