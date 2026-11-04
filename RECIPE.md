# Obsidian

Your Obsidian vault inside Herdr. A search popup finds any note by name, searches inside notes, lists a tag, or adds a line to today's note. A side panel shows your recent notes and the vault's folders. Notes open in a viewer pane beside your terminals, with their links followed in place and the notes that link to them listed underneath.

![Obsidian](preview.png)

## What you see

- **Search popup**, 760 by 560px, 40px from the top of the window, on the `popover` color.
  - A heading on the left: "Notes" in 15px semibold, then the vault's name in 12px `dim`. On the right is the result count in 12px `muted`, shown as "200+" when the list is cut off.
  - A 36px input with 9px corners and an `accent` border on `raised`, with a 14px search icon. Its placeholder lists the prefixes: `/text searches inside   #tag   +text adds to today`.
  - Up to 10 rows, each with an icon, the note's title and its folder on the right (12px `dim`). Rows are 34px tall, or 46px for a text match, which adds the matching line underneath in 12px `muted`. The selected row is `selected` and hovered rows are `hover`.
  - A one-line hint in 12px `dim` at the bottom.
  - With nothing typed, the first row is "Today's note" with the date ("Wednesday 4 November") and an `accent` calendar icon. The vault's notes follow, newest first.
- **Side panel**, on `chrome`:
  - A header with the vault name (13px semibold) and two 26px outlined buttons, Search and Today.
  - A RECENT section (11px semibold `muted` caps) with the 8 most recently changed notes. Each has a clock icon and its folder in 11px `dim`.
  - A FILES section showing the note count, then the vault's tree: folders first, with chevrons, indented 14px per level; then notes, sorted by name with numbers in order. Rows are 26px.
- **Note viewer** pane, on `background`:
  - A 36px `chrome` header with a back chevron when there is history, a file icon in `accent`, the title (13px semibold) and its folder (12px `dim`). On the right are the **Edit** and **Obsidian** buttons.
  - The note rendered as markdown, 14px, with 22px and 16px padding. Front-matter tags show above it as `accent` pills on `raised`.
  - "LINKED FROM n" with a row for each note that links here, up to 50.

## How it behaves

- **Popup** (`ctrl-b f`):
  - Typing filters notes by title and path; every word must match. An exact title comes first, then titles that start with the text, then titles that contain it, then path matches. Recency breaks ties.
  - When nothing matches the name exactly, the last row is `Create “text”`, which makes an empty note where Obsidian's "new file location" setting puts new notes and opens it in your editor.
  - `/words` searches inside notes (up to 3 lines per note, 400 results). The search starts 160ms after you stop typing. Tab switches between name and text search.
  - `#tag` lists the notes tagged with it in the text (`#tag`, `#tag/child`) or in the front matter (`tags: [a, b]` or a YAML list).
  - `+text` shows one row, "Add to today's note: text". Enter appends `- text` to today's daily note, creating it from the daily-notes template if needed, and shows a toast.
  - Enter opens the note in the viewer. Cmd+Enter (Ctrl+Enter elsewhere) opens it in the Obsidian app, and Shift+Enter in your editor. Clicks with the same modifiers do the same.
  - Up/Down or Ctrl+J/K move the selection, and Escape closes the popup.
- **Viewer**:
  - A note opens in the viewer already in the current tab, if there is one, or else in a new split to the right.
  - Clicking `[[link]]`, `[[link|alias]]`, `[[link#heading]]` or a relative `.md` link replaces the note in place, and the back chevron returns to the previous one. Links resolve the way Obsidian resolves them: an exact path first, then the shortest path with that file name.
  - A link to a missing note shows a toast. Links to attachments open in the system's default app, and web links in the browser.
  - The note redraws when its file changes on disk.
  - Edit opens `$VISUAL`, else `$EDITOR`, else `vi` in a split, passing `+line` only to editors that understand it. Obsidian opens the note in the app.
- **Panel** (`ctrl-b a`):
  - Clicking a folder expands or collapses it, and clicking a note opens it, with the same modifiers as the popup. Clicking RECENT folds that section.
  - Which folders are open, and whether RECENT is folded, are remembered.
  - The panel follows the vault on disk, so notes made in Obsidian show up within half a second.
  - `pane.go` can put the keyboard in the panel. Then Up/Down move, Right/Left open and close folders (Left on a note jumps to its folder), Enter opens, and Escape goes back left.
- The vault is found automatically: the one Obsidian has open, else the one it opened last.

## Built from

- One mod, `mods/obsidian/`. `mod.json` sets `place: "none"`, so nothing docks into your layout, plus `focusable: true` and the popup overlay.
- `main.js` chooses a view by `props()`:
  - opened with `mod.open`, it is the search popup, `search.js`
  - `{ view: "panel" }` is the panel, `panel.js`
  - `{ note: "<path in vault>" }` is the viewer, `note.js`

  `vault.js` holds everything shared: finding the vault, listing, matching, searching, link resolution, daily notes and opening.
- Configuration is read in this order:
  - `obsidian.json` in your Herdr home, optional: `{ "vault": "~/Notes", "editor": ["nvim"], "dailyFolder": "Daily", "dailyFormat": "YYYY-MM-DD", "dailyTemplate": "Templates/Daily" }`. Every key is optional.
  - Obsidian's vault list: `~/Library/Application Support/obsidian/obsidian.json` on macOS; `~/.config/obsidian/`, Flatpak and Snap on Linux; `AppData/Roaming/obsidian` on Windows.
  - The vault's own `.obsidian/daily-notes.json` (`folder`, `format`, `template`) and `.obsidian/app.json` (`newFileLocation`, `newFileFolderPath`).
- Programs it runs, through `exec`:
  - `rg` to list files newest first and to search; `find` and `grep` when `rg` is missing.
  - `open` on macOS, `xdg-open` on Linux and `cmd /c start` on Windows, for `obsidian://open?path=…`, web links and attachments.
  - `mkdir -p` when a daily note's folder doesn't exist yet.
  - `sh` to start your editor.
- It reads files in your vault and Obsidian's config. It writes only to your vault, and only when you create a note, open today's note, or add a line with `+text`. Writes use `writeTextFile` with the previous contents, so a change made at the same moment is never overwritten.
- Herdr functions:
  - views and data: `props`, `focused`, `panes`, `spaces`, `theme`, `shared`, `setShared`, `nextCommand`, `notify`
  - files: `readTextFile`, `writeTextFile`, `watchFolder`
  - running things: `exec`, `run`
  - commands: `pane.split` (with `mod`/`props` and with `argv`), `mod.open`, `pane.go`
- Panes talk to each other through shared state. Viewers list their tab under shared `"obsidian.viewers"`, and openers send `{ tab, note, n }` on shared `"obsidian.show"`. A mod pane isn't given its pane id, so a viewer takes its tab from `focused().tab` when it starts. A copy starts the first time its tab shows, so that is its own tab.
- The icons are Lucide (ISC) line icons, drawn with `svg()` and tinted.

## Watch out

- **Install by copying, not by symlinking the folder.** A symlinked mod folder loads its JavaScript but draws no icons, and symlinking the files one by one fails to load ("resolves outside the application directory"). `install.sh` copies the files in.
- Copies of one mod don't share module state, so the popup, panel and viewers can only talk through `shared()`.
- Obsidian rewrites `.obsidian/workspace.json` constantly. The panel ignores changes under `.obsidian`, `.git` and `.trash`, and waits 400ms for changes to settle. Without that, it would redraw the window nonstop while Obsidian is open.
- Notes the vault's `.gitignore` excludes, and files in hidden folders, are skipped, because ripgrep skips them.
- Daily-note formats support the common moment.js tokens (`YYYY YY MMMM MMM MM M Do DD D dddd ddd HH H mm ss` and `[literal]`), not locale formats like `LL`.
- The viewer renders standard markdown. Obsidian extras are approximated:
  - callouts become a bold title in a blockquote
  - `==highlight==` becomes bold
  - `![[embeds]]` become links
  - `%%comments%%` are dropped

  Dataview, Mermaid and LaTeX show as plain text or code.
- The viewer doesn't scroll to a line; `+line` only reaches the editor.
- `ctrl-b f` and `ctrl-b a` are suggestions. Change them if you use those keys. `ctrl-j`/`ctrl-k` only apply while the popup has the keyboard.
- Text and tag search need `rg` for the best results. Without it, front-matter tags in YAML lists aren't found.

## Done when

- `herdr-app check mods/obsidian` passes.
- `herdr-app do mod.open --name obsidian` shows the popup with "Today's note" first and your notes newest first.
- Typing `/` and a word lists matching lines, and `#` plus a tag lists tagged notes.
- `+hello` and Enter adds `- hello` to today's daily note, creating it if needed.
- Enter on a note splits a viewer to the right. A second note from the popup replaces it rather than adding a split.
- Clicking a `[[link]]` in the viewer shows that note, and the back chevron returns to the first.
- `pane.split {direction: "right", mod: "obsidian", props: {view: "panel"}}` shows Recent and the folder tree. Saving a new note in Obsidian adds it to the panel.
