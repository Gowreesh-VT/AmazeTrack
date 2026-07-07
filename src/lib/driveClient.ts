import type { DriveData } from "./types";

const DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files";
export const DRIVE_DATA_FILE_NAME = "amazetrack.json";

function authHeaders(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` };
}

async function parseDriveError(response: Response) {
  const body = await response.text();
  return new Error(`Google Drive request failed (${response.status}): ${body}`);
}

export async function findAppDataFile(accessToken: string) {
  const params = new URLSearchParams({
    spaces: "appDataFolder",
    fields: "files(id,name,modifiedTime)",
    q: `name='${DRIVE_DATA_FILE_NAME}' and trashed=false`,
  });

  const response = await fetch(`${DRIVE_FILES_URL}?${params}`, {
    headers: authHeaders(accessToken),
  });

  if (!response.ok) throw await parseDriveError(response);
  const payload = (await response.json()) as { files: { id: string; modifiedTime: string }[] };

  return payload.files[0] ?? null;
}

export async function createAppDataFile(accessToken: string, data: DriveData) {
  const metadata = {
    name: DRIVE_DATA_FILE_NAME,
    parents: ["appDataFolder"],
    mimeType: "application/json",
  };
  const boundary = `amazetrack-${crypto.randomUUID()}`;
  const body = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify(metadata),
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify(data),
    `--${boundary}--`,
  ].join("\r\n");

  const response = await fetch(`${DRIVE_UPLOAD_URL}?uploadType=multipart&fields=id,modifiedTime`, {
    method: "POST",
    headers: {
      ...authHeaders(accessToken),
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!response.ok) throw await parseDriveError(response);
  return (await response.json()) as { id: string; modifiedTime: string };
}

export async function readAppDataFile(accessToken: string, fileId: string) {
  const response = await fetch(`${DRIVE_FILES_URL}/${fileId}?alt=media`, {
    headers: authHeaders(accessToken),
    cache: "no-store",
  });

  if (!response.ok) throw await parseDriveError(response);
  return (await response.json()) as DriveData;
}

export async function writeAppDataFile(accessToken: string, fileId: string, data: DriveData) {
  const response = await fetch(`${DRIVE_UPLOAD_URL}/${fileId}?uploadType=media&fields=id,modifiedTime`, {
    method: "PATCH",
    headers: {
      ...authHeaders(accessToken),
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) throw await parseDriveError(response);
  return (await response.json()) as { id: string; modifiedTime: string };
}
