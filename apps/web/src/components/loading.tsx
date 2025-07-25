import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
}

export function Loading({ size = "md", text, className }: LoadingProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6", 
    lg: "h-8 w-8"
  };

  return (
    <div className={cn("flex flex-col items-center justify-center p-8", className)}>
      <Loader2 className={cn("animate-spin text-semantic-info", sizeClasses[size])} />
      {text && (
        <p className="mt-2 text-sm text-semantic-tertiary">{text}</p>
      )}
    </div>
  );
}

export function PageLoading({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <Loading size="lg" text={text} />
    </div>
  );
}

export function InlineLoading({ text }: { text?: string }) {
  return <Loading size="sm" text={text} className="p-4" />;
} 