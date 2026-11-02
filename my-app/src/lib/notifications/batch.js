// Dependency-free Firestore helper (kept separate so it can be unit-tested in plain Node).

/**
 * Applies write operations in several Firestore batches (a batch is limited to 500 writes).
 * `operations` are functions that receive a WriteBatch. Every caller uses idempotent writes
 * (set / delete / create-if-missing), so re-running a partially applied list is safe.
 */
export async function commitInChunks(db, operations, size = 400) {
  for (let start = 0; start < operations.length; start += size) {
    const batch = db.batch();
    operations.slice(start, start + size).forEach((apply) => apply(batch));
    await batch.commit();
  }
}
