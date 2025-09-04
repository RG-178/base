// fs-docs-module.js
const CAP = typeof window !== "undefined" ? window.Capacitor : undefined;
const FS = CAP?.Plugins?.Filesystem || null;

const Directory = { Documents: "DOCUMENTS" };
const Encoding = { UTF8: "utf8" };

export const BASE_DIR = "base";

// ---------- intern ----------
function assertFS() {
  if (!FS) throw new Error("@capacitor/filesystem fehlt. Installieren & `npx cap sync`.");
}

await FS.writeFile({
    directory: Directory.Documents,
    path: "base.txt",
    data: "Hallo Base!",
    encoding: Encoding.UTF8,
});

async function ensureDocsPermission() {
  assertFS();
  try {
    const st = await FS.checkPermissions?.();
    if (st && st.publicStorage !== "granted" && FS.requestPermissions) {
      await FS.requestPermissions();
    }
  } catch {}
}

function sanitizeId(id) {
  return String(id ?? "").replace(/[^a-zA-Z0-9_-]/g, "_");
}
function normalizeRelPath(p) {
  return String(p ?? "")
    .replace(/\\/g, "/")
    .split("/")
    .filter(seg => seg && seg !== "." && seg !== "..")
    .join("/");
}
function stripDataUrlPrefix(b64) {
  return String(b64).replace(/^data:[^;]+;base64,/, "");
}
function toUtf8(content) {
  if (typeof content === "string") return content;
  try { return JSON.stringify(content, null, 2); } catch { return String(content); }
}
async function mkdirSafe(path) {
  if (!path) return;
  try {
    await FS.mkdir({ directory: Directory.Documents, path, recursive: true });
  } catch {}
}
async function statSafe(path) {
  try {
    return await FS.stat({ directory: Directory.Documents, path });
  } catch { return null; }
}
function idRoot(id) {
  const safe = sanitizeId(id);
  if (!safe) throw new Error("Ungültige id");
  return `${BASE_DIR}/${safe}`;
}

// ---------- public API ----------
/** Legt base/ und base/<id>/ an (id zurück) */
export async function ensureBaseAndId({ id }) {
  assertFS();
  await ensureDocsPermission();
  await mkdirSafe(BASE_DIR);
  const root = idRoot(id);
  await mkdirSafe(root);
  return { path: root };
}

/** Beliebigen Ordner unter base/<id>/<folderPath> anlegen */
export async function createFolder({ id, folderPath = "" }) {
  assertFS();
  await ensureDocsPermission();
  const root = idRoot(id);
  await mkdirSafe(root);
  const rel = normalizeRelPath(folderPath);
  if (rel) await mkdirSafe(`${root}/${rel}`);
  return { path: rel ? `${root}/${rel}` : root };
}

/** Datei unter base/<id>/<fileName> speichern (überschreibt sicher) */
export async function saveFile({ id, fileName, content, encoding = "utf8" }) {
  assertFS();
  await ensureDocsPermission();

  const cleanName = normalizeRelPath(fileName);
  if (!cleanName || cleanName.endsWith("/")) throw new Error("Ungültiger fileName");

  // 1) Ordnerkette sicherstellen
  const root = idRoot(id);
  await mkdirSafe(root);
  const parent = cleanName.split("/").slice(0, -1).join("/");
  if (parent) await mkdirSafe(`${root}/${parent}`);

  const finalPath = `${root}/${cleanName}`;

  // 2) Falls bereits existiert (Datei oder Ordner) → weg damit
  const st = await statSafe(finalPath);
  if (st?.type === "file") {
    await FS.deleteFile({ directory: Directory.Documents, path: finalPath });
  } else if (st?.type === "directory") {
    await FS.rmdir({ directory: Directory.Documents, path: finalPath, recursive: true });
  }

  // 3) Daten vorbereiten & schreiben (ohne recursive:true!)
  const dataToWrite = encoding === "base64" ? stripDataUrlPrefix(String(content)) : toUtf8(content);
  await FS.writeFile({
    directory: Directory.Documents,
    path: finalPath,
    data: dataToWrite,
    encoding: encoding === "base64" ? undefined : Encoding.UTF8,
  });

  const { uri } = await FS.getUri({ directory: Directory.Documents, path: finalPath });
  return { path: finalPath, uri };
}

/** Datei ODER Ordner unter base/<id>/<targetPath> löschen (rekursiv bei Ordnern) */
export async function deleteEntry({ id, targetPath = "" }) {
  assertFS();
  await ensureDocsPermission();
  const root = idRoot(id);
  const rel = normalizeRelPath(targetPath);
  const full = rel ? `${root}/${rel}` : root;

  const st = await statSafe(full);
  if (!st) return { path: full, deleted: false };

  if (st.type === "file") {
    await FS.deleteFile({ directory: Directory.Documents, path: full });
  } else {
    await FS.rmdir({ directory: Directory.Documents, path: full, recursive: true });
  }
  return { path: full, deleted: true };
}

/** Ganze ID löschen: base/<id>/ */
export async function deleteId({ id }) {
  return deleteEntry({ id, targetPath: "" });
}

/** (Convenience) Base64-TEXT (HTML/CSS/JS) als UTF-8 speichern */
export async function saveTextFromBase64({ id, fileName, base64 }) {
  const text = new TextDecoder("utf-8").decode(Uint8Array.from(atob(stripDataUrlPrefix(base64)), c => c.charCodeAt(0)));
  return saveFile({ id, fileName, content: text, encoding: "utf8" });
}

/** URI holen (für iframe/open with) */
export async function getFileUri({ id, fileName }) {
  assertFS();
  const full = `${idRoot(id)}/${normalizeRelPath(fileName)}`;
  const { uri } = await FS.getUri({ directory: Directory.Documents, path: full });
  return { path: full, uri };
}