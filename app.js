'use strict';
import { connectAccount } from './auth.js';
import { createAichiPractice } from './aichi.js';

const subjects = [
  {
    name: '数学', icon: '∑', tint: '#e7eee1',
    desc: '計算・関数・図形',
    questions: [
      ['方程式 2x + 5 = 17 の解は？',
        ['x = 4', 'x = 6', 'x = 8'], 1,
        '両辺から5を引くと 2x = 12。両辺を2で割ると x = 6 です。'],
      ['関数 y = 3x² で、x = −2 のときの y は？',
        ['−12', '6', '12'], 2,
        '(−2)² = 4 なので、y = 3 × 4 = 12 です。'],
      ['直角三角形の直角をはさむ2辺が3cmと4cm。斜辺の長さは？',
        ['5cm', '7cm', '6cm'], 0,
        '三平方の定理より、斜辺² = 3² + 4² = 25。斜辺は5cmです。']
    ]
  },
  {
    name: '英語', icon: 'Aa', tint: '#e4edf4',
    desc: '単語・文法・読解',
    questions: [
      ['空欄に入る語は？ I have (   ) in Tokyo for three years.',
        ['live', 'lived', 'living'], 1,
        '現在完了形は have / has + 過去分詞。live の過去分詞は lived です。'],
      ['「もし明日雨なら、家にいます。」If it (   ) tomorrow, I will stay home.',
        ['rains', 'will rain', 'rained'], 0,
        '未来のことでも、条件を表す if の節では現在形を使います。'],
      ['「これは私の兄が撮った写真です。」This is a picture (   ) my brother took.',
        ['who', 'that', 'where'], 1,
        '先行詞が物で、関係代名詞が目的語となる場合は that や which を使います。']
    ]
  },
  {
    name: '国語', icon: '文', tint: '#f5e6e1',
    desc: '漢字・文法・古文',
    questions: [
      ['「彼はまるで風のように走った。」で使われている表現技法は？',
        ['直喩', '倒置法', '擬人法'], 0,
        '「まるで」「ように」などを使ってたとえる表現を直喩といいます。'],
      ['「美しい花が咲く。」の「美しい」の品詞は？',
        ['名詞', '形容詞', '副詞'], 1,
        '「美しい」は性質や状態を表し、終止形が「い」で終わる形容詞です。'],
      ['古語「あはれなり」の意味として適切なのは？',
        ['趣深い', 'とても速い', '騒がしい'], 0,
        '「あはれなり」は、しみじみとした趣や感動を表します。']
    ]
  },
  {
    name: '理科', icon: '⚗', tint: '#eee6f4',
    desc: '物理・化学・生物・地学',
    questions: [
      ['抵抗が6Ω、電流が2Aのとき、電圧は？',
        ['3V', '8V', '12V'], 2,
        'オームの法則 V = RI より、6 × 2 = 12V です。'],
      ['植物が光合成で吸収する気体は？',
        ['酸素', '二酸化炭素', '窒素'], 1,
        '光合成では二酸化炭素と水を使い、光のエネルギーでデンプンなどをつくります。'],
      ['酸性の水溶液で青色リトマス紙はどうなる？',
        ['赤色になる', '青色のまま', '緑色になる'], 0,
        '酸性の水溶液は青色リトマス紙を赤色に変えます。']
    ]
  },
  {
    name: '社会', icon: '◎', tint: '#f5efd9',
    desc: '地理・歴史・公民',
    questions: [
      ['日本国憲法の三大原則に含まれないものは？',
        ['国民主権', '平和主義', '王権神授説'], 2,
        '三大原則は「国民主権」「基本的人権の尊重」「平和主義」です。'],
      ['鎌倉幕府で、将軍と御家人の主従関係を表す言葉は？',
        ['御恩と奉公', '楽市と楽座', '殖産興業'], 0,
        '将軍は領地の保障などの御恩を与え、御家人は軍役などの奉公をしました。'],
      ['日本の標準時子午線の経度は？',
        ['東経135度', '東経120度', '西経135度'], 0,
        '日本の標準時子午線は東経135度で、兵庫県明石市を通ります。']
    ]
  }
];

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

subjects.forEach((s, i) => {
  const button = document.createElement('button');
  button.className = 'subject';
  button.style.setProperty('--tint', s.tint);
  button.innerHTML =
    `<span class="icon">${s.icon}</span>` +
    `<strong>${s.name}</strong><p>${s.desc}</p>` +
    '<span class="link">演習する ↗</span>';
  button.onclick = () => openQuiz(i);
  $('subjectList').append(button);
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
  onRecords(records) {
    aichi.update(records);
    state = {
      answers: records.filter(e => e.kind === 'answer'),
      focus: records.filter(e => e.kind === 'focus')
    };
    renderStats();
  }
});
