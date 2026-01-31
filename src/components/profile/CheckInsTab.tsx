import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoading } from "@/components/ui/loading";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Calendar, MapPin, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";

interface CheckIn {
  id: string;
  event_id: string;
  used_at: string | null;
  ticket_type: {
    name: string;
  };
  event: {
    id: string;
    title: string;
    cover_image_url: string | null;
    venue_name: string | null;
    start_at: string;
  };
}

export function CheckInsTab() {
  const { user } = useAuth();

  const { data: checkIns = [], isLoading } = useQuery({
    queryKey: ["user-checkins", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select(`
          id,
          event_id,
          used_at,
          ticket_types:ticket_type_id (
            name
          ),
          events:event_id (
            id,
            title,
            cover_image_url,
            venue_name,
            start_at
          )
        `)
        .eq("buyer_user_id", user!.id)
        .eq("status", "used")
        .not("used_at", "is", null)
        .order("used_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((item: any) => ({
        id: item.id,
        event_id: item.event_id,
        used_at: item.used_at,
        ticket_type: item.ticket_types,
        event: item.events,
      })) as CheckIn[];
    },
    enabled: !!user,
  });

  if (isLoading) return <PageLoading />;

  if (checkIns.length === 0) {
    return (
      <EmptyState
        icon={<CheckCircle className="h-8 w-8 text-accent" />}
        title="Nenhum check-in ainda"
        description="Seus check-ins em eventos aparecerão aqui"
        variant="default"
        className="py-12"
      />
    );
  }

  return (
    <div className="space-y-3">
      {checkIns.map((checkIn) => (
        <Link key={checkIn.id} to={`/evento/${checkIn.event.id}`}>
          <Card className="bg-card border-border hover:border-primary/50 transition-colors overflow-hidden">
            <CardContent className="p-0">
              <div className="flex gap-3">
                {/* Event Image */}
                <div className="w-24 h-24 flex-shrink-0">
                  {checkIn.event.cover_image_url ? (
                    <img
                      src={checkIn.event.cover_image_url}
                      alt={checkIn.event.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <Calendar className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Event Details */}
                <div className="flex-1 py-3 pr-3">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-sm line-clamp-1">
                      {checkIn.event.title}
                    </h3>
                    <Badge
                      variant="outline"
                      className="bg-green-500/20 text-green-400 border-green-500/30 flex-shrink-0"
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Check-in
                    </Badge>
                  </div>

                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {format(new Date(checkIn.event.start_at), "dd MMM yyyy", {
                          locale: ptBR,
                        })}
                      </span>
                    </div>

                    {checkIn.event.venue_name && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span className="line-clamp-1">
                          {checkIn.event.venue_name}
                        </span>
                      </div>
                    )}

                    {checkIn.used_at && (
                      <div className="flex items-center gap-1 text-green-400">
                        <Clock className="h-3 w-3" />
                        <span>
                          Check-in às{" "}
                          {format(new Date(checkIn.used_at), "HH:mm", {
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                    )}
                  </div>

                  <Badge variant="secondary" className="mt-2 text-xs">
                    {checkIn.ticket_type?.name || "Ingresso"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
