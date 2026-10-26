(() => {
"use strict";
const $ = id => document.getElementById(id);
const canvas = $("game"), ctx = canvas.getContext("2d", { alpha: false });
const W = canvas.width, H = canvas.height;
const ui = {
 score:$("score"),best:$("best"),bestSummary:$("best-summary"),overlay:$("overlay"),menuHigh:$("menu-high-score"),recentScores:$("recent-scores"),history:$("menu-score-history"),
 kicker:$("overlay-kicker"),title:$("overlay-title"),text:$("overlay-text"),
 primary:$("primary-button"),secondary:$("secondary-button"),tertiary:$("tertiary-button"),
 settings:$("settings-button"),pause:$("pause-button"),sound:$("sound-button"),
 pauseRibbon:$("pause-ribbon"),toast:$("toast"),status:$("status-label"),
 difficulty:$("difficulty-label"),powerFill:$("power-fill"),powerTime:$("power-time"),runTip:$("run-tip")
};
const C={gravity:940,thrust:-390,playerX:235,radius:15,barrierWidth:76,baseGap:205,minGap:142,baseSpeed:245,maxSpeed:420,baseSpawn:1.58,minSpawn:1.02,particleCap:180};
const K={best:"rr3.best",runs:"rr3.runs",sound:"rr3.sound",scores:"rr3.scores",settings:"rr3.settings"};
let state="menu",player=null,barriers=[],particles=[],stars=[],stone=null,score=0,best=num(K.best,0),runs=num(K.runs,0),elapsed=0,spawnTimer=0,slowTimer=0,shake=0,lastTime=0,raf=0,toastTimer=0,soundOn=bool(K.sound,true),audio=null;
let settings=readSettings(),scoreEntries=readScores();
function num(k,d){try{let n=Number(localStorage.getItem(k));return Number.isFinite(n)&&n>=0?n:d}catch{return d}}
function bool(k,d){try{let v=localStorage.getItem(k);return v===null?d:v==="true"}catch{return d}}
function save(k,v){try{localStorage.setItem(k,String(v))}catch{}}
function readSettings(){try{return {...{master:100,sfx:100,particles:true,screenShake:true,difficulty:"normal"},...JSON.parse(localStorage.getItem(K.settings)||"{}")}}catch{return {master:100,sfx:100,particles:true,screenShake:true,difficulty:"normal"}}}
function saveSettings(){save(K.settings,JSON.stringify(settings))}
// Local audio assets: original synthesized loops and effects shipped with the game.
const audioFiles={menu:"assets/audio/menu-ambience.wav",game:"assets/audio/gameplay-pulse.wav"};
let musicPlayer=null,currentMusic="";
function musicVolume(){return Math.max(0,Math.min(1,(settings.master/100)*.48))}
function sfxVolume(){return Math.max(0,Math.min(1,(settings.master/100)*(settings.sfx/100)*.98))}
function setMusic(kind){
 if(!soundOn)return;
 const src=audioFiles[kind];if(!src)return;
 if(currentMusic===kind&&musicPlayer&&!musicPlayer.paused){musicPlayer.volume=musicVolume();return}
 if(musicPlayer){musicPlayer.pause();musicPlayer.currentTime=0}
 currentMusic=kind;musicPlayer=new Audio(src);musicPlayer.loop=true;musicPlayer.preload="auto";musicPlayer.volume=musicVolume();
 const attempt=musicPlayer.play();if(attempt&&attempt.catch)attempt.catch(()=>{});
}
function stopMusic(){if(musicPlayer)musicPlayer.pause()}
function playSfx(name){if(!soundOn)return;try{const a=new Audio(`assets/audio/${name}.wav`);a.volume=sfxVolume();a.preload="auto";const p=a.play();if(p&&p.catch)p.catch(()=>{})}catch{}}
function updateAudioVolumes(){if(musicPlayer)musicPlayer.volume=musicVolume()}
function readScores(){try{let v=JSON.parse(localStorage.getItem(K.scores)||"[]");return Array.isArray(v)?v.filter(x=>Number.isFinite(x.score)).slice(-50):[]}catch{return []}}
function renderRecentScores(){if(!ui.recentScores)return;ui.menuHigh.textContent=fmt(best);const recent=scoreEntries.slice(-5).reverse();ui.recentScores.innerHTML=recent.length?recent.map((x,i)=>`<span class="recent-score"><i>${String(i+1).padStart(2,"0")}</i><b>${fmt(x.score)}</b></span>`).join(""):`<span class="recent-empty">Complete a run to record your score.</span>`}
function fmt(n){return String(n).padStart(3,"0")}
function createStars(){stars=Array.from({length:130},()=>({x:Math.random()*W,y:Math.random()*H,size:Math.random()<.12?2:Math.random()*1.2+.3,depth:.2+Math.random()*.8,phase:Math.random()*Math.PI*2}))}
function overlay(kicker,title,copy,primary,secondary="HOW TO PLAY",tertiary="HIGH SCORES",showSettings=true){
 ui.history.style.display="none";ui.overlay.querySelectorAll(".leaderboard,.settings-form").forEach(el=>el.remove());
 ui.kicker.textContent=kicker;ui.title.innerHTML=title;ui.text.textContent=copy;ui.primary.innerHTML=`${primary} <span>↗</span>`;ui.secondary.textContent=secondary;ui.tertiary.textContent=tertiary;ui.settings.style.display=showSettings?"block":"none";ui.overlay.classList.remove("hidden");
}
function menu(){state="menu";setMusic("menu");ui.pauseRibbon.classList.remove("show");ui.status.textContent="REALITY STABLE";renderRecentScores();overlay("THE MULTIVERSE IS COLLAPSING","Enter the <span>Rift</span>","One cloak. Infinite fractures. How long can you survive?","BEGIN RUN","HOW TO PLAY","HIGH SCORES",true);ui.history.style.display="block"}
function startRun(){cancelAnimationFrame(raf);setMusic("game");playSfx("begin-run");score=0;elapsed=spawnTimer=slowTimer=shake=0;barriers=[];particles=[];stone=null;player={x:C.playerX,y:H*.47,vy:0,tilt:0};runs++;save(K.runs,runs);ui.score.textContent=fmt(0);ui.overlay.classList.add("hidden");ui.pauseRibbon.classList.remove("show");ui.status.textContent="REALITY UNSTABLE";state="running";lastTime=performance.now();tone(440,.08,"sine",.03);raf=requestAnimationFrame(loop)}
function finish(){if(state!=="running")return;state="gameover";stopMusic();playSfx("collision");const newBest=score>best;if(newBest){best=score;save(K.best,best);ui.best.textContent=fmt(best);ui.bestSummary.textContent=fmt(best);playSfx("high-score")} scoreEntries.push({score,date:new Date().toISOString()});scoreEntries=scoreEntries.slice(-50);save(K.scores,JSON.stringify(scoreEntries));renderRecentScores();ui.pauseRibbon.classList.remove("show");ui.status.textContent="TIMELINE COLLAPSED";tone(110,.28,"sawtooth",.05);overlay("RUN TERMINATED","The Rift <span>Claims You</span>",`Final score: ${score}. Personal best: ${best}. Total runs: ${runs}.`,"RETRY TIMELINE","MAIN MENU","HIGH SCORES",true);render()}
function pause(){if(state!=="running")return;state="paused";stopMusic();playSfx("ui-click");ui.pauseRibbon.classList.add("show");ui.status.textContent="TIMELINE PAUSED";overlay("TIME SUSPENDED","Take a <span>Breath</span>","The multiverse can wait. Resume when you're ready.","RESUME RUN","HOW TO PLAY","HIGH SCORES",true)}
function resume(){if(state!=="paused")return;state="running";setMusic("game");ui.overlay.classList.add("hidden");ui.pauseRibbon.classList.remove("show");lastTime=performance.now();raf=requestAnimationFrame(loop)}
function howTo(){overlay("FIELD GUIDE / SURVIVAL BASICS","The Cloak of <span>Levitation</span>","Tap SPACE or click once for a single upward thrust. Gravity pulls the Cloak down between beats. Thread through each shifting dimensional gap to earn one point per barrier pair. A collision with a barrier or screen boundary ends the run. Collect the Time Stone to slow the rift briefly; barrier speed and gaps change gradually within fixed limits.","GOT IT","BACK","HIGH SCORES",false);ui.primary.dataset.action="close-guide";ui.secondary.dataset.action="menu"}
function leaderboard(){const rankedScores=[...scoreEntries].sort((a,b)=>b.score-a.score).slice(0,10);const rows=rankedScores.length?rankedScores.map((x,i)=>`<tr><td>${String(i+1).padStart(2,"0")}</td><td>${new Date(x.date).toLocaleDateString()}</td><td>${x.score}</td></tr>`).join(""):`<tr><td colspan="3" class="empty-score">No runs recorded yet. Complete a run to start your ledger.</td></tr>`;
 overlay("THE SANCTUM'S LEDGER","High <span>Scores</span>","Your ten best local runs are stored on this device.","BACK TO MENU","HOW TO PLAY","CLEAR SCORES",false);
 const table=document.createElement("table");table.className="leaderboard";table.innerHTML=`<thead><tr><th>RANK</th><th>DATE</th><th>SCORE</th></tr></thead><tbody>${rows}</tbody>`;
 ui.text.after(table);const old=ui.overlay.querySelector(".leaderboard");if(old&&old!==table)old.remove();
 ui.primary.dataset.action="menu";ui.secondary.dataset.action="guide";ui.tertiary.dataset.action="clear-scores";
}
function clearScores(){scoreEntries=[];save(K.scores,"[]");renderRecentScores();showToast("LOCAL SCORE HISTORY CLEARED");leaderboard()}
function settingsScreen(){
 overlay("CONFIGURE YOUR EXPERIENCE","Game <span>Settings</span>","Tune the experience to your machine and play style.","SAVE SETTINGS","BACK","RESET DEFAULTS",false);
 const old=ui.overlay.querySelector(".settings-form");if(old)old.remove();
 const form=document.createElement("div");form.className="settings-form";
 form.innerHTML=`<div class="setting-row"><label for="master-range">Master volume</label><div><input id="master-range" type="range" min="0" max="100" value="${settings.master}"><span class="setting-value" id="master-value">${settings.master}%</span></div></div>
 <div class="setting-row"><label for="sfx-range">Sound effects</label><div><input id="sfx-range" type="range" min="0" max="100" value="${settings.sfx}"><span class="setting-value" id="sfx-value">${settings.sfx}%</span></div></div>
 <div class="setting-row"><label for="difficulty-select">Starting difficulty</label><select id="difficulty-select"><option value="relaxed">Relaxed</option><option value="normal">Normal</option><option value="intense">Intense</option></select></div>
 <label class="toggle-row"><span>Particle effects</span><input id="particles-toggle" type="checkbox" ${settings.particles?"checked":""}></label>
 <label class="toggle-row"><span>Screen shake on impact</span><input id="shake-toggle" type="checkbox" ${settings.screenShake?"checked":""}></label>`;
 ui.text.after(form);$("difficulty-select").value=settings.difficulty;
 for(const key of ["master","sfx"]){const input=$(`${key}-range`);input.addEventListener("input",()=> $(`${key}-value`).textContent=`${input.value}%`)}
 ui.primary.dataset.action="save-settings";ui.secondary.dataset.action="menu";ui.tertiary.dataset.action="reset-settings";
}
function saveSettingsFromForm(){settings.master=+$("master-range").value;settings.sfx=+$("sfx-range").value;settings.difficulty=$("difficulty-select").value;settings.particles=$("particles-toggle").checked;settings.screenShake=$("shake-toggle").checked;saveSettings();updateAudioVolumes();showToast("SETTINGS SAVED");menu()}
function resetSettings(){settings={master:100,sfx:100,particles:true,screenShake:true,difficulty:"normal"};saveSettings();updateAudioVolumes();settingsScreen();showToast("DEFAULT SETTINGS RESTORED")}
function primaryAction(){const action=ui.primary.dataset.action;delete ui.primary.dataset.action;if(action==="close-guide"){state==="paused"?resume():menu();return}if(action==="menu"){menu();return}if(action==="save-settings"){saveSettingsFromForm();return}if(state==="paused")resume();else startRun()}
function secondaryAction(){const action=ui.secondary.dataset.action;delete ui.secondary.dataset.action;if(action==="guide"){howTo();return}if(action==="menu"){menu();return}if(state==="paused"){resume();return}howTo()}
function tertiaryAction(){const action=ui.tertiary.dataset.action;delete ui.tertiary.dataset.action;if(action==="clear-scores"){clearScores();return}leaderboard()}
function burst(x,y,count,color,power=1){if(!settings.particles)return;for(let i=0;i<count&&particles.length<C.particleCap;i++){const a=Math.random()*Math.PI*2,s=(25+Math.random()*155)*power,life=.25+Math.random()*.48;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life,maxLife:life,size:1+Math.random()*2.3,color})}}
function tone(freq,duration,type="sine",volume=.03){if(!soundOn)return;try{const AC=window.AudioContext||window.webkitAudioContext;if(!audio&&AC)audio=new AC();if(!audio)return;if(audio.state==="suspended")audio.resume();const osc=audio.createOscillator(),gain=audio.createGain();osc.type=type;osc.frequency.value=freq;gain.gain.value=volume*(settings.master/100)*(settings.sfx/100);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(audio.currentTime+duration)}catch{}}
function toggleSound(){soundOn=!soundOn;save(K.sound,soundOn);ui.sound.textContent=soundOn?"♫":"♪̸";if(soundOn){if(state!=="paused")setMusic(state==="running"?"game":"menu");playSfx("ui-click")}else stopMusic();showToast(soundOn?"SOUND ENABLED":"SOUND MUTED");if(soundOn)tone(660,.1)}
function showToast(msg){ui.toast.textContent=msg;ui.toast.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>ui.toast.classList.remove("show"),1900)}
function spawnBarrier(){const gap= C.baseGap-(Math.min(1,score/55)*(C.baseGap-C.minGap));const margin=75+gap/2;barriers.push({x:W+30,center:margin+Math.random()*(H-margin*2),gap,scored:false})}
function maybeStone(){if(stone||score<5||score%8!==0)return;stone={x:W+25,y:100+Math.random()*(H-200),spin:0,radius:13}}
function touches(x,y,r){return Math.hypot(player.x-x,player.y-y)<C.radius+r}
function update(dt){elapsed+=dt;if(slowTimer>0)slowTimer=Math.max(0,slowTimer-dt);if(shake>0)shake=Math.max(0,shake-dt*30);
 const simDt=dt*(slowTimer>0?.48:1);player.vy+=C.gravity*simDt;player.y+=player.vy*simDt;player.tilt+=( (player.vy>0?.38:-.25)-player.tilt)*Math.min(1,simDt*4);
 let factor=settings.difficulty==="relaxed"?.65:settings.difficulty==="intense"?1.35:1;const intensity=Math.min(1,score/55);
 spawnTimer+=simDt;const interval=Math.max(C.minSpawn,C.baseSpawn-intensity*.45)/factor;if(spawnTimer>=interval){spawnTimer-=interval;spawnBarrier()}
 const speed=Math.min(C.maxSpeed,C.baseSpeed*factor+score*3.2);
 for(const b of barriers){b.x-=speed*simDt;if(!b.scored&&b.x+C.barrierWidth<player.x){b.scored=true;score++;ui.score.textContent=fmt(score);burst(player.x,player.y,6,"#ffe3a4",.55);playSfx("score-ping");tone(650+Math.min(score,20)*10,.08);maybeStone()}
 const xhit=player.x+C.radius>b.x&&player.x-C.radius<b.x+C.barrierWidth,top=b.center-b.gap/2,bottom=b.center+b.gap/2;
 if(xhit&&(player.y-C.radius<top||player.y+C.radius>bottom)){burst(player.x,player.y,38,"#ff536b",1.4);shake=settings.screenShake?9:0;finish();return}}
 barriers=barriers.filter(b=>b.x+C.barrierWidth>-20);
 if(player.y-C.radius<=0||player.y+C.radius>=H){burst(player.x,Math.max(10,Math.min(H-10,player.y)),30,"#ff536b",1.3);shake=settings.screenShake?9:0;finish();return}
 if(stone){stone.x-=speed*simDt;stone.spin+=simDt*2.8;if(touches(stone.x,stone.y,stone.radius+4)){stone=null;slowTimer=4;burst(player.x,player.y,30,"#ffe5a0",1.1);showToast("TIME STONE ACQUIRED · REALITY SLOWED");playSfx("time-stone");tone(880,.24)}else if(stone.x<-30)stone=null}
 for(const p of particles){p.x+=p.vx*simDt;p.y+=p.vy*simDt;p.vx*=.99;p.vy*=.99;p.life-=dt}particles=particles.filter(p=>p.life>0);
 ui.powerFill.style.width=`${slowTimer/4*100}%`;ui.powerTime.textContent=slowTimer>0?`${slowTimer.toFixed(1)}s`:"READY";
 ui.difficulty.textContent=`RIFT INTENSITY: ${intensity<.25?"I":intensity<.5?"II":intensity<.75?"III":"IV"}`;ui.status.textContent=slowTimer>0?"TIME DISTORTION ACTIVE":intensity>.65?"CRITICAL INSTABILITY":"REALITY UNSTABLE";ui.runTip.textContent=slowTimer>0?"TEMPORAL REPRIEVE ACTIVE":"FLY THROUGH THE OPENING TO SCORE"}
function background(){const g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,"#2b0d1b");g.addColorStop(.48,"#170b1b");g.addColorStop(1,"#080810");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 const glow=ctx.createRadialGradient(W*.78,H*.38,4,W*.78,H*.38,300);glow.addColorStop(0,`rgba(235,37,80,${.15+Math.sin(elapsed*.65)*.025})`);glow.addColorStop(1,"rgba(235,37,80,0)");ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);
 for(const s of stars){const x=(s.x-elapsed*(12+s.depth*24)+W*4)%W;ctx.globalAlpha=(.28+(Math.sin(elapsed*1.5+s.phase)+1)*.18)*s.depth;ctx.fillStyle=s.size>1.5?"#ffe4ad":"#d6a0c2";ctx.fillRect(x,s.y,s.size,s.size)}ctx.globalAlpha=1;
 ctx.fillStyle="#100b18";for(let i=0;i<13;i++){const w=28+(i%4)*12,h=55+(i*37)%105,x=(i*113-elapsed*17+W*2)%(W+100)-50;ctx.fillRect(x,H-h,w,h);ctx.fillStyle="#5b1d37";ctx.fillRect(x+w*.3,H-h+12,2,h-12);ctx.fillStyle="#100b18"}
 ctx.strokeStyle="#6b2940";ctx.globalAlpha=.2;for(let y=65;y<H;y+=80){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}ctx.globalAlpha=1}
function drawBarrier(b){const top=b.center-b.gap/2,bottom=b.center+b.gap/2,w=C.barrierWidth;ctx.save();ctx.shadowColor="#ff315c";ctx.shadowBlur=18;ctx.fillStyle="#4b1029";ctx.strokeStyle="#ff6078";ctx.lineWidth=2;
 ctx.beginPath();ctx.moveTo(b.x,0);ctx.lineTo(b.x+w,0);ctx.lineTo(b.x+w,top);ctx.lineTo(b.x+w*.78,top-11);ctx.lineTo(b.x+w*.58,top+5);ctx.lineTo(b.x+w*.35,top-9);ctx.lineTo(b.x+w*.15,top+3);ctx.lineTo(b.x,top);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.beginPath();ctx.moveTo(b.x,bottom);ctx.lineTo(b.x+w*.18,bottom+8);ctx.lineTo(b.x+w*.4,bottom-6);ctx.lineTo(b.x+w*.62,bottom+7);ctx.lineTo(b.x+w*.82,bottom-8);ctx.lineTo(b.x+w,bottom);ctx.lineTo(b.x+w,H);ctx.lineTo(b.x,H);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore()}
function drawPlayer(){if(!player)return;ctx.save();ctx.translate(player.x,player.y);ctx.rotate(Math.max(-.42,Math.min(.55,player.tilt)));ctx.shadowColor="#ff355d";ctx.shadowBlur=23;ctx.fillStyle="#a40f32";ctx.strokeStyle="#ffc1ad";ctx.lineWidth=1.7;ctx.beginPath();ctx.moveTo(0,-18);ctx.quadraticCurveTo(17,-14,19,4);ctx.lineTo(28,23);ctx.lineTo(8,16);ctx.lineTo(-4,28);ctx.lineTo(-15,15);ctx.lineTo(-27,22);ctx.quadraticCurveTo(-18,2,-13,-9);ctx.closePath();ctx.fill();ctx.stroke();ctx.shadowColor="#ffe3a0";ctx.fillStyle="#ffe5a6";ctx.beginPath();ctx.arc(0,-8,5,0,Math.PI*2);ctx.fill();ctx.restore()}
function drawStone(){if(!stone)return;ctx.save();ctx.translate(stone.x,stone.y);ctx.rotate(stone.spin);ctx.shadowColor="#ffe29a";ctx.shadowBlur=26;ctx.fillStyle="#ffe9a9";ctx.strokeStyle="#fff8d7";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-19);ctx.lineTo(12,0);ctx.lineTo(0,19);ctx.lineTo(-12,0);ctx.closePath();ctx.fill();ctx.stroke();ctx.globalAlpha=.5;ctx.beginPath();ctx.arc(0,0,23,0,Math.PI*2);ctx.stroke();ctx.restore()}
function render(){ctx.save();if(shake>0)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);background();barriers.forEach(drawBarrier);drawStone();for(const p of particles){ctx.globalAlpha=Math.max(0,p.life/p.maxLife);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.size,p.size)}ctx.globalAlpha=1;drawPlayer();ctx.fillStyle="#ff4d70";ctx.fillRect(0,0,W,3);ctx.fillRect(0,H-3,W,3);ctx.restore()}
function loop(now){if(state!=="running")return;const dt=Math.min((now-lastTime)/1000,.032);lastTime=now;update(dt);render();if(state==="running")raf=requestAnimationFrame(loop)}
document.addEventListener("pointerdown",()=>{if(soundOn&&!musicPlayer&&state==="menu")setMusic("menu")},{once:true});
ui.primary.addEventListener("click",()=>{playSfx("ui-click");primaryAction()});ui.secondary.addEventListener("click",()=>{playSfx("ui-click");secondaryAction()});ui.tertiary.addEventListener("click",()=>{playSfx("ui-click");tertiaryAction()});ui.settings.addEventListener("click",()=>{playSfx("ui-click");settingsScreen()});
ui.pause.addEventListener("click",()=>state==="running"?pause():state==="paused"?resume():showToast("START A RUN TO PAUSE"));ui.sound.addEventListener("click",toggleSound);
window.addEventListener("keydown",()=>{if(soundOn&&!musicPlayer&&state==="menu")setMusic("menu")},{once:true});
function thrustBeat(){if(state!=="running"||!player)return;player.vy=C.thrust;playSfx("thrust");burst(player.x-8,player.y+16,5,"#ffe3a4",.35)}
window.addEventListener("keydown",e=>{if(e.code==="Space"){e.preventDefault();if(e.repeat)return;if(state==="menu"||state==="gameover")startRun();else if(state==="running")thrustBeat();else if(state==="paused")resume()}if(e.code==="Escape"){e.preventDefault();if(state==="running")pause();else if(state==="paused")resume()}if(e.code==="KeyM")toggleSound()});
canvas.addEventListener("pointerdown",e=>{e.preventDefault();if(state==="running")thrustBeat();else if(state==="menu"||state==="gameover")startRun()});window.addEventListener("blur",()=>{if(state==="running")pause()});document.addEventListener("visibilitychange",()=>{if(document.hidden&&state==="running")pause()});
ui.best.textContent=fmt(best);ui.bestSummary.textContent=fmt(best);renderRecentScores();ui.sound.textContent=soundOn?"♫":"♪̸";createStars();player={x:C.playerX,y:H*.48,vy:0,tilt:0};render();
})();
