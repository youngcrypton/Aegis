export const AEGIS_THEME = {
  bgBase: "#06090e",
  bgSubtle: "#0a0f18",
  surfaceRaised: "#0e1726",
  cardFill: "#111e33",
  rule: "#1e293b",
  ruleSubtle: "rgba(255, 255, 255, 0.08)",
  cardGlass: "rgba(14, 23, 38, 0.85)",
  ink: "#f8fafc",
  inkMuted: "#94a3b8",
  accent: "#10b981", // Emerald safe
  hedge: "#f59e0b",  // Amber warning
  danger: "#ef4444", // Rose critical
  violet: "#8b5cf6",
  auroraGrad: "linear-gradient(135deg, #1F0E4C, #241056, #40178D, #5A1FC9, #6928ED, #642FEB, #4C44CB, #305EA5, #157286, #087B75, #087E6D)",
  displayFont: "'Marcellus', Georgia, serif",
  textFont: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

export const SPRINGS = {
  snappy: { mass: 0.6, damping: 14, stiffness: 180 },
  smooth: { mass: 1.0, damping: 20, stiffness: 120 },
  cinematic: { mass: 1.5, damping: 28, stiffness: 90 },
};

export const AEGIS_LIGHT_THEME = {
  bgBase: "linear-gradient(135deg, #FFF6EC 0%, #D6F5EC 45%, #DCCBFF 100%)",
  ground: "#F7F1FA",
  raised: "#FFFFFF",
  cardFill: "#FFFFFF",
  cardGlass: "rgba(255, 255, 255, 0.92)",
  rule: "rgba(22, 18, 48, 0.13)",
  ruleSubtle: "rgba(22, 18, 48, 0.08)",
  ink: "#161230",
  ink2: "#5C5778",
  inkMuted: "#5C5778",
  accent: "#07705F", // Forest Teal safe
  onAccent: "#FFFFFF",
  hedge: "#A34A08",  // Rust / Amber warning
  danger: "#B8254F", // Crimson Rose critical
  violet: "#6930EA", // 3-Blade logo only
  auroraGrad: "linear-gradient(135deg, #1F0E4C, #241056, #40178D, #5A1FC9, #6928ED, #642FEB, #4C44CB, #305EA5, #157286, #087B75, #087E6D)",
  displayFont: "'Marcellus', Georgia, serif",
  textFont: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

// Backward-compatible token export for existing compositions
export const AEGIS_TOKENS = {
  dark: {
    bgBase: "linear-gradient(135deg, #2B2A33 0%, #1C2238 45%, #0F2C2C 100%)",
    ground: "#1C2238",
    raised: "#22403F",
    ink: "#E8ECF8",
    ink2: "#A7AFCB",
    rule: "rgba(220, 230, 255, 0.12)",
    accent: "#5FD9BE",
    onAccent: "#04110E",
    hedge: "#FFBE7A",
    danger: "#FF8A9A",
    violet: "#C9A6FF",
    displayFont: "'Marcellus', Georgia, serif",
    textFont: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  light: AEGIS_LIGHT_THEME,
};
