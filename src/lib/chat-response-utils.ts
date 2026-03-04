type MaybeString = string | undefined;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) =>
      typeof item === "string" ? item.trim() : undefined
    )
    .filter((item): item is string => !!item);
};

const pickString = (...candidates: unknown[]): MaybeString => {
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }
  return undefined;
};

const uniqueStrings = (...lists: Array<string[] | undefined>): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const list of lists) {
    if (!list) continue;
    for (const item of list) {
      const trimmed = item.trim();
      if (!trimmed || seen.has(trimmed)) continue;
      seen.add(trimmed);
      result.push(trimmed);
    }
  }

  return result;
};

export interface FormattedChatAnswer {
  text: string;
  followUps: string[];
}

export const formatChatAnswer = (
  answer: unknown
): FormattedChatAnswer => {
  if (typeof answer === "string") {
    return { text: answer, followUps: [] };
  }

  if (isRecord(answer)) {
    const sections: string[] = [];

    const summary = pickString(answer.summary, answer.title);
    if (summary) {
      sections.push(`**Summary:** ${summary}`);
    }

    const mainResponse = pickString(
      answer.main_response,
      answer.mainResponse,
      answer.response,
      answer.answer,
      answer.text,
      answer.message
    );
    if (mainResponse) {
      sections.push(mainResponse);
    }

    const listItems = [
      ...toStringArray(answer.lists),
      ...toStringArray(answer.points),
      ...toStringArray(answer.steps),
    ];

    if (listItems.length) {
      sections.push(
        listItems
          .map((item, idx) => `${idx + 1}. ${item}`)
          .join("\n")
      );
    }

    const additional =
      pickString(answer.details, answer.notes, answer.status) ??
      undefined;
    if (additional) {
      sections.push(additional);
    }

    if (!sections.length) {
      sections.push(JSON.stringify(answer, null, 2));
    }

    const followUps = uniqueStrings(
      toStringArray(answer.follow_up_questions),
      toStringArray(answer.followUpQuestions),
      toStringArray(answer.follow_ups),
      toStringArray(answer.followUps)
    );

    return {
      text: sections.join("\n\n"),
      followUps,
    };
  }

  if (typeof answer === "number" || typeof answer === "boolean") {
    return { text: String(answer), followUps: [] };
  }

  if (answer === null || typeof answer === "undefined") {
    return { text: "No response received", followUps: [] };
  }

  return {
    text: JSON.stringify(answer, null, 2),
    followUps: [],
  };
};

export const mergeFollowUpSuggestions = (
  ...lists: Array<string[] | undefined>
): string[] => uniqueStrings(...lists);

