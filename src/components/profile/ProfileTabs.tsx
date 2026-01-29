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
        <TabsList className="grid w-full grid-cols-3 bg-muted/50 border border-border rounded-xl p-1">
          <TabsTrigger 
            value="eventos" 
            className="flex items-center gap-2 rounded-lg font-medium transition-all data-[state=active]:btn-gradient data-[state=active]:text-white data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground"
          >
            <Grid3X3 className="h-4 w-4" />
            <span className="hidden sm:inline">Eventos</span>
          </TabsTrigger>
          <TabsTrigger 
            value="salvos" 
            className="flex items-center gap-2 rounded-lg font-medium transition-all data-[state=active]:btn-gradient data-[state=active]:text-white data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground"
          >
            <Heart className="h-4 w-4" />
            <span className="hidden sm:inline">Salvos</span>
          </TabsTrigger>
          <TabsTrigger 
            value="config" 
            className="flex items-center gap-2 rounded-lg font-medium transition-all data-[state=active]:btn-gradient data-[state=active]:text-white data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground"
          >
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
              icon={<Ticket className="h-8 w-8 text-accent" />}
              title="Nenhum evento ainda"
              description="Seus eventos aparecerão aqui"
              variant="default"
              action={
                <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
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
              icon={<Heart className="h-8 w-8 text-accent" />}
              title="Nenhum evento salvo"
              description="Salve eventos para acompanhá-los"
              variant="default"
              action={
                <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
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
