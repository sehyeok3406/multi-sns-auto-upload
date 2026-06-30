import { createSign, randomUUID } from "node:crypto";
import type { AuthorPreset } from "@/lib/types";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_SHEETS_BASE_URL = "https://sheets.googleapis.com/v4/spreadsheets";
const SHEET_NAME = "author_presets";
const AUTHOR_PRESET_RANGE = `${SHEET_NAME}!A:E`;
const HEADER_RANGE = `${SHEET_NAME}!A1:E1`;
const HEADER_ROW = ["id", "name", "headline", "createdAt", "updatedAt"];
const GOOGLE_SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

type GoogleTokenResponse = {
  access_token: string;
  expires_in: number;
  token_type: string;
};

type GoogleSheetsValuesResponse = {
  values?: string[][];
};

type AuthorPresetRow = {
  preset: AuthorPreset;
  rowNumber: number;
};

const globalForGoogle = globalThis as typeof globalThis & {
  __snsAutoUploadGoogleToken?: {
    accessToken: string;
    expiresAt: number;
  };
};

function getEnv(key: string) {
  const value = process.env[key]?.trim();

  if (!value) {
    throw new Error(`${key} is not configured.`);
  }

  return value;
}

function getPrivateKey() {
  return getEnv("GOOGLE_PRIVATE_KEY").replace(/\\n/g, "\n");
}

function base64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function createServiceAccountJwt() {
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: "RS256",
    typ: "JWT",
  };
  const payload = {
    iss: getEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL"),
    scope: GOOGLE_SHEETS_SCOPE,
    aud: GOOGLE_TOKEN_URL,
    exp: now + 3600,
    iat: now,
  };
  const unsignedToken = `${base64Url(JSON.stringify(header))}.${base64Url(
    JSON.stringify(payload),
  )}`;
  const signature = createSign("RSA-SHA256")
    .update(unsignedToken)
    .sign(getPrivateKey(), "base64url");

  return `${unsignedToken}.${signature}`;
}

async function getGoogleAccessToken() {
  const cachedToken = globalForGoogle.__snsAutoUploadGoogleToken;

  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.accessToken;
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: createServiceAccountJwt(),
    }),
  });
  const data = (await response.json()) as GoogleTokenResponse & {
    error?: string;
    error_description?: string;
  };

  if (!response.ok) {
    throw new Error(
      data.error_description ?? data.error ?? "Google access token request failed.",
    );
  }

  globalForGoogle.__snsAutoUploadGoogleToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return data.access_token;
}

async function requestSheetsApi<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = await getGoogleAccessToken();
  const response = await fetch(`${GOOGLE_SHEETS_BASE_URL}/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const message =
      data?.error?.message ??
      data?.error_description ??
      "Google Sheets API request failed.";
    throw new Error(message);
  }

  return data as T;
}

function getSpreadsheetId() {
  return getEnv("GOOGLE_SHEETS_SPREADSHEET_ID");
}

function toPreset(row: string[]): AuthorPreset | null {
  const [id, name, headline, createdAt, updatedAt] = row;

  if (!id || !name || !headline) {
    return null;
  }

  return {
    id,
    name,
    headline,
    createdAt: createdAt || new Date().toISOString(),
    updatedAt: updatedAt || createdAt || new Date().toISOString(),
  };
}

function toPresetRow(row: string[], index: number): AuthorPresetRow | null {
  const preset = toPreset(row);

  if (!preset) {
    return null;
  }

  return {
    preset,
    rowNumber: index + 1,
  };
}

function toSheetRow(preset: AuthorPreset) {
  return [
    preset.id,
    preset.name,
    preset.headline,
    preset.createdAt,
    preset.updatedAt,
  ];
}

async function ensureHeaderRow() {
  const spreadsheetId = getSpreadsheetId();
  const data = await requestSheetsApi<GoogleSheetsValuesResponse>(
    `${spreadsheetId}/values/${encodeURIComponent(HEADER_RANGE)}`,
  );
  const firstRow = data.values?.[0] ?? [];

  if (HEADER_ROW.every((header, index) => firstRow[index] === header)) {
    return;
  }

  await requestSheetsApi(
    `${spreadsheetId}/values/${encodeURIComponent(
      HEADER_RANGE,
    )}?valueInputOption=RAW`,
    {
      method: "PUT",
      body: JSON.stringify({
        values: [HEADER_ROW],
      }),
    },
  );
}

export async function getAuthorPresets() {
  const rows = await getAuthorPresetRows();

  return rows
    .map(({ preset }) => preset)
    .sort((left, right) => left.name.localeCompare(right.name, "ko"));
}

async function getAuthorPresetRows() {
  await ensureHeaderRow();

  const spreadsheetId = getSpreadsheetId();
  const data = await requestSheetsApi<GoogleSheetsValuesResponse>(
    `${spreadsheetId}/values/${encodeURIComponent(AUTHOR_PRESET_RANGE)}`,
  );
  const rows = data.values ?? [];

  return rows
    .slice(1)
    .map((row, index) => toPresetRow(row, index + 1))
    .filter((row): row is AuthorPresetRow => Boolean(row));
}

export async function createAuthorPreset(input: {
  name: string;
  headline: string;
}) {
  await ensureHeaderRow();

  const now = new Date().toISOString();
  const preset: AuthorPreset = {
    id: randomUUID(),
    name: input.name.trim(),
    headline: input.headline.trim(),
    createdAt: now,
    updatedAt: now,
  };
  const spreadsheetId = getSpreadsheetId();

  await requestSheetsApi(
    `${spreadsheetId}/values/${encodeURIComponent(
      AUTHOR_PRESET_RANGE,
    )}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      body: JSON.stringify({
        values: [toSheetRow(preset)],
      }),
    },
  );

  return preset;
}

export async function updateAuthorPreset(input: {
  id: string;
  name: string;
  headline: string;
}) {
  const id = input.id.trim();
  const rows = await getAuthorPresetRows();
  const existingRow = rows.find((row) => row.preset.id === id);

  if (!existingRow) {
    throw new Error("작성자 프리셋을 찾지 못했습니다.");
  }

  const updatedPreset: AuthorPreset = {
    ...existingRow.preset,
    name: input.name.trim(),
    headline: input.headline.trim(),
    updatedAt: new Date().toISOString(),
  };
  const spreadsheetId = getSpreadsheetId();
  const updateRange = `${SHEET_NAME}!A${existingRow.rowNumber}:E${existingRow.rowNumber}`;

  await requestSheetsApi(
    `${spreadsheetId}/values/${encodeURIComponent(
      updateRange,
    )}?valueInputOption=RAW`,
    {
      method: "PUT",
      body: JSON.stringify({
        values: [toSheetRow(updatedPreset)],
      }),
    },
  );

  return updatedPreset;
}
