import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { Download, BarChart3, Clock, CalendarIcon, TrendingUp, Trophy, Zap } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface CheckInReportProps {
  eventId: string;
  eventTitle: string;
  organizerId: string;
}

export function CheckInReport({ eventId, eventTitle, organizerId }: CheckInReportProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const { data: tickets = [] } = useQuery({
    queryKey: ["checkin-report-tickets", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("id, status, used_at, checked_in_by, ticket_types(name), profiles:buyer_user_id(full_name, email)")
        .eq("event_id", eventId)
        .eq("status", "used")
        .order("used_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: collaborators = [] } = useQuery({
    queryKey: ["checkin-report-collabs", organizerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checkin_collaborators")
        .select("id, user_id, display_name")
        .eq("organizer_id", organizerId);
      if (error) throw error;
      return data || [];
    },
  });

  // Unique dates with check-ins
  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    tickets.forEach((t: any) => {
      if (t.used_at) dates.add(format(new Date(t.used_at), "yyyy-MM-dd"));
    });
    return [...dates].sort();
  }, [tickets]);

  const isMultiDay = availableDates.length > 1;

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    if (!selectedDate) return tickets;
    return tickets.filter((t: any) => {
      if (!t.used_at) return false;
      return isSameDay(new Date(t.used_at), selectedDate);
    });
  }, [tickets, selectedDate]);

  // Chart data: check-ins per hour
  const hourlyData = useMemo(() => {
    const hours: Record<string, number> = {};
    filteredTickets.forEach((t: any) => {
      if (!t.used_at) return;
      const hour = format(new Date(t.used_at), "HH:00");
      hours[hour] = (hours[hour] || 0) + 1;
    });
    return Object.entries(hours)
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour.localeCompare(b.hour));
  }, [filteredTickets]);

  // Stats per collaborator
  const collabData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTickets.forEach((t: any) => {
      const key = t.checked_in_by || "organizer";
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).map(([userId, count]) => {
      const collab = collaborators.find((c) => c.user_id === userId);
      return { name: collab?.display_name || "Organizador", count };
    }).sort((a, b) => b.count - a.count);
  }, [filteredTickets, collaborators]);

  // Day comparison data (only for multi-day events)
  const dayComparisonData = useMemo(() => {
    if (availableDates.length <= 1) return null;

    const days = availableDates.map((d) => {
      const date = new Date(d + "T12:00:00");
      const dayTickets = tickets.filter((t: any) => t.used_at && isSameDay(new Date(t.used_at), date));

      // Find peak hour
      const hourCounts: Record<string, number> = {};
      dayTickets.forEach((t: any) => {
        const hour = format(new Date(t.used_at), "HH:00");
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });
      const peakEntry = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
      const uniqueHours = Object.keys(hourCounts).length;
      const avgPerHour = uniqueHours > 0 ? dayTickets.length / uniqueHours : 0;

      // Time span between first and last check-in
      const timestamps = dayTickets.map((t: any) => new Date(t.used_at).getTime()).sort((a, b) => a - b);
      const spanMinutes = timestamps.length >= 2 ? Math.round((timestamps[timestamps.length - 1] - timestamps[0]) / 60000) : 0;
      const spanLabel = spanMinutes >= 60
        ? `${Math.floor(spanMinutes / 60)}h${spanMinutes % 60 > 0 ? `${spanMinutes % 60}m` : ""}`
        : `${spanMinutes}m`;

      return {
        date: d,
        label: format(date, "EEE dd/MM", { locale: ptBR }),
        shortLabel: format(date, "dd/MM"),
        count: dayTickets.length,
        peakHour: peakEntry?.[0] || "—",
        peakCount: peakEntry?.[1] || 0,
        avgPerHour: Math.round(avgPerHour * 10) / 10,
        spanMinutes,
        spanLabel,
      };
    });

    const maxDay = days.reduce((a, b) => (a.count > b.count ? a : b));
    const totalAvgPerHour = Math.round(days.reduce((s, d) => s + d.avgPerHour, 0) / days.length * 10) / 10;
    const avgSpanMinutes = Math.round(days.reduce((s, d) => s + d.spanMinutes, 0) / days.length);
    const avgSpanLabel = avgSpanMinutes >= 60
      ? `${Math.floor(avgSpanMinutes / 60)}h${avgSpanMinutes % 60 > 0 ? `${avgSpanMinutes % 60}m` : ""}`
      : `${avgSpanMinutes}m`;

    return { days, maxDay, totalAvgPerHour, avgSpanLabel };
  }, [tickets, availableDates]);

  const exportCSV = () => {
    const header = "Nome,Email,Tipo Ingresso,Horário Check-in,Validado por\n";
    const rows = filteredTickets.map((t: any) => {
      const collabName = collaborators.find((c) => c.user_id === t.checked_in_by)?.display_name || "Organizador";
      return [
        `"${t.profiles?.full_name || ""}"`,
        `"${t.profiles?.email || ""}"`,
        `"${t.ticket_types?.name || ""}"`,
        t.used_at ? format(new Date(t.used_at), "dd/MM/yyyy HH:mm:ss") : "",
        `"${collabName}"`,
      ].join(",");
    });
    const csv = header + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const dateSuffix = selectedDate ? format(selectedDate, "yyyyMMdd") : format(new Date(), "yyyyMMdd");
    a.download = `checkin-${eventTitle.replace(/\s+/g, "-").toLowerCase()}-${dateSuffix}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Dates that have check-ins (for calendar highlighting)
  const datesWithCheckins = useMemo(() => {
    return availableDates.map((d) => new Date(d + "T12:00:00"));
  }, [availableDates]);

  if (tickets.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Relatório de Check-ins
          </CardTitle>
          <div className="flex items-center gap-2">
            {isMultiDay && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {selectedDate ? format(selectedDate, "dd/MM", { locale: ptBR }) : "Todos os dias"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    locale={ptBR}
                    modifiers={{ hasCheckins: datesWithCheckins }}
                    modifiersClassNames={{ hasCheckins: "bg-primary/15 font-bold" }}
                    className={cn("p-3 pointer-events-auto")}
                  />
                  {selectedDate && (
                    <div className="px-3 pb-3">
                      <Button size="sm" variant="ghost" className="w-full text-xs" onClick={() => setSelectedDate(undefined)}>
                        Limpar filtro
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            )}
            <Button size="sm" variant="outline" onClick={exportCSV} className="gap-1.5 text-xs h-8">
              <Download className="h-3.5 w-3.5" />
              CSV
            </Button>
          </div>
        </div>
        {/* Day pills for quick selection */}
        {isMultiDay && (
          <div className="flex gap-1.5 flex-wrap mt-2">
            <Badge
              variant={!selectedDate ? "default" : "outline"}
              className="cursor-pointer text-[11px]"
              onClick={() => setSelectedDate(undefined)}
            >
              Todos ({tickets.length})
            </Badge>
            {availableDates.map((d) => {
              const date = new Date(d + "T12:00:00");
              const count = tickets.filter((t: any) => t.used_at && isSameDay(new Date(t.used_at), date)).length;
              const isActive = selectedDate && isSameDay(selectedDate, date);
              return (
                <Badge
                  key={d}
                  variant={isActive ? "default" : "outline"}
                  className="cursor-pointer text-[11px]"
                  onClick={() => setSelectedDate(isActive ? undefined : date)}
                >
                  {format(date, "dd/MM", { locale: ptBR })} ({count})
                </Badge>
              );
            })}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Day comparison section - only when viewing all days */}
        {dayComparisonData && !selectedDate && (
          <div className="space-y-3">
            <p className="text-sm font-medium flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Comparativo entre dias
            </p>

            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border bg-primary/10 border-primary/20 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Trophy className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[11px] font-medium text-primary">Dia com mais check-ins</span>
                </div>
                <p className="text-lg font-bold">{dayComparisonData.maxDay.count}</p>
                <p className="text-xs text-muted-foreground">{dayComparisonData.maxDay.label}</p>
              </div>
              <div className="rounded-lg border bg-accent/50 border-accent p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Zap className="h-3.5 w-3.5 text-accent-foreground" />
                  <span className="text-[11px] font-medium text-accent-foreground">Horário de pico geral</span>
                </div>
                <p className="text-lg font-bold">{dayComparisonData.maxDay.peakHour}</p>
                <p className="text-xs text-muted-foreground">{dayComparisonData.maxDay.peakCount} check-ins nesse horário</p>
              </div>
              <div className="rounded-lg border bg-secondary/50 border-secondary p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <BarChart3 className="h-3.5 w-3.5 text-secondary-foreground" />
                  <span className="text-[11px] font-medium text-secondary-foreground">Média por hora</span>
                </div>
                <p className="text-lg font-bold">{dayComparisonData.totalAvgPerHour}</p>
                <p className="text-xs text-muted-foreground">check-ins/hora (média)</p>
              </div>
              <div className="rounded-lg border bg-muted/50 border-border p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[11px] font-medium text-muted-foreground">Duração média</span>
                </div>
                <p className="text-lg font-bold">{dayComparisonData.avgSpanLabel}</p>
                <p className="text-xs text-muted-foreground">entre 1º e último check-in</p>
              </div>
            </div>

            {/* Bar chart comparing days */}
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dayComparisonData.days}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="shortLabel" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, fontSize: 13, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                    labelFormatter={(_: any, payload: any) => payload?.[0]?.payload?.label || ""}
                    formatter={(v: number, _name: string, entry: any) => [
                      `${v} check-ins · Pico: ${entry.payload.peakHour} (${entry.payload.peakCount})`,
                      "",
                    ]}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {dayComparisonData.days.map((d, i) => (
                      <Cell
                        key={i}
                        fill={d.date === dayComparisonData.maxDay.date ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.4)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Peak hour per day table */}
            <div className="rounded-lg border overflow-hidden overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left py-1.5 px-3 font-medium">Dia</th>
                    <th className="text-right py-1.5 px-3 font-medium">Check-ins</th>
                    <th className="text-right py-1.5 px-3 font-medium">Média/h</th>
                    <th className="text-right py-1.5 px-3 font-medium">Duração</th>
                    <th className="text-right py-1.5 px-3 font-medium">Pico</th>
                  </tr>
                </thead>
                <tbody>
                  {dayComparisonData.days.map((d) => (
                    <tr key={d.date} className="border-t border-border/50">
                      <td className="py-1.5 px-3">{d.label}</td>
                      <td className="py-1.5 px-3 text-right font-medium">{d.count}</td>
                      <td className="py-1.5 px-3 text-right text-muted-foreground">{d.avgPerHour}</td>
                      <td className="py-1.5 px-3 text-right text-muted-foreground">{d.spanLabel}</td>
                      <td className="py-1.5 px-3 text-right text-muted-foreground">
                        {d.peakHour} ({d.peakCount})
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {filteredTickets.length === 0 ? (
          <p className="text-center py-6 text-sm text-muted-foreground">
            Nenhum check-in nesta data
          </p>
        ) : (
          <>
            {/* Timeline chart */}
            <div>
              <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Check-ins por horário
                {selectedDate && <span className="text-muted-foreground font-normal text-xs">({format(selectedDate, "dd/MM", { locale: ptBR })})</span>}
                <span className="text-muted-foreground font-normal">({filteredTickets.length})</span>
              </p>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="hour" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, fontSize: 13, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                      labelFormatter={(v) => `Horário: ${v}`}
                      formatter={(v: number) => [`${v} check-ins`, ""]}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Per collaborator */}
            {collabData.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Por colaborador</p>
                <div className="space-y-2">
                  {collabData.map((c, i) => {
                    const max = collabData[0].count;
                    const pct = max > 0 ? (c.count / max) * 100 : 0;
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium truncate">{c.name}</span>
                          <span className="text-muted-foreground text-xs">{c.count}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
