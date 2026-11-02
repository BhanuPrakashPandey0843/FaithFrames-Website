import assert from "node:assert/strict";
import test from "node:test";
import {
  RECEIPT_CHUNK_SIZE,
  SEND_CHUNK_SIZE,
  classifyPushError,
  getExpoReceipts,
  isExpoPushToken,
  sendExpoPushMessages,
} from "../expoPush.js";
import { commitInChunks } from "../batch.js";

const noSleep = async () => {};
const token = (n) => `ExponentPushToken[device${String(n).padStart(6, "0")}]`;
const messages = (count) => Array.from({ length: count }, (_, i) => ({ to: token(i), title: "t", body: "b" }));

/** Minimal fetch double: `handler(url, body, callIndex)` returns {status, json, headers}. */
function fakeFetch(handler) {
  const calls = [];
  const impl = async (url, init) => {
    const body = JSON.parse(init.body);
    const index = calls.length;
    calls.push({ url, body, headers: init.headers });
    const out = await handler(url, body, index);
    return {
      ok: out.status >= 200 && out.status < 300,
      status: out.status,
      headers: { get: (name) => out.headers?.[name.toLowerCase()] ?? null },
      json: async () => out.json,
    };
  };
  impl.calls = calls;
  return impl;
}

const okTickets = (batch) => ({ status: 200, json: { data: batch.map((_, i) => ({ status: "ok", id: `ticket-${i}` })) } });

test("accepts only well-formed Expo push tokens", () => {
  assert.equal(isExpoPushToken(token(1)), true);
  assert.equal(isExpoPushToken("ExpoPushToken[abcdef123456]"), true);
  assert.equal(isExpoPushToken("fcm-raw-device-token"), false);
  assert.equal(isExpoPushToken("ExponentPushToken[]"), false);
  assert.equal(isExpoPushToken(""), false);
  assert.equal(isExpoPushToken(null), false);
  assert.equal(isExpoPushToken(`ExponentPushToken[${"x".repeat(300)}]`), false);
});

test("splits recipients into batches of at most 100 and keeps tickets in message order", async () => {
  const fetchImpl = fakeFetch((_, batch) => okTickets(batch));
  const tickets = await sendExpoPushMessages(messages(250), { fetchImpl, accessToken: "", sleep: noSleep });
  assert.equal(SEND_CHUNK_SIZE, 100);
  assert.deepEqual(fetchImpl.calls.map((call) => call.body.length), [100, 100, 50]);
  assert.equal(tickets.length, 250);
  assert.ok(tickets.every((ticket) => ticket.status === "ok"));
});

test("sends the Authorization header only when an access token is configured", async () => {
  const without = fakeFetch((_, batch) => okTickets(batch));
  await sendExpoPushMessages(messages(1), { fetchImpl: without, accessToken: "", sleep: noSleep });
  assert.equal(without.calls[0].headers.Authorization, undefined);

  const withToken = fakeFetch((_, batch) => okTickets(batch));
  await sendExpoPushMessages(messages(1), { fetchImpl: withToken, accessToken: "secret-token", sleep: noSleep });
  assert.equal(withToken.calls[0].headers.Authorization, "Bearer secret-token");
});

test("retries transient 5xx responses and then succeeds without duplicating the batch", async () => {
  const fetchImpl = fakeFetch((_, batch, index) =>
    index < 2 ? { status: 503, json: {} } : okTickets(batch)
  );
  const tickets = await sendExpoPushMessages(messages(3), { fetchImpl, accessToken: "", sleep: noSleep });
  assert.equal(fetchImpl.calls.length, 3);
  assert.ok(tickets.every((ticket) => ticket.status === "ok"));
});

test("honours Retry-After on HTTP 429 rate limiting", async () => {
  const sleeps = [];
  const fetchImpl = fakeFetch((_, batch, index) =>
    index === 0 ? { status: 429, json: {}, headers: { "retry-after": "2" } } : okTickets(batch)
  );
  const tickets = await sendExpoPushMessages(messages(2), {
    fetchImpl,
    accessToken: "",
    sleep: async (ms) => { sleeps.push(ms); },
  });
  assert.deepEqual(sleeps, [2000]);
  assert.ok(tickets.every((ticket) => ticket.status === "ok"));
});

test("does not retry permanent 4xx errors and marks every ticket as non-retryable", async () => {
  const fetchImpl = fakeFetch(() => ({ status: 400, json: { errors: [{ message: "Bad payload" }] } }));
  const tickets = await sendExpoPushMessages(messages(2), { fetchImpl, accessToken: "", sleep: noSleep });
  assert.equal(fetchImpl.calls.length, 1);
  assert.deepEqual(tickets.map((t) => [t.status, t.retryable, t.message]), [
    ["error", false, "Bad payload"],
    ["error", false, "Bad payload"],
  ]);
});

test("reports network failures as retryable after the retries are exhausted", async () => {
  let attempts = 0;
  const fetchImpl = async () => {
    attempts++;
    throw new Error("network down");
  };
  const tickets = await sendExpoPushMessages(messages(2), { fetchImpl, accessToken: "", sleep: noSleep, maxRetries: 2 });
  assert.equal(attempts, 3);
  assert.ok(tickets.every((t) => t.status === "error" && t.retryable === true));
});

test("a failed batch does not affect the other batches (partial failure)", async () => {
  const fetchImpl = fakeFetch((_, batch, index) =>
    index === 1 ? { status: 400, json: { errors: [{ message: "rejected" }] } } : okTickets(batch)
  );
  const tickets = await sendExpoPushMessages(messages(250), { fetchImpl, accessToken: "", sleep: noSleep });
  assert.equal(tickets.length, 250);
  assert.equal(tickets.slice(0, 100).every((t) => t.status === "ok"), true);
  assert.equal(tickets.slice(100, 200).every((t) => t.status === "error" && t.retryable === false), true);
  assert.equal(tickets.slice(200).every((t) => t.status === "ok"), true);
});

test("a response whose size does not match the request is treated as a retryable error", async () => {
  const fetchImpl = fakeFetch(() => ({ status: 200, json: { data: [{ status: "ok", id: "only-one" }] } }));
  const tickets = await sendExpoPushMessages(messages(3), { fetchImpl, accessToken: "", sleep: noSleep });
  assert.ok(tickets.every((t) => t.status === "error" && t.retryable === true));
});

test("classifies provider errors", () => {
  assert.deepEqual(
    classifyPushError({ details: { error: "DeviceNotRegistered" } }),
    { invalidToken: true, retryable: false, config: false, code: "DeviceNotRegistered" }
  );
  assert.equal(classifyPushError({ details: { error: "MessageRateExceeded" } }).retryable, true);
  assert.equal(classifyPushError({ details: { error: "InvalidCredentials" } }).config, true);
  assert.equal(classifyPushError({ details: { error: "MismatchSenderId" } }).config, true);
  assert.equal(classifyPushError({ status: "error", retryable: true }).retryable, true);
  assert.equal(classifyPushError({ status: "error" }).retryable, false);
});

test("receipts are fetched in chunks; one failing chunk does not discard the others", async () => {
  const ids = Array.from({ length: RECEIPT_CHUNK_SIZE * 2 + 10 }, (_, i) => `ticket-${i}`);
  const fetchImpl = fakeFetch((_, body, index) =>
    index === 1
      ? { status: 400, json: { errors: [{ message: "bad" }] } }
      : { status: 200, json: { data: Object.fromEntries(body.ids.map((id) => [id, { status: "ok" }])) } }
  );
  const receipts = await getExpoReceipts(ids, { fetchImpl, accessToken: "", sleep: noSleep });
  assert.equal(fetchImpl.calls.length, 3);
  assert.equal(receipts.failedChunks, 1);
  assert.equal(receipts.size, RECEIPT_CHUNK_SIZE + 10);
  assert.equal(receipts.has("ticket-0"), true);
  assert.equal(receipts.has(`ticket-${RECEIPT_CHUNK_SIZE}`), false);
});

test("receipt lookup throws only when every chunk failed", async () => {
  const fetchImpl = fakeFetch(() => ({ status: 400, json: { errors: [{ message: "bad" }] } }));
  await assert.rejects(
    getExpoReceipts(["a", "b"], { fetchImpl, accessToken: "", sleep: noSleep }),
    /bad/
  );
});

test("commitInChunks stays under the Firestore batch limit and applies every operation", async () => {
  const commits = [];
  const db = {
    batch() {
      const ops = [];
      return {
        set: (...args) => ops.push(["set", ...args]),
        commit: async () => { commits.push(ops.length); },
      };
    },
  };
  const operations = Array.from({ length: 950 }, (_, i) => (batch) => batch.set(`doc-${i}`, { i }));
  await commitInChunks(db, operations);
  assert.deepEqual(commits, [400, 400, 150]);
  assert.ok(commits.every((size) => size <= 500));
});
