import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import AppDashboard from "./pages/AppDashboard";
import NewJob from "./pages/NewJob";
import JobDetail from "./pages/JobDetail";
import CostCenter from "./pages/CostCenter";
import QuoteList from "./pages/QuoteList";
import NewQuote from "./pages/NewQuote";
import QuoteDetail from "./pages/QuoteDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/app" element={<AppDashboard />} />
          <Route path="/app/nova-obra" element={<NewJob />} />
          <Route path="/app/obra/:id" element={<JobDetail />} />
          <Route path="/app/centro-de-custo" element={<CostCenter />} />
          <Route path="/app/orcamentos" element={<QuoteList />} />
          <Route path="/app/novo-orcamento" element={<NewQuote />} />
          <Route path="/app/orcamento/:id" element={<QuoteDetail />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
