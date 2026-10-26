const BOOK_ROWS = [
  ["gn", "Genesis", "OT", 50], ["ex", "Exodus", "OT", 40],
  ["lv", "Leviticus", "OT", 27], ["nm", "Numbers", "OT", 36],
  ["dt", "Deuteronomy", "OT", 34], ["js", "Joshua", "OT", 24],
  ["jud", "Judges", "OT", 21], ["rt", "Ruth", "OT", 4],
  ["1sm", "1 Samuel", "OT", 31], ["2sm", "2 Samuel", "OT", 24],
  ["1kgs", "1 Kings", "OT", 22], ["2kgs", "2 Kings", "OT", 25],
  ["1ch", "1 Chronicles", "OT", 29], ["2ch", "2 Chronicles", "OT", 36],
  ["ezr", "Ezra", "OT", 10], ["ne", "Nehemiah", "OT", 13],
  ["et", "Esther", "OT", 10], ["job", "Job", "OT", 42],
  ["ps", "Psalms", "OT", 150], ["prv", "Proverbs", "OT", 31],
  ["ec", "Ecclesiastes", "OT", 12], ["so", "Song of Solomon", "OT", 8],
  ["is", "Isaiah", "OT", 66], ["jr", "Jeremiah", "OT", 52],
  ["lm", "Lamentations", "OT", 5], ["ez", "Ezekiel", "OT", 48],
  ["dn", "Daniel", "OT", 12], ["ho", "Hosea", "OT", 14],
  ["jl", "Joel", "OT", 3], ["am", "Amos", "OT", 9],
  ["ob", "Obadiah", "OT", 1], ["jon", "Jonah", "OT", 4],
  ["mi", "Micah", "OT", 7], ["na", "Nahum", "OT", 3],
  ["hk", "Habakkuk", "OT", 3], ["zp", "Zephaniah", "OT", 3],
  ["hg", "Haggai", "OT", 2], ["zc", "Zechariah", "OT", 14],
  ["ml", "Malachi", "OT", 4], ["mt", "Matthew", "NT", 28],
  ["mk", "Mark", "NT", 16], ["lk", "Luke", "NT", 24],
  ["jo", "John", "NT", 21], ["act", "Acts", "NT", 28],
  ["rm", "Romans", "NT", 16], ["1co", "1 Corinthians", "NT", 16],
  ["2co", "2 Corinthians", "NT", 13], ["gl", "Galatians", "NT", 6],
  ["eph", "Ephesians", "NT", 6], ["php", "Philippians", "NT", 4],
  ["cl", "Colossians", "NT", 4], ["1ts", "1 Thessalonians", "NT", 5],
  ["2ts", "2 Thessalonians", "NT", 3], ["1tm", "1 Timothy", "NT", 6],
  ["2tm", "2 Timothy", "NT", 4], ["tt", "Titus", "NT", 3],
  ["phm", "Philemon", "NT", 1], ["hb", "Hebrews", "NT", 13],
  ["jm", "James", "NT", 5], ["1pe", "1 Peter", "NT", 5],
  ["2pe", "2 Peter", "NT", 3], ["1jo", "1 John", "NT", 5],
  ["2jo", "2 John", "NT", 1], ["3jo", "3 John", "NT", 1],
  ["jd", "Jude", "NT", 1], ["re", "Revelation", "NT", 22],
];

export const BIBLE_BOOKS = BOOK_ROWS.map(([id, englishName, testament, chapterCount], index) => ({
  id,
  englishName,
  testament,
  order: index + 1,
  chapterCount,
  hindiName: "",
  teluguName: "",
  hindiChapterCount: chapterCount,
  teluguChapterCount: chapterCount,
}));

export const BIBLE_BOOK_BY_ID = new Map(BIBLE_BOOKS.map((book) => [book.id, book]));
export const BIBLE_LANGUAGES = ["hindi", "telugu"];

export function expectedChapterCount(book, language) {
  if (!book || !BIBLE_LANGUAGES.includes(language)) return 0;
  const configured = Number(book[`${language}ChapterCount`]);
  return Number.isInteger(configured) && configured > 0 ? configured : book.chapterCount;
}

export function chapterDocumentId(language, bookId, chapter) {
  return `${language}_${bookId}_${chapter}`;
}
