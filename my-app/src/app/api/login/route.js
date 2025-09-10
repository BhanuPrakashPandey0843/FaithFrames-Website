export async function POST(req) {
  const { email, password } = await req.json();

  const ADMIN_EMAIL = "faithframes@gmail.com";
  const ADMIN_PASS = "Faith1234@";

  if (email === ADMIN_EMAIL && password === ADMIN_PASS) {
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } else {
    return new Response(JSON.stringify({ error: "Invalid credentials" }), { status: 401 });
  }
}





