import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BadgeCheck, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface Organizer {
  id: string;
  display_name: string;
  logo_url: string | null;
  slug: string | null;
  eventCount?: number;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  disabled?: boolean;
  minHeight?: string;
}

export function MentionInput({
  value,
  onChange,
  placeholder = "Escreva algo...",
  className,
  onKeyDown,
  disabled,
  minHeight = "100px",
}: MentionInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const [mentionStart, setMentionStart] = useState(-1);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Search for organizers
  const { data: organizers = [], isLoading } = useQuery({
    queryKey: ["organizers-search", searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 1) return [];

      const { data, error } = await supabase
        .from("organizer_accounts_public")
        .select("id, display_name, logo_url, slug")
        .or(`display_name.ilike.%${searchTerm}%,slug.ilike.%${searchTerm}%`)
        .limit(5);

      if (error) throw error;

      // Get event counts
      const organizerIds = data?.map((o) => o.id) || [];
      const { data: eventCounts } = await supabase
        .from("events")
        .select("organizer_id")
        .in("organizer_id", organizerIds)
        .eq("status", "published");

      const countMap = new Map<string, number>();
      eventCounts?.forEach((e) => {
        countMap.set(e.organizer_id, (countMap.get(e.organizer_id) || 0) + 1);
      });

      return (data || []).map((o) => ({
        ...o,
        eventCount: countMap.get(o.id) || 0,
      })) as Organizer[];
    },
    enabled: showSuggestions && searchTerm.length >= 1,
  });

  // Detect @ mentions while typing
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      const cursor = e.target.selectionStart || 0;

      onChange(newValue);
      setCursorPosition(cursor);

      // Find if we're in the middle of typing a mention
      const textBeforeCursor = newValue.slice(0, cursor);
      const lastAtIndex = textBeforeCursor.lastIndexOf("@");

      if (lastAtIndex >= 0) {
        const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
        // Check if there's no space after @ (still typing mention)
        if (!textAfterAt.includes(" ") && !textAfterAt.includes("\n")) {
          setMentionStart(lastAtIndex);
          setSearchTerm(textAfterAt);
          setShowSuggestions(true);
          setSelectedIndex(0);
          return;
        }
      }

      setShowSuggestions(false);
      setMentionStart(-1);
    },
    [onChange]
  );

  // Handle keyboard navigation in suggestions
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (showSuggestions && organizers.length > 0) {
        switch (e.key) {
          case "ArrowDown":
            e.preventDefault();
            setSelectedIndex((prev) =>
              prev < organizers.length - 1 ? prev + 1 : 0
            );
            return;
          case "ArrowUp":
            e.preventDefault();
            setSelectedIndex((prev) =>
              prev > 0 ? prev - 1 : organizers.length - 1
            );
            return;
          case "Tab":
          case "Enter":
            if (organizers[selectedIndex]) {
              e.preventDefault();
              insertMention(organizers[selectedIndex]);
              return;
            }
            break;
          case "Escape":
            e.preventDefault();
            setShowSuggestions(false);
            return;
        }
      }

      onKeyDown?.(e);
    },
    [showSuggestions, organizers, selectedIndex, onKeyDown]
  );

  // Insert the selected mention
  const insertMention = useCallback(
    (organizer: Organizer) => {
      if (mentionStart < 0) return;

      const mention = `@${organizer.slug || organizer.display_name.toLowerCase().replace(/\s+/g, "")}`;
      const beforeMention = value.slice(0, mentionStart);
      const afterCursor = value.slice(cursorPosition);
      const newValue = `${beforeMention}${mention} ${afterCursor}`;

      onChange(newValue);
      setShowSuggestions(false);
      setMentionStart(-1);

      // Focus and set cursor after mention
      setTimeout(() => {
        if (textareaRef.current) {
          const newPosition = mentionStart + mention.length + 1;
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newPosition, newPosition);
        }
      }, 0);
    },
    [mentionStart, cursorPosition, value, onChange]
  );

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn("resize-none", className)}
        style={{ minHeight }}
        disabled={disabled}
      />

      {/* Mention Suggestions Dropdown */}
      <AnimatePresence>
        {showSuggestions && (
          <motion.div
            ref={suggestionsRef}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full mt-1 z-50 bg-popover border border-border rounded-lg shadow-xl overflow-hidden"
          >
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : organizers.length === 0 ? (
              <div className="px-4 py-3 text-sm text-muted-foreground">
                {searchTerm.length > 0
                  ? "Nenhum organizador encontrado"
                  : "Digite para buscar organizadores"}
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto">
                {organizers.map((organizer, index) => (
                  <button
                    key={organizer.id}
                    type="button"
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                      index === selectedIndex
                        ? "bg-accent/20"
                        : "hover:bg-muted"
                    )}
                    onClick={() => insertMention(organizer)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <Avatar className="h-9 w-9 border border-border">
                      <AvatarImage src={organizer.logo_url || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary text-sm">
                        {organizer.display_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-sm truncate">
                          {organizer.display_name}
                        </span>
                        {organizer.eventCount && organizer.eventCount >= 5 && (
                          <BadgeCheck className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        @{organizer.slug || organizer.display_name.toLowerCase().replace(/\s+/g, "")}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="px-3 py-2 bg-muted/50 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Use <kbd className="px-1 py-0.5 bg-background rounded text-[10px]">↑</kbd>{" "}
                <kbd className="px-1 py-0.5 bg-background rounded text-[10px]">↓</kbd> para navegar,{" "}
                <kbd className="px-1 py-0.5 bg-background rounded text-[10px]">Enter</kbd> para selecionar
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper to render text with highlighted mentions
export function renderTextWithMentions(
  text: string,
  onMentionClick?: (slug: string) => void
) {
  const mentionRegex = /@(\w+)/g;
  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    // Add text before the mention
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    // Add the mention as a styled element
    const slug = match[1];
    parts.push(
      <button
        key={`${match.index}-${slug}`}
        onClick={(e) => {
          e.stopPropagation();
          onMentionClick?.(slug);
        }}
        className="text-accent hover:underline font-medium cursor-pointer"
      >
        @{slug}
      </button>
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}
