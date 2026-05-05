export const OWNER_COLORS: Record<string, string> = {
  "Yuval Halevy":   "#EF4444",
  "Barak Miller":   "#3B82F6",
  "Dor Gelless":    "#10B981",
  "Ilay Mendel":    "#8B5CF6",
  "Yoav Coracos":   "#F59E0B",
  "Dor Barda":      "#0EA5E9",
  "Omer Rosenberg": "#EC4899",
  "Yotam Goldin":   "#14B8A6",
  "Amir Ben Izhak": "#A855F7",
};

export function getOwnerColor(name: string): string {
  return OWNER_COLORS[name] ?? "#94A3B8";
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map(p => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
