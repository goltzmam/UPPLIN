import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";

interface City {
  name: string;
  slug: string;
  image: string;
}

const cities: City[] = [
  {
    name: "São Paulo",
    slug: "sao-paulo",
    image: "https://images.unsplash.com/photo-1543059080-f9b1272213d5?w=400&q=80",
  },
  {
    name: "Rio de Janeiro",
    slug: "rio-de-janeiro",
    image: "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=400&q=80",
  },
  {
    name: "Belo Horizonte",
    slug: "belo-horizonte",
    image: "https://images.unsplash.com/photo-1598135753163-6167c1a1ad65?w=400&q=80",
  },
  {
    name: "Salvador",
    slug: "salvador",
    image: "https://images.unsplash.com/photo-1548963670-aaaa8f73a5e3?w=400&q=80",
  },
  {
    name: "Porto Alegre",
    slug: "porto-alegre",
    image: "https://images.unsplash.com/photo-1619546952812-520e98064a52?w=400&q=80",
  },
];

export function CitySelector() {
  return (
    <section className="py-12 bg-muted/30">
      <div className="container">
        <div className="text-center mb-8">
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-2">
            O melhor de cada cidade
          </h2>
          <p className="text-muted-foreground">
            Descubra eventos incríveis perto de você
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {cities.map((city, index) => (
            <Link
              key={city.slug}
              to={`/eventos?cidade=${city.slug}`}
              className="group relative aspect-[4/3] rounded-2xl overflow-hidden animate-fade-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <img
                src={city.image}
                alt={city.name}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute inset-0 flex flex-col items-center justify-end p-4 text-center">
                <MapPin className="h-5 w-5 text-white/80 mb-1 transition-transform group-hover:-translate-y-1" />
                <span className="font-display font-bold text-white text-lg">
                  {city.name}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
