const htmlCode = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
<title>PONG vs AI</title>
<style>
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
html{width:100%;min-height:100%;background:#0e0f15;overflow-x:hidden;}
body{margin:0;width:100%;min-height:100vh;background:#0e0f15;color:#fff;font-family:Arial,sans-serif;display:flex;justify-content:center;align-items:flex-start;overflow-x:hidden;}
.game{width:100%;max-width:520px;padding:16px 12px 30px;margin:0 auto;}
h1{width:100%;text-align:center;margin:0;font-size:30px;letter-spacing:1px;color:#5b7cff;text-shadow:2px 2px 0 #1a1f4d;}
.subtitle{width:100%;text-align:center;color:#777;margin:6px 0 18px;font-size:13px;}
.menu{width:100%;max-width:460px;margin:0 auto;display:grid;gap:12px;}
label{display:block;width:100%;color:#999;font-size:12px;text-align:left;}
select,button{width:100%;border:0;outline:none;border-radius:12px;padding:14px;font-size:16px;font-weight:bold;}
select{display:block;width:100%;background:#171922;color:#fff;border:1px solid #292c38;}
#start{margin-top:5px;background:#5b7cff;color:#fff;}
button{cursor:pointer;}
button:active{transform:scale(.96);}
.hidden{display:none;}
#gameArea{width:100%;}
.hud{width:100%;display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin:12px 0;}
.hudBox{background:#13151c;border:1px solid #252833;border-radius:12px;padding:8px 4px;text-align:center;}
.hudBox small{display:block;color:#777;font-size:10px;margin-bottom:3px;}
.hudBox strong{font-size:22px;}
#you{color:#5bff9b;}
#ai{color:#ff5577;}
#status{width:100%;height:24px;text-align:center;color:#aaa;font-size:14px;margin-bottom:8px;transition:.25s;}
#status.win{color:#5bff9b;animation:statusWin .6s infinite alternate;}
#status.lose{color:#ff5577;animation:statusLose .6s infinite alternate;}
@keyframes statusWin{from{transform:scale(1);}to{transform:scale(1.12);}}
@keyframes statusLose{from{transform:scale(1);}to{transform:scale(1.08);}}
canvas{display:block;width:min(94vw,460px);height:auto;margin:0 auto;background:#0b1020;border-radius:12px;image-rendering:pixelated;touch-action:none;user-select:none;}
.actions{width:min(94vw,460px);margin:14px auto 0;}
#menuBtn{display:block;width:100%;background:#171922;color:#fff;border:1px solid #292c38;}
.confetti{position:fixed;width:7px;height:7px;pointer-events:none;z-index:99;animation:confettiFall 1.2s linear forwards;}
@keyframes confettiFall{0%{transform:translateY(-20px) rotate(0);opacity:1;}100%{transform:translateY(100vh) rotate(720deg);opacity:0;}}
.shake{animation:shake .4s ease;}
@keyframes shake{0%,100%{transform:translateX(0);}20%{transform:translateX(-8px);}40%{transform:translateX(8px);}60%{transform:translateX(-6px);}80%{transform:translateX(6px);}}
@media(max-width:400px){h1{font-size:25px;}.game{padding:14px 10px 26px;}}
</style>
</head>
<body>
<div class="game">
  <h1>PONG vs AI</h1>
  <div class="subtitle">PAKU BOLA, KALAHKAN BOT</div>

  <div id="menu" class="menu">
    <label>LEVEL AI</label>
    <select id="diff">
      <option value="easy">EASY</option>
      <option value="medium" selected>MEDIUM</option>
      <option value="hard">HARD</option>
    </select>
    <label>TARGET MENANG</label>
    <select id="target">
      <option value="5">5 POIN</option>
      <option value="7" selected>7 POIN</option>
      <option value="11">11 POIN</option>
    </select>
    <button id="start">MULAI</button>
  </div>

  <div id="gameArea" class="hidden">
    <div class="hud">
      <div class="hudBox"><small>KAMU</small><strong id="you">0</strong></div>
      <div class="hudBox"><small>LEVEL</small><strong id="lvl">MED</strong></div>
      <div class="hudBox"><small>AI</small><strong id="ai">0</strong></div>
    </div>
    <div id="status">SIAP?</div>
    <canvas id="game" width="460" height="640"></canvas>
    <div class="actions">
      <button id="menuBtn">MENU</button>
    </div>
  </div>
</div>
<script>
const menu = document.getElementById("menu");
const gameArea = document.getElementById("gameArea");
const cv = document.getElementById("game");
const ctx = cv.getContext("2d");
const statusEl = document.getElementById("status");
const youEl = document.getElementById("you");
const aiEl = document.getElementById("ai");
const lvlEl = document.getElementById("lvl");
const diffEl = document.getElementById("diff");
const targetEl = document.getElementById("target");

const VIEW_W = 460, VIEW_H = 640;
const PADDLE_W = 84, PADDLE_H = 12;

let audioCtx = null;
function audioStart(){
  if(!audioCtx){ audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
  if(audioCtx.state === "suspended"){ audioCtx.resume(); }
}
function sound(type){
  audioStart();
  if(!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain); gain.connect(audioCtx.destination);
  let freq = 500, duration = .08;
  if(type === "paddle"){ freq = 480; duration = .07; }
  if(type === "wall"){ freq = 320; duration = .06; }
  if(type === "score"){ freq = 200; duration = .18; }
  if(type === "win"){ freq = 700; duration = .25; }
  if(type === "lose"){ freq = 180; duration = .3; }
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  if(type === "win"){ osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + duration); }
  if(type === "lose"){ osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + duration); }
  gain.gain.setValueAtTime(.0001, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(.12, audioCtx.currentTime + .01);
  gain.gain.exponentialRampToValueAtTime(.0001, audioCtx.currentTime + duration);
  osc.start();
  osc.stop(audioCtx.currentTime + duration + .02);
}

let state, diff, target, youScore, aiScore;
let player, ai, ball, aiSpeed, ballSpeed;

function initGame(){
  player = { x: VIEW_W/2 - PADDLE_W/2, y: VIEW_H - 30, w: PADDLE_W, h: PADDLE_H };
  ai = { x: VIEW_W/2 - PADDLE_W/2, y: 18, w: PADDLE_W, h: PADDLE_H };
  if(diff === "easy"){ aiSpeed = 3.2; ballSpeed = 4.2; }
  else if(diff === "medium"){ aiSpeed = 4.6; ballSpeed = 5.4; }
  else { aiSpeed = 6.2; ballSpeed = 6.6; }
  resetBall(Math.random() < 0.5 ? 1 : -1);
}

function resetBall(dir){
  ball = {
    x: VIEW_W/2, y: VIEW_H/2,
    vx: (Math.random()*0.6 + 0.7) * (Math.random()<0.5?-1:1),
    vy: (Math.random()*0.4 + 0.6) * dir,
    r: 8, speed: ballSpeed
  };
  let m = Math.hypot(ball.vx, ball.vy) || 1;
  ball.vx = ball.vx/m * ball.speed;
  ball.vy = ball.vy/m * ball.speed;
}

let keys = { left:false, right:false };
let pointers = new Map();
let dragPaddle = false;

function refreshKeys(){
  keys.left = false; keys.right = false;
  for(const p of pointers.values()){
    if(p.x < 0.4) keys.left = true;
    else if(p.x > 0.6) keys.right = true;
  }
}
function canvasPointer(e){
  const rect = cv.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width;
  const y = (e.clientY - rect.top) / rect.height;
  if(e.type === "pointerdown"){
    pointers.set(e.pointerId, {x,y});
    dragPaddle = true;
    player.x = x * VIEW_W - player.w/2;
  } else if(e.type === "pointermove" && pointers.has(e.pointerId)){
    pointers.set(e.pointerId, {x,y});
    if(dragPaddle) player.x = x * VIEW_W - player.w/2;
  } else {
    pointers.delete(e.pointerId);
    dragPaddle = false;
  }
  audioStart();
  refreshKeys();
  e.preventDefault();
}
cv.addEventListener("pointerdown", canvasPointer);
cv.addEventListener("pointermove", canvasPointer);
cv.addEventListener("pointerup", canvasPointer);
cv.addEventListener("pointercancel", canvasPointer);
cv.addEventListener("pointerleave", e=>{ pointers.delete(e.pointerId); dragPaddle=false; refreshKeys(); });

document.addEventListener("keydown", e=>{
  if(e.key==="ArrowLeft"||e.key==="a") keys.left=true;
  if(e.key==="ArrowRight"||e.key==="d") keys.right=true;
});
document.addEventListener("keyup", e=>{
  if(e.key==="ArrowLeft"||e.key==="a") keys.left=false;
  if(e.key==="ArrowRight"||e.key==="d") keys.right=false;
});

function clampPaddle(){
  if(player.x < 0) player.x = 0;
  if(player.x + player.w > VIEW_W) player.x = VIEW_W - player.w;
}

function update(){
  if(state !== "play") return;

  if(keys.left) player.x -= 7;
  if(keys.right) player.x += 7;
  clampPaddle();

  let targetX = ball.x - ai.w/2;
  targetX += (Math.random()*30 - 15);
  if(ai.x < targetX) ai.x += Math.min(aiSpeed, targetX - ai.x);
  if(ai.x > targetX) ai.x -= Math.min(aiSpeed, ai.x - targetX);
  if(ai.x < 0) ai.x = 0;
  if(ai.x + ai.w > VIEW_W) ai.x = VIEW_W - ai.w;

  ball.x += ball.vx;
  ball.y += ball.vy;

  if(ball.x - ball.r < 0){ ball.x = ball.r; ball.vx *= -1; sound("wall"); }
  if(ball.x + ball.r > VIEW_W){ ball.x = VIEW_W - ball.r; ball.vx *= -1; sound("wall"); }

  if(ball.vy > 0 &&
     ball.y + ball.r >= player.y &&
     ball.y + ball.r <= player.y + player.h + 8 &&
     ball.x >= player.x && ball.x <= player.x + player.w){
    ball.y = player.y - ball.r;
    let hit = (ball.x - (player.x + player.w/2)) / (player.w/2);
    hit = Math.max(-1, Math.min(1, hit));
    ball.vx = hit * ball.speed * 0.9;
    ball.vy = -Math.abs(ball.vy);
    let m = Math.hypot(ball.vx, ball.vy);
    ball.vx = ball.vx/m * ball.speed;
    ball.vy = ball.vy/m * ball.speed;
    sound("paddle");
  }

  if(ball.vy < 0 &&
     ball.y - ball.r <= ai.y + ai.h &&
     ball.y - ball.r >= ai.y - 8 &&
     ball.x >= ai.x && ball.x <= ai.x + ai.w){
    ball.y = ai.y + ai.h + ball.r;
    let hit = (ball.x - (ai.x + ai.w/2)) / (ai.w/2);
    hit = Math.max(-1, Math.min(1, hit));
    ball.vx = hit * ball.speed * 0.9;
    ball.vy = Math.abs(ball.vy);
    let m = Math.hypot(ball.vx, ball.vy);
    ball.vx = ball.vx/m * ball.speed;
    ball.vy = ball.vy/m * ball.speed;
    sound("paddle");
  }

  if(ball.y - ball.r > VIEW_H){
    aiScore++; aiEl.textContent = aiScore; sound("score");
    if(aiScore >= target){ endGame(false); return; }
    statusEl.className = "status"; statusEl.textContent = "AI SKOR!";
    setTimeout(()=>{ if(state==="play") statusEl.textContent=""; }, 800);
    resetBall(-1);
  }
  if(ball.y + ball.r < 0){
    youScore++; youEl.textContent = youScore; sound("score");
    if(youScore >= target){ endGame(true); return; }
    statusEl.className = "status"; statusEl.textContent = "KAMU SKOR!";
    setTimeout(()=>{ if(state==="play") statusEl.textContent=""; }, 800);
    resetBall(1);
  }
}

function endGame(win){
  state = win ? "win" : "lose";
  if(win){ statusEl.className="status win"; statusEl.textContent="KAMU MENANG!"; createConfetti(); sound("win"); }
  else { statusEl.className="status lose"; statusEl.textContent="AI MENANG!"; gameArea.classList.add("shake"); sound("lose"); setTimeout(()=>gameArea.classList.remove("shake"),400); }
  setTimeout(showMenu, 2200);
}

function draw(){
  ctx.fillStyle = "#0b1020";
  ctx.fillRect(0,0,VIEW_W,VIEW_H);

  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 3;
  ctx.setLineDash([10,12]);
  ctx.beginPath(); ctx.moveTo(0, VIEW_H/2); ctx.lineTo(VIEW_W, VIEW_H/2); ctx.stroke();
  ctx.setLineDash([]);

  if(state === "menu") return;

  ctx.fillStyle = "rgba(91,255,155,0.08)";
  ctx.font = "bold 120px Arial"; ctx.textAlign="center";
  ctx.fillText(youScore, VIEW_W/2, VIEW_H*0.66);
  ctx.fillStyle = "rgba(255,85,119,0.08)";
  ctx.fillText(aiScore, VIEW_W/2, VIEW_H*0.32);

  ctx.fillStyle = "#ff5577";
  roundRect(ai.x, ai.y, ai.w, ai.h, 6); ctx.fill();
  ctx.fillStyle = "#5bff9b";
  roundRect(player.x, player.y, player.w, player.h, 6); ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, 7); ctx.fill();

  if(state === "play"){
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "bold 12px Arial"; ctx.textAlign="center";
    ctx.fillText("GESER KE KIRI   KANAN", VIEW_W/2, VIEW_H-8);
  }
}
function roundRect(x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}

function createConfetti(){
  const colors = ["#ff5577","#5b7cff","#ffd23f","#5bff9b","#fff"];
  for(let i=0;i<60;i++){
    const piece = document.createElement("div");
    piece.className = "confetti";
    piece.style.background = colors[i%colors.length];
    piece.style.left = Math.random()*100 + "vw";
    piece.style.top = "-10px";
    piece.style.animationDelay = Math.random()*0.4 + "s";
    piece.style.transform = "rotate(" + (Math.random()*360) + "deg)";
    document.body.appendChild(piece);
    setTimeout(()=>piece.remove(), 1700);
  }
}

function startGame(){
  audioStart();
  diff = diffEl.value;
  target = Number(targetEl.value);
  lvlEl.textContent = diff === "easy" ? "EASY" : (diff === "hard" ? "HARD" : "MED");
  youScore = 0; aiScore = 0;
  youEl.textContent = "0"; aiEl.textContent = "0";
  menu.classList.add("hidden");
  gameArea.classList.remove("hidden");
  initGame();
  state = "play";
  statusEl.className = "status";
  statusEl.textContent = "MAIN!";
  setTimeout(()=>{ if(state==="play") statusEl.textContent=""; }, 700);
}
function showMenu(){
  state = "menu";
  gameArea.classList.add("hidden");
  menu.classList.remove("hidden");
}
document.getElementById("start").onclick = startGame;
document.getElementById("menuBtn").onclick = showMenu;

let last = 0;
function loop(t){
  if(!last) last = t;
  update();
  draw();
  requestAnimationFrame(loop);
}
state = "menu";
requestAnimationFrame(loop);
</script>
</body>
</html>`;

const handler = async (m, { conn }) => {
  const payload = {
    messageContextInfo: {
      deviceListMetadata: {},
      deviceListMetadataVersion: 2,
      botMetadata: {
        messageDisclaimerText: "",
        botResponseId: "b2e40280-433c-45d8-9c1a-270bec558860",
        verificationMetadata: {
          proofs: [
            {
              version: 1,
              useCase: 1,
              signature: "TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LVZlcmlmaWNhdGlvblNpZ25hdHVyZS5NZXRhZGF0YeN55YRyad2+ZA==",
              certificateChain: [
                "TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LUNlcnRpZmljYXRlQ2hhaW4uTWV0YWRhdGEOvtJr968bbpKdZreOTwkk9aPN++XPE60RfuzNLkXXc7LE8BOkJOWRpo2oNXaRJ3uCNJ43HY3A+oetnvHSfcxWqmvvTSrBOI5V1NOD6RMsZ/st1XVPUx83AGps1l5jYBOYzqMNy6un2tToJ2Bt9bXRo29tWLZTu8m7TNY/hISwVpVc5tjSet5U7btPN+dMIx2UvykB1jcbWGsdklheeuz8RXSStNXzeaGvsf1lpZ/ugLE4b2BdmlRNKrY6zLE4qFtRYQoS7axOyQX+4QUyN2m9bfm7urQmn+QRSXJwMO7X5kAJJLbkVGJFt9Pm9VXPwQVrK2aaqiXlpusj+7DfDw00OULmYMmZDTqXM0nUVLxj13z0LhMQoQhhNG8utdUn4uKOFceliTZ/xiP+A54GnX9620641bqw3ctfh9NNXPsTEK8hAUD7FDqUhVntHmoEYYEHq8X1tHHZYP49/f2iezTiE8AUaoZo42/jIWQIKohOGNUib2hEqMkW8NsR8vPihvNuqPc0zKZcl6359YFQdjiiW8kCRD/rsDOr9v1eYLFZKYloFyzFqEgj+jcG/V47elOjShJ5CCPwatXwP6HIloVwtgygFsnOFmCg6Ojoivfoz8Nw1qxFwg5OU2cq/1WbWNELKnaFg4eUWCAIJ/3ZIJsEPkgemZxGhE+hdiNn9dkQYBJs1kx2BxdIkJmQ9vJSKkrMz6lTxZM3IJ9mhmKS6zYdU1ppeAao0/ayte997DQParb/AHLN79g0iW1ad0z8ir5jAl0q3a+UZPTSa4YiUqC2PZ/gfxG5wvL2mKmeKowG0RXjmEp5iNxrni+T/HRLZOoH7y0DQ24nMCPg",
                "TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LUNlcnRpZmljYXRlQ2hhaW4uTWV0YWRhdGHsL0Ccm0ELINFZ2IaBhKaeWnVuh0o6nZLCioCn9xpSADzwIS5VCWO+1eVXT2atJOyf7FYlpB0/JA3Us+aQtekuIkHu/zBXijORZ4ClF4+sF3cSTNg6gY/+6iwLK/zs3bMg+GeJrcI65vXfs95Shxlb2Rd5GRT2/2yBmR6Zkf5QwMJuptUHWtM26WY7/xlkEKGFYDZVqOSylusiOzSALa815zC6dCiHoJNLBEKMlaZZQOk57/+OYoU5zzTaEgLhyvNFHSyAlyLQ3SGFtVHAaJZHSmmSPyJowCOB+92Gkk6SWVMsk6FbU8QJWFtlhzV/W/gZ7WzUlS/AKgN0th9/cq20ToFkW7X9c+rtYavufmuieqFhXgaMD8AGsoN9QC/HzNC9D1nydPfFYEUr9BHVy2nF5gM58Y59r2rT8p5LPARIkUp8g+5DLhyW0tdZFZ1305o4AHCayZnp5rjcU2Xi/c1Qf/djBGakmijlMs4aMzKJYD0c4Q8jdI7sNyd876K2wRD+L6KeD2QB3PtCS4P7BWAl5gh5CJ6ZBrwcaKXZqcSjEwm52MqVCgYZdapAaNYUy/QndttjLOG0wxxwuX1hIhMjPnIKZR1kwnqD5EqlHpilrnojRZvjVGN4zEKmilS8rNstt4HHs/D849W+Q6LRVWiWMs0cT2IugrX+Skxd8En7Gq52UEmuVBrSTpN+UpIu20NsVb9lsvuYh3XO441606tOEY2eKcZJdTtqrOTNqbbTk0zVn1yhbOCvmfctBNDhTwaC5QMi0P9wjU5XI9SBtkdQLizc5oqpoiHeqgb8+aJHVLcbgIJ/KLZKtRWFDfzRNM02Csx4etUUapVd2NA/L0oMs/O5T9sVj9FBJ7q99GWr3PVmxJb36mHZLXC4k1gGN9swE0LtzYsUdT5tUo9ri/hS3W/SM+F1p4Kh4QIgRcG3ciIHGN44bnDh3HDCz0fDnzKYw0bclMxZZPctEyJ5gEOPF6OAkjD9dEaRGq/tEPf1k9Aub+v2dEjnfrYWAm4E5Zfhs2Xh0CT0k+SzhgKd0K/46ChJ20G5+blwpIvahvTVS68+aVIX6CwXs4tcVx6FnmVsMOOkIasfaqQLZYbNBkuLoZnQAq4j8yRekrQ=="
              ]
            }
          ]
        }
      }
    },
    botForwardedMessage: {
      message: {
        richResponseMessage: {
          messageType: 1,
          submessages: [
            {
              messageType: 2,
              messageText: "Fiora Sylvie"
            }
          ],
          unifiedResponse: {
            data: Buffer.from(JSON.stringify({
              response_id: "4db57b2c-8393-484d-8b9a-8e6d1a14b349",
              sections: [
                {
                  view_model: {
                    primitive: {
                      __typename: "GenAIaeacdsnwHtmlPrimitive",
                      payload: htmlCode,
                      trusted_sources: ["nixel.dev"]
                    },
                    __typename: "GenAISingleLayoutViewModel"
                  }
                }
              ]
            })).toString("base64")
          },
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedAiBotMessageInfo: {
              botJid: "867051314767696@bot"
            },
            forwardOrigin: 4
          }
        }
      }
    }
  };

  await conn.relayMessage(m.from, payload, {});
};

handler.command = /^pong$/i;
handler.tags    = ["games"];
handler.help    = ["pong"];
handler.owner   = false;
handler.premium = false;
handler.limit   = 1;

export default handler;