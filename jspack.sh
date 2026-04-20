#!/usr/bin/env bash
set -euo pipefail

# Where to write the packaged content
OUTPUT_FILE="/c/Users/JacobLadd/OneDrive - Jake of all Trades Property Services/Copilot Export/gridTest.txt"

# Ensure destination directory exists
mkdir -p "$(dirname "$OUTPUT_FILE")"

# Define exclusion rules once (to keep the list synced)
EXCLUSIONS=(
  -not -path "*/parking/*"
  -not -path "*/node_modules/*"
  -not -path "*/.git/*"
  -not -path "*/.github/*"
  -not -path "*/fontawesome/*"
  -not -path "*/venv/*"
  -not -name "parking_website.txt"
  -not -name "Dockerfile"
  -not -name ".dockerignore"
  -not -name ".gitignore"
  -not -name "package-lock.json"
  -not -name "*.jpg"
  -not -name "*.jpeg"
  -not -name "*.png"
  -not -name "*.gif"
  -not -name "*.bmp"
  -not -name "*.svg"
  -not -name "*.ico"
  -not -name "*.zip"
  -not -name "*.tar.gz"
  -not -name "*.py"
  -not -name "*.env"
)

# 1. Write the Full File Structure Header
{
  echo "=========================================================="
  echo "FULL PROJECT FILE STRUCTURE"
  echo "=========================================================="
  # Converts paths into a visual tree using sed
  find . "${EXCLUSIONS[@]}" | sed -e 's/[^-][^\/]*\// |/g' -e 's/|/  /g'
  echo -e "==========================================================\n"
} > "$OUTPUT_FILE"

# 2. Append the file contents
find . -type f "${EXCLUSIONS[@]}" -print0 | while IFS= read -r -d '' file; do
    printf -- "--- Start of file: %s ---\n" "$file" >> "$OUTPUT_FILE"
    cat "$file" >> "$OUTPUT_FILE"
    printf "\n--- End of file: %s ---\n\n" "$file" >> "$OUTPUT_FILE"
  done

printf "Content packaged into %s\n" "$OUTPUT_FILE"
