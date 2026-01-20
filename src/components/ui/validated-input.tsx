import { forwardRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, AlertCircle } from "lucide-react";
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
}

const ValidatedInput = forwardRef<HTMLInputElement, ValidatedInputProps>(
  ({ 
    value, 
    icon, 
    validationRules = [], 
    showValidation = true,
    validateOnChange = true,
    className, 
    ...props 
  }, ref) => {
    const validationState = useMemo(() => {
      if (!value || value.length === 0) return "empty";
      
      const allValid = validationRules.every(rule => rule.test(value));
      return allValid ? "valid" : "invalid";
    }, [value, validationRules]);

    const shouldShowIcon = showValidation && validateOnChange && value.length > 0;

    return (
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {icon}
          </div>
        )}
        <Input
          ref={ref}
          value={value}
          className={cn(
            icon ? "pl-10" : "",
            shouldShowIcon ? "pr-10" : "",
            validationState === "valid" && shouldShowIcon && "border-green-500 focus-visible:ring-green-500/20",
            validationState === "invalid" && shouldShowIcon && "border-destructive focus-visible:ring-destructive/20",
            className
          )}
          {...props}
        />
        <AnimatePresence>
          {shouldShowIcon && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="absolute right-3 top-1/2 -translate-y-1/2"
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
