#!/bin/bash
# Generate thumbnail and lightbox-sized versions of stock photos.
# Thumbnails: 400px wide (for grid gallery)
# Lightbox:  1600px wide (for lightbox view)
# Originals are kept for download.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PHOTOS_DIR="$SCRIPT_DIR/../stock-photos"
THUMB_DIR="$PHOTOS_DIR/thumbs"
LIGHT_DIR="$PHOTOS_DIR/lightbox"

THUMB_WIDTH=400
LIGHT_WIDTH=1600

mkdir -p "$THUMB_DIR" "$LIGHT_DIR"

count=0
for img in "$PHOTOS_DIR"/*.jpg; do
  [ -f "$img" ] || continue
  fname="$(basename "$img")"
  count=$((count + 1))

  # Thumbnail
  if [ ! -f "$THUMB_DIR/$fname" ]; then
    sips --resampleWidth "$THUMB_WIDTH" "$img" --out "$THUMB_DIR/$fname" >/dev/null 2>&1
    echo "  thumb: $fname"
  fi

  # Lightbox
  if [ ! -f "$LIGHT_DIR/$fname" ]; then
    sips --resampleWidth "$LIGHT_WIDTH" "$img" --out "$LIGHT_DIR/$fname" >/dev/null 2>&1
    echo "  lightbox: $fname"
  fi
done

echo ""
echo "Done! Processed $count images."
echo "  Thumbnails: $THUMB_DIR"
echo "  Lightbox:   $LIGHT_DIR"
du -sh "$THUMB_DIR" "$LIGHT_DIR"
