#!/usr/bin/env bash
set -e

BACKUP_DIR="/backup"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date -u +"%Y%m%d_%H%M%SZ")
ARCHIVE_NAME="springboards_site_archive_${TIMESTAMP}.tar.gz"
LATEST_LINK="springboards_offline_archive_latest.tar.gz"
MANIFEST_FILE="${BACKUP_DIR}/manifest.json"

echo "Creating offline archive: ${ARCHIVE_NAME}..."

tar --exclude='./node_modules' \
    --exclude='./.git' \
    --exclude='./backup' \
    --exclude='./tmp' \
    -czf "${BACKUP_DIR}/${ARCHIVE_NAME}" \
    index.html 404.html styles.css main.js analytics.js sitemap.xml robots.txt package.json metadata.json server.js \
    *.webp *.png *.jpg *.ico

cp "${BACKUP_DIR}/${ARCHIVE_NAME}" "${BACKUP_DIR}/${LATEST_LINK}"

FILE_SIZE=$(du -h "${BACKUP_DIR}/${ARCHIVE_NAME}" | cut -f1)
SHA256_HASH=$(sha256sum "${BACKUP_DIR}/${ARCHIVE_NAME}" | cut -d' ' -f1)
GIT_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "initial")

cat <<EOF > "$MANIFEST_FILE"
{
  "archive": "${ARCHIVE_NAME}",
  "latest": "${LATEST_LINK}",
  "createdAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "gitCommit": "${GIT_COMMIT}",
  "fileSize": "${FILE_SIZE}",
  "sha256": "${SHA256_HASH}",
  "contents": [
    "index.html",
    "404.html",
    "styles.css",
    "main.js",
    "analytics.js",
    "sitemap.xml",
    "robots.txt",
    "package.json",
    "metadata.json",
    "server.js",
    "all webp and visual assets"
  ]
}
EOF

echo "Offline backup completed successfully. Manifest created at ${MANIFEST_FILE}."
