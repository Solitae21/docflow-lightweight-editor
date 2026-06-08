import type {
  CreateShareRequest,
  DocumentDetail,
  DocumentRecord,
  DocumentsResponse,
  ShareWithUser,
  UpdateDocumentRequest,
  User,
} from "@docflow/shared";

const USER_STORAGE_KEY = "docflow.user";

export function getStoredUser(): User | null {
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function setStoredUser(user: User | null): void {
  if (user) localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  else localStorage.removeItem(USER_STORAGE_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const user = getStoredUser();
  const headers = new Headers(options.headers);
  if (user) headers.set("x-user-id", user.id);
  // Don't force JSON content-type for FormData uploads.
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`/api${path}`, { ...options, headers });

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${res.status}).`);
  }
  return data as T;
}

export const api = {
  // Auth / users
  listUsers: () => request<User[]>("/users"),
  login: (email: string) =>
    request<User>("/auth/login", { method: "POST", body: JSON.stringify({ email }) }),

  // Documents
  listDocuments: () => request<DocumentsResponse>("/documents"),
  createDocument: () =>
    request<DocumentRecord>("/documents", { method: "POST", body: JSON.stringify({}) }),
  uploadDocument: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<DocumentRecord>("/documents/upload", { method: "POST", body: form });
  },
  getDocument: (id: string) => request<DocumentDetail>(`/documents/${id}`),
  updateDocument: (id: string, body: UpdateDocumentRequest) =>
    request<DocumentRecord>(`/documents/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteDocument: (id: string) =>
    request<void>(`/documents/${id}`, { method: "DELETE" }),

  // Shares
  listShares: (id: string) => request<ShareWithUser[]>(`/documents/${id}/shares`),
  createShare: (id: string, body: CreateShareRequest) =>
    request<ShareWithUser>(`/documents/${id}/shares`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  revokeShare: (id: string, userId: string) =>
    request<void>(`/documents/${id}/shares/${userId}`, { method: "DELETE" }),
};
