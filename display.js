// One fixed logical viewport across every screen. Letterbox instead of reflow/stretch.
function fitGameDisplay(){const width=1920,height=1080,scale=Math.min(window.innerWidth/width,window.innerHeight/height),frame=document.getElementById('game-display');frame.style.transform='scale('+scale+')';frame.style.left=((window.innerWidth-width*scale)/2)+'px';frame.style.top=((window.innerHeight-height*scale)/2)+'px';}
window.addEventListener('resize',fitGameDisplay);fitGameDisplay();
