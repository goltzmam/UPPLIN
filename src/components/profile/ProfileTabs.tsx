import { Heart, Settings, Camera, CheckCircle, Users, History, Newspaper } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileSettings } from "./ProfileSettings";
import { UserPostsTab } from "./UserPostsTab";
import { CheckInsTab } from "./CheckInsTab";
import { EventHistoryTab } from "./EventHistoryTab";
import { FollowingTab } from "./FollowingTab";
import { SavedEventsTab } from "./SavedEventsTab";
import { SocialFeedTab } from "./SocialFeedTab";

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
  profile: Profile;
  onProfileUpdate: (updates: Partial<Profile>) => Promise<{ error: any }>;
}

export function ProfileTabs({
  defaultTab,
  profile,
  onProfileUpdate,
}: ProfileTabsProps) {
  return (
    <div className="py-4">
      <Tabs defaultValue={defaultTab} className="space-y-4">
        {/* Horizontal scrollable tabs container for mobile */}
        <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
          <TabsList className="inline-flex w-max min-w-full gap-1 bg-muted/50 border border-border rounded-xl p-1 h-auto">
            <TabsTrigger 
              value="feed" 
              className="flex flex-col items-center gap-0.5 py-2 px-3 rounded-lg font-medium transition-all data-[state=active]:btn-gradient data-[state=active]:text-white data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground whitespace-nowrap"
            >
              <Newspaper className="h-4 w-4" />
              <span className="text-[10px]">Feed</span>
            </TabsTrigger>
            <TabsTrigger 
              value="historico" 
              className="flex flex-col items-center gap-0.5 py-2 px-3 rounded-lg font-medium transition-all data-[state=active]:btn-gradient data-[state=active]:text-white data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground whitespace-nowrap"
            >
              <History className="h-4 w-4" />
              <span className="text-[10px]">Eventos</span>
            </TabsTrigger>
            <TabsTrigger 
              value="posts" 
              className="flex flex-col items-center gap-0.5 py-2 px-3 rounded-lg font-medium transition-all data-[state=active]:btn-gradient data-[state=active]:text-white data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground whitespace-nowrap"
            >
              <Camera className="h-4 w-4" />
              <span className="text-[10px]">Posts</span>
            </TabsTrigger>
            <TabsTrigger 
              value="checkins" 
              className="flex flex-col items-center gap-0.5 py-2 px-3 rounded-lg font-medium transition-all data-[state=active]:btn-gradient data-[state=active]:text-white data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground whitespace-nowrap"
            >
              <CheckCircle className="h-4 w-4" />
              <span className="text-[10px]">Check-ins</span>
            </TabsTrigger>
            <TabsTrigger 
              value="salvos" 
              className="flex flex-col items-center gap-0.5 py-2 px-3 rounded-lg font-medium transition-all data-[state=active]:btn-gradient data-[state=active]:text-white data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground whitespace-nowrap"
            >
              <Heart className="h-4 w-4" />
              <span className="text-[10px]">Salvos</span>
            </TabsTrigger>
            <TabsTrigger 
              value="seguindo" 
              className="flex flex-col items-center gap-0.5 py-2 px-3 rounded-lg font-medium transition-all data-[state=active]:btn-gradient data-[state=active]:text-white data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground whitespace-nowrap"
            >
              <Users className="h-4 w-4" />
              <span className="text-[10px]">Seguindo</span>
            </TabsTrigger>
            <TabsTrigger 
              value="config" 
              className="flex flex-col items-center gap-0.5 py-2 px-3 rounded-lg font-medium transition-all data-[state=active]:btn-gradient data-[state=active]:text-white data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground whitespace-nowrap"
            >
              <Settings className="h-4 w-4" />
              <span className="text-[10px]">Config</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Feed Social Tab */}
        <TabsContent value="feed" className="animate-fade-in">
          <SocialFeedTab />
        </TabsContent>

        {/* Histórico de Eventos Tab */}
        <TabsContent value="historico" className="animate-fade-in">
          <EventHistoryTab />
        </TabsContent>

        {/* Posts Tab */}
        <TabsContent value="posts" className="animate-fade-in">
          <UserPostsTab />
        </TabsContent>

        {/* Check-ins Tab */}
        <TabsContent value="checkins" className="animate-fade-in">
          <CheckInsTab />
        </TabsContent>

        {/* Salvos Tab */}
        <TabsContent value="salvos" className="animate-fade-in">
          <SavedEventsTab />
        </TabsContent>

        {/* Seguindo Tab */}
        <TabsContent value="seguindo" className="animate-fade-in">
          <FollowingTab />
        </TabsContent>

        {/* Config Tab */}
        <TabsContent value="config" className="animate-fade-in">
          <ProfileSettings profile={profile} onProfileUpdate={onProfileUpdate} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
