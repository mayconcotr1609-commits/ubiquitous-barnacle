#!/usr/bin/env bash
# Pulls fonts, ASCII art, images and brand icons from the upstream site repo
# (Kyonax/kyonax.github.io, a.k.a. kyo-web-online) into ./assets.
set -euo pipefail
cd "$(dirname "$0")"
SRC=${1:-$(mktemp -d)/kyo-web-online}
[ -d "$SRC/.git" ] || git clone --depth 1 https://github.com/Kyonax/kyonax.github.io "$SRC"
R="$SRC/src"; mkdir -p assets/brands
cp "$R"/fonts/SpaceMono/Original/SpaceMonoNerdFont-{Regular,Bold}.ttf assets/
cp "$R"/fonts/Geomanist/Original/{GeomanistBold,GeomanistRegural}.ttf assets/
cp "$R"/assets/app/kyonax_portrait-600.jpg assets/portrait.jpg
for p in org2html kyo-blog reckit; do cp "$R/assets/projects/$p.jpg" assets/; done
cp "$R"/assets/ascii/{reckit,kyo-website}.txt assets/
for b in vue vite ts node docker playwright react postgresql nest scss mongodb githubactions claude bash; do
  cp "$R/assets/brands/$b.svg" assets/brands/
done
echo "assets ready"
