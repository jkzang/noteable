const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform)

/** Label for the platform's command key in shortcut hints, e.g. "⌘K" / "Ctrl+K". */
export const MOD_KEY = isMac ? '⌘' : 'Ctrl+'
