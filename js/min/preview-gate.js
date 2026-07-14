(function(){"use strict";const i="CoastlineVIP",r="cc-preview-ok";if(sessionStorage.getItem(r)==="1")return;const o=document.createElement("style");o.textContent=`
    #cc-preview-gate {
      position: fixed; inset: 0; z-index: 99999;
      display: flex; align-items: center; justify-content: center;
      padding: 1.5rem;
      background: linear-gradient(160deg, #0A2424 0%, #1E4E4E 55%, #2A6868 100%);
      color: #FBF6EC;
      font-family: Poppins, system-ui, sans-serif;
    }
    #cc-preview-gate .gate-card {
      width: 100%; max-width: 400px;
      background: rgba(251, 246, 236, 0.06);
      border: 1px solid rgba(201, 113, 79, 0.35);
      border-radius: 1.25rem;
      padding: 2rem 1.75rem;
      backdrop-filter: blur(16px);
      box-shadow: 0 24px 60px rgba(0,0,0,0.35);
    }
    #cc-preview-gate .gate-eyebrow {
      font-size: 0.7rem; letter-spacing: 0.16em; text-transform: uppercase;
      color: #E39A7B; margin-bottom: 0.5rem;
    }
    #cc-preview-gate h1 {
      font-family: "Playfair Display", Georgia, serif;
      font-size: 1.75rem; font-weight: 500; margin: 0 0 0.5rem;
    }
    #cc-preview-gate p {
      font-size: 0.9rem; opacity: 0.75; line-height: 1.5; margin: 0 0 1.25rem;
    }
    #cc-preview-gate input {
      width: 100%; padding: 0.75rem 1rem; border-radius: 0.65rem;
      border: 1px solid rgba(251,246,236,0.2);
      background: rgba(0,0,0,0.25); color: #FBF6EC;
      font-size: 1rem; margin-bottom: 0.75rem; outline: none;
    }
    #cc-preview-gate input:focus {
      border-color: #C9714F; box-shadow: 0 0 0 3px rgba(201,113,79,0.25);
    }
    #cc-preview-gate button {
      width: 100%; padding: 0.8rem 1rem; border: none; border-radius: 9999px;
      background: #C9714F; color: #FBF6EC; font-weight: 600;
      letter-spacing: 0.08em; text-transform: uppercase; font-size: 0.75rem;
      cursor: pointer;
    }
    #cc-preview-gate button:hover { filter: brightness(1.08); }
    #cc-preview-gate .gate-err {
      color: #f0a090; font-size: 0.8rem; min-height: 1.2em; margin-bottom: 0.5rem;
    }
    body.cc-gate-lock { overflow: hidden !important; }
  `,document.documentElement.appendChild(o);function a(){document.body.classList.add("cc-gate-lock");const e=document.createElement("div");e.id="cc-preview-gate",e.setAttribute("role","dialog"),e.setAttribute("aria-modal","true"),e.setAttribute("aria-label","Client preview access"),e.innerHTML=`
      <div class="gate-card">
        <p class="gate-eyebrow">Private client preview</p>
        <h1>Coastline Condos</h1>
        <p>This progress site is password-protected. Enter the access code shared by the team.</p>
        <p class="gate-err" id="cc-gate-err" aria-live="polite"></p>
        <form id="cc-gate-form" autocomplete="off">
          <label for="cc-gate-pass" class="sr-only" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)">Password</label>
          <input id="cc-gate-pass" type="password" name="password" placeholder="Access code" required autofocus />
          <button type="submit">Enter preview</button>
        </form>
      </div>
    `,document.body.appendChild(e);const c=document.getElementById("cc-gate-form"),t=document.getElementById("cc-gate-pass"),n=document.getElementById("cc-gate-err");c.addEventListener("submit",s=>{s.preventDefault(),(t.value||"").trim()===i?(sessionStorage.setItem(r,"1"),e.remove(),document.body.classList.remove("cc-gate-lock")):(n.textContent="Incorrect code. Try again.",t.value="",t.focus())})}document.body?a():document.addEventListener("DOMContentLoaded",a)})();
