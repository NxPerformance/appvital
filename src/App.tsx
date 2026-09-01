import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, type ComponentType, type ReactElement } from "react";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { TrainerRoute } from "@/components/TrainerRoute";
import { AppLayout } from "@/components/AppLayout";
import { AppUpdatePrompt } from "@/components/AppUpdatePrompt";

const queryClient = new QueryClient();

const Login = lazy(() => import("@/pages/auth/Login"));
const Onboarding = lazy(() => import("@/pages/auth/Onboarding"));
const Register = lazy(() => import("@/pages/auth/Register"));
const Terms = lazy(() => import("@/pages/Terms"));
const Home = lazy(() => import("@/pages/Home"));
const Workouts = lazy(() => import("@/pages/Workouts"));
const WorkoutForm = lazy(() => import("@/pages/workouts/WorkoutForm"));
const WorkoutHistory = lazy(() => import("@/pages/workouts/WorkoutHistory"));
const WorkoutDashboard = lazy(() => import("@/pages/workouts/WorkoutDashboard"));
const Injectables = lazy(() => import("@/pages/Injectables"));
const NewInjectable = lazy(() => import("@/pages/injectables/NewInjectable"));
const Premium = lazy(() => import("@/pages/Premium"));
const Appointments = lazy(() => import("@/pages/Appointments"));
const Notifications = lazy(() => import("@/pages/Notifications"));
const Settings = lazy(() => import("@/pages/Settings"));
const Profile = lazy(() => import("@/pages/Profile"));
const TrainerDashboard = lazy(() => import("@/pages/TrainerDashboard"));
const BodyProgress = lazy(() => import("@/pages/BodyProgress"));
const Vital360 = lazy(() => import("@/pages/Vital360"));
const Wearables = lazy(() => import("@/pages/Wearables"));
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("@/pages/admin/AdminUsers"));
const AdminFinance = lazy(() => import("@/pages/admin/AdminFinance"));
const AdminPaymentSettings = lazy(() => import("@/pages/admin/AdminPaymentSettings"));
const AdminBioimpedance = lazy(() => import("@/pages/admin/AdminBioimpedance"));
const AdminBioimpedanceEdit = lazy(() => import("@/pages/admin/AdminBioimpedanceEdit"));
const AdminUserHistory = lazy(() => import("@/pages/admin/AdminUserHistory"));
const AdminAppointments = lazy(() => import("@/pages/admin/AdminAppointments"));
const NotFound = lazy(() => import("@/pages/NotFound"));

function PageLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-primary" />
    </div>
  );
}

function lazyElement(Component: ComponentType): ReactElement {
  return (
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  );
}

const router = createBrowserRouter([
  // Auth Routes
  {
    path: "/onboarding",
    element: lazyElement(Onboarding),
  },
  {
    path: "/login",
    element: lazyElement(Login),
  },
  {
    path: "/registro",
    element: lazyElement(Register),
  },
  {
    path: "/termos-de-uso",
    element: lazyElement(Terms),
  },
  {
    path: "/auth/login",
    element: <Navigate to="/login" replace />,
  },
  {
    path: "/auth/register",
    element: <Navigate to="/registro" replace />,
  },
  // Protected Routes with Bottom Nav
  {
    path: "/",
    element: <ProtectedRoute><AppLayout /></ProtectedRoute>,
    children: [
      { index: true, element: lazyElement(Home) },
      { path: "workouts", element: lazyElement(Workouts) },
      { path: "workouts/musculacao/:type", element: lazyElement(WorkoutForm) },
      { path: "workouts/history", element: lazyElement(WorkoutHistory) },
      { path: "workouts/dashboard", element: lazyElement(WorkoutDashboard) },
      { path: "injectables", element: lazyElement(Injectables) },
      { path: "injectables/new", element: lazyElement(NewInjectable) },
      { path: "premium", element: lazyElement(Premium) },
      { path: "appointments", element: lazyElement(Appointments) },
      { path: "notifications", element: lazyElement(Notifications) },
      { path: "trainer", element: <TrainerRoute>{lazyElement(TrainerDashboard)}</TrainerRoute> },
      { path: "settings", element: lazyElement(Settings) },
      { path: "profile", element: lazyElement(Profile) },
      { path: "body-progress", element: lazyElement(BodyProgress) },
      { path: "vital-360", element: lazyElement(Vital360) },
      { path: "wearables", element: lazyElement(Wearables) },
    ],
  },
  // Admin Routes
  {
    path: "/admin",
    element: <ProtectedRoute><AdminRoute /></ProtectedRoute>,
    children: [
      { index: true, element: lazyElement(AdminDashboard) },
      { path: "users", element: lazyElement(AdminUsers) },
      { path: "finance", element: lazyElement(AdminFinance) },
      { path: "payment-settings", element: lazyElement(AdminPaymentSettings) },
      { path: "users/:userId/history", element: lazyElement(AdminUserHistory) },
      { path: "bioimpedance", element: lazyElement(AdminBioimpedance) },
      { path: "bioimpedance/user/:userId", element: lazyElement(AdminBioimpedance) },
      { path: "bioimpedance/:id", element: lazyElement(AdminBioimpedanceEdit) },
      { path: "appointments", element: lazyElement(AdminAppointments) },
    ],
  },
  // 404
  {
    path: "*",
    element: lazyElement(NotFound),
  },
]);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppUpdatePrompt />
        <RouterProvider router={router} />
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
