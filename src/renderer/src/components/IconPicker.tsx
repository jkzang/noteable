const EMOJI = [
  '📝', '📄', '📒', '📓', '📔', '📚', '📖', '🔖',
  '💡', '🧠', '🎯', '✅', '📌', '📎', '🗂️', '🗓️',
  '⭐', '🔥', '✨', '🌱', '🌿', '🌸', '☀️', '🌙',
  '❤️', '🙏', '✝️', '⛪', '🕊️', '🎵', '🎨', '📷',
  '🏠', '💼', '💰', '🛒', '🍳', '☕', '✈️', '🗺️',
  '🏃', '💪', '🧘', '🎓', '🔬', '💻', '🛠️', '🚀'
]

/** Notion-style emoji grid for a page icon. */
export function IconPicker(props: { onPick(emoji: string): void; onRemove?(): void }) {
  const random = () => props.onPick(EMOJI[Math.floor(Math.random() * EMOJI.length)])
  return (
    <div className="icon-picker">
      <div className="icon-picker-header">
        <span className="menu-heading">Emoji</span>
        <div className="spacer" />
        <button className="text-button" onClick={random}>
          Random
        </button>
        {props.onRemove && (
          <button className="text-button" onClick={props.onRemove}>
            Remove
          </button>
        )}
      </div>
      <div className="icon-grid">
        {EMOJI.map((e) => (
          <button key={e} className="icon-cell" onClick={() => props.onPick(e)}>
            {e}
          </button>
        ))}
      </div>
    </div>
  )
}
