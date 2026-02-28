import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "./lib/AuthContext";
import { DataProvider } from "./lib/DataContext";
import ProtectedRoute from "./components/app/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AppDashboard from "./pages/AppDashboard";
import NewJob from "./pages/NewJob";
import JobDetail from "./pages/JobDetail";
import CostCenter from "./pages/CostCenter";
import QuoteList from "./pages/QuoteList";
import NewQuote from "./pages/NewQuote";
import QuoteDetail from "./pages/QuoteDetail";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import PublicQuoteView from "./pages/PublicQuoteView";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
      <DataProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Signup />} />
          <Route path="/esqueci-senha" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/app" element={<ProtectedRoute><AppDashboard /></ProtectedRoute>} />
          <Route path="/app/nova-obra" element={<ProtectedRoute><NewJob /></ProtectedRoute>} />
          <Route path="/app/obra/:id" element={<ProtectedRoute><JobDetail /></ProtectedRoute>} />
          <Route path="/app/centro-de-custo" element={<ProtectedRoute><CostCenter /></ProtectedRoute>} />
          <Route path="/app/centro-de-custo/obra/:id" element={<ProtectedRoute><JobDetail /></ProtectedRoute>} />
          <Route path="/app/orcamentos" element={<ProtectedRoute><QuoteList /></ProtectedRoute>} />
          <Route path="/app/novo-orcamento" element={<ProtectedRoute><NewQuote /></ProtectedRoute>} />
          <Route path="/app/orcamento/:id" element={<ProtectedRoute><QuoteDetail /></ProtectedRoute>} />
          <Route path="/app/perfil" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/orcamento-publico/:id" element={<PublicQuoteView />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      </DataProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
  </HelmetProvider>
);

export default App;
