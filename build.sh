#!/usr/bin/env bash
# TradeTracker — build both output files from src/.
# No dependencies, no package manager. Concatenation is the whole build step.
#
#   ./build.sh
#
# Produces:
#   dist/tradetracker.html           standalone page — open it in a browser
#   dist/tradetracker.embed.html    same page without the document shell, for a
#                                   host page that supplies <!doctype>, <head>
#                                   and <body> of its own

set -euo pipefail
cd "$(dirname "$0")"
mkdir -p dist

PARTS=(
  src/01-head.html    # <title>, fonts, the whole token system and CSS
  src/02-body.html    # markup shell: topbar, tabs, view container, modal
  src/02b-lang.js     # t(), the Turkish dictionary, localized month and day names
  src/03-core.js      # utilities, trade schema, storage adapter, sample data
  src/04-metrics.js   # every calculation on the page
  src/05-charts.js    # hand-drawn SVG charts + the shared hover layer
  src/06-views.js     # one function per tab
  src/07-init.js      # event wiring and boot
)

cat "${PARTS[@]}" > dist/tradetracker.embed.html

# The standalone build wraps the same content in a document shell.
{
  printf '%s\n' '<!doctype html>' '<html lang="en">' '<head>' \
    '<meta charset="utf-8">' \
    '<meta name="viewport" content="width=device-width, initial-scale=1">' \
    '<style>html{color-scheme:light}body{margin:0;font:14px system-ui,-apple-system,sans-serif;background:#fafaf9}img{max-width:100%}[hidden]{display:none!important}</style>'
  # everything up to and including </style> belongs in <head>
  awk 'BEGIN{h=1} {print} /<\/style>/ && h==1 {print "</head>"; print "<body>"; h=0}' dist/tradetracker.embed.html
  printf '%s\n' '</body>' '</html>'
} > dist/tradetracker.html

# Syntax-check each script part if node is around.
if command -v node >/dev/null 2>&1; then
  for f in src/0*.js; do
    sed '1d;$d' "$f" > /tmp/_el_check.js   # drop the <script> wrapper lines
    node --check /tmp/_el_check.js || { echo "syntax error in $f" >&2; exit 1; }
  done
  rm -f /tmp/_el_check.js
  echo "syntax ok"
fi

echo "built dist/tradetracker.html ($(wc -c < dist/tradetracker.html) bytes)"
echo "built dist/tradetracker.embed.html ($(wc -c < dist/tradetracker.embed.html) bytes)"
