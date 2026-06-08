import { useCallback, useEffect, useState } from "react";
import type { DocumentsResponse } from "@docflow/shared";
import { api } from "../api/client";

interface UseDocuments {
  docs: DocumentsResponse;
  loading: boolean; // initial / refresh load in flight
  busy: boolean; // a create or upload is in flight
  deletingId: string | null; // id of the document currently being deleted
  error: string | null;
  reload: () => Promise<void>;
  create: () => Promise<string | null>; // resolves to the new document id (or null on failure)
  upload: (file: File) => Promise<string | null>;
  remove: (id: string) => Promise<void>;
}

const EMPTY: DocumentsResponse = { owned: [], shared: [] };

// Owns the dashboard's document-list data and its mutations. Pages call this and
// render the result; no fetch logic lives in the page (CLAUDE.md principle #6).
export function useDocuments(): UseDocuments {
  const [docs, setDocs] = useState<DocumentsResponse>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setDocs(await api.listDocuments());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const create = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const doc = await api.createDocument();
      return doc.id;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  const upload = useCallback(async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const doc = await api.uploadDocument(file);
      return doc.id;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  const remove = useCallback(
    async (id: string) => {
      setDeletingId(id);
      setError(null);
      try {
        await api.deleteDocument(id);
        await reload();
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setDeletingId(null);
      }
    },
    [reload]
  );

  return { docs, loading, busy, deletingId, error, reload, create, upload, remove };
}
