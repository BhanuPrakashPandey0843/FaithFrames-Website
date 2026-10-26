"use client";

import { motion, AnimatePresence } from "framer-motion";
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
  ChevronDown,
  MessageCircle,
  Video,
  Star,
  Crown,
  Clapperboard,
  GalleryHorizontal,
  BarChart3,
  Calendar,
  Sparkles,
  Image,
  Bell,
  TrendingUp,
  Inbox,
  Menu,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const menuItems = [
  { name: "Dashboard", icon: LayoutDashboard, path: "/admin" },
  { name: "Upload Wallpaper", icon: WallpaperIcon, path: "/admin/uploads/upload-wallpaper" },
  { name: "Upload Quiz Question", icon: FileQuestion, path: "/admin/uploads/upload-quiz" },
  { name: "Upload Daily Verse", icon: ClipboardList, path: "/admin/uploads/upload-verse" },
  { name: "Prayer Room (Library screen)", icon: ClipboardList, path: "/admin/uploads/upload-prayers" },
  {
    name: "Bible Management",
    icon: BookOpen,
    children: [
      { name: "Content Dashboard", icon: BarChart3, path: "/admin/bible" },
      { name: "Hindi & Telugu Translations", icon: BookOpen, path: "/admin/bible/translations" },
      { name: "Content Carousel", icon: GalleryHorizontal, path: "/admin/bible/carousel" },
      { name: "Content Manager", icon: FileQuestion, path: "/admin/bible/manager" },
      { name: "Reading Plans", icon: Calendar, path: "/admin/bible/plans" },
      { name: "Daily Verses", icon: Sparkles, path: "/admin/bible/daily-verses" },
      { name: "Bible Banners", icon: Image, path: "/admin/bible/banners" },
      { name: "Announcements", icon: Bell, path: "/admin/bible/announcements" },
      { name: "Analytics", icon: TrendingUp, path: "/admin/bible/analytics" },
    ],
  },
  {
    name: "Scripture videos",
    icon: Clapperboard,
    children: [
      { name: "Dashboard", icon: BarChart3, path: "/admin/witness-videos" },
      { name: "Carousel Manager", icon: GalleryHorizontal, path: "/admin/witness-videos/carousel" },
      { name: "Videos Manager", icon: Video, path: "/admin/witness-videos/videos" },
    ],
  },
  {
    name: "Jesus Content",
    icon: Star,
    children: [
      { name: "Dashboard", icon: BarChart3, path: "/admin/jesus" },
      { name: "Carousel Manager", icon: GalleryHorizontal, path: "/admin/jesus/carousel" },
      { name: "Content Manager", icon: FileQuestion, path: "/admin/jesus/manager" },
    ],
  },
  {
    name: "Prayers Content (Explore Faith – Home screen)",
    icon: MessageCircle,
    children: [
      { name: "Dashboard", icon: BarChart3, path: "/admin/prayers" },
      { name: "Carousel Manager", icon: GalleryHorizontal, path: "/admin/prayers/carousel" },
      { name: "Content Manager", icon: FileQuestion, path: "/admin/prayers/manager" },
    ],
  },
  {
    name: "Worship Content",
    icon: Video,
    children: [
      { name: "Dashboard", icon: BarChart3, path: "/admin/worship" },
      { name: "Carousel Manager", icon: GalleryHorizontal, path: "/admin/worship/carousel" },
      { name: "Content Manager", icon: FileQuestion, path: "/admin/worship/manager" },
    ],
  },
  {
    name: "User Prayers",
    icon: Inbox,
    children: [
      { name: "Dashboard", icon: BarChart3, path: "/admin/user-prayers" },
      { name: "Manage Prayers", icon: ClipboardList, path: "/admin/user-prayers/manage" },
      { name: "Calendar View", icon: Calendar, path: "/admin/user-prayers/calendar" },
      { name: "Analytics", icon: TrendingUp, path: "/admin/user-prayers/analytics" },
    ],
  },
  { name: "Witness Testimonials", icon: MessageCircle, path: "/admin/uploads/upload-witness" },
  { name: "Upload Meet-Share", icon: Video, path: "/admin/uploads/upload-meetShare" },
  { name: "Upload Faith Stories", icon: BookOpen, path: "/admin/uploads/upload-stories" },
  { name: "Upload Women of the Bible Story", icon: Star, path: "/admin/uploads/upload-featured-story" },
  { name: "Notifications", icon: Bell, path: "/admin/notifications" },
  { name: "Premium Users", icon: Crown, path: "/admin/premium-users" },
  { name: "Profile (Non-Premium)", icon: User, path: "/admin/uploads/profile" },
];

export default function Sidebar() {
  const [desktopOpen, setIsOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  // On phones the drawer always shows full labels; on desktop the user can collapse it.
  const isOpen = isMobile || desktopOpen;
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [openGroup, setOpenGroup] = useState(() =>
    menuItems.find((item) => item.children?.some((c) => pathname?.startsWith(c.path)))?.name || null
  );

  useEffect(() => {
    const handleResize = () => {
      setIsOpen(window.innerWidth >= 768);
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) setMobileOpen(false);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const activeGroup = menuItems.find((item) => item.children?.some((c) => pathname === c.path));
    if (activeGroup) setOpenGroup(activeGroup.name);
  }, [pathname]);

  // Lets the global stylesheet remove the page's left margin on phones.
  useEffect(() => {
    document.body.classList.add("has-admin-sidebar");
    return () => document.body.classList.remove("has-admin-sidebar");
  }, []);

  // Close the drawer after navigating.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // While the drawer is open: lock page scroll and close on Escape.
  useEffect(() => {
    if (!mobileOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);

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
    <>
      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 inset-x-0 h-14 z-30 flex items-center gap-3 px-3 bg-white/90 backdrop-blur border-b border-gray-200 shadow-sm">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={mobileOpen}
          className="p-2 -ml-1 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition"
        >
          <Menu className="w-6 h-6 text-gray-700" />
        </button>
        <span className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          Faith Frames
        </span>
      </header>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <motion.aside
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 80 }}
      className={`fixed top-0 left-0 h-dvh ${
        desktopOpen ? "w-64" : "w-20"} max-md:w-72 max-md:max-w-[85vw] ${mobileOpen ? "max-md:translate-x-0 max-md:shadow-2xl" : "max-md:-translate-x-full"
      } bg-white shadow-xl border-r border-gray-200 text-gray-800 flex flex-col justify-between z-50 transition-all duration-300`}
    >
      {/* Toggle Button Row */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-end px-4 py-4 border-b border-gray-200">
          <button
            onClick={() => (isMobile ? setMobileOpen(false) : setIsOpen((o) => !o))}
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
            if (item.children) {
              const isGroupActive = item.children.some((c) => pathname === c.path);
              const expanded = openGroup === item.name;
              return (
                <li key={item.name}>
                  <button
                    type="button"
                    onClick={() => setOpenGroup(expanded ? null : item.name)}
                    title={item.name}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all group ${
                      isGroupActive
                        ? "bg-[#C9DAFF] text-[#558AFF] font-semibold"
                        : "hover:bg-blue-50 hover:text-[#558AFF] text-gray-700"
                    }`}
                  >
                    <item.icon
                      className={`w-5 h-5 flex-shrink-0 ${
                        isGroupActive ? "text-[#558AFF]" : "text-gray-500 group-hover:text-[#558AFF]"
                      } ${!isOpen ? "mx-auto" : ""}`}
                    />
                    {isOpen && (
                      <>
                        <span className="text-sm font-medium tracking-wide truncate flex-1 text-left">
                          {item.name}
                        </span>
                        <ChevronDown
                          className={`w-4 h-4 flex-shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
                        />
                      </>
                    )}
                  </button>

                  <AnimatePresence initial={false}>
                    {expanded && isOpen && (
                      <motion.ul
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden pl-4 mt-1 space-y-1"
                      >
                        {item.children.map((child) => {
                          const isActive = pathname === child.path;
                          return (
                            <li key={child.path}>
                              <Link
                                href={child.path}
                                className={`flex items-center gap-3 p-2.5 rounded-lg transition-all group ${
                                  isActive
                                    ? "bg-[#558AFF] text-white font-semibold"
                                    : "hover:bg-blue-50 hover:text-[#558AFF] text-gray-600"
                                }`}
                              >
                                <child.icon
                                  className={`w-4 h-4 flex-shrink-0 ${
                                    isActive ? "text-white" : "text-gray-400 group-hover:text-[#558AFF]"
                                  }`}
                                />
                                <span className="text-sm font-medium truncate">{child.name}</span>
                              </Link>
                            </li>
                          );
                        })}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </li>
              );
            }

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
    </>
  );
}
