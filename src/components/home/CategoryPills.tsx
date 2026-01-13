import { Link } from "react-router-dom";
import { 
  Music, 
  Presentation, 
  Palette, 
  PartyPopper, 
  GraduationCap, 
  Dumbbell,
  Users,
  Utensils,
  Baby,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
}

const categories: Category[] = [
  { id: "shows", name: "Shows", icon: Music, color: "bg-pink-500/10 text-pink-600 hover:bg-pink-500/20" },
  { id: "festas", name: "Festas", icon: PartyPopper, color: "bg-purple-500/10 text-purple-600 hover:bg-purple-500/20" },
  { id: "teatro", name: "Teatro", icon: Palette, color: "bg-orange-500/10 text-orange-600 hover:bg-orange-500/20" },
  { id: "corporativo", name: "Corporativo", icon: Presentation, color: "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20" },
  { id: "cursos", name: "Cursos", icon: GraduationCap, color: "bg-green-500/10 text-green-600 hover:bg-green-500/20" },
  { id: "esportes", name: "Esportes", icon: Dumbbell, color: "bg-red-500/10 text-red-600 hover:bg-red-500/20" },
  { id: "networking", name: "Networking", icon: Users, color: "bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20" },
  { id: "gastronomia", name: "Gastronomia", icon: Utensils, color: "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20" },
  { id: "infantil", name: "Infantil", icon: Baby, color: "bg-teal-500/10 text-teal-600 hover:bg-teal-500/20" },
  { id: "todos", name: "Ver Todos", icon: Sparkles, color: "bg-primary/10 text-primary hover:bg-primary/20" },
];

export function CategoryPills() {
  return (
    <section className="py-6 border-b border-border bg-background sticky top-16 z-40">
      <div className="container">
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((category) => (
            <Link
              key={category.id}
              to={`/eventos?categoria=${category.id}`}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-full whitespace-nowrap font-medium text-sm transition-all",
                category.color
              )}
            >
              <category.icon className="h-4 w-4" />
              {category.name}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
