// No question content is distributed with the public application.
export function parseQuestionBank(payload) {
  const invalid = () => { throw { code: 'questions/invalid' }; };
  const text = value => typeof value === 'string' && value.length > 0 && value.length <= 10000;
  const choices = (values, answer) => Array.isArray(values) && values.length >= 2
    && values.length <= 8 && values.every(text)
    && Number.isInteger(answer) && answer >= 0 && answer < values.length;
  let bank;
  try { bank = JSON.parse(payload); } catch { invalid(); }
  const names = ['数学', '英語', '国語', '理科', '社会'];
  if (!bank || bank.version !== 1 || !Array.isArray(bank.subjects)
      || bank.subjects.length !== 5 || !Array.isArray(bank.aichiQuestions)
      || !bank.aichiQuestions.length || bank.aichiQuestions.length > 1000) invalid();
  const seenNames = new Set();
  for (const s of bank.subjects) {
    if (!s || !names.includes(s.name) || seenNames.has(s.name)
        || !text(s.icon) || !text(s.desc) || !/^#[0-9a-f]{6}$/i.test(s.tint)
        || !Array.isArray(s.questions) || !s.questions.length || s.questions.length > 1000) invalid();
    seenNames.add(s.name);
    for (const q of s.questions) {
      if (!Array.isArray(q) || q.length !== 4 || !text(q[0])
          || !choices(q[1], q[2]) || !text(q[3])) invalid();
    }
  }
  const ids = new Set();
  for (const q of bank.aichiQuestions) {
    if (!q || !/^aichi-r[789]-(math|english|japanese|science|social)-[1-9][0-9]{0,2}$/.test(q.id)
        || ids.has(q.id) || !names.includes(q.subject) || !text(q.topic)
        || !text(q.text) || !choices(q.choices, q.answer) || !text(q.explanation)
        || (q.source && (![7, 8].includes(q.source.year) || !text(q.source.file)
          || !Number.isInteger(q.source.page) || q.source.page < 1))) invalid();
    ids.add(q.id);
  }
  return bank;
}
