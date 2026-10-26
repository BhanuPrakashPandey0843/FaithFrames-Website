"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  Eye,
  FilePlus2,
  Globe2,
  LoaderCircle,
  Save,
  Send,
  Settings2,
  Undo2,
} from "lucide-react";
import { parseBulkVerses, validateVerses } from "../../lib/bibleContent";

const LANGUAGES = [
  { id: "hindi", label: "Hindi", native: "हिन्दी" },
  { id: "telugu", label: "Telugu", native: "తెలుగు" },
];

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const responseText = await response.text();
  let data = {};
  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error("The server returned an invalid response.");
    }
  }
  if (!response.ok) throw new Error(data.message || "The request could not be completed.");
  return data;
}

function chapterLabel(chapter) {
  if (chapter.isPublished && chapter.status === "draft") return "Published · draft changes";
  if (chapter.isPublished || chapter.status === "published") return "Published";
  if (chapter.status === "unpublished") return "Unpublished";
  return "Draft";
}

function formatVerses(verseList) {
  return verseList.map((verse) => `${verse.number} | ${verse.text}`).join("\n");
}

export default function TranslationManager() {
  const [language, setLanguage] = useState("hindi");
  const [testament, setTestament] = useState("OT");
  const [books, setBooks] = useState([]);
  const [summary, setSummary] = useState([]);
  const [bookId, setBookId] = useState("gn");
  const [chapterNumber, setChapterNumber] = useState(1);
  const [chapters, setChapters] = useState([]);
  const [verses, setVerses] = useState([]);
  const [bulkText, setBulkText] = useState("");
  const [parseErrors, setParseErrors] = useState([]);
  const [isPublished, setIsPublished] = useState(false);
  const [hasDraftChanges, setHasDraftChanges] = useState(false);
  const [acknowledgeGaps, setAcknowledgeGaps] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [chapterLoading, setChapterLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [chapterCount, setChapterCount] = useState("");
  const [savingBook, setSavingBook] = useState(false);
  const [newBookId, setNewBookId] = useState("");
  const [newBookName, setNewBookName] = useState("");
  const [newBookTestament, setNewBookTestament] = useState("OT");
  const [newBookChapterCount, setNewBookChapterCount] = useState("1");
  const [newBookDisplayName, setNewBookDisplayName] = useState("");
  const [addingBook, setAddingBook] = useState(false);

  const currentBook = books.find((book) => book.id === bookId);
  const chapterStatus = useMemo(
    () => new Map(chapters.map((chapter) => [chapter.chapter, chapter])),
    [chapters]
  );
  const currentSummary = summary.find((item) => item.language === language);
  const validation = useMemo(() => validateVerses(verses), [verses]);
  const filteredBooks = useMemo(
    () => books.filter((book) => book.testament === testament),
    [books, testament]
  );
  const expectedChapters = currentBook
    ? Number(currentBook[`${language}ChapterCount`] || currentBook.chapterCount)
    : 0;
  const mayPublish = !saving
    && !chapterLoading
    && verses.length > 0
    && validation.errors.length === 0
    && parseErrors.length === 0
    && (!validation.warnings.length || acknowledgeGaps);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      await requestJson("/api/admin/bible-translations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "initialize-catalog" }),
      });
      const [bookData, dashboardData] = await Promise.all([
        requestJson("/api/admin/bible-translations?action=books"),
        requestJson("/api/admin/bible-translations?action=summary"),
      ]);
      setBooks(bookData.books || []);
      setSummary(dashboardData.languages || []);
      setBookId((selected) => bookData.books.some((book) => book.id === selected)
        ? selected
        : bookData.books[0]?.id || "");
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshChapters = useCallback(async (selectedLanguage, selectedBook) => {
    if (!selectedLanguage || !selectedBook) return [];
    const data = await requestJson(
      `/api/admin/bible-translations?action=chapters&language=${selectedLanguage}&bookId=${selectedBook}`
    );
    setChapters(data.chapters || []);
    return data.chapters || [];
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    if (!currentBook) return;
    setDisplayName(currentBook[`${language}Name`] || "");
    setChapterCount(String(currentBook[`${language}ChapterCount`] || currentBook.chapterCount));
  }, [currentBook, language]);

  useEffect(() => {
    if (!bookId) return undefined;
    let active = true;
    setChapterLoading(true);
    setError("");
    refreshChapters(language, bookId)
      .then(async () => {
        if (!active) return;
        const data = await requestJson(
          `/api/admin/bible-translations?action=chapter&language=${language}&bookId=${bookId}&chapter=${chapterNumber}`
        );
        if (!active) return;
        const savedVerses = data.chapter?.verses || [];
        setVerses(savedVerses);
        setBulkText(savedVerses.map((verse) => `${verse.number} | ${verse.text}`).join("\n"));
        setIsPublished(data.isPublished === true);
        setHasDraftChanges(data.hasDraftChanges === true);
        setAcknowledgeGaps(data.chapter?.validation?.gapsAcknowledged === true);
        setParseErrors([]);
        setShowPreview(false);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      })
      .finally(() => {
        if (active) setChapterLoading(false);
      });
    return () => {
      active = false;
    };
  }, [bookId, chapterNumber, currentBook, language, refreshChapters]);

  function chooseLanguage(nextLanguage) {
    if (nextLanguage === language) return;
    setLanguage(nextLanguage);
    setTestament("OT");
    setChapterNumber(1);
    setChapters([]);
    setVerses([]);
    setBulkText("");
    setNotice("");
  }

  function chooseTestament(nextTestament) {
    setTestament(nextTestament);
    const firstBook = books.find((book) => book.testament === nextTestament);
    if (firstBook && firstBook.id !== bookId) {
      setBookId(firstBook.id);
      setChapterNumber(1);
    }
  }

  function applyBulkText() {
    const parsed = parseBulkVerses(bulkText);
    setVerses(parsed.verses);
    setParseErrors(parsed.errors);
    setAcknowledgeGaps(false);
  }

  function editVerse(index, field, value) {
    setVerses((current) => {
      const next = current.map((verse, verseIndex) => (
        verseIndex === index ? { ...verse, [field]: value } : verse
      ));
      setBulkText(formatVerses(next));
      return next;
    });
    setParseErrors([]);
    setAcknowledgeGaps(false);
  }

  function addVerse() {
    const highest = verses.reduce((max, verse) => Math.max(max, Number(verse.number) || 0), 0);
    setVerses((current) => {
      const next = [...current, { number: highest + 1, text: "" }];
      setBulkText(formatVerses(next));
      return next;
    });
    setParseErrors([]);
  }

  function removeVerse(index) {
    if (!window.confirm("Delete this verse from the chapter draft? This will not affect the published version until you publish the changes.")) return;
    setVerses((current) => {
      const next = current.filter((_, verseIndex) => verseIndex !== index);
      setBulkText(formatVerses(next));
      return next;
    });
    setParseErrors([]);
    setAcknowledgeGaps(false);
  }

  async function saveContent(action) {
    if (parseErrors.length) {
      setError("Resolve the paste-format errors before saving.");
      return;
    }
    if (validation.errors.length) {
      setError(validation.errors.join(" "));
      return;
    }
    if (action === "publish" && validation.warnings.length && !acknowledgeGaps) {
      setError("Review and acknowledge the verse numbering gaps before publishing.");
      return;
    }
    if (action === "publish" && !window.confirm(`Publish ${LANGUAGES.find((item) => item.id === language)?.label} ${currentBook?.englishName} ${chapterNumber}? This replaces the public chapter.`)) return;

    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await requestJson("/api/admin/bible-translations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          language,
          bookId,
          chapter: chapterNumber,
          verses: validation.verses,
          acknowledgeGaps,
        }),
      });
      setNotice(action === "publish" ? "Chapter published to the mobile app." : "Draft saved. Published content is unchanged.");
      setIsPublished(action === "publish" || isPublished);
      setHasDraftChanges(action === "save-draft" && isPublished);
      setVerses(validation.verses);
      setBulkText(formatVerses(validation.verses));
      setAcknowledgeGaps(Boolean(validation.warnings.length));
      await loadOverview();
      await refreshChapters(language, bookId);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  async function unpublishChapter() {
    if (!window.confirm(`Unpublish ${currentBook?.englishName} ${chapterNumber}? It will no longer be available to mobile readers.`)) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await requestJson("/api/admin/bible-translations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unpublish", language, bookId, chapter: chapterNumber }),
      });
      setIsPublished(false);
      setHasDraftChanges(false);
      setNotice("Chapter unpublished. The saved content remains available as an unpublished draft.");
      await loadOverview();
      await refreshChapters(language, bookId);
    } catch (unpublishError) {
      setError(unpublishError.message);
    } finally {
      setSaving(false);
    }
  }

  async function saveBookSettings() {
    setSavingBook(true);
    setError("");
    setNotice("");
    try {
      await requestJson("/api/admin/bible-translations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-book",
          language,
          bookId,
          displayName,
          chapterCount: Number(chapterCount),
        }),
      });
      setNotice("Book settings saved.");
      await loadOverview();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSavingBook(false);
    }
  }

  async function addBookToCatalog() {
    const id = newBookId.trim().toLowerCase();
    setAddingBook(true);
    setError("");
    setNotice("");
    try {
      await requestJson("/api/admin/bible-translations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add-book",
          language,
          bookId: id,
          englishName: newBookName,
          testament: newBookTestament,
          chapterCount: Number(newBookChapterCount),
          displayName: newBookDisplayName,
        }),
      });
      await loadOverview();
      setBookId(id);
      setTestament(newBookTestament);
      setChapterNumber(1);
      setNewBookId("");
      setNewBookName("");
      setNewBookDisplayName("");
      setNewBookChapterCount("1");
      setNotice("Book added to the shared Bible catalog.");
    } catch (addError) {
      setError(addError.message);
    } finally {
      setAddingBook(false);
    }
  }

  function openRecent(record) {
    setLanguage(record.language);
    setBookId(record.bookId);
    setTestament(record.testament || "OT");
    setChapterNumber(record.chapter);
  }

  const recentRecords = summary
    .flatMap((item) => item.recentlyUpdated || [])
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))
    .slice(0, 6);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-500">
        <LoaderCircle className="mr-2 h-5 w-5 animate-spin" /> Loading Bible content…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 pb-12 pt-20 sm:px-6 md:pt-8 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-600">Scripture library</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">Hindi & Telugu Bible</h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600">
              Manage translation drafts, validate chapters, and publish approved verses to the mobile app.
            </p>
          </div>
          <button
            type="button"
            onClick={loadOverview}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <Undo2 className="h-4 w-4" /> Refresh data
          </button>
        </header>

        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> <span>{error}</span>
          </div>
        )}
        {notice && (
          <div role="status" className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <Check className="mt-0.5 h-4 w-4 shrink-0" /> <span>{notice}</span>
          </div>
        )}

        <section aria-label="Translation completion" className="grid gap-4 sm:grid-cols-2">
          {summary.map((item) => (
            <div key={item.language} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">{item.languageLabel} · {item.language === "hindi" ? "हिन्दी" : "తెలుగు"}</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">{item.completionPercent}%</p>
                </div>
                <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600"><Globe2 className="h-5 w-5" /></div>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${item.completionPercent}%` }} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 xl:grid-cols-5">
                <Stat label="Books" value={item.totalBooks} />
                <Stat label="Chapters" value={`${item.publishedChapters}/${item.expectedChapters}`} />
                <Stat label="Verses" value={item.totalVerses.toLocaleString()} />
                <Stat label="Drafts" value={item.draftChapters} />
                <Stat label="Validation warnings" value={item.validationWarnings} />
              </div>
              <p className="mt-3 text-xs text-gray-500">
                {item.missingChapters} missing · {item.unpublishedChapters} unpublished · {item.incompleteChapters} incomplete chapters
              </p>
            </div>
          ))}
        </section>

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="min-w-0 rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 p-5">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-indigo-600" />
                <h2 className="text-lg font-bold text-gray-900">Chapter editor</h2>
              </div>
              <p className="mt-1 text-sm text-gray-500">Every edit is scoped to the selected language and chapter.</p>
            </div>

            <div className="space-y-5 p-4 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Language
                  <select
                    value={language}
                    onChange={(event) => chooseLanguage(event.target.value)}
                    className="mt-1.5 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm font-normal"
                  >
                    {LANGUAGES.map((item) => <option key={item.id} value={item.id}>{item.label} · {item.native}</option>)}
                  </select>
                </label>
                <label className="block text-sm font-semibold text-gray-700">
                  Testament
                  <select
                    value={testament}
                    onChange={(event) => chooseTestament(event.target.value)}
                    className="mt-1.5 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm font-normal"
                  >
                    <option value="OT">Old Testament</option>
                    <option value="NT">New Testament</option>
                  </select>
                </label>
                <label className="block text-sm font-semibold text-gray-700">
                  Book
                  <select
                    value={bookId}
                    onChange={(event) => { setBookId(event.target.value); setChapterNumber(1); }}
                    className="mt-1.5 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm font-normal"
                  >
                    {filteredBooks.map((book) => <option key={book.id} value={book.id}>{book.englishName}</option>)}
                  </select>
                </label>
                <label className="block text-sm font-semibold text-gray-700">
                  Chapter
                  <div className="mt-1.5 flex gap-2">
                    <select
                      value={chapterNumber}
                      onChange={(event) => setChapterNumber(Number(event.target.value))}
                      className="min-h-11 min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 text-sm font-normal"
                    >
                      {Array.from({ length: expectedChapters }, (_, index) => index + 1).map((number) => {
                        const state = chapterStatus.get(number);
                        const label = state
                          ? state.isPublished
                            ? state.status === "draft" ? " · Published + draft" : " · Published"
                            : ` · ${state.status === "unpublished" ? "Unpublished" : "Draft"}`
                          : " · Not started";
                        return <option key={number} value={number}>Chapter {number}{label}</option>;
                      })}
                    </select>
                    <button
                      type="button"
                      title="Select the first chapter without a published copy"
                      onClick={() => {
                        const next = Array.from({ length: expectedChapters }, (_, index) => index + 1)
                          .find((number) => !chapterStatus.get(number)?.isPublished);
                        if (next) setChapterNumber(next);
                      }}
                      className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg border border-gray-300 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      <FilePlus2 className="h-4 w-4" /><span className="hidden sm:inline">New</span>
                    </button>
                  </div>
                </label>
              </div>

              {currentBook && (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
                    <Settings2 className="h-4 w-4 text-indigo-600" /> Language-specific book metadata
                  </div>
                  <p className="mb-3 text-xs text-gray-600">
                    Book publication state: <span className="font-semibold capitalize">{currentBook[`${language}Status`] || "not-started"}</span>
                  </p>
                  <div className="grid gap-3 sm:grid-cols-[1fr_150px_auto] sm:items-end">
                    <label className="block text-xs font-semibold text-gray-600">
                      Display name ({language})
                      <input
                        value={displayName}
                        onChange={(event) => setDisplayName(event.target.value)}
                        placeholder={currentBook.englishName}
                        maxLength={100}
                        className="mt-1 block min-h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm font-normal"
                      />
                    </label>
                    <label className="block text-xs font-semibold text-gray-600">
                      Expected chapters
                      <input
                        type="number"
                        min="1"
                        max="200"
                        value={chapterCount}
                        onChange={(event) => setChapterCount(event.target.value)}
                        className="mt-1 block min-h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm font-normal"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={savingBook}
                      onClick={saveBookSettings}
                      className="min-h-10 rounded-lg border border-indigo-200 bg-white px-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-60"
                    >
                      {savingBook ? "Saving…" : "Save book"}
                    </button>
                  </div>
                </div>
              )}

              <details className="rounded-xl border border-gray-200 bg-white">
                <summary className="cursor-pointer list-none p-4 text-sm font-semibold text-gray-800">
                  Add a book to the configurable catalog
                </summary>
                <div className="space-y-3 border-t border-gray-100 p-4">
                  <p className="text-xs leading-5 text-gray-500">
                    Add an edition-specific book while keeping a single canonical record. Use a stable lowercase ID with letters, numbers, and hyphens.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs font-semibold text-gray-600">
                      Stable book ID
                      <input
                        value={newBookId}
                        onChange={(event) => setNewBookId(event.target.value)}
                        placeholder="additional-book"
                        maxLength={48}
                        className="mt-1 min-h-10 w-full rounded-lg border border-gray-300 px-3 text-sm font-normal"
                      />
                    </label>
                    <label className="text-xs font-semibold text-gray-600">
                      English reference name
                      <input
                        value={newBookName}
                        onChange={(event) => setNewBookName(event.target.value)}
                        maxLength={100}
                        className="mt-1 min-h-10 w-full rounded-lg border border-gray-300 px-3 text-sm font-normal"
                      />
                    </label>
                    <label className="text-xs font-semibold text-gray-600">
                      Testament
                      <select
                        value={newBookTestament}
                        onChange={(event) => setNewBookTestament(event.target.value)}
                        className="mt-1 min-h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm font-normal"
                      >
                        <option value="OT">Old Testament</option>
                        <option value="NT">New Testament</option>
                      </select>
                    </label>
                    <label className="text-xs font-semibold text-gray-600">
                      Expected chapters ({language})
                      <input
                        type="number"
                        min="1"
                        max="200"
                        value={newBookChapterCount}
                        onChange={(event) => setNewBookChapterCount(event.target.value)}
                        className="mt-1 min-h-10 w-full rounded-lg border border-gray-300 px-3 text-sm font-normal"
                      />
                    </label>
                    <label className="text-xs font-semibold text-gray-600 sm:col-span-2">
                      Display name ({language})
                      <input
                        value={newBookDisplayName}
                        onChange={(event) => setNewBookDisplayName(event.target.value)}
                        maxLength={100}
                        className="mt-1 min-h-10 w-full rounded-lg border border-gray-300 px-3 text-sm font-normal"
                      />
                    </label>
                  </div>
                  <button
                    type="button"
                    disabled={addingBook}
                    onClick={addBookToCatalog}
                    className="min-h-10 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {addingBook ? "Adding…" : "Add book"}
                  </button>
                </div>
              </details>

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-gray-50 px-4 py-3 text-sm">
                <div className="flex min-w-0 items-center gap-2 text-gray-700">
                  <ChevronRight className="h-4 w-4 shrink-0 text-indigo-500" />
                  <span className="truncate">{currentBook?.englishName || "Book"} / Chapter {chapterNumber}</span>
                  <span className="hidden text-gray-400 sm:inline">·</span>
                  <span className={`shrink-0 font-semibold ${isPublished ? "text-emerald-700" : "text-amber-700"}`}>
                    {isPublished ? hasDraftChanges ? "Published · unpublished edits" : "Published" : "Draft"}
                  </span>
                </div>
                {isPublished && (
                  <button type="button" onClick={unpublishChapter} disabled={saving} className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50">
                    Unpublish
                  </button>
                )}
              </div>

              {chapterLoading ? (
                <div className="flex min-h-32 items-center justify-center text-sm text-gray-500">
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> Loading chapter…
                </div>
              ) : (
                <>
                  <div>
                    <div className="flex flex-wrap items-end justify-between gap-2">
                      <label htmlFor="bulk-verses" className="text-sm font-semibold text-gray-800">Paste chapter verses</label>
                      <span className="text-xs text-gray-500">One verse per line, or “1 | Verse text”</span>
                    </div>
                    <textarea
                      id="bulk-verses"
                      value={bulkText}
                      onChange={(event) => setBulkText(event.target.value)}
                      rows={7}
                      spellCheck="false"
                      placeholder={"Paste one verse per line…\n\nOr use numbered format:\n1 | Verse text\n2 | Verse text"}
                      className="mt-2 block w-full resize-y rounded-xl border border-gray-300 px-3 py-3 font-mono text-sm leading-6 text-gray-800 placeholder:font-sans placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                    <button type="button" onClick={applyBulkText} className="mt-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                      Validate & preview pasted text
                    </button>
                  </div>

                  {parseErrors.length > 0 && (
                    <Message tone="error" title="Paste format needs attention" items={parseErrors} />
                  )}
                  {validation.errors.length > 0 && !parseErrors.length && (
                    <Message tone="error" title="Verse validation errors" items={validation.errors} />
                  )}
                  {validation.warnings.length > 0 && (
                    <div className="space-y-3">
                      <Message tone="warning" title="Numbering warning" items={validation.warnings} />
                      <label className="flex items-start gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={acknowledgeGaps}
                          onChange={(event) => setAcknowledgeGaps(event.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600"
                        />
                        <span>I reviewed these gaps; this edition intentionally uses non-contiguous verse numbering.</span>
                      </label>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-gray-800">Individual verses <span className="font-normal text-gray-500">({verses.length})</span></h3>
                      <button type="button" onClick={addVerse} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">+ Add verse</button>
                    </div>
                    {verses.map((verse, index) => (
                      <div key={`${index}-${verse.number}`} className="grid gap-2 rounded-xl border border-gray-200 p-3 sm:grid-cols-[68px_minmax(0,1fr)_auto] sm:items-start">
                        <label className="text-xs font-semibold text-gray-500">
                          Number
                          <input
                            type="number"
                            min="1"
                            value={verse.number}
                            onChange={(event) => editVerse(index, "number", event.target.value)}
                            className="mt-1 min-h-10 w-full rounded-lg border border-gray-300 px-2 text-sm text-gray-800"
                          />
                        </label>
                        <label className="text-xs font-semibold text-gray-500">
                          Verse text
                          <textarea
                            value={verse.text}
                            onChange={(event) => editVerse(index, "text", event.target.value)}
                            rows={2}
                            className="mt-1 block min-h-10 w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm leading-6 text-gray-800"
                          />
                        </label>
                        <button type="button" onClick={() => removeVerse(index)} className="min-h-10 rounded-lg px-3 text-sm font-semibold text-red-600 hover:bg-red-50">
                          Delete
                        </button>
                      </div>
                    ))}
                    {!verses.length && <p className="rounded-lg border border-dashed border-gray-300 p-5 text-center text-sm text-gray-500">Paste or add verses to begin this chapter.</p>}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
                    <button
                      type="button"
                      disabled={saving || chapterLoading || !verses.length || parseErrors.length > 0 || validation.errors.length > 0}
                      onClick={() => saveContent("save-draft")}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save draft
                    </button>
                    <button
                      type="button"
                      disabled={!mayPublish}
                      onClick={() => saveContent("publish")}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" /> Publish chapter
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPreview((visible) => !visible)}
                      disabled={!verses.length}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-40"
                    >
                      <Eye className="h-4 w-4" /> {showPreview ? "Hide preview" : "Preview"}
                    </button>
                  </div>

                  {showPreview && (
                    <div className="rounded-xl border border-indigo-100 bg-[#fffdf8] p-4 sm:p-6">
                      <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Chapter preview · {language}</p>
                      <h3 className="mt-1 text-lg font-bold text-gray-900">{displayName || currentBook?.englishName} {chapterNumber}</h3>
                      <div className="mt-4 space-y-3">
                        {validation.verses.map((verse) => (
                          <p key={`${verse.number}-${verse.text}`} className="break-words text-base leading-8 text-gray-800" lang={language === "hindi" ? "hi" : "te"}>
                            <sup className="mr-2 font-bold text-indigo-600">{verse.number}</sup>{verse.text}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          <aside className="space-y-5">
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-indigo-600" />
                <h2 className="font-bold text-gray-900">Recently updated</h2>
              </div>
              <div className="mt-4 space-y-2">
                {recentRecords.map((record) => (
                  <button
                    key={record.id}
                    type="button"
                    onClick={() => openRecent(record)}
                    className="block w-full rounded-lg border border-gray-100 p-3 text-left hover:border-indigo-200 hover:bg-indigo-50/50"
                  >
                    <span className="block text-sm font-semibold text-gray-800">{record.bookName} {record.chapter}</span>
                    <span className="mt-1 flex items-center justify-between gap-2 text-xs text-gray-500">
                      <span>{record.language} · {chapterLabel(record)}</span>
                      <span>{record.updatedAt ? new Date(record.updatedAt).toLocaleDateString() : ""}</span>
                    </span>
                  </button>
                ))}
                {!recentRecords.length && <p className="text-sm text-gray-500">No translation chapters have been edited yet.</p>}
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600" />
                <h2 className="font-bold text-gray-900">Recently published</h2>
              </div>
              <div className="mt-4 space-y-2">
                {summary
                  .flatMap((item) => item.recentlyPublished || [])
                  .sort((a, b) => String(b.publishedAt || "").localeCompare(String(a.publishedAt || "")))
                  .slice(0, 5)
                  .map((record) => (
                    <button
                      key={record.id}
                      type="button"
                      onClick={() => openRecent(record)}
                      className="block w-full rounded-lg border border-gray-100 p-3 text-left hover:border-emerald-200 hover:bg-emerald-50/50"
                    >
                      <span className="block text-sm font-semibold text-gray-800">{record.bookName} {record.chapter}</span>
                      <span className="mt-1 flex items-center justify-between gap-2 text-xs text-gray-500">
                        <span>{record.language}</span>
                        <span>{record.publishedAt ? new Date(record.publishedAt).toLocaleDateString() : ""}</span>
                      </span>
                    </button>
                  ))}
                {!summary.some((item) => item.recentlyPublished?.length) && (
                  <p className="text-sm text-gray-500">No chapters have been published yet.</p>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-5">
              <div className="flex items-center gap-2 text-indigo-800">
                <CircleHelp className="h-4 w-4" />
                <h2 className="font-bold">Publishing workflow</h2>
              </div>
              <ol className="mt-3 list-inside list-decimal space-y-2 text-sm leading-6 text-indigo-950/80">
                <li>Paste one verse per line or enter numbered lines.</li>
                <li>Check parsing, verse numbers, and the chapter preview.</li>
                <li>Save a draft; edits do not change the public chapter.</li>
                <li>Publish only when translation and edition details are approved.</li>
              </ol>
              <p className="mt-3 border-t border-indigo-200 pt-3 text-xs leading-5 text-indigo-900/70">
                Gaps are warnings, not automatic rejections. Publishing a chapter with gaps requires explicit acknowledgment.
              </p>
            </section>

            {currentSummary && (
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-gray-800">{currentSummary.languageLabel} library</p>
                <p className="mt-1 text-xs text-gray-500">{currentSummary.publishedChapters} of {currentSummary.expectedChapters} chapters published</p>
                <p className="mt-3 text-xs text-gray-500">Chapter statistics are based on Firestore records.</p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-0.5 font-bold text-gray-800">{value}</p>
    </div>
  );
}

function Message({ tone, title, items }) {
  const warning = tone === "warning";
  return (
    <div className={`rounded-xl border p-3 ${warning ? "border-amber-200 bg-amber-50 text-amber-900" : "border-red-200 bg-red-50 text-red-800"}`}>
      <p className="text-sm font-bold">{title}</p>
      <ul className="mt-1 list-inside list-disc space-y-1 text-sm">
        {items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}
      </ul>
    </div>
  );
}
