import type { Project, Task } from '@shared/types'
import type { Vault } from './vault'

const WELCOME = `Noteable keeps everything in this folder as plain Markdown, so your notes are always yours.

## Formatting, Notion-style

Type \`/\` anywhere for the command menu, or use Markdown shortcuts as you type:

- \`#\`, \`##\`, \`###\` + space for headings
- \`-\` or \`1.\` + space for lists, \`[]\` + space for a to-do
- \`>\` + space for a quote, \`\`\`\` \`\`\` \`\`\`\` for a code block, \`---\` for a divider
- Select text for **bold**, *italic*, ==highlight== and links

## Bible study

Add your ESV API key in **Settings**, then open **Bible Study** in the sidebar and look up a passage.
In any note, type \`/passage\` to drop a passage in as a quote.

## Tasks

Press \`Q\` anywhere to quick-add a task. Try: \`Read Romans 8 tomorrow 7am p2 #Bible Study @devotional\`.
`

export async function seedVault(vault: Vault): Promise<void> {
  const now = new Date().toISOString()
  const today = now.slice(0, 10)

  await vault.createNote({ title: 'Welcome to Noteable', body: WELCOME })

  const bible: Project = { id: crypto.randomUUID(), name: 'Bible Study', color: '#7ecc49', order: 0 }
  await vault.projects.upsert(bible)

  const tasks: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>[] = [
    { content: 'Explore Noteable', priority: 2, labels: [], completed: false, order: 0, due: { date: today } },
    {
      content: 'Add your ESV API key in Settings',
      description: 'Free for non-commercial use at api.esv.org',
      priority: 3,
      labels: [],
      completed: false,
      order: 1,
      due: { date: today }
    },
    {
      content: 'Read Psalm 1',
      projectId: bible.id,
      priority: 4,
      labels: ['devotional'],
      completed: false,
      order: 0,
      due: { date: today, time: '07:00', recurrence: 'every day' }
    }
  ]
  for (const t of tasks) {
    await vault.tasks.upsert({ ...t, id: crypto.randomUUID(), createdAt: now, updatedAt: now })
  }
}
