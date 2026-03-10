import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Code splitting para melhorar carregamento em 3G/4G
    rollupOptions: {
      output: {
        manualChunks: {
          // Bibliotecas React core
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // UI e animações
          "vendor-ui": ["framer-motion", "lucide-react"],
          // Supabase
          "vendor-supabase": ["@supabase/supabase-js"],
          // Gráficos (carregados só quando necessário)
          "vendor-charts": ["recharts"],
          // PDF (carregado só em QuoteDetail/NewQuote)
          "vendor-pdf": ["jspdf", "jspdf-autotable"],
        },
      },
    },
    // Aumenta o limite do aviso (1.7MB é esperado com muitas dependências Radix)
    chunkSizeWarningLimit: 600,
  },
}));
