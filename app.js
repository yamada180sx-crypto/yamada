'use strict';
import { connectAccount } from './auth.js';
import { createAichiPractice } from './aichi.js';

let subjects = [];

function renderSubjects() {
  $('subjectList').replaceChildren();
  subjects.forEach((s, i) => {
    const button = document.createElement('button');
    button.className = 'subject';
    button.style.setProperty('--tint', s.tint);
    const icon = document.createElement('span'); icon.className = 'icon'; icon.textContent = s.icon;
    const name = document.createElement('strong'); name.textContent = s.name;
    const desc = document.createElement('p'); desc.textContent = s.desc;
    const link = document.createElement('span'); link.className = 'link'; link.textContent = '演習する ↗';
    button.append(icon, name, desc, link);
    button.onclick = () => openQuiz(i);
    $('subjectList').append(button);
  });
}

const $ = id => document.getElementById(id);
let state = { answers: [], focus: [] };
let account = null;
const day = () => new Date().toLocaleDateString('sv-SE');

function saveEvent(event) {
  account.addEvent(event).catch(() => {});
}

function requireAccount() {
  if (account?.ready) return true;
  $('accountMessage').textContent =
    'ログインしてから勉強を始めてください。';
  $('accountTitle').scrollIntoView({ behavior: 'smooth' });
  return false;
}

function renderStats() {
  $('todayCount').innerHTML =
    state.answers.filter(a => a.date === day()).length +
    ' <small>問</small>';

  $('accuracy').textContent = state.answers.length
    ? Math.round(
        state.answers.filter(a => a.correct).length /
        state.answers.length * 100
      ) + '%'
    : '—';

  $('minutes').innerHTML =
    state.focus
      .filter(a => a.date === day())
      .reduce((sum, a) => sum + a.minutes, 0) +
    ' <small>分</small>';
}

$('date').textContent = new Date().toLocaleDateString('ja-JP', {
  month: 'long', day: 'numeric', weekday: 'long'
});



let selected = 0;
let questionIndex = 0;
let answered = false;

function openQuiz(i) {
  if (!requireAccount()) return;
  selected = i;
  questionIndex = 0;
  showQuestion();
  $('quiz').showModal();
}

function showQuestion() {
  answered = false;
  const s = subjects[selected];
  const q = s.questions[questionIndex];

  $('quizSubject').textContent = s.name + ' · 基礎チェック';
  $('questionNumber').textContent =
    `問題 ${questionIndex + 1} / ${s.questions.length}`;
  $('question').textContent = q[0];
  $('answers').replaceChildren();
  $('feedback').textContent = '';
  $('next').hidden = true;

  q[1].forEach((label, i) => {
    const b = document.createElement('button');
    b.className = 'answer';
    b.textContent = label;
    b.onclick = () => answer(i);
    $('answers').append(b);
  });
}

function answer(index) {
  if (answered) return;
  answered = true;
  const q = subjects[selected].questions[questionIndex];
  const correct = index === q[2];

  [...$('answers').children].forEach((b, i) => {
    b.disabled = true;
    if (i === q[2]) b.classList.add('correct');
    else if (i === index) b.classList.add('wrong');
  });

  $('feedback').textContent =
    (correct
      ? '正解！ '
      : 'おしい！ 正解は「' + q[1][q[2]] + '」。 ') + q[3];

  saveEvent({
    kind: 'answer',
    date: day(),
    subject: subjects[selected].name,
    correct
  });

  $('next').hidden = false;
  $('next').textContent =
    questionIndex === subjects[selected].questions.length - 1
      ? '演習を終える ✓'
      : '次の問題へ →';
}

$('next').onclick = () => {
  if (++questionIndex >= subjects[selected].questions.length) {
    $('quiz').close();
  } else {
    showQuestion();
  }
};

$('closeQuiz').onclick = () => $('quiz').close();

let remaining = 25 * 60;
let deadline = 0;
let interval = null;

function renderClock() {
  $('clock').textContent =
    String(Math.floor(remaining / 60)).padStart(2, '0') +
    ':' + String(remaining % 60).padStart(2, '0');
}

function tick() {
  remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  renderClock();

  if (remaining === 0) {
    clearInterval(interval);
    interval = null;
    saveEvent({ kind: 'focus', date: day(), minutes: 25 });
    $('timerStart').textContent = 'もう一度始める';
    $('timerMessage').textContent =
      '25分おつかれさま！ 少し休憩しましょう。';
  }
}

$('timerStart').onclick = () => {
  if (!requireAccount()) return;

  if (interval) {
    tick();
    if (!interval) return;
    clearInterval(interval);
    interval = null;
    $('timerStart').textContent = '再開する';
  } else {
    if (!remaining) remaining = 1500;
    deadline = Date.now() + remaining * 1000;
    interval = setInterval(tick, 250);
    $('timerStart').textContent = '一時停止';
    $('timerMessage').textContent = '';
  }
};

$('timerReset').onclick = () => {
  clearInterval(interval);
  interval = null;
  remaining = 1500;
  renderClock();
  $('timerStart').textContent = '集中を始める';
  $('timerMessage').textContent = '';
};

renderStats();

const aichi = createAichiPractice({ getAccount: () => account, saveEvent });

function resetSession() {
  aichi.reset();
  subjects = [];
  renderSubjects();
  $('question').textContent = '';
  $('answers').replaceChildren();
  $('feedback').textContent = '';
  state = { answers: [], focus: [] };
  clearInterval(interval);
  interval = null;
  remaining = 1500;
  renderClock();
  $('timerStart').textContent = '集中を始める';
  $('timerMessage').textContent = '';
  $('quiz').close();
  renderStats();
}

account = connectAccount({
  onReset: resetSession,
  onQuestions(bank) {
    subjects = bank.subjects;
    renderSubjects();
    aichi.setQuestions(bank.aichiQuestions);
  },
  onRecords(records) {
    aichi.update(records);
    state = {
      answers: records.filter(e => e.kind === 'answer'),
      focus: records.filter(e => e.kind === 'focus')
    };
    renderStats();
  }
});
