const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
const fixturePath=process.env.QUESTION_BANK_FILE;
if(!fixturePath) throw new Error('Set QUESTION_BANK_FILE to the private question-bank.json outside the repository');
const payload=fs.readFileSync(fixturePath,'utf8'),bank=JSON.parse(payload);
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const page=await browser.newPage();
const url=process.env.STUDY_APP_URL||'http://127.0.0.1:8001';
await page.addInitScript(payload=>window.testPayload=payload,payload);
await page.route('https://www.gstatic.com/firebasejs/11.10.0/*',route=>{
let body='';
if(route.request().url().endsWith('firebase-app.js'))body='export const initializeApp=()=>({});';
if(route.request().url().endsWith('firebase-auth.js'))body=`
export const getAuth=()=>({});export const browserSessionPersistence={};export const setPersistence=async()=>{};
export class GoogleAuthProvider{setCustomParameters(){}}
export const onAuthStateChanged=(auth,cb)=>{window.authCallback=cb;cb(null);};
export const signInWithPopup=async()=>{if(window.popupFail)throw {code:'auth/popup-blocked'};await window.authCallback({uid:window.uid||'daughter',displayName:'テスト利用者'});};
export const signOut=async()=>{await window.authCallback(null);};`;
if(route.request().url().endsWith('firebase-firestore.js'))body=`
export const getFirestore=()=>({});export const doc=(db,...parts)=>parts.join('/');export const collection=doc;
window.reads=[];window.paths=[];const rows={};
export const getDocFromServer=async path=>{window.reads.push(path);if(path.startsWith('allowedUsers/'))return {exists:()=>!window.denied};if(window.bankDenied)throw {code:'permission-denied'};if(window.delayBank)await new Promise(resolve=>window.releaseBank=resolve);return {exists:()=>!window.bankMissing,data:()=>({payload:window.invalidBank?'{}':window.testPayload})};};
const snapshot=uid=>({docs:(rows[uid]||[]).map(data=>({data:()=>data})),metadata:{fromCache:false}});
export const onSnapshot=(path,options,cb,onError)=>{window.snapshotError=onError;const uid=path.split('/')[1];window.snapshotCallback=()=>cb(snapshot(uid));window.snapshotCallback();return ()=>{window.snapshotCallback=null;};};
export const serverTimestamp=()=>0;
export const addDoc=async(path,event)=>{if(window.writeFail)throw {code:'permission-denied'};window.paths.push(path);const uid=path.split('/')[1];(rows[uid]??=[]).push(event);window.snapshotCallback?.();};`;
return route.fulfill({contentType:'text/javascript',body});
});
const locked=async()=>{assert.equal(await page.locator('#studyContent').isVisible(),false);assert.equal(await page.locator('#studyNav').isVisible(),false);assert.equal(await page.locator('.subject').count(),0);assert.equal(await page.locator('#aichiQuestionText').textContent(),'');};
const signIn=async()=>{await page.locator('#loginButton').click();await page.waitForFunction(()=>document.getElementById('accountMessage').textContent.includes('同期済み'));};
await page.goto(url);await page.waitForFunction(()=>!document.getElementById('loginButton').disabled);
await locked();assert.deepEqual(await page.evaluate(()=>window.reads),[]);
await page.evaluate(()=>window.denied=true);await page.locator('#loginButton').click();await page.waitForFunction(()=>document.getElementById('accountMessage').textContent.includes('利用許可がありません'));await locked();assert.deepEqual(await page.evaluate(()=>window.reads),['allowedUsers/daughter']);
await page.evaluate(()=>{window.denied=false;window.bankMissing=true;});await page.locator('#loginButton').click();await page.waitForFunction(()=>document.getElementById('accountMessage').textContent.includes('まだ登録'));await locked();await page.locator('#logoutButton').click();
await page.evaluate(()=>{window.bankMissing=false;window.invalidBank=true;});await page.locator('#loginButton').click();await page.waitForFunction(()=>document.getElementById('accountMessage').textContent.includes('問題データを読み込めません'));await locked();await page.locator('#logoutButton').click();
await page.evaluate(()=>{window.invalidBank=false;window.bankDenied=true;});await page.locator('#loginButton').click();await page.waitForFunction(()=>document.getElementById('accountMessage').textContent.includes('利用許可がありません'));await locked();await page.locator('#logoutButton').click();
console.log('PASS: no bank read before login or for unapproved users; missing, invalid and denied banks stay locked');
await page.evaluate(()=>window.bankDenied=false);await signIn();assert.equal(await page.locator('.subject').count(),5);assert.equal(await page.locator('#studyContent').isVisible(),true);
await page.locator('.subject').first().click();await page.locator('#answers button').nth(bank.subjects[0].questions[0][2]).click();assert.equal(await page.locator('#accuracy').textContent(),'100%');await page.locator('#closeQuiz').click();
await page.locator('#aichiSource').selectOption('basic');await page.locator('#aichiPractice').click();const first=bank.aichiQuestions[0];await page.locator('#aichiChoices button').nth((first.answer+1)%4).click();await page.locator('#aichiClose').click();assert.equal(await page.locator('#aichiMistakes').textContent(),'1問');await page.locator('#aichiReview').click();await page.locator('#aichiChoices button').nth(first.answer).click();await page.locator('#aichiNext').click();await page.locator('#aichiClose').click();assert.equal(await page.locator('#aichiMistakes').textContent(),'0問');
await page.locator('#aichiSource').selectOption('7');await page.locator('#aichiSize').selectOption('all');assert.equal(await page.locator('#aichiAvailable').textContent(),'選択中 20問 / 全50問');await page.locator('#aichiPractice').click();
for(let i=0;i<20;i++){const text=await page.locator('#aichiQuestionText').textContent();const answer=bank.aichiQuestions.find(q=>q.text===text).answer;await page.locator('#aichiChoices button').nth(answer).click();await page.locator('#aichiNext').click();}
assert.equal(await page.locator('#aichiResultTitle').textContent(),'演習完了 · 20 / 20問正解');await page.locator('#aichiClose').click();
await page.locator('#aichiSource').selectOption('8');await page.locator('#aichiSubject').selectOption('理科');assert.equal(await page.locator('#aichiAvailable').textContent(),'選択中 4問 / 全50問');await page.clock.install();await page.locator('#aichiMock').click();await page.locator('#aichiChoices button').first().click();assert.equal(await page.locator('#aichiFeedback').textContent(),'解答を記録しました。解説は終了後に表示します。');
await page.clock.fastForward(600001);assert.ok((await page.locator('#aichiResultTitle').textContent()).includes('時間終了'));await page.locator('#aichiClose').click();
assert.ok((await page.evaluate(()=>window.paths)).every(path=>path==='users/daughter/events'));
await page.locator('#timerStart').click();await page.locator('#logoutButton').click();await locked();assert.equal(await page.locator('#clock').textContent(),'25:00');assert.equal(await page.locator('#aichiExplanations article').count(),0);assert.equal(await page.locator('#question').textContent(),'');
await page.evaluate(()=>window.uid='parent');await signIn();assert.equal((await page.locator('#todayCount').textContent()).trim(),'0 問');
await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
await page.evaluate(()=>window.snapshotError({code:'permission-denied'}));await locked();
console.log('PASS: private bank renders exercises, review, full 20-question set, filters, timed run; logout clears contents, UID isolation and mobile layout');
await page.locator('#logoutButton').click();await page.evaluate(()=>window.delayBank=true);await page.locator('#loginButton').click();await page.waitForFunction(()=>!!window.releaseBank);await page.locator('#logoutButton').click();await page.evaluate(()=>window.releaseBank());await locked();assert.equal(await page.locator('#aichiAvailable').textContent(),'選択中 0問 / 全0問');
const noScript=await browser.newContext({javaScriptEnabled:false});const noScriptPage=await noScript.newPage();await noScriptPage.goto(url);assert.equal(await noScriptPage.locator('#studyContent').isVisible(),false);await noScript.close();
const {parseQuestionBank}=await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync('question-bank.js','utf8')).toString('base64'));
assert.equal(parseQuestionBank(payload).aichiQuestions.length,50);
const invalid=structuredClone(bank);invalid.aichiQuestions[0].answer=99;assert.throws(()=>parseQuestionBank(JSON.stringify(invalid)));
for(const file of ['app.js','aichi.js','auth.js','question-bank.js','index.html','tests/smoke.cjs']){const content=fs.readFileSync(file,'utf8');for(const q of bank.aichiQuestions)assert.ok(!content.includes(q.text));for(const s of bank.subjects)for(const q of s.questions)assert.ok(!content.includes(q[0]));}
console.log('PASS: late bank load after logout stays locked, JavaScript-disabled page locked, bank validation, no private questions in public source');
await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
