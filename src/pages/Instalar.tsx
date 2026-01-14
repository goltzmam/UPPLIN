import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { 
  Download, 
  Smartphone, 
  Share, 
  Plus, 
  CheckCircle2, 
  Wifi, 
  Zap, 
  Bell,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Instalar() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Detect platform
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));
    
    // Check if already installed
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    setIsStandalone(standalone);
    setIsInstalled(standalone);

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Listen for app installed
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const features = [
    {
      icon: Zap,
      title: "Super Rápido",
      description: "Carrega instantaneamente, como um app nativo"
    },
    {
      icon: Wifi,
      title: "Funciona Offline",
      description: "Acesse eventos já visitados sem internet"
    },
    {
      icon: Bell,
      title: "Notificações",
      description: "Receba alertas sobre eventos de interesse"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="relative py-16 sm:py-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent opacity-50" />
          
          <div className="container relative px-4">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-2xl mx-auto text-center"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary mb-6">
                <Smartphone className="h-4 w-4" />
                <span className="text-sm font-medium">Baixe o App Grátis</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-foreground mb-6">
                INFLUENTE no seu{" "}
                <span className="text-primary">bolso</span>
              </h1>

              <p className="text-lg sm:text-xl text-muted-foreground mb-8">
                Instale o app na tela inicial do seu celular e tenha acesso rápido aos melhores eventos do Brasil.
              </p>

              {/* Install Status */}
              {isInstalled || isStandalone ? (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-500"
                >
                  <CheckCircle2 className="h-6 w-6" />
                  <span className="text-lg font-medium">App já instalado!</span>
                </motion.div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  {/* Android Install Button */}
                  {deferredPrompt && (
                    <Button 
                      size="lg" 
                      onClick={handleInstallClick}
                      className="gap-2 px-8 py-6 text-lg rounded-2xl"
                    >
                      <Download className="h-5 w-5" />
                      Instalar Agora
                    </Button>
                  )}
                  
                  {/* Show instructions based on platform */}
                  {!deferredPrompt && !isInstalled && (
                    <p className="text-muted-foreground">
                      {isIOS ? "Siga as instruções abaixo para iOS" : "Clique no menu do navegador para instalar"}
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-16 bg-muted/30">
          <div className="container px-4">
            <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-6 rounded-2xl bg-background border border-border text-center"
                >
                  <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-primary/10 text-primary mb-4">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* iOS Instructions */}
        {isIOS && !isInstalled && (
          <section className="py-16">
            <div className="container px-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md mx-auto"
              >
                <h2 className="text-2xl font-display font-bold text-center mb-8">
                  Como instalar no iPhone
                </h2>

                <div className="space-y-4">
                  <Step 
                    number={1}
                    icon={Share}
                    title="Toque em Compartilhar"
                    description="Na barra inferior do Safari, toque no ícone de compartilhar"
                  />
                  <Step 
                    number={2}
                    icon={Plus}
                    title='Toque em "Adicionar à Tela de Início"'
                    description="Role as opções e selecione esta opção"
                  />
                  <Step 
                    number={3}
                    icon={CheckCircle2}
                    title='Toque em "Adicionar"'
                    description="Confirme para adicionar o ícone na sua tela inicial"
                  />
                </div>
              </motion.div>
            </div>
          </section>
        )}

        {/* Android Instructions (when no prompt available) */}
        {isAndroid && !deferredPrompt && !isInstalled && (
          <section className="py-16">
            <div className="container px-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md mx-auto"
              >
                <h2 className="text-2xl font-display font-bold text-center mb-8">
                  Como instalar no Android
                </h2>

                <div className="space-y-4">
                  <Step 
                    number={1}
                    title="Abra o menu do navegador"
                    description="Toque nos três pontos no canto superior direito"
                  />
                  <Step 
                    number={2}
                    title='Toque em "Instalar app" ou "Adicionar à tela inicial"'
                    description="A opção pode variar dependendo do navegador"
                  />
                  <Step 
                    number={3}
                    icon={CheckCircle2}
                    title="Confirme a instalação"
                    description="O app será adicionado à sua tela inicial"
                  />
                </div>
              </motion.div>
            </div>
          </section>
        )}

        {/* Desktop Instructions */}
        {!isIOS && !isAndroid && !isInstalled && (
          <section className="py-16">
            <div className="container px-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md mx-auto text-center"
              >
                <Smartphone className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
                <h2 className="text-2xl font-display font-bold mb-4">
                  Acesse pelo celular
                </h2>
                <p className="text-muted-foreground">
                  Para instalar o app, acesse este site pelo navegador do seu celular (iPhone ou Android).
                </p>
              </motion.div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}

interface StepProps {
  number: number;
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

function Step({ number, icon: Icon, title, description }: StepProps) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/50 border border-border">
      <div className={cn(
        "flex items-center justify-center h-10 w-10 rounded-full shrink-0",
        "bg-primary text-primary-foreground font-bold"
      )}>
        {Icon ? <Icon className="h-5 w-5" /> : number}
      </div>
      <div>
        <h3 className="font-semibold text-foreground mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}