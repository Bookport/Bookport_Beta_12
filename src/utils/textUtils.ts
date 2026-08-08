// Gender-specific verb form helper (mirrors `t()` in waterPhrases/movementPhrases)
export const getGenderVerb = (gender: string | undefined, maleWord: string, femaleWord: string): string =>
  gender === "female" ? femaleWord : maleWord;