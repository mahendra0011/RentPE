import { useLayoutEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import AdminDashboard from "@/pages/AdminDashboard.jsx";
import Auth from "@/pages/Auth.jsx";
import Dashboard from "@/pages/Dashboard.jsx";
import FindRoom from "@/pages/FindRoom.jsx";
import Home from "@/pages/Home.jsx";
import ListRoom from "@/pages/ListRoom.jsx";
import MyListedRooms from "@/pages/MyListedRooms.jsx";
import NotFound from "@/pages/NotFound.jsx";
import RoomDetails from "@/pages/RoomDetails.jsx";
import Wishlist from "@/pages/Wishlist.jsx";

import ChatDrawer from "@/components/ChatDrawer.jsx";
import { ChatProvider } from "@/context/ChatContext.jsx";

export default function App() {
  return (
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
        <Route path="*" element={<NotFound />} />
      </Routes>
      <ChatDrawer />
    </ChatProvider>
  );
}

function ScrollToTop() {
  const { hash, pathname } = useLocation();

  useLayoutEffect(() => {
    if (hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [hash, pathname]);

  return null;
}
