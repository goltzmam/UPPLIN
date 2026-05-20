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
  const [isActive, setIsActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastScanRef = useRef<string>("");
  const lastScanTimeRef = useRef<number>(0);
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) {
          await scannerRef.current.stop();
        }
        try { await scannerRef.current.clear(); } catch {}
      } catch {
        // ignore
      }
      scannerRef.current = null;
    }
    setIsActive(false);
    setStarting(false);
  }, []);

  // Start camera AFTER the container is mounted in the DOM
  useEffect(() => {
    if (!isActive) return;
    let cancelled = false;

    const init = async () => {
      // wait a tick so the container is in DOM
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      if (cancelled) return;

      const el = document.getElementById("qr-scanner-container");
      if (!el) {
        setError("Falha ao iniciar o scanner (container não encontrado).");
        setStarting(false);
        setIsActive(false);
        return;
      }

      try {
        // Check browser support
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Este navegador não suporta acesso à câmera. Use Chrome ou Safari atualizado.");
        }

        const scanner = new Html5Qrcode("qr-scanner-container");
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1 },
          (decodedText) => {
            const now = Date.now();
            if (decodedText === lastScanRef.current && now - lastScanTimeRef.current < 3000) return;
            lastScanRef.current = decodedText;
            lastScanTimeRef.current = now;
            onScanRef.current(decodedText);
          },
          () => { /* not found in frame - ignore */ }
        );

        if (cancelled) {
          try { await scanner.stop(); } catch {}
          return;
        }
        setStarting(false);
      } catch (err: any) {
        console.error("Scanner error:", err);
        const msg = err?.message || err?.toString() || "";
        if (msg.includes("NotAllowedError") || msg.includes("Permission")) {
          setError("Permissão de câmera negada. Habilite nas configurações do navegador.");
        } else if (msg.includes("NotFoundError") || msg.includes("Requested device not found")) {
          setError("Nenhuma câmera encontrada neste dispositivo.");
        } else if (msg.includes("NotReadableError")) {
          setError("Câmera em uso por outro app. Feche e tente novamente.");
        } else if (msg.includes("suporta")) {
          setError(msg);
        } else if (location.protocol !== "https:" && location.hostname !== "localhost") {
          setError("Câmera requer HTTPS. Acesse o site via conexão segura.");
        } else {
          setError("Não foi possível acessar a câmera. Verifique permissões no navegador.");
        }
        setStarting(false);
        setIsActive(false);
        scannerRef.current = null;
      }
    };

    init();
    return () => { cancelled = true; };
  }, [isActive]);

  useEffect(() => {
    return () => { stopScanner(); };
  }, [stopScanner]);

  const handleStart = () => {
    setError(null);
    setStarting(true);
    setIsActive(true);
  };

  return (
    <div className={cn("relative", className)}>
      {!isActive ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-8">
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

          <Button onClick={handleStart} size="lg" className="gap-2" disabled={starting}>
            <Camera className="h-5 w-5" />
            {starting ? "Iniciando..." : "Abrir Scanner"}
          </Button>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-destructive mt-4 text-center flex items-center gap-2 max-w-xs"
            >
              <CameraOff className="h-4 w-4 shrink-0" />
              {error}
            </motion.p>
          )}
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative">
          <div className="relative overflow-hidden rounded-2xl border-2 border-primary/30 bg-black min-h-[280px]">
            <div id="qr-scanner-container" className="w-full" />

            <AnimatePresence>
              {(starting || isProcessing) && (
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
                      className="h-10 w-10 border-2 border-white/30 border-t-white rounded-full mx-auto mb-3"
                    />
                    <p className="text-white text-sm font-medium">
                      {starting ? "Iniciando câmera..." : "Verificando..."}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-primary rounded-tl-lg" />
              <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-primary rounded-tr-lg" />
              <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-primary rounded-bl-lg" />
              <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-primary rounded-br-lg" />
            </div>

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
