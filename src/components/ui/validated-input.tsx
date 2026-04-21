import { forwardRef, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface ValidationRule {
  test: (value: string) => boolean;
  message?: string;
}

interface ValidatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  icon?: React.ReactNode;
  validationRules?: ValidationRule[];
  showValidation?: boolean;
  validateOnChange?: boolean;
  /** When true and type="password", shows an eye toggle to reveal the password. Defaults to true. */
  showPasswordToggle?: boolean;
}

const ValidatedInput = forwardRef<HTMLInputElement, ValidatedInputProps>(
  ({
    value,
    icon,
    validationRules = [],
    showValidation = true,
    validateOnChange = true,
    showPasswordToggle = true,
    className,
    type,
    ...props
  }, ref) => {
    const [revealed, setRevealed] = useState(false);

    const isPassword = type === "password";
    const effectiveType = isPassword && revealed ? "text" : type;
    const hasPasswordToggle = isPassword && showPasswordToggle;

    const validationState = useMemo(() => {
      if (!value || value.length === 0) return "empty";

      const allValid = validationRules.every(rule => rule.test(value));
      return allValid ? "valid" : "invalid";
    }, [value, validationRules]);

    const shouldShowIcon = showValidation && validateOnChange && value.length > 0;

    // When password toggle is visible, push validation icon further left to avoid overlap
    const validationIconPositionClass = hasPasswordToggle ? "right-10" : "right-3";
    // Reserve right padding for whatever icons are visible
    const rightPaddingClass = hasPasswordToggle && shouldShowIcon
      ? "pr-16"
      : hasPasswordToggle || shouldShowIcon
        ? "pr-10"
        : "";

    return (
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
            {icon}
          </div>
        )}
        <Input
          ref={ref}
          type={effectiveType}
          value={value}
          className={cn(
            icon ? "pl-10" : "",
            rightPaddingClass,
            validationState === "valid" && shouldShowIcon && "border-green-500 focus-visible:ring-green-500/20",
            validationState === "invalid" && shouldShowIcon && "border-destructive focus-visible:ring-destructive/20",
            className
          )}
          {...props}
        />

        {/* Password reveal toggle */}
        {hasPasswordToggle && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setRevealed(v => !v)}
            aria-label={revealed ? "Ocultar senha" : "Mostrar senha"}
            aria-pressed={revealed}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}

        <AnimatePresence>
          {shouldShowIcon && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className={cn(
                "absolute top-1/2 -translate-y-1/2 pointer-events-none",
                validationIconPositionClass
              )}
            >
              {validationState === "valid" ? (
                <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center">
                  <Check className="h-3 w-3 text-white" />
                </div>
              ) : (
                <div className="h-5 w-5 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

ValidatedInput.displayName = "ValidatedInput";

export { ValidatedInput };
