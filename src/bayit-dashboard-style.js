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
  .shell[data-page=true] > :is(.room-scroll,.empty) { grid-area: 2 / 1; }
  .shell[data-page=true] > .empty { margin-inline: var(--edge); }
  .shell[data-page=true] .room-scroll {
    min-height: 0;
    overflow: auto;
    overscroll-behavior: contain;
    scrollbar-width: none;
    padding-inline: var(--edge);
  }
  .shell[data-page=true] .rooms { max-width: 430px; margin-inline: auto; grid-auto-rows: var(--room-block); }
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
  .shell[data-page=true] .quick-button[data-tone=quiet]:not(:disabled) {
    border-color: color-mix(in srgb,var(--ink) 16%,transparent);
  }
  @media (prefers-reduced-transparency: reduce) {
    .shell[data-page=true] .quick-button[data-tone=quiet]:not(:disabled,:hover) {
      background-color: color-mix(in srgb,var(--ink) 10%,var(--surface));
    }
  }
  @media (prefers-contrast: more) {
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
  .modal:is([data-kind=room],[data-kind=toolbar]) { width: min(860px,calc(100% - 2 * var(--edge))); }
  .modal[data-kind=device] {
    --device-bottom-gap: calc(16px + env(safe-area-inset-bottom,0px));
    width: min(520px,calc(100% - 2 * var(--edge)));
    bottom: max(var(--device-bottom-gap),calc(100dvh - var(--panel-bottom) + var(--device-bottom-gap)));
    max-height: calc(var(--panel-bottom) - var(--panel-top) - var(--device-bottom-gap));
    margin-block: auto;
  }
  .modal[data-kind=toolbar] {
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
  .modal-body { flex: 1 1 auto; min-height: 0; padding: 0 15px 15px; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; }
  .modal[data-kind=room] .modal-body { direction: ltr; }
  .shell[dir=rtl] .modal[data-kind=room] .modal-body > :is(.devices,.notice) { direction: rtl; }
  @keyframes appear { from { opacity: 0; transform: scale(.92); } }
  .devices, .settings { display: grid; gap: 12px; }
  .settings-screens { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 7px; }
  .appearance-preferences { display: grid; gap: 8px; }
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
  .device-head.device-state-head { grid-template-columns: minmax(0,1fr) 44px; }
  .device-state-head .current { margin-block-start: 0; }
  .device[data-inline-climate] { padding: 0; border: 0; }
  .device[data-inline-climate] .device-head {
    direction: ltr;
    grid-template-columns: 36px minmax(0,1fr) 44px;
  }
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
  .device:is([data-compact=tile],[data-compact=cover]) { background: var(--room-tile-fill); }
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
  .device-tile[aria-pressed] .current { display: none; }
  .device-tile .device-name { font-size: 13px; font-weight: 700; }
  .device[data-inline-light] .device-tile {
    min-height: 44px; height: auto;
    grid-template-columns: 32px minmax(0,1fr);
    justify-items: start; align-items: center;
    text-align: start;
  }
  .device[data-inline-light] .device-tile > ha-icon { width: 32px; height: 32px; }
  .device[data-inline-light] .action-list { margin: 0; padding: 0 8px 8px; gap: 2px; }
  .device[data-inline-light] .field-row { grid-template-columns: minmax(0,1fr); }
  .device[data-inline-light] .field-row label {
    display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 0 4px;
    align-items: center;
  }
  .device[data-inline-light] .field-row input { grid-column: 1 / -1; grid-row: 2; }
  .device[data-inline-light] .field-row output { grid-column: 2; grid-row: 1; white-space: nowrap; }
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
    .devices[data-room=true] .device-group[data-group=room_lights]:has(> .device[data-compact=tile]) {
      grid-template-columns: repeat(2,minmax(0,1fr));
      .device:not([data-compact=tile]) { grid-column: 1 / -1; }
    }
    .devices[data-room=true] .device-group[data-group=room_covers]:has(> .device[data-compact=cover] + .device[data-compact=cover]) {
      grid-template-columns: repeat(2,minmax(0,1fr));
      .device:not([data-compact=cover]) { grid-column: 1 / -1; }
      .device[data-compact=cover] { padding: 5px; }
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
    .toolbar, .room { background: var(--surface); }
    .shell, .modal { --line: rgba(255,255,255,.58); --soft-line: rgba(255,255,255,.31); }
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
    .room-title > ha-icon:first-child { width: 21px; height: 21px; --mdc-icon-size: 21px; }
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
  }
  @container (max-width: 320px) {
    .room { --shortcut-width: 35px; --shortcut-height: 32px; padding: 5px; }
    .room-title { grid-template-columns: 19px minmax(0,1fr); column-gap: 2px; }
    .room-title > ha-icon:first-child { width: 19px; height: 19px; --mdc-icon-size: 19px; }
    .quick-button ha-icon { width: 18px; height: 18px; --mdc-icon-size: 18px; }
  }
  @container (max-width: 420px) {
    .shell[data-page=true][data-layout=classic] .room-scroll { padding-inline: 16px; }
    .shell[data-page=true][data-layout=classic] .toolbar { margin-inline: 16px; }
    .shell[data-page=true][data-layout=classic] .room {
      --shortcut-width: clamp(32px,calc((100cqi - 98px) / 6),42px);
      grid-template-areas: "status" "quick" "title";
      grid-template-columns: minmax(0,1fr);
      grid-template-rows: minmax(17px,1fr) auto 31px;
    }
    .shell[data-page=true][data-layout=classic] .room:is([data-appliance-status],[data-concurrent-activities]) {
      grid-template-rows: minmax(17px,auto) auto 31px;
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
    .shell[data-page=true][data-layout=classic] .room-title > ha-icon:first-child { width: 22px; height: 22px; --mdc-icon-size: 22px; }
    .shell[data-page=true][data-layout=classic] .room-title > .room-name { text-align: left; }
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
  }
  @container (min-width: 900px) {
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
