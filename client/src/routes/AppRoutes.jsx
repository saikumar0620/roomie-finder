import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import Home from "../pages/Home";
import ProtectedRoute from "../routes/ProtectedRoute";

const Login = lazy(() => import("../pages/Login"));
const Signup = lazy(() => import("../pages/Signup"));
const ForgotPassword = lazy(() => import("../pages/ForgotPassword"));
const ResetPassword = lazy(() => import("../pages/ResetPassword"));
const Roommates = lazy(() => import("../pages/Roommates"));
const CreateListing = lazy(() => import("../pages/CreateListing"));
const Profile = lazy(() => import("../pages/Profile"));
const EditProfile = lazy(() => import("../pages/EditProfile"));
const ListingDetails = lazy(() => import("../pages/ListingDetails"));
const Inbox = lazy(() => import("../pages/Inbox"));
const Chat = lazy(() => import("../pages/Chat"));
const ExpenseDashboard = lazy(() => import("../pages/Expenses/ExpenseDashboard"));

function PageLoader() {
  return (
    <div className="wrap py-16 flex flex-col items-center justify-center gap-3">
      <div
        className="w-9 h-9 rounded-full border-3 border-t-transparent animate-spin"
        style={{ borderColor: "var(--p)", borderTopColor: "transparent" }}
      />
      <span className="text-sm font-medium" style={{ color: "var(--tx2)" }}>
        Loading...
      </span>
    </div>
  );
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/roommates" element={<Roommates />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
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
    </Suspense>
  );
}

