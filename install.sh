#!/usr/bin/env bash
# Copies the mod into Herdr's home. A symlinked mod folder loads its JavaScript
# but not its icons, so this copies instead; run it again after pulling.
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
dest=${HERDR_APP_HOME:-$HOME/.config/herdr-app}/mods/obsidian
mkdir -p "$dest"
cp "$here"/mods/obsidian/*.js "$here"/mods/obsidian/*.svg "$here"/mods/obsidian/mod.json "$dest"/
herdr-app check "$dest"
