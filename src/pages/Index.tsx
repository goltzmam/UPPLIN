import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { BottomNav } from "@/components/layout/BottomNav";
import { TikTokDesktopSidebar } from "@/components/layout/TikTokDesktopSidebar";
import { TikTokFeed } from "@/components/feed/TikTokFeed";
import { DesktopTikTokFeed } from "@/components/feed/DesktopTikTokFeed";
import { FeedSearch } from "@/components/feed/FeedSearch";
import { FollowingFeed } from "@/components/home/FollowingFeed";
import { LocationPrompt } from "@/components/location/LocationPrompt";
import { CityChangePrompt } from "@/components/location/CityChangePrompt";
import { ProfileCityBanner } from "@/components/location/ProfileCityBanner";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { stopAllMediaPipelines } from "@/lib/media";
import { prioritizeUnseenEvents, markEventsSeen } from "@/lib/seen-events";
import { useUserLocation } from "@/hooks/use-user-location";
import { haversineKm, normalizeCity } from "@/lib/geo";
import heroEvents from "@/assets/hero-events.jpg";

const PROFILE_BANNER_DISMISS_KEY = "upplin_profile_city_banner_dismissed";
const PROFILE_BANNER_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

const PAGE_SIZE = 12;

export default function Index() {
  const [activeTab, setActiveTab] = useState<"foryou" | "following">("foryou");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const scrollPosRef = useRef(0);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, profile, loading: authLoading } = useAuth();

  // CPF é obrigatório apenas para compra de ingressos — não força redirecionamento aqui.
  // O usuário pode navegar livremente pelo feed sem CPF.

  // ─── Location: priority Manual > GPS > Profile > Default ─────────────
  const {
    coords,
    activeCity,
    pendingCity,
    shouldShowPermissionPrompt,
    requesting,
    requestLocation,
    dismissPrompt,
    acceptPendingCity,
    dismissPendingCity,
  } = useUserLocation({
    profileCity: profile?.city ?? null,
    profileState: profile?.state ?? null,
  });

  // Profile-city banner: only for logged-in users with no city set
  const [profileBannerVisible, setProfileBannerVisible] = useState(false);
  useEffect(() => {
    if (!user) return setProfileBannerVisible(false);
    if (profile?.city) return setProfileBannerVisible(false);
    try {
      const raw = localStorage.getItem(PROFILE_BANNER_DISMISS_KEY);
      if (raw && Date.now() - Number(raw) < PROFILE_BANNER_TTL_MS) return;
    } catch { /* ignore */ }
    // small delay so it doesn't appear at the same time as GPS prompt
    const t = setTimeout(() => setProfileBannerVisible(true), 4000);
    return () => clearTimeout(t);
  }, [user, profile?.city]);

  const dismissProfileBanner = useCallback(() => {
    try {
      localStorage.setItem(PROFILE_BANNER_DISMISS_KEY, String(Date.now()));
    } catch { /* ignore */ }
    setProfileBannerVisible(false);
  }, []);

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ["homepage-events-infinite"],
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error, count } = await supabase
        .from("events")
        .select(`
          *,
          organizer:organizer_id(id, display_name, logo_url, slug),
          event_media(id, url, type, sort_order),
          ticket_types(price_cents)
        `, { count: "exact" })
        .eq("status", "published")
        .order("start_at", { ascending: true })
        .range(from, to);
      if (error) throw error;
      return {
        data: data || [],
        nextPage: (data?.length || 0) === PAGE_SIZE ? pageParam + 1 : undefined,
        totalCount: count || 0
      };
    },
    getNextPageParam: lastPage => lastPage.nextPage,
    initialPageParam: 0
  });

  const events = data?.pages.flatMap(page => page.data) || [];

  // Local fallback image for events without uploaded media
  const DEMO_COVER_URLS = [heroEvents];

  const rawFeedItems = events.map((event: any, index: number) => {
    const videoMedia = event.event_media?.find((m: any) => m.type === "video");
    const minPrice = event.ticket_types?.length > 0
      ? Math.min(...event.ticket_types.map((t: any) => t.price_cents))
      : 0;
    const coverImageUrl = event.cover_image_url || DEMO_COVER_URLS[index % DEMO_COVER_URLS.length];
    const videoUrl = videoMedia?.url || null;

    return {
      id: event.id,
      slug: event.slug,
      title: event.title,
      coverImageUrl,
      videoUrl,
      startAt: event.start_at,
      endAt: event.end_at,
      venueName: event.venue_name,
      addressText: event.address_text,
      organizerName: event.organizer?.display_name,
      organizerSlug: event.organizer?.slug,
      organizerAvatar: event.organizer?.logo_url,
      organizerId: event.organizer_id,
      minPrice,
      // location data used for proximity sorting (not rendered)
      _lat: typeof event.lat === "number" ? event.lat : null,
      _lng: typeof event.lng === "number" ? event.lng : null,
    };
  });

  // Step 1: prioritize unseen events
  const baseFeedItems = prioritizeUnseenEvents(rawFeedItems);

  // Step 2: re-rank by proximity to the user.
  // Priority: events near GPS coords (≤80km) > events whose address mentions
  // the active city > everything else (preserves the unseen-first order).
  const feedItems = useMemo(() => {
    if (!baseFeedItems.length) return baseFeedItems;
    const cityNeedle = activeCity?.city ? normalizeCity(activeCity.city) : "";
    const hasGps = !!coords;
    if (!hasGps && !cityNeedle) return baseFeedItems;

    const near: typeof baseFeedItems = [];
    const cityMatch: typeof baseFeedItems = [];
    const rest: typeof baseFeedItems = [];

    for (const item of baseFeedItems) {
      let matchedNear = false;
      if (hasGps && item._lat != null && item._lng != null) {
        const dist = haversineKm(coords!.lat, coords!.lng, item._lat, item._lng);
        if (dist <= 80) {
          near.push(item);
          matchedNear = true;
        }
      }
      if (matchedNear) continue;
      if (cityNeedle) {
        const haystack = normalizeCity(
          `${item.addressText ?? ""} ${item.venueName ?? ""}`
        );
        if (haystack && haystack.includes(cityNeedle)) {
          cityMatch.push(item);
          continue;
        }
      }
      rest.push(item);
    }
    return [...near, ...cityMatch, ...rest];
  }, [baseFeedItems, coords?.lat, coords?.lng, activeCity?.city]);

  // Mark the first few visible events as seen after data loads
  useEffect(() => {
    if (feedItems.length > 0) {
      // Mark the first 3 events as seen immediately (user will see them on load)
      const firstBatch = feedItems.slice(0, 3).map(e => e.id);
      markEventsSeen(firstBatch);
    }
  }, [feedItems.length > 0 && feedItems[0]?.id]);

  const handleRefresh = useCallback(async () => {
    await queryClient.removeQueries({ queryKey: ["homepage-events-infinite"] });
    await new Promise(resolve => setTimeout(resolve, 400));
  }, [queryClient]);

  // Shared Header Component for both mobile and desktop
  const openSearch = useCallback(() => {
    setIsSearchOpen(true);
  }, []);

  const FeedHeader = ({ isDesktop = false }: { isDesktop?: boolean }) => (
    <div className={cn(
      "absolute top-0 left-0 right-0 z-30 pointer-events-none"
    )}>
      <div className="h-[env(safe-area-inset-top,0px)]" />
      
      <div className={cn(
        "flex items-center justify-between px-3 py-3 pointer-events-auto transition-colors duration-300",
        isDesktop && "px-5 md:px-6 lg:px-8 xl:px-10",
        activeTab === "following" && "bg-background"
      )}>
        {/* Logo left - with gradient - larger on mobile/tablet */}
        <Link 
          to="/" 
          className={cn(
            "font-display text-xl md:text-2xl font-bold tracking-tight shrink-0 transition-colors",
            isDesktop && "hidden" // Hide on desktop since sidebar has logo
          )}
          style={{ 
            background: "linear-gradient(135deg, #FF6A00, #FF2D2D, #FF007A)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}
        >
          UPPLIN
        </Link>
        
        {/* Centered tabs */}
        <div className={cn("flex items-center gap-4", isDesktop ? "mx-auto" : "mx-4")}>
          <button 
            onClick={() => {
              stopAllMediaPipelines();
              setActiveTab("following");
            }} 
            className={cn(
              "relative py-0.5 text-[13px] font-medium transition-all whitespace-nowrap",
              activeTab === "following" 
                ? "text-foreground" 
                : "text-white/50"
            )}
          >
            Seguindo
            {activeTab === "following" && (
              <motion.div 
                layoutId="tab-underline" 
                className="absolute -bottom-0.5 left-0 right-0 h-[1.5px] bg-foreground rounded-full" 
                transition={{ type: "spring", stiffness: 500, damping: 35 }} 
              />
            )}
          </button>
          <button 
            onClick={() => setActiveTab("foryou")} 
            className={cn(
              "relative py-0.5 text-[13px] font-medium transition-all whitespace-nowrap",
              activeTab === "foryou" 
                ? "text-white" 
                : activeTab === "following" 
                  ? "text-muted-foreground" 
                  : "text-white/50"
            )}
          >
            Para você
            {activeTab === "foryou" && (
              <motion.div 
                layoutId="tab-underline" 
                className="absolute -bottom-0.5 left-0 right-0 h-[1.5px] bg-white rounded-full" 
                transition={{ type: "spring", stiffness: 500, damping: 35 }} 
              />
            )}
          </button>
        </div>

        {/* Search button right */}
        <button
          type="button"
          onClick={openSearch}
          aria-label="Buscar"
          className={cn(
            "shrink-0 h-9 w-9 flex items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 transition-colors",
            isDesktop && "mr-[clamp(24px,4vw,72px)]"
          )}
        >
          <Search className="h-5 w-5" strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );

  // =====================================================================
  // MOBILE: Fullscreen TikTok-style feed - Simplified transitions
  // =====================================================================
  const MobileFeed = () => (
    <div className="fixed inset-0 z-0 lg:hidden w-full h-full overflow-hidden">
      {/* For You feed - always rendered, visibility controlled by CSS */}
      <div 
        className={cn(
          "absolute inset-0 h-full w-full transition-opacity duration-150",
          activeTab === "foryou" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
        )}
      >
        <TikTokFeed 
          items={feedItems} 
          isLoading={isLoading} 
          onLoadMore={fetchNextPage} 
          hasMore={!!hasNextPage} 
          isLoadingMore={isFetchingNextPage} 
          scrollPosition={scrollPosRef.current} 
          onScrollChange={pos => { scrollPosRef.current = pos; }} 
          onRefresh={handleRefresh} 
          isVisible={activeTab === "foryou" && !isSearchOpen}
        />
      </div>

      {/* Following feed - always rendered, visibility controlled by CSS */}
      <div 
        className={cn(
          "absolute inset-0 h-full w-full bg-background overflow-y-auto scrollbar-hide pb-20 transition-opacity duration-150",
          activeTab === "following" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
        )}
      >
        <div className="pt-24">
          <FollowingFeed />
        </div>
      </div>

      <FeedHeader />
    </div>
  );

  // =====================================================================
  // DESKTOP/TABLET: TikTok-style layout with minimal sidebar
  // =====================================================================
  const DesktopLayout = () => (
    <div className="hidden lg:block h-screen w-full bg-background">
      {/* Left Sidebar - Fixed TikTok style */}
      <TikTokDesktopSidebar />

      {/* Main Content - Offset for fixed sidebar */}
      <main className="h-full ml-[72px] relative">
        {/* For You feed - always rendered, visibility controlled by CSS */}
        <div 
          className={cn(
            "absolute inset-0 h-full transition-opacity duration-150",
            activeTab === "foryou" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
          )}
        >
          <DesktopTikTokFeed
            items={feedItems}
            isLoading={isLoading}
            onLoadMore={fetchNextPage}
            hasMore={!!hasNextPage}
            isLoadingMore={isFetchingNextPage}
            onRefresh={handleRefresh}
            isVisible={activeTab === "foryou" && !isSearchOpen}
          />
        </div>

        {/* Following feed - always rendered, visibility controlled by CSS */}
        <div 
          className={cn(
            "absolute inset-0 h-full bg-background overflow-y-auto scrollbar-hide transition-opacity duration-150",
            activeTab === "following" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
          )}
        >
          <div className="max-w-2xl mx-auto py-20 px-4">
            <FollowingFeed />
          </div>
        </div>

        {/* Header overlay */}
        <FeedHeader isDesktop />
      </main>
    </div>
  );

  return (
    <>
      <Helmet>
        <title>UPPLIN — Descubra e Compre Ingressos para os Melhores Eventos</title>
        <meta name="description" content="Feed social de eventos do Brasil: shows, festas, conferências e experiências. Descubra perto de você e compre ingressos em segundos." />
        <link rel="canonical" href="https://upplin.com/" />
        <meta property="og:title" content="UPPLIN — Descubra os melhores eventos do Brasil" />
        <meta property="og:description" content="Feed social de eventos: shows, festas, conferências e experiências únicas." />
        <meta property="og:url" content="https://upplin.com/" />
        <meta property="og:type" content="website" />
      </Helmet>
      <h1 className="sr-only">UPPLIN — Descubra os melhores eventos do Brasil</h1>
      <MobileFeed />
      <DesktopLayout />
      <BottomNav />
      <FeedSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      {/* Location prompts — non-blocking, dismissible */}
      <LocationPrompt
        visible={shouldShowPermissionPrompt && !isSearchOpen}
        requesting={requesting}
        onAllow={() => requestLocation()}
        onDismiss={dismissPrompt}
      />
      <CityChangePrompt
        detectedCity={pendingCity?.city ?? null}
        onConfirm={acceptPendingCity}
        onDismiss={dismissPendingCity}
      />
      <ProfileCityBanner
        visible={
          profileBannerVisible &&
          !shouldShowPermissionPrompt &&
          !pendingCity &&
          !isSearchOpen
        }
        onDismiss={dismissProfileBanner}
      />
    </>
  );
}
