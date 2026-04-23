import { Check, X } from "lucide-react";
import { getPasswordRequirementStates } from "@/lib/validation";

interface PasswordRequirementsChecklistProps {
  password: string;
}

export function PasswordRequirementsChecklist({ password }: PasswordRequirementsChecklistProps) {
  const requirementStates = getPasswordRequirementStates(password);
  const hasStartedTyping = password.length > 0;

  return (
    <div className="rounded-xl border border-border bg-muted/40 px-3 py-3">
      <p className="text-xs font-medium text-foreground">Sua senha deve ter:</p>
      <ul className="mt-2 space-y-1.5 text-xs">
        {requirementStates.map((requirement) => {
          const statusClass = !hasStartedTyping
            ? "text-muted-foreground"
            : requirement.met
              ? "text-success"
              : "text-destructive";

          return (
            <li key={requirement.label} className={`flex items-center gap-2 ${statusClass}`}>
              {hasStartedTyping ? (
                requirement.met ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />
              ) : (
                <span className="block h-3.5 w-3.5 rounded-full border border-border" aria-hidden="true" />
              )}
              <span>{requirement.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}