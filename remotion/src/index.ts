import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

// Suppress third-party Chrome extension injection crashes (e.g. conflicting Web3 wallet extensions redefining window.ethereum)
if (typeof window !== "undefined") {
  window.addEventListener(
    "error",
    (event) => {
      const isExtension =
        (event.filename && event.filename.includes("chrome-extension://")) ||
        (event.message &&
          (event.message.includes("Cannot redefine property: ethereum") ||
            event.message.includes("M_ID")));
      if (isExtension) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true
  );

  window.addEventListener(
    "unhandledrejection",
    (event) => {
      const reasonStr = String(
        event.reason?.stack || event.reason?.message || event.reason
      );
      if (
        reasonStr.includes("chrome-extension://") ||
        reasonStr.includes("ethereum") ||
        reasonStr.includes("M_ID")
      ) {
        event.preventDefault();
      }
    },
    true
  );
}

registerRoot(RemotionRoot);
