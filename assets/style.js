/* ================= ANIMASI HALUS ================= */
@keyframes ryFadeUp   { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: none } }
@keyframes ryFade     { from { opacity: 0 } to { opacity: 1 } }
@keyframes ryScale    { from { opacity: 0; transform: scale(.96) } to { opacity: 1; transform: none } }
@keyframes ryRipple   { to   { transform: scale(4); opacity: 0 } }
@keyframes ryShimmer  { 0%   { background-position: -400px 0 } 100% { background-position: 400px 0 } }
@keyframes rySpin     { to   { transform: rotate(360deg) } }
@keyframes ryBar      { from { transform: scaleX(0) } to { transform: scaleX(1) } }

.view-enter { animation: ryFadeUp .38s cubic-bezier(.2,.8,.2,1) both }
.tool-enter { animation: ryFadeUp .42s cubic-bezier(.2,.8,.2,1) both }

#grid.staggering .tool-card { animation: ryScale .35s cubic-bezier(.2,.8,.2,1) both; animation-delay: calc(var(--i, 0) * 25ms) }

/* Feedback ketuk (ripple) */
.btn, .chip, .icon-btn, .tool-card { position: relative; overflow: hidden; }
.ry-ripple { position: absolute; border-radius: 50%; background: currentColor; opacity: .28;
  transform: scale(0); animation: ryRipple .6s cubic-bezier(.2,.8,.2,1) forwards; pointer-events: none; }

/* Skeleton loading untuk tool yang belum termount */
#tool-root:empty {
  min-height: 12rem; border-radius: .8rem;
  background: linear-gradient(90deg, var(--field) 0%, var(--line) 50%, var(--field) 100%);
  background-size: 800px 100%; animation: ryShimmer 1.2s linear infinite;
}
.spinner { display: inline-block; width: 1rem; height: 1rem;
  border: 2.5px solid var(--line); border-top-color: var(--accent);
  border-radius: 50%; animation: rySpin .7s linear infinite; }

/* Transisi tema halus (dipasang hanya saat tombol tema diklik) */
html.theme-anim, html.theme-anim *, html.theme-anim *::before, html.theme-anim *::after {
  transition: background-color .28s ease, border-color .28s ease,
              color .28s ease, fill .28s ease, box-shadow .28s ease !important;
}

/* View Transitions API (Chrome/Edge modern) */
::view-transition-old(root) { animation: ryFade .18s ease both }
::view-transition-new(root) { animation: ryFade .28s ease both }

/* Bar progres tipis di atas saat berpindah halaman */
#ry-progress { position: fixed; top: 0; left: 0; height: 3px; width: 100%;
  background: var(--accent); transform-origin: left; transform: scaleX(0);
  z-index: 80; pointer-events: none; }
#ry-progress.run { animation: ryBar .35s ease forwards }

/* Hormati preferensi aksesibilitas */
@media (prefers-reduced-motion: reduce) {
  .view-enter, .tool-enter, .ry-ripple, #grid.staggering .tool-card,
  .spinner, #ry-progress.run { animation: none !important }
}