import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, CameraOff, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface QRScannerProps {
  onScan: (data: string) => void;
  isProcessing?: boolean;
  className?: string;
}

export function QRScanner({ onScan, isProcessing, className }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastScanRef = useRef<string>("");
  const lastScanTimeRef = useRef<number>(0);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) { // SCANNING
          await scannerRef.current.stop();
        }
      } catch {
        // ignore
      }
      scannerRef.current = null;
    }
    setIsActive(false);
  }, []);

  const startScanner = useCallback(async () => {
    setError(null);

    try {
      const scanner = new Html5Qrcode("qr-scanner-container");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        (decodedText) => {
          const now = Date.now();
          // Debounce: don't fire same code within 3 seconds
          if (decodedText === lastScanRef.current && now - lastScanTimeRef.current < 3000) {
            return;
          }
          lastScanRef.current = decodedText;
          lastScanTimeRef.current = now;
          onScan(decodedText);
        },
        () => {
          // QR not found in frame - ignore
        }
      );

      setIsActive(true);
    } catch (err: any) {
      console.error("Scanner error:", err);
      if (err?.toString().includes("NotAllowedError") || err?.toString().includes("Permission")) {
        setError("Permissão de câmera negada. Habilite nas configurações do navegador.");
      } else {
        setError("Não foi possível acessar a câmera.");
      }
    }
  }, [onScan]);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  return (
    <div className={cn("relative", className)}>
      {!isActive ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-8"
        >
          <div className="relative mb-6">
            <div className="h-32 w-32 rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border-2 border-dashed border-primary/30">
              <Camera className="h-12 w-12 text-primary" />
            </div>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-primary flex items-center justify-center"
            >
              <Zap className="h-3 w-3 text-primary-foreground" />
            </motion.div>
          </div>

          <p className="text-sm text-muted-foreground mb-4 text-center max-w-xs">
            Aponte a câmera para o QR Code do ingresso para fazer o check-in automático
          </p>

          <Button onClick={startScanner} size="lg" className="gap-2">
            <Camera className="h-5 w-5" />
            Abrir Scanner
          </Button>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-destructive mt-4 text-center flex items-center gap-2"
            >
              <CameraOff className="h-4 w-4 shrink-0" />
              {error}
            </motion.p>
          )}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative"
        >
          {/* Scanner viewport */}
          <div className="relative overflow-hidden rounded-2xl border-2 border-primary/30 bg-black">
            <div id="qr-scanner-container" className="w-full" />

            {/* Scanning overlay */}
            <AnimatePresence>
              {isProcessing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/60 flex items-center justify-center z-10"
                >
                  <div className="text-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="h-10 w-10 border-3 border-white/30 border-t-white rounded-full mx-auto mb-3"
                    />
                    <p className="text-white text-sm font-medium">Verificando...</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Corner markers */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-4 left-4 w-8 h-8 border-t-3 border-l-3 border-primary rounded-tl-lg" />
              <div className="absolute top-4 right-4 w-8 h-8 border-t-3 border-r-3 border-primary rounded-tr-lg" />
              <div className="absolute bottom-4 left-4 w-8 h-8 border-b-3 border-l-3 border-primary rounded-bl-lg" />
              <div className="absolute bottom-4 right-4 w-8 h-8 border-b-3 border-r-3 border-primary rounded-br-lg" />
            </div>

            {/* Scanning line animation */}
            <motion.div
              animate={{ y: [0, 200, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute left-8 right-8 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent z-5 top-1/4"
            />
          </div>

          <div className="flex justify-center mt-4">
            <Button variant="outline" onClick={stopScanner} className="gap-2">
              <CameraOff className="h-4 w-4" />
              Fechar Scanner
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
