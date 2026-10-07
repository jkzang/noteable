import type { Vault } from './vault'

const WELCOME = `Noteable keeps every page in this folder as plain Markdown, so your notes are always yours.

## Writing, Notion-style

Type \`/\` anywhere for the block menu, or use Markdown shortcuts as you type:

- \`#\`, \`##\`, \`###\` + space for headings
- \`-\` or \`1.\` + space for lists, \`[]\` + space for a to-do
- \`>\` + space for a quote, \`\`\`\` \`\`\` \`\`\`\` for a code block, \`---\` for a divider
- Select text for **bold**, *italic*, ==highlight== and links

Hover the title to add an icon, and press \`⌘K\` (\`Ctrl+K\`) to jump to any page.

## Organising pages

Folders in your vault show up as groups in the sidebar. Hover one and click \`+\` to add a page inside it.

## Bible study

Add your ESV API key in **Settings**, then open **Bible Study** in the sidebar and look up a passage.
In any page, type \`/passage\` to drop a passage in as a quote.
`

export async function seedVault(vault: Vault): Promise<void> {
  await vault.createNote({ title: 'Welcome to Noteable', body: WELCOME, frontmatter: { icon: '👋' } })
}
