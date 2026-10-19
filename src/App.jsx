import { useLayoutEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ReactLenis, useLenis } from "lenis/react";

import AdminDashboard from "@/views/AdminDashboard.jsx";
import Auth from "@/views/Auth.jsx";
import Dashboard from "@/views/Dashboard.jsx";
import FindRoom from "@/views/FindRoom.jsx";
import Home from "@/views/Home.jsx";
import ListRoom from "@/views/ListRoom.jsx";
import MyListedRooms from "@/views/MyListedRooms.jsx";
import NotFound from "@/views/NotFound.jsx";
import RoomDetails from "@/views/RoomDetails.jsx";
import Wishlist from "@/views/Wishlist.jsx";
import DownloadApps from "@/views/DownloadApps.jsx";

import ChatDrawer from "@/components/ChatDrawer.jsx";
import { ChatProvider } from "@/context/ChatContext.jsx";

const LENIS_OPTIONS = {
  lerp: 0.12,
  smoothWheel: true,
  wheelMultiplier: 1.0,
  touchMultiplier: 1.0,
  syncTouch: false,
  autoRaf: true,
};

export default function App() {
  return (
    <ReactLenis root options={LENIS_OPTIONS}>
      <ChatProvider>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/find-room" element={<FindRoom />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/signup" element={<Auth />} />
          <Route path="/forgot-password" element={<Auth />} />
          <Route path="/reset-password" element={<Auth />} />
          <Route path="/search" element={<Navigate to="/find-room" replace />} />
          <Route path="/list-room" element={<ListRoom />} />
          <Route path="/my-rooms" element={<MyListedRooms />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/rooms/:id" element={<RoomDetails />} />
          <Route path="/download-apps" element={<DownloadApps />} />
          <Route path="/download" element={<Navigate to="/download-apps" replace />} />
          <Route path="/app" element={<Navigate to="/download-apps" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <ChatDrawer />
      </ChatProvider>
    </ReactLenis>
  );
}

function ScrollToTop() {
  const { hash, pathname } = useLocation();
  const lenis = useLenis();

  useLayoutEffect(() => {
    if (hash) {
      try {
        const id = hash.replace(/^#/, "");
        const target = document.getElementById(id) || document.querySelector(hash);
        if (target) {
          if (lenis) {
            lenis.scrollTo(target, { offset: -70 });
          } else {
            target.scrollIntoView({ behavior: "smooth" });
          }
        }
      } catch {
        // Ignore invalid CSS selector
      }
      return;
    }

    if (lenis) {
      lenis.scrollTo(0, { immediate: true });
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash, pathname]);

  return null;
}
