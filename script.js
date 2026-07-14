(function(){
  "use strict";
  var homeView=document.getElementById('home-view');
  var gameView=document.getElementById('game-view');
  var stage=document.getElementById('game-stage');
  var gameTitle=document.getElementById('game-title');
  var gameStat=document.getElementById('game-stat');
  var backBtn=document.getElementById('back-btn');

  var GAME_META={
    match:{title:'Pair Match'}, sequence:{title:'Sequence Recall'}, schulte:{title:'Focus Grid'},
    words:{title:'Word Recall'}, quiz:{title:'General Knowledge'},
    tango:{title:'Tango'}, queens:{title:'Queens'}, zip:{title:'Zip'}, sudoku:{title:'Mini Sudoku'}, pinpoint:{title:'Pinpoint'},
    reaction:{title:'Reaction Time'}, stroop:{title:'Color Clash'}, odd:{title:'Odd One Out'}, chimp:{title:'Chimp Test'},
    cogstyle:{title:'Cognitive Style'}, crt:{title:'Cognitive Reflection'}, nback:{title:'N-Back'},
    slide:{title:'Slide Puzzle'}, lights:{title:'Lights Out'}, flood:{title:'Color Flood'},
    target:{title:'Target Rush'}, mathsprint:{title:'Math Sprint'},
    flash:{title:'Flash Recall'}, palace:{title:'Memory Palace'}, spot:{title:'Spot the Difference'}, weave:{title:'Pattern Weave'}
  };
  var GAME_SECTION={
    match:'focus', sequence:'focus', schulte:'focus', words:'focus', quiz:'focus',
    tango:'logic', queens:'logic', zip:'logic', sudoku:'logic', pinpoint:'logic',
    reaction:'reflex', stroop:'reflex', odd:'reflex', chimp:'reflex',
    cogstyle:'mind', crt:'mind', nback:'mind',
    slide:'focus', lights:'logic', flood:'reflex',
    target:'reflex', mathsprint:'mind',
    flash:'focus', palace:'focus', spot:'reflex', weave:'reflex'
  };
  var lastSection='focus';

  /* ---- persistent storage (degrades to in-memory if blocked) ---- */
  var store=(function(){
    var mem={}, has=false;
    try{var x='__ap_test__'; localStorage.setItem(x,'1'); localStorage.removeItem(x); has=true;}catch(e){has=false;}
    return {
      get:function(k,def){try{if(has){var v=localStorage.getItem('aperture:'+k); return v==null?def:JSON.parse(v);} return (k in mem)?mem[k]:def;}catch(e){return def;}},
      set:function(k,v){try{if(has)localStorage.setItem('aperture:'+k,JSON.stringify(v)); else mem[k]=v;}catch(e){mem[k]=v;}},
      clear:function(){try{if(has){var ks=[]; for(var i=0;i<localStorage.length;i++){var kk=localStorage.key(i); if(kk&&kk.indexOf('aperture:')===0&&kk!=='aperture:theme')ks.push(kk);} ks.forEach(function(x){localStorage.removeItem(x);});}}catch(e){} for(var m in mem){if(m!=='theme')delete mem[m];}}
    };
  })();
  function bestKey(game,diff){return 'best:'+game+(diff?(':'+diff):'');}
  function getBest(game,diff){return store.get(bestKey(game,diff),null);}
  function saveBest(game,diff,value,mode){var cur=getBest(game,diff);
    if(cur==null||(mode==='min'?value<cur:value>cur)){store.set(bestKey(game,diff),value); return true;} return false;}
  function bumpSolved(game){var k='solved:'+game; var n=store.get(k,0)+1; store.set(k,n); touchStreak(); return n;}
  function dstr(d){return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();}
  function touchStreak(){
    var today=dstr(new Date()); var last=store.get('streak:last',null);
    if(last===today)return;
    var y=new Date(); y.setDate(y.getDate()-1); var yStr=dstr(y);
    var cur=store.get('streak:current',0);
    cur=(last===yStr)?cur+1:1;
    store.set('streak:current',cur); store.set('streak:last',today);
    var lng=store.get('streak:longest',0); if(cur>lng)store.set('streak:longest',cur);
  }
  function currentStreak(){
    var last=store.get('streak:last',null); if(!last)return 0;
    var today=dstr(new Date()); var y=new Date(); y.setDate(y.getDate()-1);
    if(last===today||last===dstr(y))return store.get('streak:current',0);
    return 0;
  }
  function getSolved(game){return store.get('solved:'+game,0);}

  /* ---- timers ---- */
  var activeTimers=[];
  function every(fn,ms){var id=setInterval(fn,ms); activeTimers.push(id); return id;}
  function after(fn,ms){var id=setTimeout(fn,ms); activeTimers.push(id); return id;}
  function clearAllTimers(){activeTimers.forEach(function(id){clearInterval(id);clearTimeout(id);}); activeTimers=[];}
  function fmtTime(s){var m=Math.floor(s/60),ss=Math.floor(s%60); return m+':'+(ss<10?'0':'')+ss;}
  function makeTimer(){var t0=performance.now(); gameStat.textContent='0:00';
    var id=every(function(){gameStat.textContent=fmtTime((performance.now()-t0)/1000);},250);
    return {stop:function(){clearInterval(id); return (performance.now()-t0)/1000;}};}

  var statsView=document.getElementById('stats-view');
  var statsBody=document.getElementById('stats-body');
  var siteHeader=document.querySelector('.site-header');
  var GAME_ACCENT={
    match:'#E0A43A', sequence:'#7C8CE0', schulte:'#4FB58E', words:'#E8734F', quiz:'#E0A43A',
    tango:'#E0A43A', queens:'#B072C0', zip:'#33A8C0', sudoku:'#4FB58E', pinpoint:'#E8734F',
    reaction:'#4FB58E', stroop:'#B072C0', odd:'#33A8C0', chimp:'#E0A43A',
    cogstyle:'#B072C0', crt:'#33A8C0', nback:'#E8734F',
    slide:'#7C8CE0', lights:'#E0A43A', flood:'#33A8C0',
    target:'#E8734F', mathsprint:'#B072C0',
    flash:'#E0A43A', palace:'#4FB58E', spot:'#E8734F', weave:'#B072C0'
  };
  function openGame(name){clearAllTimers(); if(!dailyPending){dailyActive=false; clearSeed();} dailyPending=false;
    homeView.hidden=true; statsView.hidden=true; gameView.hidden=false; siteHeader.hidden=true;
    lastSection=GAME_SECTION[name]||'focus';
    gameView.style.setProperty('--game-accent', GAME_ACCENT[name]||'#E0A43A'); gameView.setAttribute('data-game',name);
    gameTitle.textContent=GAME_META[name].title; gameStat.textContent=''; stage.innerHTML=''; window.scrollTo(0,0); STARTERS[name]();}
  var dailyPending=false;
  function scrollToSection(id){var sec=document.getElementById(id); if(sec){var y=sec.getBoundingClientRect().top+window.pageYOffset-76; window.scrollTo({top:Math.max(0,y),behavior:'auto'});} else window.scrollTo(0,0);}
  function closeGame(){clearAllTimers(); dailyActive=false; clearSeed(); gameView.hidden=true; statsView.hidden=true; homeView.hidden=false; siteHeader.hidden=false;
    if(typeof renderGreeting==='function'){renderGreeting(); updateFlame();}
    scrollToSection(lastSection);}
  document.querySelectorAll('.chamber-card').forEach(function(c){c.addEventListener('click',function(){openGame(c.dataset.game);});});
  backBtn.addEventListener('click',closeGame);
  document.getElementById('stats-link').addEventListener('click',openStats);
  document.getElementById('stats-back').addEventListener('click',closeGame);
  function openStats(){clearAllTimers(); homeView.hidden=true; gameView.hidden=true; statsView.hidden=false; siteHeader.hidden=true; window.scrollTo(0,0); renderStats();}

  /* ---- theme ---- */
  var SUN_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  var MOON_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  var themeToggles=[].slice.call(document.querySelectorAll('.js-theme'));
  function applyTheme(t){var light=(t==='light'); if(light)document.documentElement.setAttribute('data-theme','light'); else document.documentElement.removeAttribute('data-theme');
    themeToggles.forEach(function(b){b.innerHTML=light?MOON_ICON:SUN_ICON;});}
  var theme=store.get('theme','dark'); applyTheme(theme);
  themeToggles.forEach(function(b){b.addEventListener('click',function(){theme=(theme==='light')?'dark':'light'; store.set('theme',theme); applyTheme(theme);});});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&(!gameView.hidden||!statsView.hidden))closeGame();});

  function el(tag,cls,text){var e=document.createElement(tag); if(cls)e.className=cls; if(text!==undefined)e.textContent=text; return e;}
  var RNG=Math.random;
  function mulberry32(seed){return function(){seed|=0; seed=(seed+0x6D2B79F5)|0; var t=Math.imul(seed^(seed>>>15),1|seed); t=(t+Math.imul(t^(t>>>7),61|t))^t; return ((t^(t>>>14))>>>0)/4294967296;};}
  function setSeed(s){RNG=mulberry32(s);}
  function clearSeed(){RNG=Math.random;}
  function shuffle(a){a=a.slice(); for(var i=a.length-1;i>0;i--){var j=Math.floor(RNG()*(i+1)); var t=a[i]; a[i]=a[j]; a[j]=t;} return a;}

  /* ---- intro with difficulty picker ---- */
  function introDifficulty(opts){
    stage.innerHTML='';
    var wrap=el('div','stage-intro');
    wrap.appendChild(el('h2',null,opts.title));
    wrap.appendChild(el('p',null,opts.body));
    var defIdx=Math.floor((opts.diffs.length-1)/2);
    var sel=store.get('diff:'+opts.game,opts.diffs[defIdx].key);
    if(!opts.diffs.some(function(d){return d.key===sel;}))sel=opts.diffs[0].key;
    var picker=el('div','diff-picker');
    var bestLine=el('p','best-line','');
    function refreshBest(){var b=getBest(opts.game,sel); var solved=getSolved(opts.game);
      var txt=(b==null?'No record yet':(opts.statLabel+': '+opts.statFmt(b)));
      if(solved>0)txt+='  ·  solved '+solved;
      bestLine.textContent=txt;}
    opts.diffs.forEach(function(d){var chip=el('button','diff-chip'+(d.key===sel?' active':''),d.label);
      chip.addEventListener('click',function(){sel=d.key; store.set('diff:'+opts.game,sel);
        picker.querySelectorAll('.diff-chip').forEach(function(x){x.classList.remove('active');}); chip.classList.add('active'); refreshBest();});
      picker.appendChild(chip);});
    wrap.appendChild(picker); wrap.appendChild(bestLine);
    var btn=el('button','btn-primary',opts.button); btn.addEventListener('click',function(){opts.onStart(sel);});
    wrap.appendChild(btn); stage.appendChild(wrap); refreshBest();
  }
  /* ---- intro without difficulty, still shows best ---- */
  function introSimple(opts){
    stage.innerHTML='';
    var wrap=el('div','stage-intro');
    wrap.appendChild(el('h2',null,opts.title));
    wrap.appendChild(el('p',null,opts.body));
    if(opts.game){var b=getBest(opts.game,null); var solved=getSolved(opts.game);
      var txt=(b==null?'No record yet':(opts.statLabel+': '+opts.statFmt(b)));
      if(solved>0)txt+='  ·  played '+solved;
      wrap.appendChild(el('p','best-line',txt));}
    var btn=el('button','btn-primary',opts.button); btn.addEventListener('click',opts.onStart);
    wrap.appendChild(btn); stage.appendChild(wrap);
  }
  function resultScreen(label,value,sub,onReplay){
    stage.innerHTML='';
    var wrap=el('div','result-panel');
    wrap.appendChild(el('div','result-number',value));
    wrap.appendChild(el('div','result-label',label));
    if(sub){var p=el('p',null); p.innerHTML=sub; wrap.appendChild(p);}
    var row=el('div','btn-row'); row.style.marginTop='12px';
    var btn=el('button','btn-primary','Play again'); btn.addEventListener('click',onReplay);
    var back=el('button','btn-ghost','Back to chambers'); back.addEventListener('click',closeGame);
    row.appendChild(btn); row.appendChild(back); wrap.appendChild(row); stage.appendChild(wrap);
  }
  function withGenerating(fn){
    stage.innerHTML='';
    var w=el('div','result-panel'); w.appendChild(el('div','result-label','Generating a fresh puzzle…'));
    var dot=el('div','result-number','\u221E'); dot.style.animation='breathe 1.4s ease-in-out infinite'; w.appendChild(dot);
    stage.appendChild(w);
    after(function(){try{fn();}catch(e){stage.innerHTML=''; stage.appendChild(el('p','status-line','Something went wrong generating that puzzle. Try again.'));}},30);
  }
  function recordNote(isRecord,best,fmt){return isRecord?' <span class="record-tag">New personal best!</span>':(best!=null?(' Best: '+fmt(best)):'');}

  var DIFFS3=[{key:'easy',label:'Easy'},{key:'medium',label:'Medium'},{key:'hard',label:'Hard'}];

  /* ===== 1. PAIR MATCH ===== */
  var SYMBOLS=['\u2726','\u25C6','\u25B2','\u25CF','\u25A0','\u25C7','\u2727','\u2B21','\u263E','\u271A','\u25C8','\u2B23'];
  var MATCH_DIFF={easy:{cols:4,rows:3},medium:{cols:4,rows:4},hard:{cols:6,rows:4}};
  function startMatch(){introDifficulty({title:'Pair Match',body:'Flip two tiles at a time. Matching symbols stay revealed. Clear the board in as few moves as possible.',button:'Start',game:'match',diffs:DIFFS3,statLabel:'Best (fewest moves)',statFmt:function(v){return v+' moves';},onStart:function(d){runMatch(d);}});}
  function runMatch(diff){
    var p=MATCH_DIFF[diff], cols=p.cols, rows=p.rows, pairs=(cols*rows)/2, chosen=SYMBOLS.slice(0,pairs);
    var deck=shuffle(chosen.concat(chosen));
    stage.innerHTML='';
    var cell=cols>=6?60:72;
    var grid=el('div','match-grid'); grid.style.gridTemplateColumns='repeat('+cols+', '+cell+'px)';
    stage.appendChild(grid);
    var moves=0,solved=0,first=null,lock=false;
    gameStat.textContent='Moves: 0';
    deck.forEach(function(sym){
      var card=el('div','match-card'); card.style.width=cell+'px'; card.style.height=cell+'px'; card.dataset.symbol=sym;
      var inner=el('div','mc-inner');
      var back=el('div','mc-face mc-back'); back.textContent='?';
      var front=el('div','mc-face mc-front',sym);
      inner.appendChild(back); inner.appendChild(front); card.appendChild(inner);
      card.addEventListener('click',function(){
        if(lock||card.classList.contains('flipped')||card.classList.contains('solved'))return;
        card.classList.add('flipped');
        if(!first){first=card; return;}
        moves++; gameStat.textContent='Moves: '+moves;
        if(first.dataset.symbol===card.dataset.symbol&&first!==card){
          first.classList.add('solved'); card.classList.add('solved'); solved++; first=null;
          if(solved===pairs){var rec=saveBest('match',diff,moves,'min'); bumpSolved('match');
            after(function(){resultScreen('Moves',moves,'Fewest possible was '+pairs+'.'+recordNote(rec,rec?null:getBest('match',diff),function(v){return v+' moves';}),function(){runMatch(diff);});},500);}
        } else {lock=true; var a=first,b=card; a.classList.add('wrong'); b.classList.add('wrong');
          after(function(){a.classList.remove('flipped','wrong'); b.classList.remove('flipped','wrong'); first=null; lock=false;},700);}
      });
      grid.appendChild(card);
    });
  }

  /* ===== 2. SEQUENCE RECALL ===== */
  function startSequence(){introSimple({title:'Sequence Recall',body:'Watch the ring light up, then repeat the pattern in the same order. Each round adds one more step.',button:'Start',game:'sequence',statLabel:'Best (rounds)',statFmt:function(v){return v+' rounds';},onStart:runSequence});}
  function runSequence(){
    stage.innerHTML='';
    var board=el('div','ring-board');
    var quads=[0,1,2,3].map(function(i){var q=el('div','ring-quad q'+i); q.dataset.i=i; board.appendChild(q); return q;});
    var center=el('div','ring-center','1'); board.appendChild(center);
    stage.appendChild(board); stage.appendChild(el('p','status-line','Watch closely.'));
    var sequence=[],userStep=0,round=0,accepting=false;
    function flash(i,cb){quads[i].classList.add('active'); after(function(){quads[i].classList.remove('active'); after(cb,180);},380);}
    function playSequence(){accepting=false; userStep=0; center.textContent=round; var i=0;
      function step(){if(i>=sequence.length){accepting=true; return;} flash(sequence[i],function(){i++; step();});} after(step,500);}
    function nextRound(){round++; sequence.push(Math.floor(Math.random()*4)); gameStat.textContent='Round: '+round; playSequence();}
    quads.forEach(function(q){q.addEventListener('click',function(){
      if(!accepting)return; var i=Number(q.dataset.i);
      q.classList.add('active'); after(function(){q.classList.remove('active');},200);
      if(sequence[userStep]===i){userStep++; if(userStep===sequence.length){accepting=false; after(nextRound,700);}}
      else{accepting=false; var reached=round-1; var rec=saveBest('sequence',null,reached,'max'); bumpSolved('sequence');
        after(function(){resultScreen('Rounds cleared',reached,recordNote(rec,rec?null:getBest('sequence',null),function(v){return v+' rounds';}),runSequence);},500);}
    });});
    nextRound();
  }

  /* ===== 3. FOCUS GRID ===== */
  var SCHULTE_DIFF={easy:4,medium:5,hard:6};
  function startSchulte(){introDifficulty({title:'Focus Grid',body:'A classic attention drill. Click the numbers in order, as fast as you can, while keeping your eyes near the center.',button:'Start',game:'schulte',diffs:DIFFS3,statLabel:'Best time',statFmt:function(v){return v+'s';},onStart:function(d){runSchulte(d);}});}
  function runSchulte(diff){
    var size=SCHULTE_DIFF[diff], total=size*size;
    stage.innerHTML='';
    var nums=shuffle(Array.from({length:total},function(_,i){return i+1;}));
    var grid=el('div','schulte'); grid.style.gridTemplateColumns='repeat('+size+',1fr)'; grid.style.width='min('+(size*68)+'px,92vw)';
    if(size>=6)grid.style.fontSize='.95rem';
    stage.appendChild(grid);
    var next=1,mistakes=0,startTime=performance.now();
    gameStat.textContent='0.0s';
    var tick=every(function(){gameStat.textContent=((performance.now()-startTime)/1000).toFixed(1)+'s';},100);
    nums.forEach(function(n){
      var cell=el('div','schulte-cell',String(n));
      cell.addEventListener('click',function(){
        if(cell.classList.contains('done'))return;
        if(n===next){cell.classList.add('done'); next++;
          if(next===total+1){clearInterval(tick); var t=((performance.now()-startTime)/1000); var total2=t.toFixed(1);
            var rec=saveBest('schulte',diff,Number(total2),'min'); bumpSolved('schulte');
            after(function(){resultScreen('Seconds',total2,'Mistakes: '+mistakes+'.'+recordNote(rec,rec?null:getBest('schulte',diff),function(v){return v+'s';}),function(){runSchulte(diff);});},300);}
        } else {mistakes++; cell.classList.add('err'); after(function(){cell.classList.remove('err');},250);}
      });
      grid.appendChild(cell);
    });
  }

  /* ===== 4. WORD RECALL ===== */
  var WORD_BANK=['River','Compass','Lantern','Cedar','Harbor','Velvet','Ember','Quartz','Meadow','Anchor','Ribbon','Falcon','Granite','Willow','Copper','Thistle','Marble','Horizon','Cinder','Orchard','Tundra','Satchel','Prairie','Beacon'];
  var WORDS_DIFF={easy:{n:6,study:9,dist:6},medium:{n:8,study:8,dist:8},hard:{n:10,study:7,dist:8}};
  function startWords(){introDifficulty({title:'Word Recall',body:'Study a short list of words, wait through a deliberate pause, then pick out exactly those words from a larger set.',button:'Start',game:'words',diffs:DIFFS3,statLabel:'Best recall',statFmt:function(v){return v+' correct';},onStart:function(d){runWords(d);}});}
  function runWords(diff){
    var cfg=WORDS_DIFF[diff]; var pool=shuffle(WORD_BANK), studySet=pool.slice(0,cfg.n), distractors=pool.slice(cfg.n,cfg.n+cfg.dist), fullSet=shuffle(studySet.concat(distractors));
    stage.innerHTML='';
    stage.appendChild(el('p',null,'Study these '+cfg.n+' words:'));
    var studyWrap=el('div','word-set'); studySet.forEach(function(w){studyWrap.appendChild(el('span','word-chip',w));}); stage.appendChild(studyWrap);
    gameStat.textContent='';
    var remaining=cfg.study; var counter=el('p','status-line','Memorizing — '+remaining+'s'); stage.appendChild(counter);
    every(function(){remaining--; if(remaining<0){clearAllTimers(); distraction(); return;} counter.textContent='Memorizing — '+remaining+'s';},1000);
    function distraction(){
      stage.innerHTML=''; stage.appendChild(el('h2',null,'One moment…'));
      stage.appendChild(el('p',null,'A short pause before recall — this is deliberate; it makes the test meaningful.'));
      var d=3; var dc=el('p',null,String(d)); dc.style.fontFamily='var(--mono)'; dc.style.fontSize='2rem'; dc.style.color='var(--gold)'; stage.appendChild(dc);
      every(function(){d--; if(d<=0){clearAllTimers(); recall();} else dc.textContent=String(d);},1000);
    }
    function recall(){
      stage.innerHTML=''; stage.appendChild(el('h2',null,'Which words did you see?'));
      stage.appendChild(el('p',null,'Select the '+cfg.n+' you studied, then submit.'));
      var picks=new Set(); var wrap=el('div','word-set');
      fullSet.forEach(function(w){var chip=el('span','word-chip',w);
        chip.addEventListener('click',function(){if(picks.has(w)){picks['delete'](w); chip.classList.remove('picked');} else {picks.add(w); chip.classList.add('picked');}});
        wrap.appendChild(chip);});
      stage.appendChild(wrap);
      var submit=el('button','btn-primary','Submit'); submit.style.marginTop='10px';
      submit.addEventListener('click',function(){
        var correct=0;
        wrap.querySelectorAll('.word-chip').forEach(function(chip){var w=chip.textContent; var st=studySet.indexOf(w)>=0; var pk=picks.has(w);
          chip.classList.remove('picked');
          if(st&&pk){chip.classList.add('correct'); correct++;} else if(!st&&pk){chip.classList.add('incorrect');} else if(st&&!pk){chip.classList.add('missed');}});
        submit.remove();
        var rec=saveBest('words',diff,correct,'max'); bumpSolved('words');
        after(function(){
          stage.appendChild(el('div','result-number',correct+' / '+cfg.n));
          stage.appendChild(el('div','result-label','Correctly recalled'));
          var note=el('p','best-line',''); note.innerHTML=recordNote(rec,rec?null:getBest('words',diff),function(v){return v+' correct';}); stage.appendChild(note);
          var row=el('div','btn-row'); row.style.marginTop='10px';
          var rep=el('button','btn-primary','Play again'); rep.addEventListener('click',function(){runWords(diff);});
          var back=el('button','btn-ghost','Back to chambers'); back.addEventListener('click',closeGame);
          row.appendChild(rep); row.appendChild(back); stage.appendChild(row);
        },700);
      });
      stage.appendChild(submit);
    }
  }
  /* ===== 5. GENERAL KNOWLEDGE ===== */
  var QUESTION_BANK=[
    {q:"Which planet is known as the Red Planet?",o:["Venus","Mars","Jupiter","Saturn"],a:1},
    {q:"Who wrote the play 'Romeo and Juliet'?",o:["Charles Dickens","Mark Twain","William Shakespeare","Leo Tolstoy"],a:2},
    {q:"What is the largest ocean on Earth?",o:["Atlantic","Indian","Arctic","Pacific"],a:3},
    {q:"What is the chemical symbol for gold?",o:["Ag","Au","Gd","Go"],a:1},
    {q:"Which country is home to the Great Barrier Reef?",o:["Brazil","Australia","Thailand","Mexico"],a:1},
    {q:"How many continents are there on Earth?",o:["5","6","7","8"],a:2},
    {q:"Who painted the Mona Lisa?",o:["Vincent van Gogh","Pablo Picasso","Leonardo da Vinci","Claude Monet"],a:2},
    {q:"What is the smallest prime number?",o:["0","1","2","3"],a:2},
    {q:"Which gas do plants primarily absorb from the atmosphere?",o:["Oxygen","Nitrogen","Carbon dioxide","Hydrogen"],a:2},
    {q:"The Eiffel Tower is located in which city?",o:["Rome","Paris","Madrid","Berlin"],a:1},
    {q:"Which organ in the human body pumps blood?",o:["Lungs","Liver","Heart","Kidney"],a:2},
    {q:"What is the capital city of Japan?",o:["Seoul","Beijing","Bangkok","Tokyo"],a:3},
    {q:"What is the freezing point of water in Celsius?",o:["0C","10C","-10C","100C"],a:0},
    {q:"Which currency is used in the United Kingdom?",o:["Euro","Dollar","Pound Sterling","Franc"],a:2},
    {q:"Who developed the theory of general relativity?",o:["Isaac Newton","Albert Einstein","Niels Bohr","Galileo Galilei"],a:1},
    {q:"What is the largest mammal in the world?",o:["African Elephant","Blue Whale","Giraffe","Polar Bear"],a:1},
    {q:"Which language has the most native speakers worldwide?",o:["English","Hindi","Mandarin Chinese","Spanish"],a:2},
    {q:"In which year did the Berlin Wall fall?",o:["1985","1987","1989","1991"],a:2},
    {q:"What is the tallest mountain in the world?",o:["K2","Kangchenjunga","Mount Everest","Denali"],a:2},
    {q:"Which planet has the most prominent ring system?",o:["Uranus","Neptune","Jupiter","Saturn"],a:3},
    {q:"What is the main ingredient in traditional guacamole?",o:["Tomato","Avocado","Onion","Lime"],a:1},
    {q:"Which country gifted the Statue of Liberty to the USA?",o:["United Kingdom","Spain","France","Italy"],a:2},
    {q:"Which instrument has keys, pedals, and strings?",o:["Violin","Piano","Flute","Trumpet"],a:1},
    {q:"What is the hardest natural substance on Earth?",o:["Gold","Iron","Diamond","Quartz"],a:2},
    {q:"Which sea creature has three hearts?",o:["Shark","Octopus","Dolphin","Jellyfish"],a:1},
    {q:"The Great Wall is located in which country?",o:["Japan","Vietnam","China","Mongolia"],a:2}
  ];
  function startQuiz(){introSimple({title:'General Knowledge',body:'Ten questions, ten flavors of trivia. Each one gives you 15 seconds — a little time pressure keeps attention sharp. Fresh questions are pulled live when you are online.',button:'Start',game:'quiz',statLabel:'Best score',statFmt:function(v){return v+' / 10';},onStart:quizLoader});}
  function decodeHTML(s){var t=document.createElement('textarea'); t.innerHTML=s; return t.value;}
  var triviaToken=null;
  function apiGet(url){return fetch(url).then(function(r){return r.json();});}
  function requestToken(){return apiGet('https://opentdb.com/api_token.php?command=request').then(function(d){triviaToken=d.token; return triviaToken;});}
  function fetchQuestions(amount){
    var tokenP=triviaToken?Promise.resolve(triviaToken):requestToken();
    return tokenP.then(function(tok){return apiGet('https://opentdb.com/api.php?amount='+amount+'&type=multiple&token='+tok);})
      .then(function(d){
        if(d.response_code===3||d.response_code===4){ // token missing or exhausted -> refresh & retry once
          return requestToken().then(function(tok){return apiGet('https://opentdb.com/api.php?amount='+amount+'&type=multiple&token='+tok);});
        }
        return d;
      })
      .then(function(d){
        if(!d||d.response_code!==0||!d.results||!d.results.length)throw new Error('no results');
        return d.results.map(function(r){
          var correct=decodeHTML(r.correct_answer);
          var options=shuffle([correct].concat(r.incorrect_answers.map(decodeHTML)));
          return {q:decodeHTML(r.question), options:options, a:options.indexOf(correct)};
        });
      });
  }
  function withTimeout(p,ms){return new Promise(function(res,rej){var t=setTimeout(function(){rej(new Error('timeout'));},ms); p.then(function(v){clearTimeout(t);res(v);},function(e){clearTimeout(t);rej(e);});});}
  function localQuestions(){return shuffle(QUESTION_BANK).slice(0,10).map(function(it){var options=shuffle(it.o.slice()); return {q:it.q, options:options, a:options.indexOf(it.o[it.a])};});}
  function quizLoader(){
    clearAllTimers(); stage.innerHTML='';
    var w=el('div','result-panel'); w.appendChild(el('div','result-label','Fetching fresh questions…'));
    var dot=el('div','result-number','?'); dot.style.animation='breathe 1.4s ease-in-out infinite'; w.appendChild(dot); stage.appendChild(w);
    var p; try{ p=(typeof fetch==='undefined')?Promise.reject(new Error('no fetch')):withTimeout(fetchQuestions(10),6500); }catch(e){ p=Promise.reject(e); }
    Promise.resolve(p).then(function(qs){runQuiz(qs,true);},function(){runQuiz(localQuestions(),false);});
  }
  function runQuiz(questions,live){
    var idx=0,score=0;
    function showQuestion(){
      clearAllTimers();
      if(idx>=questions.length){var rec=saveBest('quiz',null,score,'max'); bumpSolved('quiz');
        after(function(){resultScreen('Score',score+' / 10',(score>=8?'Sharp focus — well recalled.':score>=5?'Solid. Another round will sharpen it further.':'Worth another pass — knowledge compounds with repetition.')+recordNote(rec,rec?null:getBest('quiz',null),function(v){return v+'/10';}),quizLoader);},200); return;}
      var item=questions[idx];
      stage.innerHTML=''; var card=el('div','quiz-card');
      card.appendChild(el('div','quiz-progress','Question '+(idx+1)+' of 10 · Score '+score));
      card.appendChild(el('div','quiz-q',item.q));
      var optWrap=el('div','quiz-opts'); var answered=false,timeLeft=15; gameStat.textContent=timeLeft+'s';
      var tId=every(function(){timeLeft--; gameStat.textContent=Math.max(timeLeft,0)+'s'; if(timeLeft<=0&&!answered)lockAnswer(-1);},1000);
      function lockAnswer(chosen){answered=true; clearInterval(tId);
        optWrap.querySelectorAll('.quiz-opt').forEach(function(btn){var oi=Number(btn.dataset.oi);
          if(oi===item.a)btn.classList.add('correct'); else if(oi===chosen)btn.classList.add('incorrect');});
        if(chosen===item.a)score++; after(function(){idx++; showQuestion();},900);}
      item.options.forEach(function(text,i){var btn=el('button','quiz-opt',text); btn.dataset.oi=i; btn.addEventListener('click',function(){if(!answered)lockAnswer(i);}); optWrap.appendChild(btn);});
      card.appendChild(optWrap);
      card.appendChild(el('div','quiz-source',live?'Live questions · Open Trivia DB':'Offline set'));
      stage.appendChild(card);
    }
    showQuestion();
  }

  /* ===== GENERATORS ===== */
  function tangoFull(){
    var g=Array.from({length:6},function(){return Array(6).fill(-1);});
    function ok(r,c,v){
      if(c>=2&&g[r][c-1]===v&&g[r][c-2]===v)return false;
      if(r>=2&&g[r-1][c]===v&&g[r-2][c]===v)return false;
      var rC=0,cC=0; for(var i=0;i<6;i++){if(g[r][i]===v)rC++; if(g[i][c]===v)cC++;}
      return rC<3&&cC<3;
    }
    function solve(p){if(p===36)return true; var r=(p/6)|0,c=p%6;
      var vs=shuffle([0,1]); for(var k=0;k<2;k++){var v=vs[k]; if(ok(r,c,v)){g[r][c]=v; if(solve(p+1))return true; g[r][c]=-1;}} return false;}
    solve(0); return g;
  }
  function tangoCount(given,edges,cap){
    var g=given.map(function(r){return r.slice();}); var count=0;
    function valid(r,c){var v=g[r][c]; if(v<0)return true;
      for(var s=Math.max(0,c-2);s<=Math.min(3,c);s++) if(g[r][s]>=0&&g[r][s+1]>=0&&g[r][s+2]>=0&&g[r][s]===g[r][s+1]&&g[r][s+1]===g[r][s+2])return false;
      for(var s2=Math.max(0,r-2);s2<=Math.min(3,r);s2++) if(g[s2][c]>=0&&g[s2+1][c]>=0&&g[s2+2][c]>=0&&g[s2][c]===g[s2+1][c]&&g[s2+1][c]===g[s2+2][c])return false;
      var r0=0,r1=0,c0=0,c1=0; for(var i=0;i<6;i++){if(g[r][i]===0)r0++;else if(g[r][i]===1)r1++; if(g[i][c]===0)c0++;else if(g[i][c]===1)c1++;}
      if(r0>3||r1>3||c0>3||c1>3)return false;
      for(var e=0;e<edges.length;e++){var ed=edges[e]; var va=g[ed.a[0]][ed.a[1]],vb=g[ed.b[0]][ed.b[1]];
        if(va>=0&&vb>=0){if(ed.t==='='&&va!==vb)return false; if(ed.t==='x'&&va===vb)return false;}}
      return true;}
    function solve(p){if(count>=cap)return; if(p===36){count++;return;} var r=(p/6)|0,c=p%6;
      if(g[r][c]>=0){if(valid(r,c))solve(p+1); return;}
      for(var v=0;v<2;v++){g[r][c]=v; if(valid(r,c))solve(p+1); g[r][c]=-1; if(count>=cap)return;}}
    solve(0); return count;
  }
  function makeTango(extra){
    extra=extra||0;
    var sol=tangoFull(); var edgeCands=[];
    for(var r=0;r<6;r++)for(var c=0;c<6;c++){
      if(c<5)edgeCands.push({a:[r,c],b:[r,c+1],t:sol[r][c]===sol[r][c+1]?'=':'x'});
      if(r<5)edgeCands.push({a:[r,c],b:[r+1,c],t:sol[r][c]===sol[r+1][c]?'=':'x'});}
    var cc=[]; for(var r2=0;r2<6;r2++)for(var c2=0;c2<6;c2++)cc.push([r2,c2]); var cellCands=shuffle(cc);
    var given=Array.from({length:6},function(){return Array(6).fill(-1);}); var gi=0;
    for(;gi<4;gi++){var rc=cellCands[gi]; given[rc[0]][rc[1]]=sol[rc[0]][rc[1]];}
    var edgesShuf=shuffle(edgeCands); var ei=0; var edges=[]; var guard=0; var maxEdges=8;
    while(tangoCount(given,edges,2)!==1&&guard<300){guard++;
      if(edges.length>=maxEdges||(guard%2===0&&gi<cellCands.length)){
        if(gi<cellCands.length){var rc3=cellCands[gi++]; given[rc3[0]][rc3[1]]=sol[rc3[0]][rc3[1]];}
        else if(ei<edgesShuf.length){edges.push(edgesShuf[ei++]);}
      } else if(ei<edgesShuf.length){edges.push(edgesShuf[ei++]);}
      else if(gi<cellCands.length){var rc4=cellCands[gi++]; given[rc4[0]][rc4[1]]=sol[rc4[0]][rc4[1]];} else break;}
    // reveal extra givens for easier difficulty
    if(extra>0){var empties=[]; for(var er=0;er<6;er++)for(var ec=0;ec<6;ec++)if(given[er][ec]<0)empties.push([er,ec]); empties=shuffle(empties);
      for(var k=0;k<extra&&k<empties.length;k++){var p=empties[k]; given[p[0]][p[1]]=sol[p[0]][p[1]];}}
    return {given:given,edges:edges,solution:sol};
  }

  function queensPlacement(n){
    for(var a=0;a<5000;a++){var cols=Array(n).fill(-1),used=Array(n).fill(false);
      var ok=(function place(r){if(r===n)return true;
        var order=shuffle(Array.from({length:n},function(_,i){return i;}));
        for(var k=0;k<n;k++){var c=order[k]; if(used[c]||(r>0&&Math.abs(cols[r-1]-c)<2))continue;
          cols[r]=c; used[c]=true; if(place(r+1))return true; used[c]=false; cols[r]=-1;} return false;})(0);
      if(ok)return cols;} return null;
  }
  function growBalanced(n,q){
    var region=Array.from({length:n},function(){return Array(n).fill(-1);});
    for(var r=0;r<n;r++)region[r][q[r]]=r;
    var un=n*n-n; var dirs=[[1,0],[-1,0],[0,1],[0,-1]]; var guard=0;
    while(un>0&&guard<200000){guard++; var prog=false;
      var rids=shuffle(Array.from({length:n},function(_,i){return i;}));
      for(var x=0;x<n;x++){var rid=rids[x]; var fr=[];
        for(var r2=0;r2<n;r2++)for(var c2=0;c2<n;c2++) if(region[r2][c2]===rid)
          for(var di=0;di<4;di++){var nr=r2+dirs[di][0],nc=c2+dirs[di][1]; if(nr>=0&&nr<n&&nc>=0&&nc<n&&region[nr][nc]===-1)fr.push([nr,nc]);}
        if(!fr.length)continue; var pick=fr[Math.floor(RNG()*fr.length)];
        if(region[pick[0]][pick[1]]===-1){region[pick[0]][pick[1]]=rid; un--; prog=true;}}
      if(!prog)break;}
    return un>0?null:region;
  }
  function solveQueens(n,region,cap){
    var sols=[]; var cols=Array(n).fill(-1),uc=Array(n).fill(false),ur=Array(n).fill(false);
    (function place(r){if(sols.length>=cap)return; if(r===n){sols.push(cols.slice());return;}
      for(var c=0;c<n;c++){if(uc[c])continue; var rg=region[r][c]; if(ur[rg])continue;
        if(r>0&&Math.abs(cols[r-1]-c)<=1)continue;
        cols[r]=c;uc[c]=true;ur[rg]=true; place(r+1); uc[c]=false;ur[rg]=false;cols[r]=-1; if(sols.length>=cap)return;}})(0);
    return sols;
  }
  function regionConnectedWithout(n,region,rid,ex){
    var dirs=[[1,0],[-1,0],[0,1],[0,-1]]; var cells=[];
    for(var r=0;r<n;r++)for(var c=0;c<n;c++) if(region[r][c]===rid&&!(r===ex[0]&&c===ex[1]))cells.push([r,c]);
    if(!cells.length)return false;
    var seen={}; var st=[cells[0]]; seen[cells[0][0]*n+cells[0][1]]=1; var cnt=1;
    while(st.length){var cur=st.pop();
      for(var di=0;di<4;di++){var nr=cur[0]+dirs[di][0],nc=cur[1]+dirs[di][1],k=nr*n+nc;
        if(nr>=0&&nr<n&&nc>=0&&nc<n&&region[nr][nc]===rid&&!(nr===ex[0]&&nc===ex[1])&&!seen[k]){seen[k]=1; cnt++; st.push([nr,nc]);}}}
    return cnt===cells.length;
  }
  function carveToUnique(n,region,seed){
    var dirs=[[1,0],[-1,0],[0,1],[0,-1]];
    for(var it=0;it<400;it++){
      var sols=solveQueens(n,region,2); if(sols.length===1)return true;
      var alt=null; for(var s=0;s<sols.length;s++){var diff=false; for(var r=0;r<n;r++)if(sols[s][r]!==seed[r])diff=true; if(diff){alt=sols[s]; break;}}
      if(!alt)return sols.length===1;
      var diffRows=shuffle(Array.from({length:n},function(_,i){return i;}).filter(function(r){return alt[r]!==seed[r];}));
      var done=false;
      for(var x=0;x<diffRows.length&&!done;x++){var rr=diffRows[x]; var c=alt[rr]; if(seed[rr]===c)continue; var rX=region[rr][c];
        var neigh=shuffle(dirs.map(function(d){return [rr+d[0],c+d[1]];}).filter(function(p){return p[0]>=0&&p[0]<n&&p[1]>=0&&p[1]<n&&region[p[0]][p[1]]!==rX;}));
        for(var y=0;y<neigh.length;y++){var rN=region[neigh[y][0]][neigh[y][1]]; if(regionConnectedWithout(n,region,rX,[rr,c])){region[rr][c]=rN; done=true; break;}}}
      if(!done)return false;}
    return solveQueens(n,region,2).length===1;
  }
  function makeQueens(n){
    for(var outer=0;outer<6;outer++){
      for(var a=0;a<40;a++){var cols=queensPlacement(n); if(!cols)continue; var region=growBalanced(n,cols); if(!region)continue;
        if(carveToUnique(n,region,cols))return {n:n,region:region,solution:cols};}
    }
    return null;
  }

  function hamiltonianPath(rows,cols){
    var total=rows*cols; var dirs=[[1,0],[-1,0],[0,1],[0,-1]];
    var vis=Array.from({length:rows},function(){return Array(cols).fill(false);}); var path=[];
    var sr=Math.floor(RNG()*rows),sc=Math.floor(RNG()*cols); var steps=0; var cap=300000;
    function free(r,c){var k=0; for(var di=0;di<4;di++){var nr=r+dirs[di][0],nc=c+dirs[di][1]; if(nr>=0&&nr<rows&&nc>=0&&nc<cols&&!vis[nr][nc])k++;} return k;}
    function dfs(r,c){if(steps++>cap)return false; vis[r][c]=true; path.push([r,c]); if(path.length===total)return true;
      var opts=[]; for(var di=0;di<4;di++){var nr=r+dirs[di][0],nc=c+dirs[di][1]; if(nr>=0&&nr<rows&&nc>=0&&nc<cols&&!vis[nr][nc])opts.push([nr,nc]);}
      opts.sort(function(a,b){return free(a[0],a[1])-free(b[0],b[1]);});
      for(var i=0;i<opts.length;i++){if(dfs(opts[i][0],opts[i][1]))return true;}
      vis[r][c]=false; path.pop(); return false;}
    return dfs(sr,sc)?path:null;
  }
  function makeZip(rows,cols,checkpoints){
    var path=null; for(var i=0;i<20&&!path;i++)path=hamiltonianPath(rows,cols);
    if(!path){path=[]; for(var r=0;r<rows;r++){if(r%2===0){for(var c=0;c<cols;c++)path.push([r,c]);}else{for(var c2=cols-1;c2>=0;c2--)path.push([r,c2]);}}}
    var total=rows*cols; var nums=Array.from({length:rows},function(){return Array(cols).fill(0);});
    var idxs=[0]; for(var k=1;k<checkpoints-1;k++)idxs.push(Math.round(k*(total-1)/(checkpoints-1))); idxs.push(total-1);
    var uniq=Array.from(new Set(idxs)).sort(function(a,b){return a-b;});
    uniq.forEach(function(pi,order){var p=path[pi]; nums[p[0]][p[1]]=order+1;});
    return {rows:rows,cols:cols,nums:nums,path:path,count:uniq.length};
  }

  function sudokuFull(){
    var g=Array.from({length:6},function(){return Array(6).fill(0);});
    function ok(r,c,v){for(var i=0;i<6;i++){if(g[r][i]===v||g[i][c]===v)return false;}
      var br=((r/2)|0)*2,bc=((c/3)|0)*3; for(var a=0;a<2;a++)for(var b=0;b<3;b++)if(g[br+a][bc+b]===v)return false; return true;}
    function solve(p){if(p===36)return true; var r=(p/6)|0,c=p%6;
      var vs=shuffle([1,2,3,4,5,6]); for(var k=0;k<6;k++){var v=vs[k]; if(ok(r,c,v)){g[r][c]=v; if(solve(p+1))return true; g[r][c]=0;}} return false;}
    solve(0); return g;
  }
  function sudokuCount(g,cap){var count=0;
    function ok(r,c,v){for(var i=0;i<6;i++){if((i!==c&&g[r][i]===v)||(i!==r&&g[i][c]===v))return false;}
      var br=((r/2)|0)*2,bc=((c/3)|0)*3; for(var a=0;a<2;a++)for(var b=0;b<3;b++){var rr=br+a,cc=bc+b; if((rr!==r||cc!==c)&&g[rr][cc]===v)return false;} return true;}
    function solve(){var br=-1,bc=-1; for(var r=0;r<6&&br<0;r++)for(var c=0;c<6;c++)if(g[r][c]===0){br=r;bc=c;break;}
      if(br<0){count++; return;} for(var v=1;v<=6;v++){if(ok(br,bc,v)){g[br][bc]=v; solve(); g[br][bc]=0; if(count>=cap)return;}}}
    solve(); return count;
  }
  function makeSudoku(cluesTarget){
    var full=sudokuFull(); var puzzle=full.map(function(r){return r.slice();}); var cells=shuffle(Array.from({length:36},function(_,i){return i;})); var filled=36;
    for(var x=0;x<cells.length;x++){if(filled<=cluesTarget)break; var idx=cells[x]; var r=(idx/6)|0,c=idx%6,saved=puzzle[r][c]; puzzle[r][c]=0;
      if(sudokuCount(puzzle.map(function(y){return y.slice();}),2)!==1)puzzle[r][c]=saved; else filled--;}
    return {puzzle:puzzle,solution:full,clues:filled};
  }
  /* ===== 6. TANGO ===== */
  var SUN='\u2600', MOON='\u263E';
  var TANGO_DIFF={easy:6,medium:2,hard:0};
  function startTango(){introDifficulty({title:'Tango',body:'Fill every cell with a sun or a moon. Each row and column needs three of each, and never three of the same in a row. Badges mean equal (=) or opposite (x). Locked cells are given.',button:'Generate puzzle',game:'tango',diffs:DIFFS3,statLabel:'Best time',statFmt:function(v){return fmtTime(v);},onStart:function(d){withGenerating(function(){runTango(d);});}});}
  function runTango(diff){
    var made=makeTango(TANGO_DIFF[diff]); var given=made.given, edges=made.edges;
    var state=given.map(function(r){return r.slice();});
    stage.innerHTML='';
    stage.appendChild(el('p','rules','Tap a cell to cycle empty, sun, moon. Fill the grid so every rule holds.'));
    var size=Math.min(360,Math.floor(window.innerWidth*0.9)); var cell=Math.floor((size-42)/6);
    var grid=el('div','tango-grid'); grid.style.gridTemplateColumns='repeat(6, '+cell+'px)';
    var cellEls=[];
    for(var r=0;r<6;r++){cellEls[r]=[];
      for(var c=0;c<6;c++){
        var d=el('div','tango-cell'); d.style.width=cell+'px'; d.style.height=cell+'px';
        if(given[r][c]>=0)d.classList.add('given');
        render(d,state[r][c]);
        (function(r,c,d){d.addEventListener('click',function(){if(given[r][c]>=0)return; state[r][c]=state[r][c]===-1?0:state[r][c]===0?1:-1; render(d,state[r][c]); check(false);});})(r,c,d);
        grid.appendChild(d); cellEls[r][c]=d;
      }}
    stage.appendChild(grid);
    requestAnimationFrame(function(){edges.forEach(function(e){
      var A=cellEls[e.a[0]][e.a[1]], B=cellEls[e.b[0]][e.b[1]];
      var x=(A.offsetLeft+B.offsetLeft)/2+cell/2, y=(A.offsetTop+B.offsetTop)/2+cell/2;
      var badge=el('div','tango-edge',e.t==='='?'=':'\u00D7'); badge.style.left=x+'px'; badge.style.top=y+'px'; grid.appendChild(badge);
    });});
    var status=el('p','status-line',''); stage.appendChild(status);
    var row=el('div','btn-row');
    var checkBtn=el('button','btn-ghost','Check'); checkBtn.addEventListener('click',function(){check(true);});
    var newBtn=el('button','btn-ghost','New puzzle'); newBtn.addEventListener('click',function(){withGenerating(function(){runTango(diff);});});
    row.appendChild(checkBtn); row.appendChild(newBtn); stage.appendChild(row);
    var timer=makeTimer();
    function render(d,v){d.textContent=v===0?SUN:v===1?MOON:''; d.classList.toggle('tango-sun',v===0); d.classList.toggle('tango-moon',v===1);}
    function check(showErrors){
      cellEls.forEach(function(rw){rw.forEach(function(d){d.classList.remove('err');});});
      var full=true; var bad={};
      for(var r=0;r<6;r++)for(var c=0;c<6;c++)if(state[r][c]<0)full=false;
      for(var r2=0;r2<6;r2++){var s=0,m=0; for(var c2=0;c2<6;c2++){if(state[r2][c2]===0)s++; else if(state[r2][c2]===1)m++;
        if(c2>=2&&state[r2][c2]>=0&&state[r2][c2]===state[r2][c2-1]&&state[r2][c2]===state[r2][c2-2]){bad[r2+'-'+c2]=1;bad[r2+'-'+(c2-1)]=1;bad[r2+'-'+(c2-2)]=1;}}
        if(s>3||m>3){for(var c3=0;c3<6;c3++)bad[r2+'-'+c3]=1;}}
      for(var c4=0;c4<6;c4++){var s2=0,m2=0; for(var r3=0;r3<6;r3++){if(state[r3][c4]===0)s2++; else if(state[r3][c4]===1)m2++;
        if(r3>=2&&state[r3][c4]>=0&&state[r3][c4]===state[r3-1][c4]&&state[r3][c4]===state[r3-2][c4]){bad[r3+'-'+c4]=1;bad[(r3-1)+'-'+c4]=1;bad[(r3-2)+'-'+c4]=1;}}
        if(s2>3||m2>3){for(var r4=0;r4<6;r4++)bad[r4+'-'+c4]=1;}}
      edges.forEach(function(e){var va=state[e.a[0]][e.a[1]],vb=state[e.b[0]][e.b[1]];
        if(va>=0&&vb>=0){if((e.t==='='&&va!==vb)||(e.t==='x'&&va===vb)){bad[e.a[0]+'-'+e.a[1]]=1; bad[e.b[0]+'-'+e.b[1]]=1;}}});
      var badCount=Object.keys(bad).length;
      if(full&&badCount===0){var secs=timer.stop(); var rec=saveBest('tango',diff,secs,'min'); bumpSolved('tango');
        status.style.color='var(--sage)'; status.textContent='Solved. Every rule holds.';
        after(function(){resultScreen('Solved in',fmtTime(secs),'A clean, unique solution.'+recordNote(rec,rec?null:getBest('tango',diff),function(v){return fmtTime(v);}),function(){withGenerating(function(){runTango(diff);});});},700); return true;}
      if(showErrors){if(badCount){for(var kk in bad){var pp=kk.split('-'); cellEls[pp[0]][pp[1]].classList.add('err');} status.style.color='var(--rust)'; status.textContent='Some rules are broken — highlighted in red.';}
        else{status.style.color='var(--muted)'; status.textContent='No conflicts yet — keep filling.';}}
      return false;
    }
  }

  /* ===== 7. QUEENS ===== */
  var REGION_COLORS=['#C9A227','#6E7FD0','#7FA37A','#C15B45','#B57BA6','#4F9DAE','#C7833F','#8A8FA3'];
  var QUEENS_DIFF={easy:6,medium:7,hard:8};
  function startQueens(){introDifficulty({title:'Queens',body:'Place exactly one crown in every row, every column, and every color region. No two crowns may touch — not even diagonally. Tap once for a marker, again for a crown.',button:'Generate puzzle',game:'queens',diffs:DIFFS3,statLabel:'Best time',statFmt:function(v){return fmtTime(v);},onStart:function(d){withGenerating(function(){runQueens(d);});}});}
  function runQueens(diff){
    var n=QUEENS_DIFF[diff]; var gen=makeQueens(n);
    if(!gen){stage.innerHTML=''; stage.appendChild(el('p','status-line','Could not generate that one — tap to retry.')); var b=el('button','btn-primary','Retry'); b.addEventListener('click',function(){withGenerating(function(){runQueens(diff);});}); stage.appendChild(b); return;}
    var region=gen.region; var state=Array.from({length:n},function(){return Array(n).fill(0);});
    stage.innerHTML='';
    stage.appendChild(el('p','rules','One crown per row, column, and color — and no two crowns adjacent, even diagonally.'));
    var size=Math.min(392,Math.floor(window.innerWidth*0.92)); var cell=Math.floor(size/n);
    var grid=el('div','queens-grid'); grid.style.gridTemplateColumns='repeat('+n+', '+cell+'px)';
    var cellEls=[];
    for(var r=0;r<n;r++){cellEls[r]=[];
      for(var c=0;c<n;c++){
        var d=el('div','queens-cell'); d.style.width=cell+'px'; d.style.height=cell+'px'; d.style.fontSize=Math.floor(cell*0.5)+'px';
        d.style.background=REGION_COLORS[region[r][c]%REGION_COLORS.length];
        var thin='1px solid rgba(18,21,28,.16)', thick='3px solid var(--qline)';
        d.style.borderRight=(c===n-1)?'none':((region[r][c]!==region[r][c+1])?thick:thin);
        d.style.borderBottom=(r===n-1)?'none':((region[r][c]!==region[r+1][c])?thick:thin);
        (function(r,c,d){d.addEventListener('click',function(){state[r][c]=(state[r][c]+1)%3; paint(d,state[r][c]); check();});})(r,c,d);
        grid.appendChild(d); cellEls[r][c]=d;
      }}
    stage.appendChild(grid);
    var status=el('p','status-line',''); stage.appendChild(status);
    var row=el('div','btn-row');
    var clr=el('button','btn-ghost','Clear'); clr.addEventListener('click',function(){for(var r=0;r<n;r++)for(var c=0;c<n;c++){state[r][c]=0; paint(cellEls[r][c],0);} status.textContent='';});
    var nw=el('button','btn-ghost','New puzzle'); nw.addEventListener('click',function(){withGenerating(function(){runQueens(diff);});});
    row.appendChild(clr); row.appendChild(nw); stage.appendChild(row);
    var timer=makeTimer();
    function paint(d,v){d.innerHTML=''; if(v===1){var m=el('span','mark','\u2715'); d.appendChild(m);} else if(v===2){d.appendChild(el('span',null,'\u265B'));}}
    function check(){
      cellEls.forEach(function(rw){rw.forEach(function(d){d.classList.remove('bad');});});
      var qs=[]; for(var r=0;r<n;r++)for(var c=0;c<n;c++)if(state[r][c]===2)qs.push([r,c]);
      var rowCount={},colCount={},regCount={}; var conflict=false;
      qs.forEach(function(p){rowCount[p[0]]=(rowCount[p[0]]||0)+1; colCount[p[1]]=(colCount[p[1]]||0)+1; var rg=region[p[0]][p[1]]; regCount[rg]=(regCount[rg]||0)+1;});
      qs.forEach(function(p){var bad=false; var r=p[0],c=p[1];
        if(rowCount[r]>1||colCount[c]>1||regCount[region[r][c]]>1)bad=true;
        for(var k=0;k<qs.length;k++){var r2=qs[k][0],c2=qs[k][1]; if((r2!==r||c2!==c)&&Math.abs(r2-r)<=1&&Math.abs(c2-c)<=1)bad=true;}
        if(bad){cellEls[r][c].classList.add('bad'); conflict=true;}});
      if(qs.length===n&&!conflict){var secs=timer.stop(); var rec=saveBest('queens',diff,secs,'min'); bumpSolved('queens');
        status.style.color='var(--sage)'; status.textContent='Solved — every constraint satisfied.';
        after(function(){resultScreen('Solved in',fmtTime(secs),'One crown per row, column, and region.'+recordNote(rec,rec?null:getBest('queens',diff),function(v){return fmtTime(v);}),function(){withGenerating(function(){runQueens(diff);});});},700); return;}
      if(conflict){status.style.color='var(--rust)'; status.textContent='Two crowns are in conflict (red).';}
      else{status.style.color='var(--muted)'; status.textContent=qs.length+' of '+n+' crowns placed.';}
    }
  }

  /* ===== 8. ZIP ===== */
  var ZIP_DIFF={easy:{n:5,cp:6},medium:{n:6,cp:8},hard:{n:7,cp:10}};
  function startZip(){introDifficulty({title:'Zip',body:'Draw a single continuous line that starts at 1, runs through the numbers in order, and fills every cell on the board. Drag across cells to draw; drag back to undo.',button:'Generate puzzle',game:'zip',diffs:DIFFS3,statLabel:'Best time',statFmt:function(v){return fmtTime(v);},onStart:function(d){withGenerating(function(){runZip(d);});}});}
  function runZip(diff){
    var cfg=ZIP_DIFF[diff]; var rows=cfg.n,cols=cfg.n; var made=makeZip(rows,cols,cfg.cp); var nums=made.nums, count=made.count; var total=rows*cols;
    stage.innerHTML='';
    stage.appendChild(el('p','rules','Start on 1 and drag. Cover every cell exactly once, reaching the numbers in order up to '+count+'.'));
    var size=Math.min(360,Math.floor(window.innerWidth*0.92)); var cell=Math.floor((size-4*(cols-1))/cols);
    var wrap=el('div','zip-wrap');
    var grid=el('div','zip-grid'); grid.style.gridTemplateColumns='repeat('+cols+', '+cell+'px)';
    var svg=document.createElementNS('http://www.w3.org/2000/svg','svg'); svg.setAttribute('class','zip-svg');
    var poly=document.createElementNS('http://www.w3.org/2000/svg','polyline');
    poly.setAttribute('fill','none'); poly.setAttribute('stroke','#D9A441'); poly.setAttribute('stroke-width','6'); poly.setAttribute('stroke-linecap','round'); poly.setAttribute('stroke-linejoin','round');
    svg.appendChild(poly);
    var cellEls=[]; function idx(r,c){return r*cols+c;}
    for(var r=0;r<rows;r++){for(var c=0;c<cols;c++){
      var d=el('div','zip-cell'); d.style.width=cell+'px'; d.style.height=cell+'px'; d.dataset.r=r; d.dataset.c=c;
      if(nums[r][c]>0){d.appendChild(el('div','zip-num',String(nums[r][c])));}
      grid.appendChild(d); cellEls[idx(r,c)]=d;
    }}
    wrap.appendChild(grid); wrap.appendChild(svg); stage.appendChild(wrap);
    var status=el('p','status-line',''); stage.appendChild(status);
    var row=el('div','btn-row');
    var reset=el('button','btn-ghost','Reset path'); reset.addEventListener('click',function(){path.length=0; redraw();});
    var nw=el('button','btn-ghost','New puzzle'); nw.addEventListener('click',function(){withGenerating(function(){runZip(diff);});});
    row.appendChild(reset); row.appendChild(nw); stage.appendChild(row);
    var timer=makeTimer();
    var path=[]; var drawing=false;
    function neighbors(a,b){var ar=(a/cols)|0,ac=a%cols,br=(b/cols)|0,bc=b%cols; return Math.abs(ar-br)+Math.abs(ac-bc)===1;}
    function reach(cellIndex){
      if(cellIndex==null)return;
      var r=(cellIndex/cols)|0,c=cellIndex%cols;
      if(path.length===0){if(nums[r][c]===1){path.push(cellIndex); redraw();} return;}
      if(path.length>=2&&cellIndex===path[path.length-2]){path.pop(); redraw(); return;}
      if(path.indexOf(cellIndex)>=0)return;
      if(neighbors(cellIndex,path[path.length-1])){path.push(cellIndex); redraw(); if(path.length===total)validate();}
    }
    function redraw(){
      cellEls.forEach(function(d,i){d.classList.toggle('on',path.indexOf(i)>=0);});
      var pts=path.map(function(i){var d=cellEls[i]; return (d.offsetLeft+cell/2)+','+(d.offsetTop+cell/2);}).join(' ');
      poly.setAttribute('points',pts);
      svg.setAttribute('width',grid.offsetWidth); svg.setAttribute('height',grid.offsetHeight); svg.setAttribute('viewBox','0 0 '+grid.offsetWidth+' '+grid.offsetHeight);
      status.style.color='var(--muted)'; status.textContent=path.length?path.length+' / '+total+' cells':'';
    }
    function validate(){
      var seq=path.map(function(i){return nums[(i/cols)|0][i%cols];}).filter(function(v){return v>0;});
      var ordered=true; for(var k=0;k<seq.length;k++)if(seq[k]!==k+1)ordered=false;
      if(path.length===total&&ordered&&seq.length===count){var secs=timer.stop(); var rec=saveBest('zip',diff,secs,'min'); bumpSolved('zip');
        status.style.color='var(--sage)'; status.textContent='Complete — every cell, numbers in order.';
        after(function(){resultScreen('Solved in',fmtTime(secs),'One clean path through the whole board.'+recordNote(rec,rec?null:getBest('zip',diff),function(v){return fmtTime(v);}),function(){withGenerating(function(){runZip(diff);});});},700);}
      else{status.style.color='var(--rust)'; status.textContent='Board is full but the number order is off. Drag back and retry.';}
    }
    function cellFromPoint(x,y){var t=document.elementFromPoint(x,y); if(!t)return null; var cd=t.closest('.zip-cell'); if(!cd||!grid.contains(cd))return null; return idx(Number(cd.dataset.r),Number(cd.dataset.c));}
    wrap.addEventListener('pointerdown',function(e){drawing=true; try{wrap.setPointerCapture(e.pointerId);}catch(err){} reach(cellFromPoint(e.clientX,e.clientY));});
    wrap.addEventListener('pointermove',function(e){if(!drawing)return; reach(cellFromPoint(e.clientX,e.clientY));});
    window.addEventListener('pointerup',function(){drawing=false;});
    grid.addEventListener('click',function(e){var cd=e.target.closest('.zip-cell'); if(cd)reach(idx(Number(cd.dataset.r),Number(cd.dataset.c)));});
    requestAnimationFrame(redraw);
  }

  /* ===== 9. MINI SUDOKU ===== */
  var SUDOKU_DIFF={easy:18,medium:14,hard:10};
  function startSudoku(){introDifficulty({title:'Mini Sudoku',body:'A compact 6x6 grid. Fill it so every row, every column, and every 2x3 box contains 1 through 6 exactly once. Locked numbers are given.',button:'Generate puzzle',game:'sudoku',diffs:DIFFS3,statLabel:'Best time',statFmt:function(v){return fmtTime(v);},onStart:function(d){withGenerating(function(){runSudoku(d);});}});}
  function runSudoku(diff){
    var made=makeSudoku(SUDOKU_DIFF[diff]); var puzzle=made.puzzle;
    var state=puzzle.map(function(r){return r.slice();});
    stage.innerHTML='';
    stage.appendChild(el('p','rules','Tap a cell, then a number. Each row, column, and 2x3 box holds 1-6 once.'));
    var grid=el('div','sudoku-grid'); var cellEls=[];
    var selR=-1,selC=-1;
    for(var r=0;r<6;r++){cellEls[r]=[];
      for(var c=0;c<6;c++){
        var d=el('div','sudoku-cell');
        if(c%3===2&&c!==5)d.classList.add('box-r');
        if(r%2===1&&r!==5)d.classList.add('box-b');
        if(puzzle[r][c]!==0){d.classList.add('given'); d.textContent=puzzle[r][c];}
        else{d.classList.add('user'); (function(r,c,d){d.addEventListener('click',function(){selR=r; selC=c; highlight();});})(r,c,d);}
        grid.appendChild(d); cellEls[r][c]=d;
      }}
    stage.appendChild(grid);
    var pad=el('div','pad');
    [1,2,3,4,5,6].forEach(function(nv){var b=el('button',null,String(nv)); b.addEventListener('click',function(){place(nv);}); pad.appendChild(b);});
    var er=el('button',null,'\u232B'); er.addEventListener('click',function(){place(0);}); pad.appendChild(er);
    stage.appendChild(pad);
    var status=el('p','status-line',''); stage.appendChild(status);
    var row=el('div','btn-row'); var nw=el('button','btn-ghost','New puzzle'); nw.addEventListener('click',function(){withGenerating(function(){runSudoku(diff);});}); row.appendChild(nw); stage.appendChild(row);
    var timer=makeTimer();
    document.addEventListener('keydown',keyHandler);
    function keyHandler(e){if(gameView.hidden){document.removeEventListener('keydown',keyHandler); return;} if(e.key>='1'&&e.key<='6')place(Number(e.key)); else if(e.key==='Backspace'||e.key==='0'||e.key==='Delete')place(0);}
    function highlight(){for(var r=0;r<6;r++)for(var c=0;c<6;c++)cellEls[r][c].classList.toggle('sel',r===selR&&c===selC);}
    function place(v){if(selR<0||puzzle[selR][selC]!==0)return; state[selR][selC]=v; cellEls[selR][selC].textContent=v||''; check();}
    function check(){
      for(var r=0;r<6;r++)for(var c=0;c<6;c++)if(puzzle[r][c]===0)cellEls[r][c].classList.remove('conflict');
      var full=true,conflict=false;
      function mark(r,c){cellEls[r][c].classList.add('conflict'); conflict=true;}
      for(var r2=0;r2<6;r2++)for(var c2=0;c2<6;c2++){var v=state[r2][c2]; if(v===0){full=false; continue;}
        for(var i=0;i<6;i++){if(i!==c2&&state[r2][i]===v)mark(r2,c2); if(i!==r2&&state[i][c2]===v)mark(r2,c2);}
        var br=((r2/2)|0)*2,bc=((c2/3)|0)*3; for(var a=0;a<2;a++)for(var b=0;b<3;b++){var rr=br+a,cc=bc+b; if((rr!==r2||cc!==c2)&&state[rr][cc]===v)mark(r2,c2);}}
      if(full&&!conflict){var secs=timer.stop(); var rec=saveBest('sudoku',diff,secs,'min'); bumpSolved('sudoku');
        document.removeEventListener('keydown',keyHandler);
        status.style.color='var(--sage)'; status.textContent='Solved.';
        after(function(){resultScreen('Solved in',fmtTime(secs),'Filled cleanly — the one and only solution.'+recordNote(rec,rec?null:getBest('sudoku',diff),function(v){return fmtTime(v);}),function(){withGenerating(function(){runSudoku(diff);});});},700);}
      else if(conflict){status.style.color='var(--rust)'; status.textContent='A number repeats in a row, column, or box.';}
      else{status.style.color='var(--muted)'; status.textContent='';}
    }
  }
  /* ===== 10. PINPOINT ===== */
  var PINPOINT_BANK=[
    {cat:"Planets",items:["Mercury","Venus","Mars","Jupiter","Neptune"]},
    {cat:"Shades of blue",items:["Navy","Azure","Cobalt","Teal","Cerulean"]},
    {cat:"Chess pieces",items:["Pawn","Knight","Bishop","Rook","Queen"]},
    {cat:"Citrus fruits",items:["Lemon","Lime","Orange","Grapefruit","Tangerine"]},
    {cat:"Greek letters",items:["Alpha","Beta","Gamma","Delta","Omega"]},
    {cat:"Board games",items:["Chess","Checkers","Backgammon","Monopoly","Scrabble"]},
    {cat:"Types of clouds",items:["Cirrus","Cumulus","Stratus","Nimbus","Altostratus"]},
    {cat:"Musical instruments",items:["Violin","Cello","Flute","Trumpet","Clarinet"]},
    {cat:"Programming languages",items:["Python","Java","Ruby","Rust","Kotlin"]},
    {cat:"Ancient wonders",items:["Colossus","Pyramid","Lighthouse","Mausoleum","Gardens"]},
    {cat:"Types of triangles",items:["Scalene","Isosceles","Equilateral","Acute","Obtuse"]},
    {cat:"Coffee drinks",items:["Espresso","Latte","Cappuccino","Macchiato","Americano"]},
    {cat:"Herbs",items:["Basil","Thyme","Oregano","Rosemary","Parsley"]},
    {cat:"Precious stones",items:["Ruby","Sapphire","Emerald","Diamond","Topaz"]},
    {cat:"Continents",items:["Asia","Africa","Europe","Antarctica","Oceania"]},
    {cat:"Martial arts",items:["Judo","Karate","Taekwondo","Aikido","Kung Fu"]},
    {cat:"Sailing terms",items:["Bow","Stern","Port","Starboard","Keel"]},
    {cat:"Types of pasta",items:["Penne","Fusilli","Rigatoni","Linguine","Farfalle"]},
    {cat:"Weather phenomena",items:["Hail","Sleet","Fog","Frost","Drizzle"]},
    {cat:"Metals",items:["Iron","Copper","Zinc","Nickel","Cobalt"]},
    {cat:"Shakespeare plays",items:["Hamlet","Macbeth","Othello","Tempest","King Lear"]},
    {cat:"Yoga poses",items:["Cobra","Warrior","Tree","Cat","Bridge"]},
    {cat:"Units of time",items:["Second","Minute","Hour","Fortnight","Decade"]},
    {cat:"Sushi types",items:["Nigiri","Maki","Sashimi","Temaki","Uramaki"]},
    {cat:"Constellations",items:["Orion","Lyra","Draco","Cygnus","Perseus"]},
    {cat:"Dog breeds",items:["Beagle","Poodle","Boxer","Corgi","Husky"]},
    {cat:"Painting styles",items:["Cubism","Baroque","Realism","Surrealism","Fauvism"]},
    {cat:"Tectonic terms",items:["Fault","Plate","Rift","Subduction","Magma"]},
    {cat:"Knots",items:["Bowline","Clove hitch","Reef","Figure-eight","Sheet bend"]},
    {cat:"Whisky regions",items:["Speyside","Islay","Highland","Lowland","Campbeltown"]},
    {cat:"Punctuation marks",items:["Comma","Colon","Dash","Ellipsis","Semicolon"]},
    {cat:"Roman gods",items:["Jupiter","Mars","Venus","Neptune","Mercury"]},
    {cat:"Ballet terms",items:["Plie","Arabesque","Jete","Pirouette","Releve"]},
    {cat:"Bones",items:["Femur","Tibia","Radius","Scapula","Sternum"]},
    {cat:"French sauces",items:["Bechamel","Veloute","Espagnole","Hollandaise","Tomato"]},
    {cat:"Winds",items:["Mistral","Sirocco","Chinook","Monsoon","Zephyr"]},
    {cat:"Poetic forms",items:["Sonnet","Haiku","Limerick","Ode","Villanelle"]},
    {cat:"Camera settings",items:["Aperture","Shutter","ISO","Focus","Exposure"]},
    {cat:"Volcano parts",items:["Crater","Vent","Magma","Caldera","Lava"]},
    {cat:"Tea varieties",items:["Green","Oolong","Chamomile","Darjeeling","Rooibos"]}
  ];
  function startPinpoint(){introSimple({title:'Pinpoint',body:'A hidden category is revealed one clue at a time. Guess it from the options as early as you dare — the fewer clues you need, the higher your score.',button:'Play',game:'pinpoint',statLabel:'Best (points)',statFmt:function(v){return v+' pts';},onStart:function(){withGenerating(runPinpoint);}});}
  function runPinpoint(){
    var bank=shuffle(PINPOINT_BANK); var target=bank[0]; var clues=shuffle(target.items);
    var distractors=shuffle(bank.slice(1)).slice(0,5).map(function(x){return x.cat;});
    var options=shuffle(distractors.concat([target.cat]));
    var revealed=1, answered=false;
    stage.innerHTML='';
    stage.appendChild(el('p','rules','Clues appear one by one. Pick the category — sooner is worth more.'));
    var clueWrap=el('div','pin-clues');
    var clueEls=clues.map(function(w,i){var c=el('div','pin-clue'+(i===0?' show':' pending'), i===0?w:'\u2022 \u2022 \u2022'); clueWrap.appendChild(c); return c;});
    stage.appendChild(clueWrap);
    gameStat.textContent='Clues: 1 / 5';
    var revealBtn=el('button','btn-ghost','Reveal another clue');
    revealBtn.addEventListener('click',function(){if(answered||revealed>=5)return; clueEls[revealed].classList.remove('pending'); clueEls[revealed].classList.add('show'); clueEls[revealed].textContent=clues[revealed]; revealed++; gameStat.textContent='Clues: '+revealed+' / 5'; if(revealed>=5)revealBtn.disabled=true;});
    var opts=el('div','pin-opts');
    options.forEach(function(name){var b=el('button','pin-opt',name);
      b.addEventListener('click',function(){if(answered)return; answered=true;
        opts.querySelectorAll('.pin-opt').forEach(function(x){if(x.textContent===target.cat)x.classList.add('correct'); else if(x===b&&name!==target.cat)x.classList.add('incorrect');});
        clueEls.forEach(function(c,i){c.classList.remove('pending'); c.classList.add('show'); c.textContent=clues[i];});
        var correct=name===target.cat; var pts=correct?(6-revealed):0;
        if(correct){var rec=saveBest('pinpoint',null,pts,'max');} bumpSolved('pinpoint');
        var msg=correct?('Nailed it in '+revealed+' clue'+(revealed>1?'s':'')+'.'+recordNote(rec,rec?null:getBest('pinpoint',null),function(v){return v+' pts';})):('It was: '+target.cat+'.');
        after(function(){resultScreen(correct?'Points':'Category',correct?String(pts):target.cat,msg,function(){withGenerating(runPinpoint);});},900);
      });
      opts.appendChild(b);});
    stage.appendChild(revealBtn);
    stage.appendChild(opts);
  }

  /* ===== COGNITIVE STYLE (personality) ===== */
  var COGSTYLE_Q=[
    {ax:'ai', a:{t:'Map out the steps',p:'A'}, b:{t:'Follow a hunch',p:'I'}, q:'Facing a brand-new problem, you first…'},
    {ax:'ai', a:{t:'Data and logic',p:'A'}, b:{t:'Instinct and feel',p:'I'}, q:'You tend to trust…'},
    {ax:'ai', a:{t:'The reasoning checks out',p:'A'}, b:{t:'It simply clicks',p:'I'}, q:'A decision feels right when…'},
    {ax:'ai', a:{t:'Precise',p:'A'}, b:{t:'Imaginative',p:'I'}, q:"You'd rather be called…"},
    {ax:'de', a:{t:'Go deep on one thing',p:'D'}, b:{t:'Sample many things',p:'E'}, q:'You most enjoy getting to…'},
    {ax:'de', a:{t:'Organized and tidy',p:'D'}, b:{t:'A creative sprawl',p:'E'}, q:'Your ideal workspace is…'},
    {ax:'de', a:{t:'Detailed and set',p:'D'}, b:{t:'Loose and open',p:'E'}, q:'Good plans are…'},
    {ax:'de', a:{t:'Finishing what you start',p:'D'}, b:{t:'Starting something new',p:'E'}, q:'You get the biggest lift from…'}
  ];
  var ARCHETYPES={
    'AD':{name:'The Architect',blurb:'You build understanding brick by brick — logical, thorough, and precise. You trust a plan you can inspect and finish what you begin.'},
    'AE':{name:'The Strategist',blurb:'You reason widely, connecting scattered ideas into big-picture bets. Analytical at heart, but always scanning the horizon for the next move.'},
    'ID':{name:'The Craftsman',blurb:'You feel your way to quality, then perfect every detail. Intuitive hands, exacting standards — instinct refined into craft.'},
    'IE':{name:'The Explorer',blurb:'You follow curiosity wherever it runs, trusting instinct over instructions. Fast, open, and original — you love the blank page.'}
  };
  function startCogstyle(){
    var last=store.get('cogstyle:last',null);
    introSimple({title:'Cognitive Style',body:'Eight quick choices sketch how your mind prefers to work. There are no right answers — just pick whichever feels more like you.',button:last?'Take it again':'Begin',game:'cogstyle',statLabel:'Last result',statFmt:function(v){return v;},onStart:runCogstyle});
  }
  function runCogstyle(){
    var qs=shuffle(COGSTYLE_Q); var idx=0; var tally={A:0,I:0,D:0,E:0};
    function show(){
      if(idx>=qs.length){finish();return;}
      var item=qs[idx];
      stage.innerHTML=''; var card=el('div','quiz-card');
      card.appendChild(el('div','quiz-progress','Question '+(idx+1)+' of '+qs.length));
      card.appendChild(el('div','quiz-q',item.q));
      var opts=el('div','quiz-opts');
      [item.a,item.b].forEach(function(opt){var b=el('button','quiz-opt',opt.t);
        b.addEventListener('click',function(){tally[opt.p]++; idx++; show();}); opts.appendChild(b);});
      card.appendChild(opts); stage.appendChild(card);
      gameStat.textContent=(idx+1)+' / '+qs.length;
    }
    function bar(leftLabel,rightLabel,leftPct){
      var row=el('div','trait-row');
      row.appendChild(el('span','end',leftLabel));
      var track=el('div','trait-bar'); var fill=el('div','trait-fill'); track.appendChild(fill); row.appendChild(track);
      var rt=el('span','end r',rightLabel); row.appendChild(rt);
      stage.appendChild(row);
      requestAnimationFrame(function(){fill.style.width=leftPct+'%';});
    }
    function finish(){
      var ai=(tally.A>=tally.I)?'A':'I'; var de=(tally.D>=tally.E)?'D':'E';
      var key=ai+de; var arch=ARCHETYPES[key];
      store.set('cogstyle:last',arch.name); bumpSolved('cogstyle');
      stage.innerHTML='';
      var panel=el('div','result-panel');
      panel.appendChild(el('div','result-label','Your cognitive style'));
      panel.appendChild(el('div','cs-archetype',arch.name));
      panel.appendChild(el('p','cs-blurb',arch.blurb));
      stage.appendChild(panel);
      bar('Analytical','Intuitive', Math.round(tally.A/4*100));
      bar('Detail','Explorer', Math.round(tally.D/4*100));
      var row=el('div','btn-row'); row.style.marginTop='18px';
      var rep=el('button','btn-primary','Take it again'); rep.addEventListener('click',runCogstyle);
      var back=el('button','btn-ghost','Back to chambers'); back.addEventListener('click',closeGame);
      row.appendChild(rep); row.appendChild(back); stage.appendChild(row);
      gameStat.textContent='';
    }
    show();
  }

  /* ===== COGNITIVE REFLECTION (trick questions) ===== */
  var CRT_BANK=[
    {q:"A bat and a ball cost $1.10 together. The bat costs $1.00 more than the ball. How much is the ball?",o:["10\u00A2","5\u00A2","1\u00A2","11\u00A2"],a:"5\u00A2",why:"The obvious answer is 10\u00A2 \u2014 but then the bat ($1.10) is only $1.00 more, totaling $1.20. The ball is <b>5\u00A2</b>, the bat $1.05."},
    {q:"If 5 machines take 5 minutes to make 5 widgets, how long for 100 machines to make 100 widgets?",o:["100 minutes","20 minutes","5 minutes","1 minute"],a:"5 minutes",why:"Each machine makes one widget in 5 minutes, so 100 machines make 100 widgets in the same <b>5 minutes</b>."},
    {q:"A lily patch doubles every day and covers the lake in 48 days. When is it half-covered?",o:["Day 24","Day 47","Day 46","Day 32"],a:"Day 47",why:"Doubling daily means the day before full it was half \u2014 <b>day 47</b>."},
    {q:"In a race you overtake the runner in 2nd place. What position are you in now?",o:["1st","2nd","3rd","Can't tell"],a:"2nd",why:"You take the overtaken runner's spot \u2014 <b>2nd</b>, not 1st."},
    {q:"A farmer has 17 sheep. All but 9 run away. How many are left?",o:["8","9","17","0"],a:"9",why:"\u201CAll but 9\u201D means 9 stay behind."},
    {q:"How many animals of each kind did Moses take on the ark?",o:["Two","Seven","One","None"],a:"None",why:"It was Noah who built the ark, not Moses."},
    {q:"How many months of the year have 28 days?",o:["1","2","7","12"],a:"12",why:"Every month has at least 28 days."},
    {q:"Emily's father has three daughters: April, May, and\u2026?",o:["June","Emily","Julie","April"],a:"Emily",why:"The third daughter is Emily herself."},
    {q:"You take 3 pills, one every half hour. How long until all are taken?",o:["1.5 hours","1 hour","30 minutes","3 hours"],a:"1 hour",why:"First now, second at 30 min, third at 60 min \u2014 <b>1 hour</b>."},
    {q:"Divide 30 by one-half and add 10. What do you get?",o:["25","70","55","40"],a:"70",why:"Dividing by \u00BD means multiplying by 2: 30\u00F70.5 = 60, plus 10 = <b>70</b>."},
    {q:"It takes 8 people 8 hours to dig 8 holes. How long for 4 people to dig 4 holes?",o:["4 hours","8 hours","16 hours","2 hours"],a:"8 hours",why:"Each person digs one hole in 8 hours, whatever the count \u2014 still <b>8 hours</b>."},
    {q:"Which weighs more: a pound of feathers or a pound of bricks?",o:["Feathers","Bricks","They weigh the same","Depends"],a:"They weigh the same",why:"A pound is a pound, regardless of the material."}
  ];
  function startCrt(){introSimple({title:'Cognitive Reflection',body:"Six questions that look easy and hide a trap. The first answer that pops into your head is usually the wrong one \u2014 slow down and think it through.",button:'Start',game:'crt',statLabel:'Best score',statFmt:function(v){return v+' / 6';},onStart:runCrt});}
  function runCrt(){
    var qs=shuffle(CRT_BANK).slice(0,6); var idx=0, score=0;
    function show(){
      if(idx>=qs.length){var rec=saveBest('crt',null,score,'max'); bumpSolved('crt');
        after(function(){resultScreen('Score',score+' / 6',(score>=5?'Impressive \u2014 you beat your instincts.':score>=3?'Not bad. The traps are designed to catch fast thinking.':'These are made to fool you. Another pass will sharpen it.')+recordNote(rec,rec?null:getBest('crt',null),function(v){return v+'/6';}),runCrt);},150); return;}
      var item=qs[idx]; var opts=shuffle(item.o.slice());
      stage.innerHTML=''; var card=el('div','quiz-card');
      card.appendChild(el('div','quiz-progress','Question '+(idx+1)+' of 6 \u00B7 Score '+score));
      card.appendChild(el('div','quiz-q',item.q));
      var wrap=el('div','quiz-opts'); var answered=false;
      opts.forEach(function(txt){var b=el('button','quiz-opt',txt);
        b.addEventListener('click',function(){if(answered)return; answered=true;
          wrap.querySelectorAll('.quiz-opt').forEach(function(x){if(x.textContent===item.a)x.classList.add('correct'); else if(x===b)x.classList.add('incorrect');});
          if(txt===item.a)score++;
          var ex=el('div','crt-explain'); ex.innerHTML=item.why; card.appendChild(ex);
          var next=el('button','btn-primary',(idx===qs.length-1)?'See score':'Next question'); next.style.marginTop='6px';
          next.addEventListener('click',function(){idx++; show();}); card.appendChild(next);
        }); wrap.appendChild(b);});
      card.appendChild(wrap); stage.appendChild(card);
      gameStat.textContent='Q '+(idx+1)+' / 6';
    }
    show();
  }

  /* ===== N-BACK (working memory) ===== */
  function startNback(){introSimple({title:'N-Back',body:"A tile lights up around a 3\u00D73 grid, one spot at a time. Tap Match (or press Space) whenever the lit tile is in the same spot it was two steps earlier. Stay with it \u2014 it's harder than it sounds.",button:'Start',game:'nback',statLabel:'Best accuracy',statFmt:function(v){return v+'%';},onStart:runNback});}
  function runNback(){
    var N=2, L=22, stimMs=2000, gapMs=650;
    var pos=[]; for(var k=0;k<L;k++){pos.push(Math.floor(Math.random()*9));}
    for(var k2=N;k2<L;k2++){ if(Math.random()<0.3) pos[k2]=pos[k2-N]; }
    stage.innerHTML='';
    stage.appendChild(el('p','rules','Match when the lit tile repeats its position from two steps ago.'));
    var grid=el('div','nback-grid'); var cells=[];
    for(var i=0;i<9;i++){var d=el('div','nback-cell'); grid.appendChild(d); cells.push(d);}
    stage.appendChild(grid);
    var fb=el('p','nback-feedback',''); stage.appendChild(fb);
    var matchBtn=el('button','btn-primary','Match'); matchBtn.disabled=true;
    var row=el('div','btn-row'); row.appendChild(matchBtn); stage.appendChild(row);
    var i2=0, responded=false, correct=0, hits=0, targets=0, running=true;
    gameStat.textContent='0 / '+L;
    function flag(){ if(!running||responded||i2<1)return; responded=true; matchBtn.textContent='Flagged'; matchBtn.classList.add('btn-ghost'); }
    matchBtn.addEventListener('click',flag);
    function keyHandler(e){ if(gameView.hidden){document.removeEventListener('keydown',keyHandler);return;} if(e.code==='Space'||e.key===' '){e.preventDefault(); flag();} }
    document.addEventListener('keydown',keyHandler);
    function beat(){
      responded=false; matchBtn.disabled=false; matchBtn.textContent='Match'; matchBtn.classList.remove('btn-ghost');
      cells.forEach(function(c){c.classList.remove('lit');});
      cells[pos[i2]].classList.add('lit');
      gameStat.textContent=(i2+1)+' / '+L;
      after(function(){
        cells[pos[i2]].classList.remove('lit'); matchBtn.disabled=true;
        if(i2>=N){
          var target=(pos[i2]===pos[i2-N]); if(target)targets++;
          if(responded&&target){correct++; hits++; fb.className='nback-feedback good'; fb.textContent='\u2713 match';}
          else if(!responded&&!target){correct++; fb.className='nback-feedback'; fb.textContent='';}
          else if(responded&&!target){fb.className='nback-feedback bad'; fb.textContent='\u2717 not a match';}
          else {fb.className='nback-feedback bad'; fb.textContent='\u2717 missed one';}
        }
        i2++;
        if(i2<L) after(beat,gapMs); else finish();
      }, stimMs);
    }
    function finish(){running=false; document.removeEventListener('keydown',keyHandler);
      var total=L-N; var acc=Math.round(correct/total*100);
      var rec=saveBest('nback',null,acc,'max'); bumpSolved('nback');
      after(function(){resultScreen('Accuracy',acc+'%','You caught '+hits+' of '+targets+' matches.'+recordNote(rec,rec?null:getBest('nback',null),function(v){return v+'%';}),runNback);},400);
    }
    after(beat,700);
  }

  /* ===== 11. REACTION TIME ===== */
  var REACTION_DIFF={easy:{trials:3,min:1200,span:2200,nogo:false},medium:{trials:5,min:1000,span:3000,nogo:false},hard:{trials:5,min:900,span:3800,nogo:true}};
  function startReaction(){introDifficulty({title:'Reaction Time',body:'When the panel turns green, tap it as fast as you can. Your average across the trials is your score. Tap too early and that trial restarts. On Hard, a blue panel means hold — do not tap it.',button:'Start',game:'reaction',diffs:DIFFS3,statLabel:'Best average',statFmt:function(v){return v+' ms';},onStart:function(d){runReaction(d);}});}
  function runReaction(diff){
    var cfg=REACTION_DIFF[diff]; var trials=cfg.trials, times=[], state='idle', goAt=0;
    stage.innerHTML='';
    var panel=el('div','react-panel react-wait');
    var h=el('h3',null,'Get ready…'); var sub=el('div','sub',cfg.nogo?'Green = tap · Blue = hold':'Wait for green');
    var dots=el('div','react-dots'); var dotEls=[]; for(var i=0;i<trials;i++){var dd=el('div','react-dot'); dots.appendChild(dd); dotEls.push(dd);}
    panel.appendChild(h); panel.appendChild(sub); panel.appendChild(dots);
    stage.appendChild(panel);
    gameStat.textContent='Trial 1 / '+trials;
    function schedule(){state='waiting'; panel.className='react-panel react-wait'; h.textContent='Wait for it…'; sub.textContent=cfg.nogo?'Green = tap · Blue = hold':'Wait for green';
      after(function(){
        if(cfg.nogo && Math.random()<0.33){state='nogo'; panel.className='react-panel react-nogo'; h.textContent='Hold!'; sub.textContent="Don't tap";
          after(function(){if(state!=='nogo')return; state='between'; panel.className='react-panel react-result'; h.textContent='Good hold'; sub.textContent='Tap to continue';},900);
        } else {state='go'; goAt=performance.now(); panel.className='react-panel react-go'; h.textContent='Tap!'; sub.textContent='';}
      }, cfg.min+Math.random()*cfg.span);}
    panel.addEventListener('pointerdown',function(){
      if(state==='waiting'){clearAllTimers(); state='earlyWait'; panel.className='react-panel react-early'; h.textContent='Too soon!'; sub.textContent='Tap to try this trial again';}
      else if(state==='nogo'){clearAllTimers(); state='earlyWait'; panel.className='react-panel react-early'; h.textContent='That was a hold!'; sub.textContent='Tap to try this trial again';}
      else if(state==='earlyWait'){schedule();}
      else if(state==='go'){var ms=Math.round(performance.now()-goAt); times.push(ms); dotEls[times.length-1].classList.add('done');
        if(times.length>=trials){finish();}
        else {state='between'; panel.className='react-panel react-result'; h.textContent=ms+' ms'; sub.textContent='Tap to continue'; gameStat.textContent='Trial '+(times.length+1)+' / '+trials;}}
      else if(state==='between'){schedule();}
    });
    function finish(){var avg=Math.round(times.reduce(function(a,b){return a+b;},0)/times.length);
      var rec=saveBest('reaction',diff,avg,'min'); bumpSolved('reaction');
      after(function(){resultScreen('Avg reaction',avg+' ms','Trials: '+times.join(', ')+' ms.'+recordNote(rec,rec?null:getBest('reaction',diff),function(v){return v+' ms';}),function(){runReaction(diff);});},450);}
    schedule();
  }

  /* ===== 12. COLOR CLASH (Stroop) ===== */
  var STROOP_COLORS=[{n:'red',c:'#D9534F'},{n:'blue',c:'#4A73C0'},{n:'green',c:'#5E9E5E'},{n:'gold',c:'#D9A441'},{n:'purple',c:'#8A5FB0'},{n:'orange',c:'#D98A3D'}];
  var STROOP_DIFF={easy:{colors:3,time:30,penalty:1},medium:{colors:4,time:30,penalty:2},hard:{colors:6,time:25,penalty:3}};
  function startStroop(){introDifficulty({title:'Color Clash',body:'A color word appears painted in some ink color. Tap the button matching the INK color — ignore what the word says. Score as many as you can before time runs out; a wrong tap costs seconds. Harder levels add more colors and less time.',button:'Start',game:'stroop',diffs:DIFFS3,statLabel:'Best score',statFmt:function(v){return v+' correct';},onStart:function(d){runStroop(d);}});}
  function runStroop(diff){
    var cfg=STROOP_DIFF[diff]; var palette=STROOP_COLORS.slice(0,cfg.colors);
    var score=0, timeLeft=cfg.time, current=null, combo=0;
    stage.innerHTML='';
    stage.appendChild(el('div','stroop-prompt','Tap the INK color'));
    var word=el('div','stroop-word','');
    var opts=el('div','stroop-opts');
    stage.appendChild(word); stage.appendChild(opts);
    gameStat.textContent=cfg.time+'s · 0';
    var timer=every(function(){timeLeft--; gameStat.textContent=Math.max(timeLeft,0)+'s · '+score; if(timeLeft<=0)finish();},1000);
    function nextRound(){
      var ink=palette[Math.floor(Math.random()*palette.length)];
      var label=palette[Math.floor(Math.random()*palette.length)];
      word.textContent=label.n.toUpperCase(); word.style.color=ink.c; current=ink;
      var chosen=shuffle(palette).slice(0,cfg.colors);
      if(chosen.indexOf(ink)<0){chosen[0]=ink;} chosen=shuffle(chosen);
      opts.style.gridTemplateColumns='repeat('+(cfg.colors>=5?3:2)+',1fr)';
      opts.innerHTML='';
      chosen.forEach(function(col){var b=el('button','stroop-opt',col.n); b.style.background=col.c;
        b.addEventListener('click',function(){if(timeLeft<=0)return;
          if(col===current){score++; combo++; comboPop(combo,word); gameStat.textContent=Math.max(timeLeft,0)+'s · '+score; nextRound();}
          else {combo=0; SFX.bad(); b.classList.add('stroop-flash'); after(function(){b.classList.remove('stroop-flash');},300); timeLeft=Math.max(0,timeLeft-cfg.penalty); gameStat.textContent=Math.max(timeLeft,0)+'s · '+score;}});
        opts.appendChild(b);});
    }
    function finish(){clearInterval(timer); var rec=saveBest('stroop',diff,score,'max'); bumpSolved('stroop');
      after(function(){resultScreen('Correct',score,'In '+cfg.time+' seconds.'+recordNote(rec,rec?null:getBest('stroop',diff),function(v){return v+' correct';}),function(){runStroop(diff);});},200);}
    nextRound();
  }

  /* ===== 13. ODD ONE OUT ===== */
  var ODD_DIFF={easy:{time:50,startN:2,dStart:34,decay:2,dMin:11},medium:{time:45,startN:3,dStart:30,decay:3,dMin:8},hard:{time:40,startN:3,dStart:22,decay:4,dMin:5}};
  function startOdd(){introDifficulty({title:'Odd One Out',body:'Every tile is the same color except one. Tap the tile that is slightly different. Each correct find makes the grid larger and the difference subtler. A miss costs three seconds; harder levels start bigger and fade faster.',button:'Start',game:'odd',diffs:DIFFS3,statLabel:'Best (found)',statFmt:function(v){return v+' found';},onStart:function(d){runOdd(d);}});}
  function runOdd(diff){
    var cfg=ODD_DIFF[diff]; var score=0, timeLeft=cfg.time, level=0, combo=0;
    stage.innerHTML='';
    var grid=el('div','odd-grid'); stage.appendChild(grid);
    stage.appendChild(el('p','status-line','Find the tile that is a slightly different shade.'));
    gameStat.textContent=cfg.time+'s · 0';
    var timer=every(function(){timeLeft--; gameStat.textContent=Math.max(timeLeft,0)+'s · '+score; if(timeLeft<=0)finish();},1000);
    function round(){
      level++;
      var n=Math.min(cfg.startN+Math.floor(level/2),8);
      var delta=Math.max(cfg.dStart-level*cfg.decay,cfg.dMin);
      var hue=Math.floor(Math.random()*360);
      var baseL=56;
      var base='hsl('+hue+',52%,'+baseL+'%)';
      var odd='hsl('+hue+',52%,'+(baseL-delta)+'%)';
      var oddIndex=Math.floor(Math.random()*n*n);
      var avail=Math.min(window.innerWidth*0.9,380);
      var size=Math.max(Math.floor(avail/n)-6,18);
      grid.style.gridTemplateColumns='repeat('+n+', '+size+'px)';
      grid.innerHTML='';
      for(var i=0;i<n*n;i++){(function(i){var t=el('div','odd-tile'); t.style.width=size+'px'; t.style.height=size+'px'; t.style.background=(i===oddIndex)?odd:base;
        t.addEventListener('click',function(){if(timeLeft<=0)return;
          if(i===oddIndex){score++; combo++; comboPop(combo,grid); gameStat.textContent=Math.max(timeLeft,0)+'s · '+score; round();}
          else {combo=0; SFX.bad(); t.classList.add('odd-pulse'); after(function(){t.classList.remove('odd-pulse');},350); timeLeft=Math.max(0,timeLeft-3);}});
        grid.appendChild(t);})(i);}
    }
    function finish(){clearInterval(timer); var rec=saveBest('odd',diff,score,'max'); bumpSolved('odd');
      after(function(){resultScreen('Found',score,'In '+cfg.time+' seconds.'+recordNote(rec,rec?null:getBest('odd',diff),function(v){return v+' found';}),function(){runOdd(diff);});},200);}
    round();
  }

  /* ===== 14. CHIMP TEST ===== */
  var CHIMP_DIFF={easy:{gridN:5,start:3},medium:{gridN:6,start:4},hard:{gridN:7,start:5}};
  function startChimp(){introDifficulty({title:'Chimp Test',body:'Numbers are scattered on the grid. After you tap 1, the rest turn blank — then tap them in order from memory. One mistake ends the run, and each cleared round adds a number. Harder levels use a bigger grid and start with more numbers.',button:'Start',game:'chimp',diffs:DIFFS3,statLabel:'Best level',statFmt:function(v){return v+' numbers';},onStart:function(d){runChimp(d);}});}
  function runChimp(diff){
    var cfg=CHIMP_DIFF[diff]; var gridN=cfg.gridN, count=cfg.start, cleared=0;
    stage.innerHTML='';
    var grid=el('div','chimp-grid');
    var info=el('p','status-line','');
    stage.appendChild(grid); stage.appendChild(info);
    var avail=Math.min(window.innerWidth*0.9,420);
    var size=Math.max(Math.floor(avail/gridN)-8,44);
    grid.style.gridTemplateColumns='repeat('+gridN+', '+size+'px)';
    var cells=[];
    for(var i=0;i<gridN*gridN;i++){var d=el('div','chimp-cell'); d.style.width=size+'px'; d.style.height=size+'px'; grid.appendChild(d); cells.push(d);}
    var positions=[], expect=1, locked=false;
    function round(){
      gameStat.textContent='Numbers: '+count;
      info.textContent='Memorize the positions, then tap 1.';
      cells.forEach(function(c){c.className='chimp-cell'; c.textContent=''; c.onclick=null;});
      var idxs=shuffle(Array.from({length:gridN*gridN},function(_,i){return i;})).slice(0,count);
      positions=idxs; expect=1; locked=false;
      idxs.forEach(function(idx,k){var c=cells[idx]; c.classList.add('num'); c.textContent=String(k+1);});
      cells.forEach(function(c,idx){c.onclick=function(){
        if(locked)return; var num=positions.indexOf(idx)+1; if(num===0)return;
        if(num===expect){
          if(expect===1){positions.forEach(function(pidx,k){if(k+1!==1){cells[pidx].classList.remove('num'); cells[pidx].classList.add('hidden-num'); cells[pidx].textContent='';}});}
          cells[idx].className='chimp-cell correct'; cells[idx].textContent=String(num); expect++;
          if(expect>count){locked=true; cleared=count; info.textContent='Clear! Next round…';
            if(count>=gridN*gridN){finishWin();} else {after(function(){count++; round();},650);}}
        } else {
          locked=true; cells[idx].classList.add('wrong');
          positions.forEach(function(pidx,k){if(!cells[pidx].classList.contains('correct')&&!cells[pidx].classList.contains('wrong')){cells[pidx].className='chimp-cell num'; cells[pidx].textContent=String(k+1);}});
          fail();
        }
      };});
    }
    function fail(){var rec=saveBest('chimp',diff,cleared,'max'); bumpSolved('chimp');
      after(function(){resultScreen('Reached',cleared+' numbers',(cleared>=4?'You held '+cleared+' positions in memory.':'A tricky start — give it another go.')+recordNote(rec,rec?null:getBest('chimp',diff),function(v){return v+' numbers';}),function(){runChimp(diff);});},900);}
    function finishWin(){cleared=count; var rec=saveBest('chimp',diff,cleared,'max'); bumpSolved('chimp');
      after(function(){resultScreen('Reached',cleared+' numbers','You filled the whole grid — remarkable memory.'+recordNote(rec,rec?null:getBest('chimp',diff),function(v){return v+' numbers';}),function(){runChimp(diff);});},700);}
    round();
  }

  /* ===== STATS PAGE ===== */
  var STATS_CONFIG=[
    {game:'match',name:'Pair Match',diffs:true,mode:'min',fmt:function(v){return v+' moves';}},
    {game:'sequence',name:'Sequence Recall',diffs:false,mode:'max',fmt:function(v){return v+' rounds';}},
    {game:'schulte',name:'Focus Grid',diffs:true,mode:'min',fmt:function(v){return v+'s';}},
    {game:'words',name:'Word Recall',diffs:true,mode:'max',fmt:function(v){return v+' correct';}},
    {game:'quiz',name:'General Knowledge',diffs:false,mode:'max',fmt:function(v){return v+'/10';}},
    {game:'tango',name:'Tango',diffs:true,mode:'min',fmt:function(v){return fmtTime(v);}},
    {game:'queens',name:'Queens',diffs:true,mode:'min',fmt:function(v){return fmtTime(v);}},
    {game:'zip',name:'Zip',diffs:true,mode:'min',fmt:function(v){return fmtTime(v);}},
    {game:'sudoku',name:'Mini Sudoku',diffs:true,mode:'min',fmt:function(v){return fmtTime(v);}},
    {game:'pinpoint',name:'Pinpoint',diffs:false,mode:'max',fmt:function(v){return v+' pts';}},
    {game:'reaction',name:'Reaction Time',diffs:true,mode:'min',fmt:function(v){return v+' ms';}},
    {game:'stroop',name:'Color Clash',diffs:true,mode:'max',fmt:function(v){return v+' correct';}},
    {game:'odd',name:'Odd One Out',diffs:true,mode:'max',fmt:function(v){return v+' found';}},
    {game:'chimp',name:'Chimp Test',diffs:true,mode:'max',fmt:function(v){return v+' numbers';}},
    {game:'cogstyle',name:'Cognitive Style',diffs:false,mode:'max',fmt:function(v){return v;},custom:function(){return store.get('cogstyle:last','—');}},
    {game:'crt',name:'Cognitive Reflection',diffs:false,mode:'max',fmt:function(v){return v+'/6';}},
    {game:'nback',name:'N-Back',diffs:false,mode:'max',fmt:function(v){return v+'%';}},
    {game:'slide',name:'Slide Puzzle',diffs:true,mode:'min',fmt:function(v){return fmtTime(v);}},
    {game:'lights',name:'Lights Out',diffs:true,mode:'min',fmt:function(v){return v+' taps';}},
    {game:'flood',name:'Color Flood',diffs:true,mode:'min',fmt:function(v){return v+' moves';}},
    {game:'target',name:'Target Rush',diffs:true,mode:'max',fmt:function(v){return v+' hits';}},
    {game:'mathsprint',name:'Math Sprint',diffs:true,mode:'max',fmt:function(v){return v+' solved';}},
    {game:'flash',name:'Flash Recall',diffs:true,mode:'max',fmt:function(v){return 'level '+v;}},
    {game:'palace',name:'Memory Palace',diffs:false,mode:'max',fmt:function(v){return v+' items';}},
    {game:'spot',name:'Spot the Difference',diffs:true,mode:'max',fmt:function(v){return v+' found';}},
    {game:'weave',name:'Pattern Weave',diffs:true,mode:'max',fmt:function(v){return 'level '+v;}}
  ];
  function renderStats(){
    statsBody.innerHTML='';
    var totalSolved=0; STATS_CONFIG.forEach(function(s){totalSolved+=getSolved(s.game);});
    var hero=el('div','stats-hero');
    function statCard(num,lbl,cls){var c=el('div','stat-card'+(cls?' '+cls:'')); c.appendChild(el('div','num',String(num))); c.appendChild(el('div','lbl',lbl)); return c;}
    hero.appendChild(statCard(currentStreak(),'Day streak','streak'));
    hero.appendChild(statCard(store.get('streak:longest',0),'Longest streak'));
    hero.appendChild(statCard(totalSolved,'Games played'));
    var withRec=0; STATS_CONFIG.forEach(function(s){if(s.diffs){if(getBest(s.game,'easy')!=null||getBest(s.game,'medium')!=null||getBest(s.game,'hard')!=null)withRec++;}else if(getBest(s.game,null)!=null)withRec++;});
    hero.appendChild(statCard(withRec+' / '+STATS_CONFIG.length,'Games with a record'));
    statsBody.appendChild(hero);

    var head=el('div','stats-head'); head.appendChild(el('h3','','Personal bests'));
    var resetBtn=el('button','danger-btn','Reset progress');
    resetBtn.addEventListener('click',function(){
      if(resetBtn.dataset.armed==='1'){store.clear(); renderStats();}
      else {resetBtn.dataset.armed='1'; resetBtn.textContent='Tap again to confirm'; after(function(){resetBtn.dataset.armed='0'; resetBtn.textContent='Reset progress';},3000);}
    });
    head.appendChild(resetBtn); statsBody.appendChild(head);

    if(totalSolved===0){statsBody.appendChild(el('div','stats-empty','No games played yet — your bests and streak will appear here.')); return;}
    var table=el('table','stats-table');
    var thead=el('tr'); ['Game','Best','Played'].forEach(function(t){thead.appendChild(el('th',null,t));}); table.appendChild(thead);
    STATS_CONFIG.forEach(function(s){
      var tr=el('tr');
      tr.appendChild(el('td','g',s.name));
      var bestTxt;
      if(s.custom){bestTxt=s.custom();}
      else if(s.diffs){var parts=[]; [['easy','E'],['medium','M'],['hard','H']].forEach(function(p){var b=getBest(s.game,p[0]); if(b!=null)parts.push(p[1]+' '+s.fmt(b));}); bestTxt=parts.length?parts.join('  ·  '):'—';}
      else {var b=getBest(s.game,null); bestTxt=(b!=null)?s.fmt(b):'—';}
      tr.appendChild(el('td','v',bestTxt));
      tr.appendChild(el('td',null,String(getSolved(s.game))));
      table.appendChild(tr);
    });
    statsBody.appendChild(table);
  }

  /* ===== SLIDE PUZZLE ===== */
  var SLIDE_DIFF={easy:3,medium:4,hard:5};
  function startSlide(){introDifficulty({title:'Slide Puzzle',body:'Slide tiles into the gap to restore the numbers in order, 1 through the end, with the gap last. Every shuffle is legally scrambled, so it is always solvable.',button:'Shuffle & start',game:'slide',diffs:DIFFS3,statLabel:'Best time',statFmt:function(v){return fmtTime(v);},onStart:function(d){runSlide(d);}});}
  function runSlide(diff){
    var n=SLIDE_DIFF[diff];
    var tiles=Array.from({length:n*n},function(_,i){return i;}); // 0 = blank
    function nb(i){var r=(i/n)|0,c=i%n,res=[]; if(r>0)res.push(i-n); if(r<n-1)res.push(i+n); if(c>0)res.push(i-1); if(c<n-1)res.push(i+1); return res;}
    var blank=0, prev=-1;
    for(var m=0;m<n*n*30;m++){var opts=nb(blank).filter(function(x){return x!==prev;}); var pick=opts[Math.floor(Math.random()*opts.length)];
      tiles[blank]=tiles[pick]; tiles[pick]=0; prev=blank; blank=pick;}
    stage.innerHTML='';
    stage.appendChild(el('p','rules','Tap a tile next to the gap to slide it. Restore 1\u2013'+(n*n-1)+' in reading order.'));
    var size=Math.min(380,Math.floor(window.innerWidth*0.9)); var cell=Math.floor((size-8*(n+1))/n);
    var grid=el('div','slide-grid'); grid.style.gridTemplateColumns='repeat('+n+', '+cell+'px)';
    stage.appendChild(grid);
    var moves=0; var timer=makeTimer(); var moveLine=el('p','status-line','0 moves'); stage.appendChild(moveLine);
    var row=el('div','btn-row'); var nw=el('button','btn-ghost','New shuffle'); nw.addEventListener('click',function(){runSlide(diff);}); row.appendChild(nw); stage.appendChild(row);
    function render(){
      grid.innerHTML='';
      tiles.forEach(function(v,i){
        var t=el('div','slide-tile'+(v===0?' blank':'')+(v!==0&&v===i+1- (i+1===n*n?0:0)&&v===i+1?'':'')); 
        if(v!==0){t.textContent=v; if(v===i+1)t.classList.add('homed');}
        t.style.width=cell+'px'; t.style.height=cell+'px';
        (function(i){t.addEventListener('click',function(){tryMove(i);});})(i);
        grid.appendChild(t);
      });
    }
    function tryMove(i){
      if(tiles[i]===0)return;
      var b=tiles.indexOf(0);
      if(nb(i).indexOf(b)<0)return;
      tiles[b]=tiles[i]; tiles[i]=0; moves++; moveLine.textContent=moves+' moves';
      render();
      if(solved()){var secs=timer.stop(); var rec=saveBest('slide',diff,secs,'min'); bumpSolved('slide');
        after(function(){resultScreen('Solved in',fmtTime(secs),moves+' moves.'+recordNote(rec,rec?null:getBest('slide',diff),function(v){return fmtTime(v);}),function(){runSlide(diff);});},450);}
    }
    function solved(){for(var i=0;i<n*n-1;i++)if(tiles[i]!==i+1)return false; return true;}
    render();
  }

  /* ===== LIGHTS OUT ===== */
  var LIGHTS_DIFF={easy:{n:4,presses:5},medium:{n:5,presses:8},hard:{n:5,presses:12}};
  function startLights(){introDifficulty({title:'Lights Out',body:'Tapping a light flips it and its four neighbors. Turn every light off. Boards are scrambled from darkness, so a solution always exists \u2014 fewer taps is better.',button:'Generate board',game:'lights',diffs:DIFFS3,statLabel:'Best (fewest taps)',statFmt:function(v){return v+' taps';},onStart:function(d){runLights(d);}});}
  function runLights(diff){
    var cfg=LIGHTS_DIFF[diff]; var n=cfg.n;
    var g=Array.from({length:n},function(){return Array(n).fill(0);});
    function press(r,c){[[0,0],[1,0],[-1,0],[0,1],[0,-1]].forEach(function(d){var nr=r+d[0],nc=c+d[1]; if(nr>=0&&nr<n&&nc>=0&&nc<n)g[nr][nc]^=1;});}
    var lit=0;
    var guard=0;
    while(lit===0&&guard<20){guard++;
      for(var r0=0;r0<n;r0++)for(var c0=0;c0<n;c0++)g[r0][c0]=0;
      for(var k=0;k<cfg.presses;k++)press(Math.floor(Math.random()*n),Math.floor(Math.random()*n));
      lit=0; g.forEach(function(row){row.forEach(function(v){lit+=v;});});
    }
    stage.innerHTML='';
    stage.appendChild(el('p','rules','Turn all the lights off. Each tap flips the light and its neighbors.'));
    var size=Math.min(360,Math.floor(window.innerWidth*0.9)); var cell=Math.floor((size-10*(n-1))/n);
    var grid=el('div','lights-grid'); grid.style.gridTemplateColumns='repeat('+n+', '+cell+'px)';
    stage.appendChild(grid);
    var taps=0; gameStat.textContent='Taps: 0';
    var cells=[];
    for(var r=0;r<n;r++){cells[r]=[];
      for(var c=0;c<n;c++){
        var d=el('div','lights-cell'); d.style.width=cell+'px'; d.style.height=cell+'px';
        (function(r,c){d.addEventListener('click',function(){taps++; gameStat.textContent='Taps: '+taps; press(r,c); paint(); checkWin();});})(r,c);
        grid.appendChild(d); cells[r][c]=d;
      }}
    var row=el('div','btn-row'); var nw=el('button','btn-ghost','New board'); nw.addEventListener('click',function(){runLights(diff);}); row.appendChild(nw); stage.appendChild(row);
    function paint(){for(var r=0;r<n;r++)for(var c=0;c<n;c++)cells[r][c].classList.toggle('on',g[r][c]===1);}
    function checkWin(){var on=0; g.forEach(function(row){row.forEach(function(v){on+=v;});});
      if(on===0){var rec=saveBest('lights',diff,taps,'min'); bumpSolved('lights');
        after(function(){resultScreen('Taps',taps,'Board scrambled with '+cfg.presses+' presses \u2014 par is '+cfg.presses+'.'+recordNote(rec,rec?null:getBest('lights',diff),function(v){return v+' taps';}),function(){runLights(diff);});},400);}}
    paint();
  }

  /* ===== COLOR FLOOD ===== */
  var FLOOD_COLORS=['#E0A43A','#E8734F','#B072C0','#33A8C0','#4FB58E','#7C8CE0'];
  var FLOOD_DIFF={easy:{n:9,colors:5},medium:{n:12,colors:6},hard:{n:14,colors:6}};
  function floodRegion(b,n){
    var c0=b[0][0]; var seen=Array.from({length:n},function(){return Array(n).fill(false);});
    var st=[[0,0]]; seen[0][0]=true; var cells=[[0,0]];
    while(st.length){var p=st.pop();
      [[1,0],[-1,0],[0,1],[0,-1]].forEach(function(d){var r=p[0]+d[0],c=p[1]+d[1];
        if(r>=0&&r<n&&c>=0&&c<n&&!seen[r][c]&&b[r][c]===c0){seen[r][c]=true; st.push([r,c]); cells.push([r,c]);}});}
    return cells;
  }
  function floodGreedy(board,n,colors){
    var b=board.map(function(r){return r.slice();}); var moves=0;
    while(true){
      var reg=floodRegion(b,n); if(reg.length===n*n)return moves;
      var best=-1,bestGain=-1;
      for(var col=0;col<colors;col++){ if(col===b[0][0])continue;
        var b2=b.map(function(r){return r.slice();}); reg.forEach(function(p){b2[p[0]][p[1]]=col;});
        var gain=floodRegion(b2,n).length;
        if(gain>bestGain){bestGain=gain; best=col;}}
      reg.forEach(function(p){b[p[0]][p[1]]=best;}); moves++;
      if(moves>300)return 999;
    }
  }
  function startFlood(){introDifficulty({title:'Color Flood',body:'The board floods from the top-left corner. Each move you pick a color; every connected cell of that color joins your flood. Paint the whole board within the move budget \u2014 the budget is set two above what a greedy computer needs, so every board is beatable.',button:'Generate board',game:'flood',diffs:DIFFS3,statLabel:'Best (fewest moves)',statFmt:function(v){return v+' moves';},onStart:function(d){withGenerating(function(){runFlood(d);});}});}
  function runFlood(diff){
    var cfg=FLOOD_DIFF[diff]; var n=cfg.n, nCol=cfg.colors;
    var board=Array.from({length:n},function(){return Array.from({length:n},function(){return Math.floor(Math.random()*nCol);});});
    var par=floodGreedy(board,n,nCol); var budget=par+2;
    var moves=0;
    stage.innerHTML='';
    stage.appendChild(el('p','rules','Flood from the top-left. Fill the board in '+budget+' moves or fewer (computer par: '+par+').'));
    var size=Math.min(420,Math.floor(window.innerWidth*0.92)); var cell=Math.floor((size-2*(n-1))/n);
    var grid=el('div','flood-grid'); grid.style.gridTemplateColumns='repeat('+n+', '+cell+'px)';
    var cells=[];
    for(var r=0;r<n;r++){cells[r]=[];
      for(var c=0;c<n;c++){var d=el('div','flood-cell'); d.style.width=cell+'px'; d.style.height=cell+'px'; grid.appendChild(d); cells[r][c]=d;}}
    stage.appendChild(grid);
    var palette=el('div','flood-palette');
    var swatches=[];
    for(var col=0;col<nCol;col++){
      var s=el('button','flood-swatch'); s.style.background=FLOOD_COLORS[col]; s.setAttribute('aria-label','color '+(col+1));
      (function(col,s){s.addEventListener('click',function(){pick(col);});})(col,s);
      palette.appendChild(s); swatches.push(s);
    }
    stage.appendChild(palette);
    var status=el('p','status-line',''); stage.appendChild(status);
    var row=el('div','btn-row'); var nw=el('button','btn-ghost','New board'); nw.addEventListener('click',function(){withGenerating(function(){runFlood(diff);});}); row.appendChild(nw); stage.appendChild(row);
    function paint(){for(var r=0;r<n;r++)for(var c=0;c<n;c++)cells[r][c].style.background=FLOOD_COLORS[board[r][c]];
      swatches.forEach(function(s,i){s.classList.toggle('current',i===board[0][0]);});
      gameStat.textContent=moves+' / '+budget;}
    function pick(col){
      if(col===board[0][0]||moves>=budget)return;
      var reg=floodRegion(board,n); reg.forEach(function(p){board[p[0]][p[1]]=col;});
      moves++; paint(); SFX.click();
      var covered=floodRegion(board,n).length;
      if(covered===n*n){var rec=saveBest('flood',diff,moves,'min'); bumpSolved('flood');
        after(function(){resultScreen('Moves',moves,(moves<=par?'You matched the computer \u2014 or beat it.':'Flooded within budget ('+budget+').')+recordNote(rec,rec?null:getBest('flood',diff),function(v){return v+' moves';}),function(){withGenerating(function(){runFlood(diff);});});},350); return;}
      if(moves>=budget){status.style.color='var(--rust)'; status.textContent='Out of moves \u2014 '+Math.round(covered/(n*n)*100)+'% flooded. Try a new board.'; SFX.bad();}
      else {status.style.color='var(--muted)'; status.textContent=Math.round(covered/(n*n)*100)+'% flooded';}
    }
    paint();
  }

  /* ===== TARGET RUSH ===== */
  var TARGET_DIFF={easy:{time:30,up:950,decoy:0},medium:{time:30,up:750,decoy:0.18},hard:{time:25,up:580,decoy:0.28}};
  function startTarget(){introDifficulty({title:'Target Rush',body:'Targets light up around the grid and vanish fast. Tap them before they disappear to score and build a combo. On higher difficulties, red \u2715 decoys appear \u2014 tapping one costs two seconds.',button:'Start',game:'target',diffs:DIFFS3,statLabel:'Best (hits)',statFmt:function(v){return v+' hits';},onStart:function(d){runTarget(d);}});}
  function runTarget(diff){
    var cfg=TARGET_DIFF[diff]; var score=0,timeLeft=cfg.time,combo=0,active=-1,isDecoy=false,spawnId=null;
    stage.innerHTML='';
    stage.appendChild(el('p','rules',cfg.decoy>0?'Tap the glowing targets. Avoid the red \u2715 decoys \u2014 they cost two seconds.':'Tap the glowing targets before they vanish.'));
    var grid=el('div','target-grid'); var pads=[];
    for(var i=0;i<9;i++){(function(i){var p=el('div','target-pad');
      p.addEventListener('click',function(){
        if(i!==active||timeLeft<=0)return;
        if(isDecoy){combo=0; SFX.bad(); timeLeft=Math.max(0,timeLeft-2); p.classList.add('t-bad'); after(function(){p.classList.remove('t-bad');},220); clearPad(); reschedule();}
        else {score++; combo++; comboPop(combo,grid); p.classList.add('t-hit'); after(function(){p.classList.remove('t-hit');},220); clearPad(); updateStat(); reschedule();}
      });
      grid.appendChild(p); pads.push(p);})(i);}
    stage.appendChild(grid);
    var status=el('p','status-line',''); stage.appendChild(status);
    function updateStat(){gameStat.textContent=Math.max(timeLeft,0)+'s \u00B7 '+score;}
    updateStat();
    var clock=every(function(){timeLeft--; updateStat(); if(timeLeft<=0)finish();},1000);
    function clearPad(){if(active>=0){pads[active].classList.remove('t-on','t-decoy'); active=-1;}}
    function reschedule(){if(spawnId){clearTimeout(spawnId);} spawnId=after(spawn,140);}
    function spawn(){
      if(timeLeft<=0)return;
      clearPad();
      var next=Math.floor(Math.random()*9);
      active=next; isDecoy=cfg.decoy>0&&Math.random()<cfg.decoy;
      pads[active].classList.add(isDecoy?'t-decoy':'t-on');
      spawnId=after(function(){ if(active===next&&!isDecoy){combo=0;} clearPad(); spawn(); },cfg.up);
    }
    function finish(){clearInterval(clock); if(spawnId)clearTimeout(spawnId); clearPad();
      var rec=saveBest('target',diff,score,'max'); bumpSolved('target');
      after(function(){resultScreen('Hits',score,'In '+cfg.time+' seconds.'+recordNote(rec,rec?null:getBest('target',diff),function(v){return v+' hits';}),function(){runTarget(diff);});},250);}
    spawn();
  }

  /* ===== MATH SPRINT ===== */
  var MATH_DIFF={easy:{time:45,mul:false,max:12},medium:{time:45,mul:true,max:12},hard:{time:40,mul:true,max:19}};
  function startMathsprint(){introDifficulty({title:'Math Sprint',body:'Quick-fire arithmetic. Tap the right answer to score and keep your combo alive; a wrong tap costs three seconds. Higher difficulties add multiplication and bigger numbers.',button:'Start',game:'mathsprint',diffs:DIFFS3,statLabel:'Best (solved)',statFmt:function(v){return v+' solved';},onStart:function(d){runMathsprint(d);}});}
  function runMathsprint(diff){
    var cfg=MATH_DIFF[diff]; var score=0,timeLeft=cfg.time,combo=0,answer=0,locked=false;
    stage.innerHTML='';
    stage.appendChild(el('p','rules','Tap the correct answer \u2014 fast. Wrong answers cost three seconds.'));
    var qEl=el('div','math-q',''); stage.appendChild(qEl);
    var opts=el('div','math-opts'); stage.appendChild(opts);
    function updateStat(){gameStat.textContent=Math.max(timeLeft,0)+'s \u00B7 '+score;}
    updateStat();
    var clock=every(function(){timeLeft--; updateStat(); if(timeLeft<=0)finish();},1000);
    function nextQ(){
      locked=false;
      var ops=cfg.mul?['+','-','\u00D7']:['+','-'];
      var op=ops[Math.floor(Math.random()*ops.length)];
      var a,b;
      if(op==='\u00D7'){a=2+Math.floor(Math.random()*(Math.min(cfg.max,12)-1)); b=2+Math.floor(Math.random()*8); answer=a*b;}
      else if(op==='-'){a=2+Math.floor(Math.random()*cfg.max); b=1+Math.floor(Math.random()*(a-1)); answer=a-b;}
      else {a=1+Math.floor(Math.random()*cfg.max); b=1+Math.floor(Math.random()*cfg.max); answer=a+b;}
      qEl.textContent=a+' '+op+' '+b+' = ?';
      var set={}; set[answer]=1; var choices=[answer];
      var guard=0;
      while(choices.length<4&&guard<60){guard++; var d=answer+(Math.floor(Math.random()*9)-4); if(d>=0&&!set[d]){set[d]=1; choices.push(d);}}
      while(choices.length<4){choices.push(answer+choices.length*3);}
      choices=shuffle(choices);
      opts.innerHTML='';
      choices.forEach(function(v){var b2=el('button','math-opt',String(v));
        b2.addEventListener('click',function(){
          if(locked||timeLeft<=0)return;
          if(v===answer){locked=true; score++; combo++; comboPop(combo,qEl); b2.classList.add('m-good'); updateStat(); after(nextQ,140);}
          else {combo=0; SFX.bad(); timeLeft=Math.max(0,timeLeft-3); updateStat(); b2.classList.add('m-bad'); after(function(){b2.classList.remove('m-bad');},260);}
        });
        opts.appendChild(b2);});
    }
    function finish(){clearInterval(clock);
      var rec=saveBest('mathsprint',diff,score,'max'); bumpSolved('mathsprint');
      after(function(){resultScreen('Solved',score,'In '+cfg.time+' seconds.'+recordNote(rec,rec?null:getBest('mathsprint',diff),function(v){return v+' solved';}),function(){runMathsprint(diff);});},250);}
    nextQ();
  }

  /* ===== FLASH RECALL (rapid visual encoding) ===== */
  var FLASH_DIFF={easy:{n:3,ms:700,start:3},medium:{n:4,ms:500,start:4},hard:{n:5,ms:350,start:5}};
  function startFlash(){introDifficulty({title:'Flash Recall',body:"A pattern of tiles flashes for a fraction of a second, then vanishes. Tap the tiles you saw. Each level adds one tile and shortens the flash. This trains rapid visual encoding \u2014 how much you can take in from a single glance.",button:'Start',game:'flash',diffs:DIFFS3,statLabel:'Best level',statFmt:function(v){return 'level '+v;},onStart:function(d){runFlash(d);}});}
  function runFlash(diff){
    var cfg=FLASH_DIFF[diff]; var n=cfg.n, level=cfg.start, cleared=0;
    function round(){
      var total=n*n, count=Math.min(level,total-1);
      var target={}; var picks=shuffle(Array.from({length:total},function(_,i){return i;})).slice(0,count);
      picks.forEach(function(i){target[i]=1;});
      stage.innerHTML='';
      stage.appendChild(el('p','rules','Memorize the lit tiles \u2014 they vanish fast.'));
      var grid=el('div','flash-grid'); grid.style.gridTemplateColumns='repeat('+n+',1fr)'; grid.style.width='min('+(n*72)+'px,86vw)';
      var cells=[];
      for(var i=0;i<total;i++){(function(i){var d=el('div','flash-cell');
        d.addEventListener('click',function(){ if(!accepting)return; d.classList.toggle('sel'); });
        grid.appendChild(d); cells.push(d);})(i);}
      stage.appendChild(grid);
      var status=el('p','status-line','Watch\u2026'); stage.appendChild(status);
      var submit=el('button','btn-primary','Submit'); submit.disabled=true; stage.appendChild(submit);
      gameStat.textContent='Level '+level;
      var accepting=false;
      picks.forEach(function(i){cells[i].classList.add('lit');});
      after(function(){
        picks.forEach(function(i){cells[i].classList.remove('lit');});
        accepting=true; submit.disabled=false;
        status.textContent='Tap the '+count+' tile'+(count>1?'s':'')+' you saw.';
      }, cfg.ms);
      submit.addEventListener('click',function(){
        if(!accepting)return; accepting=false; submit.disabled=true;
        var ok=true;
        cells.forEach(function(d,i){
          var sel=d.classList.contains('sel'), want=!!target[i];
          if(sel&&want)d.classList.add('right');
          else if(sel&&!want){d.classList.add('wrong'); ok=false;}
          else if(!sel&&want){d.classList.add('missed'); ok=false;}
        });
        if(ok){cleared=level; SFX.good(); status.style.color='var(--sage)'; status.textContent='Perfect.'; level++; after(round,900);}
        else {status.style.color='var(--rust)'; status.textContent='Not quite.'; fail();}
      });
    }
    function fail(){
      var rec=saveBest('flash',diff,cleared,'max'); bumpSolved('flash');
      after(function(){resultScreen('Level reached',cleared||0,(cleared>=6?'Strong visual encoding.':'Glance memory improves fast with practice.')+recordNote(rec,rec?null:getBest('flash',diff),function(v){return 'level '+v;}),function(){runFlash(diff);});},1100);
    }
    round();
  }

  /* ===== MEMORY PALACE (method of loci) ===== */
  var PALACE_ITEMS=['\ud83d\udd11','\ud83d\udcda','\ud83d\udd6f','\ud83c\udf4e','\u2602','\ud83e\uddf8','\u231a','\ud83d\udcf7','\ud83c\udfa9','\ud83d\udd28','\ud83e\uded6','\ud83c\udf3b'];
  var PALACE_ROOMS=['Front door','Hallway','Kitchen','Living room','Staircase','Bedroom','Study','Balcony','Garden'];
  function startPalace(){introSimple({title:'Memory Palace',body:"The technique every memory champion uses: walk a familiar route and leave a vivid object at each stop. Objects appear one by one along the route \u2014 then retrace it and place them back in order. Each round adds a stop.",button:'Begin the walk',game:'palace',statLabel:'Best route',statFmt:function(v){return v+' items';},onStart:runPalace});}
  function runPalace(){
    var route=[], cleared=0, len=3;
    function round(){
      route=[];
      var rooms=shuffle(PALACE_ROOMS).slice(0,Math.min(len,PALACE_ROOMS.length));
      var items=shuffle(PALACE_ITEMS).slice(0,rooms.length);
      for(var i=0;i<rooms.length;i++)route.push({room:rooms[i],item:items[i]});
      stage.innerHTML='';
      stage.appendChild(el('p','rules','Walk the route. Picture each object vividly in its place.'));
      var walk=el('div','palace-walk'); stage.appendChild(walk);
      gameStat.textContent=route.length+' stops';
      var i2=0;
      function showStop(){
        if(i2>=route.length){after(quiz,700); return;}
        var s=route[i2];
        var stop=el('div','palace-stop');
        stop.appendChild(el('div','p-item',s.item));
        stop.appendChild(el('div','p-room',s.room));
        walk.appendChild(stop);
        SFX.click(); i2++;
        after(showStop,1150);
      }
      showStop();
    }
    function quiz(){
      stage.innerHTML='';
      stage.appendChild(el('h2',null,'Now walk it back'));
      stage.appendChild(el('p','rules','Which object did you leave here?'));
      var qi=0, ok=true;
      function ask(){
        if(qi>=route.length){ if(ok){cleared=route.length; SFX.good(); len++; after(round,700);} else fail(); return; }
        var s=route[qi];
        var body=stage.querySelector('.palace-quiz'); if(body)body.remove();
        var box=el('div','palace-quiz');
        box.appendChild(el('div','p-room-big',s.room));
        var opts=el('div','palace-opts');
        var wrong=shuffle(PALACE_ITEMS.filter(function(x){return x!==s.item;})).slice(0,3);
        shuffle(wrong.concat([s.item])).forEach(function(it){
          var b=el('button','palace-opt',it);
          b.addEventListener('click',function(){
            if(it===s.item){b.classList.add('right'); SFX.click(); qi++; after(ask,320);}
            else {b.classList.add('wrong'); SFX.bad(); ok=false; qi++; after(ask,600);}
          });
          opts.appendChild(b);
        });
        box.appendChild(opts); stage.appendChild(box);
        gameStat.textContent='Stop '+(qi+1)+' / '+route.length;
      }
      ask();
    }
    function fail(){
      var rec=saveBest('palace',null,cleared,'max'); bumpSolved('palace');
      after(function(){resultScreen('Route length',cleared||0,(cleared>=8?'You are building real palaces.':'The loci method rewards vivid, absurd imagery \u2014 the weirder the better.')+recordNote(rec,rec?null:getBest('palace',null),function(v){return v+' items';}),runPalace);},800);
    }
    round();
  }

  /* ===== SPOT THE DIFFERENCE ===== */
  var SPOT_DIFF={easy:{n:4,time:60},medium:{n:5,time:60},hard:{n:6,time:50}};
  function startSpot(){introDifficulty({title:'Spot the Difference',body:'Two grids sit side by side, identical except for a single tile. Find the odd tile and tap it. Each find brings a fresh pair \u2014 how many can you catch before the clock runs out?',button:'Start',game:'spot',diffs:DIFFS3,statLabel:'Best (found)',statFmt:function(v){return v+' found';},onStart:function(d){runSpot(d);}});}
  function runSpot(diff){
    var cfg=SPOT_DIFF[diff]; var n=cfg.n, score=0, timeLeft=cfg.time, combo=0;
    var PAL=['#E0A43A','#7C8CE0','#4FB58E','#E8734F','#B072C0','#33A8C0'];
    stage.innerHTML='';
    stage.appendChild(el('p','rules','One tile differs between the two grids. Tap it on either side.'));
    var pair=el('div','spot-pair'); stage.appendChild(pair);
    var status=el('p','status-line',''); stage.appendChild(status);
    function updateStat(){gameStat.textContent=Math.max(timeLeft,0)+'s \u00b7 '+score;}
    updateStat();
    var clock=every(function(){timeLeft--; updateStat(); if(timeLeft<=0)finish();},1000);
    function round(){
      pair.innerHTML='';
      var total=n*n;
      var colors=[]; for(var i=0;i<total;i++)colors.push(PAL[Math.floor(Math.random()*PAL.length)]);
      var oddIdx=Math.floor(Math.random()*total);
      var alt=PAL[Math.floor(Math.random()*PAL.length)];
      var guard=0; while(alt===colors[oddIdx]&&guard<20){alt=PAL[Math.floor(Math.random()*PAL.length)]; guard++;}
      [0,1].forEach(function(side){
        var g=el('div','spot-grid'); g.style.gridTemplateColumns='repeat('+n+',1fr)';
        for(var i=0;i<total;i++){(function(i){
          var d=el('div','spot-cell');
          d.style.background=(side===1&&i===oddIdx)?alt:colors[i];
          d.addEventListener('click',function(){
            if(timeLeft<=0)return;
            if(i===oddIdx){score++; combo++; comboPop(combo,pair); updateStat(); status.style.color='var(--sage)'; status.textContent='Found it.'; round();}
            else {combo=0; SFX.bad(); timeLeft=Math.max(0,timeLeft-3); updateStat(); d.classList.add('miss'); after(function(){d.classList.remove('miss');},260); status.style.color='var(--rust)'; status.textContent='Not that one \u2014 3s lost.';}
          });
          g.appendChild(d);})(i);}
        pair.appendChild(g);
      });
    }
    function finish(){clearInterval(clock);
      var rec=saveBest('spot',diff,score,'max'); bumpSolved('spot');
      after(function(){resultScreen('Found',score,'In '+cfg.time+' seconds.'+recordNote(rec,rec?null:getBest('spot',diff),function(v){return v+' found';}),function(){runSpot(diff);});},250);}
    round();
  }

  /* ===== PATTERN WEAVE (visual span) ===== */
  var WEAVE_DIFF={easy:{n:3,study:3500},medium:{n:4,study:3000},hard:{n:5,study:2600}};
  function startWeave(){introDifficulty({title:'Pattern Weave',body:'Study a colored grid, then rebuild it from memory using the palette. Each level colors one more tile. This stretches your visual span \u2014 how much of a scene you can hold at once.',button:'Start',game:'weave',diffs:DIFFS3,statLabel:'Best level',statFmt:function(v){return 'level '+v;},onStart:function(d){runWeave(d);}});}
  function runWeave(diff){
    var cfg=WEAVE_DIFF[diff]; var n=cfg.n, level=3, cleared=0;
    var PAL=['#E0A43A','#7C8CE0','#4FB58E','#E8734F','#B072C0'];
    function round(){
      var total=n*n, count=Math.min(level,total);
      var idxs=shuffle(Array.from({length:total},function(_,i){return i;})).slice(0,count);
      var target={}; idxs.forEach(function(i){target[i]=PAL[Math.floor(Math.random()*PAL.length)];});
      stage.innerHTML='';
      stage.appendChild(el('p','rules','Memorize the pattern.'));
      var grid=el('div','weave-grid'); grid.style.gridTemplateColumns='repeat('+n+',1fr)'; grid.style.width='min('+(n*70)+'px,86vw)';
      var cells=[];
      for(var i=0;i<total;i++){var d=el('div','weave-cell'); if(target[i])d.style.background=target[i]; grid.appendChild(d); cells.push(d);}
      stage.appendChild(grid);
      var status=el('p','status-line','Study it\u2026'); stage.appendChild(status);
      gameStat.textContent='Level '+level;
      after(function(){
        cells.forEach(function(d){d.style.background=''; d.classList.add('blank');});
        status.textContent='Rebuild it. Pick a color, then paint the tiles.';
        var chosen=PAL[0];
        var pal=el('div','weave-palette');
        PAL.forEach(function(col){var s=el('button','weave-swatch'); s.style.background=col;
          if(col===chosen)s.classList.add('on');
          s.addEventListener('click',function(){chosen=col; pal.querySelectorAll('.weave-swatch').forEach(function(x){x.classList.remove('on');}); s.classList.add('on');});
          pal.appendChild(s);});
        stage.insertBefore(pal, status);
        var painted={};
        cells.forEach(function(d,i){d.addEventListener('click',function(){
          if(painted[i]===chosen){delete painted[i]; d.style.background=''; return;}
          painted[i]=chosen; d.style.background=chosen; SFX.click();});});
        var submit=el('button','btn-primary','Submit'); stage.appendChild(submit);
        submit.addEventListener('click',function(){
          submit.disabled=true;
          var ok=true;
          for(var i=0;i<total;i++){ if((target[i]||null)!==(painted[i]||null)){ok=false; break;} }
          if(ok){cleared=level; SFX.good(); status.style.color='var(--sage)'; status.textContent='Woven perfectly.'; level++; after(round,900);}
          else {status.style.color='var(--rust)'; status.textContent='Not quite \u2014 here was the pattern.';
            cells.forEach(function(d,i){d.style.background=target[i]||''; if(target[i])d.classList.add('reveal');});
            fail();}
        });
      }, cfg.study);
    }
    function fail(){
      var rec=saveBest('weave',diff,cleared,'max'); bumpSolved('weave');
      after(function(){resultScreen('Level reached',cleared||0,'Visual span grows with practice.'+recordNote(rec,rec?null:getBest('weave',diff),function(v){return 'level '+v;}),function(){runWeave(diff);});},1500);
    }
    round();
  }

  /* =========================================================
     DAILY LEADERBOARD (optional serverless backend)
     Set API_BASE to your Cloudflare Worker URL to enable.
     With no backend it degrades to a local-only personal log.
     ========================================================= */
  var API_BASE=''; /* e.g. 'https://aperture-daily.<you>.workers.dev' */
  function playerName(){
    var n=store.get('player:name',null);
    if(!n){ n='Player'+Math.floor(1000+Math.random()*9000); store.set('player:name',n); }
    return n;
  }
  function setPlayerName(n){ n=(n||'').trim().slice(0,16); if(n)store.set('player:name',n); }
  function dailyKey(){ return dstr(new Date()); }

  function lbSubmit(seconds){
    var entry={name:playerName(), secs:Math.round(seconds), game:todaysGame(), day:dailyKey()};
    /* always keep a local record */
    var mine=store.get('daily:mine',{}); mine[dailyKey()]=entry; store.set('daily:mine',mine);
    if(!API_BASE) return Promise.resolve(null);
    return fetch(API_BASE+'/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(entry)})
      .then(function(r){return r.ok?r.json():null;}).catch(function(){return null;});
  }
  function lbFetch(){
    if(!API_BASE) return Promise.resolve(null);
    return fetch(API_BASE+'/board?day='+encodeURIComponent(dailyKey()))
      .then(function(r){return r.ok?r.json():null;}).catch(function(){return null;});
  }
  function showLeaderboard(mySecs){
    var box=el('div','lb-box');
    box.appendChild(el('div','lb-title','Today\u2019s Daily \u00b7 '+GAME_META[todaysGame()].title));
    var body=el('div','lb-body'); box.appendChild(body);
    body.appendChild(el('p','status-line','Loading board\u2026'));
    stage.appendChild(box);
    lbFetch().then(function(data){
      body.innerHTML='';
      if(!data||!data.top){
        var mine=store.get('daily:mine',{});
        var days=Object.keys(mine).sort().reverse().slice(0,5);
        body.appendChild(el('p','lb-note','Global board is offline \u2014 here is your own daily history.'));
        var list=el('div','lb-list');
        days.forEach(function(d){
          var e=mine[d]; var rowx=el('div','lb-row'+(d===dailyKey()?' me':''));
          rowx.appendChild(el('span','lb-rank',d===dailyKey()?'Today':d));
          rowx.appendChild(el('span','lb-name',GAME_META[e.game]?GAME_META[e.game].title:e.game));
          rowx.appendChild(el('span','lb-score',fmtTime(e.secs)));
          list.appendChild(rowx);
        });
        body.appendChild(list);
        return;
      }
      var list=el('div','lb-list');
      data.top.forEach(function(e,i){
        var rowx=el('div','lb-row'+(e.name===playerName()?' me':''));
        rowx.appendChild(el('span','lb-rank','#'+(i+1)));
        rowx.appendChild(el('span','lb-name',e.name));
        rowx.appendChild(el('span','lb-score',fmtTime(e.secs)));
        list.appendChild(rowx);
      });
      body.appendChild(list);
      var meta=el('p','lb-note','');
      meta.textContent=(data.rank?('You placed #'+data.rank+' of '+data.total+' today.'):(data.total+' players solved it today.'));
      body.appendChild(meta);
      var rename=el('button','btn-ghost','Change name');
      rename.addEventListener('click',function(){
        var n=window.prompt('Name shown on the daily board (max 16 chars):',playerName());
        if(n){setPlayerName(n); lbSubmit(mySecs).then(function(){stage.querySelector('.lb-box').remove(); showLeaderboard(mySecs);});}
      });
      body.appendChild(rename);
    });
  }

  /* =========================================================
     SHARE CARDS — canvas-drawn result image
     ========================================================= */
  var SHARE_URL=(location.origin&&location.origin.indexOf('http')===0)?(location.origin+location.pathname):'';
  function roundRect(g,x,y,w,h,r){g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath();}
  function drawShareCard(opts){
    /* 1080x1080 — works as a WhatsApp/IG post; IG Stories crops gracefully */
    var W=1080,H=1080;
    var cv=document.createElement('canvas'); cv.width=W; cv.height=H;
    var g=cv.getContext('2d'); if(!g)return null;
    var accent=opts.accent||'#E0A43A';
    /* background */
    g.fillStyle='#12151C'; g.fillRect(0,0,W,H);
    /* accent glow */
    var grd=g.createRadialGradient(W*0.78,H*0.16,20,W*0.78,H*0.16,W*0.72);
    grd.addColorStop(0,accent); grd.addColorStop(1,'rgba(18,21,28,0)');
    g.globalAlpha=0.28; g.fillStyle=grd; g.fillRect(0,0,W,H); g.globalAlpha=1;
    var grd2=g.createRadialGradient(W*0.12,H*0.92,20,W*0.12,H*0.92,W*0.6);
    grd2.addColorStop(0,accent); grd2.addColorStop(1,'rgba(18,21,28,0)');
    g.globalAlpha=0.16; g.fillStyle=grd2; g.fillRect(0,0,W,H); g.globalAlpha=1;
    /* card panel */
    g.fillStyle='rgba(27,32,48,0.86)'; roundRect(g,80,150,W-160,H-380,36); g.fill();
    g.strokeStyle='rgba(255,255,255,0.10)'; g.lineWidth=2; g.stroke();
    /* accent cap */
    g.fillStyle=accent; roundRect(g,80,150,W-160,10,6); g.fill();
    /* aperture mark */
    g.strokeStyle=accent; g.lineWidth=4;
    g.beginPath(); g.arc(W/2,255,42,0,Math.PI*2); g.stroke();
    g.setLineDash([7,9]); g.beginPath(); g.arc(W/2,255,26,0,Math.PI*2); g.stroke(); g.setLineDash([]);
    g.fillStyle=accent; g.beginPath(); g.arc(W/2,255,8,0,Math.PI*2); g.fill();
    /* game name */
    g.textAlign='center'; g.fillStyle='#ECEBE5';
    g.font='600 46px Georgia, serif';
    g.fillText(opts.game||'Aperture', W/2, 375);
    /* label */
    g.fillStyle='#9AA0B8'; g.font='500 26px "Courier New", monospace';
    g.fillText((opts.label||'').toUpperCase(), W/2, 440);
    /* big value */
    g.fillStyle=accent; g.font='700 152px "Courier New", monospace';
    g.fillText(String(opts.value||''), W/2, 600);
    /* title / record tag */
    if(opts.title){
      var tw=g.measureText(opts.title).width;
      g.font='600 30px "Courier New", monospace';
      tw=g.measureText(opts.title.toUpperCase()).width;
      g.strokeStyle=accent; g.lineWidth=2;
      roundRect(g,W/2-tw/2-28,640,tw+56,60,30); g.stroke();
      g.fillStyle=accent; g.fillText(opts.title.toUpperCase(), W/2, 680);
    }
    /* record banner */
    if(opts.record){
      g.fillStyle='#E0A43A'; g.font='600 32px "Courier New", monospace';
      g.fillText('\u2605  NEW PERSONAL BEST  \u2605', W/2, 760);
    }
    /* difficulty */
    if(opts.diff){
      g.fillStyle='#9AA0B8'; g.font='500 26px "Courier New", monospace';
      g.fillText(opts.diff.toUpperCase()+' MODE', W/2, opts.record?815:775);
    }
    /* footer */
    g.fillStyle='#ECEBE5'; g.font='600 40px Georgia, serif';
    g.fillText('Aperture', W/2, H-150);
    g.fillStyle='#9AA0B8'; g.font='500 24px "Courier New", monospace';
    g.fillText(SHARE_URL?SHARE_URL.replace(/^https?:\/\//,''):'Free brain training \u00b7 no limits', W/2, H-100);
    return cv;
  }
  function shareResult(opts){
    var cv=drawShareCard(opts); if(!cv)return;
    var caption=(opts.record?'New personal best on ':'My score on ')+(opts.game||'Aperture')+': '+opts.value+(opts.label?(' '+opts.label.toLowerCase()):'')+'. '+(SHARE_URL||'');
    cv.toBlob(function(blob){
      if(!blob)return;
      var file=null;
      try{file=new File([blob],'aperture-result.png',{type:'image/png'});}catch(e){}
      if(file&&navigator.canShare&&navigator.canShare({files:[file]})&&navigator.share){
        navigator.share({files:[file],text:caption}).catch(function(){});
      } else {
        var url=URL.createObjectURL(blob);
        var a=document.createElement('a'); a.href=url; a.download='aperture-result.png'; document.body.appendChild(a); a.click();
        document.body.removeChild(a); setTimeout(function(){URL.revokeObjectURL(url);},2000);
      }
    },'image/png');
  }

  /* =========================================================
     PLAYFUL LAYER: sound, confetti, titles, facts, daily, home
     ========================================================= */

  /* ---- sound engine (lazy AudioContext, toggleable) ---- */
  var soundOn=store.get('sound',true), audioCtx=null;
  function ctx(){if(!audioCtx){try{audioCtx=new (window.AudioContext||window.webkitAudioContext)();}catch(e){}} return audioCtx;}
  function tone(freq,dur,type,vol,when){var a=ctx(); if(!a)return; var t=a.currentTime+(when||0);
    var o=a.createOscillator(), g=a.createGain(); o.type=type||'sine'; o.frequency.value=freq;
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(vol||0.12,t+0.012); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t+dur+0.05);}
  var SFX={
    click:function(){if(!soundOn)return; tone(660,0.06,'triangle',0.05);},
    good:function(){if(!soundOn)return; tone(740,0.09,'sine',0.09); tone(988,0.12,'sine',0.09,0.07);},
    bad:function(){if(!soundOn)return; tone(180,0.14,'square',0.05);},
    solve:function(){if(!soundOn)return; tone(587,0.1,'sine',0.1); tone(784,0.12,'sine',0.1,0.09); tone(988,0.18,'sine',0.1,0.18);},
    record:function(){if(!soundOn)return; [523,659,784,1047].forEach(function(f,i){tone(f,0.16,'sine',0.11,i*0.09);});}
  };
  var soundToggle=document.getElementById('sound-toggle');
  var SND_ON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12"/></svg>';
  var SND_OFF='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M11 5 6 9H2v6h4l5 4V5z"/><line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/></svg>';
  function paintSound(){soundToggle.innerHTML=soundOn?SND_ON:SND_OFF;}
  soundToggle.addEventListener('click',function(){soundOn=!soundOn; store.set('sound',soundOn); paintSound(); if(soundOn)SFX.click();});
  paintSound();
  /* tap sounds + haptics via delegation */
  var TAPPABLE='.match-card,.schulte-cell,.tango-cell,.queens-cell,.sudoku-cell,.pad button,.word-chip,.quiz-opt,.pin-opt,.stroop-opt,.odd-tile,.chimp-cell,.nback-cell,.ring-quad,.diff-chip';
  stage.addEventListener('click',function(e){if(e.target.closest(TAPPABLE)){SFX.click(); if(navigator.vibrate)try{navigator.vibrate(8);}catch(err){}}});

  /* ---- confetti ---- */
  function confetti(){
    var cv=document.getElementById('confetti');
    if(!cv){cv=document.createElement('canvas'); cv.id='confetti'; document.body.appendChild(cv);}
    var g=cv.getContext('2d'); if(!g)return;
    cv.width=window.innerWidth; cv.height=window.innerHeight;
    var colors=['#E0A43A','#7C8CE0','#4FB58E','#E8734F','#B072C0','#33A8C0'];
    var parts=[]; for(var i=0;i<120;i++){parts.push({x:cv.width/2+(Math.random()-0.5)*160, y:cv.height*0.32, vx:(Math.random()-0.5)*9, vy:-(Math.random()*8+4), r:Math.random()*5+3, c:colors[i%colors.length], rot:Math.random()*6.28, vr:(Math.random()-0.5)*0.3, life:1});}
    var frames=0;
    (function draw(){
      g.clearRect(0,0,cv.width,cv.height); frames++;
      parts.forEach(function(p){p.x+=p.vx; p.y+=p.vy; p.vy+=0.22; p.rot+=p.vr; p.life-=0.008;
        g.save(); g.translate(p.x,p.y); g.rotate(p.rot); g.globalAlpha=Math.max(p.life,0);
        g.fillStyle=p.c; g.fillRect(-p.r,-p.r*0.6,p.r*2,p.r*1.2); g.restore();});
      if(frames<140) requestAnimationFrame(draw); else g.clearRect(0,0,cv.width,cv.height);
    })();
  }

  /* ---- titles & brain facts ---- */
  var TITLES={
    schulte:{mode:'min',tiers:[[16,'Hawk-eye'],[24,'Sharp Scanner'],[40,'Steady Gaze']]},
    match:{mode:'min',tiers:[[10,'Photographic'],[14,'Sharp Recall'],[20,'Warming Up']]},
    sequence:{mode:'max',tiers:[[12,'Pattern Sage'],[8,'Rhythm Keeper'],[5,'Echo Learner']]},
    quiz:{mode:'max',tiers:[[9,'Polymath'],[7,'Well-Read'],[5,'Curious Mind']]},
    crt:{mode:'max',tiers:[[6,'Untrickable'],[4,'Second-Guesser'],[2,'Instinct Fighter']]},
    nback:{mode:'max',tiers:[[90,'Iron Mind'],[75,'Locked In'],[60,'Getting There']]},
    reaction:{mode:'min',tiers:[[240,'Lightning'],[300,'Quick Draw'],[380,'Warmed Up']]},
    stroop:{mode:'max',tiers:[[24,'Unshakeable'],[16,'Focused'],[10,'Steady']]},
    odd:{mode:'max',tiers:[[18,'Eagle Eye'],[12,'Keen Spotter'],[7,'Sharp-ish']]},
    chimp:{mode:'max',tiers:[[9,'Chimp Rival'],[7,'Grid Master'],[5,'Solid Hold']]},
    lights:{mode:'min',tiers:[[8,'Switch Whisperer'],[14,'Circuit Bender'],[22,'Dimmer']]},
    flood:{mode:'min',tiers:[[16,'Tsunami'],[22,'Wave Rider'],[28,'Splasher']]},
    target:{mode:'max',tiers:[[30,'Sharpshooter'],[20,'Deadeye'],[12,'Warmed Up']]},
    mathsprint:{mode:'max',tiers:[[26,'Human Calculator'],[18,'Number Cruncher'],[10,'Counting Up']]},
    flash:{mode:'max',tiers:[[9,'Camera Eye'],[7,'Snapshot'],[5,'Quick Glance']]},
    palace:{mode:'max',tiers:[[12,'Grandmaster of Memory'],[9,'Palace Builder'],[6,'Route Walker']]},
    spot:{mode:'max',tiers:[[12,'Nothing Escapes You'],[8,'Fine-Toothed'],[5,'Observant']]},
    weave:{mode:'max',tiers:[[8,'Perfect Recall'],[6,'Wide Span'],[4,'Steady Eye']]}
  };
  function titleFor(game,val){var t=TITLES[game]; if(!t||isNaN(val))return null;
    for(var i=0;i<t.tiers.length;i++){var th=t.tiers[i]; if(t.mode==='min'?val<=th[0]:val>=th[0])return th[1];} return null;}
  var BRAIN_FACTS=[
    'Reaction time is typically fastest in the <b>late morning</b> and dips after lunch.',
    'Working memory holds about <b>4 chunks</b> at once — grouping items is how experts cheat.',
    'The Stroop effect exists because reading is <b>automatic</b> — your brain reads before you can stop it.',
    'Short bursts of focused practice beat long sessions — <b>spacing</b> is the brain\u2019s favorite trick.',
    'Recall is stronger after a <b>pause</b>: effortful retrieval wires memories deeper than re-reading.',
    'Chimpanzees genuinely <b>outperform humans</b> at flash number-memory tasks like the Chimp Test.',
    'Your visual system spots a color difference in ~<b>200 ms</b> — long before you can name it.',
    'Streaks work because the brain treats an unbroken chain as a <b>possession</b> worth protecting.',
    'Sleep replays the day\u2019s patterns — puzzle skills often <b>improve overnight</b> without practice.',
    'Naming your distraction (\u201Cthat\u2019s a thought\u201D) measurably <b>speeds refocusing</b>.',
    'The tip-of-the-tongue feeling means the memory <b>exists</b> — the route to it is just congested.',
    'Novelty triggers dopamine: a <b>fresh puzzle</b> literally feels better than a repeated one.',
    'Experts don\u2019t search faster — they search <b>less</b>, recognizing patterns in a single glance.',
    'Mild time pressure <b>narrows attention</b>; that\u2019s why a soft clock can help you focus.'
  ];

  /* ---- upgraded result screen: count-up, confetti, title, fact ---- */
  var baseResultScreen=resultScreen;
  resultScreen=function(label,value,sub,onReplay){
    baseResultScreen(label,value,sub,onReplay);
    var panel=stage.querySelector('.result-panel'); if(!panel)return;
    var numEl=panel.querySelector('.result-number');
    var isRecord=/record-tag/.test(sub||'');
    /* count-up if leading number */
    var m=String(value).match(/^(\d+)(.*)$/);
    if(m&&numEl){var target=parseInt(m[1],10), suffix=m[2]; if(target>0){var t0=performance.now(), durMs=Math.min(900,300+target*8);
      (function tick(){var p=Math.min((performance.now()-t0)/durMs,1); var eased=1-Math.pow(1-p,3);
        numEl.textContent=Math.round(target*eased)+suffix; if(p<1)requestAnimationFrame(tick);})();}}
    /* title tag */
    var game=gameView.getAttribute('data-game');
    var numeric=m?parseInt(m[1],10):NaN;
    var title=titleFor(game,numeric);
    if(title){var tag=el('div','result-title-tag',title); panel.insertBefore(tag, panel.querySelector('.btn-row'));}
    /* brain fact */
    var fact=el('p','brain-fact'); fact.innerHTML=BRAIN_FACTS[Math.floor(Math.random()*BRAIN_FACTS.length)];
    panel.insertBefore(fact, panel.querySelector('.btn-row'));
    /* share button */
    var row=panel.querySelector('.btn-row');
    var shareBtn=el('button','btn-share'+(isRecord?' hot':''), isRecord?'\u2605 Share your record':'Share result');
    shareBtn.addEventListener('click',function(){
      SFX.click();
      shareResult({game:GAME_META[game]?GAME_META[game].title:'Aperture', label:label, value:value,
        title:title, record:isRecord, accent:GAME_ACCENT[game]||'#E0A43A',
        diff:store.get('diff:'+game,null)});
    });
    if(row)panel.insertBefore(shareBtn,row);
    /* daily: submit time + show leaderboard */
    if(dailyActive&&game===todaysGame()){
      var secs=NaN; var mt=String(value).match(/^(\d+):(\d\d)$/);
      if(mt)secs=parseInt(mt[1],10)*60+parseInt(mt[2],10);
      if(!isNaN(secs)){ lbSubmit(secs); after(function(){showLeaderboard(secs);},420); }
    }
    /* celebrate */
    if(isRecord){confetti(); SFX.record();} else {SFX.solve();}
  };

  /* ---- combo helper (for stroop & odd) ---- */
  function comboPop(n,anchorEl){
    if(n<3)return;
    var b=document.createElement('div'); b.className='combo-pop'; b.textContent='\u00D7'+n;
    var r=anchorEl.getBoundingClientRect();
    b.style.left=(r.left+r.width/2-20+(Math.random()-0.5)*60)+'px';
    b.style.top=(r.top-8)+'px';
    document.body.appendChild(b);
    setTimeout(function(){b.remove();},850);
    if(n%5===0)SFX.good();
  }

  /* ---- daily challenge ---- */
  var DAILY_GAMES=['tango','queens','zip','sudoku'];
  function dayNumber(){var d=new Date(); return Math.floor((d.getTime()-d.getTimezoneOffset()*60000)/86400000);}
  function dailySeed(){var d=new Date(); return d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate();}
  function todaysGame(){return DAILY_GAMES[dayNumber()%DAILY_GAMES.length];}
  function dailyDoneKey(){return 'daily:'+dstr(new Date());}
  var dailyActive=false;
  function openDaily(){
    var g=todaysGame();
    dailyActive=true; setSeed(dailySeed()); dailyPending=true;
    openGame(g);
    /* skip intro: run directly at medium */
    var runners={tango:function(){withGenerating(function(){runTango('medium');});},
                 queens:function(){withGenerating(function(){runQueens('medium');});},
                 zip:function(){withGenerating(function(){runZip('medium');});},
                 sudoku:function(){withGenerating(function(){runSudoku('medium');});}};
    gameTitle.textContent=GAME_META[g].title+' \u00B7 Daily';
    runners[g]();
  }
  /* mark daily complete when its game is solved while active */
  var baseBump=bumpSolved;
  bumpSolved=function(game){
    if(dailyActive&&game===todaysGame()&&!store.get(dailyDoneKey(),false)){store.set(dailyDoneKey(),true); }
    return baseBump(game);
  };

  /* ---- greeting strip + daily chip ---- */
  var GREET_MOTIF={tango:'\u2600', queens:'\u265B', zip:'\u26A1', sudoku:'\u0036'};
  function renderGreeting(){
    var old=document.querySelector('.greeting-strip'); if(old)old.remove();
    var strip=el('div','greeting-strip');
    var left=el('div','greet-left');
    var h=new Date().getHours();
    var hello=h<5?'Up late?':h<12?'Good morning.':h<18?'Good afternoon.':'Good evening.';
    left.appendChild(el('div','greet-hello',hello));
    var cur=store.get('streak:current',0), last=store.get('streak:last',null);
    var y=new Date(); y.setDate(y.getDate()-1);
    var streakLive=(last===dstr(new Date())||last===dstr(y))?cur:0;
    /* suggest least-played game */
    var least=null, leastN=Infinity;
    Object.keys(GAME_META).forEach(function(g){var n=getSolved(g); if(n<leastN){leastN=n; least=g;}});
    var sub=el('div','greet-sub');
    sub.innerHTML=(streakLive>0?('<span class="hot">\uD83D\uDD25 '+streakLive+'-day streak.</span> '):'')+'Why not try <b>'+GAME_META[least].title+'</b>?';
    left.appendChild(sub);
    strip.appendChild(left);
    /* daily chip */
    var g=todaysGame(); var done=store.get(dailyDoneKey(),false);
    var chip=el('div','daily-chip');
    var info=el('div','dc-info');
    info.appendChild(el('div','dc-label','Daily Challenge'));
    info.appendChild(el('div','dc-game',(GREET_MOTIF[g]||'')+' '+GAME_META[g].title));
    if(done)info.appendChild(el('div','dc-done','\u2713 Solved today'));
    chip.appendChild(info);
    var btn=el('button','daily-btn'+(done?' done':''),done?'Done \u2713':'Play');
    if(!done)btn.addEventListener('click',openDaily);
    chip.appendChild(btn);
    strip.appendChild(chip);
    var firstSection=document.getElementById('focus');
    firstSection.parentNode.insertBefore(strip,firstSection);
  }

  /* ---- header streak flame ---- */
  function updateFlame(){
    var f=document.getElementById('streak-flame');
    var cur=store.get('streak:current',0), last=store.get('streak:last',null);
    var y=new Date(); y.setDate(y.getDate()-1);
    var live=(last===dstr(new Date())||last===dstr(y))?cur:0;
    if(live>0){f.hidden=false; f.innerHTML='<span class="fl">\uD83D\uDD25</span>'+live;} else f.hidden=true;
  }

  /* ---- card motifs + 3D tilt ---- */
  var CARD_MOTIF={match:'\u2726', sequence:'\u25CE', schulte:'\u2316', words:'\u270E', quiz:'\u2605',
    tango:'\u2600', queens:'\u265B', zip:'\u26A1', sudoku:'\u2685', pinpoint:'\u25C9',
    reaction:'\u26A1', stroop:'\u25D0', odd:'\u25A3', chimp:'\u2318', cogstyle:'\u262F', crt:'\u203D', nback:'\u29BF', slide:'\u25A6', lights:'\u2600', flood:'\u25C9', target:'\u25CE', mathsprint:'\u2211', flash:'\u26A1', palace:'\u2302', spot:'\u25D1', weave:'\u2593'};
  function initMotifs(){
    document.querySelectorAll('.chamber-card').forEach(function(card){
      var m=CARD_MOTIF[card.dataset.game]; if(!m)return;
      card.appendChild(el('span','card-motif',m));
    });
    if(window.matchMedia&&window.matchMedia('(hover:hover)').matches){
      document.querySelectorAll('.chamber-card').forEach(function(card){
        card.addEventListener('pointermove',function(e){var r=card.getBoundingClientRect();
          var rx=((e.clientY-r.top)/r.height-0.5)*-6, ry=((e.clientX-r.left)/r.width-0.5)*6;
          card.style.transform='translateY(-3px) perspective(700px) rotateX('+rx+'deg) rotateY('+ry+'deg)';});
        card.addEventListener('pointerleave',function(){card.style.transform='';});
      });
    }
  }

  /* ---- hero interactivity ---- */
  function initHero(){
    var wrap=document.querySelector('.hero-ring-wrap'); var ring=document.querySelector('.hero-ring');
    if(!wrap||!ring)return;
    wrap.addEventListener('pointermove',function(e){var r=wrap.getBoundingClientRect();
      var dx=((e.clientX-r.left)/r.width-0.5)*14, dy=((e.clientY-r.top)/r.height-0.5)*14;
      ring.style.transform='translate('+dx+'px,'+dy+'px)';});
    wrap.addEventListener('pointerleave',function(){ring.style.transform='';});
    wrap.addEventListener('click',function(){ring.classList.remove('kick'); void ring.offsetWidth; ring.classList.add('kick'); SFX.good();});
  }

  /* ---- rotating footer quotes ---- */
  var QUOTES=[
    ['"Attention is the rarest and purest form of generosity."','Simone Weil'],
    ['"The mind is not a vessel to be filled, but a fire to be kindled."','Plutarch'],
    ['"Concentration is the secret of strength."','Ralph Waldo Emerson'],
    ['"What we pay attention to grows."','Anonymous'],
    ['"You have power over your mind — not outside events."','Marcus Aurelius'],
    ['"Play is the highest form of research."','attributed to Einstein']
  ];
  function initQuote(){
    var q=document.querySelector('footer .quote'); var attr=document.querySelector('footer p:last-child');
    if(!q)return; var pick=QUOTES[Math.floor(Math.random()*QUOTES.length)];
    q.textContent=pick[0];
    if(attr)attr.textContent='\u2014 '+pick[1]+' \u00B7 Aperture is a small training ground, not a substitute for professional care.';
  }

  var STARTERS={
    match:startMatch, sequence:startSequence, schulte:startSchulte, words:startWords, quiz:startQuiz,
    tango:startTango, queens:startQueens, zip:startZip, sudoku:startSudoku, pinpoint:startPinpoint,
    reaction:startReaction, stroop:startStroop, odd:startOdd, chimp:startChimp,
    cogstyle:startCogstyle, crt:startCrt, nback:startNback,
    slide:startSlide, lights:startLights, flood:startFlood,
    target:startTarget, mathsprint:startMathsprint,
    flash:startFlash, palace:startPalace, spot:startSpot, weave:startWeave
  };

  /* ---- boot the playful layer ---- */
  renderGreeting(); updateFlame(); initMotifs(); initHero(); initQuote();
})();
