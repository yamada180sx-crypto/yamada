// Original practice questions, not official Aichi examination questions.
export const aichiQuestions = [
 {id:'aichi-r9-math-1',subject:'数学',topic:'二次方程式',text:'方程式 x² − 5x + 6 = 0 の解の組み合わせは？',choices:['1 と 6','2 と 3','−2 と −3','−1 と −6'],answer:1,explanation:'x² − 5x + 6 = (x − 2)(x − 3)。それぞれの因数を0とすると x = 2, 3 です。'},
 {id:'aichi-r9-math-2',subject:'数学',topic:'確率',text:'大小2個のさいころを同時に投げる。目の和が7になる確率は？',choices:['1/12','1/9','1/6','1/3'],answer:2,explanation:'全36通りのうち、(1,6),(2,5),(3,4),(4,3),(5,2),(6,1)の6通り。6/36 = 1/6 です。'},
 {id:'aichi-r9-english-1',subject:'英語',topic:'受動態',text:'空欄に入る語は？ This bridge (   ) in 1990.',choices:['builds','built','was built','has built'],answer:2,explanation:'橋は「建てられた」ので受動態。過去の出来事は was / were + 過去分詞で表します。'},
 {id:'aichi-r9-english-2',subject:'英語',topic:'短文読解',text:'Mika usually walks to school. Today it was raining, so she took the bus. How did Mika go to school today?',choices:['On foot.','By bus.','By bike.','By train.'],answer:1,explanation:'普段は徒歩ですが、今日は雨のためバスに乗りました。Today と took the bus が手がかりです。'},
 {id:'aichi-r9-japanese-1',subject:'国語',topic:'説明文読解',text:'「便利さだけを求めると、資源を使いすぎることがある。だから、長く使える物を選ぶ姿勢も大切だ。」筆者の主張として最も適切なのは？',choices:['便利な物をすべてなくすべきだ','資源は使うほど増える','物を長く使う視点も必要だ','便利さだけを基準にすべきだ'],answer:2,explanation:'「だから」の後に結論があります。「長く使える物を選ぶ姿勢も大切」が筆者の主張です。'},
 {id:'aichi-r9-japanese-2',subject:'国語',topic:'敬語',text:'「先生が話す」を、先生への尊敬語にした表現は？',choices:['先生が申す','先生がおっしゃる','先生が申し上げる','先生が拝見する'],answer:1,explanation:'「おっしゃる」は「言う」の尊敬語。「申す」「申し上げる」は謙譲語です。'},
 {id:'aichi-r9-science-1',subject:'理科',topic:'化学変化と質量',text:'銅4.0gを十分に加熱すると酸化銅5.0gになった。同じ条件で銅8.0gからできる酸化銅の質量は？',choices:['9.0g','10.0g','12.0g','13.0g'],answer:1,explanation:'十分に反応したときの質量比は 銅 : 酸化銅 = 4 : 5。銅が2倍なので酸化銅も2倍の10.0gです。'},
 {id:'aichi-r9-science-2',subject:'理科',topic:'地震',text:'ある地震で、震源から遠い観測地点ほど一般に長くなる時間は？',choices:['P波とS波の到着の差（初期微動継続時間）','地震の発生時刻','1日の長さ','P波の速さ'],answer:0,explanation:'P波はS波より速く進みます。距離が長いほど両者の到着時刻の差が大きくなります。'},
 {id:'aichi-r9-social-1',subject:'社会',topic:'地理・中部地方',text:'中京工業地帯の特色として最も適切なのは？',choices:['自動車など輸送用機械の生産が盛ん','酪農だけで成り立つ','工業製品を生産しない','日本の最北端に位置する'],answer:0,explanation:'愛知県を中心とする中京工業地帯は、自動車などの輸送用機械をはじめ製造業が盛んです。'},
 {id:'aichi-r9-social-2',subject:'社会',topic:'公民・三権分立',text:'法律が憲法に違反していないかを判断する権限を持つのは？',choices:['内閣だけ','国会だけ','裁判所','都道府県知事'],answer:2,explanation:'裁判所には違憲審査権があります。司法が立法・行政をチェックする仕組みの一つです。'}
];

export function createAichiPractice({getAccount,saveEvent}) {
 const $=id=>document.getElementById(id);
 let records=[],queue=[],position=0,responses=[],mode='practice',running=false,deadline=0,timer=null,locked=false;
 const day=()=>new Date().toLocaleDateString('sv-SE');
 const stamp=e=>e.createdAt?.toMillis?.() ?? (e.createdAt?.seconds ? e.createdAt.seconds*1000 : Number.MAX_SAFE_INTEGER);
 function mistakes(){
  const latest=new Map();
  [...records].filter(e=>aichiQuestions.some(q=>q.id===e.questionId)).sort((a,b)=>stamp(a)-stamp(b)).forEach(e=>latest.set(e.questionId,e));
  return aichiQuestions.filter(q=>latest.get(q.id)?.correct===false);
 }
 function update(recordsNext){
  records=recordsNext;
  $('aichiMistakes').textContent=mistakes().length+'問';
  $('aichiReview').disabled=mistakes().length===0;
  $('aichiBreakdown').replaceChildren();
  ['数学','英語','国語','理科','社会'].forEach(subject=>{
   const attempts=records.filter(e=>e.subject===subject && aichiQuestions.some(q=>q.id===e.questionId));
   const row=document.createElement('span');row.textContent=subject+' '+(attempts.length?Math.round(attempts.filter(e=>e.correct).length/attempts.length*100)+'%':'未演習');$('aichiBreakdown').append(row);
  });
 }
 function reset(){clearInterval(timer);timer=null;running=false;locked=false;queue=[];responses=[];update([]);$('aichiQuiz').close();}
 function start(nextMode){
  if(!getAccount()?.ready){$('accountMessage').textContent='ログインしてから勉強を始めてください。';$('accountTitle').scrollIntoView({behavior:'smooth'});return;}
  mode=nextMode;queue=mode==='review'?mistakes():[...aichiQuestions];
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
  $('aichiQuestionMeta').textContent=`${position+1} / ${queue.length} · ${q.subject} · ${q.topic}`;
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
 update([]);return {update,reset};
}
