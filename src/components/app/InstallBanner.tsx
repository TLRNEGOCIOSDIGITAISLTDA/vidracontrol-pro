import { useState } from "react";
import { Download, X, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { motion, AnimatePresence } from "framer-motion";

const InstallBanner = () => {
  const { canInstall, isIos, isInstalled, install } = usePwaInstall();
  const [dismissed, setDismissed] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  if (isInstalled || dismissed) return null;
  if (!canInstall && !isIos) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-20 left-3 right-3 z-50 bg-card rounded-2xl shadow-elevated border border-border p-4"
      >
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-2 right-2 text-muted-foreground p-1"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shrink-0">
            <Download className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-foreground text-sm">Instalar VidraControl</h3>
            <p className="text-xs text-muted-foreground">
              Acesse direto da tela inicial, sem navegador
            </p>
          </div>
        </div>

        {canInstall && (
          <Button
            onClick={install}
            className="w-full mt-3 gap-2"
            size="lg"
          >
            <Download className="h-5 w-5" />
            Instalar App
          </Button>
        )}

        {isIos && !canInstall && (
          <>
            <Button
              variant="outline"
              onClick={() => setShowIosGuide(!showIosGuide)}
              className="w-full mt-3 gap-2"
              size="lg"
            >
              <Share className="h-5 w-5" />
              Como instalar no iPhone
            </Button>

            <AnimatePresence>
              {showIosGuide && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-primary shrink-0">1.</span>
                      Toque no ícone <Share className="h-4 w-4 inline text-primary" /> (Compartilhar) no Safari
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-primary shrink-0">2.</span>
                      Role e toque em "Adicionar à Tela de Início"
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-primary shrink-0">3.</span>
                      Toque em "Adicionar" — pronto! 🎉
                    </li>
                  </ol>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default InstallBanner;
