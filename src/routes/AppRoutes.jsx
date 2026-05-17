import { Routes, Route } from "react-router-dom";
import Home from "../pages/Home";
import Login from "../pages/Login";
import Signup from "../pages/Signup";
import Roommates from "../pages/Roommates";
import CreateListing from "../pages/CreateListing";
import Profile from "../pages/Profile";
import EditProfile from "../pages/EditProfile";
import ProtectedRoute from "../routes/ProtectedRoute";

import ListingDetails from "../pages/ListingDetails";
import Inbox from "../pages/Inbox";
import Chat from "../pages/Chat";
import ExpenseDashboard from "../pages/Expenses/ExpenseDashboard";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/roommates" element={<Roommates />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/create"
        element={
          <ProtectedRoute>
            <CreateListing />
          </ProtectedRoute>
        }
      />

      <Route
        path="/edit/:listingId"
        element={
          <ProtectedRoute>
            <CreateListing />
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile/edit"
        element={
          <ProtectedRoute>
            <EditProfile />
          </ProtectedRoute>
        }
      />
      <Route path="/listing/:id" element={<ListingDetails />} />
      <Route path="/inbox" element={<Inbox />} />
      <Route path="/chat/:id" element={<Chat />} />
      <Route
        path="/expenses"
        element={
          <ProtectedRoute>
            <ExpenseDashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

