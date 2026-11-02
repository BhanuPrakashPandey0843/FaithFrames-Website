/**
 * Pure (no I/O) question-selection logic for the Faith Frames quiz.
 *
 * Kept free of Firebase imports so it can be unit-tested with plain Node
 * (see quizSelection.test.mjs) and reasoned about in isolation.
 *
 * Model
 * ─────
 * Every quiz type ("section") has its own pool of servable question ids and its
 * own per-user history: a `cycle` number plus the ids already served during
 * that cycle (`seenIds`) and the ids of the most recent session
 * (`lastSessionIds`).
 *
 *   1. Questions not yet seen in the current cycle are always preferred.
 *   2. When fewer unseen questions remain than the session needs, ALL of them
 *      are used first and the remaining slots are topped up from the questions
 *      already seen - preferring ones that were NOT in the previous session so
 *      back-to-back quizzes do not repeat. That also starts a NEW cycle
 *      (cycle + 1) whose seen-set is exactly the questions chosen now.
 *   3. Once the pool is fully used the next quiz simply starts a new cycle, so
 *      the user never hits a dead end.
 *
 * Uniform random sampling (partial Fisher-Yates) makes this O(pool) and works
 * identically for 10 questions or 10,000.
 */

/** Uniformly sample `n` distinct items without replacement (does not mutate `items`). */
export function sampleWithoutReplacement(items, n, rng = Math.random) {
  const arr = Array.from(items);
  const take = Math.max(0, Math.min(Math.floor(n), arr.length));
  for (let i = 0; i < take; i += 1) {
    const j = i + Math.floor(rng() * (arr.length - i));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr.slice(0, take);
}

export function shuffle(items, rng = Math.random) {
  return sampleWithoutReplacement(items, items.length, rng);
}

const unique = (ids) => Array.from(new Set(ids));

/**
 * @param {object}   args
 * @param {string[]} args.poolIds         ids of every servable question for this quiz type
 * @param {string[]} [args.seenIds]       ids already served in the user's current cycle
 * @param {string[]} [args.lastSessionIds] ids served in the user's previous session
 * @param {number}   [args.cycle]         current cycle number (>= 1)
 * @param {number}   args.count           questions wanted
 * @param {() => number} [args.rng]       injectable RNG for tests
 * @returns {{
 *   ids: string[], cycle: number, seenIds: string[], lastSessionIds: string[],
 *   startedNewCycle: boolean, poolSize: number, unseenBefore: number
 * }}
 */
export function selectQuizQuestionIds({
  poolIds,
  seenIds = [],
  lastSessionIds = [],
  cycle = 1,
  count,
  rng = Math.random,
}) {
  const pool = unique(poolIds || []);
  const currentCycle = Number.isInteger(cycle) && cycle >= 1 ? cycle : 1;

  if (!pool.length) {
    return {
      ids: [],
      cycle: currentCycle,
      seenIds: [],
      lastSessionIds: [],
      startedNewCycle: false,
      poolSize: 0,
      unseenBefore: 0,
    };
  }

  const poolSet = new Set(pool);
  // Ids of questions that were deleted / unpublished since they were served
  // are dropped here so history never grows stale.
  const seen = unique(seenIds || []).filter((id) => poolSet.has(id));
  const seenSet = new Set(seen);
  const unseen = pool.filter((id) => !seenSet.has(id));
  const want = Math.max(1, Math.min(Math.floor(count) || 1, pool.length));

  let picked;
  let nextCycle = currentCycle;
  let nextSeen;
  let startedNewCycle = false;

  if (unseen.length >= want) {
    picked = sampleWithoutReplacement(unseen, want, rng);
    nextSeen = seen.concat(picked);
  } else {
    startedNewCycle = true;
    nextCycle = currentCycle + 1;
    const need = want - unseen.length;
    const last = new Set(lastSessionIds || []);
    const notRecent = seen.filter((id) => !last.has(id));
    const recent = seen.filter((id) => last.has(id));
    const topUp = sampleWithoutReplacement(notRecent, Math.min(need, notRecent.length), rng);
    if (topUp.length < need) {
      topUp.push(...sampleWithoutReplacement(recent, need - topUp.length, rng));
    }
    picked = unseen.concat(topUp);
    nextSeen = picked.slice();
  }

  // Shuffle so unseen / re-served questions are interleaved rather than grouped.
  const ids = shuffle(picked, rng);
  return {
    ids,
    cycle: nextCycle,
    seenIds: nextSeen,
    lastSessionIds: ids.slice(),
    startedNewCycle,
    poolSize: pool.length,
    unseenBefore: unseen.length,
  };
}

/** Validates guest-supplied history (guests have no server-side history). */
export function sanitizeClientHistory(raw) {
  if (!raw || typeof raw !== 'object') return { cycle: 1, seenIds: [], lastSessionIds: [] };
  const cleanIds = (value) =>
    Array.isArray(value)
      ? unique(
          value
            .filter((id) => typeof id === 'string' && id.length > 0 && id.length <= 200 && !id.includes('/'))
            .slice(0, 20000)
        )
      : [];
  const cycle = Number.isInteger(raw.cycle) && raw.cycle >= 1 && raw.cycle <= 1000000 ? raw.cycle : 1;
  return { cycle, seenIds: cleanIds(raw.seenIds), lastSessionIds: cleanIds(raw.lastSessionIds) };
}
