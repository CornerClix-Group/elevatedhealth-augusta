/** Levenshtein distance for typed-name fuzzy validation. */
export function levenshteinDistance(a: string, b: string): number {
  const s = a.toLowerCase().trim();
  const t = b.toLowerCase().trim();
  if (s === t) return 0;
  if (s.length === 0) return t.length;
  if (t.length === 0) return s.length;

  const matrix: number[][] = Array.from({ length: s.length + 1 }, () =>
    Array(t.length + 1).fill(0),
  );
  for (let i = 0; i <= s.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= t.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= s.length; i++) {
    for (let j = 1; j <= t.length; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return matrix[s.length][t.length];
}

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export type TypedNameValidation = {
  isValid: boolean;
  warning?: string;
};

/** Fuzzy validation for typed legal name vs name on file. */
export function validateTypedName(typedName: string, expectedName?: string): TypedNameValidation {
  const typed = typedName.trim();
  if (!typed) {
    return { isValid: false };
  }

  if (!expectedName?.trim()) {
    return { isValid: true };
  }

  const normTyped = normalizeName(typed);
  const normExpected = normalizeName(expectedName);

  if (normTyped === normExpected) {
    return { isValid: true };
  }

  const distance = levenshteinDistance(normTyped, normExpected);
  const hasInvalidChars = /[^a-zA-Z\s.'-]/.test(typed);
  const maxLen = Math.max(normTyped.length, normExpected.length, 1);
  const ratio = distance / maxLen;

  if (hasInvalidChars && distance > 2) {
    return {
      isValid: false,
      warning: "Typed name does not appear to match the name on your record",
    };
  }

  if (distance > 5 || ratio > 0.45) {
    return {
      isValid: false,
      warning: "Typed name does not appear to match the name on your record",
    };
  }

  return {
    isValid: true,
    warning:
      "Note: your typed name differs slightly from the name on your record. This is OK but flagged for audit.",
  };
}
