import { Link } from "react-router-dom";
import { ArrowRight, TrendingUp } from "lucide-react";

export function TrendingBanner() {
  return (
    <section className="py-12">
      <div className="container">
        <Link
          to="/eventos"
          className="group block relative overflow-hidden rounded-3xl"
        >
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/90 to-accent" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnY0em0wLTZ2LTRoLTJ2NGgyem0tNiA2aC00djJoNHYtMnptMC02aC00djJoNHYtMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
          
          {/* Content */}
          <div className="relative px-8 py-10 md:px-12 md:py-14 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6 text-primary-foreground">
              <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                <TrendingUp className="h-8 w-8" />
              </div>
              <div>
                <h3 className="font-display text-2xl md:text-3xl font-bold">
                  Todo mundo já garantiu. E você?
                </h3>
                <p className="text-primary-foreground/80 mt-1">
                  Confira os eventos mais buscados da semana
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-primary-foreground font-medium text-lg group-hover:gap-4 transition-all">
              <span>Ver eventos em alta</span>
              <ArrowRight className="h-5 w-5" />
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}
