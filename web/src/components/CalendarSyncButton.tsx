import { Calendar } from "lucide-react";
import { cn } from "../lib/utils";

interface CalendarSyncButtonProps {
  title: string;
  date: string; // YYYY-MM-DD
  description?: string;
  className?: string;
}

export function CalendarSyncButton({ title, date, description, className }: CalendarSyncButtonProps) {
  // Format date for Google Calendar (YYYYMMDD)
  const formattedDate = date.replace(/-/g, "");
  
  // All day events need the next day as the end date
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + 1);
  const formattedEndDate = nextDate.toISOString().split("T")[0].replace(/-/g, "");

  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.append("action", "TEMPLATE");
  url.searchParams.append("text", title);
  url.searchParams.append("dates", `${formattedDate}/${formattedEndDate}`);
  if (description) {
    url.searchParams.append("details", description);
  }

  return (
    <a
      href={url.toString()}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg font-medium hover:bg-primary/20 transition-colors text-sm border border-primary/20",
        className
      )}
    >
      <Calendar className="w-4 h-4" />
      Ajouter au calendrier
    </a>
  );
}
