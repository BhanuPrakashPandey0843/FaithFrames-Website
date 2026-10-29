import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "./firebaseAdmin";

const QUIZ_TYPES = {
  daily: { categories: ["bible", "jesus", "old", "new", "mixed"], questionsCount: 10 },
  old_testament: { categories: ["old"], questionsCount: 10 },
  new_testament: { categories: ["new"], questionsCount: 10 },
  jesus: { categories: ["jesus"], questionsCount: 10 },
};

const POINTS = { easy: 10, medium: 15, hard: 25 };
const ACHIEVEMENTS = {
  bible_scholar: { title: "Bible Scholar", icon: "book-cross" },
  top_10: { title: "Top 10 Player", icon: "trophy" },
  streak_7: { title: "7 Day Streak", icon: "fire" },
  streak_30: { title: "30 Day Streak", icon: "fire-circle" },
  correct_100: { title: "100 Correct Answers", icon: "check-decagram" },
};

export class QuizApiError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const defaultProfile = () => ({
  xp: 0,
  level: 1,
  totalQuizzes: 0,
  totalQuestions: 0,
  totalCorrect: 0,
  totalWrong: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastPlayedDate: null,
  bestScore: 0,
  bestAccuracy: 0,
  fastestTimeMs: null,
  categoryStats: {},
  achievements: [],
  reachedTop10: false,
});

const normalizeCategory = (value) => {
  const raw = String(value || "bible").trim().toLowerCase().replace(/[\s-]+/g, "_");
  const aliases = {
    daily_challenges: "bible",
    old_testament_quiz: "old",
    old_testament: "old",
    oldtestament: "old",
    ot: "old",
    new_testament_quiz: "new",
    new_testament: "new",
    newtestament: "new",
    nt: "new",
    jesus_quiz: "jesus",
    christ: "jesus",
    gospel: "jesus",
    gospels: "jesus",
    general: "mixed",
    mixed_bag: "mixed",
  };
  return aliases[raw] || raw;
};

const parseQuestion = (id, data) => {
  const rawOptions = Array.isArray(data.options)
    ? data.options.map((value) => String(value ?? "").trim())
    : Array.isArray(data.choices)
      ? data.choices.map((value) => String(value ?? "").trim())
      : [];
  const options = rawOptions.filter(Boolean);
  let correctIndex = -1;

  if (typeof data.correctIndex === "number" && Number.isInteger(data.correctIndex)) {
    const target = rawOptions[data.correctIndex];
    const mappedIndex = target ? options.indexOf(target) : -1;
    correctIndex = mappedIndex >= 0 ? mappedIndex : data.correctIndex;
  } else if (typeof data.correctAnswer === "string") {
    correctIndex = options.findIndex(
      (option) => option.toLowerCase() === data.correctAnswer.trim().toLowerCase()
    );
  }

  return {
    id,
    options,
    correctIndex,
    category: normalizeCategory(data.category),
    difficulty: String(data.difficulty || "medium").trim().toLowerCase(),
    active: data.active !== false,
  };
};

const sessionRefFor = (db, uid, sessionId) =>
  uid
    ? db.collection("users").doc(uid).collection("quizSessions").doc(sessionId)
    : db.collection("guestQuizSessions").doc(sessionId);

const validateSessionId = (sessionId, uid, quizTypeId) =>
  typeof sessionId === "string" &&
  sessionId.length <= 180 &&
  sessionId.startsWith(`${uid}_${quizTypeId}_`) &&
  !sessionId.includes("/");

const utcDateKey = (date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
    date.getUTCDate()
  ).padStart(2, "0")}`;

const utcWeekKey = (date) => {
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNumber = day.getUTCDay() || 7;
  day.setUTCDate(day.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(day.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((day.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${day.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
};

const periodKeyFor = (period, date) => {
  if (period === "alltime") return "all";
  if (period === "monthly") {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  }
  if (period === "weekly") return utcWeekKey(date);
  return utcDateKey(date);
};

const compareEntries = (a, b) => {
  const scoreDiff = Number(b.score || 0) - Number(a.score || 0);
  if (scoreDiff) return scoreDiff;
  const accuracyDiff = Number(b.accuracy || 0) - Number(a.accuracy || 0);
  if (accuracyDiff) return accuracyDiff;
  const timeDiff = Number(a.completionTimeMs || 0) - Number(b.completionTimeMs || 0);
  if (timeDiff) return timeDiff;
  return String(a.uid || "").localeCompare(String(b.uid || ""));
};

const profileForSubmission = (
  oldProfile,
  questions,
  answers,
  score,
  accuracy,
  completionTimeMs,
  todayKey
) => {
  const profile = { ...defaultProfile(), ...(oldProfile || {}) };
  const categoryStats = { ...(profile.categoryStats || {}) };
  questions.forEach((question, index) => {
    const previous = categoryStats[question.category] || { correct: 0, total: 0 };
    categoryStats[question.category] = {
      correct: previous.correct + (answers[index].correct ? 1 : 0),
      total: previous.total + 1,
    };
  });

  let currentStreak = Number(profile.currentStreak || 0);
  let longestStreak = Number(profile.longestStreak || 0);
  if (profile.lastPlayedDate !== todayKey) {
    const yesterday = new Date(`${todayKey}T00:00:00.000Z`);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    currentStreak = profile.lastPlayedDate === utcDateKey(yesterday) ? currentStreak + 1 : 1;
    longestStreak = Math.max(longestStreak, currentStreak);
  }

  const correctCount = answers.filter((answer) => answer.correct).length;
  const xp = Number(profile.xp || 0) + correctCount * 12 + 50;
  const nextProfile = {
    ...profile,
    xp,
    level: Math.max(1, Math.floor(xp / 200) + 1),
    totalQuizzes: Number(profile.totalQuizzes || 0) + 1,
    totalQuestions: Number(profile.totalQuestions || 0) + answers.length,
    totalCorrect: Number(profile.totalCorrect || 0) + correctCount,
    totalWrong: Number(profile.totalWrong || 0) + answers.length - correctCount,
    currentStreak,
    longestStreak,
    lastPlayedDate: todayKey,
    bestScore: Math.max(Number(profile.bestScore || 0), score),
    bestAccuracy: Math.max(Number(profile.bestAccuracy || 0), accuracy),
    fastestTimeMs:
      profile.fastestTimeMs == null
        ? completionTimeMs
        : Math.min(Number(profile.fastestTimeMs), completionTimeMs),
    categoryStats,
  };

  const unlocked = new Set(nextProfile.achievements || []);
  const checks = [
    ["bible_scholar", (categoryStats.bible?.correct || 0) >= 50],
    ["streak_7", longestStreak >= 7],
    ["streak_30", longestStreak >= 30],
    ["correct_100", nextProfile.totalCorrect >= 100],
  ];
  const newlyUnlocked = checks
    .filter(([id, passed]) => passed && !unlocked.has(id))
    .map(([id]) => id);
  newlyUnlocked.forEach((id) => unlocked.add(id));
  nextProfile.achievements = Array.from(unlocked);

  return {
    profile: nextProfile,
    newlyUnlocked: newlyUnlocked.map((id) => ({ id, ...ACHIEVEMENTS[id] })),
  };
};

async function getQuizQuestions(db) {
  let snapshot;
  try {
    snapshot = await db.collection("questions").orderBy("createdAt", "desc").limit(500).get();
  } catch (error) {
    if (error?.code !== 9 && error?.code !== "failed-precondition") throw error;
    snapshot = await db.collection("questions").limit(500).get();
  }

  return {
    questions: snapshot.docs.map((document) => {
      const data = document.data();
      const normalized = parseQuestion(document.id, data);
      return {
        id: document.id,
        question: String(data.question || data.text || "").trim(),
        options: normalized.options,
        category: normalized.category,
        difficulty: normalized.difficulty,
        reference: String(data.reference || "").trim(),
        explanation: String(data.explanation || "").trim(),
        active: normalized.active,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : null,
      };
    }),
  };
}

async function startQuizSession(db, data, uid) {
  const { sessionId, quizTypeId, questionIds } = data || {};
  const quizType = QUIZ_TYPES[quizTypeId];
  const ownerId = uid || "guest";
  if (
    !quizType ||
    !validateSessionId(sessionId, ownerId, quizTypeId) ||
    !Array.isArray(questionIds) ||
    questionIds.length < 1 ||
    questionIds.length > quizType.questionsCount ||
    questionIds.some((id) => typeof id !== "string" || !id || id.includes("/")) ||
    new Set(questionIds).size !== questionIds.length
  ) {
    throw new QuizApiError("invalid-argument", "Invalid quiz session.");
  }

  const sessionRef = sessionRefFor(db, uid, sessionId);
  const questionRefs = questionIds.map((id) => db.collection("questions").doc(id));
  const attemptedRefs = uid
    ? questionIds.map((id) => db.collection("users").doc(uid).collection("attemptedQuestions").doc(id))
    : [];
  let startedAtMs = Date.now();

  await db.runTransaction(async (transaction) => {
    const sessionSnap = await transaction.get(sessionRef);
    if (sessionSnap.exists) {
      const saved = sessionSnap.data();
      if (
        saved.status === "active" &&
        saved.quizTypeId === quizTypeId &&
        JSON.stringify(saved.questionIds) === JSON.stringify(questionIds)
      ) {
        startedAtMs = saved.startedAt instanceof Timestamp ? saved.startedAt.toMillis() : startedAtMs;
        return;
      }
      throw new QuizApiError("already-exists", "This quiz session has already been used.");
    }

    const questionSnaps = await Promise.all(questionRefs.map((ref) => transaction.get(ref)));
    const attemptedSnaps = await Promise.all(attemptedRefs.map((ref) => transaction.get(ref)));
    const parsed = questionSnaps.map((snap, index) =>
      snap.exists ? parseQuestion(questionIds[index], snap.data()) : null
    );
    if (
      parsed.some(
        (question) =>
          !question ||
          !question.active ||
          question.correctIndex < 0 ||
          question.correctIndex >= question.options.length ||
          !quizType.categories.includes(question.category)
      ) ||
      attemptedSnaps.some((snap) => snap.exists)
    ) {
      throw new QuizApiError(
        "failed-precondition",
        "Some questions are unavailable or have already been attempted. Refresh the quiz list and try again."
      );
    }

    transaction.create(sessionRef, {
      sessionId,
      quizTypeId,
      questionIds,
      status: "active",
      startedAt: FieldValue.serverTimestamp(),
    });
    startedAtMs = Date.now();
  });
  return { startedAt: startedAtMs };
}

async function answerQuizQuestion(db, data, uid) {
  const { sessionId, questionId, selectedIndex } = data || {};
  if (
    typeof sessionId !== "string" ||
    sessionId.length > 180 ||
    sessionId.includes("/") ||
    typeof questionId !== "string" ||
    questionId.includes("/") ||
    (uid ? !sessionId.startsWith(`${uid}_`) : !sessionId.startsWith("guest_")) ||
    !Number.isInteger(selectedIndex) ||
    selectedIndex < -1
  ) {
    throw new QuizApiError("invalid-argument", "Invalid quiz answer.");
  }

  const sessionRef = sessionRefFor(db, uid, sessionId);
  const questionRef = db.collection("questions").doc(questionId);
  let answerResult;
  await db.runTransaction(async (transaction) => {
    const [sessionSnap, questionSnap] = await Promise.all([
      transaction.get(sessionRef),
      transaction.get(questionRef),
    ]);
    if (!sessionSnap.exists || !questionSnap.exists) {
      throw new QuizApiError("not-found", "This quiz question is no longer available.");
    }
    const session = sessionSnap.data();
    if (
      session.status !== "active" ||
      !Array.isArray(session.questionIds) ||
      !session.questionIds.includes(questionId)
    ) {
      throw new QuizApiError("failed-precondition", "This question is not part of the active quiz.");
    }
    const recorded = Array.isArray(session.answers) ? session.answers : [];
    const previous = recorded.find((answer) => answer.questionId === questionId);
    if (previous) {
      answerResult = {
        selectedIndex: previous.selectedIndex,
        correct: previous.correct,
        correctIndex: previous.correctIndex,
        pointsEarned: previous.pointsEarned,
      };
      return;
    }
    const nextQuestionId = session.questionIds.find(
      (id) => !recorded.some((answer) => answer.questionId === id)
    );
    if (questionId !== nextQuestionId) {
      throw new QuizApiError("failed-precondition", "Answer the current quiz question before continuing.");
    }

    const question = parseQuestion(questionId, questionSnap.data());
    if (!question.active || question.correctIndex < 0 || question.correctIndex >= question.options.length) {
      throw new QuizApiError("failed-precondition", "This quiz question is invalid.");
    }
    if (selectedIndex >= question.options.length) {
      throw new QuizApiError("invalid-argument", "The selected choice is unavailable.");
    }
    const correct = selectedIndex === question.correctIndex;
    const pointsEarned = correct ? POINTS[question.difficulty] || POINTS.medium : 0;
    const answer = { questionId, selectedIndex, correct, correctIndex: question.correctIndex, pointsEarned };
    transaction.update(sessionRef, { answers: [...recorded, answer] });
    answerResult = { selectedIndex, correct, correctIndex: question.correctIndex, pointsEarned };
  });
  if (!answerResult) throw new QuizApiError("internal", "The answer was not recorded.");
  return answerResult;
}

async function submitQuizSession(db, data, authContext) {
  const uid = authContext?.uid;
  if (!uid) throw new QuizApiError("unauthenticated", "Sign in to save quiz results.");

  const { sessionId, quizTypeId } = data || {};
  const quizType = QUIZ_TYPES[quizTypeId];
  if (!quizType || !validateSessionId(sessionId, uid, quizTypeId) || sessionId.startsWith("guest_")) {
    throw new QuizApiError("invalid-argument", "Invalid quiz result.");
  }

  const sessionRef = sessionRefFor(db, uid, sessionId);
  let response;
  let top10Candidate = false;

  await db.runTransaction(async (transaction) => {
    const sessionSnap = await transaction.get(sessionRef);
    if (!sessionSnap.exists) {
      throw new QuizApiError("failed-precondition", "The quiz session was not started by the server.");
    }
    const session = sessionSnap.data();
    if (session.status === "completed") {
      response = {
        score: session.score,
        accuracy: session.accuracy,
        completionTimeMs: session.completionTimeMs,
        correctCount: session.correctCount,
        wrongCount: session.wrongCount,
        totalQuestions: session.totalQuestions,
        profile: session.resultProfile,
        newlyUnlocked: [],
        duplicate: true,
      };
      return;
    }
    if (session.status !== "active" || session.quizTypeId !== quizTypeId) {
      throw new QuizApiError("failed-precondition", "This quiz session cannot be submitted.");
    }

    const questionIds = session.questionIds;
    const submittedAnswers = Array.isArray(session.answers) ? session.answers : [];
    if (
      !Array.isArray(questionIds) ||
      questionIds.length < 1 ||
      submittedAnswers.length !== questionIds.length ||
      submittedAnswers.some(
        (answer) =>
          !answer ||
          typeof answer.questionId !== "string" ||
          !Number.isInteger(answer.selectedIndex) ||
          answer.selectedIndex < -1
      ) ||
      new Set(submittedAnswers.map((answer) => answer.questionId)).size !== questionIds.length ||
      questionIds.some((id) => !submittedAnswers.some((answer) => answer.questionId === id))
    ) {
      throw new QuizApiError("invalid-argument", "The submitted answers do not match this quiz.");
    }

    const questionRefs = questionIds.map((id) => db.collection("questions").doc(id));
    const attemptedRefs = questionIds.map((id) =>
      db.collection("users").doc(uid).collection("attemptedQuestions").doc(id)
    );
    const periods = ["daily", "weekly", "monthly", "alltime"];
    const now = new Date();
    const leaderboardRefs = periods.map((period) =>
      db
        .collection("leaderboards")
        .doc(`${period}_${periodKeyFor(period, now)}`)
        .collection("entries")
        .doc(uid)
    );
    const userRef = db.collection("users").doc(uid);
    const [questionSnaps, attemptedSnaps, userSnap, leaderboardSnaps] = await Promise.all([
      Promise.all(questionRefs.map((ref) => transaction.get(ref))),
      Promise.all(attemptedRefs.map((ref) => transaction.get(ref))),
      transaction.get(userRef),
      Promise.all(leaderboardRefs.map((ref) => transaction.get(ref))),
    ]);
    if (attemptedSnaps.some((snap) => snap.exists)) {
      throw new QuizApiError("already-exists", "These questions have already been submitted.");
    }

    const questions = questionSnaps.map((snap, index) => {
      if (!snap.exists) throw new QuizApiError("failed-precondition", "A quiz question is no longer available.");
      const question = parseQuestion(questionIds[index], snap.data());
      if (
        !question.active ||
        !quizType.categories.includes(question.category) ||
        question.correctIndex < 0 ||
        question.correctIndex >= question.options.length
      ) {
        throw new QuizApiError("failed-precondition", "A quiz question is no longer available.");
      }
      return question;
    });
    const answers = questionIds.map((questionId) => {
      const answer = submittedAnswers.find((item) => item.questionId === questionId);
      const question = questions[questionIds.indexOf(questionId)];
      if (answer.selectedIndex >= question.options.length) {
        throw new QuizApiError("invalid-argument", "An answer is outside the available choices.");
      }
      const correct = answer.selectedIndex === question.correctIndex;
      return {
        questionId: question.id,
        selectedIndex: answer.selectedIndex,
        correct,
        pointsEarned: correct ? POINTS[question.difficulty] || POINTS.medium : 0,
      };
    });
    const correctCount = answers.filter((answer) => answer.correct).length;
    const score = answers.reduce((sum, answer) => sum + answer.pointsEarned, 0);
    const accuracy = Math.round((correctCount / answers.length) * 1000) / 10;
    const startedAt = session.startedAt;
    if (!(startedAt instanceof Timestamp)) {
      throw new QuizApiError("failed-precondition", "The quiz start time is missing.");
    }
    const completionTimeMs = Math.max(0, now.getTime() - startedAt.toMillis());
    const todayKey = utcDateKey(now);
    const userData = userSnap.exists ? userSnap.data() : {};
    const oldProfile = { ...defaultProfile(), ...(userData.quizProfile || {}) };
    const next = profileForSubmission(oldProfile, questions, answers, score, accuracy, completionTimeMs, todayKey);
    const displayName =
      typeof userData.name === "string" && userData.name.trim()
        ? userData.name.trim().slice(0, 120)
        : typeof authContext.name === "string" && authContext.name.trim()
          ? authContext.name.trim().slice(0, 120)
          : "Player";
    const photoURL =
      typeof userData.photoURL === "string"
        ? userData.photoURL
        : typeof authContext.picture === "string"
          ? authContext.picture
          : "";
    const entry = {
      uid,
      displayName,
      photoURL,
      score,
      accuracy,
      completionTimeMs,
      correctCount,
      wrongCount: answers.length - correctCount,
      totalQuestions: answers.length,
      streak: next.profile.currentStreak || 0,
      quizTypeId,
      sessionId,
      submittedAt: FieldValue.serverTimestamp(),
    };

    transaction.update(sessionRef, {
      score,
      accuracy,
      completionTimeMs,
      correctCount,
      wrongCount: answers.length - correctCount,
      totalQuestions: answers.length,
      answers,
      resultProfile: next.profile,
      status: "completed",
      submittedAt: FieldValue.serverTimestamp(),
    });
    transaction.set(
      userRef,
      {
        quizProfile: next.profile,
        lastScore: score,
        lastPlayed: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    transaction.set(
      db.collection("publicProfiles").doc(uid),
      { name: displayName, photoURL, updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
    attemptedRefs.forEach((ref, index) => {
      transaction.create(ref, {
        questionId: questionIds[index],
        quizTypeId,
        correct: answers.find((answer) => answer.questionId === questionIds[index])?.correct === true,
        attemptedAt: FieldValue.serverTimestamp(),
      });
    });

    leaderboardSnaps.forEach((snap, index) => {
      const period = periods[index];
      if (!snap.exists || compareEntries(entry, snap.data()) < 0) {
        transaction.set(
          leaderboardRefs[index],
          { ...entry, period, periodKey: periodKeyFor(period, now), updatedAt: FieldValue.serverTimestamp() },
          { merge: true }
        );
      }
    });
    top10Candidate = !oldProfile.reachedTop10;
    response = {
      score,
      accuracy,
      completionTimeMs,
      correctCount,
      wrongCount: answers.length - correctCount,
      totalQuestions: answers.length,
      profile: next.profile,
      newlyUnlocked: next.newlyUnlocked,
      duplicate: false,
    };
  });

  if (!response) throw new QuizApiError("internal", "Quiz result was not saved.");
  if (top10Candidate) {
    try {
      const dailyKey = periodKeyFor("daily", new Date());
      const top = await db
        .collection("leaderboards")
        .doc(`daily_${dailyKey}`)
        .collection("entries")
        .orderBy("score", "desc")
        .orderBy("accuracy", "desc")
        .orderBy("completionTimeMs", "asc")
        .limit(10)
        .get();
      if (top.docs.some((entry) => entry.id === uid)) {
        const userRef = db.collection("users").doc(uid);
        const updatedProfile = await db.runTransaction(async (transaction) => {
          const [userSnap, sessionSnap] = await Promise.all([
            transaction.get(userRef),
            transaction.get(sessionRef),
          ]);
          const profile = userSnap.data()?.quizProfile || defaultProfile();
          if (profile.reachedTop10) return null;
          const nextProfile = {
            ...profile,
            reachedTop10: true,
            achievements: Array.from(new Set([...(profile.achievements || []), "top_10"])),
          };
          transaction.update(userRef, { quizProfile: nextProfile });
          if (sessionSnap.exists) transaction.update(sessionRef, { resultProfile: nextProfile });
          return nextProfile;
        });
        if (updatedProfile) {
          response.profile = updatedProfile;
          response.newlyUnlocked = [...(response.newlyUnlocked || []), { id: "top_10", ...ACHIEVEMENTS.top_10 }];
        }
      }
    } catch (error) {
      console.error("[Quiz API] Could not update the top-10 achievement:", error);
    }
  }
  return response;
}

export async function runQuizAction(action, data, authContext) {
  const db = getAdminDb();
  if (action === "getQuizQuestions") return getQuizQuestions(db);
  if (action === "startQuizSession") return startQuizSession(db, data, authContext?.uid);
  if (action === "answerQuizQuestion") return answerQuizQuestion(db, data, authContext?.uid);
  if (action === "submitQuizSession") return submitQuizSession(db, data, authContext);
  throw new QuizApiError("invalid-argument", "Unknown quiz action.");
}
