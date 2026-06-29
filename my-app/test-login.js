import 'dotenv/config';

console.log("=== Test Login ===");
console.log("ADMIN_EMAIL:", process.env.ADMIN_EMAIL?.trim()?.toLowerCase());
console.log("ADMIN_PASSWORD:", process.env.ADMIN_PASSWORD?.trim());
console.log("ADMIN_SESSION_SECRET exists:", !!process.env.ADMIN_SESSION_SECRET?.trim());

function tryEnvAdminLogin(email, password) {
  const adminEmail = process.env.ADMIN_EMAIL?.trim()?.toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD?.trim();
  console.log("\n=== Try Env Admin Login ===");
  console.log("Input email:", email?.toLowerCase());
  console.log("Expected email:", adminEmail);
  console.log("Input password:", password);
  console.log("Expected password:", adminPassword);
  console.log("Email match:", email?.toLowerCase() === adminEmail);
  console.log("Password match:", password === adminPassword);
  if (!adminEmail || !adminPassword) return false;
  return email?.toLowerCase() === adminEmail && password === adminPassword;
}

const testEmail = "admin@example.com";
const testPassword = "admin123";
console.log("\nTesting with", testEmail, testPassword);
const result = tryEnvAdminLogin(testEmail, testPassword);
console.log("\nResult:", result);
