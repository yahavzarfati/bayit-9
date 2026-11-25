export const styles = `
  :host {
    display: block;
    container-type: inline-size;
    color: #fff;
    font: 500 14px/1.4 var(--primary-font-family, system-ui, sans-serif);
    -webkit-tap-highlight-color: transparent;
  }
  *, *::before, *::after { box-sizing: border-box; }
  [hidden] { display: none !important; }
  :where(button, input, select) { font: inherit; }
  button { cursor: pointer; color: inherit; touch-action: manipulation; }
  button:disabled { cursor: default; opacity: .54; }
  :focus-visible { outline: 2px solid #d3f1ff; outline-offset: 3px; }
  ha-icon { display: inline-grid; flex: none; width: 20px; height: 20px; --mdc-icon-size: 20px; }
  .shell {
    color-scheme: dark;
    --ink: #fff;
    --secondary: rgba(255,255,255,.84);
    --line: rgba(255,255,255,.28);
    --soft-line: rgba(255,255,255,.18);
    --quiet-icon: rgba(255,255,255,.87);
    --surface: #282828;
    --control: rgba(255,255,255,.05);
    --warm: #ffdf92;
    --boiler-heat: #ff9b69;
    --moving: #9edcff;
    --critical: #ffc7c5;
    --control-radius: 16px;
    --edge: clamp(11px,3.65vw,24px);
    --room-gap: 8px;
    --toolbar-min: 48px;
    --wallpaper: radial-gradient(ellipse at 78% -5%,rgba(145,250,199,.55),transparent 46%),
      radial-gradient(ellipse at 5% 40%,rgba(76,207,178,.37),transparent 47%),
      radial-gradient(ellipse at 80% 75%,rgba(125,103,230,.34),transparent 50%),
      linear-gradient(148deg,#092328 0%,#102c35 38%,#1a1738 68%,#080e1d 100%);
    position: relative;
    min-width: 0;
    min-height: 224px;
    padding: 2px var(--edge) max(8px, env(safe-area-inset-bottom,0px));
    color: var(--ink);
    background: var(--wallpaper);
  }
  .shell[data-page=true] {
    --page-top: max(0px,calc(8px - var(--bayit-page-top,0px)));
    --page-bottom: max(8px,env(safe-area-inset-bottom,0px));
    --room-rows: var(--bayit-room-rows,5);
    --room-available: calc(var(--bayit-view-height,100dvh) - var(--toolbar-min) - var(--page-top) - var(--page-bottom) - 9px);
    --room-block: clamp(132px,calc(var(--room-available) / var(--room-rows) - var(--room-gap)),var(--room-block-limit,164px));
    display: grid;
    grid-template-rows: auto minmax(0,1fr);
    gap: var(--room-gap);
    block-size: var(--bayit-view-height,100dvh);
    min-height: 0;
    padding-block: var(--page-top) var(--page-bottom);
    padding-inline: 0;
  }
  .shell[data-page=true] .toolbar { margin-inline: var(--edge); margin-block-end: 0; }
  .shell[data-page=true] > :is(.room-scroll,.home-empty) { grid-area: 2 / 1; }
  .shell[data-page=true] > .home-empty { align-self: start; margin-inline: var(--edge); }
  .shell[data-page=true] .room-scroll {
    min-height: 0;
    overflow: auto;
    overscroll-behavior: contain;
    scrollbar-width: none;
    padding-inline: var(--edge);
  }
  .shell[data-page=true] .rooms { max-width: 430px; margin-inline: auto; grid-auto-rows: var(--room-block); }
  .shell[data-page=true] .rooms > .room:only-child { grid-column: 1 / -1; }
  .shell[data-page=true] .room { --shortcut-height: clamp(24px,calc((var(--room-block) - 46px) / 3),34px); }
  .shell[data-background=lagoon] {
    --wallpaper: radial-gradient(ellipse at 98% 28%, #335c79 0, transparent 45%),
      radial-gradient(ellipse at 20% 72%, #11635d 0, transparent 58%),
      linear-gradient(138deg,#111e36 12%,#174152 75%,#142533);
  }
  .shell[data-background=dunes] {
    --wallpaper: radial-gradient(ellipse at 86% 18%, #84543d 0, transparent 52%),
      radial-gradient(ellipse at 15% 85%, #59374a 0, transparent 55%),
      linear-gradient(146deg,#321f29 11%,#4c3334 66%,#241d32);
  }
  .shell[data-background=graphite] {
    --wallpaper: radial-gradient(ellipse at 90% 16%, #464c52 0, transparent 50%),
      radial-gradient(ellipse at 20% 96%, #293c46 0, transparent 60%),
      linear-gradient(150deg,#1c2227,#16191d 78%);
  }
  .shell[data-shape=circle] { --control-radius: 999px; }
  .shell[data-shape=square] { --control-radius: 9px; --chrome-radius: var(--control-radius); }
  .toolbar {
    position: sticky;
    z-index: 2;
    inset-block-start: 0;
    display: grid;
    align-items: center;
    min-block-size: var(--toolbar-min);
    margin-block-end: var(--room-gap);
    border-radius: 16px;
    -webkit-backdrop-filter: blur(5px);
    backdrop-filter: blur(5px);
  }
  .brand {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
  .brand h1 { margin: 0; }
  .toolbar-actions {
    display: flex;
    direction: ltr;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 6px 4px;
    width: min(100%,420px);
    margin-inline: auto;
  }
  .toolbar-actions:not(:has(.chrome-button:nth-child(5 of .chrome-button:not([hidden])))) {
    justify-content: center;
    column-gap: 12px;
  }
  .chrome-button, .round-action, .quick-button {
    position: relative;
    display: inline-grid;
    place-items: center;
    padding: 0;
    min-width: 44px;
    min-height: 44px;
    background: var(--control);
    border: 1px solid var(--line);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.11);
    border-radius: var(--control-radius);
    transition: background-color .15s, border-color .15s, color .15s, transform .15s;
  }
  .chrome-button {
    flex: 0 0 44px;
    width: var(--chrome-size,44px);
    height: var(--chrome-size,44px);
    background: transparent;
    border-color: var(--line);
    border-radius: var(--chrome-radius,999px);
  }
  .chrome-button ha-icon {
    width: var(--chrome-icon-size,22px);
    height: var(--chrome-icon-size,22px);
    --mdc-icon-size: var(--chrome-icon-size,22px);
  }
  .chrome-button:where(:hover,[aria-expanded=true]), .round-action:hover, .quick-button:hover {
    background: rgba(255,255,255,.12);
    color: var(--ink);
  }
  .chrome-button:active, .round-action:active, .quick-button:active { transform: scale(.96); }
  :is(.chrome-button,.quick-button)[data-popup-origin] { box-shadow: inset 0 0 0 2px var(--warm); }
  .badge {
    position: absolute;
    inset-block-end: -2px;
    inset-inline-end: -2px;
    min-width: 18px;
    min-height: 18px;
    padding: 0 4px;
    line-height: 16px;
    border-radius: 999px;
    background: rgba(255,255,255,.08);
    color: var(--warm);
    border: 1px solid var(--line);
    font-size: 10px;
    text-align: center;
    font-weight: 800;
  }
  .chrome-button[data-role=presence] .badge {
    inset-block-end: 4px;
    inset-inline-end: 4px;
    min-inline-size: 27px;
    min-block-size: 19px;
    line-height: 17px;
    background: transparent;
    color: var(--ink);
    pointer-events: none;
  }
  .rooms { display: grid; direction: ltr; grid-template-columns: repeat(2,minmax(0,1fr)); gap: var(--room-gap); }
  .room {
    --shortcut-width: 39px;
    --shortcut-height: 30px;
    --shortcut-gap: 3px;
    display: grid;
    direction: ltr;
    grid-template-areas: "status status" "title quick";
    grid-template-columns: minmax(0,1fr) auto;
    grid-template-rows: 17px minmax(0,1fr);
    gap: 3px;
    min-width: 0;
    min-height: 132px;
    padding: 6px 7px;
    border-radius: 18px;
    border: 1px solid var(--line);
    background: transparent;
    -webkit-backdrop-filter: blur(8px);
    backdrop-filter: blur(8px);
  }
  .room[data-current], .room[data-popup-origin] { box-shadow: inset 0 0 0 2px var(--warm); }
  .shell[data-layout=header] .room {
    grid-template-areas: "title" "status" "quick";
    grid-template-columns: minmax(0,1fr);
    grid-template-rows: auto 20px minmax(0,1fr);
  }
  .room-title {
    grid-area: title;
    display: grid;
    grid-template-areas: "label label" "icon count";
    grid-template-columns: 26px minmax(0,1fr);
    grid-template-rows: auto 26px;
    gap: 3px 4px;
    align-items: center;
    align-content: end;
    align-self: end;
    text-align: left;
    min-width: 0;
    min-height: 44px;
    padding: 3px 0;
    border: 0;
    border-radius: 8px;
    background: transparent;
    font-size: 14px;
    line-height: 1.13;
    font-weight: 700;
  }
  .room-title > ha-icon:first-child, .room-turn-off > ha-icon {
    grid-area: icon;
    width: 26px;
    height: 26px;
    --mdc-icon-size: 26px;
  }
  .room:has(.room-turn-off) .room-title > ha-icon:first-child { visibility: hidden; }
  .room-turn-off {
    grid-area: title;
    position: relative;
    display: grid;
    align-items: center;
    justify-items: start;
    align-self: end;
    justify-self: start;
    min-inline-size: 30px;
    min-block-size: 26px;
    margin-block-end: 3px;
    padding: 0;
    border: 0;
    border-radius: 8px;
    background: transparent;
  }
  .room-turn-off > ha-icon { grid-area: auto; }
  .room-turn-off[aria-disabled=true] { cursor: not-allowed; }
  .room-turn-off[aria-busy=true] { opacity: .55; }
  .room-title > :is(.room-name,span:first-of-type:not(.room-count)) {
    grid-area: label;
    min-width: 0;
    overflow-wrap: anywhere;
    text-align: center;
  }
  .shell[dir=rtl] .room-title > :is(.room-name,span:first-of-type:not(.room-count)), .shell[dir=rtl] .room-status span {
    direction: rtl;
  }
  .shell[data-page=true][data-layout=classic] .room-title > .room-name { white-space: pre-line; }
  .room-title .chevron { display: none; }
  .room-count {
    grid-area: count;
    justify-self: start;
    min-width: 16px;
    padding: 1px 4px;
    border: 1px solid var(--soft-line);
    border-radius: 999px;
    color: var(--secondary);
    text-align: center;
    font-size: 10px;
    line-height: 1.15;
  }
  .shell[data-layout=header] .room-title {
    grid-template-areas: "icon label count";
    grid-template-columns: 22px minmax(0,1fr) auto;
    grid-template-rows: 1fr;
    align-self: stretch;
  }
  .shell[data-layout=header] .room-turn-off { align-self: center; min-inline-size: 24px; margin-block-end: 0; }
  .shell[data-layout=header] .room-title > :is(.room-name,span:first-of-type:not(.room-count)) {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: left;
  }
  .room-status-strip {
    grid-area: status;
    align-self: start;
    display: flex;
    gap: 3px;
    min-width: 0;
    overflow: hidden;
  }
  .room-status {
    flex: 0 1 auto;
    min-width: 0;
    display: inline-flex;
    align-items: center;
    gap: 3px;
    border-radius: 999px;
    color: var(--secondary);
    font-size: 11px;
    font-weight: 690;
    line-height: 1.1;
    padding: 1px 5px;
    border: 1px solid var(--soft-line);
    background: transparent;
    white-space: nowrap;
    overflow: hidden;
  }
  .shell[data-page=true] .rooms:has(.room[data-concurrent-activities]) {
    grid-auto-rows: minmax(var(--room-block), auto);
  }
  .room:is([data-appliance-status],[data-concurrent-activities]) { grid-template-rows: minmax(17px,auto) minmax(0,1fr); }
  .shell[data-layout=header] .room:is([data-appliance-status],[data-concurrent-activities]) { grid-template-rows: auto minmax(20px,auto) minmax(0,1fr); }
  .room:is([data-appliance-status],[data-concurrent-activities]) .room-status-strip { flex-wrap: wrap; overflow: visible; }
  .room:is([data-appliance-status],[data-concurrent-activities]) .room-status { flex: none; max-width: 100%; }
  .room-status[data-tone=finished] { color: #bcead0; border-color: rgba(160,224,188,.4); }
  .room-status ha-icon { --mdc-icon-size: 12px; width: 12px; height: 12px; }
  .room-status[data-badge=temperature] ha-icon { color: #dfeaff; }
  .room-status span { overflow: hidden; text-overflow: ellipsis; }
  .room-status span:empty { display: none; }
  .room-status[data-badge=availability] { flex: none; }
  .room-status[data-tone=warm], .room-count[data-tone=warm] { color: var(--warm); border-color: rgba(255,223,146,.31); }
  .room-status[data-tone=moving], .room-count[data-tone=moving] { color: var(--moving); border-color: rgba(158,220,255,.32); }
  .room-status[data-tone=critical], .room-count[data-tone=critical] { color: var(--critical); border-color: rgba(255,187,187,.42); }
  .quick {
    grid-area: quick;
    display: grid;
    grid-template-columns: repeat(2,var(--shortcut-width));
    grid-auto-rows: var(--shortcut-height);
    gap: var(--shortcut-gap);
    align-self: center;
    justify-content: end;
  }
  .quick:empty { display: none; }
  .quick-button {
    width: var(--shortcut-width);
    height: var(--shortcut-height);
    min-width: 0;
    min-height: 0;
    color: var(--quiet-icon);
    border-color: var(--soft-line);
    background: transparent;
    box-shadow: none;
  }
  .quick-button ha-icon { width: 20px; height: 20px; --mdc-icon-size: 20px; }
  .shell[data-page=true] .quick-button ha-icon {
    --mdc-icon-size: min(24px,calc(var(--shortcut-height) - 4px));
    width: var(--mdc-icon-size);
    height: var(--mdc-icon-size);
  }
  @supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
    .shell[data-page=true] :is(.toolbar .chrome-button,.room-title,.room-turn-off,.quick-button[data-tone=quiet]) > ha-icon:first-child {
      color: var(--home-neutral-glyph, #fff);
    }
  }
  .shell[data-page=true] .quick-button[data-tone=quiet]:not(:disabled) {
    border-color: color-mix(in srgb,var(--ink) 16%,transparent);
  }
  @media (prefers-reduced-transparency: reduce) {
    .shell[data-page=true] .quick-button[data-tone=quiet]:not(:disabled,:hover) {
      background-color: color-mix(in srgb,var(--ink) 10%,var(--surface));
    }
  }
  @media (prefers-contrast: more) {
    .shell[data-page=true] {
      --line: rgba(255,255,255,.58);
      --soft-line: rgba(255,255,255,.31);
      --home-room-outline: 58%;
      --home-toolbar-outline: 58%;
      --home-badge-outline: 31%;
      --home-shortcut-availability-outline: 58%;
    }
    .shell[data-page=true] .quick-button[data-tone=quiet]:not(:disabled) { border-color: var(--soft-line); }
  }
  .shell[data-layout=header] .quick {
    grid-template-columns: repeat(3,var(--shortcut-width));
    justify-content: start;
  }

  .quick-button:is([data-transition=opening], [data-transition=closing])::before {
    content: ""; position: absolute; inset-block-end: 3px; left: calc(50% - 3px);
    width: 6px; height: 6px; border-top: 1.5px solid currentColor; border-right: 1.5px solid currentColor;
    pointer-events: none; animation: cover-direction .8s ease-in-out infinite alternate;
  }
  .quick-button[data-transition=opening]::before { rotate: -45deg; --cover-shift: -1px; }
  .quick-button[data-transition=closing]::before { rotate: 135deg; --cover-shift: 1px; }
  @keyframes cover-direction { from { opacity: .55; } to { transform: translateY(var(--cover-shift)); } }
  .quick-button[data-tone=warm], .current[data-tone=warm] { color: var(--warm); }
  .quick-button[data-tone=moving], .current[data-tone=moving] { color: var(--moving); }
  .quick-button[data-tone=critical], .current[data-tone=critical] { color: var(--critical); }
  .quick-button[data-tone=warm] { background: rgba(255,197,83,.14); border-color: rgba(255,215,147,.39); }
  .quick-button[data-tone=moving] { background: rgba(98,202,255,.14); border-color: rgba(164,225,255,.41); }
  .quick-button[data-tone=critical] { background: rgba(255,146,151,.16); border-color: rgba(255,187,187,.42); }
  .room-status[data-tone=heat], .quick-button[data-tone=heat] {
    color: var(--home-heat-ink,#ffd1b8);
    background: rgba(255,155,105,.16);
    border-color: rgba(255,155,105,.38);
  }
  .shell[data-page=true] .room {
    --home-cover-ink: #a4c8ff;
    --home-heat-ink: #ffd1b8;
    --home-cover-ink-on-light: #001e4d;
    --home-heating-update-ink: #ffb278;
  }
  .shell[data-page=true][data-wallpaper-ink=dark] .room:not([data-wallpaper-ink=light]),
  .shell[data-page=true] .room[data-wallpaper-ink=dark] {
    --home-cover-ink: var(--home-cover-ink-on-light);
    --home-heating-update-ink: #7e3600;
    --home-heat-ink: #792e07;
  }
  .shell[data-page=true] .quick-button[data-entity^="cover."][data-tone=moving] {
    color: var(--home-cover-ink);
    background: rgba(122,167,255,.18);
    border-color: rgba(122,167,255,.38);
  }
  .shell[data-page=true] .room .quick-button[data-unavailable] {
    border-style: dashed;
    border-color: color-mix(in srgb,var(--ink) var(--home-shortcut-availability-outline,48%),transparent);
  }
  .quick-button[data-transition=heating-level] {
    box-shadow: inset 0 0 0 1.5px var(--home-heating-update-ink,#ffb278);
  }
  .quick-button[data-transition=heating-level]::after {
    content: "•••"; position: absolute; inset-block-start: 5px; inset-inline-end: 6px;
    color: var(--home-heating-update-ink,#ffb278); font: 700 8px/1 sans-serif;
    pointer-events: none; animation: heating-level-progress 1s ease-in-out infinite alternate;
  }
  @keyframes heating-level-progress { from { opacity: .65; } to { opacity: 1; } }
  .quick-button[aria-busy=true][data-transition=""]::after {
    content: ""; position: absolute; inset: 4px; border-radius: inherit;
    border: 1px solid transparent; border-block-start-color: currentColor;
    pointer-events: none; animation: progress 1s linear infinite;
  }
  @keyframes progress { to { transform: rotate(360deg); } }
  .empty {
    margin: 0;
    padding: 16px 2px 6px;
    color: var(--secondary);
  }
  .home-empty > .control-button { margin-block: 6px; }
  .modal {
    --panel-top: max(54px,9dvh);
    --panel-bottom: var(--bayit-popup-view-bottom,100dvh);
    --control: transparent;
    --room-tile-fill: transparent;
    --room-icon-fill: transparent;
    --room-icon-line: var(--soft-line);
    --room-command-fill: transparent;
    --room-command-line: var(--line);
    position: fixed;
    inset: var(--panel-top) 0 auto;
    width: min(550px,calc(100% - 2 * var(--edge)));
    height: fit-content;
    max-width: none;
    max-height: calc(var(--panel-bottom) - var(--panel-top) - max(16px,env(safe-area-inset-bottom,0px)));
    margin: 0 auto;
    padding: 0;
    color: var(--ink);
    border: 1px solid var(--line);
    border-radius: 25px;
    background: transparent;
    -webkit-backdrop-filter: blur(18px);
    backdrop-filter: blur(18px);
    overflow: hidden;
    overscroll-behavior: contain;
    transform-origin: var(--motion-x,50%) var(--motion-y,34%);
  }
  .modal:is([data-kind=room],[data-kind=device],[data-room-position],[data-centered-toolbar]) {
    --panel-top: clamp(14px,var(--bayit-popup-area-top,142px),max(14px,calc(var(--panel-bottom) - 180px)));
  }
  .modal:is([data-kind=room],[data-kind=toolbar]) { width: min(860px,calc(100% - 2 * var(--edge))); }
  .modal:is([data-kind=device],[data-centered-toolbar]) {
    --center-bottom-gap: calc(16px + env(safe-area-inset-bottom,0px));
    bottom: max(var(--center-bottom-gap),calc(100dvh - var(--panel-bottom) + var(--center-bottom-gap)));
    max-height: calc(var(--panel-bottom) - var(--panel-top) - var(--center-bottom-gap));
    margin-block: auto;
  }
  .modal[data-kind=device] { width: min(520px,calc(100% - 2 * var(--edge))); }
  @container (max-width: 420px) {
    .shell[data-page=true] .modal[data-kind=toolbar]:has(:is([data-section=electricity],[data-section=water])[data-layout=reading-cards]) { width: calc(100% - 32px); }
  }
  .modal[data-kind=toolbar]:not([data-room-position],[data-centered-toolbar]) {
    --panel-top: clamp(14px,calc(var(--bayit-popup-area-top,142px) - 78px),max(14px,calc(var(--panel-bottom) - 180px)));
  }
  .modal[open] { display: flex; flex-direction: column; }
  .modal[open]:not([data-kind]) { animation: appear 190ms cubic-bezier(.22,1,.36,1); }
  .modal[data-closing] { pointer-events: none; }
  .modal::backdrop { background: rgba(0,0,0,.55); }
  .shell[data-page=true] .modal::backdrop { background: transparent; }
  .modal-header {
    display: flex;
    flex: none;
    direction: ltr;
    align-items: center;
    justify-content: space-between;
    padding: 15px 15px var(--modal-header-end,11px);
    gap: 12px;
  }
  .modal-header h2 {
    display: flex;
    align-items: center;
    flex: 1;
    min-height: var(--modal-title-height,46px);
    padding: 6px 11px;
    gap: 8px;
    border: 1px solid var(--soft-line);
    border-radius: 999px;
    font-size: 15px;
    line-height: 1.18;
    margin: 0;
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .modal-header h2 > ha-icon { --mdc-icon-size: 20px; width: 28px; height: 28px; place-items: center; }
  .shell[dir=rtl] .modal-header h2 { direction: rtl; flex-direction: row-reverse; text-align: left; }
  .modal-header > .round-action { flex: 0 0 44px; border-radius: 999px; }
  @media (max-width: 420px) {
    .shell[data-page=true] .modal:is([data-kind=room],[data-kind=device],[data-room-position]) { width: calc(100% - 32px); }
    .shell[data-page=true] .modal:is([data-kind=room],[data-kind=device],[data-room-position]) .modal-header { padding: 17px 17px var(--modal-header-end,11px); }
    .shell[data-page=true] .modal:is([data-kind=room],[data-kind=device],[data-room-position]) .modal-header h2 { min-height: var(--modal-title-height,50px); }
    .shell[data-page=true] .modal:is([data-kind=room],[data-kind=device],[data-room-position]) .modal-header > [data-role=close] {
      flex-basis: 50px;
      min-block-size: 50px;
    }
  }
  .modal-heading { display: contents; }
  .modal-heading-actions { display: flex; flex: none; }
  .modal:is([data-standalone-heater],[data-standalone-climate]) { --modal-header-end: 6px; --modal-title-height: 0px; }
  .modal[data-standalone-climate] .modal-header { gap: 8px; }
  .modal:is([data-standalone-heater],[data-standalone-climate]) .modal-heading {
    flex: 1; min-width: 0; display: grid; align-items: center; column-gap: 8px;
    grid-template-columns: 44px minmax(0,1fr); grid-template-areas: "info title" "info state";
  }
  .modal:is([data-standalone-heater],[data-standalone-climate]) .modal-heading h2 {
    grid-area: title; display: block; align-self: end; border: 0; padding: 0;
  }
  .compact-device-heading-info { grid-area: info; place-self: center; }
  .compact-device-heading-info > .device-icon { color: inherit; }
  .modal:is([data-standalone-heater],[data-standalone-climate]) .modal-heading .current {
    grid-area: state; align-self: start; margin: 2px 0 0; direction: inherit;
    text-align: left; unicode-bidi: plaintext;
  }
  .confirm .modal-header h2 { min-height: 0; padding: 0; border: 0; }
  .modal-body { flex: 1 1 auto; min-height: 0; padding: 0 15px 15px; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; }
  .modal[data-kind=room] .modal-body { direction: ltr; }
  .shell[dir=rtl] .modal[data-kind=room] .modal-body > :is(.devices,.notice) { direction: rtl; }
  @keyframes appear { from { opacity: 0; transform: scale(.92); } }
  .devices, .settings { display: grid; gap: 12px; }
  .settings { gap: 8px; }
  .settings-screens { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 7px; }
  .settings-shortcuts-title { margin: 0 0 5px; text-align: center; font-size: 13px; font-weight: 760; }
  .settings-system { display: grid; grid-template-columns: repeat(auto-fit,minmax(min(132px,100%),1fr)); gap: 7px; }
  .appearance-preferences { display: grid; gap: 8px; }
  .appearance-disclosure { min-inline-size: 0; margin: 0; border: 1px solid var(--soft-line); border-radius: 16px; }
  .appearance-disclosure > summary {
    display: flex; align-items: center; gap: 9px; min-block-size: 52px; padding: 8px 11px;
    cursor: pointer; list-style: none; border-radius: 15px; font-size: 14px; font-weight: 650;
  }
  .appearance-disclosure > summary::-webkit-details-marker { display: none; }
  .appearance-disclosure > summary::after {
    content: ''; inline-size: 7px; block-size: 7px; flex: none; opacity: .7;
    border: solid currentColor; border-width: 0 1.5px 1.5px 0; transform: rotate(45deg);
  }
  .appearance-disclosure[open] > summary::after { transform: rotate(225deg); }
  .appearance-disclosure > summary:focus-visible { outline-offset: -2px; }
  .appearance-layout > summary::after { margin-inline-start: auto; }
  .appearance-layout-options { display: grid; gap: 8px; padding: 0 10px 10px; }
  .appearance-layout-options > .prefs-group { border: 0; padding: 0; }
  .appearance-layout-options > .prefs-group legend { padding: 0; margin-block-end: 6px; }
  .appearance-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; }
  .appearance-actions > p:not(:empty) { flex-basis: 100%; padding-inline: 2px; }
  .appearance-actions > p:empty { display: none; }
  .device-group { display: grid; gap: 7px; min-width: 0; }
  .device-group-title {
    margin: 1px 2px 0;
    color: var(--secondary);
    font-size: 12px;
    font-weight: 740;
  }
  .devices[data-room=true] .device-group {
    direction: ltr;
    padding: 8px;
    border: 1px solid var(--soft-line);
    border-radius: 18px;
  }
  .devices[data-room=true] .device-group-title {
    grid-column: 1 / -1;
    margin: 1px 0 2px;
    font-size: 13px;
    text-align: center;
  }
  .shell[dir=rtl] .devices[data-room=true] .device { direction: rtl; }
  .devices[data-room=true] .device-group[data-group=room_heating]:has(> .device[data-compact-heater]:only-child) {
    padding: 0;
    border: 0;
  }
  .devices[data-room=true] .device[data-compact-heater] .device-head { direction: ltr; }
  .shell[dir=rtl] .devices[data-room=true] .device[data-compact-heater] .device-detail {
    direction: rtl;
    text-align: left;
  }
  .setup-page, .setup-editor { display: block; min-width: 0; }
  .setup-status { margin: 0; color: var(--secondary); }
  .setup-editor {
    --primary-text-color: var(--ink);
    --secondary-text-color: var(--secondary);
    --card-background-color: var(--surface);
    --setup-divider: var(--soft-line);
    --setup-control-line: var(--line);
    --setup-focus: #d3f1ff;
  }
  .modal > .setup-footer {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    min-width: 0;
    margin: 0 15px 15px;
    padding: 8px;
    border: 1px solid var(--soft-line);
    border-radius: 12px;
  }
  .setup-footer [role=status] {
    flex: 1 1 160px;
    min-width: 0;
    color: var(--secondary);
    font-size: 13px;
    overflow-wrap: anywhere;
  }
  .setup-footer [role=status]:empty { display: none; }
  .device {
    min-width: 0;
    padding: 9px;
    border: 1px solid var(--soft-line);
    background: transparent;
    border-radius: 16px;
  }
  .device[data-toolbar-vacuum-compact] { padding: 5px 7px 7px; }
  .device[data-toolbar-vacuum-compact] .action-list {
    direction: ltr; grid-template-columns: minmax(0,1fr) auto; gap: 4px; margin-block-start: 4px;
  }
  .device[data-toolbar-vacuum-compact] .basic-actions {
    grid-column: 1 / -1; grid-template-columns: repeat(auto-fit,minmax(44px,1fr)); gap: 4px;
  }
  .device[data-toolbar-vacuum-compact] .action-list:has(> .vacuum-extra-controls:not([open])) > .basic-actions { grid-column: 1; }
  .device[data-toolbar-vacuum-compact] .basic-actions > .control-button { padding: 0; }
  .vacuum-extra-controls { min-width: 0; grid-column: 2; }
  .vacuum-extra-controls[open] { grid-column: 1 / -1; }
  .vacuum-extra-controls > summary {
    box-sizing: border-box; width: 44px; min-height: 44px; margin-inline-start: auto; list-style: none;
    display: grid; place-items: center; cursor: pointer; border: 1px solid var(--soft-line);
    border-radius: 999px; background: var(--control);
  }
  .vacuum-extra-controls > summary::-webkit-details-marker { display: none; }
  .vacuum-extra-controls[open] > summary { margin-block-end: 4px; color: var(--moving); }
  .shell[dir=rtl] .vacuum-extra-controls > .field-row { direction: rtl; }
  .device-head { display: grid; grid-template-columns: 32px minmax(0,1fr) 44px; align-items: center; gap: 8px; }
  .device-head.device-state-head { grid-template-columns: minmax(0,1fr) 44px; }
  .device-state-head .current { margin-block-start: 0; }
  .device-head.boiler-state-head { direction: ltr; grid-template-columns: 32px minmax(0,1fr) 44px; }
  .boiler-state-head .device-detail { text-align: left; }
  .shell[dir=rtl] .boiler-state-head .device-detail { direction: rtl; }
  .boiler-state-head > .device-icon {
    width: 32px; height: 32px; --mdc-icon-size: 20px; place-items: center;
    background: var(--room-icon-fill); border: 1px solid var(--room-icon-line); border-radius: 50%;
  }
  .device[data-boiler-heating] .boiler-state-head > .device-icon {
    color: var(--boiler-heat);
    background: color-mix(in srgb,var(--boiler-heat) 14%,transparent);
    border-color: color-mix(in srgb,var(--boiler-heat) 28%,transparent);
  }
  .device[data-inline-climate] { padding: 0; border: 0; }
  .device[data-inline-climate] .device-head {
    --climate-header-icon-width: 36px;
    direction: ltr;
    grid-template-columns: 36px minmax(0,1fr) 44px;
  }
  .device-head:has(> .climate-preset-shortcut:not([hidden])) {
    grid-template-columns: var(--climate-header-icon-width,32px) minmax(0,1fr) 44px 44px;
  }
  .device-state-head:has(> .climate-preset-shortcut:not([hidden])) {
    grid-template-columns: minmax(0,1fr) 44px 44px;
  }
  .device .device-head:has(> .room-climate-power) {
    grid-template-columns: 44px minmax(0,1fr) 44px;
  }
  .device .device-head:has(> .room-climate-power):has(> .climate-preset-shortcut:not([hidden])) {
    grid-template-columns: 44px minmax(0,1fr) 44px 44px;
  }
  .room-climate-power[data-compact] { border-color: transparent; background: var(--room-icon-fill); }
  .room-climate-power[data-compact] > ha-icon { width: 24px; height: 24px; --mdc-icon-size: 24px; }
  .room-climate-power[aria-pressed=true] { color: var(--moving); }
  .climate-preset-shortcut {
    width: 44px; height: 44px; grid-template-rows: 16px 11px; align-content: center; gap: 2px;
    color: var(--secondary);
  }
  .compact-climate-preset-row { display: flex; justify-content: end; }
  .climate-preset-shortcut[data-highlighted] { color: var(--warm); }
  .climate-preset-shortcut > ha-icon { width: 16px; height: 16px; --mdc-icon-size: 16px; }
  .climate-preset-shortcut > span {
    max-width: 36px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 10px;
  }
  .climate-preset-shortcut[hidden] { display: none; }
  .device[data-inline-climate] .device-icon {
    width: 36px;
    height: 36px;
    --mdc-icon-size: 24px;
    place-items: center;
    color: var(--ink);
    background: var(--room-icon-fill);
    border: 1px solid var(--room-icon-line);
    border-radius: 50%;
  }
  .shell[dir=rtl] .device[data-inline-climate] .device-detail { direction: rtl; text-align: left; }
  .device[data-inline-climate] .action-list { margin-block-start: 4px; gap: 5px; }
  .device-panel-launch {
    width:100%; min-block-size:44px; border:0; background:transparent; color:inherit;
    font:inherit; text-align:start; padding:0; border-radius:10px;
  }
  .device-panel-launch > ha-icon:last-child { place-self:center; color:var(--secondary); }
  .device-icon { color: var(--secondary); place-self: center; }
  .device-name { margin: 0; font-size: 14px; line-height: 1.2; overflow-wrap: anywhere; }
  .device-name[data-room-name-hidden] {
    position: absolute; inline-size: 1px; block-size: 1px; margin: -1px; padding: 0;
    overflow: hidden; clip-path: inset(50%); white-space: nowrap;
  }
  .current { display: block; margin-block-start: 3px; color: var(--secondary); font-weight: 680; font-size: 12px; }
  .device-detail { min-width: 0; white-space: normal; }
  .device[data-compact=cover] .device-head {
    direction: ltr;
    grid-template-columns: 36px minmax(0,1fr);
    gap: 5px;
  }
  .device:is([data-compact=tile],[data-compact=cover],[data-room-compact-device]) { background: var(--room-tile-fill); }
  .device[data-room-compact-device] { padding: 5px 7px 7px; }
  .device[data-room-compact-device] .device-panel-launch {
    direction: ltr;
    grid-template-columns: 36px minmax(0,1fr);
    gap: 5px;
    text-align: center;
  }
  .device[data-room-compact-device] .device-name { font-size: 13px; font-weight: 650; }
  .device[data-room-compact-device] .current { display: none; }
  .device[data-room-compact-device] .device-icon {
    width: 36px;
    height: 36px;
    place-items: center;
    border: 1px solid var(--room-icon-line);
    border-radius: 999px;
    background: var(--room-icon-fill);
    color: var(--ink);
  }
  .device[data-room-compact-device][data-lock-state=locked] .device-icon { color: var(--moving); }
  .device[data-room-compact-device][data-lock-state=unlocked] .device-icon { color: var(--critical); }
  .device[data-room-compact-device]:is([data-lock-state=locking],[data-lock-state=unlocking]) .device-icon { color: var(--warm); }
  .device[data-room-compact-device] .action-list { margin-block-start: 4px; }
  .device[data-room-compact-device] .basic-actions {
    direction: ltr;
    grid-template-columns: repeat(auto-fit,minmax(min(44px,100%),1fr));
    gap: 4px;
  }
  .device[data-room-compact-device] .basic-actions .control-button {
    min-width: 0;
    padding: 4px;
    border-color: var(--room-command-line);
    border-radius: 12px;
    background: var(--room-command-fill);
  }
  .device[data-room-compact-device] .basic-actions .control-button:not(:disabled):hover { background: rgba(255,255,255,.12); }
  .device[data-room-compact-device] .basic-actions .control-button[data-action=unlock] { color: var(--ink); }
  .shell[dir=rtl] .device[data-room-compact-device] .device-detail { direction: rtl; }
  .device[data-compact=cover] .device-head:has(> .round-action:not([hidden])) > .device-icon { display: none; }
  .device[data-compact=cover] .device-head > .round-action,
  .device[data-compact=cover] .device-panel-launch > .device-icon {
    grid-area: 1 / 1;
    width: 36px;
    height: 36px;
    min-width: 36px;
    min-height: 36px;
    border-color: var(--room-icon-line);
    border-radius: 999px;
    background: var(--room-icon-fill);
  }
  .device[data-compact=cover] .device-panel-launch > .device-icon { color: var(--ink); place-items: center; }
  .device[data-compact=cover] .device-detail { grid-column: 2; }
  .device[data-compact=cover] .device-name { font-size: 13px; font-weight: 650; }
  .device[data-cover-motion] { outline: 1px solid rgba(244,201,93,.72); outline-offset: -1px; }
  .device[data-cover-motion] .current[data-tone=moving] { color: var(--warm); }
  @media (prefers-contrast: more) {
    .device[data-cover-motion] { outline-width: 2px; outline-offset: -2px; outline-color: var(--warm); }
  }
  @media (forced-colors: active) {
    .device[data-cover-motion] { outline-color: CanvasText; }
  }
  .shell[dir=rtl] .device[data-compact=cover] .device-detail { direction: rtl; text-align: left; }
  .device:has(> .device-tile) { padding: 0; }
  .device-tile {
    display: grid;
    align-content: center;
    justify-items: center;
    gap: 7px;
    width: 100%;
    min-width: 0;
    min-height: 108px;
    height: 100%;
    padding: 8px;
    border: 0;
    border-radius: inherit;
    background: transparent;
    font-size: 13px;
    line-height: 1.2;
    text-align: center;
    overflow-wrap: anywhere;
  }
  .device-tile > ha-icon {
    width: 36px;
    height: 36px;
    align-self: center;
    place-items: center;
    border: 1px solid var(--room-icon-line);
    border-radius: 999px;
    background: var(--room-icon-fill);
    color: var(--ink);
  }
  .device-tile:hover > ha-icon {
    border-color: var(--line);
  }
  .device-tile:is([aria-pressed=true],[data-tone=warm]) > ha-icon {
    color: var(--warm);
    background: rgba(255,197,83,.13);
    border-color: rgba(255,215,147,.35);
  }
  .device-tile .current { margin: 0; font-weight: 600; }
  .device-tile[aria-pressed]:not([data-attention-status]) .current { display: none; }
  .device-tile .device-name { font-size: 13px; font-weight: 700; }
  .devices[data-room=true] .device[data-treatment=light] .device-tile .device-name {
    font-family: var(--primary-font-family, Roboto, Noto, sans-serif);
    font-size: 14px;
    font-weight: 500;
    line-height: 20px;
  }
  .device[data-inline-light] .device-tile {
    min-height: 44px; height: auto;
    grid-template-columns: 32px minmax(0,1fr);
    justify-items: start; align-items: center;
    text-align: start;
  }
  .device[data-inline-light] .device-tile > ha-icon { width: 32px; height: 32px; }
  .device[data-inline-light] .action-list { margin: 0; padding: 0 8px 8px; gap: 2px; }
  :is(.device[data-inline-light],.compact-light-controls) .field-row { grid-template-columns: minmax(0,1fr); }
  :is(.device[data-inline-light],.compact-light-controls) .field-row label {
    display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 0 4px;
    align-items: center;
  }
  :is(.device[data-inline-light],.compact-light-controls) .field-row input { grid-column: 1 / -1; grid-row: 2; }
  :is(.device[data-inline-light],.compact-light-controls) .field-row output { grid-column: 2; grid-row: 1; white-space: nowrap; }
  .device[data-compact-light] .device-state-head {
    direction: ltr; grid-template-columns: 44px minmax(0,1fr) 44px;
  }
  .device-head.device-state-head:has(> .light-status-refresh) {
    grid-template-columns: minmax(0,1fr) 44px 44px;
  }
  .device[data-compact-light] .device-state-head:has(> .light-status-refresh) {
    grid-template-columns: 44px minmax(0,1fr) 44px 44px;
  }
  .compact-brightness { grid-template-columns: minmax(0,1fr); }
  .compact-brightness > label {
    grid-template-columns: minmax(3ch,auto) minmax(0,1fr); align-items: center; gap: 6px; direction: ltr;
  }
  .compact-brightness input { grid-area: 1 / 2; width: 100%; }
  .compact-brightness output { grid-area: 1 / 1; white-space: nowrap; }
  .device[data-compact-light] .device-detail { text-align: left; }
  .compact-light-power[data-powered] { color: var(--warm); }
  .dual-light-detail-controls { display: grid; gap: 8px; min-width: 0; }
  .dual-light-detail-controls .field-row {
    align-items: end;
    grid-template-columns: minmax(0,1fr) auto;
  }
  .compact-light-controls {
    display: grid; grid-template-columns: minmax(0,1fr) 44px; align-items: end; gap: 8px; direction: ltr;
  }
  .compact-light-controls > .field-row { grid-column: 1; grid-row: 1; }
  .compact-light-controls > .round-action { grid-column: 2; grid-row: 1; }
  .compact-light-controls > .round-action[aria-pressed=true] { border-color: var(--warm); }
  .compact-light-controls[data-filled-white-rail] { gap: 4px; }
  .compact-light-controls[data-filled-white-rail] > .round-action { border-radius: 8px; }
  .compact-light-controls[data-filled-white-rail] input[type=range] {
    --white-rail-fill: var(--white-rail-color, var(--warm));
    --white-rail-base: color-mix(in srgb,var(--white-rail-fill) 25%,var(--control));
    --white-rail-background: linear-gradient(to right,var(--white-rail-fill) var(--white-rail-progress),
      var(--white-rail-base) var(--white-rail-progress));
    appearance: none; -webkit-appearance: none; margin: 0;
  }
  .compact-light-controls[data-filled-white-rail] input::-webkit-slider-runnable-track {
    height: 30px; border-radius: 8px; background: var(--white-rail-background);
    border: 1px solid var(--white-rail-outline,var(--line));
  }
  .compact-light-controls[data-filled-white-rail] input::-moz-range-track {
    box-sizing: border-box; height: 30px; border-radius: 8px; background: var(--white-rail-background);
    border: 1px solid var(--white-rail-outline,var(--line));
  }
  .compact-light-controls[data-filled-white-rail] input::-webkit-slider-thumb {
    appearance: none; -webkit-appearance: none; width: 1px; height: 28px; background: transparent;
  }
  .compact-light-controls[data-filled-white-rail] input::-moz-range-thumb {
    width: 1px; height: 28px; border: 0; background: transparent;
  }
  @media (prefers-contrast: more) {
    .compact-light-controls[data-filled-white-rail] input[type=range] { --white-rail-outline: var(--ink); }
  }
  @media (forced-colors: active) {
    .compact-light-controls[data-filled-white-rail] input[type=range] {
      --white-rail-fill: Highlight; --white-rail-base: Canvas; --white-rail-outline: CanvasText;
      forced-color-adjust: none;
    }
    .compact-light-controls[data-filled-white-rail] input:focus-visible { outline-color: Highlight; }
  }
  .shell[dir=rtl] .compact-light-controls label { direction: rtl; }
  .device[data-inline-light][data-compact-light] {
    .device-tile { direction: ltr; }
    .action-list { padding-inline: 6px; }
    .compact-light-controls { align-items: center; gap: 6px; }
    .compact-light-controls label { grid-template-columns: minmax(0,1fr); }
    .compact-light-controls :is(input,output) { grid-area: 1 / 1; }
    .compact-light-controls output {
      align-self: start; justify-self: end; pointer-events: none;
      margin-block-start: 2px; font-size: 10px; line-height: 12px;
    }
    .compact-light-controls > .round-action { border-radius: 12px; }
  }
  .shell[dir=rtl] .device[data-inline-light][data-compact-light] .device-name { direction: rtl; }
  .action-list, .basic-actions { display: grid; gap: 7px; }
  .action-list:empty { display: none; }
  .action-list { margin-block-start: 8px; }
  .basic-actions { grid-template-columns: repeat(auto-fit,minmax(min(80px,100%),1fr)); }
  .device[data-compact=cover] .basic-actions {
    direction: ltr;
    grid-template-columns: repeat(auto-fit,minmax(28px,1fr));
    gap: 3px;
  }
  .control-button {
    min-height: 44px;
    min-width: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 5px 9px;
    border: 1px solid var(--line);
    border-radius: var(--control-radius);
    background: var(--control);
    color: inherit;
    text-decoration: none;
    font-size: 13px;
    font-weight: 720;
  }
  .control-button:hover { background: rgba(255,255,255,.12); }
  .control-button[data-action=unlock] { color: var(--critical); }
  .device[data-compact=cover] .basic-actions .control-button:has(ha-icon) {
    min-width: 28px;
    padding: 4px;
    gap: 0;
    border-color: var(--room-command-line);
    border-radius: 12px;
    background: var(--room-command-fill);
    font-size: 0;
  }
  .device[data-compact=cover] .basic-actions .control-button:not(:disabled):hover {
    background: rgba(255,255,255,.12);
  }
  .field-row { display: grid; grid-template-columns: minmax(0,1fr) minmax(60px,auto); gap: 7px; align-items: end; }
  .field-row label { display: grid; gap: 4px; color: var(--secondary); font-size: 12px; font-weight: 700; }
  .field-row input, .field-row select {
    min-width: 0;
    width: 100%;
    min-height: 44px;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: transparent;
    color: var(--ink);
    padding: 4px 8px;
    font-size: 16px;
    accent-color: var(--warm);
  }
  .field-row input[type=range] { direction: ltr; border: 0; background: transparent; padding: 0; }
  .field-row .light-color-choice { width: 70px; padding: 4px; }
  .field-row select option { background: #292929; color: #fff; }
  .duration-label { color: var(--secondary); background: none; font-size: 12px; }
  .prefs-group { border: 1px solid var(--soft-line); border-radius: 14px; min-width: 0; margin: 0; padding: 8px; }
  .prefs-group legend { padding-inline: 5px; font-size: 13px; font-weight: 760; }
  .prefs-options { display: grid; grid-template-columns: repeat(auto-fit,minmax(min(115px,100%),1fr)); gap: 6px; }
  .swatch { flex: none; width: 16px; height: 16px; border-radius: 5px; border: 1px solid var(--line); }
  .control-button[aria-pressed=true] { border-color: var(--warm); box-shadow: inset 0 0 0 1px var(--warm); }
  .activity-list { display: grid; gap: 6px; margin: 0; padding: 0; list-style: none; }
  .activity-list .control-button { width: 100%; justify-content: space-between; text-align: start; }
  .confirm { --panel-top: max(86px,20dvh); width: min(360px,calc(100% - 28px)); }
  .confirmation-actions { display: flex; gap: 8px; justify-content: end; }
  .confirmation-text { color: var(--secondary); margin: 3px 0 14px; overflow-wrap: anywhere; }
  .notice {
    position: sticky;
    z-index: 1;
    inset-block-end: 6px;
    margin-block-start: 9px;
    padding: 8px 10px;
    color: var(--ink);
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 12px;
    font-size: 13px;
  }
  .notice:empty { display: none; }
  .shell[data-page=true] > .notice {
    position: absolute;
    z-index: 3;
    inset-inline: var(--edge);
    inset-block-end: var(--page-bottom);
  }
  @media (min-width: 300px) {
    .devices[data-room=true] .device-group[data-group=room_devices]:has(> [data-room-compact-device] + [data-room-compact-device]) {
      direction: ltr;
    }
    .devices[data-room=true] .device-group[data-group=room_devices]:not([data-columns="2"]):has(
      > :is([data-room-appliance-tile],[data-room-compact-device]) + :is([data-room-appliance-tile],[data-room-compact-device])
    ) {
      grid-template-columns: repeat(2,minmax(0,1fr));
      > .device:not([data-room-appliance-tile],[data-room-compact-device]) { grid-column: 1 / -1; }
    }
    .devices[data-room=true] .device-group[data-group=room_devices][data-columns="2"]:has(> .device:is([data-compact=tile],[data-room-compact-device])) {
      grid-template-columns: repeat(auto-fill,minmax(min(100%,max(112px,calc((100% - 7px) / 2))),1fr));
      > .device:not([data-compact=tile],[data-room-compact-device]) { grid-column: 1 / -1; }
    }
    .devices[data-room=true] .device-group[data-group=room_lights]:has(> .device[data-compact=tile]) {
      grid-template-columns: repeat(2,minmax(0,1fr));
      .device:not([data-compact=tile]) { grid-column: 1 / -1; }
    }
    .devices[data-room=true] .device-group[data-group=room_covers]:has(> .device[data-compact=cover] + .device[data-compact=cover]) {
      grid-template-columns: repeat(2,minmax(0,1fr));
      .device:not([data-compact=cover]) { grid-column: 1 / -1; }
      .device[data-compact=cover] { padding: 5px; }
    }
    .devices[data-room=true] .device-group[data-group=room_covers][data-columns="2"]:has(> .device[data-compact=cover]) {
      /* Three 44px commands, two 2px gaps, padding and a border need 146px. */
      grid-template-columns: repeat(auto-fill,minmax(min(100%,max(146px,calc((100% - 7px) / 2))),1fr));
      .device:not([data-compact=cover]) { grid-column: 1 / -1; }
      .device[data-compact=cover] { padding: 4px; }
      .device[data-compact=cover] .basic-actions {
        grid-template-columns: repeat(auto-fit,minmax(min(44px,100%),1fr));
        gap: 2px;
      }
    }
  }
  @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
    .modal {
      background: var(--surface);
      --room-tile-fill: rgba(255,255,255,.08);
      --room-icon-fill: rgba(255,255,255,.095);
      --room-icon-line: transparent;
      --room-command-fill: rgba(255,255,255,.055);
      --room-command-line: transparent;
    }
  }
  @media (prefers-reduced-transparency: reduce), (prefers-contrast: more) {
    .shell[data-page=true] { --home-neutral-glyph: currentColor; }
    .modal, .notice { -webkit-backdrop-filter: none; backdrop-filter: none; background: var(--surface); }
    .modal {
      --room-tile-fill: rgba(255,255,255,.08);
      --room-icon-fill: rgba(255,255,255,.095);
      --room-icon-line: transparent;
      --room-command-fill: rgba(255,255,255,.055);
      --room-command-line: transparent;
    }
    .shell[data-page=true] .modal::backdrop { background: rgba(0,0,0,.34); }
    .toolbar, .room { -webkit-backdrop-filter: none; backdrop-filter: none; }
    .chrome-button, .room { background: var(--surface); }
    .chrome-button:is(:hover,[aria-expanded=true]), .chrome-button[data-role=presence] .badge {
      background: color-mix(in srgb,var(--ink) 10%,var(--surface));
    }
    .room-status[data-badge=temperature] ha-icon { color: #a4c8ff; }
    .shell:not([data-page=true]), .modal { --line: rgba(255,255,255,.58); --soft-line: rgba(255,255,255,.31); }

    .shell[data-page=true] .room {
      border-color: color-mix(in srgb,var(--ink) var(--home-room-outline,30%),transparent);
    }
    .shell[data-page=true] .chrome-button {
      border-color: color-mix(in srgb,var(--ink) var(--home-toolbar-outline,24%),transparent);
    }
    .shell[data-page=true] :is(.room-status[data-badge=temperature],.room-count[data-tone=quiet]) {
      background: color-mix(in srgb,var(--ink) 11%,var(--surface));
      border-color: color-mix(in srgb,var(--ink) var(--home-badge-outline,10%),transparent);
    }
    .shell[data-page=true] .room {
      --home-cover-ink: #7aa7ff;
      --home-cover-ink-on-light: var(--moving);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .modal[open]:not([data-kind]), .quick-button[aria-busy=true]::after,
    .quick-button:is([data-transition=opening], [data-transition=closing])::before { animation: none; }
    .chrome-button, .round-action, .quick-button { transition: none; }
    .chrome-button:active, .round-action:active, .quick-button:active { transform: none; }
  }
  @container (max-width: 373px) {
    .room { --shortcut-width: 39px; --shortcut-gap: 3px; padding: 6px; }
    .room-title { grid-template-columns: 21px minmax(0,1fr); font-size: 13px; }
    .room-title > ha-icon:first-child, .room-turn-off > ha-icon { width: 21px; height: 21px; --mdc-icon-size: 21px; }
  }
  @container (max-width: 346px) {
    .toolbar-actions { justify-content: center; }
    .room-status-strip { gap: 2px; }
    .room-status { padding-inline: 2px; gap: 2px; font-size: 10px; }
    .room:not([data-concurrent-activities]) .room-status-strip:has([data-badge=activity]:not([hidden])):has([data-badge=availability]:not([hidden]))
      [data-badge=temperature] > ha-icon { display: none; }
    .shell[data-layout=header] .room-title {
      grid-template-areas: "label label label" "icon . count";
      grid-template-rows: auto 21px;
    }
    .shell[data-layout=header] .room-title > .room-name { text-align: center; }
    .shell[data-layout=header] .room-turn-off { align-self: end; }
  }
  @container (max-width: 320px) {
    .room { --shortcut-width: 35px; --shortcut-height: 32px; padding: 5px; }
    .room-title { grid-template-columns: 19px minmax(0,1fr); column-gap: 2px; }
    .room-title > ha-icon:first-child, .room-turn-off > ha-icon { width: 19px; height: 19px; --mdc-icon-size: 19px; }
    .quick-button ha-icon { width: 18px; height: 18px; --mdc-icon-size: 18px; }
  }
  @container (max-width: 420px) {
    .shell[data-page=true][data-layout=classic] .room-scroll { padding-inline: 16px; }
    .shell[data-page=true][data-layout=classic] .toolbar { margin-inline: 16px; }
    .shell[data-page=true][data-layout=classic] .rooms { grid-auto-rows: minmax(var(--room-block), auto); }
    .shell[data-page=true][data-layout=classic] .room {
      --shortcut-width: clamp(32px,calc((100cqi - 98px) / 6),42px);
      grid-template-areas: "status" "quick" "title";
      grid-template-columns: minmax(0,1fr);
      grid-template-rows: minmax(17px,1fr) auto minmax(31px,max-content);
    }
    .shell[data-page=true][data-layout=classic] .room:is([data-appliance-status],[data-concurrent-activities]) {
      grid-template-rows: minmax(17px,auto) auto minmax(31px,max-content);
    }
    .shell[data-page=true][data-layout=classic] .quick {
      grid-template-columns: repeat(3,minmax(0,1fr));
      grid-template-rows: repeat(2,var(--shortcut-height));
      justify-items: center;
    }
    .shell[data-page=true][data-layout=classic] .quick > :only-child { grid-column: 3; }
    .shell[data-page=true][data-layout=classic] .quick:has(> :nth-child(2):last-child) > :first-child,
    .shell[data-page=true][data-layout=classic] .quick:has(> :nth-child(4):last-child) > :nth-child(odd) { grid-column: 2; }
    .shell[data-page=true][data-layout=classic] .room-title {
      align-self: stretch;
      min-height: 0;
      grid-template-areas: "icon count label";
      grid-template-columns: 22px auto minmax(0,1fr);
      grid-template-rows: 1fr;
      font-size: 12px;
      padding-block: 1px;
    }
    .shell[data-page=true][data-layout=classic] :is(.room-title > ha-icon:first-child,.room-turn-off > ha-icon) {
      width: 22px; height: 22px; --mdc-icon-size: 22px;
    }
    .shell[data-page=true][data-layout=classic] .room-turn-off {
      min-block-size: 31px; min-inline-size: 24px; margin-block-end: 0;
    }
    .shell[data-page=true][data-layout=classic] :is(.room-title > :is(ha-icon,.room-count,.room-name),.room-turn-off > ha-icon) {
      translate: 0 3px;
    }
    .shell[data-page=true][data-layout=classic] .room-title > .room-name { text-align: left; padding-inline-end: 3px; }
  }
  @container (min-width: 320px) and (max-width: 420px) {
    .shell[data-page=true] .toolbar-actions:has(> :nth-child(6 of .chrome-button:not([hidden]))):not(:has(> :nth-child(7 of .chrome-button:not([hidden])))) {
      --chrome-size: 48px;
      --chrome-icon-size: 24px;
      display: grid;
      grid-template-columns: repeat(6,minmax(0,1fr));
      justify-items: start;
      gap: 8px;
    }
  }
  @container (min-width: 374px) and (max-width: 420px) {
    .shell[data-page=true][data-layout=classic] .room:not([data-appliance-status],[data-concurrent-activities]) .quick:not(:has(> :nth-child(7))) {
      row-gap: 0;
      translate: 0 3px;
    }
  }
  .shell[data-page=true][data-layout=header] .room {
    --header-heading-height: 29px;
    --header-symbol-size: 21px;
    --shortcut-width: clamp(29px,10cqi,42px);
    --shortcut-height: clamp(24px,calc((var(--room-block) - 75px) / 2),34px);
    grid-template-rows: var(--header-heading-height) minmax(20px,1fr) auto;
  }
  .shell[data-page=true][data-layout=header] .room:is([data-appliance-status],[data-concurrent-activities]) {
    grid-template-rows: var(--header-heading-height) minmax(20px,auto) auto;
  }
  .shell[data-page=true][data-layout=header] .room-title {
    align-self: start;
    grid-template-areas: "icon count label";
    grid-template-columns: var(--header-symbol-size) auto minmax(0,1fr);
    grid-template-rows: var(--header-heading-height);
    align-content: start;
    padding: 0;
    font-size: 14px;
  }
  .shell[data-page=true][data-layout=header] .room-title > :is(.room-name,span:first-of-type:not(.room-count)) { text-align: right; }
  .shell[data-page=true][data-layout=header] :is(.room-title > ha-icon:first-child,.room-turn-off > ha-icon) {
    width: var(--header-symbol-size); height: var(--header-symbol-size); --mdc-icon-size: var(--header-symbol-size);
  }
  .shell[data-page=true][data-layout=header] .room-turn-off {
    align-self: start;
    min-block-size: var(--header-heading-height);
  }
  .shell[data-page=true][data-layout=header] .quick {
    grid-template-columns: repeat(3,minmax(0,1fr));
    grid-template-rows: repeat(2,var(--shortcut-height));
    justify-items: center;
    align-self: end;
  }
  @container (max-width: 420px) {
    .shell[data-page=true][data-layout=header] { --edge: 16px; }
  }
  @container (max-width: 360px) {
    .shell[data-page=true][data-layout=header] .room {
      --header-heading-height: 38px;
      --header-symbol-size: 16px;
      --header-count-lane: 29px;
      --shortcut-height: clamp(24px,calc((var(--room-block) - 84px) / 2),34px);
    }
    .shell[data-page=true][data-layout=header] .room-title {
      grid-template-areas: "label label label label" ". icon count .";
      grid-template-columns: minmax(0,1fr) var(--header-symbol-size) var(--header-count-lane) minmax(0,1fr);
      grid-template-rows: 17px 18px;
      font-size: 13px;
    }
    .shell[data-page=true][data-layout=header] .room-title > :is(.room-name,span:first-of-type:not(.room-count)) { text-align: center; }
    .shell[data-page=true][data-layout=header] .room-turn-off {
      align-self: end;
      margin-inline-start: calc((100% - var(--header-symbol-size) - var(--header-count-lane) - 4px) / 2);
      align-items: end;
      padding-block-end: 1px;
    }
  }
  @container (max-width: 275px) {
    .rooms { grid-template-columns: 1fr; }
    .room { --shortcut-width: 44px; --shortcut-height: 38px; padding: 8px; }
  }
  @container (min-width: 650px) {
    .room { --shortcut-width: 48px; padding: 8px 12px; }
    .room-title { font-size: 17px; }
    .shell:not([data-layout=header]) .room-title {
      justify-self: start;
      inline-size: max-content;
      min-inline-size: min(44px,100%);
      max-inline-size: min(126px,100%);
    }
    .room-status { font-size: 12px; }
    .shell[data-page=true][data-wide-left][data-layout=classic] {
      .room { --shortcut-width: 42px; padding: 5px 8px 7px; }
      .room-title { font-size: 14px; line-height: 1.1; }
      .room-status { font-size: 11px; }
      @supports (height: round(down,33.5px,1px)) {
        .room { --shortcut-height: clamp(24px,round(down,calc((var(--room-block) - 46px) / 3),1px),34px); }
      }
      .quick {
        gap: 4px 8px;
        align-self: start;
        /* Reserve the first control-height row for the room readings. */
        margin-block-start: max(0px,calc(var(--shortcut-height) - 16px));
      }
      .quick:has(> .quick-button:nth-child(5)) { align-self: end; margin-block-start: 0; }
    }
  }
  @container (min-width: 421px) {
    .shell[data-page=true][data-wide-left] {
      --wide-left-inset: 8px;
      --wide-left-content: min(430px,calc(100cqi - 32px));
    }
    .shell[data-page=true][data-wide-left] :is(.room-scroll,.toolbar) {
      --edge: var(--wide-left-inset);
    }
    .shell[data-page=true][data-wide-left] .room-scroll { padding-inline: var(--wide-left-inset); }
    .shell[data-page=true][data-wide-left] :is(.rooms,.toolbar-actions) {
      width: min(100%,var(--wide-left-content));
      margin-left: 0;
      margin-right: auto;
    }
    .shell[data-page=true][data-wide-left] .toolbar-actions:not(:has(.chrome-button:nth-child(5 of .chrome-button:not([hidden])))) {
      justify-content: flex-start;
    }
    .shell[data-page=true][data-wide-left] .toolbar-actions:has(> :nth-child(6 of .chrome-button:not([hidden]))):not(:has(> :nth-child(7 of .chrome-button:not([hidden])))) {
      --chrome-size: 48px;
      --chrome-icon-size: 24px;
      display: grid;
      grid-template-columns: repeat(6,minmax(0,1fr));
      justify-items: start;
      gap: 8px;
    }
  }
  @container (min-width: 900px) {
    .shell[data-page=true][data-wide-left] {
      --wide-left-inset: 16px;
      --wide-left-content: min(900px,calc(100cqi - 96px));
    }
    .shell[data-page=true] {
      --room-rows: var(--bayit-room-rows-wide,3);
      --room-block-limit: max(164px,calc(var(--room-available) / 2 - var(--room-gap)));
    }
    .shell[data-page=true] .room-scroll { padding-inline: 48px; }
    .shell[data-page=true] .rooms {
      max-width: 900px;
      grid-template-columns: repeat(auto-fit,minmax(176px,1fr));
    }
  }
`;
