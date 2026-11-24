/*! Bayit 9 v0.3.0 */
var Je=`
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
    --page-bottom: max(8px,env(safe-area-inset-bottom,0px));
    --room-block: clamp(132px,calc(
      (var(--bayit-view-height,100dvh) - var(--toolbar-min) - var(--page-bottom))
      / var(--bayit-room-rows,5) - var(--room-gap)
    ),164px);
    display: grid;
    grid-template-rows: auto minmax(0,1fr);
    gap: var(--room-gap);
    block-size: var(--bayit-view-height,100dvh);
    min-height: 0;
    padding-block: 0 var(--page-bottom);
    padding-inline: 0;
  }
  .shell[data-page=true] .toolbar { margin-inline: var(--edge); margin-block-end: 0; }
  .shell[data-page=true] > :is(.room-scroll,.empty) { grid-area: 2 / 1; }
  .shell[data-page=true] > .empty { margin-inline: var(--edge); }
  .shell[data-page=true] .room-scroll {
    min-height: 0;
    overflow: auto;
    overscroll-behavior: contain;
    scrollbar-width: none;
    padding-inline: var(--edge);
  }
  .shell[data-page=true] .rooms { grid-auto-rows: var(--room-block); }
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
    width: 44px;
    height: 44px;
    background: transparent;
    border-color: var(--line);
    border-radius: var(--chrome-radius,999px);
  }
  .chrome-button ha-icon { width: 22px; height: 22px; --mdc-icon-size: 22px; }
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
  .room-title > ha-icon:first-child {
    grid-area: icon;
    width: 26px;
    height: 26px;
    --mdc-icon-size: 26px;
  }
  .room-title > :is(.room-name,span:first-of-type:not(.room-count)) {
    grid-area: label;
    min-width: 0;
    overflow-wrap: anywhere;
    text-align: center;
  }
  .shell[dir=rtl] .room-title > :is(.room-name,span:first-of-type:not(.room-count)), .shell[dir=rtl] .room-status span {
    direction: rtl;
  }
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
  .shell[data-layout=header] .room-title > :is(.room-name,span:first-of-type:not(.room-count)) {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: left;
  }
  .room-status {
    grid-area: status;
    justify-self: start;
    align-self: start;
    max-width: 100%;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    border-radius: 999px;
    color: var(--secondary);
    font-size: 11px;
    font-weight: 690;
    line-height: 1.14;
    padding: 2px 7px;
    border: 1px solid var(--soft-line);
    background: transparent;
    white-space: nowrap;
    overflow: hidden;
  }
  .room-status ha-icon { --mdc-icon-size: 13px; width: 13px; height: 13px; }
  .room-status span { overflow: hidden; text-overflow: ellipsis; }
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
  .shell[data-layout=header] .quick {
    grid-template-columns: repeat(3,var(--shortcut-width));
    justify-content: start;
  }

  .quick-button[data-transition]:not([data-transition=""])::before {
    content: ""; position: absolute; inset-block-end: 5px; width: 10px;
    border-block-end: 2px solid currentColor; border-radius: 999px; pointer-events: none;
  }
  .quick-button[data-tone=warm], .current[data-tone=warm] { color: var(--warm); }
  .quick-button[data-tone=moving], .current[data-tone=moving] { color: var(--moving); }
  .quick-button[data-tone=critical], .current[data-tone=critical] { color: var(--critical); }
  .quick-button[data-tone=warm] { background: rgba(255,197,83,.14); border-color: rgba(255,215,147,.39); }
  .quick-button[data-tone=moving] { background: rgba(98,202,255,.14); border-color: rgba(164,225,255,.41); }
  .quick-button[data-tone=critical] { background: rgba(255,146,151,.16); border-color: rgba(255,187,187,.42); }
  .quick-button[aria-busy=true]::after {
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
  .modal {
    --panel-top: max(54px,9dvh);
    --panel-bottom: var(--bayit-popup-view-bottom,100dvh);
    --control: transparent;
    position: fixed;
    inset: var(--panel-top) 0 auto;
    width: min(550px,calc(100% - 2 * var(--edge)));
    max-width: none;
    max-height: calc(var(--panel-bottom) - var(--panel-top) - max(16px,env(safe-area-inset-bottom,0px)));
    margin: 0 auto;
    padding: 0;
    color: var(--ink);
    border: 1px solid var(--line);
    border-radius: 20px;
    background: transparent;
    -webkit-backdrop-filter: blur(14px);
    backdrop-filter: blur(14px);
    overflow: hidden;
    overscroll-behavior: contain;
    transform-origin: var(--motion-x,50%) var(--motion-y,34%);
  }
  .modal:is([data-kind=room],[data-kind=device]) {
    --panel-top: clamp(14px,var(--bayit-popup-area-top,142px),max(14px,calc(var(--panel-bottom) - 180px)));
  }
  .modal[data-kind=toolbar] {
    --panel-top: clamp(14px,calc(var(--bayit-popup-area-top,142px) - 78px),max(14px,calc(var(--panel-bottom) - 180px)));
  }
  .modal[open] { display: grid; grid-template-rows: auto minmax(0,1fr); }
  .modal[open]:not([data-kind]) { animation: appear 190ms cubic-bezier(.22,1,.36,1); }
  .modal[data-closing] { pointer-events: none; }
  .modal::backdrop { background: rgba(0,0,0,.55); }
  .shell[data-page=true] .modal::backdrop { background: rgba(0,0,0,.34); }
  .modal-header {
    display: flex;
    direction: ltr;
    align-items: center;
    justify-content: space-between;
    padding: 15px 15px 11px;
    gap: 12px;
  }
  .modal-header h2 {
    display: flex;
    align-items: center;
    flex: 1;
    min-height: 46px;
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
  .confirm .modal-header h2 { min-height: 0; padding: 0; border: 0; }
  .modal-body { min-height: 0; padding: 0 15px 15px; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; }
  @keyframes appear { from { opacity: 0; transform: scale(.92); } }
  .devices, .settings { display: grid; gap: 12px; }
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
  .setup-page, .setup-editor { display: block; min-width: 0; }
  .setup-status { margin: 0; color: var(--secondary); }
  .setup-editor {
    --primary-text-color: var(--ink);
    --secondary-text-color: var(--secondary);
    --card-background-color: var(--surface);
  }
  .setup-footer {
    position: sticky;
    inset-block-end: 0;
    z-index: 1;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    min-width: 0;
    margin-block-start: 10px;
    padding: 8px;
    border: 1px solid var(--soft-line);
    border-radius: 12px;
    background: var(--surface);
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
  .device-head { display: grid; grid-template-columns: 32px minmax(0,1fr) 44px; align-items: center; gap: 8px; }
  .device-icon { color: var(--secondary); place-self: center; }
  .device-name { margin: 0; font-size: 14px; line-height: 1.2; overflow-wrap: anywhere; }
  .current { display: block; margin-block-start: 3px; color: var(--secondary); font-weight: 680; font-size: 12px; }
  .device-detail { min-width: 0; white-space: normal; }
  .device[data-compact=cover] .device-head {
    direction: ltr;
    grid-template-columns: 44px minmax(0,1fr);
    gap: 5px;
  }
  .device[data-compact=cover] .device-head:has(> .round-action:not([hidden])) > .device-icon { display: none; }
  .device[data-compact=cover] .device-head > .round-action { grid-area: 1 / 1; border-radius: 999px; }
  .device[data-compact=cover] .device-detail { grid-column: 2; }
  .shell[dir=rtl] .device[data-compact=cover] .device-detail { direction: rtl; text-align: left; }
  .device:has(> .device-tile) { padding: 0; }
  .device-tile {
    display: grid;
    align-content: center;
    justify-items: center;
    gap: 7px;
    width: 100%;
    min-width: 0;
    min-height: 96px;
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
    width: 30px;
    height: 30px;
    align-self: center;
    place-items: center;
    border: 1px solid var(--soft-line);
    border-radius: 999px;
    color: var(--ink);
  }
  .device-tile:where(:hover,[aria-pressed=true]) > ha-icon {
    background: rgba(255,255,255,.08);
  }
  .device-tile:is([aria-pressed=true],[data-tone=warm]) > ha-icon {
    color: var(--warm);
    background: rgba(255,197,83,.13);
    border-color: rgba(255,215,147,.35);
  }
  .device-tile .current { margin: 0; font-weight: 600; }
  .device-tile .device-name { font-weight: 580; }
  .action-list, .basic-actions { display: grid; gap: 7px; }
  .action-list:empty { display: none; }
  .action-list { margin-block-start: 8px; }
  .basic-actions { grid-template-columns: repeat(auto-fit,minmax(min(80px,100%),1fr)); }
  .device[data-compact=cover] .basic-actions {
    direction: ltr;
    grid-template-columns: repeat(auto-fit,minmax(44px,1fr));
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
    padding: 4px;
    gap: 0;
    font-size: 0;
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
    .devices[data-room=true] .device-group[data-group=room_lights]:has(> .device[data-compact=tile]) {
      grid-template-columns: repeat(2,minmax(0,1fr));
      .device:not([data-compact=tile]) { grid-column: 1 / -1; }
    }
  }
  @media (min-width: 390px) {
    .devices[data-room=true] .device-group[data-group=room_covers]:has(> .device[data-compact=cover] + .device[data-compact=cover]) {
      grid-template-columns: repeat(2,minmax(0,1fr));
      .device:not([data-compact=cover]) { grid-column: 1 / -1; }
      .device[data-compact=cover] { padding: 5px; }
    }
  }
  @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
    .modal { background: var(--surface); }
  }
  @media (prefers-reduced-transparency: reduce), (prefers-contrast: more) {
    .modal, .notice { -webkit-backdrop-filter: none; backdrop-filter: none; background: var(--surface); }
    .toolbar, .room { -webkit-backdrop-filter: none; backdrop-filter: none; }
    .toolbar, .room { background: var(--surface); }
    .shell, .modal { --line: rgba(255,255,255,.58); --soft-line: rgba(255,255,255,.31); }
  }
  @media (prefers-reduced-motion: reduce) {
    .modal[open]:not([data-kind]), .quick-button[aria-busy=true]::after { animation: none; }
    .chrome-button, .round-action, .quick-button { transition: none; }
    .chrome-button:active, .round-action:active, .quick-button:active { transform: none; }
  }
  @container (max-width: 373px) {
    .room { --shortcut-width: 39px; --shortcut-gap: 3px; padding: 6px; }
    .room-title { grid-template-columns: 21px minmax(0,1fr); font-size: 13px; }
    .room-title > ha-icon:first-child { width: 21px; height: 21px; --mdc-icon-size: 21px; }
  }
  @container (max-width: 346px) {
    .toolbar-actions { justify-content: center; }
    .shell[data-layout=header] .room-title {
      grid-template-areas: "label label label" "icon . count";
      grid-template-rows: auto 21px;
    }
    .shell[data-layout=header] .room-title > .room-name { text-align: center; }
  }
  @container (max-width: 320px) {
    .room { --shortcut-width: 35px; --shortcut-height: 32px; padding: 5px; }
    .room-title { grid-template-columns: 19px minmax(0,1fr); column-gap: 2px; }
    .room-title > ha-icon:first-child { width: 19px; height: 19px; --mdc-icon-size: 19px; }
    .quick-button ha-icon { width: 18px; height: 18px; --mdc-icon-size: 18px; }
  }
  @container (max-width: 275px) {
    .rooms { grid-template-columns: 1fr; }
    .room { --shortcut-width: 44px; --shortcut-height: 38px; padding: 8px; }
  }
  @container (min-width: 650px) {
    .room { --shortcut-width: 48px; padding: 8px 12px; }
    .room-title { font-size: 17px; }
    .room-status { font-size: 12px; }
  }
`;var le={en:{home:"Home",overview:"Home overview",settings:"Appearance",close:"Close",activity:"Active devices",rooms:"Rooms",automations:"Automations",security:"Security",presence:"People at home",weather:"Weather",energy:"Energy",open_energy:"Open energy dashboard",setup:"Customize home",setup_save:"Save dashboard",setup_loading:"Loading dashboard settings…",setup_saving:"Saving dashboard…",setup_error:"Could not load or save dashboard settings.",setup_conflict:"The dashboard changed while you were editing. Reload it and try again.",setup_storage:"To save these settings, use a dashboard managed in the Home Assistant interface.",room_lights:"Lights",room_covers:"Covers",room_climate:"Heating and cooling",room_security:"Security",room_sensors:"Sensors",room_devices:"Other devices",room_heating:"Heating",room_garage:"Garage",room_weather:"Weather",room_media:"Media",room_vacuum:"Vacuum",room_laundry:"Laundry",device_controls:"Device controls",more_info:"More info",empty:"No rooms have been added.",empty_room:"No devices in this room.",quiet:"All quiet",active:"active",unavailable:"Unavailable",unknown:"Unknown state",apply:"Apply",cancel:"Cancel",confirm:"Confirm",confirm_title:"Confirm action",confirm_action:"Continue with {action} on {name}?",send_error:"Could not complete the action.",sending:"Sending {name}…",confirmed:"{name} updated.",sent:"Command sent to {name}.",unconfirmed:"No confirmation received for {name}.",background:"Background",shape:"Button shape",layout:"Room layout",aurora:"Aurora",lagoon:"Lagoon",dunes:"Dunes",graphite:"Graphite",soft:"Rounded",circle:"Round",square:"Square",classic:"Room name below",header:"Room name above",turn_on:"Turn on",turn_off:"Turn off",open:"Open",close_device:"Close cover",stop:"Stop",set_position:"Position",lock:"Lock",unlock:"Unlock",set_hvac_mode:"Mode",set_temperature:"Target temperature",set_temperature_range:"Temperature range",set_fan_mode:"Fan speed",set_swing_mode:"Swing",set_preset_mode:"Preset",set_operation_mode:"Operating mode",set_percentage:"Speed",set_heating_level:"Heating level",set_brightness:"Brightness",start_timed:"Start timer",stop_timed:"Stop timer",duration:"Minutes",min:"Minimum",max:"Maximum",timed:"Timer",extend_timed:"Extend timer",remaining_time:"Time remaining",today_used:"Used today",target_short:"Target",temperature_up:"Increase target temperature",temperature_down:"Decrease target temperature",run_script:"Run action",low:"Low",medium:"Medium",middle:"Medium",high:"High",vertical:"Vertical",horizontal:"Horizontal",both:"Both",on:"On",off:"Off",opening:"Opening",closing:"Closing",opened:"Open",closed:"Closed",locked:"Locked",unlocked:"Unlocked",locking:"Locking",unlocking:"Unlocking",jammed:"Jammed",cool:"Cooling",heat:"Heating",heat_cool:"Heat / cool",dry:"Dry",fan_only:"Fan",auto:"Auto",idle:"Idle",paused:"Paused",playing:"Playing",cleaning:"Cleaning",docked:"Docked",available_option:"Choose an option"},he:{home:"בית",overview:"מבט על הבית",settings:"מראה",close:"סגירה",activity:"מכשירים פעילים",rooms:"חדרים",automations:"אוטומציות",security:"אבטחה",presence:"מי בבית",weather:"מזג אוויר",energy:"אנרגיה",open_energy:"פתיחת דשבורד האנרגיה",setup:"התאמת הבית",setup_save:"שמירת הדשבורד",setup_loading:"טוען את הגדרות הדשבורד…",setup_saving:"שומר את הדשבורד…",setup_error:"לא ניתן לטעון או לשמור את הגדרות הדשבורד.",setup_conflict:"הדשבורד השתנה בזמן העריכה. רעננו אותו ונסו שוב.",setup_storage:"כדי לשמור הגדרות אלה, השתמשו בדשבורד שמנוהל בממשק Home Assistant.",room_lights:"תאורה",room_covers:"תריסים ווילונות",room_climate:"חימום וקירור",room_security:"אבטחה",room_sensors:"חיישנים",room_devices:"מכשירים נוספים",room_heating:"חימום",room_garage:"חניה",room_weather:"מזג אוויר",room_media:"מדיה",room_vacuum:"שואב",room_laundry:"כביסה",device_controls:"פקדי המכשיר",more_info:"מידע נוסף",empty:"עדיין אין חדרים בדשבורד.",empty_room:"אין מכשירים בחדר הזה.",quiet:"הכול שקט",active:"פעיל",unavailable:"לא זמין",unknown:"מצב לא ידוע",apply:"החל",cancel:"ביטול",confirm:"אישור",confirm_title:"אישור פעולה",confirm_action:"להמשיך בפעולה ״{action}״ עבור {name}?",send_error:"הפעולה לא הושלמה.",sending:"שולח פקודה אל {name}…",confirmed:"המצב של {name} עודכן.",sent:"נשלחה פקודה אל {name}.",unconfirmed:"עדיין לא התקבל אישור מצב עבור {name}.",background:"רקע",shape:"צורת הכפתורים",layout:"פריסת החדרים",aurora:"זוהר צפוני",lagoon:"לגונה",dunes:"דיונות",graphite:"גרפיט",soft:"פינות מעוגלות",circle:"עגול",square:"מרובע",classic:"שם החדר למטה",header:"שם החדר למעלה",turn_on:"הדלקה",turn_off:"כיבוי",open:"פתיחה",close_device:"סגור",stop:"עצירה",set_position:"מיקום",lock:"נעילה",unlock:"פתיחת מנעול",set_hvac_mode:"מצב עבודה",set_temperature:"טמפרטורת יעד",set_temperature_range:"טווח טמפרטורה",set_fan_mode:"מהירות מאוורר",set_swing_mode:"נדנוד",set_preset_mode:"תוכנית",set_operation_mode:"מצב פעולה",set_percentage:"מהירות",set_heating_level:"עוצמת חימום",set_brightness:"בהירות",start_timed:"הפעלת טיימר",stop_timed:"עצירת טיימר",duration:"דקות",min:"מינימום",max:"מקסימום",timed:"טיימר",extend_timed:"הארכת טיימר",remaining_time:"זמן שנותר",today_used:"שימוש היום",target_short:"יעד",temperature_up:"העלאת טמפרטורת היעד",temperature_down:"הורדת טמפרטורת היעד",run_script:"הרצת פעולה",low:"נמוך",medium:"בינוני",middle:"בינוני",high:"גבוה",vertical:"אנכי",horizontal:"אופקי",both:"שני הכיוונים",on:"פועל",off:"כבוי",opening:"נפתח",closing:"נסגר",opened:"פתוח",closed:"סגור",locked:"נעול",unlocked:"לא נעול",locking:"ננעל",unlocking:"משתחרר",jammed:"תקוע",cool:"קירור",heat:"חימום",heat_cool:"חימום / קירור",dry:"ייבוש",fan_only:"אוורור",auto:"אוטומטי",idle:"בהמתנה",paused:"מושהה",playing:"מנגן",cleaning:"מנקה",docked:"בעמדה",available_option:"בחירת אפשרות"}};var It=/^[a-z][a-z0-9_]*\.[a-z0-9_]+$/,Pt=/^[A-Za-z_][A-Za-z0-9_]*$/,ve=Object.freeze(["switch","climate","fan","water_heater"]),Xe=["off","heat","cool","heat_cool","auto","dry","fan_only"],ge={open:1,close:2,position:4,stop:8},de={speed:1,preset:8,off:16,on:32},te={temperature:1,range:2,fan:8,preset:16,swing:32,off:128,on:256},Ee={temperature:1,operation:2,power:8},Ft={open:"open_cover",close:"close_cover",stop:"stop_cover",set_position:"set_cover_position",set_brightness:"turn_on",set_temperature_range:"set_temperature",run_script:"turn_on"},Te={set_position:"position",set_brightness:"brightness_pct",set_percentage:"percentage",set_hvac_mode:"hvac_mode",set_fan_mode:"fan_mode",set_swing_mode:"swing_mode",set_preset_mode:"preset_mode",set_operation_mode:"operation_mode",set_temperature:"temperature"},Ze=Symbol("request-timed-out"),z=class extends Error{constructor(e,t,n){super(t,n),this.name="DeviceControlError",this.code=e}};function Y(i,e){return typeof i=="string"&&It.test(i)&&(!e||i.startsWith(e+"."))}function J(i){return typeof i?.state=="string"&&i.state!==""&&!["unavailable","unknown"].includes(i.state)}function Ht(i,e,t){if(i===void 0)return null;if(!i||typeof i!="object"||Array.isArray(i)||!ve.includes(e))throw new z("invalid_config","A timed profile requires a heating-capable entity.");let{start_script:n,stop_script:s,timer_entity:o,simple_timer_entity:r,simple_timer_target:a,duration_field:d="duration",min_minutes:c=1,max_minutes:m=60,step_minutes:g=1,presets:p,daily_usage_entity:h}=i;if(n!==void 0&&!Y(n,"script")||s!==void 0&&!Y(s,"script")||o!==void 0&&!Y(o,"timer")||r!==void 0&&(!Y(r,"sensor")||n||s||o)||a!==void 0&&(!r||!(e==="climate"&&Y(a,"input_boolean")||e==="fan"&&t==="heater"&&Y(a,"switch")))||h!==void 0&&!Y(h,"sensor")||typeof d!="string"||!Pt.test(d)||![c,m,g].every(Number.isSafeInteger)||c<1||m<c||g<1)throw new z("invalid_config","The timed profile includes an invalid entity or duration setting.");return{start_script:n,stop_script:s,timer_entity:o,simple_timer_entity:r,simple_timer_target:a,duration_field:d,min_minutes:c,max_minutes:m,step_minutes:g,presets:p,daily_usage_entity:h}}function Qe(i){if(!i||!Y(i.entity))throw new z("invalid_config","Configure a Home Assistant entity ID.");let e=i.entity.split(".")[0],t=i.kind??e;if(t!==e&&(!["heater","boiler"].includes(t)||!ve.includes(e)))throw new z("invalid_config","The entity does not support the requested device profile.");if(i.level_entity!==void 0&&(!["heater","boiler"].includes(t)||!Y(i.level_entity,"number")))throw new z("invalid_config","Heating level requires a number entity in a heating profile.");if(i.level_steps!==void 0&&(t!=="heater"||e!=="fan"||i.level_entity||!Number.isSafeInteger(i.level_steps)||i.level_steps<2||i.level_steps>12))throw new z("invalid_config","Fan heating levels require an integer step count from 2 to 12.");if(i.level_read_entity!==void 0&&(!i.level_steps||!Y(i.level_read_entity,"input_number")))throw new z("invalid_config","Fan heating level feedback requires a numeric helper.");if(i.confirmation_ms!==void 0&&(!Number.isSafeInteger(i.confirmation_ms)||i.confirmation_ms<0))throw new z("invalid_config","The confirmation time must be a nonnegative number of milliseconds.");return{...i,kind:t,domain:e,timed:Ht(i.timed,e,t)}}function jt(i){if(typeof i!="string")return null;let e=/^(?:(\d+) days?, )?(\d+):([0-5]\d):([0-5]\d)(?:\.(\d{1,6}))?$/.exec(i);if(!e)return null;let[,t,n,s,o,r]=e,a=((Number(t??0)*24+Number(n))*3600+Number(s)*60+Number(o)+(r?+("0."+r):0))*1e3;return Number.isFinite(a)?a:null}function me(i){return typeof i=="string"&&/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(i)?Date.parse(i):NaN}function Bt(i,e,t){if(!i)return null;let n=e?.[i],s=["active","paused","idle"].includes(n?.state)?n.state:"unavailable",o=s==="active"?me(n.attributes?.finishes_at):NaN,r=Number.isFinite(o)?o:null,a=null;return r!==null&&(a=Math.max(0,r-t)),s==="paused"&&(a=jt(n.attributes?.remaining)),s==="idle"&&(a=0),{entity:i,state:s,deadlineMs:r,remainingMs:a}}function Ut(i,e,t,n){if(!i)return null;let s=t?.[i],o=s?.attributes;if(!J(s)||o?.switch_entity_id!==e||!["active","idle"].includes(o.timer_state))return{entity:i,state:"unavailable",deadlineMs:null,remainingMs:null};let r=o.timer_state==="active"?me(o.timer_finishes_at):NaN,a=Number.isFinite(r)?r:null,d=s.state.trim()?Number(s.state):NaN;return{entity:i,state:o.timer_state,deadlineMs:a,remainingMs:o.timer_state==="idle"?0:a===null?null:Math.max(0,a-n),usedSeconds:Number.isFinite(d)&&d>=0?d:null,reverse:o.reverse_mode===!0&&o.timer_state==="active"}}function Vt(i,e,t,n,s){let o={},r=(_,C)=>{o[_]={id:_,requiresConfirmation:!1,...C}},a=()=>{r("turn_on"),r("turn_off")},d=(_,C,A)=>{if(!Array.isArray(C))return;let l=[...new Set(C.filter(f=>typeof f=="string"&&f.length>0&&(!A||A.includes(f))))];l.length&&r(_,{options:l})},c=i.timed;if(t&&r("more_info"),!J(t))return o;let m=t.attributes??{},g=Number.isSafeInteger(m.supported_features)&&m.supported_features>=0?m.supported_features:0,p=_=>(g&_)===_,h=_=>{let{min_temp:C,max_temp:A,target_temp_step:l}=m;if(!Number.isFinite(C)||!Number.isFinite(A)||C>A)return;let f=Number.isFinite(l)&&l>0?l:null;r(_,{min:C,max:A,step:f})};switch(i.domain){case"switch":case"automation":a();break;case"script":r("run_script",{requiresConfirmation:!0});break;case"light":a(),(Array.isArray(m.supported_color_modes)&&m.supported_color_modes.some(_=>["brightness","color_temp","hs","xy","rgb","rgbw","rgbww","white"].includes(_))||Number.isFinite(m.brightness))&&r("set_brightness",{min:0,max:100,step:1});break;case"cover":p(ge.open)&&r("open"),p(ge.close)&&r("close"),p(ge.stop)&&r("stop"),p(ge.position)&&r("set_position",{min:0,max:100,step:1});break;case"fan":p(de.on)&&r("turn_on"),p(de.off)&&r("turn_off"),p(de.speed)&&r("set_percentage",{min:0,max:100,step:1}),p(de.preset)&&d("set_preset_mode",m.preset_modes);break;case"climate":p(te.on)&&r("turn_on"),p(te.off)&&r("turn_off"),d("set_hvac_mode",m.hvac_modes,Xe),p(te.temperature)&&h("set_temperature"),p(te.range)&&h("set_temperature_range"),p(te.fan)&&d("set_fan_mode",m.fan_modes),p(te.swing)&&d("set_swing_mode",m.swing_modes),p(te.preset)&&d("set_preset_mode",m.preset_modes);break;case"water_heater":p(Ee.power)&&a(),p(Ee.temperature)&&h("set_temperature"),p(Ee.operation)&&d("set_operation_mode",m.operation_list);break;case"lock":{let _=typeof m.code_format=="string"&&m.code_format.length>0;r("lock",{requiresCode:_}),r("unlock",{requiresCode:_,requiresConfirmation:!0});break}}let u=c?.start_script||c?.simple_timer_entity,b=u&&(i.kind==="heater"||i.kind==="boiler");if(b||c?.start_script){o.turn_off||(o.set_hvac_mode?.options.includes("off")?r("turn_off",{service:"set_hvac_mode",fixedData:{hvac_mode:"off"}}):o.set_operation_mode?.options.includes("off")?r("turn_off",{service:"set_operation_mode",fixedData:{operation_mode:"off"}}):o.set_percentage&&r("turn_off",{service:"set_percentage",fixedData:{percentage:0}}));for(let _ of["turn_on","set_hvac_mode","set_operation_mode","set_percentage","set_temperature","set_temperature_range","set_fan_mode","set_swing_mode","set_preset_mode"])delete o[_]}let y=()=>({min:c.min_minutes,max:c.max_minutes,step:c.step_minutes,...c.presets!==void 0&&{presets:c.presets}});c?.start_script&&J(e?.[c.start_script])&&r("start_timed",y()),c?.simple_timer_entity&&n?.state==="idle"&&r("start_timed",y()),c?.simple_timer_entity&&n?.state==="active"&&(n.deadlineMs>s&&r("extend_timed",y()),r("stop_timed"),b&&delete o.turn_off);let w=!u||n?.state==="active"&&n.deadlineMs>s;if(i.level_entity&&w){let _=e?.[i.level_entity],{min:C,max:A,step:l}=_?.attributes??{};J(_)&&_.state.trim()&&Number.isFinite(Number(_.state))&&[C,A,l].every(Number.isFinite)&&A>=C&&l>0&&r("set_heating_level",{min:C,max:A,step:l})}return i.level_steps&&w&&p(de.speed)&&t.state==="on"&&(r("set_heating_level",{min:1,max:i.level_steps,step:1}),delete o.set_percentage),c?.stop_script&&J(e?.[c.stop_script])&&(r("stop_timed"),delete o.turn_off),o}function et(i,e,t){let n=e?.[i.entity],s=n?.attributes??{},o=i.timed?.simple_timer_entity?Ut(i.timed.simple_timer_entity,i.timed.simple_timer_target??i.entity,e,t):Bt(i.timed?.timer_entity,e,t),r=e?.[i.timed?.daily_usage_entity];if(o&&J(r)&&r.state.trim()){let m={s:1,min:60,h:3600}[r.attributes?.unit_of_measurement],g=Number(r.state)*m;Number.isFinite(g)&&g>=0&&(o.usedSeconds=g)}let a=e?.[i.level_entity??i.level_read_entity],d=J(a)&&a.state.trim()?Number(a.state):NaN,c=i.level_steps&&Number.isFinite(s.percentage)?Math.round(s.percentage*i.level_steps/100):null;return{entity:i.entity,domain:i.domain,kind:i.kind,name:i.name||s.friendly_name||i.entity,icon:i.icon||s.icon||null,state:n?.state??"missing",available:J(n),attributes:s,actions:Vt(i,e,n,o,t),level:Number.isFinite(d)?d:c,...i.level_steps&&{levelRange:{min:1,max:i.level_steps,step:1}},timer:o}}function tt(i,e,t=Date.now()){return et(Qe(i),e,t)}function Ne(i,{min:e,max:t,step:n}){if(!Number.isFinite(i)||i<e||i>t)return!1;if(!n)return!0;let s=(i-e)/n;return i===t||Math.abs(s-Math.round(s))<1e-7}function Gt(i,e,t,n){let s=(r,a,d)=>({entity:i.entity,attributes:{[r]:a},tolerance:d}),o=r=>({entity:i.entity,state:r});switch(e){case"turn_on":return["light","switch","fan","automation"].includes(i.domain)?o("on"):null;case"turn_off":return o("off");case"open":return o("open");case"close":return o("closed");case"stop":return["opening","closing"].includes(n?.[i.entity]?.state)?{entity:i.entity,anyState:["open","closed"]}:null;case"set_position":return s("current_position",t);case"set_brightness":return t===0?o("off"):{...s("brightness",Math.round(t*255/100),2),state:"on"};case"set_percentage":return t===0?o("off"):s("percentage",t);case"lock":return o("locked");case"unlock":return o("unlocked");case"set_hvac_mode":case"set_operation_mode":return o(t);case"set_fan_mode":case"set_swing_mode":case"set_preset_mode":case"set_temperature":return s(Te[e],t,1e-6);case"set_temperature_range":return{entity:i.entity,attributes:{target_temp_low:t.low,target_temp_high:t.high},tolerance:1e-6};case"start_timed":{let r=i.timed.timer_entity,a=["switch","fan"].includes(i.domain)?o("on"):null;if(!r)return a;let d=me(n?.[r]?.attributes?.finishes_at);return{all:[{entity:r,state:"active",requireNewDeadline:!0,formerDeadline:d},...a?[a]:[]]}}case"stop_timed":return i.timed.timer_entity?{all:[{entity:i.timed.timer_entity,state:"idle"},o("off")]}:o("off");default:return null}}function $t(i,e,t,n,{confirmed:s=!1,code:o}={}){i=Qe(i);let r=et(i,e,Date.now()),a=typeof t=="string"&&Object.hasOwn(r.actions,t)&&r.actions[t];if(!a)throw new z("action_unavailable","This entity does not currently support that action.");if(a.requiresConfirmation&&s!==!0)throw new z("confirmation_required","This action requires explicit confirmation.");if(a.requiresCode&&(typeof o!="string"||!o.trim()||o.length>64))throw new z("pin_required","Enter the lock code in Home Assistant.");if(t==="more_info")return{kind:"more_info",entity:i.entity};if(t==="set_temperature_range"){if(!n||!Ne(n.low,a)||!Ne(n.high,a)||n.low>n.high)throw new z("invalid_value","The selected temperature range is invalid.")}else if(a.options?!a.options.includes(n):a.min!==void 0&&!Ne(n,a))throw new z("invalid_value","The selected value is outside the published device options.");if(t==="set_heating_level"){if(i.level_steps){let m=Math.round(n*100/i.level_steps),g=i.level_read_entity?{entity:i.level_read_entity,numericState:n}:{entity:i.entity,attributes:{percentage:m},tolerance:1};return{kind:"service",domain:"fan",service:"set_percentage",target:{entity_id:i.entity},data:{percentage:m},expected:g}}return{kind:"service",domain:"number",service:"set_value",target:{entity_id:i.level_entity},data:{value:n},expected:{entity:i.level_entity,numericState:n}}}if(i.timed?.simple_timer_entity&&["start_timed","extend_timed","stop_timed"].includes(t)){let m=i.timed.simple_timer_entity,g=t==="stop_timed",p=i.timed.simple_timer_target??i.entity,h={entity:m,attributes:{switch_entity_id:p,timer_state:g?"idle":"active"}},u=h;if(g)i.domain==="water_heater"?h.attributes.device_active=!1:u={all:[h,{entity:i.entity,state:"off"}]};else if(h.deadlineAttribute="timer_finishes_at",h.requireNewDeadline=!0,h.formerDeadline=me(e?.[m]?.attributes?.timer_finishes_at),t==="start_timed"){h.attributes.device_active=!0;let b=i.domain==="climate"?{entity:i.entity,anyState:Xe.filter(y=>y!=="off")}:i.domain==="fan"||i.domain==="switch"?{entity:i.entity,state:"on"}:null;b&&(u={all:[h,b]})}return{kind:"service",domain:"simple_timer",service:g?"cancel_timer":t==="extend_timed"?"add_timer":"start_timer",target:null,data:g?{entity_id:m,turn_off_entity:!0}:{entity_id:m,duration:n,unit:"min",...t==="start_timed"&&{reverse_mode:!1}},expected:u}}let d=Gt(i,t,n,e);if(t==="start_timed"||t==="stop_timed"){let m=t==="start_timed";return{kind:"service",domain:"script",service:(m?i.timed.start_script:i.timed.stop_script).split(".")[1],target:null,data:m?{[i.timed.duration_field]:n}:{},expected:d}}let c=t==="set_temperature_range"?{target_temp_low:n.low,target_temp_high:n.high}:Te[t]?{[Te[t]]:n}:{...a.fixedData};return a.requiresCode&&(c.code=o),{kind:"service",domain:r.domain,service:a.service??Ft[t]??t,target:{entity_id:i.entity},data:c,expected:d}}function it(i,e){if(i.all)return i.all.every(n=>it(n,e));let t=e?.[i.entity];if(!J(t)||i.state!==void 0&&i.state!==t.state||i.anyState&&!i.anyState.includes(t.state)||i.numericState!==void 0&&(!t.state.trim()||!(Math.abs(Number(t.state)-i.numericState)<=1e-7)))return!1;if(i.requireNewDeadline){let n=me(t.attributes?.[i.deadlineAttribute??"finishes_at"]);if(!Number.isFinite(n)||n===i.formerDeadline)return!1}return Object.entries(i.attributes??{}).every(([n,s])=>{let o=t.attributes?.[n];return typeof s=="number"?Number.isFinite(o)&&Math.abs(o-s)<=(i.tolerance??0):o===s})}var Yt=i=>new Promise(e=>setTimeout(e,i)),Kt=()=>globalThis.performance.now();function Wt(i,e){let t,n=new Promise(s=>{t=setTimeout(()=>s(Ze),e)});return Promise.race([i,n]).finally(()=>clearTimeout(t))}function nt({getHass:i,confirmationTimeoutMs:e,requestTimeoutMs:t=1e4,pollIntervalMs:n=100,sleep:s=Yt,now:o=Kt}={}){if(typeof i!="function"||typeof s!="function"||typeof o!="function"||!Number.isSafeInteger(t)||t<1||t>2147483647||!Number.isSafeInteger(n)||n<1||e!==void 0&&(!Number.isSafeInteger(e)||e<0))throw new z("invalid_config","The dashboard connection or timeout setting is invalid.");let r=new Map;return{async execute(a,d,c,m){let g=i(),p=$t(a,g?.states,d,c,m);if(p.kind==="more_info")return{status:"more_info",entity:p.entity};if(typeof g?.callWS!="function")throw new z("service_unavailable","The Home Assistant connection is unavailable.");let h=a.entity,u=Symbol(h);r.set(h,u);let b=(y,w)=>({status:y,entity:h,action:d,...w?{reason:w}:{}});try{let y={type:"call_service",domain:p.domain,service:p.service,service_data:p.data};p.target&&(y.target=p.target);let w;try{w=await Wt(Promise.resolve(g.callWS(y)),t)}catch(A){if(r.get(h)!==u)return b("unconfirmed","superseded");throw new z("service_failed","Home Assistant rejected or could not deliver the command.",{cause:A})}if(r.get(h)!==u)return b("unconfirmed","superseded");if(w===Ze)return b("unconfirmed","request_timeout");let _=a.confirmation_ms??e??(p.domain==="cover"?45e3:8e3);if(!p.expected||!_)return b("sent");let C=o()+_;for(;;){if(r.get(h)!==u)return b("unconfirmed","superseded");if(it(p.expected,i()?.states))return b("confirmed");let A=C-o();if(A<=0)return b("unconfirmed","state_timeout");await s(Math.min(n,A))}}finally{r.get(h)===u&&r.delete(h)}}}}var Jt="custom:bayit-dashboard",G="bayit-9",oe=6,Le="bayit_room_",De={aurora:{en:"Aurora",he:"זוהר צפוני"},lagoon:{en:"Lagoon",he:"לגונה"},dunes:{en:"Dunes",he:"דיונות"},graphite:{en:"Graphite",he:"גרפיט"}},ze=ve,Xt=["light","switch","cover","climate","fan","lock","water_heater","vacuum","humidifier","alarm_control_panel","camera","media_player","binary_sensor","sensor","weather","person","calendar"],qe=/^[a-z0-9_]+\.[a-z0-9_]+$/,Zt=/^bayit_room_[a-z0-9][a-z0-9_-]{0,63}$/,Qt=/^[a-z0-9][a-z0-9_-]{0,63}$/,ei=/^\/[a-z0-9_-]+(?:\/[a-z0-9_-]+)*\/?(?:#[a-z0-9_-]+)?$/i,ti=new Set(["lights","covers","climate","heating","sensors","devices","garage","weather","security","media","vacuum","laundry"]),ii=new Set(["automations","security","presence","weather","energy","settings","overview","link"]),Ie=/^mdi:[a-z0-9-]+$/,ni=new Set(["light","switch","cover","climate","fan","lock","water_heater"]),oi=new Set(["door","window","garage_door","opening"]),si=new Set(["heater","boiler","climate"]),Me=new Map(Xt.map((i,e)=>[i,e])),ot="script",be={en:{title:"Bayit 9",home:"Home",unassigned:"Unassigned"},he:{title:"בית 9",home:"בית",unassigned:"ללא חדר"}};function ye(i,e={}){if(i==="en"||i==="he")return i;let t=e.locale?.language??e.language;return typeof t=="string"&&/^he(?:[-_]|$)/i.test(t)?"he":"en"}function H(i){return Array.isArray(i)?[...new Set(i.filter(e=>typeof e=="string"&&e.trim()))]:[]}function ne(i){return i.split(".")[0]}function X(i,e){return typeof i=="string"&&qe.test(i)&&ne(i)===e?i:void 0}function Re(i,e){return Number.isInteger(i)&&i>0&&i<=360?i:e}function Pe(i){if(!i||typeof i.entity!="string"||!qe.test(i.entity)||!si.has(i.kind))return null;let e=ne(i.entity);if(!ze.includes(e)||i.kind==="climate"&&e!=="climate")return null;let t={entity:i.entity,kind:i.kind};typeof i.name=="string"&&i.name.trim()&&(t.name=i.name.trim().slice(0,80));let n=X(i.level_entity,"number");n&&(t.level_entity=n);let s=i.kind==="heater"&&e==="fan";if(!n&&s&&Number.isInteger(i.level_steps)&&i.level_steps>=2&&i.level_steps<=12){t.level_steps=i.level_steps;let w=X(i.level_read_entity,"input_number");w&&(t.level_read_entity=w)}let o=i.timed;if(!o||typeof o!="object")return t;let r=X(o.start_script,ot),a=X(o.stop_script,ot),d=r?void 0:X(o.simple_timer_entity,"sensor"),c=i.kind==="climate"?"input_boolean":s?"switch":void 0,m=d&&c?X(o.simple_timer_target,c):void 0,g=d?void 0:X(o.timer_entity,"timer"),p=X(o.daily_usage_entity,"sensor");if(!r&&!d&&!g&&!a)return t;let h=Re(o.min_minutes,15),u=Math.max(h,Re(o.max_minutes,60)),b=Math.min(u-h||1,Re(o.step_minutes,15)),y=Array.isArray(o.presets)?[...new Set(o.presets.filter(w=>Number.isInteger(w)&&w>=h&&w<=u&&(w-h)%b===0))].slice(0,8):[];return t.timed={...r&&{start_script:r},...a&&{stop_script:a},...g&&{timer_entity:g},...d&&{simple_timer_entity:d},...m&&{simple_timer_target:m},...p&&{daily_usage_entity:p},...Array.isArray(o.presets)&&{presets:y},duration_field:typeof o.duration_field=="string"&&/^[a-z][a-z0-9_]{0,39}$/.test(o.duration_field)?o.duration_field:"duration",min_minutes:h,max_minutes:u,step_minutes:b},t}function st(i){let e=new Map;for(let t of Array.isArray(i)?i:[]){let n=Pe(t);n&&!e.has(n.entity)&&e.set(n.entity,n)}return e}function rt(i,e,t){if(typeof i=="string"&&Qt.test(i)&&!t.has(i))return t.add(i),i;let n=e;for(let s=2;t.has(n);s++)n=e+"-"+s;return t.add(n),n}function _e(i){if(!Array.isArray(i))return;let e=new Set;return i.flatMap((t,n)=>{if(!ti.has(t?.kind)||!Array.isArray(t.entities))return[];let s=rt(t.id,"section-"+(n+1),e),o=typeof t.title=="string"?t.title.trim().slice(0,80):void 0;return[{id:s,kind:t.kind,...o!==void 0&&{title:o},entities:H(t.entities)}]})}function at(i,e){let t=new Map(Object.entries(e.areas??{}).map(([n,s])=>[s.area_id??n,{name:s.name??n,icon:s.icon||"mdi:home-outline"}]));for(let[n,s]of Object.entries(i.room_overrides??{})){if(!s||typeof s!="object"||Array.isArray(s))continue;let o=t.get(n),r=typeof s.name=="string"?s.name.trim().slice(0,80):"";if(!o&&(!Zt.test(n)||!r))continue;let a=typeof s.icon=="string"?s.icon.trim():"",d=s.entity_icons,c=_e(s.sections),m=Array.isArray(s.entities)?H(s.entities):c?.length?H(c.flatMap(g=>g.entities)):o?void 0:[];t.set(n,{name:r||o?.name,icon:Ie.test(a)?a:o?.icon??"mdi:home-outline",entityIds:m,sections:c,entityIcons:d&&typeof d=="object"&&!Array.isArray(d)?d:null,custom:!o})}return t}function ct(i={},e={}){return[...at(i,e)].map(([t,n])=>({id:t,name:n.name,icon:n.icon,custom:n.custom===!0}))}function Oe(i,e,t){return i.localeCompare(e,t,{numeric:!0,sensitivity:"base"})}function ri(i){let e="bayit9_unassigned";for(let t=1;i.has(e);t++)e="bayit9_unassigned_"+t;return e}function xe(i,e,t,n){let s=n?.name??e.attributes?.friendly_name??t?.name??t?.en,o=t?.icon??t?.ic??e.attributes?.icon;return{entity:i,...typeof s=="string"&&s&&{name:s},...typeof o=="string"&&o&&{icon:o},...n&&{kind:n.kind},...n?.level_entity&&{level_entity:n.level_entity},...n?.level_steps&&{level_steps:n.level_steps},...n?.level_read_entity&&{level_read_entity:n.level_read_entity},...n?.timed&&{timed:n.timed}}}function we(i,e,t,n){if(!qe.test(i)||n.has(i)||!Object.hasOwn(e,i)||e[i]==null)return!1;let s=t?.[i];return s?.hidden!==!0&&!s?.hidden_by&&!s?.disabled_by}function lt(i={},e={}){let t=e.states??{},n=e.entities,s=new Set(H(i.hidden_entities));return Object.keys(t).filter(o=>we(o,t,n,s)).map(o=>xe(o,t[o],n?.[o]))}function dt(i,e){let t=i?.device_id??i?.di,n=t&&e.devices?.[t];return i?.area_id??i?.ai??n?.area_id}function se(i,e,t){let n=at(i,e),s=ri(n),o=new Map(H(i.area_ids).map((l,f)=>[l,f])),r=l=>o.size===0||o.has(l),a=new Set(H(i.hidden_entities)),d=new Set(H(i.included_entities)),c=st(i.profiles),m=new Set([...c.values()].flatMap(l=>{let f=l.timed;return[l.level_entity,l.level_read_entity,f?.start_script,f?.stop_script,f?.timer_entity,f?.simple_timer_entity,f?.simple_timer_target,f?.daily_usage_entity].filter(Boolean)})),g=e.states??{},p=e.entities??null,h=new Map,u=i.discovery_mode==="controls"?ni:Me,b=l=>we(l,g,p,a),y=l=>xe(l,g[l],p?.[l],c.get(l)),w=new Set;for(let[l,f]of n){if(!f.entityIds||!r(l))continue;let x=f.entityIds.filter(b);h.set(l,x.map(y));for(let S of x)w.add(S)}let _=new Set(Object.keys(p||g));for(let l of[...d,...c.keys()])_.add(l);for(let l of _){if(w.has(l)||!b(l))continue;let f=p?.[l],x=d.has(l)||c.has(l),S=f?.entity_category!=null||f?.ec!=null;if(!x&&(!u.has(ne(l))||S||m.has(l)))continue;let E=dt(f,e),N=n.get(E),v=N&&!N.custom?E:s;(v===s?i.show_unassigned===!1:!r(v)||N.entityIds)||(h.has(v)||h.set(v,[]),h.get(v).push(y(l)))}let C=l=>n.get(l)??{name:be[t].unassigned,icon:"mdi:map-marker-outline"};return[...h.keys()].sort((l,f)=>l===s||f===s?l===s?1:-1:(o.get(l)??1/0)-(o.get(f)??1/0)||Oe(C(l).name,C(f).name,t)).map(l=>{let f=C(l),x=h.get(l);if(f.entityIds||x.sort((N,v)=>(Me.get(ne(N.entity))??100)-(Me.get(ne(v.entity))??100)||Oe(N.name??N.entity,v.name??v.entity,t)),f.entityIcons)for(let N of x){if(!Object.hasOwn(f.entityIcons,N.entity))continue;let v=f.entityIcons[N.entity];typeof v=="string"&&Ie.test(v.trim())&&(N.icon=v.trim())}let S={id:l,name:f.name,icon:f.icon,entities:x};if(f.sections!==void 0){let N=new Map(x.map(v=>[v.entity,v]));S.sections=f.sections.map(v=>({...v,entities:v.entities.map(T=>N.get(T)).filter(Boolean)}))}let E=Object.hasOwn(i.room_shortcuts??{},l)?i.room_shortcuts[l]:null;if(Array.isArray(E)){let N=new Set(x.map(v=>v.entity));S.shortcuts=H(E).filter(v=>N.has(v)).slice(0,oe)}return S})}function ai(i,e,t){let n=e.states??{},s=e.entities,o=new Set(H(i.hidden_entities)),r=new Set(H(i.overview_entities)),a=new Set(H(i.area_ids)),d=new Set(Object.entries(e.areas??{}).map(([g,p])=>p.area_id??g)),c=g=>{let p=dt(s?.[g],e);return d.has(p)?a.size===0||a.has(p):i.show_unassigned!==!1},m={};for(let[g,p]of Object.entries(n)){let h=ne(g),u=p?.attributes?.device_class,b;h==="lock"||h==="alarm_control_panel"||h==="binary_sensor"&&oi.has(u)?b="security":h==="person"?b="presence":h==="weather"?b="weather":h==="automation"&&c(g)?b="automations":h==="sensor"&&r.has(g)&&["energy","power"].includes(u)&&(b="energy"),!(!b||!we(g,n,s,o))&&(m[b]??=[]).push(xe(g,p,s?.[g]))}for(let g of Object.values(m))g.sort((p,h)=>Oe(p.name??p.entity,h.name??h.entity,t));return m}function ci(i,e){if(!Array.isArray(i.toolbar))return;let t=e.states??{},n=e.entities,s=new Set(H(i.hidden_entities)),o=st(i.profiles),r=new Set;return i.toolbar.flatMap((a,d)=>{if(!ii.has(a?.kind))return[];let c=a.kind==="link"&&typeof a.path=="string"?a.path.trim():"";if(a.kind==="link"&&!ei.test(c))return[];let m=rt(a.id,"toolbar-"+(d+1),r),g=typeof a.label=="string"?a.label.trim().slice(0,80):"",p=typeof a.icon=="string"?a.icon.trim():"",h=Array.isArray(a.entities)?H(a.entities).filter(u=>we(u,t,n,s)).map(u=>xe(u,t[u],n?.[u],o.get(u))):void 0;return[{id:m,kind:a.kind,...g&&{label:g},...Ie.test(p)&&{icon:p},...c&&{path:c},...h!==void 0&&{entities:h}}]})}function mt(i){return{title:be[ye("auto",i)].title,icon:"mdi:home-variant-outline"}}function pt(i={},e={}){let t=ye(i.locale,e),n=typeof i.title=="string"&&i.title.trim()?i.title.trim():be[t].title,s={type:Jt,page:!0,locale:t,title:n,rooms:se(i,e,t)},o=new Set(s.rooms.flatMap(c=>c.entities.map(m=>m.entity))),r=H(i.overview_entities).filter(c=>o.has(c));r.length&&(s.overview=r);let a=ai(i,e,t);Object.keys(a).length&&(s.context=a);let d=ci(i,e);return d!==void 0&&(s.toolbar=d),Object.hasOwn(De,i.background)&&(s.background=i.background),["soft","circle","square"].includes(i.shape)&&(s.shape=i.shape),["classic","header"].includes(i.layout)&&(s.layout=i.layout),typeof i.preference_key=="string"&&i.preference_key.trim()&&(s.preference_key=i.preference_key.trim()),{title:n,views:[{title:be[t].home,path:"home",type:"panel",cards:[s]}]}}var ut="custom:"+G;function pe(i){let e=new Error(i);return e.code=i,e}function li(i){let e=i.split("/")[1];return/^[a-z0-9][a-z0-9_-]*$/i.test(e??"")&&e.includes("-")?e:null}function ht(i){if(!i?.user?.is_admin||typeof i.callWS!="function")throw pe("setup_storage")}async function ft(i,e){let t=await i.callWS({type:"lovelace/config",url_path:e,force:!0});if(t?.strategy?.type!==ut)throw pe("setup_storage");return t}async function gt(i,e){ht(i);let t=li(e);if(!t||!(await i.callWS({type:"lovelace/dashboards/list"})).some(o=>o.url_path===t&&o.mode==="storage"))throw pe("setup_storage");let s=await ft(i,t);return{urlPath:t,strategy:s.strategy}}async function vt(i,e,t){ht(i);let n=await ft(i,e.urlPath);if(JSON.stringify(n.strategy)!==JSON.stringify(e.strategy))throw pe("setup_conflict");let s={...n,strategy:{...t,type:ut}};await i.callWS({type:"lovelace/config/save",url_path:e.urlPath,config:s})}var di="cubic-bezier(.2,.65,.22,1)";function mi(i){return i.key==="ContextMenu"||i.shiftKey&&(i.key==="F10"||i.key==="Enter"||i.code==="Space"||i.key===" ")}function He(i,e){let t=i.ownerDocument,n=t.defaultView,s,o=0;function r(){s&&(clearTimeout(s.timer),s.listeners.abort(),s.opened&&(o=performance.now()+700),s=void 0)}function a(){!s||s.opened||!i.isConnected||i.disabled||(s.opened=!0,o=1/0,e())}i.setAttribute("aria-haspopup","dialog"),i.setAttribute("aria-keyshortcuts","Shift+Enter Shift+Space Shift+F10 ContextMenu"),i.addEventListener("pointerdown",d=>{if(d.button!==0||d.isPrimary===!1||i.disabled)return;r(),o=0;let c=new AbortController,m={signal:c.signal,capture:!0};s={id:d.pointerId,x:d.clientX,y:d.clientY,touch:d.pointerType==="touch",listeners:c},s.timer=setTimeout(()=>{i.isConnected?a():r()},500),t.addEventListener("pointermove",p=>{s&&p.pointerId===s.id&&!s.opened&&Math.hypot(p.clientX-s.x,p.clientY-s.y)>12&&r()},m);let g=p=>{p.pointerId===s?.id&&r()};t.addEventListener("pointerup",g,m),t.addEventListener("pointercancel",g,m),n?.addEventListener("blur",r,m)}),i.addEventListener("contextmenu",d=>{!s?.touch&&!s?.opened||(d.preventDefault(),a())}),i.addEventListener("click",d=>{!(d.detail>0||d.pointerType)||performance.now()>o||(o=0,d.preventDefault(),d.stopImmediatePropagation())},!0),i.addEventListener("keydown",d=>{if(i.disabled||!mi(d)||(d.preventDefault(),d.stopPropagation(),d.repeat))return;let c=d.code||d.key,m=new AbortController,g={signal:m.signal,capture:!0};t.addEventListener("keyup",p=>{(p.code||p.key)===c&&(p.preventDefault(),m.abort())},g),n?.addEventListener("blur",()=>m.abort(),g),e()})}function Z(i){return i?.isConnected===!0}function Fe(i){Z(i)&&!i.disabled&&i.focus({preventScroll:!0})}function bt({dialog:i,clip:e,toolbar:t}){let n=i.ownerDocument,s=n.defaultView,o=s.matchMedia("(prefers-reduced-motion: reduce)"),r;function a(l){l.frame&&(s.cancelAnimationFrame(l.frame),l.frame=0)}function d(l){l.animation?.cancel(),l.animation=void 0}function c(l,f){e.scrollTop=f,l.expectedScroll=e.scrollTop}function m(){!r||Math.abs(e.scrollTop-r.expectedScroll)<=1.5||(r.externalScroll=!0,a(r))}function g(){let l=e?.getBoundingClientRect().top,f=t?.getBoundingClientRect().bottom??0,x=Number.isFinite(l)&&l>=0?l:f,S=s.innerHeight,E=Math.min(Math.max(0,x+86),Math.max(0,S-180));i.style.setProperty("--bayit-popup-area-top",E+"px")}function p(l,f,x=0){let S=l.left+l.width/2-f.left,E=l.top+l.height/2-f.top-x;i.style.setProperty("--motion-x",S+"px"),i.style.setProperty("--motion-y",E+"px")}function h(l,f,x,S){a(l);let E=e.scrollTop;if(!x||Math.abs(E-f)<.5){c(l,f),S?.(e.scrollTop-E);return}let N=s.performance.now(),v=T=>{if(r!==l||l.externalScroll||!Z(e))return;let L=Math.min(1,(T-N)/x),j=1-Math.pow(1-L,3);c(l,E+(f-E)*j),S?.(e.scrollTop-E),l.frame=L<1?s.requestAnimationFrame(v):0};l.frame=s.requestAnimationFrame(v)}function u(l,f,x,S){if(!Z(e)||!e.contains(l.source)||l.externalScroll||!["auto","scroll"].includes(s.getComputedStyle(e).overflowY))return;let E=e.scrollTop,N=e.getBoundingClientRect().top,v=l.kind==="room"?l.highlighted.getBoundingClientRect().bottom:f.bottom,T=l.kind==="room"?8:24,L=Math.max(0,v+T-x.top),j=Math.max(0,f.top-N-4),P=E+Math.min(L,j);if(P-E<.5)return;let W=Math.max(0,e.scrollHeight-e.clientHeight);if(P>W+.5){let M=l.spacer??=n.createElement("div");M.parentNode||(M.setAttribute("aria-hidden","true"),M.dataset.popupSpacer="",M.style.cssText="block-size:0;visibility:hidden;pointer-events:none;flex:none",e.append(M));let D=M.getBoundingClientRect().top-N-e.clientTop+e.scrollTop,$=Math.ceil(Math.max(0,e.clientHeight+P-D))+2;M.style.blockSize=$+"px",W=Math.max(0,e.scrollHeight-e.clientHeight)}h(l,Math.min(P,W),S,M=>p(f,x,M))}function b(l,f,x,S,E){if(o.matches||typeof i.animate!="function"){E?.();return}let N=i.animate([f,x],{duration:S,easing:di});l.animation=N,N.finished.then(()=>{r!==l||l.animation!==N||(l.animation=void 0,E?.())},()=>{})}function y(l,f){if(l){a(l),d(l),l.highlighted.removeAttribute("data-popup-origin"),s.removeEventListener("resize",w),e?.removeEventListener("scroll",m),l.spacer?.remove(),Z(e)&&l.originalScroll!==void 0&&!l.externalScroll&&(e.scrollTop=l.originalScroll);for(let x of["--motion-x","--motion-y","--bayit-popup-area-top"])i.style.removeProperty(x);delete i.dataset.kind,delete i.dataset.closing,r=void 0,f&&Fe(l.source)}}function w(){let l=r;if(!l||l.closing||!Z(l.source)||!i.open)return;a(l),d(l),g();let f=l.source.getBoundingClientRect(),x=i.getBoundingClientRect();p(f,x),u(l,f,x,0)}function _(l,{kind:f="toolbar",highlighted:x=l}={}){if(!Z(i))return;let S=i.querySelector("[autofocus]");if(i.open&&r){let L=r;a(L),L.closing&&d(L),L.closing=!1,L.restoreFocus=!0,delete i.dataset.closing,i.dataset.kind=f,g(),Fe(S);return}if(!Z(l))return;r&&y(r,!1);let E=e?.scrollTop,N=l.getBoundingClientRect(),v={source:l,highlighted:x||l,kind:f,originalScroll:E,expectedScroll:E};r=v,i.dataset.kind=f,g(),i.open||i.showModal();let T=i.getBoundingClientRect();v.highlighted.dataset.popupOrigin="",s.addEventListener("resize",w),e?.addEventListener("scroll",m,{passive:!0}),p(N,T),u(v,N,T,o.matches?0:190),b(v,{transform:"scale(.35)",opacity:0},{transform:"none",opacity:1},190),Fe(S)}function C({immediate:l=!1,restoreFocus:f=!0}={}){if(!i.open)return;let x=r;if(!x||l||o.matches){x&&(x.restoreFocus=f),i.close();return}if(x.closing)return;let S=s.getComputedStyle(i),E={transform:S.transform,opacity:S.opacity};d(x),x.closing=!0,x.restoreFocus=f,i.dataset.closing="",Z(e)&&!x.externalScroll&&x.originalScroll!==void 0&&h(x,x.originalScroll,220),b(x,E,{transform:"scale(.35)",opacity:0},220,()=>i.close())}function A(){y(r,!1),i.open&&i.close()}return i.addEventListener("cancel",l=>{l.preventDefault(),C()}),i.addEventListener("close",()=>{i.open||y(r,r?.restoreFocus!==!1)}),{open:_,dismiss:C,reset:A}}function yt(i){if(!Number.isFinite(i))return"—";let e=Math.max(0,Math.ceil(i)),t=Math.floor(e/60),n=String(e%60).padStart(2,"0");return t<60?String(t).padStart(2,"0")+":"+n:Math.floor(t/60)+":"+String(t%60).padStart(2,"0")+":"+n}function pi(i){let{min:e,max:t,step:n}=i,s=a=>Number.isSafeInteger(a)&&a>=e&&a<=t&&(a===t||(a-e)%n===0),o=Array.isArray(i.presets)?[...new Set(i.presets.filter(s))].slice(0,8):[];if(Array.isArray(i.presets))return o;let r=Math.max(1,Math.floor((t-e)/n/3))*n;return[...new Set([e,Math.min(t,e+r),Math.min(t,e+r*2),t])]}var ui={set_hvac_mode:["mdi:air-conditioner",i=>i.state],set_fan_mode:["mdi:fan",i=>i.attributes.fan_mode],set_swing_mode:["mdi:swap-vertical",i=>i.attributes.swing_mode]};function _t(i,{make:e,button:t,icon:n,label:s,t:o,request:r}){let a=new Set,d=[],c=[],m=[],g=i.actions;if(i.domain==="climate"){let y=e("div","climate-controls");g.set_hvac_mode?.options.includes("off")&&(a.add("turn_on"),a.add("turn_off"));let w=g.set_temperature;if(w){a.add("set_temperature");let{min:_,max:C,step:A}=w,l=A||1,f=e("div","temperature-stepper");f.setAttribute("role","group"),f.setAttribute("aria-label",o("set_temperature"));let x=e("output","target-value"),S=e("span","target-caption",o("target_short")),E=e("div","target-reading");E.append(S,x);for(let[N,v,T]of[[-1,"mdi:minus","temperature_down"],[1,"mdi:plus","temperature_up"]]){let L=t("step-control",o(T),v,!0);L.dataset.action="set_temperature";let j;d.push((P,W)=>{let M=P.attributes.temperature;j=Number.isFinite(M)?Number(Math.min(C,Math.max(_,M+N*l)).toFixed(8)):null,L.disabled=!!W||j===null||j===M}),L.onclick=()=>r("set_temperature",j,L),N<0?f.append(L,E):f.append(L)}d.push((N,v)=>{let T=v?.id==="set_temperature"?v.value:N.attributes.temperature;x.textContent=Number.isFinite(T)?T+"°":"—"}),y.append(f)}for(let[_,[C,A]]of Object.entries(ui)){if(!g[_]?.options)continue;a.add(_);let l=e("label","climate-selector"),f=e("select");f.dataset.action=_,f.setAttribute("aria-label",o(_));let x=e("option","","—");x.value="",x.disabled=!0,f.append(x);for(let S of g[_].options){let E=e("option","",o(S));E.value=S,f.append(E)}f.onchange=()=>r(_,f.value,f),d.push((S,E)=>{let N=E?.id===_?E.value:A(S);f.value=g[_].options.includes(N)?N:"",f.disabled=!!E}),l.append(n(C),f),y.append(l)}y.childElementCount&&c.push(y)}let p=["active","paused"].includes(i.timer?.state),h=p?g.extend_timed:g.start_timed,u=!!g.stop_timed&&(p||!h||i.state==="on");if(i.timer||h||u){for(let l of["start_timed","extend_timed","stop_timed"])a.add(l);let y=e("section","device-timer");y.setAttribute("aria-label",o("timed"));let w=e("p","timer-clock");w.setAttribute("aria-label",o("remaining_time")),w.dir="ltr";let _=e("p","timer-today");d.push(l=>{let f=l.timer;w.textContent=f?yt(f.remainingMs===null?null:f.remainingMs/1e3):"00:00",_.hidden=!Number.isFinite(f?.usedSeconds),_.hidden||(_.textContent=o("today_used")+" "+yt(f.usedSeconds))}),y.append(w,_);let C=e("div","timer-tools"),A;if(h){let l=h.id;A=e("input","timer-range"),A.type="range",A.min=h.min,A.max=h.max,A.step=h.step,A.value=h.max,A.setAttribute("aria-label",o("duration"));let f=e("output","timer-amount");f.textContent=A.value+" "+o("duration"),A.oninput=()=>{f.textContent=A.value+" "+o("duration")};let x=t("control-button timer-command",o(l),p?"mdi:plus":"mdi:play",!0);x.onclick=()=>r(l,A.valueAsNumber,x),x.dataset.action=l,m.push(x),C.append(A,f,x),d.push((S,E)=>{A.disabled=!!E})}if(u){let l=t("control-button timer-command",o("stop_timed"),"mdi:stop",!0);l.onclick=()=>r("stop_timed",void 0,l),l.dataset.action="stop_timed",m.push(l),C.append(l)}if(C.childElementCount&&y.append(C),h){let l=e("div","timer-presets");for(let f of pi(h)){let x=f+" "+o("duration"),S=t("control-button timer-preset",x);s(S,o(h.id)+" · "+x),S.dataset.action=h.id,S.onclick=()=>r(h.id,f,S),m.push(S),l.append(S)}l.childElementCount&&y.append(l)}c.push(y)}let b=g.set_heating_level??i.levelRange;if(b){let y=Math.floor((b.max-b.min)/b.step)+1;if(y>=2&&y<=12){a.add("set_heating_level");let w=e("section","heat-level"),_=e("p","heat-level-title",o("set_heating_level")),C=e("div","heat-level-options");for(let A=0;A<y;A++){let l=Number((b.min+A*b.step).toFixed(8)),f=t("control-button heat-level-choice",String(l));s(f,o("set_heating_level")+" "+l),f.dataset.action="set_heating_level",f.onclick=()=>r("set_heating_level",l,f),m.push(f),d.push((x,S)=>{let E=S?.id==="set_heating_level"?S.value:x.level;f.disabled=!!S||!x.actions.set_heating_level,f.setAttribute("aria-pressed",String(E===l)),f.toggleAttribute("data-changing",S?.id==="set_heating_level"&&E===l)}),C.append(f)}w.append(_,C),c.push(w)}}return{used:a,content:c,update(y,w){for(let _ of m)_.disabled=!!w;for(let _ of d)_(y,w)}}}var xt=`
  .climate-controls { display: flex; gap: 5px; flex-wrap: wrap; direction: ltr; }
  .climate-controls > * { flex: 1 1 76px; min-width: 0; }
  .climate-controls > .temperature-stepper { flex-basis: 90px; }
  .temperature-stepper, .climate-selector {
    display: flex; align-items: center; justify-content: space-between; gap: 3px;
    border: 1px solid var(--soft-line); border-radius: 10px; background: var(--control);
  }
  .target-reading { text-align: center; line-height: 1.08; }
  .target-caption { display: block; color: var(--secondary); font-size: 10px; font-weight: 730; }
  .target-value { display: block; font-size: 17px; font-weight: 760; direction: ltr; }
  .step-control { min-width: 30px; min-height: 44px; border: 0; background: transparent; padding: 0; }
  .step-control > ha-icon { width: 16px; height: 16px; --mdc-icon-size: 16px; }
  .climate-selector { padding-inline-start: 6px; }
  .climate-selector > ha-icon { width: 15px; height: 15px; --mdc-icon-size: 15px; }
  .climate-selector select { color: inherit; width: 100%; min-width: 0; min-height: 44px; border: 0;
    padding: 0 4px; background: transparent; font-size: 13px; font-weight: 730; }
  .shell[dir=rtl] .climate-selector select { direction: rtl; }
  .climate-selector option { background: #262626; color: white; }
  .device-timer, .heat-level { min-width: 0; text-align: center; border-top: 1px solid var(--soft-line); padding-top: 6px; }
  .timer-clock { margin: 1px 0 0; font-size: 18px; font-weight: 780; font-variant-numeric: tabular-nums; }
  .timer-today, .heat-level-title { margin: 0; font-size: 12px; font-weight: 740; color: var(--secondary); }
  .timer-tools { display: flex; align-items: center; justify-content: center; gap: 8px; margin-block: 2px 5px; direction: ltr; }
  .timer-range { flex: 1; width: 0; min-width: 50px; min-height: 44px; margin: 0;
    direction: ltr; accent-color: var(--moving); }
  .timer-amount { white-space: nowrap; font-size: 12px; }
  .timer-command { min-width: 44px; padding-inline: 8px; }
  .timer-presets, .heat-level-options { display: grid; gap: 4px; direction: ltr; grid-template-columns: repeat(auto-fit,minmax(48px,1fr)); }
  .timer-preset, .heat-level-choice { padding-inline: 3px; }
  .heat-level-options { margin-top: 5px; }
  .heat-level-choice[data-changing] { outline: 1px dashed currentColor; outline-offset: -4px; }
  .modal[data-kind=device] .device[data-treatment=climate] .device-name { display: none; }
`;var Nt=Object.freeze(["aurora","lagoon","dunes","graphite"]),he={background:Nt,shape:["soft","circle","square"],layout:["classic","header"]},hi={aurora:"#63928a",lagoon:"#37728c",dunes:"#aa7356",graphite:"#596169"},Tt=/^mdi:[a-z0-9-]+$/,wt=/^[a-z0-9_]+\.[a-z0-9_]+$/,fi={turn_on:"mdi:power-on",turn_off:"mdi:power-off",open:"mdi:arrow-up",close:"mdi:arrow-down",stop:"mdi:stop",lock:"mdi:lock-outline",unlock:"mdi:lock-open-variant-outline",start_timed:"mdi:timer-play-outline",stop_timed:"mdi:timer-stop-outline"},kt={light:"mdi:lightbulb-outline",switch:"mdi:toggle-switch-outline",fan:"mdi:fan",cover:"mdi:blinds",climate:"mdi:thermostat",lock:"mdi:lock-outline",heater:"mdi:radiator",boiler:"mdi:water-boiler",water_heater:"mdi:water-boiler",sensor:"mdi:gauge",binary_sensor:"mdi:motion-sensor",calendar:"mdi:calendar-outline",alarm_control_panel:"mdi:shield-home-outline",weather:"mdi:weather-partly-cloudy",person:"mdi:account-outline",vacuum:"mdi:robot-vacuum",camera:"mdi:cctv",media_player:"mdi:speaker"},ke=["automations","security","presence","weather","energy"],Ve={activity:"mdi:home-automation",automations:"mdi:home-automation",security:"mdi:shield-home-outline",presence:"mdi:account-group-outline",weather:"mdi:weather-partly-cloudy",energy:"mdi:meter-electric-outline",overview:"mdi:view-dashboard-outline",settings:"mdi:cog-outline",link:"mdi:arrow-top-right"},gi=new Set(["light","switch","fan","cover","lock","climate","water_heater"]),vi=new Set(["light","switch","fan","climate","water_heater"]),bi=new Set(["lights","covers","climate","heating","sensors","devices","garage","weather","security","media","vacuum","laundry"]),yi=/^\/(?!\/)[a-z0-9][a-z0-9/_-]*(?:#[a-z0-9_-]+)?$/i,_i={light:"room_lights",cover:"room_covers",climate:"room_climate",fan:"room_climate",water_heater:"room_climate",lock:"room_security",alarm_control_panel:"room_security",camera:"room_security",sensor:"room_sensors",binary_sensor:"room_sensors",weather:"room_sensors"},je=i=>i.entity.split(".")[0],xi=new Set(["open","close","set_position"]),St=new Set(["set_position","set_brightness","set_percentage"]),At={set_position:"current_position",set_percentage:"percentage",set_brightness:"brightness",set_temperature:"temperature",set_fan_mode:"fan_mode",set_preset_mode:"preset_mode",set_operation_mode:"operation_mode",set_swing_mode:"swing_mode"},Ct=["turn_on","turn_off","open","stop","close","lock","unlock","set_position","set_brightness","set_percentage","set_hvac_mode","set_temperature","set_temperature_range","set_fan_mode","set_swing_mode","set_preset_mode","set_operation_mode","set_heating_level","start_timed","extend_timed","stop_timed","run_script"],Et=new Set(["on","off","open","closed","opening","closing","locked","unlocked","locking","unlocking","jammed","cool","heat","heat_cool","dry","fan_only","auto","idle","active","paused","playing","cleaning","docked","unavailable","unknown"]),wi=0;function R(i,e,t){let n=document.createElement(i);return e&&(n.className=e),t!=null&&(n.textContent=t),n}function ae(i,e="mdi:information-outline"){return typeof i=="string"&&Tt.test(i)?i:e}function ie(i){let e=R("ha-icon");return e.setAttribute("icon",ae(i)),e.setAttribute("aria-hidden","true"),e}function Q(i,e){i.getAttribute("aria-label")!==e&&(i.title=e,i.setAttribute("aria-label",e))}function U(i,e,t,n=!1){let s=R("button",i);return s.type="button",t&&s.append(ie(t)),n?Q(s,e):e&&s.append(e),s}function B(i){return typeof i=="string"?i.trim():""}function re(i){if(i==null||i==="")return null;let e=Number(i);return Number.isFinite(e)?e:null}function ue(i){return"⁦"+i+"⁩"}function q(i,e){i.textContent!==String(e)&&(i.textContent=e)}function Be(i,e){let t=ae(e);i.getAttribute("icon")!==t&&i.setAttribute("icon",t)}function Ue(i){let e=B(typeof i=="string"?i:i?.entity);if(!wt.test(e))throw new Error("Invalid Home Assistant entity in Bayit 9.");let t={entity:e};return B(i.name)&&(t.name=B(i.name)),Tt.test(B(i.icon))&&(t.icon=i.icon),["heater","boiler"].includes(i.kind)&&(t.kind=i.kind),wt.test(B(i.level_entity))&&i.level_entity.startsWith("number.")&&(t.level_entity=i.level_entity),Number.isSafeInteger(i.level_steps)&&i.level_steps>=2&&i.level_steps<=12&&(t.level_steps=i.level_steps,/^input_number\.[a-z0-9_]+$/.test(i.level_read_entity??"")&&(t.level_read_entity=i.level_read_entity)),i.timed&&typeof i.timed=="object"&&!Array.isArray(i.timed)&&(t.timed={...i.timed}),t}function ki(i={}){if(!i||typeof i!="object"||Array.isArray(i))throw new Error("Invalid Bayit 9 configuration.");let e=/^he(?:-|$)/i.test(B(i.locale))?"he":"en",t=new Set,n=i.rooms??[];if(!Array.isArray(n))throw new Error("Bayit 9 rooms must be a list.");let s=n.map(c=>{let m=B(c?.id),g=B(c?.name);if(!/^[a-z0-9][a-z0-9_-]*$/i.test(m)||!g||t.has(m))throw new Error("Each Bayit 9 room needs a unique id and name.");t.add(m);let p=c.entities??[],h=new Map;if(!Array.isArray(p))throw new Error("Bayit 9 room entities must be a list.");for(let b of p){let y=Ue(b);h.has(y.entity)||h.set(y.entity,y)}let u={id:m,name:g,icon:ae(c.icon,"mdi:door-open"),entities:[...h.values()]};return Array.isArray(c.shortcuts)&&(u.shortcuts=[...new Set(c.shortcuts)].filter(b=>h.has(b)).slice(0,oe)),Array.isArray(c.sections)&&(u.sections=c.sections.filter(b=>bi.has(b?.kind)).map(b=>({id:B(b.id),kind:b.kind,title:typeof b.title=="string"?b.title:void 0,entities:[...new Set((Array.isArray(b.entities)?b.entities:[]).map(y=>y?.entity??y))].map(y=>h.get(y)).filter(Boolean)}))),u}),o=new Map(s.flatMap(c=>c.entities.map(m=>[m.entity,m]))),r=Array.isArray(i.overview)?[...new Set(i.overview)].filter(c=>o.has(c)).map(c=>o.get(c)):[],a=Object.fromEntries(ke.map(c=>{let m=Array.isArray(i.context?.[c])?i.context[c].map(Ue):[],g=new Map(m.map(p=>[p.entity,o.get(p.entity)??p]));return[c,[...g.values()]]})),d=Array.isArray(i.toolbar)?i.toolbar.flatMap(c=>!Object.hasOwn(Ve,c?.kind)||c.kind==="link"&&!yi.test(c.path)?[]:[{kind:c.kind,id:B(c.id),label:B(c.label),path:c.path,icon:ae(c.icon,Ve[c.kind]),...Array.isArray(c.entities)&&{entities:c.entities.map(Ue)}}]):null;return{locale:e,rooms:s,overview:r,context:a,toolbar:d,page:i.page===!0,title:B(i.title)||le[e].home,background:Nt.includes(i.background)?i.background:"aurora",layout:he.layout.includes(i.layout)?i.layout:"classic",shape:he.shape.includes(i.shape)?i.shape:"soft",storageKey:"bayit-9.preferences.v1:"+(B(i.preference_key)||location.pathname)}}var Si=`
  <main class="shell">
    <header class="toolbar">
      <div class="brand"><ha-icon icon="mdi:home-variant-outline" aria-hidden="true"></ha-icon><h1></h1></div>
      <div class="toolbar-actions"></div>
    </header>
    <div class="room-scroll"><div class="rooms" role="region"></div></div>
    <p class="empty"></p>
    <div class="notice" data-role="page-notice" role="status" aria-atomic="true"></div>
    <dialog class="modal">
      <header class="modal-header"><h2></h2>
        <button type="button" class="round-action" data-role="close" autofocus>
          <ha-icon icon="mdi:close" aria-hidden="true"></ha-icon>
        </button>
      </header>
      <div class="modal-body"><div data-role="content"></div>
        <div class="notice" data-role="modal-notice" role="status" aria-atomic="true"></div>
      </div>
    </dialog>
    <dialog class="modal confirm">
      <header class="modal-header"><h2></h2></header>
      <div class="modal-body"><p class="confirmation-text"></p>
        <div class="confirmation-actions">
          <button type="button" class="control-button" data-role="abort" autofocus></button>
          <button type="button" class="control-button" data-role="accept"></button>
        </div>
      </div>
    </dialog>
  </main>
`,Ge=class extends HTMLElement{constructor(){super(),this.attachShadow({mode:"open"}).innerHTML="<style>"+Je+xt+"</style>"+Si;let e=o=>this.shadowRoot.querySelector(o),t=o=>e('[data-role="'+o+'"]');this.nodes={shell:e(".shell"),toolbar:e(".toolbar"),toolbarActions:e(".toolbar-actions"),roomScroll:e(".room-scroll"),rooms:e(".rooms"),empty:e(".empty"),title:e("h1"),close:t("close"),modal:e("dialog:not(.confirm)"),modalTitle:e("dialog:not(.confirm) h2"),modalBody:e("dialog:not(.confirm) .modal-body"),content:t("content"),confirm:e(".confirm"),confirmTitle:e(".confirm h2"),confirmText:e(".confirmation-text"),accept:t("accept"),abort:t("abort"),pageNotice:t("page-notice"),modalNotice:t("modal-notice")};let n=this.nodes,s="bayit-9-"+ ++wi;n.modalTitle.id=s+"-title",n.modal.setAttribute("aria-labelledby",n.modalTitle.id),n.confirmTitle.id=s+"-confirm",n.confirmText.id=s+"-message",n.confirm.setAttribute("aria-labelledby",n.confirmTitle.id),n.confirm.setAttribute("aria-describedby",n.confirmText.id),this.popupMotion=bt({dialog:n.modal,clip:n.roomScroll,toolbar:n.toolbar}),n.close.onclick=()=>this.popupMotion.dismiss(),n.abort.onclick=()=>n.confirm.close(),n.accept.onclick=()=>this.acceptAction(),n.modal.addEventListener("close",()=>this.closePanel()),n.confirm.addEventListener("close",()=>{let o=this.confirming?.source;this.confirming=null,o?.isConnected&&!o.disabled&&o.focus({preventScroll:!0})});for(let o of[n.modal,n.confirm])o.addEventListener("click",r=>{let a=o.getBoundingClientRect();r.target===o&&(r.clientX<a.left||r.clientX>a.right||r.clientY<a.top||r.clientY>a.bottom)&&(o===n.modal?this.popupMotion.dismiss():o.close())});this.roomViews=new Map,this.deviceViews=new Set,this.pending=new Map,this.roomScroll=new Map,this.preferences={},this.controller=nt({getHass:()=>this._hass}),this.resize=()=>this.fitPage(),this.storageChange=o=>{o.key===this.config?.storageKey&&(this.readPreferences(),this.applyPreferences())}}static getStubConfig(){return{locale:"en",rooms:[]}}getCardSize(){return Math.max(2,Math.ceil((this.config?.rooms.length||0)/2)*3+1)}getGridOptions(){return{columns:12,min_columns:6,rows:"auto"}}setConfig(e){let t=ki(e);this.config?.storageKey!==t.storageKey&&(this.preferences={}),this.nodes.confirm.open&&this.nodes.confirm.close(),this.popupMotion.reset(),this.config=t,this.words=le[t.locale];let n=this.nodes;n.shell.lang=t.locale,n.shell.dir=t.locale==="he"?"rtl":"ltr",n.shell.dataset.page=String(t.page),n.shell.style.setProperty("--bayit-room-rows",String(Math.max(1,Math.ceil(t.rooms.length/2)))),q(n.title,t.title),q(n.empty,this.t("empty")),Q(n.close,this.t("close")),n.rooms.setAttribute("aria-label",this.t("rooms")),q(n.confirmTitle,this.t("confirm_title")),q(n.abort,this.t("cancel")),q(n.accept,this.t("confirm")),this.readPreferences(),this.buildToolbar(),this.buildRooms(),this.applyPreferences(),this.update(),this.fitPage()}set hass(e){this._hass=e,this.setup?.editor&&(this.setup.editor.hass=e),!(!this.isConnected||this.frame||!this.config)&&(this.frame=requestAnimationFrame(()=>{this.frame=0,this.update()}))}connectedCallback(){window.addEventListener("storage",this.storageChange),window.addEventListener("resize",this.resize),window.visualViewport?.addEventListener("resize",this.resize),this.fitPage(),this.update()}disconnectedCallback(){window.removeEventListener("storage",this.storageChange),window.removeEventListener("resize",this.resize),window.visualViewport?.removeEventListener("resize",this.resize),cancelAnimationFrame(this.frame),clearInterval(this.ticker),clearTimeout(this.noticeTimer),this.frame=this.ticker=0,this.nodes.confirm.open&&this.nodes.confirm.close(),this.popupMotion.reset()}fitPage(){if(!this.config?.page||!this.isConnected)return;let e=this.getBoundingClientRect(),t=window.visualViewport,n=t?t.offsetTop+t.height:window.innerHeight;e.top<0||(this.nodes.shell.style.setProperty("--bayit-view-height",Math.max(0,n-e.top)+"px"),this.nodes.shell.style.setProperty("--bayit-page-top",e.top+"px"),this.nodes.modal.style.setProperty("--bayit-popup-view-bottom",n+"px"))}t(e){return this.words?.[e]||e}readPreferences(){let e;try{e=JSON.parse(localStorage.getItem(this.config.storageKey)||"{}")}catch{return}this.preferences={};for(let[t,n]of Object.entries(he))n.includes(e?.[t])&&(this.preferences[t]=e[t])}applyPreferences(){for(let e of Object.keys(he))this.nodes.shell.dataset[e]=this.preferences[e]||this.config[e];for(let{article:e,heading:t}of this.roomViews.values())this.nodes.shell.dataset.layout==="header"&&e.firstElementChild!==t&&e.prepend(t),this.nodes.shell.dataset.layout!=="header"&&e.lastElementChild!==t&&e.append(t);if(this.panel?.type==="settings")for(let e of this.nodes.content.querySelectorAll("[data-preference]"))e.setAttribute("aria-pressed",String(e.value===this.nodes.shell.dataset[e.dataset.preference]))}setPreference(e,t){this.preferences[e]=t;try{localStorage.setItem(this.config.storageKey,JSON.stringify(this.preferences))}catch{}this.applyPreferences()}model(e){try{let t=tt(e,this._hass?.states??{});return{...t,icon:ae(t.icon,kt[t.kind||t.domain])}}catch{return{...e,name:e.name||e.entity,icon:ae(e.icon),actions:{},attributes:{},state:"unavailable",available:!1}}}buildToolbar(){let e=this.config,t=[e.context.automations.length?"automations":"activity","security","presence","weather","energy","overview","settings"],n=e.toolbar??t.map(s=>({kind:s,icon:Ve[s]}));this.nodes.toolbarActions.replaceChildren(),this.toolbarViews=n.map(s=>{let{kind:o}=s,r=s.label||this.t(o),a=s.entities??(o==="overview"?e.overview:e.context[o]??[]),d=U("chrome-button",r,s.icon,!0);d.dataset.role=o,o!=="link"&&d.setAttribute("aria-haspopup","dialog");let c=["presence","activity"].includes(o)?R("span","badge"):null;c&&(c.hidden=!0,c.setAttribute("aria-hidden","true"),d.append(c)),d.onclick=()=>{if(o==="link")return location.assign(s.path);this.openPanel(o,d,void 0,void 0,{name:r,entities:a})};let m=!e.toolbar&&(o==="overview"||ke.includes(o));return this.nodes.toolbarActions.append(d),{kind:o,element:d,badge:c,entities:a,needsContent:m}})}quickAction(e,t,n){let s=this.model(e),{domain:o,state:r}=s,a;o==="cover"?a=["opening","closing"].includes(r)?"stop":r==="open"?"close":r==="closed"?"open":void 0:o==="lock"?a=r==="locked"?"unlock":r==="unlocked"?"lock":void 0:vi.has(o)&&!e.kind&&(a=r==="off"?"turn_on":"turn_off"),a&&s.actions[a]?this.requestAction(e,a,void 0,t,o==="lock"):this.openPanel("device",t,n,e.entity)}buildRooms(){let e=this.nodes;this.roomViews.clear(),e.rooms.replaceChildren();for(let t of this.config.rooms){let n=R("article","room");n.dataset.room=t.id;let s=U("room-title");Q(s,t.name),s.setAttribute("aria-haspopup","dialog");let o=ie(this.config.locale==="he"?"mdi:chevron-left":"mdi:chevron-right");o.className="chevron";let r=R("span","room-count");r.setAttribute("aria-hidden","true"),s.append(ie(t.icon),R("span","room-name",t.name),r,o),s.onclick=()=>this.openPanel("room",s,t),n.onclick=u=>{u.target.closest("button")||this.openPanel("room",s,t)};let a=R("div","room-status"),d=ie("mdi:power-standby"),c=R("span");a.append(d,c);let m=R("div","quick"),g=new Map,p=new Map(t.entities.map(u=>[u.entity,u])),h=t.shortcuts?t.shortcuts.map(u=>p.get(u)):t.entities.filter(u=>gi.has(je(u))).slice(0,oe);for(let u of h){let b=U("quick-button",u.name||u.entity,u.icon||"mdi:information-outline",!0);b.dataset.entity=u.entity,b.setAttribute("aria-haspopup","dialog"),b.onclick=()=>this.quickAction(u,b,t),He(b,()=>this.openPanel("device",b,t,u.entity)),g.set(u.entity,b),m.append(b)}n.append(a,m,s),e.rooms.append(n),this.roomViews.set(t.id,{room:t,article:n,heading:s,count:r,status:a,statusIcon:d,statusText:c,shortcut:g})}e.empty.hidden=this.roomViews.size>0}tone(e){return e.available?e.domain==="cover"&&["open","opening","closing"].includes(e.state)||e.domain==="climate"&&!["heater","boiler"].includes(e.kind)&&e.state!=="off"?"moving":e.domain==="lock"&&["unlocked","unlocking","jammed"].includes(e.state)?"critical":e.timer?.state==="active"||["on","playing","cleaning"].includes(e.state)||["heating","cooling","drying","fan"].includes(e.attributes?.hvac_action)?"warm":"quiet":"quiet"}stateLabel(e){if(!e.available)return this.t("unavailable");let t=e.attributes||{},n=e.state,s=r=>Et.has(r)?this.t(r):String(r||this.t("unknown"));if(e.domain==="cover"){let r=re(t.current_position);return(n==="open"?this.t("opened"):s(n))+(r===null?"":" · "+ue(r+"%"))}if(e.domain==="sensor"&&t.unit_of_measurement)return ue(n+" "+t.unit_of_measurement);if(e.domain==="climate"){let r=re(t.current_temperature),a=this._hass?.config?.unit_system?.temperature||"°";return s(n)+(r===null?"":" · "+ue(r+" "+a))}if(Et.has(n))return s(n);let o=this._hass?.states?.[e.entity];return String(o&&this._hass?.formatEntityState?.(o)||n||this.t("unknown"))}update(){if(!this.config)return;let e=this.nodes,t=new Map,n=!1;for(let[o,r]of this.roomViews){let a=0,d=!1,c,m,g;for(let h of r.room.entities){let u=this.model(h),b=this.tone(u);if(d||=!u.available,u.domain==="light"&&u.state==="on"&&a++,b!=="quiet"&&!t.has(h.entity)&&t.set(h.entity,{config:h,model:u,room:r.room}),!c&&u.available&&u.attributes?.device_class==="temperature"&&(c=this.stateLabel(u)),!m&&u.available&&u.domain==="climate"){let _=re(u.attributes.current_temperature);_!==null&&(m=ue(_+(this._hass?.config?.unit_system?.temperature||"°")))}u.timer?.state==="active"&&(n=!0,g||(g=this.timerLabel(u.timer)));let y=r.shortcut.get(h.entity);if(!y)continue;Be(y.firstElementChild,u.icon),Q(y,u.name+" · "+this.stateLabel(u)),y.dataset.tone=b,y.dataset.transition=["opening","closing"].includes(u.state)?u.state:"";let w=this.pending.has(h.entity);y.setAttribute("aria-busy",String(w))}let p=g||c||m;r.status.hidden=!p&&!d,q(r.statusText,p||this.t("unavailable")),Be(r.statusIcon,g?"mdi:timer-outline":p?"mdi:thermometer":"mdi:alert-circle-outline"),q(r.count,a||this.t("off")),r.count.dataset.tone=a?"warm":"quiet",r.article.toggleAttribute("data-current",this.panel?.type==="room"&&this.panel.room?.id===o)}this.activeDevices=t;let s=this.panel?.type;if(s==="room"||s==="device"||s==="overview"||ke.includes(s)){let o=this.updateDevices();n||=o}s==="activity"&&this.paintActivity();for(let{kind:o,element:r,badge:a,entities:d,needsContent:c}of this.toolbarViews)if(r.hidden=c&&!d.length&&(o!=="energy"||!this._hass?.panels?.energy),a){let m=o==="activity"?t.size:d.filter(g=>this._hass?.states?.[g.entity]?.state==="home").length;a.hidden=!m,q(a,m)}n&&!this.ticker&&this.isConnected&&(this.ticker=setInterval(()=>this.update(),1e3)),!n&&this.ticker&&(clearInterval(this.ticker),this.ticker=0)}openPanel(e,t,n,s,o){if(!this.config)return;let r=this.nodes,a=e==="device"?n?.entities.find(g=>g.entity===s):null;if(e==="device"&&!a)return;let d=a?this.model(a):null;this.panel={type:e,room:n},this.setup=null,this.deviceViews.clear(),this.activitySignature=null,q(r.modalNotice,"");let c=d?.icon||n?.icon||t.querySelector("ha-icon")?.getAttribute("icon");if(r.modalTitle.replaceChildren(ie(c),d?.name||n?.name||o?.name||this.t(e)),e==="room"&&this.buildDevices(n.entities,n),a&&this.buildDevices([a]),e==="overview"||ke.includes(e)){let g=o?.entities??(e==="overview"?this.config.overview:this.config.context[e]);this.buildDevices(g),e==="energy"&&this._hass?.panels?.energy&&this.appendEnergyLink(g.length)}e==="settings"&&this.paintSettings(),e==="setup"&&this.paintSetup(),e==="activity"&&this.paintActivity();let m=e==="room"||e==="device"?e:"toolbar";this.popupMotion.open(t,{kind:m,highlighted:e==="room"?this.roomViews.get(n.id)?.article:t}),r.modalBody.scrollTop=e==="room"&&this.roomScroll.get(n.id)||0,this.update()}closePanel(){let e=this.nodes;e.modal.open||(this.panel?.type==="room"&&this.roomScroll.set(this.panel.room.id,e.modalBody.scrollTop),this.panel=null,this.setup=null,this.deviceViews.clear(),clearInterval(this.ticker),this.ticker=0,this.update())}buildDevices(e,t){let n=this.nodes.content;if(n.className="devices",t?n.dataset.room="true":delete n.dataset.room,n.replaceChildren(),t){let s=t.sections?.map(a=>({...a,key:"room_"+a.kind}))??[],o=new Set(s.flatMap(a=>a.entities.map(d=>d.entity))),r=[...s,...this.defaultRoomSections(e.filter(a=>!o.has(a.entity)))];for(let{key:a,title:d,entities:c}of r){if(!c.length)continue;let m=R("section","device-group");m.dataset.group=a,d!==""&&m.append(R("h3","device-group-title",d??this.t(a)));for(let g of c)this.buildDevice(g,m,t,a);n.append(m)}}else for(let s of e)this.buildDevice(s,n);n.childElementCount||n.append(R("p","empty",this.t("empty_room"))),this.updateDevices()}defaultRoomSections(e){let t=new Map;for(let n of e){let s=n.kind==="heater"||n.kind==="boiler"?"room_heating":_i[je(n)]??"room_devices";t.has(s)||t.set(s,{key:s,entities:[]}),t.get(s).entities.push(n)}return t.values()}buildDevice(e,t,n,s){let o=R("section","device"),r=je(e),a=s==="room_lights"&&["light","switch"].includes(r)&&!e.kind;o.dataset.entity=e.entity,o.dataset.treatment=e.kind||r;let d=ie(e.icon||"mdi:information-outline");d.className="device-icon";let c=R(n&&!a?"h4":a?"span":"h3","device-name"),m=R("span","current"),g={config:e,item:o,glyph:d,name:c,state:m,fields:[],room:n};if(a){o.dataset.compact="tile";let p=U("device-tile");p.append(d,c,m),p.setAttribute("aria-haspopup","dialog"),p.onclick=()=>this.quickAction(e,p,n),He(p,()=>this.openPanel("device",p,n,e.entity)),g.tile=p,o.append(p)}else{let p=R("header","device-head"),h=R("div","device-detail");h.append(c,m);let u=!!n&&r==="cover";u&&(o.dataset.compact="cover");let b=U("round-action",this.t(u?"device_controls":"more_info"),u?e.icon||kt.cover:"mdi:information-outline",!0);b.onclick=()=>u?this.openPanel("device",b,n,e.entity):this.moreInfo(e),p.append(d,h,b);let y=R("div","action-list");o.append(p,y),Object.assign(g,{more:b,group:y})}t.append(o),this.deviceViews.add(g)}appendEnergyLink(e){let t=this.nodes.content;e||t.replaceChildren();let n=R("a","control-button",this.t("open_energy"));n.href="/energy",t.prepend(n)}moreInfo(e){this.model(e).actions.more_info&&(this.popupMotion.dismiss({immediate:!0,restoreFocus:!1}),this.dispatchEvent(new CustomEvent("hass-more-info",{detail:{entityId:e.entity},bubbles:!0,composed:!0})))}timerLabel(e){if(!e||["idle","unavailable"].includes(e.state))return"";if(e.remainingMs===null)return this.t(e.state);let t=Math.max(0,Math.ceil(e.remainingMs/1e3));return this.t("timed")+" · "+ue(Math.floor(t/60)+":"+String(t%60).padStart(2,"0"))}updateDevices(){let e=!1;for(let t of this.deviceViews.values()){let n=this.model(t.config);q(t.name,n.name),Be(t.glyph,n.icon),n.timer?.state==="active"&&(e=!0),q(t.state,this.stateLabel(n)),t.state.dataset.tone=this.tone(n);let s=this.pending.get(t.config.entity);if(t.tile){let a=n.state==="on"?"turn_off":"turn_on";Q(t.tile,this.t(a)),t.tile.setAttribute("aria-description",n.name),t.tile.setAttribute("aria-pressed",String(n.state==="on")),t.tile.setAttribute("aria-busy",String(!!s));continue}t.more.hidden=!n.actions.more_info;let o=n.timer?[n.timer.state,Number.isFinite(n.timer.usedSeconds),n.state==="on"]:null,r=JSON.stringify([Ct.map(a=>n.actions[a]||null),o]);r!==t.signature&&(t.signature=r,this.buildActions(t,n)),t.item.setAttribute("aria-busy",String(!!s));for(let a of t.group.querySelectorAll("button,input,select"))a.disabled=!this.canRequest(t.config.entity,a.dataset.action);t.special.update(n,s);for(let a of t.fields)this.syncField(a,n)}return e}paintSettings(){let e=this.nodes.content;if(e.className="settings",e.replaceChildren(),this._hass?.user?.is_admin){let t=U("control-button setup-entry",this.t("setup"),"mdi:tune-variant");t.onclick=()=>this.openPanel("setup",t),e.append(t)}for(let[t,n]of Object.entries(he)){let s=R("fieldset","prefs-group");s.append(R("legend","",this.t(t)));let o=R("div","prefs-options");for(let r of n){let a=U("control-button",this.t(r));if(t==="background"){let d=R("span","swatch");d.style.background=hi[r],d.setAttribute("aria-hidden","true"),a.prepend(d)}a.value=r,a.dataset.preference=t,a.onclick=()=>this.setPreference(t,r),o.append(a)}s.append(o),e.append(s)}this.applyPreferences()}async paintSetup(){let e=this.panel,t=this.nodes.content,n=R("p","setup-status",this.t("setup_loading"));n.setAttribute("role","status"),t.className="setup-page",t.replaceChildren(n);let s=o=>this.t(["setup_storage","setup_conflict"].includes(o.code)?o.code:"setup_error");try{let o=await gt(this._hass,location.pathname);if(this.panel!==e)return;let r=customElements.get("ll-strategy-dashboard-"+G).getConfigElement();r.classList.add("setup-editor"),r.setConfig(structuredClone(o.strategy)),r.hass=this._hass,this.setup={editor:r};let a=o.strategy,d=U("control-button",this.t("setup_save"),"mdi:content-save-outline");d.disabled=!0,r.addEventListener("config-changed",m=>{a=m.detail.config,d.disabled=JSON.stringify(a)===JSON.stringify(o.strategy)}),d.onclick=async()=>{d.disabled=!0,r.inert=!0,n.textContent=this.t("setup_saving");try{await vt(this._hass,o,a),location.reload()}catch(m){if(this.panel!==e)return;n.textContent=s(m),r.inert=!1,d.disabled=m.code==="setup_conflict"}};let c=R("div","setup-footer");n.textContent="",c.append(n,d),t.replaceChildren(r,c)}catch(o){this.panel===e&&(n.textContent=s(o))}}paintActivity(){let e=[...(this.activeDevices||new Map).values()],t=JSON.stringify(e.map(({model:o,room:r})=>[o.entity,o.name,this.stateLabel(o),r.id]));if(t===this.activitySignature)return;this.activitySignature=t;let n=this.nodes.content;n.className="";let s=R("ul","activity-list");for(let{model:o,room:r,config:a}of e){let d=R("li"),c=U("control-button");c.append(R("span","",o.name+" · "+r.name),R("span","",this.stateLabel(o))),c.onclick=()=>this.openPanel("device",c,r,a.entity),d.append(c),s.append(d)}n.replaceChildren(e.length?s:R("p","empty",this.t("quiet")))}actionLabel(e){return this.t(e==="close"?"close_device":e)}buildActions(e,t){let n=this.shadowRoot.activeElement,s=n&&e.group.contains(n)?n.dataset.action:void 0;e.fields=[];let o=R("div","basic-actions"),r=[];e.special=_t(t,{make:R,button:U,icon:ie,label:Q,t:a=>this.t(a),request:(a,d,c)=>this.requestAction(e.config,a,d,c)});for(let a of Ct){let d=t.actions[a];if(!d||e.special.used.has(a)||e.room&&t.domain==="cover"&&a==="set_position")continue;if(St.has(a)||d.options||typeof d.min=="number"||["set_temperature_range","start_timed"].includes(a)){r.push(this.buildField(e,d,a,t));continue}let c=this.actionLabel(a),m=U("control-button",c,fi[a]);Q(m,c),m.dataset.action=a,m.onclick=()=>this.requestAction(e.config,a,void 0,m),o.append(m)}e.group.replaceChildren(...o.childElementCount?[o]:[],...e.special.content,...r),s&&([...e.group.querySelectorAll("[data-action]")].find(d=>d.dataset.action===s)||e.more).focus({preventScroll:!0})}numberInput(e,t){let n=R("input");n.type=t;for(let s of["min","max","step"])typeof e[s]=="number"&&(n[s]=String(e[s]));return t==="number"&&e.step==null&&(n.step="any"),n}buildField(e,t,n,s){let o=R("div","field-row"),r=n==="start_timed"?this.t("duration"):this.actionLabel(n),a=R("label","",r),d=St.has(n),c={action:t,id:n};if(t.options){c.input=R("select");for(let p of t.options){let h=R("option","",this.t(p));h.value=p,c.input.append(h)}}else c.input=this.numberInput(t,d?"range":"number");c.input.dataset.action=n,a.append(c.input),n==="set_temperature_range"&&(c.input.setAttribute("aria-label",r+" · "+this.t("min")),c.second=this.numberInput(t,"number"),c.second.dataset.action=n,c.second.setAttribute("aria-label",r+" · "+this.t("max")),a.append(c.second)),d&&(c.output=R("output","duration-label"),a.append(c.output));let m=()=>{c.dirty=!0,c.output&&q(c.output,c.input.value+"%")};c.input.addEventListener("input",m),c.second?.addEventListener("input",m);let g=U("control-button",n==="start_timed"?this.actionLabel(n):this.t("apply"));return g.dataset.action=n,Q(g,n==="start_timed"?this.actionLabel(n):this.t("apply")+" · "+r),g.onclick=()=>{let p=c.input.localName==="select"?c.input.value:c.input.valueAsNumber,h=c.second?{low:c.input.valueAsNumber,high:c.second.valueAsNumber}:p;this.requestAction(e.config,n,h,g)},e.fields.push(c),this.syncField(c,s),o.append(a,g),o}syncField(e,t){let{id:n,input:s,second:o,action:r}=e,a=this.shadowRoot.activeElement;if(e.dirty||a===s||o&&a===o)return;let d=t.attributes;if(o)s.value=String(d.target_temp_low??r.min??18),o.value=String(d.target_temp_high??r.max??25);else if(n==="set_hvac_mode")s.value=t.state;else if(n==="start_timed")s.value=String(r.min??15);else if(n==="set_heating_level")s.value=String(re(t.level)??r.min);else if(n==="set_brightness"){let c=re(d.brightness);s.value=String(c===null?r.min??0:Math.round(c/255*100))}else s.localName==="select"?s.value=d[At[n]]??s.options[0]?.value??"":s.value=String(re(d[At[n]])??r.min??0);s.localName==="select"&&s.selectedIndex===-1&&(s.selectedIndex=0),e.output&&q(e.output,s.value+"%")}canRequest(e,t){let n=this.pending.get(e);return!n||t==="stop"&&xi.has(n.id)}requestAction(e,t,n,s,o=!1){if(!this.canRequest(e.entity,t))return;let r=this.model(e),a=r.actions[t];if(!a)return;if(a.requiresCode)return this.moreInfo(e);if(!a.requiresConfirmation&&!o)return this.send(e,t,n);this.confirming={config:e,id:t,value:n,source:s};let d=this.nodes;q(d.confirmText,this.t("confirm_action").replace("{name}",r.name).replace("{action}",this.actionLabel(t))),d.confirm.open||d.confirm.showModal(),d.abort.focus({preventScroll:!0})}acceptAction(){let e=this.confirming;if(!(!e||!this.nodes.confirm.open))return this.nodes.confirm.close(),this.send(e.config,e.id,e.value,!0)}async send(e,t,n,s=!1){if(!this.canRequest(e.entity,t))return;let o=this.model(e);if(!o.actions[t])return;let r={id:t,value:n};this.pending.set(e.entity,r),this.announce(this.t("sending").replace("{name}",o.name)),this.update();try{let a=await this.controller.execute(e,t,n,{confirmed:s});if(this.pending.get(e.entity)!==r)return;let d=["confirmed","sent","unconfirmed"].includes(a?.status)?a.status:"sent";if(this.announce(this.t(d).replace("{name}",o.name)),a?.status==="confirmed"){for(let c of this.deviceViews)if(c.config.entity===e.entity)for(let m of c.fields)m.id===t&&(m.dirty=!1)}}catch{this.pending.get(e.entity)===r&&this.announce(this.t("send_error"))}finally{this.pending.get(e.entity)===r&&(this.pending.delete(e.entity),this.isConnected&&this.update())}}announce(e){if(!this.isConnected)return;clearTimeout(this.noticeTimer);let t=this.nodes;q(t.pageNotice,""),q(t.modalNotice,"");let n=t.modal.open?t.modalNotice:t.pageNotice;q(n,e),this.noticeTimer=setTimeout(()=>q(n,""),5200)}};customElements.get("bayit-dashboard")||(customElements.define("bayit-dashboard",Ge),window.customCards||=[],window.customCards.push({type:"bayit-dashboard",name:"Bayit 9",description:"A room-based Home Assistant dashboard.",preview:!1}));var Ai={en:{title:"Dashboard title",language:"Language",automatic:"Home Assistant language",areas:"Rooms",unassigned:"Include devices without a room",roomSelection:"Rooms on the dashboard",allRooms:"Automatic",selectedRooms:"Choose rooms and order",roomToAdd:"Available rooms",addRoom:"Show room",createRoom:"New dashboard-only room",newRoomName:"New room name",newRoomHint:"This room exists only on this dashboard.",roomName:"Room display name",roomToEdit:"Room to customize",roomIcon:"Room icon",defaultRoomIcon:"Default icon",newRoom:"Create room",customRoom:"Dashboard room",deleteRoom:"Delete dashboard room",noRooms:"No rooms to customize yet.",moveUp:"Move up",moveDown:"Move down",hideRoom:"Hide room",automaticDevices:"Automatic",manualDevices:"Choose devices and order",roomDevices:"Devices in this room",deviceToAdd:"Available devices",addDevice:"Add device",sections:"Room sections",sectionMode:"Section arrangement",automaticSections:"Automatic grouping",manualSections:"Arrange sections manually",automaticDevicesAndSections:"Automatic devices and sections",editSection:"Section to customize",addSection:"Add section",removeSection:"Delete section",sectionType:"Section type",sectionTitle:"Section heading",sectionDevice:"Room device",addToSection:"Move to this section",removeFromSection:"Remove from section",sectionEmpty:"No devices in this section.",noDevices:"No devices selected.",noMatches:"No matching devices",missing:"Unavailable",atLeastOneRoom:"Keep one room selected, or switch back to automatic.",discovery:"Automatic device selection",controls:"Controls only",allDevices:"All supported devices",appearance:"Appearance",background:"Wallpaper",layout:"Room titles",shape:"Button shape",classic:"Alongside the controls",header:"At the top",soft:"Rounded",circle:"Circle",square:"Square",devices:"Device visibility",hidden:"Hide devices",included:"Add other entities",overview:"Home overview",overviewDevices:"Devices and sensors to show",overviewHint:"Choose devices for the overview button, such as a lock, people, a calendar or an energy sensor.",shortcuts:"Room shortcuts",shortcutRoom:"Room",automaticShortcuts:"Choose shortcuts automatically",shortcut:"Shortcut",shortcutHint:"Pick up to six devices in display order. All devices remain available inside the room.",noShortcutRooms:"Add a device to a visible room to set its shortcuts.",profiles:"Boiler and heater controls",entity:"Heating device",kind:"Control profile",heater:"Room heater",boiler:"Water heater or boiler",displayName:"Display name",climate:"Air conditioner or thermostat",timerSource:"Timer source",serverTimer:"Home Assistant timer or script",simpleTimer:"Simple Timer",simpleTimerDevice:"Simple Timer sensor",simpleTimerTarget:"Device linked to Simple Timer",timerLinkError:"Choose a Simple Timer sensor linked to this heating device or its supported proxy.",dailyUsage:"Daily usage sensor",presets:"Preset minutes",presetError:"Use preset minutes within the selected range and step.",levelSteps:"Number of heating levels",levelRead:"Heating level feedback",start:"Scheduled start script",stop:"Stop script",timer:"Timer",none:"None",level:"Heating level entity",durationField:"Duration field",min:"Shortest run in minutes",max:"Longest run in minutes",step:"Step in minutes",add:"Add profile",save:"Save profile",edit:"Edit",remove:"Remove",clear:"Cancel",choose:"Select a device",invalid:"Select a heating device to save the profile.",hint:"Select the Home Assistant entities that already control this device. Use a server-side start script for timed heating.",units:"minutes",searchable:"Filter entities"},he:{title:"שם הדשבורד",language:"שפה",automatic:"שפת Home Assistant",areas:"חדרים",unassigned:"הצגת מכשירים ללא חדר",roomSelection:"חדרים בדשבורד",allRooms:"בחירה אוטומטית",selectedRooms:"בחירת חדרים וסדר",roomToAdd:"חדרים זמינים",addRoom:"הצגת חדר",createRoom:"חדר חדש לדשבורד",newRoomName:"שם החדר החדש",newRoomHint:"החדר יופיע בדשבורד הזה בלבד.",roomName:"שם החדר לתצוגה",roomToEdit:"חדר להתאמה אישית",roomIcon:"סמל החדר",defaultRoomIcon:"סמל ברירת המחדל",newRoom:"יצירת חדר",customRoom:"חדר בדשבורד",deleteRoom:"מחיקת חדר מהדשבורד",noRooms:"עדיין אין חדרים להתאמה.",moveUp:"העברה למעלה",moveDown:"העברה למטה",hideRoom:"הסתרת חדר",automaticDevices:"בחירה אוטומטית",manualDevices:"בחירת מכשירים וסדר",roomDevices:"מכשירים בחדר",deviceToAdd:"מכשירים זמינים",addDevice:"הוספת מכשיר",sections:"קבוצות בחדר",sectionMode:"סידור הקבוצות",automaticSections:"קיבוץ אוטומטי",manualSections:"סידור ידני של הקבוצות",automaticDevicesAndSections:"בחירה אוטומטית של מכשירים וקבוצות",editSection:"קבוצה לעריכה",addSection:"הוספת קבוצה",removeSection:"מחיקת קבוצה",sectionType:"סוג הקבוצה",sectionTitle:"כותרת הקבוצה",sectionDevice:"מכשיר בחדר",addToSection:"העברה לקבוצה זו",removeFromSection:"הסרה מהקבוצה",sectionEmpty:"אין מכשירים בקבוצה זו.",noDevices:"לא נבחרו מכשירים.",noMatches:"לא נמצאו מכשירים מתאימים",missing:"לא זמין",atLeastOneRoom:"השאירו חדר אחד לפחות, או חזרו לבחירה אוטומטית.",discovery:"בחירת מכשירים אוטומטית",controls:"מכשירים נשלטים בלבד",allDevices:"כל המכשירים הנתמכים",appearance:"מראה",background:"רקע",layout:"שמות חדרים",shape:"צורת כפתורים",classic:"לצד הכפתורים",header:"בראש הכרטיס",soft:"מעוגל",circle:"עיגול",square:"ריבוע",devices:"הצגת מכשירים",hidden:"הסתרת מכשירים",included:"הוספת ישויות נוספות",overview:"מבט על הבית",overviewDevices:"מכשירים וחיישנים לתצוגה",overviewHint:"בחרו מה יוצג במבט על הבית, למשל מנעול, אנשים, יומן או חיישן צריכת חשמל.",shortcuts:"קיצורים בחדרים",shortcutRoom:"חדר",automaticShortcuts:"בחירת קיצורים אוטומטית",shortcut:"קיצור",shortcutHint:"אפשר לבחור עד שישה מכשירים לפי סדר התצוגה. כל המכשירים נשארים זמינים בתוך החדר.",noShortcutRooms:"הוסיפו מכשיר לחדר שמוצג בדשבורד כדי לבחור קיצורים.",profiles:"שליטה בדוד ובתנורים",entity:"מכשיר חימום",kind:"סוג בקר",heater:"תנור חימום",boiler:"דוד או מחמם מים",displayName:"שם לתצוגה",climate:"מזגן או תרמוסטט",timerSource:"מקור הטיימר",serverTimer:"טיימר או סקריפט של Home Assistant",simpleTimer:"Simple Timer",simpleTimerDevice:"חיישן Simple Timer",simpleTimerTarget:"המכשיר שמקושר ל־Simple Timer",timerLinkError:"בחרו חיישן Simple Timer שמקושר למכשיר החימום הזה או לפקד שמפעיל אותו.",dailyUsage:"חיישן שימוש יומי",presets:"הגדרות דקות מהירות",presetError:"בחרו דקות בטווח ובמרווח שנקבעו.",levelSteps:"מספר דרגות החימום",levelRead:"משוב על דרגת החימום",start:"סקריפט הפעלה עם זמן",stop:"סקריפט כיבוי",timer:"טיימר",none:"ללא",level:"ישות עוצמת חימום",durationField:"שדה משך",min:"זמן מינימלי בדקות",max:"זמן מקסימלי בדקות",step:"מרווח בחירה בדקות",add:"הוספת בקר",save:"שמירת בקר",edit:"עריכה",remove:"הסרה",clear:"ביטול",choose:"בחירת מכשיר",invalid:"בחרו מכשיר חימום לפני השמירה.",hint:"בחרו את הישויות שכבר שולטות במכשיר ב־Home Assistant. לחימום מתוזמן, השתמשו בסקריפט שפועל בשרת.",units:"דקות",searchable:"סינון ישויות"}},Ci=["lights","covers","climate","heating","sensors","devices","garage","weather","security","media","vacuum","laundry"],Mt={"mdi:home-outline":{en:"Home",he:"בית"},"mdi:sofa-outline":{en:"Living room",he:"סלון"},"mdi:stove":{en:"Kitchen",he:"מטבח"},"mdi:bed-outline":{en:"Bedroom",he:"חדר שינה"},"mdi:shower":{en:"Bathroom",he:"מקלחת"},"mdi:desk":{en:"Office",he:"משרד"},"mdi:toy-brick-outline":{en:"Playroom",he:"חדר משחקים"},"mdi:washing-machine":{en:"Laundry",he:"כביסה"},"mdi:garage-variant":{en:"Garage",he:"חניה"},"mdi:tree-outline":{en:"Garden",he:"גינה"},"mdi:floor-plan":{en:"Hallway",he:"מסדרון"},"mdi:door-open":{en:"Entrance",he:"כניסה"}},Ei=":host { display: block; color: var(--primary-text-color); }form { display: grid; gap: 14px; padding-block: 8px; }label.field { display: grid; gap: 6px; min-width: 0; font-weight: 600; }input:not([type=checkbox]),select { width: 100%; box-sizing: border-box; min-height: 44px; border: 1px solid var(--divider-color,#999); border-radius: 8px; padding: 8px 10px; font: inherit; color: inherit; background: var(--card-background-color,#fff); }input[type=checkbox] { inline-size: 18px; block-size: 18px; flex: none; margin-inline: 0 9px; }input,select,button,summary { accent-color: var(--primary-color,#03a9f4); }select[multiple] { min-height: 106px; }label.check { min-block-size: 42px; display: flex; align-items: center; }details,fieldset { border: 1px solid var(--divider-color,#999); border-radius: 10px; padding: 8px 12px 12px; min-inline-size: 0; }summary { padding-block: 8px; min-block-size: 24px; font-weight: 650; cursor: pointer; }.stack { display: grid; gap: 12px; margin-block-start: 8px; }.grid { display: grid; gap: 10px; grid-template-columns: repeat(2,minmax(0,1fr)); }.actions,.record { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }.record { padding-block: 5px; border-block-end: 1px solid var(--divider-color,#999); }.record span { flex: 1; overflow-wrap: anywhere; }button { min-height: 42px; border-radius: 8px; border: 1px solid var(--primary-color,#0277bd); color: var(--primary-text-color); background: var(--card-background-color,#fff); cursor: pointer; padding: 6px 10px; font: inherit; }[hidden] { display: none !important; }p { margin: 0; color: var(--secondary-text-color); font-size: .95em; }.error { color: var(--error-color,#b00020); }:focus-visible { outline: 2px solid var(--primary-color,#03a9f4); outline-offset: 2px; }@media (max-width: 340px) { .grid { grid-template-columns: minmax(0,1fr); } }",Ni=`
.room-list { display: grid; margin: 0; padding: 0; list-style: none; }
.room-entry { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 6px; align-items: center; padding-block: 6px; border-block-end: 1px solid var(--divider-color,#999); }
.room-entry:last-child { border-block-end: 0; }
.room-entry-name { min-inline-size: 0; overflow-wrap: anywhere; }
.room-entry-name small { display: block; color: var(--secondary-text-color); font-size: .8em; margin-block-start: 2px; }
.room-entry-buttons { display: flex; gap: 4px; }
.room-entry-buttons button { min-inline-size: 44px; block-size: 44px; padding: 0 5px; }
.room-entry-buttons button:disabled, .room-add button:disabled { cursor: default; opacity: .45; }
.room-add { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 8px; align-items: end; }
.room-add button { min-block-size: 44px; }
.room-choice-heading { margin: 3px 0 0; font-size: 1em; }
.room-picker-hint { margin-block-start: -5px; }
.room-icon-field { display: grid; grid-template-columns: minmax(0,1fr) 44px; gap: 8px; align-items: end; }
.room-icon-preview { box-sizing: border-box; inline-size: 44px; block-size: 44px; display: grid; place-items: center; border: 1px solid var(--divider-color,#999); border-radius: 8px; }
.room-danger { justify-self: start; color: var(--error-color,#b00020); border-color: currentColor; }
@media (max-width: 340px) {
  .room-add { grid-template-columns: minmax(0,1fr); }
  .room-add button { justify-self: start; }
}
`;function Rt(i){for(let e in i??{})if(Object.hasOwn(i,e))return!0;return!1}function Se(i){return Array.isArray(i)?[...new Set(i.filter(e=>typeof e=="string"&&e.trim()))]:[]}function Ot(i,e,t){let n=[...i],s=e+t;return[n[e],n[s]]=[n[s],n[e]],n}function Ae(i,e,t,n,s=!1,o=""){return k("ul",{className:"room-list"},i.map((r,a)=>{let d=(c,m,g,p,h)=>{let u=K(c,h);return u.setAttribute("aria-label",m+" · "+r.name),u.title=m,u.disabled=g,u.dataset.roomFocus=o+":"+r.id+":"+p,u};return k("li",{className:"room-entry"},[k("span",{className:"room-entry-name"},[r.name,...r.secondary?[k("small",{textContent:r.secondary})]:[]]),k("span",{className:"room-entry-buttons"},[d("↑",t.moveUp,a===0,"up",()=>e(Ot(i,a,-1),o+":"+r.id+":up")),d("↓",t.moveDown,a===i.length-1,"down",()=>e(Ot(i,a,1),o+":"+r.id+":down")),d("×",n,s&&i.length===1,"remove",()=>e(i.filter(c=>c.id!==r.id)))])])}))}function $e(i,e,t,n,s){let o=I([["",n],...e],""),r=K(t,()=>{o.value&&s(o.value)});return r.disabled=!0,o.addEventListener("change",()=>{r.disabled=!o.value}),{input:o,action:r,wrapper:k("div",{className:"room-add"},[O(i,o),r])}}function Ti(i,e){let t=i.entities?.[e],n=i.devices?.[t?.device_id??t?.di];return t?.area_id??t?.ai??n?.area_id??n?.ai}function k(i,e={},t=[]){let n=Object.assign(document.createElement(i),e);return n.append(...t),n}function Lt(i,e,t){let n=k("input",{type:"checkbox",checked:e});return n.addEventListener("change",()=>t(n.checked)),k("label",{className:"check"},[n,i])}function ce(i,e){return k("option",{value:i,textContent:e})}function I(i,e){let t=k("select",{},i.map(([n,s])=>ce(n,s)));return t.value=e,t}var Mi=0;function O(i,e){let t=k("span",{id:"bayit9-editor-label-"+ ++Mi,textContent:i});return e.setAttribute("aria-labelledby",t.id),k("label",{className:"field"},[t,e])}function K(i,e){let t=k("button",{type:"button",textContent:i});return t.addEventListener("click",e),t}function Ye(i,e){return Object.entries(i.states??{}).filter(([t])=>!e||e.has(t.split(".")[0])).map(([t,n])=>{let s=n.attributes?.friendly_name;return[t,s&&s!==t?s+" · "+t:t]}).sort((t,n)=>t[1].localeCompare(n[1]))}function ee(i,e,t,n){let s=k("summary",{textContent:i}),o=k("details",{open:e},[s,...n]);return s.addEventListener("click",()=>t(!o.open)),o.addEventListener("toggle",()=>{o.isConnected&&t(o.open)}),o}var Ce=class extends HTMLElement{#t={};#e={type:"custom:"+G};#i={};#s;#f;#l;#d;#a="";#m="";#c=!1;#u;constructor(){super(),this.attachShadow({mode:"open"})}set hass(e){let t=this.#t;this.#t=e??{},(t.areas!==this.#t.areas||t.entities!==this.#t.entities||t.devices!==this.#t.devices||!Rt(t.states)&&Rt(this.#t.states)||(t.locale?.language??t.language)!==(e?.locale?.language??e?.language))&&this.render()}setConfig(e){this.#e={type:"custom:"+G,...e};let t=JSON.stringify(this.#e);t!==this.#u&&(this.#u=t,this.render())}connectedCallback(){this.render()}#n(e){this.#e={...this.#e,...e},this.#u=JSON.stringify(this.#e),this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:this.#e},bubbles:!0,composed:!0}))}#o(e,t){if(this.#n(e),this.render(),!t)return;let n=[...this.shadowRoot.querySelectorAll("[data-room-focus]")];(n.find(o=>o.dataset.roomFocus===t&&!o.disabled)??n.find(o=>!o.disabled&&o.dataset.roomFocus===t.replace(/:(up|down)$/,(r,a)=>a==="up"?":down":":up")))?.focus({preventScroll:!0})}#g(e){let t=this.#e.room_overrides??{};return Object.hasOwn(t,e)&&t[e]&&typeof t[e]=="object"?t[e]:{}}#r(e,t,n){let s={...this.#e.room_overrides};Object.keys(t).length?s[e]=t:delete s[e],this.#o({room_overrides:s},n)}#v(e,t,n,s){let o=[["",n.defaultRoomIcon],...Object.entries(Mt).map(([c,m])=>[c,m[s]])],r=typeof t.icon=="string"?t.icon:"";r&&!Object.hasOwn(Mt,r)&&o.push([r,r]);let a=I(o,r);a.dataset.roomFocus="room-icon",a.addEventListener("change",()=>{let c={...t};a.value?c.icon=a.value:delete c.icon,this.#r(e.id,c,"room-icon")});let d=k("ha-icon");return d.setAttribute("icon",e.icon||"mdi:home-outline"),d.setAttribute("aria-hidden","true"),k("div",{className:"room-icon-field"},[O(n.roomIcon,a),k("span",{className:"room-icon-preview"},[d])])}#b(e,t){return se({...this.#e,area_ids:[e.id]},this.#t,t).find(n=>n.id===e.id)}#p(e,t,n,s){return Array.isArray(t.entities)?Se(t.entities):n?.length?Se(n.flatMap(o=>o.entities)):this.#b(e,s)?.entities.map(o=>o.entity)??[]}#y(e,t,n,s){let o=_e(t.sections),r=I([["auto",n.automaticSections],["manual",n.manualSections]],o?"manual":"auto");r.dataset.roomFocus="room-section-mode";let a=[O(n.sectionMode,r)];r.addEventListener("change",()=>{let v={...t};r.value==="auto"?(o?.length&&!Array.isArray(t.entities)&&(v.entities=this.#p(e,t,o,s)),delete v.sections):v.sections=[],this.#r(e.id,v,"room-section-mode")});let d=()=>ee(n.sections,this.#i.sections,v=>{this.#i.sections=v},[k("div",{className:"stack"},a)]);if(!o)return d();let c=this.#p(e,t,o,s),m=(v,T)=>this.#r(e.id,{...t,entities:c,sections:v},T),g=le[s],p=v=>g["room_"+v],h=v=>v.title||p(v.kind),u=o.map(v=>({id:v.id,name:h(v),secondary:v.title?p(v.kind):""})),b=new Map(o.map(v=>[v.id,v]));o.length&&a.push(Ae(u,(v,T)=>m(v.map(L=>b.get(L.id)),T),n,n.removeSection,!1,"sections"));let y=K(n.addSection,()=>{let v=1;for(;b.has("section-"+v);)v++;let T="section-"+v;this.#d={roomId:e.id,id:T},m([...o,{id:T,kind:"devices",entities:[]}],"room-section-title")});y.dataset.roomFocus="room-section-add",a.push(k("div",{className:"actions"},[y]));let w=this.#d?.roomId===e.id&&b.get(this.#d.id)||o[0];if(!w)return d();let _=I(u.map(v=>[v.id,v.name]),w.id);_.dataset.roomFocus="room-section-edit",_.addEventListener("change",()=>{this.#d={roomId:e.id,id:_.value},this.render(),this.shadowRoot.querySelector('[data-room-focus="room-section-edit"]')?.focus({preventScroll:!0})});let C=(v,T)=>m(o.map(L=>L.id===w.id?v:L),T),A=I(Ci.map(v=>[v,p(v)]),w.kind);A.dataset.roomFocus="room-section-kind",A.addEventListener("change",()=>C({...w,kind:A.value},"room-section-kind"));let l=k("input",{value:w.title??"",placeholder:p(w.kind),maxLength:80});l.dataset.roomFocus="room-section-title";let f=()=>{let v=l.value.trim();if(v===(w.title??""))return;let T={...w};v?T.title=v:delete T.title,C(T,"room-section-title")};l.addEventListener("change",f),l.addEventListener("keydown",v=>{v.key!=="Enter"||v.isComposing||(v.preventDefault(),f())}),a.push(O(n.editSection,_),O(n.sectionType,A),O(n.sectionTitle,l));let x=v=>this.#t.states?.[v]?.attributes?.friendly_name||v,S=w.entities.map(v=>({id:v,name:x(v)}));a.push(S.length?Ae(S,(v,T)=>C({...w,entities:v.map(L=>L.id)},T),n,n.removeFromSection,!1,"section-devices"):k("p",{textContent:n.sectionEmpty}));let E=new Set(w.entities),N=c.filter(v=>!E.has(v));if(N.length){let v=$e(n.sectionDevice,N.map(T=>[T,x(T)]),n.addToSection,n.choose,T=>{m(o.map(L=>L.id===w.id?{...L,entities:[...L.entities,T]}:{...L,entities:L.entities.filter(j=>j!==T)}),"room-section-device")});v.input.dataset.roomFocus="room-section-device",a.push(v.wrapper)}return d()}#_(e,t,n,s){let o=this.#g(e.id),r=_e(o.sections),a=e.custom||Array.isArray(o.entities)||!!r?.length,d=I([["auto",r?.length?t.automaticDevicesAndSections:t.automaticDevices],["manual",t.manualDevices]],a?"manual":"auto");d.dataset.roomFocus="room-device-mode",d.addEventListener("change",()=>{let l={...o};d.value==="auto"?(delete l.entities,delete l.sections):l.entities=this.#p(e,o,r,n),this.#r(e.id,l,"room-device-mode")});let c=e.custom?[k("h4",{className:"room-choice-heading",textContent:t.roomDevices})]:[O(t.roomDevices,d)];if(!a)return c;let m=new Map(s.map(l=>[l.id,l.name])),g=new Map(lt(this.#e,this.#t).map(l=>[l.entity,l])),p=this.#p(e,o,r,n),h=p.map(l=>{let f=g.get(l),x=this.#t.states?.[l]?.attributes?.friendly_name;return{id:l,name:f?.name||x||l,secondary:f?"":t.missing}}),u=(l,f)=>{let x=l.map(E=>E.id),S={...o,entities:x};if(r&&x.length<p.length){let E=new Set(x),N=new Set(p.filter(v=>!E.has(v)));S.sections=r.map(v=>({...v,entities:v.entities.filter(T=>!N.has(T))}))}this.#r(e.id,S,f)};c.push(h.length?Ae(h,u,t,t.remove,!1,"devices"):k("p",{textContent:t.noDevices}));let b=new Set(p),y=[...g.values()].filter(l=>!b.has(l.entity)).map(l=>({id:l.entity,name:l.name||l.entity,area:Ti(this.#t,l.entity)}));y.sort((l,f)=>+(f.area===e.id)-+(l.area===e.id)||l.name.localeCompare(f.name,n));let w=new Map;for(let l of y)w.set(l.name,(w.get(l.name)??0)+1);let _=$e(t.deviceToAdd,[],t.addDevice,t.choose,l=>{this.#r(e.id,{...o,entities:[...p,l]},"room-device-picker")});_.input.dataset.roomFocus="room-device-picker";let C=k("input",{type:"search",placeholder:t.searchable,value:this.#a});C.dataset.roomFocus="room-device-search";let A=()=>{let l=C.value.trim().toLocaleLowerCase(n),f=y.filter(x=>{let S=m.get(x.area)??"";return(x.name+" "+S+" "+x.id).toLocaleLowerCase(n).includes(l)});_.input.replaceChildren(ce("",f.length?t.choose:t.noMatches),...f.map(x=>{let S=x.name,E=x.area!==e.id&&m.get(x.area),N=w.get(S)>1?[E,x.id].filter(Boolean).join(" · "):E;return ce(x.id,N?S+" · "+N:S)})),_.input.disabled=!f.length,_.action.disabled=!0};return C.addEventListener("input",()=>{this.#a=C.value,A()}),A(),c.push(O(t.searchable,C),_.wrapper),c}#x(e,t,n){let s=k("input",{maxLength:80,value:this.#m});s.dataset.roomFocus="new-room-name";let o=K(n.newRoom,()=>{let r=s.value.trim();if(!r)return;let a=new Set([...e.map(g=>g.id),...Se(this.#e.area_ids),...Object.keys(this.#e.room_overrides??{})]),d=1;for(;a.has(Le+d);)d++;let c=Le+d,m={room_overrides:{...this.#e.room_overrides,[c]:{name:r,entities:[]}}};(t.length||this.#c)&&(m.area_ids=[...t,c]),this.#c=!1,this.#m="",this.#i.newRoom=!1,this.#l=c,this.#a="",this.#o(m,"room-edit")});return o.disabled=!this.#m.trim(),s.addEventListener("input",()=>{this.#m=s.value,o.disabled=!s.value.trim()}),s.addEventListener("keydown",r=>{r.key==="Enter"&&!r.isComposing&&(r.preventDefault(),o.disabled||o.click())}),ee(n.createRoom,this.#i.newRoom,r=>{this.#i.newRoom=r},[k("div",{className:"stack"},[k("p",{textContent:n.newRoomHint}),k("div",{className:"room-add"},[O(n.newRoomName,s),o])])])}#w(e,t){let n=ct(this.#e,this.#t).sort((h,u)=>h.name.localeCompare(u.name,t)),s=new Map(n.map(h=>[h.id,h])),o=Se(this.#e.area_ids),r=o.length>0||this.#c,a=I([["auto",e.allRooms],["custom",e.selectedRooms]],r?"custom":"auto");a.dataset.roomFocus="room-mode",a.addEventListener("change",()=>{if(a.value==="auto"){this.#c=!1,this.#o({area_ids:[]},"room-mode");return}let h=se(this.#e,this.#t,t).map(u=>u.id).filter(u=>s.has(u));h.length?this.#o({area_ids:h},"room-mode"):(this.#c=!0,this.render(),this.shadowRoot.querySelector('[data-room-focus="room-mode"]')?.focus({preventScroll:!0}))});let d=I([["all",e.allDevices],["controls",e.controls]],this.#e.discovery_mode==="controls"?"controls":"all");d.dataset.roomFocus="room-discovery",d.addEventListener("change",()=>this.#o({discovery_mode:d.value},"room-discovery"));let c=Lt(e.unassigned,this.#e.show_unassigned!==!1,h=>this.#o({show_unassigned:h},"room-unassigned"));c.firstElementChild.dataset.roomFocus="room-unassigned";let m=[O(e.roomSelection,a),O(e.discovery,d),c];if(r){let h=o.map(y=>({id:y,name:s.get(y)?.name??y,secondary:s.get(y)?.custom?e.customRoom:s.has(y)?"":e.missing}));h.length&&m.push(Ae(h,(y,w)=>this.#o({area_ids:y.map(_=>_.id)},w),e,e.hideRoom,!0,"rooms")),h.length<=1&&m.push(k("p",{className:"room-picker-hint",textContent:e.atLeastOneRoom}));let u=new Set(o),b=n.filter(y=>!u.has(y.id));if(b.length){let y=$e(e.roomToAdd,b.map(w=>[w.id,w.name]),e.addRoom,e.none,w=>{this.#c=!1,this.#l=w,this.#a="",this.#o({area_ids:[...o,w]},"room-edit")});m.push(y.wrapper)}}let g=r?o.map(h=>s.get(h)).filter(Boolean):n,p=g.find(h=>h.id===this.#l)??g[0];if(p){let h=I(g.map(_=>[_.id,_.name]),p.id);h.dataset.roomFocus="room-edit",h.addEventListener("change",()=>{this.#l=h.value,this.#a="",this.render(),this.shadowRoot.querySelector('[data-room-focus="room-edit"]')?.focus({preventScroll:!0})});let u=this.#g(p.id),b=k("input",{value:u.name??"",maxLength:80,placeholder:p.name,required:!!p.custom});b.dataset.roomFocus="room-name";let y=()=>{let _=b.value.trim();if(!_&&p.custom){b.value=u.name??p.name;return}if(_===(u.name??""))return;let C={...u};_?C.name=_:delete C.name,this.#r(p.id,C,"room-name")};b.addEventListener("change",y),b.addEventListener("keydown",_=>{_.key==="Enter"&&!_.isComposing&&(_.preventDefault(),y())});let w=[O(e.roomToEdit,h),O(e.roomName,b),this.#v(p,u,e,t),...this.#_(p,e,t,n),this.#y(p,u,e,t)];if(p.custom){let _=K(e.deleteRoom,()=>{let C={...this.#e.room_overrides};delete C[p.id];let A={...this.#e.room_shortcuts};delete A[p.id],this.#l=void 0,this.#a="",this.#o({room_overrides:C,area_ids:o.filter(l=>l!==p.id),room_shortcuts:A},"room-mode")});_.className="room-danger",w.push(_)}m.push(...w)}else m.push(k("p",{textContent:e.noRooms}));return m.push(this.#x(n,o,e)),[k("div",{className:"stack"},m)]}#h(e,t,n,s=Ye(this.#t)){let o=k("input",{type:"search",placeholder:n.searchable}),r=k("select",{multiple:!0,size:4});o.setAttribute("aria-label",n.searchable+" · "+e);let a=()=>{let d=o.value.trim().toLocaleLowerCase(),c=new Set(this.#e[t]??[]);r.replaceChildren(...s.filter(m=>c.has(m[0])||!d||m[1].toLocaleLowerCase().includes(d)).map(([m,g])=>k("option",{value:m,textContent:g,selected:c.has(m)})))};return o.addEventListener("input",a),r.addEventListener("change",()=>this.#n({[t]:[...r.selectedOptions].map(d=>d.value)})),a(),k("div",{className:"stack"},[o,O(e,r)])}#k(e,t){let n=se(this.#e,this.#t,t);if(!n.length)return[k("p",{textContent:e.noShortcutRooms})];let s=n.find(u=>u.id===this.#f)??n[0],o=this.#e.room_shortcuts??{},r=Object.hasOwn(o,s.id)&&Array.isArray(o[s.id])?o[s.id]:null,a=I(n.map(u=>[u.id,u.name]),s.id),d=new Map(s.entities.map(u=>[u.entity,u.name||u.entity]));for(let u of r??[])typeof u=="string"&&!d.has(u)&&d.set(u,u);let c=Array.from({length:oe},(u,b)=>{let y=r?.[b]??"";return I([["",e.none],...d],y)}),m=k("div",{className:"grid",hidden:r==null},c.map((u,b)=>O(e.shortcut+" "+(b+1),u))),g=()=>{let u=new Set(c.map(b=>b.value).filter(Boolean));for(let b of c)for(let y of b.options)y.disabled=y.value!==b.value&&u.has(y.value)},p=()=>{this.#n({room_shortcuts:{...this.#e.room_shortcuts,[s.id]:c.map(u=>u.value).filter(Boolean)}})};g();for(let u of c)u.addEventListener("change",()=>{g(),p()});a.addEventListener("change",()=>{this.#f=a.value,this.render()});let h=Lt(e.automaticShortcuts,r==null,u=>{if(m.hidden=u,u){let b={...this.#e.room_shortcuts};delete b[s.id],this.#n({room_shortcuts:b})}else p()});return[k("p",{textContent:e.shortcutHint}),O(e.shortcutRoom,a),h,m]}#S(e){let t=Array.isArray(this.#e.profiles)?this.#e.profiles:[],n=[k("p",{textContent:e.hint})];for(let M of t)M?.entity&&n.push(k("div",{className:"record"},[k("span",{textContent:M.name||this.#t.states?.[M.entity]?.attributes?.friendly_name||M.entity}),K(e.edit,()=>{this.#s=M,this.render()}),K(e.remove,()=>{this.#s?.entity===M.entity&&(this.#s=void 0),this.#n({profiles:t.filter(D=>D.entity!==M.entity)}),this.render()})]));if(this.#s==null)return n.push(k("div",{className:"actions"},[K(e.add,()=>{this.#s={},this.render()})])),n;let s=this.#s,o=s.timed??{},r=I([["",e.choose],...Ye(this.#t,new Set(ze))],s.entity||"");s.entity&&!r.value&&(r.append(ce(s.entity,s.entity)),r.value=s.entity);let a=I([["heater",e.heater],["boiler",e.boiler],["climate",e.climate]],s.kind||"heater"),d=k("input",{value:s.name??"",maxLength:80}),c=(M,D,$=()=>!0)=>{let V=Ye(this.#t,new Set([M])).filter(([F])=>$(F));return D&&!V.some(([F])=>F===D)&&V.unshift([D,D]),I([["",e.none],...V],D||"")},m=c("number",s.level_entity),g=k("input",{type:"number",min:"2",max:"12",value:String(s.level_steps??"")}),p=c("input_number",s.level_read_entity),h=k("div",{className:"grid"},[O(e.levelSteps,g),O(e.levelRead,p)]),u=I([["server",e.serverTimer],["simple",e.simpleTimer]],o.simple_timer_entity?"simple":"server"),b=c("script",o.start_script),y=c("script",o.stop_script),w=c("timer",o.timer_entity),_=k("input",{value:o.duration_field||"duration",maxLength:40}),C=k("div",{className:"stack"},[O(e.start,b),O(e.stop,y),O(e.timer,w),O(e.durationField,_)]),A=M=>this.#t.states?.[M]?.attributes,l=c("sensor",o.simple_timer_entity,M=>{let D=A(M);return typeof D?.switch_entity_id=="string"&&typeof D.timer_state=="string"}),f=I([["",e.none]],""),x=O(e.simpleTimerTarget,f),S=k("div",{className:"stack"},[O(e.simpleTimerDevice,l),x]),E=c("sensor",o.daily_usage_entity),N=k("input",{value:Array.isArray(o.presets)?o.presets.join(", "):"",placeholder:"15, 30, 45",maxLength:50}),v=M=>k("input",{type:"number",min:"1",max:"360",value:String(M)}),T=v(o.min_minutes??15),L=v(o.max_minutes??60),j=v(o.step_minutes??15),P=k("p",{className:"error",hidden:!0,textContent:e.invalid});P.setAttribute("role","alert");let W=()=>{let M=r.value.split(".")[0];a.querySelector('[value="climate"]').disabled=M!=="climate",M!=="climate"&&a.value==="climate"&&(a.value="heater");let D=M==="fan"&&a.value==="heater";h.hidden=!D||!!m.value;let $=u.value==="simple";C.hidden=$,S.hidden=!$;let V=a.value==="climate"&&M==="climate"?"input_boolean.":D?"switch.":"",F=A(l.value)?.switch_entity_id??(l.value===o.simple_timer_entity?o.simple_timer_target:void 0),fe=V&&typeof F=="string"&&F.startsWith(V)&&F!==r.value,qt=fe?this.#t.states?.[F]?.attributes?.friendly_name||F:"";f.replaceChildren(ce("",e.none),...fe?[ce(F,qt)]:[]),x.hidden=!fe,fe&&(f.value=F)};r.addEventListener("change",()=>{r.value.split(".")[0]==="climate"&&r.value!==s.entity&&(a.value="climate"),W()});for(let M of[a,m,u,l])M.addEventListener("change",W);return W(),n.push(O(e.entity,r),O(e.kind,a),O(e.displayName,d),O(e.level,m),h,O(e.timerSource,u),C,S,O(e.dailyUsage,E),O(e.presets,N),k("div",{className:"grid"},[O(e.min,T),O(e.max,L),O(e.step,j)]),P,k("div",{className:"actions"},[K(e.save,()=>{let M=u.value==="simple",D=A(l.value)?.switch_entity_id;if(M&&!l.value||M&&D&&D!==(f.value||r.value)){P.textContent=e.timerLinkError,P.hidden=!1,l.focus();return}let $=N.value.trim()?N.value.trim().split(/[,;\s]+/).map(Number):Array.isArray(o.presets)?[]:void 0,V=Pe({entity:r.value,kind:a.value,name:d.value,level_entity:m.value,level_steps:g.valueAsNumber,level_read_entity:p.value,timed:{...M?{simple_timer_entity:l.value,simple_timer_target:f.value}:{start_script:b.value,stop_script:y.value,timer_entity:w.value},daily_usage_entity:E.value,presets:$,duration_field:_.value,min_minutes:T.valueAsNumber,max_minutes:L.valueAsNumber,step_minutes:j.valueAsNumber}});if(!V){P.textContent=e.invalid,P.hidden=!1,r.focus();return}if($?.length&&V.timed?.presets?.length!==new Set($).size){P.textContent=e.presetError,P.hidden=!1,N.focus();return}this.#s=void 0,this.#n({profiles:[...t.filter(F=>F.entity!==s.entity&&F.entity!==V.entity),V]}),this.render()}),K(e.clear,()=>{this.#s=void 0,this.render()})])),n}render(){if(!this.isConnected)return;let e=ye(this.#e.locale,this.#t),t=Ai[e],n=k("input",{value:this.#e.title??"",maxLength:80});n.addEventListener("change",()=>this.#n({title:n.value.trim()}));let s=I([["auto",t.automatic],["en","English"],["he","עברית"]],this.#e.locale??"auto");s.addEventListener("change",()=>{this.#n({locale:s.value}),this.render()});let o=(c,m,g,p)=>{let h=I(g,this.#e[m]??p);return h.addEventListener("change",()=>this.#n({[m]:h.value})),O(c,h)},r=Object.entries(De).map(([c,m])=>[c,m[e]]),a=se(this.#e,this.#t,e).flatMap(c=>c.entities.map(m=>[m.entity,(m.name||m.entity)+" · "+c.name])),d=k("form",{dir:e==="he"?"rtl":"ltr"},[O(t.title,n),O(t.language,s),ee(t.areas,this.#i.rooms,c=>{this.#i.rooms=c},this.#w(t,e)),ee(t.appearance,this.#i.appearance,c=>{this.#i.appearance=c},[k("div",{className:"stack"},[o(t.background,"background",r,"aurora"),o(t.layout,"layout",[["classic",t.classic],["header",t.header]],"classic"),o(t.shape,"shape",[["soft",t.soft],["circle",t.circle],["square",t.square]],"soft")])]),ee(t.devices,this.#i.devices,c=>{this.#i.devices=c},[this.#h(t.hidden,"hidden_entities",t),this.#h(t.included,"included_entities",t)]),ee(t.overview,this.#i.overview,c=>{this.#i.overview=c},[k("p",{textContent:t.overviewHint}),this.#h(t.overviewDevices,"overview_entities",t,a)]),ee(t.shortcuts,this.#i.shortcuts,c=>{this.#i.shortcuts=c},[k("div",{className:"stack"},this.#k(t,e))]),ee(t.profiles,this.#i.profiles,c=>{this.#i.profiles=c},[k("div",{className:"stack"},this.#S(t))])]);d.addEventListener("submit",c=>c.preventDefault()),this.shadowRoot.replaceChildren(k("style",{textContent:Ei+Ni}),d)}};var Dt="ll-strategy-dashboard-"+G,Ke="bayit-9-strategy-editor",We=class extends HTMLElement{static registryDependencies=["areas","devices","entities"];static generate(e,t){return pt(e,t)}static getCreateSuggestions(e){return mt(e)}static getConfigElement(){return document.createElement(Ke)}};function zt(){customElements.get(Dt)||customElements.define(Dt,We),customElements.get(Ke)||customElements.define(Ke,Ce),window.customStrategies??=[],window.customStrategies.some(i=>i.type===G&&i.strategyType==="dashboard")||window.customStrategies.push({type:G,strategyType:"dashboard",name:"Bayit 9",description:"A room-based Liquid Glass dashboard for Home Assistant.",documentationURL:"https://github.com/yahavzarfati/bayit-9"})}zt();
