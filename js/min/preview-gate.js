(function(){"use strict";const s="CoastlineVIP",a="cc-preview-ok",c=navigator.userAgent||"";if(navigator.webdriver||/Chrome-Lighthouse|PageSpeed|GTMetrix|Lighthouse|HeadlessChrome|bot|crawler|spider|bingpreview/i.test(c)||sessionStorage.getItem(a)==="1")return;const o=document.createElement("style");o.textContent=`
    #cc-preview-gate {
      position: fixed; inset: 0; z-index: 99999;
      display: flex; align-items: center; justify-content: center;
      padding: 1.5rem;
      overflow: hidden;
      background: linear-gradient(160deg, #0A2424 0%, #1E4E4E 55%, #2A6868 100%);
      color: #FBF6EC;
      font-family: Poppins, system-ui, sans-serif;
    }
    #cc-preview-gate .gate-bg { position: absolute; inset: 0; }
    #cc-preview-gate .gate-bg img {
      width: 100%; height: 100%; object-fit: cover; display: block;
      opacity: 0; transition: opacity 1.4s ease;
    }
    #cc-preview-gate .gate-bg.is-loaded img { opacity: 1; }
    @media (prefers-reduced-motion: no-preference) {
      #cc-preview-gate .gate-bg.is-loaded img {
        animation: cc-gate-drift 36s ease-in-out infinite alternate;
      }
    }
    @keyframes cc-gate-drift {
      from { transform: scale(1.04) translateY(0.6%); }
      to   { transform: scale(1.12) translateY(-0.6%); }
    }
    /* Scrim keeps the card and copy readable over the rendering */
    #cc-preview-gate .gate-bg::after {
      content: ""; position: absolute; inset: 0;
      background: linear-gradient(180deg, rgba(10,36,36,0.62) 0%, rgba(10,36,36,0.30) 45%, rgba(10,36,36,0.72) 100%);
    }
    #cc-preview-gate .gate-credit {
      position: absolute; right: 1rem; bottom: 0.75rem; z-index: 1;
      font-size: 0.62rem; letter-spacing: 0.08em; text-transform: uppercase;
      color: rgba(251,246,236,0.55); margin: 0;
    }
    #cc-preview-gate .gate-card {
      position: relative; z-index: 1;
      width: 100%; max-width: 400px;
      background: rgba(10, 36, 36, 0.52);
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
  `,document.documentElement.appendChild(o);function n(){document.body.classList.add("cc-gate-lock");const e=document.createElement("div");e.id="cc-preview-gate",e.setAttribute("role","dialog"),e.setAttribute("aria-modal","true"),e.setAttribute("aria-label","Client preview access"),e.innerHTML=`
      <div class="gate-bg" aria-hidden="true">
        <img
          src="assets/images/coastline-rendering-w1920.jpg"
          srcset="assets/images/coastline-rendering-w768.webp 768w, assets/images/coastline-rendering-w1200.webp 1200w, assets/images/coastline-rendering-w1920.webp 1920w"
          sizes="100vw" alt="" decoding="async" fetchpriority="high" />
      </div>
      <p class="gate-credit">Architectural rendering &middot; Render arquitect&oacute;nico</p>
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
    `,document.body.appendChild(e);const t=e.querySelector(".gate-bg img");if(t){const r=()=>t.parentElement.classList.add("is-loaded");t.complete&&t.naturalWidth?r():t.addEventListener("load",r,{once:!0})}const d=document.getElementById("cc-gate-form"),i=document.getElementById("cc-gate-pass"),g=document.getElementById("cc-gate-err");d.addEventListener("submit",r=>{r.preventDefault(),(i.value||"").trim()===s?(sessionStorage.setItem(a,"1"),e.remove(),document.body.classList.remove("cc-gate-lock")):(g.textContent="Incorrect code. Try again.",i.value="",i.focus())})}document.body?n():document.addEventListener("DOMContentLoaded",n)})();
