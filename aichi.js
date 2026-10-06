export function createAichiPractice({getAccount,saveEvent}) {
 const $=id=>document.getElementById(id);
 let aichiQuestions=[];
 let records=[],queue=[],position=0,responses=[],mode='practice',running=false,deadline=0,timer=null,locked=false;
 const day=()=>new Date().toLocaleDateString('sv-SE');
 const stamp=e=>e.createdAt?.toMillis?.() ?? (e.createdAt?.seconds ? e.createdAt.seconds*1000 : Number.MAX_SAFE_INTEGER);
 function filteredQuestions(){
  const source=$('aichiSource').value,subject=$('aichiSubject').value;
  return aichiQuestions.filter(q=>(source==='all'||(source==='basic'?!q.source:String(q.source?.year)===source)) && (subject==='all'||q.subject===subject));
 }
 function shuffle(items){
  const result=[...items];
  for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
  return result;
 }
 function selection(pool){
  const n=$('aichiSize').value==='all'?pool.length:Number($('aichiSize').value);
  return ($('aichiSource').value==='basic'?[...pool]:shuffle(pool)).slice(0,n);
 }
 function mistakes(){
  const latest=new Map();
  [...records].filter(e=>aichiQuestions.some(q=>q.id===e.questionId)).sort((a,b)=>stamp(a)-stamp(b)).forEach(e=>latest.set(e.questionId,e));
  return filteredQuestions().filter(q=>latest.get(q.id)?.correct===false);
 }
 function update(recordsNext){
  records=recordsNext;
  const count=filteredQuestions().length;
  $('aichiAvailable').textContent=`選択中 ${count}問 / 全${aichiQuestions.length}問`;
  $('aichiPractice').disabled=!count;
  $('aichiMock').disabled=!count;
  $('aichiMistakes').textContent=mistakes().length+'問';
  $('aichiReview').disabled=mistakes().length===0;
  $('aichiBreakdown').replaceChildren();
  ['数学','英語','国語','理科','社会'].forEach(subject=>{
   const attempts=records.filter(e=>e.subject===subject && filteredQuestions().some(q=>q.id===e.questionId));
   const row=document.createElement('span');row.textContent=subject+' '+(attempts.length?Math.round(attempts.filter(e=>e.correct).length/attempts.length*100)+'%':'未演習');$('aichiBreakdown').append(row);
  });
 }
 function reset(){clearInterval(timer);timer=null;running=false;locked=false;queue=[];responses=[];aichiQuestions=[];update([]);$('aichiQuestionText').textContent='';$('aichiChoices').replaceChildren();$('aichiFeedback').textContent='';$('aichiExplanations').replaceChildren();$('aichiQuiz').close();}
 function start(nextMode){
  if(!getAccount()?.ready){$('accountMessage').textContent='ログインしてから勉強を始めてください。';$('accountTitle').scrollIntoView({behavior:'smooth'});return;}
  mode=nextMode;queue=selection(mode==='review'?mistakes():filteredQuestions());
  if(!queue.length)return;
  position=0;responses=[];running=true;locked=false;
  $('aichiResult').hidden=true;$('aichiQuestionArea').hidden=false;$('aichiQuiz').showModal();
  if(mode==='mock'){deadline=Date.now()+Number($('aichiDuration').value)*60000;timer=setInterval(tick,250);tick();}else{$('aichiTime').textContent=mode==='review'?'苦手問題の復習':'時間制限なし';}
  showQuestion();
 }
 function tick(){
  if(!running)return;
  const seconds=Math.max(0,Math.ceil((deadline-Date.now())/1000));
  $('aichiTime').textContent='残り '+String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
  if(!seconds)finish(true);
 }
 function showQuestion(){
  locked=false;const q=queue[position];
  $('aichiQuestionMeta').textContent=`${position+1} / ${queue.length} · ${q.subject} · ${q.topic}` + (q.source ? ` · 令和${q.source.year}年度PDF参考（オリジナル）` : ' · 基礎オリジナル');
  $('aichiQuestionText').textContent=q.text;$('aichiChoices').replaceChildren();$('aichiFeedback').textContent='';$('aichiNext').hidden=true;
  q.choices.forEach((label,i)=>{const b=document.createElement('button');b.className='answer';b.textContent=`${i+1}. ${label}`;b.onclick=()=>answer(i);$('aichiChoices').append(b);});
 }
 function answer(index){
  if(!running||locked)return;
  if(mode==='mock' && Date.now()>=deadline){finish(true);return;}
  locked=true;const q=queue[position],correct=index===q.answer;
  responses.push({q,index,correct});
  saveEvent({kind:'answer',date:day(),subject:q.subject,correct,questionId:q.id});
  [...$('aichiChoices').children].forEach((b,i)=>{b.disabled=true;if(mode!=='mock'){if(i===q.answer)b.classList.add('correct');else if(i===index)b.classList.add('wrong');}});
  $('aichiFeedback').textContent=mode==='mock'?'解答を記録しました。解説は終了後に表示します。':(correct?'正解！ ':'正解は '+(q.answer+1)+'。 ')+q.explanation;
  $('aichiNext').hidden=false;$('aichiNext').textContent=position===queue.length-1?'結果を見る':'次の問題へ →';
 }
 function finish(expired=false){
  if(!running)return;running=false;clearInterval(timer);timer=null;
  $('aichiQuestionArea').hidden=true;$('aichiResult').hidden=false;
  $('aichiResultTitle').textContent=(expired?'時間終了 · ':'演習完了 · ')+responses.filter(r=>r.correct).length+' / '+queue.length+'問正解';
  $('aichiResultNote').textContent=`解答 ${responses.length}問、未解答 ${queue.length-responses.length}問。未解答は記録・復習リストに追加されません。`;
  $('aichiExplanations').replaceChildren();
  queue.forEach(q=>{const response=responses.find(r=>r.q.id===q.id),item=document.createElement('article');const h=document.createElement('h3');h.textContent=(response?(response.correct?'○ 正解':'× 不正解'):'− 未解答')+' · '+q.subject+' / '+q.topic;const p=document.createElement('p');p.textContent=q.text;const a=document.createElement('p');a.textContent='正解：'+q.choices[q.answer]+'。 '+q.explanation;item.append(h,p,a);$('aichiExplanations').append(item);});
 }
 $('aichiPractice').onclick=()=>start('practice');$('aichiMock').onclick=()=>start('mock');$('aichiReview').onclick=()=>start('review');
 $('aichiNext').onclick=()=>{if(mode==='mock'&&Date.now()>=deadline){finish(true);return;}if(++position>=queue.length)finish();else showQuestion();};
 const close=()=>{clearInterval(timer);timer=null;running=false;$('aichiQuiz').close();};
 $('aichiClose').onclick=close;$('aichiQuiz').addEventListener('cancel',close);$('aichiQuiz').addEventListener('close',()=>{clearInterval(timer);timer=null;running=false;});
 ['aichiSource','aichiSubject','aichiSize'].forEach(id=>$(id).addEventListener('change',()=>update(records)));
 update([]);return {update,reset,setQuestions(questions){aichiQuestions=questions;update(records);}};
}
