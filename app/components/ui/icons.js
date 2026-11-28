// The app's icons (design D12): a 24px grid, a 1.75px stroke with round joins, drawn in the text color, so they follow
// the theme. Decorative: the control that holds one carries the name.

const PATHS = {
  // Navigation
  home: <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" />,
  duas: <path d="M12 7c-1.6-1.4-4-2-8-2v13c4 0 6.4.6 8 2 1.6-1.4 4-2 8-2V5c-4 0-6.4.6-8 2Zm0 0v13" />,
  saved: <path d="M6.5 4h11a.5.5 0 0 1 .5.5V20l-6-3.5L6 20V4.5a.5.5 0 0 1 .5-.5Z" />,
  memorize: <path d="M12 3.5a6 6 0 0 1 3.5 10.9c-.6.4-1 1.1-1 1.8v.8h-5v-.8c0-.7-.4-1.4-1-1.8A6 6 0 0 1 12 3.5ZM9.5 20.5h5" />,
  settings: (
    <>
      <path d="M4 7h9m5 0h2M4 17h2m5 0h9" />
      <circle cx="15.5" cy="7" r="2.5" />
      <circle cx="8.5" cy="17" r="2.5" />
    </>
  ),
  // Controls
  close: <path d="m6 6 12 12M18 6 6 18" />,
  categories: <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />,
  chevron: <path d="m9 5.5 6.5 6.5L9 18.5" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  play: <path d="M8 5.5v13L18.5 12z" />,
  pause: <path d="M8.5 5.5v13M15.5 5.5v13" />,
  spinner: <path d="M12 3.5a8.5 8.5 0 1 1-8.5 8.5" />,
  bookmark: <path d="M6.5 4h11a.5.5 0 0 1 .5.5V20l-6-3.5L6 20V4.5a.5.5 0 0 1 .5-.5Z" />,
  arrow: <path d="M4 12h15m-6-6 6 6-6 6" />,
  data: (
    <>
      <circle cx="12" cy="8.5" r="4" />
      <path d="M4.5 20c1-3.7 3.9-5.5 7.5-5.5s6.5 1.8 7.5 5.5" />
    </>
  ),
  heart: <path d="M12 19.5C6.8 15.9 4 12.8 4 9.5A4.2 4.2 0 0 1 12 7.2a4.2 4.2 0 0 1 8 2.3c0 3.3-2.8 6.4-8 10Z" />,
  // States
  offline: (
    <path d="M3 3l18 18M8.5 16.2a5 5 0 0 1 7 0M5.3 12.8a9.6 9.6 0 0 1 4-2.4m4.7-.1a9.6 9.6 0 0 1 4.7 2.5M2.5 9.2A14 14 0 0 1 6.4 6.6m4-1.1a14 14 0 0 1 11.1 3.7M12 19.5h.01" />
  ),
  warning: <path d="M12 4 21 19.5H3zM12 10v4.5m0 2.5h.01" />,
};

export const ICON_NAMES = Object.keys(PATHS);

/** One icon. `filled` fills the shape, for the play button and for a saved bookmark. */
export function Icon({ name, size = 24, filled = false, className = "", ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className}`}
      {...props}
    >
      {PATHS[name]}
    </svg>
  );
}
