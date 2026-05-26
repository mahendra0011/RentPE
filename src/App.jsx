import { Navigate, Route, Routes } from "react-router-dom";

import Auth from "@/pages/Auth.jsx";
import Dashboard from "@/pages/Dashboard.jsx";
import FindRoom from "@/pages/FindRoom.jsx";
import Home from "@/pages/Home.jsx";
import ListRoom from "@/pages/ListRoom.jsx";
import NotFound from "@/pages/NotFound.jsx";
import RoomDetails from "@/pages/RoomDetails.jsx";
import Roommates from "@/pages/Roommates.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/find-room" element={<FindRoom />} />
      <Route path="/login" element={<Auth />} />
      <Route path="/signup" element={<Auth />} />
      <Route path="/search" element={<Navigate to="/find-room" replace />} />
      <Route path="/list-room" element={<ListRoom />} />
      <Route path="/roommates" element={<Roommates />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/rooms/:id" element={<RoomDetails />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
