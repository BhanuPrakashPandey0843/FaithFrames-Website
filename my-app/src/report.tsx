import React from "react";

export default function Report() {
  return (
    <main className="max-w-5xl mx-auto p-6 space-y-8">
      <section>
        <h1 className="text-3xl font-bold">FaithFrames — End‑to‑End Audit & Technical Review</h1>
        <p className="text-gray-700">
          Brutally honest, production‑grade audit of the current Next.js codebase, covering architecture, code quality,
          UI/UX, security, performance, scalability, and production readiness. All findings reference concrete files.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold">Executive Summary</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            Product is a Next.js 15 App Router app with Tailwind v4, React 19, Firebase client SDK, deployed via Netlify plugin.
          </li>
          <li>
            Critical security flaws: hardcoded admin credentials and placeholder tokens in{" "}
            <a href="file:///d:/2025/Personal/FaithFrames%20Website/my-app/src/app/api/login/route.js">route.js</a>, cookie vs localStorage auth mismatch between{" "}
            <a href="file:///d:/2025/Personal/FaithFrames%20Website/my-app/src/middleware.js">middleware.js</a> and{" "}
            <a href="file:///d:/2025/Personal/FaithFrames%20Website/my-app/src/app/admin/page.js">admin/page.js</a>.
          </li>
          <li>
            Architecture conflicts: <span className="font-medium">output: &apos;export&apos;</span> in{" "}
            <a href="file:///d:/2025/Personal/FaithFrames%20Website/my-app/next.config.mjs">next.config.mjs</a> disables API routes and middleware,
            yet Netlify plugin is configured for server functions in{" "}
            <a href="file:///d:/2025/Personal/FaithFrames%20Website/my-app/netlify.toml">netlify.toml</a>. This breaks authentication and any server logic.
          </li>
          <li>
            Code quality is mixed: visually polished UI with Tailwind and Framer Motion, but duplication, hardcoded values, inconsistent state/auth patterns,
            and lack of validation, logging, and tests.
          </li>
          <li>
            Production‑readiness is low due to security issues, env handling gaps, and deployment misconfiguration.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold">Architecture Overview</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            Tech Stack:
            <ul className="list-disc pl-6 mt-1">
              <li>Frontend: Next.js <span className="font-medium">15.4.1</span>, React <span className="font-medium">19.1.0</span>, Tailwind CSS <span className="font-medium">4.1.11</span>, Framer Motion, Lucide, Recharts.</li>
              <li>Backend: Next.js API routes (App Router), Netlify serverless target intended but disabled by static export.</li>
              <li>Database: Firebase Firestore (client SDK). Config in{" "}
                <a href="file:///d:/2025/Personal/FaithFrames%20Website/my-app/src/firebase.js">firebase.js</a>.
              </li>
            </ul>
          </li>
          <li>
            Architecture Pattern: Monolith (Next App Router) with client‑heavy data access (Firestore from client components).
          </li>
          <li>
            Folder Structure: App Router under{" "}
            <a href="file:///d:/2025/Personal/FaithFrames%20Website/my-app/src/app">src/app</a>, components under{" "}
            <a href="file:///d:/2025/Personal/FaithFrames%20Website/my-app/src/components">src/components</a>. Multiple duplicated asset folders (e.g., Hero assets in both public and component directories).
          </li>
          <li>
            Environment Config: No .env usage; Firebase config is hardcoded in{" "}
            <a href="file:///d:/2025/Personal/FaithFrames%20Website/my-app/src/firebase.js">firebase.js</a>. Netlify sets Node 18 and Next server target in{" "}
            <a href="file:///d:/2025/Personal/FaithFrames%20Website/my-app/netlify.toml">netlify.toml</a>.
          </li>
          <li>
            Build/Deploy:
            <ul className="list-disc pl-6 mt-1">
              <li>Build via <span className="font-mono">npm run build</span> → Next build.</li>
              <li>
                <span className="font-mono">next.config.mjs</span> sets <span className="font-mono">output: &apos;export&apos;</span> and <span className="font-mono">trailingSlash: true</span>; images unoptimized.
              </li>
              <li>Netlify plugin configured; publish path <span className="font-mono">.next</span>.</li>
            </ul>
          </li>
        </ul>
        <h3 className="text-xl font-semibold mt-4">Architecture Diagram (Text)</h3>
        <pre className="bg-gray-50 p-4 rounded border overflow-x-auto text-sm whitespace-pre-wrap">
{`[Client (Next.js React 19, Tailwind, Framer Motion)]
      |  \
      |   \-- fetch /api/login (App Router API route)
      |            |
      |            v
      |     [Next.js Serverless Function on Netlify (intended)]
      |            |
      |         (sets auth cookie)  -- MISMATCH with client localStorage check
      |
      +-- [Firebase SDK (Firestore, Storage, Auth) from client components]

[Build/Deploy]
  next.config: output: 'export' (static)  <-- conflicts with API/middleware
  netlify.toml: target 'server' with @netlify/plugin-nextjs`}
        </pre>
        <h3 className="text-xl font-semibold mt-4">Data Flow</h3>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            Public pages render client components and static assets. Firebase is initialized on client and used for reads/writes (e.g.,{" "}
            <a href="file:///d:/2025/Personal/FaithFrames%20Website/my-app/src/components/Profilemanager/Profilemanager.js">Profilemanager.js</a>).
          </li>
          <li>
            Login form posts to <span className="font-mono">/api/login</span> which sets <span className="font-mono">authToken</span> cookie (httpOnly).
          </li>
          <li>
            Middleware checks <span className="font-mono">authToken</span> cookie for <span className="font-mono">/admin</span> routes, but the admin page checks localStorage, creating a broken auth flow.
          </li>
        </ul>
        <h3 className="text-xl font-semibold mt-4">Request–Response Lifecycle</h3>
        <ol className="list-decimal pl-6 space-y-2">
          <li>Client submits credentials to <span className="font-mono">POST /api/login</span>.</li>
          <li>Handler validates via hardcoded values and sets a fake token cookie; no JWT signing or user store.</li>
          <li>Middleware protects <span className="font-mono">/admin/*</span> by checking cookie (server‑side).</li>
          <li>Admin page performs client‑side guard via <span className="font-mono">localStorage</span>, causing inconsistency.</li>
          <li>Data operations to Firestore happen directly from client via Firebase SDK; no backend validation layer.</li>
        </ol>
      </section>

      <section>
        <h2 className="text-2xl font-semibold">Code Quality Audit</h2>
        <h3 className="text-xl font-semibold mt-2">Frontend</h3>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            Component Structure: Modular but duplication across hero/asset folders. Example: duplicated images in{" "}
            <a href="file:///d:/2025/Personal/FaithFrames%20Website/my-app/public/Hero">public/Hero</a> and{" "}
            <a href="file:///d:/2025/Personal/FaithFrames%20Website/my-app/src/components/Hero">components/Hero</a>.
          </li>
          <li>
            Reusability: Common UI primitives exist (<a href="file:///d:/2025/Personal/FaithFrames%20Website/my-app/src/components/ui/card.js">ui/card.js</a>) but are underused across components.
          </li>
          <li>
            State Management: Local component state only; fine for now but leads to prop drilling and inconsistent auth checks (cookie vs localStorage).
          </li>
          <li>
            API Integration: Single login POST in{" "}
            <a href="file:///d:/2025/Personal/FaithFrames%20Website/my-app/src/components/Signup/Signup.js">Signup.js</a> using <span className="font-mono">fetch</span>.
            No abstraction layer or typed client; error messages are generic.
          </li>
          <li>
            Error/Loading States: Present in login; absent in Firestore heavy components (e.g., Upload panels). Spinners/toasts missing for async operations.
          </li>
          <li>
            Responsiveness: Good Tailwind usage and motion animations; layouts are responsive in <a href="file:///d:/2025/Personal/FaithFrames%20Website/my-app/src/components/Navbar/Navbar.js">Navbar.js</a>, <a href="file:///d:/2025/Personal/FaithFrames%20Website/my-app/src/components/Pricing/Pricing.js">Pricing.js</a>.
          </li>
          <li>
            Performance: Framer Motion on many elements without conditional reduction may impact low‑end devices. Real‑time Firestore listeners established without memoization or unsubscribe safeguards in some components.
          </li>
          <li>
            Accessibility: Some images lack meaningful <span className="font-mono">alt</span> text (external SVGs in auth pages are okay); color contrast generally acceptable, but focus states for buttons/links are not consistently visible.
          </li>
          <li>
            Code Duplication/Hardcoded Values: Metrics and labels hardcoded in{" "}
            <a href="file:///d:/2025/Personal/FaithFrames%20Website/my-app/src/components/Dashboard/Dashboard.js">Dashboard.js</a>; multiple static arrays repeated across components.
          </li>
        </ul>

        <h3 className="text-xl font-semibold mt-4">Backend</h3>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            API Structure: Only <span className="font-mono">/api/login</span> implemented in{" "}
            <a href="file:///d:/2025/Personal/FaithFrames%20Website/my-app/src/app/api/login/route.js">route.js</a>. File contains two <span className="font-mono">POST</span> exports; the latter overrides the former → dead code and confusion.
          </li>
          <li>
            Controller/Middleware: No separation into services or validators; middleware in{" "}
            <a href="file:///d:/2025/Personal/FaithFrames%20Website/my-app/src/middleware.js">middleware.js</a> is minimal but contradicts client checks.
          </li>
          <li>
            Authentication: Uses hardcoded credentials and unsigned placeholder token. No JWT; no session store; no refresh/expiry enforcement beyond cookie maxAge.
          </li>
          <li>
            Input Validation: Absent (no schema validation). No rate limiting or brute‑force protection on login route.
          </li>
          <li>
            Error Handling/Logging: Minimal try/catch; no structured logs; no correlation IDs.
          </li>
          <li>
            Security: <span className="font-medium">Critical</span> exposure of admin credentials in source and Firebase config hardcoded (Firebase keys are not secrets, but security depends on Firestore rules which are not present here).
          </li>
        </ul>

        <h3 className="text-xl font-semibold mt-4">Database</h3>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            Schema: Firestore collections used directly from client (e.g., <span className="font-mono">users</span> in{" "}
            <a href="file:///d:/2025/Personal/FaithFrames%20Website/my-app/src/components/Profilemanager/Profilemanager.js">Profilemanager.js</a>). No server‑side validation or security rules referenced.
          </li>
          <li>
            Queries: Uses <span className="font-mono">orderBy</span> and <span className="font-mono">onSnapshot</span>. Composite indexes may be required in production; not documented.
          </li>
          <li>
            Consistency/Migrations: No migration strategy. Data shapes are implicit; risk of drift and breaking UI.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold">UI/UX Review</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Design Consistency: Overall cohesive with gradients and consistent typography via Geist fonts.</li>
          <li>Typography: Adequate hierarchy; body font fallback to system; consider standardizing sizes via Tailwind theme tokens.</li>
          <li>Color/Spacing: Thoughtful spacing; expand design tokens for consistent color usage.</li>
          <li>Responsiveness: Strong across core pages; mobile menus and forms are usable.</li>
          <li>UX Clarity: Auth flows confusing due to mismatched storage and missing success feedback.</li>
          <li>Micro‑interactions: Nice motion; add loading and success/failure toasts.</li>
          <li>Accessibility: Improve focus states, alt text, and aria labels for interactive controls.</li>
        </ul>
        <p className="mt-2">UI Score: <span className="font-semibold">7.5/10</span> | UX Score: <span className="font-semibold">6/10</span></p>
        <h3 className="text-xl font-semibold mt-2">Exact Fixes</h3>
        <ul className="list-disc pl-6 space-y-2">
          <li>Add a shared <span className="font-mono">useToast()</span> or small notification component for async ops.</li>
          <li>Enforce focus-visible styles and keyboard navigability in Navbar and forms.</li>
          <li>Consolidate duplicate images into <span className="font-mono">/public</span>; reference via <span className="font-mono">&lt;Image&gt;</span> and Next Image domains.</li>
          <li>Standardize spacing and color via Tailwind design tokens in <span className="font-mono">globals.css</span>.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold">Security Audit</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>JWT/Token: No JWT; fake token string set in cookie. <span className="font-medium">Critical</span>.</li>
          <li>Token Storage: httpOnly cookie is good, but client checks <span className="font-mono">localStorage</span>. <span className="font-medium">High</span>.</li>
          <li>XSS: Minimal templating risk; validate and sanitize user inputs before writing to Firestore. <span className="font-medium">Medium</span>.</li>
          <li>CSRF: SameSite=strict helps; but add CSRF token for unsafe methods if future forms arise. <span className="font-medium">Medium</span>.</li>
          <li>Injection: No SQL here; still validate inputs on server before Firestore writes. <span className="font-medium">Medium</span>.</li>
          <li>Rate Limiting: None on login route; add per‑IP rate limit. <span className="font-medium">High</span>.</li>
          <li>Password Handling: Hardcoded secrets; no hashing; not using Firebase Auth or custom auth. <span className="font-medium">Critical</span>.</li>
          <li>API Exposure: Dead code with hardcoded admin creds left in source. <span className="font-medium">Critical</span>.</li>
          <li>Env Leaks: Firebase config is public by design; ensure strict Firestore rules. <span className="font-medium">Medium</span>.</li>
          <li>CORS: Same‑origin only; fine for now. <span className="font-medium">Low</span>.</li>
        </ul>
        <h3 className="text-xl font-semibold mt-2">Fix Recommendations</h3>
        <ul className="list-disc pl-6 space-y-2">
          <li>Remove all hardcoded credentials and duplicate <span className="font-mono">POST</span> handlers in{" "}
            <a href="file:///d:/2025/Personal/FaithFrames%20Website/my-app/src/app/api/login/route.js">/api/login</a>.
          </li>
          <li>Implement proper JWT (HS256/RS256) with <span className="font-mono">exp</span>, <span className="font-mono">iat</span>, <span className="font-mono">iss</span>; store secret in environment variables.</li>
          <li>Align auth checks: read cookie in client via a session endpoint or rely on middleware + server components; stop using <span className="font-mono">localStorage</span> for auth.</li>
          <li>Add rate limiting on login (IP + username), and exponential backoff.</li>
          <li>Introduce input validation with Zod/Yup on server routes before Firestore writes.</li>
          <li>Enforce Firestore security rules for role‑based access (admin only writes).</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold">Performance & Scalability</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Unnecessary Re‑renders: Animated elements render often; memoize heavy lists and charts in{" "}
            <a href="file:///d:/2025/Personal/FaithFrames%20Website/my-app/src/components/Dashboard/Dashboard.js">Dashboard.js</a>.
          </li>
          <li>Heavy API Calls: Real‑time <span className="font-mono">onSnapshot</span> listeners across pages; gate by visibility and paginate where possible.</li>
          <li>Blocking Ops: None evident server‑side; but Netlify + static export conflict blocks server features.</li>
          <li>Bundle Size: Framer Motion and Recharts are heavy; use dynamic imports and <span className="font-mono">ssr: false</span> for charting.</li>
          <li>Caching: Add HTTP caching and SWR/React cache for non‑real‑time data.</li>
          <li>Scalability: Client‑only data writes do not scale for admin logic or RBAC; introduce server layer.</li>
        </ul>
        <h3 className="text-xl font-semibold mt-2">Optimization Roadmap</h3>
        <ul className="list-disc pl-6 space-y-2">
          <li>Fix Next config: remove <span className="font-mono">output: &apos;export&apos;</span> if using serverless functions and middleware.</li>
          <li>Dynamic import charts and large components; reduce motion on low‑power devices.</li>
          <li>Throttle or conditionally attach Firestore listeners; prefer query‑based pagination over full collection snapshots.</li>
          <li>Introduce shared data hooks with caching and suspense boundaries where appropriate.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold">Production Readiness</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Env Separation: None; introduce <span className="font-mono">.env.local</span>, <span className="font-mono">.env.production</span> and never hardcode secrets.</li>
          <li>Logging: Add structured logs (pino) and per‑request IDs. Capture errors to Sentry.</li>
          <li>Monitoring: Add uptime and error monitoring (Sentry/Datadog), and Netlify function metrics.</li>
          <li>CI/CD: No pipeline present; add CI with lint, typecheck, and preview deploys.</li>
          <li>Dockerization: Not required for Netlify but useful for local parity; optional.</li>
          <li>Fallback Strategy: Add global error boundaries and a user‑friendly error page.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold">Scores</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Code Quality Score: <span className="font-semibold">5.5/10</span></li>
          <li>UI/UX Score: <span className="font-semibold">6.7/10</span></li>
          <li>Security Score: <span className="font-semibold">3/10</span></li>
          <li>Performance Score: <span className="font-semibold">6/10</span></li>
          <li>Scalability Score: <span className="font-semibold">5/10</span></li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold">Top 10 Critical Issues</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li>Hardcoded admin credentials in <a href="file:///d:/2025/Personal/FaithFrames%20Website/my-app/src/app/api/login/route.js">/api/login</a>.</li>
          <li>Duplicate POST handlers in login route → undefined behavior.</li>
          <li>Unsigned fake token used for auth; no JWT signing or verification.</li>
          <li>Auth mismatch: cookie in middleware vs localStorage in admin page.</li>
          <li><span className="font-mono">output: &apos;export&apos;</span> disables API and middleware while Netlify expects server.</li>
          <li>No input validation or rate limiting on <span className="font-mono">/api/login</span>.</li>
          <li>Direct client writes to Firestore without server validation or RBAC.</li>
          <li>Deployment config ambiguity (publish <span className="font-mono">.next</span> with plugin + static export).</li>
          <li>Duplicated assets and inconsistent component reuse.</li>
          <li>No tests, no CI, no monitoring.</li>
        </ol>
      </section>

      <section>
        <h2 className="text-2xl font-semibold">Quick Wins</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Delete hardcoded credentials and unify login handler; implement JWT using a server secret.</li>
          <li>Remove <span className="font-mono">output: &apos;export&apos;</span> or disable APIs/middleware consistently; choose one deployment model.</li>
          <li>Use cookie‑based session check in admin page (call a <span className="font-mono">/api/session</span> endpoint) instead of localStorage.</li>
          <li>Add simple Zod validation for login payload; add rate limiting.</li>
          <li>Consolidate images into <span className="font-mono">/public</span>; remove duplicates in component folders.</li>
          <li>Add loading and error states with toasts for writes to Firestore.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold">Long‑Term Improvements</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Adopt Firebase Auth or a proper auth service; map roles (admin, editor, viewer).</li>
          <li>Introduce a thin server layer for privileged operations; guard Firestore with strict rules.</li>
          <li>Create a shared data/HTTP module with typed contracts and error handling.</li>
          <li>Establish CI with lint, typecheck, and Netlify preview deploys; add testing.</li>
          <li>Implement observability (structured logs, metrics, tracing) and error boundaries.</li>
          <li>Refactor to reduce duplication and increase reuse of UI primitives.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold">Final Verdict</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Production Ready: <span className="font-semibold">No</span> — security and deployment conflicts must be resolved.</li>
          <li>Scalability: <span className="font-semibold">Limited</span> — client‑only Firestore writes and missing RBAC hinder scale.</li>
          <li>Likely Developer Level: <span className="font-semibold">Junior → Mid</span> — strong UI effort, but backend/security gaps.</li>
          <li>
            To meet FAANG‑level standards: remove secrets, implement robust auth and validation, add tests and CI; enforce code review, logging, and monitoring; resolve deployment model and infra as code.
          </li>
        </ul>
      </section>
    </main>
  );
}

