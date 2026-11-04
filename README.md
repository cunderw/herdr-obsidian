# herdr-obsidian

Your [Obsidian](https://obsidian.md) vault inside the [Herdr](https://herdr.dev) desktop app, as shared memory between you and your agents.

![Obsidian in Herdr](preview.png)

- **Search popup** (`ctrl-b f`): find a note by name, `/words` to search inside notes, `#tag` to list a tag, `+text` to add a line to today's daily note. Enter opens the note in a viewer pane, Cmd/Ctrl+Enter opens it in Obsidian, Shift+Enter in your editor, and Alt+Enter (or Alt+click) sends it to an agent.
- **Send a note to an agent**: the viewer's Send button, or Alt+Enter in the popup, puts the note into the agent's prompt as one paste, headed `From my note "<title>" (<path>):`. Nothing is submitted; you add your question and press Enter yourself.
- **Save an agent's reply**: type `>` in the popup (or pick "Save last reply from …") to save the agent's last answer as a new note (`>My title`, or its first line) or append it to today's note under `## From <agent>`.
- **Side panel** (`ctrl-b a`): recent notes and the vault's folder tree, kept in sync with the files on disk.
- **Note viewer**: a rendered note beside your terminals. `[[links]]` are followed in place, a back button returns, notes that link here are listed underneath, and it redraws when the file changes. **Edit** switches it to Herdr's editor in place: Cmd/Ctrl+S saves, Escape goes back to the rendered note. A save never overwrites a change made on disk meanwhile; it says so instead.
- **Which agent**: the agent terminal that has the keyboard, else the one that had it last, else the only agent in the current tab.
- Daily notes follow your Obsidian settings (folder, date format, template), and new notes go where Obsidian puts them.

## Install

```sh
git clone https://github.com/cunderw/herdr-obsidian
./herdr-obsidian/install.sh
```

Then merge `keys.json` into `~/.config/herdr-app/keys.json`, or bind the keys you like. Its `mod:obsidian` section carries Alt+Enter (send) and Cmd/Ctrl+S (save).

`install.sh` copies the mod into `~/.config/herdr-app/mods/obsidian`, because a symlinked mod folder doesn't draw its icons. Run it again after pulling.

The vault is the one Obsidian has open. To pick another vault, or to set your editor, write `~/.config/herdr-app/obsidian.json`:

```json
{ "vault": "~/Notes", "editor": ["nvim"] }
```

## What it touches

It runs `rg` (falling back to `find`/`grep`), `open`/`xdg-open`, `mkdir`, `sh`, `ls`, `tail`, `hc read` and your editor. It reads your vault and Obsidian's config, and, to save an agent's reply, that agent's Claude Code transcript under `~/.claude` (`sessions/<pid>.json` and `projects/*/<session>.jsonl`). It writes to your vault only when you create a note, open today's note, add a line with `+text`, save a reply, or save an edit.

Sending a note uses the clipboard for a moment: the note is copied, pasted into the agent with Herdr's own paste, and your clipboard's text is put back. A clipboard holding an image keeps the note instead.

[RECIPE.md](RECIPE.md) has the full brief. Icons are from [Lucide](https://lucide.dev) (ISC).
