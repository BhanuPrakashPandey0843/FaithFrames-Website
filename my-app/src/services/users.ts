export interface UserProfile {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
  phoneNumber?: string;
  address?: string;
  lastScore?: number;
  lastPlayed?: string;
  updatedAt?: string;
  createdAt?: string;
}

/**
 * Fetches all registered users from the backend API.
 */
export async function fetchUsers(): Promise<UserProfile[]> {
  try {
    const res = await fetch("/api/admin/users", { cache: "no-store" });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error ${res.status}`);
    }
    const data = await res.json();
    return data.users || [];
  } catch (err: any) {
    console.error("[services/users fetchUsers]", err);
    throw err;
  }
}
