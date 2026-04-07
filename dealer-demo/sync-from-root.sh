#!/usr/bin/env bash
# Re-copy dealer templates from repo root and fix asset paths for this subfolder.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DD="$ROOT/dealer-demo"
mkdir -p "$DD"
for t in template-a.html template-b.html template-c.html template-d.html; do
  cp "$ROOT/$t" "$DD/$t"
done
for f in "$DD"/template-*.html; do
  sed -i '' 's|src="images/|src="../images/|g' "$f"
  sed -i '' "s|url('images/|url('../images/|g" "$f"
done
cp "$ROOT/demo.html" "$DD/index.html"
sed -i '' 's|src="images/|src="../images/|g' "$DD/index.html"
sed -i '' 's|href="/"|href="../index.html"|g' "$DD/index.html"

echo "dealer-demo synced from root templates + demo.html -> index.html"
