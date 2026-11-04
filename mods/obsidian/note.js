// The viewer pane: one note rendered as markdown, its [[links]] followed in place,
// with the notes that link to it underneath. Redraws when the file changes.
import { div, svg } from "gpui-kit";
import { v_flex, h_flex, TextView } from "gpui-base";
import { focused, notify, props, readTextFile, setShared, shared, spaces, theme, watchFolder } from "herdr";
import * as vault from "./vault.js";

const ICON = (name) => `mods/obsidian/${name}.svg`;
const LINK = "obsidian-note:";
const IMAGE = /\.(png|jpe?g|gif|webp|svg|bmp)$/i;

// Front matter out, Obsidian's own syntax turned into plain markdown.
export function toMarkdown(text) {
  let front = {};
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (fm) {
    text = text.slice(fm[0].length);
    let key = null;
    for (const line of fm[1].split(/\r?\n/)) {
      const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
      if (kv) { key = kv[1]; front[key] = kv[2].replace(/^\[|\]$/g, "").split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean); }
      else if (key && /^\s+-\s+/.test(line)) front[key].push(line.replace(/^\s+-\s+/, "").replace(/^["']|["']$/g, ""));
    }
  }
  const out = [];
  let fence = false;
  for (let line of text.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) { fence = !fence; out.push(line); continue; }
    if (fence) { out.push(line); continue; }
    line = line
      .replace(/%%.*?%%/g, "")
      .replace(/^(\s*>+\s*)\[!(\w+)\][+-]?\s*(.*)$/, (_m, q, type, rest) => `${q}**${type[0].toUpperCase()}${type.slice(1).toLowerCase()}${rest ? ": " + rest : ""}**\n${q.trimEnd()}`)
      .replace(/!\[\[([^\]]+)\]\]/g, (_m, target) => {
        const [name, alias] = target.split("|");
        return `[↳ ${alias || name}](${LINK}${encodeURIComponent(name)})`;
      })
      .replace(/\[\[([^\]]+)\]\]/g, (_m, target) => {
        const [name, alias] = target.split("|");
        const shown = alias || name.replace(/#\^?/, " › ");
        return `[${shown}](${LINK}${encodeURIComponent(name)})`;
      })
      .replace(/==([^=]+)==/g, "**$1**");
    out.push(line);
  }
  return { markdown: out.join("\n"), front };
}

export class Note {
  init(cx) {
    this.history = [];
    this.links = [];
    // A mod pane isn't told its pane id, but a copy starts the first time its tab
    // shows, so the focused tab now is its own. The id survives a restart.
    this.tab = focused()?.tab ?? null;
    this.id = `${this.tab}|${props()?.note}`;
    this.show(props()?.note, cx);
    this.register();
    // Another view asks this tab's viewer to show a note through shared "obsidian.show".
    this.seen = shared("obsidian.show")?.n ?? 0;
  }

  // shared "obsidian.viewers": { id: tab }, so openers know a tab has a viewer.
  register() {
    if (!this.tab) return;
    const tabs = new Set(spaces().flatMap((s) => s.tabs.map((t) => t.id)));
    const all = Object.fromEntries(Object.entries(shared("obsidian.viewers") ?? {}).filter(([, tab]) => tabs.has(tab)));
    all[this.id] = this.tab;
    if (JSON.stringify(all) !== JSON.stringify(shared("obsidian.viewers") ?? {})) setShared("obsidian.viewers", all);
  }

  close() {
    const all = { ...(shared("obsidian.viewers") ?? {}) };
    delete all[this.id];
    setShared("obsidian.viewers", all);
  }

  show(rel, cx, back = false) {
    if (!rel) { this.error = "No note given"; return; }
    if (this.path && !back && this.path !== rel) this.history.push(this.path);
    this.path = rel;
    this.text = null; this.error = null; this.links = [];
    const gen = (this.gen = (this.gen ?? 0) + 1);
    cx.spawn(async (cx) => {
      await this.load(gen);
      cx.notify();
      try { this.links = await vault.backlinks(rel); } catch { this.links = []; }
      if (gen === this.gen) cx.notify();
    });
    cx.spawn(async (cx) => {
      // Obsidian rewrites .obsidian/ constantly; only this file matters.
      const { root } = await vault.config();
      const dir = `${root}/${vault.folderOf(rel)}`.replace(/\/$/, "");
      try {
        while (gen === this.gen) {
          const changed = await watchFolder(dir);
          if (gen !== this.gen) return;
          if (changed.some((p) => p === dir || p === root || p.endsWith(`/${rel}`))) { await this.load(gen); cx.notify(); }
        }
      } catch { /* not watchable: the content stays as loaded */ }
    });
  }

  async load(gen) {
    try {
      const { root } = await vault.config();
      const text = await readTextFile(`${root}/${this.path}`);
      if (gen !== this.gen) return;
      if (text === null) { this.error = `${this.path} isn't there any more`; return; }
      if (text === this.raw) return;
      this.raw = text;
      const { markdown, front } = toMarkdown(text);
      this.text = markdown.trim() ? markdown : "_Empty note_";
      this.tags = [...(front.tags ?? []), ...(front.tag ?? [])].map((t) => t.replace(/^#/, ""));
    } catch (e) { this.error = String(e?.message ?? e); }
  }

  tick(cx) {
    this.register();
    const ask = shared("obsidian.show");
    if (ask && ask.n !== this.seen) {
      this.seen = ask.n;
      if (ask.tab === this.tab && ask.note !== this.path) { this.raw = null; this.show(ask.note, cx); }
    }
  }

  async follow(url, cx) {
    try {
      if (/^(https?|mailto|obsidian):/i.test(url)) return vault.openUrl(url);
      const at = url.indexOf(LINK);
      const target = at >= 0 ? decodeURIComponent(url.slice(at + LINK.length)) : decodeURIComponent(url.replace(/^file:\/\//, ""));
      const rel = await vault.resolve(target, this.path);
      if (!rel) return notify({ title: `“${target.split("#")[0]}” doesn't exist yet`, body: "Create it from the search popup", level: "info", timeout: 3000 });
      if (!vault.isNote(rel) || IMAGE.test(rel)) return vault.open(rel);
      if (rel !== this.path) { this.raw = null; this.show(rel, cx); cx.notify(); }
    } catch (e) { notify({ title: "Couldn't follow the link", body: String(e?.message ?? e), level: "error" }); }
  }

  button(id, icon, label, onClick) {
    const t = theme();
    return h_flex().id(id).h(24).px(7).gap(5).items_center().rounded(6).cursor_pointer().text_size(12).text_color(t.muted)
      .hover((s) => s.bg(t.hover).text_color(t.foreground))
      .on_click((_e, cx) => onClick(cx))
      .child(svg(ICON(icon)).size(13))
      .when(Boolean(label), (el) => el.child(label));
  }

  render(cx) {
    this.tick(cx);
    const t = theme(), path = this.path ?? "";
    const header = h_flex().h(36).flex_none().px(8).gap(4).items_center().border_b_1().border_color(t.border).bg(t.chrome)
      .when(this.history.length > 0, (el) => el.child(this.button("back", "chevron-left", null, (cx) => { this.raw = null; this.show(this.history.pop(), cx, true); cx.notify(); })))
      .child(svg(ICON("file-text")).size(14).flex_none().ml(4).text_color(t.accent))
      .child(div().flex_none().max_w(320).truncate().text_size(13).font_semibold().text_color(t.foreground).child(vault.title(path)))
      .child(div().flex_1().min_w(0).truncate().text_size(12).text_color(t.dim).child(vault.folderOf(path)))
      .child(this.button("edit", "square-pen", "Edit", () => vault.open(path, "editor")))
      .child(this.button("app", "external", "Obsidian", () => vault.open(path, "obsidian")));
    const tags = (this.tags ?? []).length
      ? h_flex().flex_wrap().gap(6).children(this.tags.map((tag) =>
          div().px(7).py(1).rounded(10).bg(t.raised).text_size(11.5).text_color(t.accent).child(`#${tag}`)))
      : null;
    const links = this.links.length
      ? v_flex().gap(2).pt(14).mt(10).border_t_1().border_color(t.border)
          .child(div().pb(4).text_size(11.5).font_semibold().text_color(t.muted).child(`LINKED FROM  ${this.links.length}`))
          .children(this.links.slice(0, 50).map((p) =>
            h_flex().id(`bl-${p}`).h(26).px(6).gap(8).items_center().rounded(6).cursor_pointer()
              .hover((s) => s.bg(t.hover))
              .on_click((_e, cx) => { this.raw = null; this.show(p, cx); cx.notify(); })
              .child(svg(ICON("file-text")).size(13).flex_none().text_color(t.dim))
              .child(div().flex_1().min_w(0).truncate().text_size(12.5).text_color(t.foreground).child(vault.title(p)))
              .child(div().flex_none().max_w(200).truncate().text_size(11.5).text_color(t.dim).child(vault.folderOf(p)))))
      : null;
    const body = this.error
      ? div().p(16).text_color(t.blocked).child(this.error)
      : this.text === null
        ? div().p(16).text_color(t.muted).child("Loading…")
        : v_flex().id("note-scroll").flex_1().min_h(0).overflow_y_scrollbar().px(22).py(16).gap(10)
            .when(Boolean(tags), (el) => el.child(tags))
            .child(TextView.markdown(`note-${this.gen}`, this.text).selectable(true).text_size(14).text_color(t.foreground)
              .on_link_click((url, cx) => this.follow(url, cx)))
            .when(Boolean(links), (el) => el.child(links));
    return v_flex().id("obsidian-note").size_full().min_h(0).bg(t.background).child(header).child(body);
  }
}
