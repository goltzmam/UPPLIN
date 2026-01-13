import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MapPin, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SearchBar() {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/eventos?q=${encodeURIComponent(search.trim())}`);
    }
  };

  return (
    <section className="relative -mt-8 z-20">
      <div className="container">
        <form
          onSubmit={handleSearch}
          className="bg-background rounded-2xl shadow-xl border border-border p-4 md:p-6"
        >
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar eventos, shows, festas..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-12 h-14 text-lg border-0 bg-muted/50 focus-visible:ring-2"
              />
            </div>

            {/* Location */}
            <div className="relative md:w-64">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Localização"
                className="pl-12 h-14 text-lg border-0 bg-muted/50 focus-visible:ring-2"
              />
            </div>

            {/* Date */}
            <div className="relative md:w-48">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Data"
                className="pl-12 h-14 text-lg border-0 bg-muted/50 focus-visible:ring-2"
              />
            </div>

            {/* Submit */}
            <Button type="submit" size="lg" className="h-14 px-8 text-lg">
              Buscar
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
