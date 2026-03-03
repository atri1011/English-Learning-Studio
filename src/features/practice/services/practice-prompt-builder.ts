interface ChatMessage {
  role: "system" | "user" | "assistant"
  content: string
}

const SYSTEM_PROMPT = `You are a professional English language evaluator assessing back-translation quality.
You will receive:
1. Original English text (source)
2. Chinese translation (prompt given to the student)
3. Student's back-translation attempt

Evaluate the back-translation by comparing it with the original English text.
Return ONLY valid JSON matching the requested format.
All Chinese explanations should be clear and suitable for language learners.
Do not wrap JSON in markdown code fences.
JSON property names must stay in English exactly as required.
Be strict about error categorization and root-cause diagnosis.`

export function buildBackTranslationEvalPrompt(
  sourceChunk: string,
  promptChunk: string,
  userChunk: string,
): ChatMessage[] {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Evaluate this back-translation attempt. Compare the student's translation with the original English text.

Return JSON with this exact format:
{
  "overallScore": 75,
  "dimensionScores": {
    "semantic": 80,
    "grammar": 70,
    "lexical": 75,
    "naturalness": 72
  },
  "dualScores": {
    "cet46": 78,
    "daily": 74
  },
  "verdictZh": "一句话中文总评（不超过50字）",
  "diffs": [
    {
      "type": "missing|wrong|extra|reorder",
      "severity": "critical|major|minor",
      "severityScore": 5,
      "category": "M|G|L|R|D|C",
      "rootCause": "K|I|S|O|A",
      "original": "original English phrase",
      "userText": "student's corresponding text",
      "suggestion": "suggested correction",
      "explanationZh": "中文解释为什么这样改",
      "preventionTipZh": "下次避免该错误的规则或提醒",
      "drillZh": "一条最小对立微练习（中文说明+英文例句）"
    }
  ],
  "errorMetrics": {
    "ser": 40,
    "fer": 60
  },
  "reviewPlanDays": [1, 3, 7, 14],
  "betterVersion": {
    "minimalEdit": "student's text with minimal corrections only",
    "naturalAlt": "a more natural way to express the same meaning"
  },
  "strengths": ["中文：学生做得好的方面1", "方面2"],
  "nextFocus": ["中文：下次需要注意的方面1", "方面2"]
}

Important output constraints:
- Keep JSON keys exactly the same as the schema above. Do not translate/rename keys.
- If there are meaningful translation errors, provide at least 1 item in "diffs".
- If a diff is semantic distortion, set category to M or D or C.
- severityScore must map to severity: critical=5, major=3, minor=1.

Scoring rules:
- Each dimension score is 0-100
- semantic: How accurately the meaning is conveyed
- grammar: Grammar correctness
- lexical: Vocabulary usage quality and variety
- naturalness: How natural and idiomatic the English sounds
- overallScore = semantic*0.4 + grammar*0.25 + lexical*0.2 + naturalness*0.15 (round to integer)
- dualScores.cet46 = semantic*0.4 + grammar*0.3 + lexical*0.15 + naturalness*0.1 + constraint(5)
- dualScores.daily = semantic*0.3 + lexical*0.25 + naturalness*0.2 + discourse(15) + grammar*0.1
- errorMetrics.ser and errorMetrics.fer are percentage-like values in [0, 100], and should roughly sum to 100.

Diff types:
- missing: important meaning from original is not expressed
- wrong: meaning is incorrectly translated
- extra: student added meaning not in original
- reorder: word order issues affecting clarity

Severity:
- critical: changes core meaning
- major: noticeable error but meaning partly preserved
- minor: style/preference issue

Error category:
- M: semantic fidelity errors (missing/wrong/extra that changes meaning)
- G: grammar errors (tense, voice, agreement, clause form)
- L: lexical/collocation/preposition errors
- R: register/style mismatch (too formal or too casual)
- D: discourse/cohesion/reference problems
- C: constraint violation (keyword/length/required pattern not met)

Root cause:
- K: knowledge gap
- I: L1 transfer interference
- S: retrieval failure (knows it but cannot recall in time)
- O: overgeneralization
- A: attention slip

Original English:
"""${sourceChunk}"""

Chinese translation (given to student):
"""${promptChunk}"""

Student's back-translation:
"""${userChunk}"""`,
    },
  ]
}
