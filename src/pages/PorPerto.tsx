import { BottomNav } from "@/components/layout/BottomNav";
import { TikTokDesktopSidebar } from "@/components/layout/TikTokDesktopSidebar";
import { MapPin, Construction } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function PorPerto() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <TikTokDesktopSidebar />
      
      <main className="flex-1 pb-24 lg:pb-8 lg:ml-[72px]">
        <div className="max-w-2xl mx-auto py-16 px-4 text-center">
          <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-6">
            <MapPin className="h-10 w-10 text-primary" />
            <Construction className="h-5 w-5 text-muted-foreground absolute -bottom-1 -right-1 bg-background rounded-full p-0.5" />
          </div>
          
          <h1 className="text-2xl font-bold mb-2">Por Perto</h1>
          <p className="text-muted-foreground mb-2">
            Eventos próximos a você no mapa
          </p>
          <p className="text-sm text-muted-foreground/70 mb-8">
            🚧 Em breve — mapa interativo com geolocalização automática.
            <br />
            <span className="text-xs">
              🟢 Eventos hoje &nbsp;·&nbsp; 🔵 Eventos na semana
            </span>
          </p>
          
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => navigate("/eventos")}
          >
            Explorar Eventos
          </Button>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
