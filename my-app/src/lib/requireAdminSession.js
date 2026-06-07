import { verifySessionToken } from "./session";

export async function requireAdminSession(req) {
  const token = req.cookies.get("authToken")?.value;
  return verifySessionToken(token);
}
