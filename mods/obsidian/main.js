// Obsidian for Herdr. One mod, three views, picked by props:
//   opened as a popup (mod.open)        the search popup     search.js
//   props { view: "panel" }             the side panel       panel.js
//   props { note: "<path in vault>" }   a note viewer pane   note.js
import { View } from "gpui-kit";
import { props } from "herdr";
import { Search } from "./search.js";
import { Panel } from "./panel.js";
import { Note } from "./note.js";

export default class Obsidian extends View {
  init(_props, cx) {
    const p = props() ?? {};
    this.view = p.note ? new Note() : p.view === "panel" ? new Panel() : new Search();
    this.view.init(cx);
  }

  render(cx) {
    return this.view.render(cx);
  }

  close(cx) {
    this.view.close?.(cx);
  }
}
