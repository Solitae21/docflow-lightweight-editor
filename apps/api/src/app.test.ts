import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

// A table-aware mock of the Supabase client: each test enqueues the responses its
// route will pull, in call order, per table. Terminal calls (single/maybeSingle)
// dequeue from that table's queue. Defined via vi.hoisted so the vi.mock factory
// (hoisted above imports) can reference it.
const h = vi.hoisted(() => {
  const queues: Record<string, { data: unknown; error: unknown }[]> = {};
  return {
    enqueue(table: string, resp: { data: unknown; error: unknown }) {
      (queues[table] ??= []).push(resp);
    },
    dequeue(table: string) {
      const q = queues[table];
      return q && q.length ? q.shift()! : { data: null, error: null };
    },
    reset() {
      for (const k of Object.keys(queues)) delete queues[k];
    },
  };
});

vi.mock("./supabase.js", () => {
  const makeBuilder = (table: string) => {
    const b: Record<string, unknown> = {
      select: () => b,
      eq: () => b,
      order: () => b,
      insert: () => b,
      update: () => b,
      delete: () => b,
      upsert: () => b,
      single: () => Promise.resolve(h.dequeue(table)),
      maybeSingle: () => Promise.resolve(h.dequeue(table)),
    };
    return b;
  };
  return { supabase: { from: (t: string) => makeBuilder(t) } };
});

const { createApp } = await import("./app.js");
const app = createApp();

const AUTH_USER = { id: "u1", email: "u1@x.com", name: "User One", created_at: "" };
const OTHERS_DOC = {
  id: "doc-1",
  title: "T",
  content: "",
  owner_id: "owner-x", // not AUTH_USER
  created_at: "",
  updated_at: "",
};
const OWN_DOC = { ...OTHERS_DOC, owner_id: "u1" };

// Make requireUser succeed for the next request.
function authOk() {
  h.enqueue("users", { data: AUTH_USER, error: null });
}

beforeEach(() => h.reset());

describe("auth guard (requireUser)", () => {
  it("401 when the x-user-id header is missing", async () => {
    const res = await request(app).get("/api/documents");
    expect(res.status).toBe(401);
  });

  it("401 when the user id is not a known user", async () => {
    h.enqueue("users", { data: null, error: { message: "nope" } });
    const res = await request(app).get("/api/documents").set("x-user-id", "ghost");
    expect(res.status).toBe(401);
  });
});

describe("document access guards", () => {
  it("404 when the user has no access to the document", async () => {
    authOk();
    h.enqueue("documents", { data: OTHERS_DOC, error: null });
    h.enqueue("document_shares", { data: null, error: null }); // no share

    const res = await request(app).get("/api/documents/doc-1").set("x-user-id", "u1");
    expect(res.status).toBe(404);
  });

  it("403 when a view-only sharee tries to PATCH", async () => {
    authOk();
    h.enqueue("documents", { data: OTHERS_DOC, error: null });
    h.enqueue("document_shares", { data: { permission: "view" }, error: null });

    const res = await request(app)
      .patch("/api/documents/doc-1")
      .set("x-user-id", "u1")
      .send({ title: "hijack" });
    expect(res.status).toBe(403);
  });

  it("403 when a non-owner (edit sharee) tries to DELETE", async () => {
    authOk();
    h.enqueue("documents", { data: OTHERS_DOC, error: null });
    h.enqueue("document_shares", { data: { permission: "edit" }, error: null });

    const res = await request(app)
      .delete("/api/documents/doc-1")
      .set("x-user-id", "u1");
    expect(res.status).toBe(403);
  });

  it("403 when a non-owner tries to manage shares", async () => {
    authOk();
    h.enqueue("documents", { data: OTHERS_DOC, error: null });
    h.enqueue("document_shares", { data: { permission: "edit" }, error: null });

    const res = await request(app)
      .post("/api/documents/doc-1/shares")
      .set("x-user-id", "u1")
      .send({ email: "bob@x.com", permission: "view" });
    expect(res.status).toBe(403);
  });

  it("200 and returns ownerName when the owner opens their document", async () => {
    authOk();
    h.enqueue("documents", { data: OWN_DOC, error: null }); // getDocumentAccess
    h.enqueue("users", { data: { name: "User One" }, error: null }); // toDocumentDetail owner name

    const res = await request(app).get("/api/documents/doc-1").set("x-user-id", "u1");
    expect(res.status).toBe(200);
    expect(res.body.accessLevel).toBe("owner");
    expect(res.body.ownerName).toBe("User One");
  });
});
