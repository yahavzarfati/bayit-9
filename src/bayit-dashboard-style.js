export const styles = `
  :host {
    display: block;
    container-type: inline-size;
    color: #f6fbff;
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
    --ink: #f6fbff;
    --secondary: #d0dfe7;
    --line: rgba(238,250,255,.25);
    --soft-line: rgba(238,250,255,.16);
    --glass: rgba(233,247,255,.037);
    --toolbar-glass: rgba(12,28,34,.16);
    --toolbar-control: rgba(230,250,252,.096);
    --shortcut-fill: rgba(229,248,255,.035);
    --chip-fill: rgba(15,31,39,.12);
    --quiet-icon: #c2ced5;
    --surface: rgba(16,37,49,.78);
    --control: rgba(229,248,255,.11);
    --warm: #ffdf92;
    --moving: #9edcff;
    --critical: #ffc7c5;
    --control-radius: 16px;
    --base-radius: 27px;
    --wallpaper: radial-gradient(ellipse at 87% 7%, #2b665e 0, transparent 52%),
      radial-gradient(ellipse at 76% 90%, #392c57 0, transparent 56%),
      linear-gradient(129deg,#112532 15%,#20414c 60%,#211e39);
    position: relative;
    overflow: clip;
    isolation: isolate;
    padding: clamp(11px, 3.5vw, 24px);
    min-width: 0;
    min-height: 224px;
    color: var(--ink);
    border-radius: var(--base-radius);
    background: var(--wallpaper);
    border: 1px solid var(--soft-line);
  }
  .shell[data-background=lagoon] {
    --wallpaper: radial-gradient(ellipse at 98% 28%, #335c79 0, transparent 45%),
      radial-gradient(ellipse at 20% 72%, #11635d 0, transparent 58%),
      linear-gradient(138deg,#111e36 12%,#174152 75%,#142533);
    --surface: rgba(16,41,63,.77);
  }
  .shell[data-background=dunes] {
    --wallpaper: radial-gradient(ellipse at 86% 18%, #84543d 0, transparent 52%),
      radial-gradient(ellipse at 15% 85%, #59374a 0, transparent 55%),
      linear-gradient(146deg,#321f29 11%,#4c3334 66%,#241d32);
    --surface: rgba(50,31,37,.8);
  }
  .shell[data-background=graphite] {
    --wallpaper: radial-gradient(ellipse at 90% 16%, #464c52 0, transparent 50%),
      radial-gradient(ellipse at 20% 96%, #293c46 0, transparent 60%),
      linear-gradient(150deg,#1c2227,#16191d 78%);
    --surface: rgba(30,35,39,.86);
  }
  .shell[data-shape=circle] { --control-radius: 999px; }
  .shell[data-shape=square] { --control-radius: 9px; }
  .toolbar {
    position: sticky;
    z-index: 2;
    inset-block-start: 0;
    padding-block: 3px 9px;
    border-radius: 16px;
    background: var(--toolbar-glass);
    -webkit-backdrop-filter: blur(6px) saturate(112%);
    backdrop-filter: blur(6px) saturate(112%);
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
    background: var(--toolbar-control);
    border-color: var(--line);
  }
  .chrome-button ha-icon { width: 22px; height: 22px; --mdc-icon-size: 22px; }
  .chrome-button:where(:hover,[aria-expanded=true]), .round-action:hover, .quick-button:hover {
    background: rgba(240,251,255,.18);
    color: var(--ink);
  }
  .chrome-button:active, .round-action:active, .quick-button:active { transform: scale(.96); }
  .badge {
    position: absolute;
    inset-block-end: -2px;
    inset-inline-end: -2px;
    min-width: 18px;
    min-height: 18px;
    padding: 0 4px;
    line-height: 16px;
    border-radius: 999px;
    background: var(--surface);
    color: var(--warm);
    border: 1px solid var(--line);
    font-size: 10px;
    text-align: center;
    font-weight: 800;
  }
  .rooms { display: grid; direction: ltr; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 8px; }
  .room {
    --shortcut-width: 44px;
    --shortcut-height: 32px;
    --shortcut-gap: 3px;
    display: grid;
    direction: ltr;
    grid-template-areas: "status status" "title quick";
    grid-template-columns: minmax(0,1fr) auto;
    grid-template-rows: 17px minmax(0,1fr);
    gap: 3px;
    min-width: 0;
    min-height: 134px;
    padding: 6px;
    border-radius: 19px;
    border: 1px solid var(--line);
    background: linear-gradient(154deg,rgba(254,255,255,.085),transparent 66%),var(--glass);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.12),0 2px 4px rgba(13,21,25,.08);
    -webkit-backdrop-filter: blur(8px) saturate(112%);
    backdrop-filter: blur(8px) saturate(112%);
  }
  .room[data-current] { outline: 2px solid var(--warm); outline-offset: -3px; }
  .shell[data-layout=header] .room {
    grid-template-areas: "title" "status" "quick";
    grid-template-columns: minmax(0,1fr);
    grid-template-rows: auto 20px minmax(0,1fr);
  }
  .room-title {
    grid-area: title;
    display: grid;
    grid-template-areas: "label label" "icon count";
    grid-template-columns: 24px minmax(0,1fr);
    grid-template-rows: auto 25px;
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
    font-weight: 740;
  }
  .room-title > ha-icon:first-child {
    grid-area: icon;
    width: 24px;
    height: 24px;
    --mdc-icon-size: 24px;
  }
  .room-title > :is(.room-name,span:first-of-type:not(.room-count)) {
    grid-area: label;
    min-width: 0;
    overflow-wrap: anywhere;
    text-align: left;
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
    background: var(--chip-fill);
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
    align-self: end;
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
    background: var(--shortcut-fill);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.055);
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
    position: fixed;
    inset: max(54px,9dvh) 0 auto;
    width: min(550px,calc(100% - 24px));
    max-width: none;
    max-height: calc(100dvh - max(54px,9dvh) - 16px);
    margin: 0 auto;
    padding: 0;
    color: var(--ink);
    border: 1px solid var(--line);
    border-radius: 23px;
    background: var(--surface);
    -webkit-backdrop-filter: blur(19px) saturate(121%);
    backdrop-filter: blur(19px) saturate(121%);
    box-shadow: 0 14px 45px rgba(8,15,25,.25),inset 0 1px 0 rgba(255,255,255,.18);
    overflow: hidden;
    overscroll-behavior: contain;
    transform-origin: var(--motion-x,50%) var(--motion-y,34%);
  }
  .modal[open] { display: grid; grid-template-rows: auto minmax(0,1fr); animation: appear .2s ease-out; }
  .modal::backdrop { background: rgba(8,16,24,.13); -webkit-backdrop-filter: blur(3px); backdrop-filter: blur(3px); }
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 13px 10px;
    border-bottom: 1px solid var(--soft-line);
    gap: 8px;
  }
  .modal-header h2 {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 18px;
    line-height: 1.18;
    margin: 0;
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .modal-body { min-height: 0; padding: 12px; overflow-y: auto; overscroll-behavior: contain; }
  @keyframes appear { from { opacity: 0; transform: translateY(7px) scale(.975); } }
  .devices, .settings { display: grid; gap: 10px; }
  .device-group { display: grid; gap: 7px; min-width: 0; }
  .device-group-title {
    margin: 1px 2px 0;
    color: var(--secondary);
    font-size: 12px;
    font-weight: 740;
  }
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
    background: rgba(242,252,255,.045);
    border-radius: 16px;
  }
  .device-head { display: grid; grid-template-columns: 32px minmax(0,1fr) 44px; align-items: center; gap: 8px; }
  .device-icon { color: var(--secondary); place-self: center; }
  .device-name { margin: 0; font-size: 14px; line-height: 1.2; overflow-wrap: anywhere; }
  .current { display: block; margin-block-start: 3px; color: var(--secondary); font-weight: 680; font-size: 12px; }
  .device-detail { min-width: 0; white-space: normal; }
  .action-list, .basic-actions { display: grid; gap: 7px; }
  .action-list:empty { display: none; }
  .action-list { margin-block-start: 8px; }
  .basic-actions { grid-template-columns: repeat(auto-fit,minmax(min(80px,100%),1fr)); }
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
  .control-button:hover { background: rgba(240,251,255,.16); }
  .control-button[data-action=unlock] { color: var(--critical); }
  .field-row { display: grid; grid-template-columns: minmax(0,1fr) minmax(60px,auto); gap: 7px; align-items: end; }
  .field-row label { display: grid; gap: 4px; color: var(--secondary); font-size: 12px; font-weight: 700; }
  .field-row input, .field-row select {
    min-width: 0;
    width: 100%;
    min-height: 44px;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: rgba(8,22,33,.22);
    color: var(--ink);
    padding: 4px 8px;
    font-size: 16px;
    accent-color: var(--warm);
  }
  .field-row input[type=range] { direction: ltr; border: 0; background: transparent; padding: 0; }
  .field-row select option { background: #233340; color: #fff; }
  .duration-label { color: var(--secondary); background: none; font-size: 12px; }
  .prefs-group { border: 1px solid var(--soft-line); border-radius: 14px; min-width: 0; margin: 0; padding: 8px; }
  .prefs-group legend { padding-inline: 5px; font-size: 13px; font-weight: 760; }
  .prefs-options { display: grid; grid-template-columns: repeat(auto-fit,minmax(min(115px,100%),1fr)); gap: 6px; }
  .swatch { flex: none; width: 16px; height: 16px; border-radius: 5px; border: 1px solid var(--line); }
  .control-button[aria-pressed=true] { border-color: var(--warm); box-shadow: inset 0 0 0 1px var(--warm); }
  .activity-list { display: grid; gap: 6px; margin: 0; padding: 0; list-style: none; }
  .activity-list .control-button { width: 100%; justify-content: space-between; text-align: start; }
  .confirm { inset-block-start: max(86px,20dvh); width: min(360px,calc(100% - 28px)); }
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
  @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
    .modal { background: #253846; }
  }
  @media (prefers-reduced-transparency: reduce), (prefers-contrast: more) {
    .modal, .notice { -webkit-backdrop-filter: none; backdrop-filter: none; background: #223746; }
    .toolbar, .room { -webkit-backdrop-filter: none; backdrop-filter: none; }
    .toolbar { background: #233743; }
    .room { background: #283b47; }
    .shell { --line: rgba(255,255,255,.58); --soft-line: rgba(255,255,255,.31); }
  }
  @media (prefers-reduced-motion: reduce) {
    .modal[open], .quick-button[aria-busy=true]::after { animation: none; }
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
    .room { --shortcut-width: 48px; --shortcut-height: 44px; padding: 12px; }
    .room-title { font-size: 17px; }
    .room-status { font-size: 12px; }
  }
`;
