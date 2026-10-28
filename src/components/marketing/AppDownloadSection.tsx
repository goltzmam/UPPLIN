const stores = [
  { name: "App Store", badge: "/badges/app-store.svg", url: import.meta.env.VITE_APP_STORE_URL || "" },
  { name: "Google Play", badge: "/badges/google-play.png", url: import.meta.env.VITE_GOOGLE_PLAY_URL || "" },
];
export function AppDownloadSection() {
  return <section className="border-t border-white/10 bg-[#08080a] py-20 px-6" aria-labelledby="download-title">
    <div className="mx-auto max-w-3xl text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">UPPLIN no seu celular</p>
      <h2 id="download-title" className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight">Sua próxima experiência vai com você.</h2>
      <p className="mx-auto mt-4 max-w-xl text-sm sm:text-base text-muted-foreground">Encontre eventos, acompanhe seus ingressos e conecte-se com a comunidade. Os links para baixar o aplicativo estarão disponíveis após a publicação nas lojas.</p>
      <div className="mt-8 flex flex-wrap items-start justify-center gap-5">
        {stores.map(store => <div key={store.name} className="flex flex-col items-center gap-3">
          {store.url ? <a href={store.url} target="_blank" rel="noopener noreferrer" aria-label={`Baixar UPPLIN na ${store.name}`} className="flex h-16 w-48 items-center justify-center rounded-xl border border-white/10 bg-black hover:border-primary/50 transition-colors"><img src={store.badge} alt={store.name} className="max-h-12 max-w-[168px]" /></a> :
            <button type="button" disabled aria-label={`${store.name}: em breve`} className="flex h-16 w-48 items-center justify-center rounded-xl border border-white/10 bg-black opacity-70"><img src={store.badge} alt={store.name} className="max-h-12 max-w-[168px]" /></button>}
          <span className="text-xs text-zinc-500">{store.url ? "Disponível para download" : "Em breve"}</span>
        </div>)}
      </div>
    </div>
  </section>;
}
