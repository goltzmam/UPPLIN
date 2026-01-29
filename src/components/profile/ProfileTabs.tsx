import { Link } from "react-router-dom";
import { Grid3X3, Heart, Settings, Ticket } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageLoading } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { ProfileSettings } from "./ProfileSettings";
import { EventGrid } from "./EventGrid";

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  photo_url: string | null;
  cpf?: string | null;
  cpf_locked?: boolean;
}

interface ProfileTabsProps {
  defaultTab: string;
  attendedEvents: any[];
  savedEvents: any[];
  attendedLoading: boolean;
  savedLoading: boolean;
  profile: Profile;
  onProfileUpdate: (updates: Partial<Profile>) => Promise<{ error: any }>;
}

export function ProfileTabs({
  defaultTab,
  attendedEvents,
  savedEvents,
  attendedLoading,
  savedLoading,
  profile,
  onProfileUpdate,
}: ProfileTabsProps) {
  return (
    <div className="container py-4">
      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 bg-white/10 border border-white/10">
          <TabsTrigger value="eventos" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-black text-white/70">
            <Grid3X3 className="h-4 w-4" />
            <span className="hidden sm:inline">Eventos</span>
          </TabsTrigger>
          <TabsTrigger value="salvos" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-black text-white/70">
            <Heart className="h-4 w-4" />
            <span className="hidden sm:inline">Salvos</span>
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-black text-white/70">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Config</span>
          </TabsTrigger>
        </TabsList>

        {/* Eventos Tab - Grid of attended events */}
        <TabsContent value="eventos" className="animate-fade-in">
          {attendedLoading ? (
            <PageLoading />
          ) : attendedEvents.length > 0 ? (
            <EventGrid events={attendedEvents.map(t => t.events).filter(Boolean)} />
          ) : (
            <EmptyState
              icon={<Ticket className="h-8 w-8 text-primary" />}
              title="Nenhum evento ainda"
              description="Seus eventos aparecerão aqui"
              variant="dark"
              action={
                <Button asChild className="bg-primary hover:bg-primary/90 text-white">
                  <Link to="/eventos">Explorar Eventos</Link>
                </Button>
              }
              className="py-12"
            />
          )}
        </TabsContent>

        {/* Salvos Tab */}
        <TabsContent value="salvos" className="animate-fade-in">
          {savedLoading ? (
            <PageLoading />
          ) : savedEvents.length > 0 ? (
            <EventGrid events={savedEvents.map(s => s.events).filter(Boolean)} />
          ) : (
            <EmptyState
              icon={<Heart className="h-8 w-8 text-primary" />}
              title="Nenhum evento salvo"
              description="Salve eventos para acompanhá-los"
              variant="dark"
              action={
                <Button asChild className="bg-primary hover:bg-primary/90 text-white">
                  <Link to="/eventos">Explorar Eventos</Link>
                </Button>
              }
              className="py-12"
            />
          )}
        </TabsContent>

        {/* Config Tab */}
        <TabsContent value="config" className="animate-fade-in">
          <ProfileSettings profile={profile} onProfileUpdate={onProfileUpdate} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
