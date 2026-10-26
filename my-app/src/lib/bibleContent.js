export function validateVerses(verses) {
  const errors = [];
  const numbers = new Set();
  const normalized = [];

  if (!Array.isArray(verses) || verses.length === 0) {
    return { verses: [], errors: ["Add at least one verse."], warnings: [], missingNumbers: [] };
  }

  verses.forEach((verse, index) => {
    const number = Number(verse?.number);
    const text = typeof verse?.text === "string" ? verse.text.trim() : "";
    if (!Number.isInteger(number) || number < 1) {
      errors.push(`Verse row ${index + 1} must have a positive whole-number verse number.`);
    } else if (numbers.has(number)) {
      errors.push(`Verse ${number} is duplicated.`);
    } else {
      numbers.add(number);
    }
    if (!text) errors.push(`Verse ${Number.isInteger(number) ? number : index + 1} has no text.`);
    if (Number.isInteger(number) && number > 0) normalized.push({ number, text });
  });

  normalized.sort((a, b) => a.number - b.number);
  const maximum = normalized.at(-1)?.number || 0;
  const missingNumbers = [];
  for (let number = 1; number <= maximum; number += 1) {
    if (!numbers.has(number)) missingNumbers.push(number);
  }
  const warnings = missingNumbers.length
    ? [`Verse numbering has gaps: ${missingNumbers.join(", ")}.`]
    : [];

  return { verses: normalized, errors, warnings, missingNumbers };
}

export function parseBulkVerses(input) {
  const lines = String(input ?? "").split(/\r?\n/);
  const contentLines = lines
    .map((text, index) => ({ text: text.trim(), line: index + 1 }))
    .filter((entry) => entry.text.length > 0);

  if (!contentLines.length) {
    return { verses: [], errors: ["Paste one verse per line or use “1 | Verse text” format."], warnings: [], missingNumbers: [] };
  }

  let verses;
  const hasPipe = contentLines.some(({ text }) => text.includes("|"));
  const numberedPattern = /^\s*(\d+)\s*(?:[.:)]|\s)\s*(.*?)\s*$/;
  const hasNumberedLine = contentLines.some(({ text }) => numberedPattern.test(text));

  if (hasPipe) {
    verses = [];
    const errors = [];
    contentLines.forEach(({ text, line }) => {
      const match = text.match(/^\s*(\d+)\s*\|\s*(.*?)\s*$/);
      if (!match) {
        errors.push(`Line ${line} must use “verse number | verse text”.`);
      } else {
        verses.push({ number: Number(match[1]), text: match[2] });
      }
    });
    const result = validateVerses(verses);
    return {
      ...result,
      errors: [...errors, ...result.errors],
    };
  }

  if (hasNumberedLine) {
    verses = [];
    const errors = [];
    contentLines.forEach(({ text, line }) => {
      const match = text.match(numberedPattern);
      if (!match) {
        errors.push(`Line ${line} is unnumbered. Do not mix numbered and unnumbered lines.`);
      } else {
        verses.push({ number: Number(match[1]), text: match[2] });
      }
    });
    const result = validateVerses(verses);
    return {
      ...result,
      errors: [...errors, ...result.errors],
    };
  }

  verses = contentLines.map(({ text }, index) => ({ number: index + 1, text }));
  return validateVerses(verses);
}
