async function parseResponse(res) {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.message || "Admin request failed");
  }
  return json;
}

export async function fetchAdminContent(collection) {
  const res = await fetch(`/api/admin/content?collection=${encodeURIComponent(collection)}`, { 
    cache: "no-store" 
  });
  return parseResponse(res);
}

export async function adminCreate(collection, data) {
  const res = await fetch("/api/admin/content", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ collection, data }),
  });
  return parseResponse(res);
}

export async function adminUpdate(collection, id, data) {
  const res = await fetch("/api/admin/content", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ collection, id, data }),
  });
  return parseResponse(res);
}

export async function adminDelete(collection, id) {
  const res = await fetch("/api/admin/content", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ collection, id }),
  });
  return parseResponse(res);
}

export async function fetchAdminStats() {
  const res = await fetch("/api/admin/stats", { cache: "no-store" });
  return parseResponse(res);
}

export async function fetchAdminUsers() {
  const res = await fetch("/api/admin/users", { cache: "no-store" });
  return parseResponse(res);
}

export async function adminCreateUser(data) {
  const res = await fetch("/api/admin/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return parseResponse(res);
}

export async function adminUpdateUser(id, data) {
  const res = await fetch("/api/admin/users", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, data }),
  });
  return parseResponse(res);
}

export async function adminDeleteUser(id) {
  const res = await fetch("/api/admin/users", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  return parseResponse(res);
}
