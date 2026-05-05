import { Check, X } from "lucide-react";
import { getPasswordRequirementStates } from "@/lib/validation";

interface PasswordRequirementsChecklistProps {
  password: string;
  /** When provided, adds an extra "as senhas conferem" requirement. */
  confirmPassword?: string;
  /** Show the confirm-match row even when confirmPassword is empty. Defaults to true when confirmPassword prop is passed. */
  showConfirmRow?: boolean;
}

export function PasswordRequirementsChecklist({
  password,
  confirmPassword,
  showConfirmRow,
}: PasswordRequirementsChecklistProps) {
  const requirementStates = getPasswordRequirementStates(password);
  const hasStartedTyping = password.length > 0;

  const includeConfirmRow =
    typeof confirmPassword === "string" && (showConfirmRow ?? true);

  const confirmStarted = (confirmPassword?.length ?? 0) > 0;
  const confirmMet =
    includeConfirmRow &&
    password.length > 0 &&
    confirmPassword === password;

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
        {includeConfirmRow && (
          <li
            className={`flex items-center gap-2 ${
              !confirmStarted
                ? "text-muted-foreground"
                : confirmMet
                  ? "text-success"
                  : "text-destructive"
            }`}
          >
            {confirmStarted ? (
              confirmMet ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />
            ) : (
              <span className="block h-3.5 w-3.5 rounded-full border border-border" aria-hidden="true" />
            )}
            <span>As senhas conferem</span>
          </li>
        )}
      </ul>
    </div>
  );
}
