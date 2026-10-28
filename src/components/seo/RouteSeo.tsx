import { Capacitor } from "@capacitor/core";
import { webSurface, ADMIN_ORIGIN } from "@/lib/web-surfaces";
import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import { PUBLIC_PAGES, SITE_URL, SOCIAL_IMAGE } from "@/lib/seo";

export function RouteSeo() {
  const { pathname, search } = useLocation();
  const surface = webSurface(window.location.hostname, Capacitor.isNativePlatform());
  const page = PUBLIC_PAGES.find(p => p.path === (surface === "plans" ? "/planos/organizador" : pathname));
  if (surface === "admin") return <Helmet><title>Administração | UPPLIN</title><meta name="robots" content="noindex,nofollow" /><link rel="canonical" href={ADMIN_ORIGIN + pathname} /></Helmet>;
  const dynamic = pathname.startsWith("/evento/") || pathname.startsWith("/o/");
  const indexable = Boolean(page || dynamic) && !search;
  return <Helmet>
    <meta name="robots" content={indexable ? "index,follow,max-image-preview:large" : "noindex,follow"} />
    {page && <title>{page.title}</title>}
    {page && <meta name="description" content={page.description} />}
    {page && <link rel="canonical" href={(page.canonicalUrl || SITE_URL + page.path)} />}
    {page && <meta property="og:title" content={page.title} />}
    {page && <meta property="og:description" content={page.description} />}
    {page && <meta property="og:url" content={(page.canonicalUrl || SITE_URL + page.path)} />}
    <meta property="og:image" content={SOCIAL_IMAGE} />
    <meta property="og:image:alt" content="UPPLIN — Eventos, shows e experiências perto de você" />
    {page && <meta name="twitter:title" content={page.title} />}
    {page && <meta name="twitter:description" content={page.description} />}
    <meta name="twitter:image" content={SOCIAL_IMAGE} />
  </Helmet>;
}
