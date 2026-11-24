/*! Bayit 9 v0.2.1 */
var Te=`
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
  .shell[data-shape=square] { --control-radius: 9px; --chrome-radius: var(--control-radius); }
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
    border-radius: var(--chrome-radius,999px);
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
    --ink: #fff;
    --secondary: #f8f8f8;
    --line: rgba(255,255,255,.30);
    --soft-line: rgba(255,255,255,.18);
    --surface: rgba(24,24,24,.93);
    --control: rgba(255,255,255,.075);
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
    background: linear-gradient(145deg,rgba(255,255,255,.06),transparent 58%),rgba(14,14,14,.50);
    -webkit-backdrop-filter: blur(16px);
    backdrop-filter: blur(16px);
    box-shadow: 0 12px 38px rgba(0,0,0,.18),inset 0 1px 0 rgba(255,255,255,.15);
    overflow: hidden;
    overscroll-behavior: contain;
    transform-origin: var(--motion-x,50%) var(--motion-y,34%);
  }
  .modal[open] { display: grid; grid-template-rows: auto minmax(0,1fr); animation: appear .2s ease-out; }
  .modal::backdrop { background: rgba(0,0,0,.24); }
  .modal-header {
    display: flex;
    direction: ltr;
    align-items: center;
    justify-content: space-between;
    padding: 12px 13px 10px;
    gap: 8px;
  }
  .modal-header h2 {
    display: flex;
    align-items: center;
    flex: 1;
    min-height: 44px;
    padding: 6px 11px;
    gap: 8px;
    border: 1px solid var(--soft-line);
    border-radius: 999px;
    font-size: 18px;
    line-height: 1.18;
    margin: 0;
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .shell[dir=rtl] .modal-header h2 { direction: rtl; flex-direction: row-reverse; text-align: left; }
  .modal-header > .round-action { flex: 0 0 44px; border-radius: 999px; }
  .confirm .modal-header h2 { min-height: 0; padding: 0; border: 0; }
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
  .devices[data-room=true] .device-group {
    padding: 7px;
    border: 1px solid var(--soft-line);
    border-radius: 18px;
  }
  .devices[data-room=true] .device-group-title {
    grid-column: 1 / -1;
    margin: 3px 0 0;
    font-size: 13px;
    text-align: center;
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
    background: rgba(255,255,255,.035);
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
    background: rgba(0,0,0,.15);
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
  @media (min-width: 300px) {
    .devices[data-room=true] .device-group[data-group=room_lights]:has(> .device[data-compact=true] + .device[data-compact=true]) {
      grid-template-columns: repeat(2,minmax(0,1fr));
    }
    .devices[data-room=true] .device-group[data-group=room_lights] > .device:not([data-compact=true]) {
      grid-column: 1 / -1;
    }
  }
  @media (300px <= width <= 500px) {
    .devices[data-room=true] .device-group[data-group=room_lights]:has(> .device[data-compact=true] + .device[data-compact=true]) {
      .device[data-compact=true] {
        padding: 6px;
      }
      .device[data-compact=true] .device-head {
        grid-template-columns: minmax(0,1fr) 44px;
        gap: 1px 4px;
        min-height: 44px;
      }
      .device[data-compact=true] .device-icon { grid-area: 1 / 1; justify-self: start; margin-inline-start: 4px; }
      .device[data-compact=true] .device-head > .round-action { grid-area: 1 / 2; }
      .device[data-compact=true] .device-detail { grid-area: 2 / 1 / auto / -1; text-align: center; }
      .device[data-compact=true] .basic-actions {
        grid-template-columns: repeat(auto-fit,minmax(44px,1fr));
        gap: 4px;
      }
      .device[data-compact=true] .basic-actions .control-button:has(ha-icon) {
        gap: 0;
        padding: 4px;
        font-size: 0;
      }
    }
  }
  @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
    .modal { background: #252525; }
  }
  @media (prefers-reduced-transparency: reduce), (prefers-contrast: more) {
    .modal, .notice { -webkit-backdrop-filter: none; backdrop-filter: none; background: #252525; }
    .toolbar, .room { -webkit-backdrop-filter: none; backdrop-filter: none; }
    .toolbar { background: #233743; }
    .room { background: #283b47; }
    .shell, .modal { --line: rgba(255,255,255,.58); --soft-line: rgba(255,255,255,.31); }
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
`;var le={en:{home:"Home",overview:"Home overview",settings:"Appearance",close:"Close",activity:"Active devices",rooms:"Rooms",security:"Security",presence:"People at home",weather:"Weather",energy:"Energy",open_energy:"Open energy dashboard",setup:"Customize home",setup_save:"Save dashboard",setup_loading:"Loading dashboard settings…",setup_saving:"Saving dashboard…",setup_error:"Could not load or save dashboard settings.",setup_conflict:"The dashboard changed while you were editing. Reload it and try again.",setup_storage:"To save these settings, use a dashboard managed in the Home Assistant interface.",room_lights:"Lights",room_covers:"Covers",room_climate:"Heating and cooling",room_security:"Security",room_sensors:"Sensors",room_devices:"Other devices",more_info:"More info",empty:"No rooms have been added.",empty_room:"No devices in this room.",quiet:"All quiet",active:"active",unavailable:"Unavailable",unknown:"Unknown state",apply:"Apply",cancel:"Cancel",confirm:"Confirm",confirm_title:"Confirm action",confirm_action:"Continue with {action} on {name}?",send_error:"Could not complete the action.",sending:"Sending {name}…",confirmed:"{name} updated.",sent:"Command sent to {name}.",unconfirmed:"No confirmation received for {name}.",background:"Background",shape:"Button shape",layout:"Room layout",aurora:"Aurora",lagoon:"Lagoon",dunes:"Dunes",graphite:"Graphite",soft:"Rounded",circle:"Round",square:"Square",classic:"Room name below",header:"Room name above",turn_on:"Turn on",turn_off:"Turn off",open:"Open",close_device:"Close cover",stop:"Stop",set_position:"Position",lock:"Lock",unlock:"Unlock",set_hvac_mode:"Mode",set_temperature:"Target temperature",set_temperature_range:"Temperature range",set_fan_mode:"Fan speed",set_preset_mode:"Preset",set_operation_mode:"Operating mode",set_percentage:"Speed",set_heating_level:"Heating level",set_brightness:"Brightness",start_timed:"Start timer",stop_timed:"Stop timer",duration:"Minutes",min:"Minimum",max:"Maximum",timed:"Timer",on:"On",off:"Off",opening:"Opening",closing:"Closing",opened:"Open",closed:"Closed",locked:"Locked",unlocked:"Unlocked",locking:"Locking",unlocking:"Unlocking",jammed:"Jammed",cool:"Cooling",heat:"Heating",heat_cool:"Heat / cool",dry:"Dry",fan_only:"Fan",auto:"Auto",idle:"Idle",paused:"Paused",playing:"Playing",cleaning:"Cleaning",docked:"Docked",available_option:"Choose an option"},he:{home:"בית",overview:"מבט על הבית",settings:"מראה",close:"סגירה",activity:"מכשירים פעילים",rooms:"חדרים",security:"אבטחה",presence:"מי בבית",weather:"מזג אוויר",energy:"אנרגיה",open_energy:"פתיחת דשבורד האנרגיה",setup:"התאמת הבית",setup_save:"שמירת הדשבורד",setup_loading:"טוען את הגדרות הדשבורד…",setup_saving:"שומר את הדשבורד…",setup_error:"לא ניתן לטעון או לשמור את הגדרות הדשבורד.",setup_conflict:"הדשבורד השתנה בזמן העריכה. רעננו אותו ונסו שוב.",setup_storage:"כדי לשמור הגדרות אלה, השתמשו בדשבורד שמנוהל בממשק Home Assistant.",room_lights:"תאורה",room_covers:"תריסים ווילונות",room_climate:"חימום וקירור",room_security:"אבטחה",room_sensors:"חיישנים",room_devices:"מכשירים נוספים",more_info:"מידע נוסף",empty:"עדיין אין חדרים בדשבורד.",empty_room:"אין מכשירים בחדר הזה.",quiet:"הכול שקט",active:"פעיל",unavailable:"לא זמין",unknown:"מצב לא ידוע",apply:"החל",cancel:"ביטול",confirm:"אישור",confirm_title:"אישור פעולה",confirm_action:"להמשיך בפעולה ״{action}״ עבור {name}?",send_error:"הפעולה לא הושלמה.",sending:"שולח פקודה אל {name}…",confirmed:"המצב של {name} עודכן.",sent:"נשלחה פקודה אל {name}.",unconfirmed:"עדיין לא התקבל אישור מצב עבור {name}.",background:"רקע",shape:"צורת הכפתורים",layout:"פריסת החדרים",aurora:"זוהר צפוני",lagoon:"לגונה",dunes:"דיונות",graphite:"גרפיט",soft:"פינות מעוגלות",circle:"עגול",square:"מרובע",classic:"שם החדר למטה",header:"שם החדר למעלה",turn_on:"הדלקה",turn_off:"כיבוי",open:"פתיחה",close_device:"סגור",stop:"עצירה",set_position:"מיקום",lock:"נעילה",unlock:"פתיחת מנעול",set_hvac_mode:"מצב עבודה",set_temperature:"טמפרטורת יעד",set_temperature_range:"טווח טמפרטורה",set_fan_mode:"מהירות מאוורר",set_preset_mode:"תוכנית",set_operation_mode:"מצב פעולה",set_percentage:"מהירות",set_heating_level:"עוצמת חימום",set_brightness:"בהירות",start_timed:"הפעלת טיימר",stop_timed:"עצירת טיימר",duration:"דקות",min:"מינימום",max:"מקסימום",timed:"טיימר",on:"פועל",off:"כבוי",opening:"נפתח",closing:"נסגר",opened:"פתוח",closed:"סגור",locked:"נעול",unlocked:"לא נעול",locking:"ננעל",unlocking:"משתחרר",jammed:"תקוע",cool:"קירור",heat:"חימום",heat_cool:"חימום / קירור",dry:"ייבוש",fan_only:"אוורור",auto:"אוטומטי",idle:"בהמתנה",paused:"מושהה",playing:"מנגן",cleaning:"מנקה",docked:"בעמדה",available_option:"בחירת אפשרות"}};var pt=/^[a-z][a-z0-9_]*\.[a-z0-9_]+$/,ht=/^[A-Za-z_][A-Za-z0-9_]*$/,ne=Object.freeze(["switch","climate","fan","water_heater"]),ft=["off","heat","cool","heat_cool","auto","dry","fan_only"],ie={open:1,close:2,position:4,stop:8},oe={speed:1,preset:8,off:16,on:32},U={temperature:1,range:2,fan:8,preset:16,off:128,on:256},ue={temperature:1,operation:2,power:8},gt={open:"open_cover",close:"close_cover",stop:"stop_cover",set_position:"set_cover_position",set_brightness:"turn_on",set_temperature_range:"set_temperature"},pe={set_position:"position",set_brightness:"brightness_pct",set_percentage:"percentage",set_hvac_mode:"hvac_mode",set_fan_mode:"fan_mode",set_preset_mode:"preset_mode",set_operation_mode:"operation_mode",set_temperature:"temperature"},De=Symbol("request-timed-out"),R=class extends Error{constructor(e,t,i){super(t,i),this.name="DeviceControlError",this.code=e}};function J(o,e){return typeof o=="string"&&pt.test(o)&&(!e||o.startsWith(e+"."))}function F(o){return typeof o?.state=="string"&&o.state!==""&&!["unavailable","unknown"].includes(o.state)}function bt(o,e){if(o===void 0)return null;if(!o||typeof o!="object"||Array.isArray(o)||!ne.includes(e))throw new R("invalid_config","A timed profile requires a heating-capable entity.");let{start_script:t,stop_script:i,timer_entity:r,duration_field:n="duration",min_minutes:s=1,max_minutes:a=60,step_minutes:d=1}=o;if(t!==void 0&&!J(t,"script")||i!==void 0&&!J(i,"script")||r!==void 0&&!J(r,"timer")||typeof n!="string"||!ht.test(n)||![s,a,d].every(Number.isSafeInteger)||s<1||a<s||d<1)throw new R("invalid_config","The timed profile includes an invalid entity or duration setting.");return{start_script:t,stop_script:i,timer_entity:r,duration_field:n,min_minutes:s,max_minutes:a,step_minutes:d}}function Me(o){if(!o||!J(o.entity))throw new R("invalid_config","Configure a Home Assistant entity ID.");let e=o.entity.split(".")[0],t=o.kind??e;if(t!==e&&(!["heater","boiler"].includes(t)||!ne.includes(e)))throw new R("invalid_config","The entity does not support the requested device profile.");if(o.level_entity!==void 0&&(!["heater","boiler"].includes(t)||!J(o.level_entity,"number")))throw new R("invalid_config","Heating level requires a number entity in a heating profile.");if(o.confirmation_ms!==void 0&&(!Number.isSafeInteger(o.confirmation_ms)||o.confirmation_ms<0))throw new R("invalid_config","The confirmation time must be a nonnegative number of milliseconds.");return{...o,kind:t,domain:e,timed:bt(o.timed,e)}}function vt(o){if(typeof o!="string")return null;let e=/^(?:(\d+) days?, )?(\d+):([0-5]\d):([0-5]\d)(?:\.(\d{1,6}))?$/.exec(o);if(!e)return null;let[,t,i,r,n,s]=e,a=((Number(t??0)*24+Number(i))*3600+Number(r)*60+Number(n)+(s?+("0."+s):0))*1e3;return Number.isFinite(a)?a:null}function he(o){return typeof o=="string"&&/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(o)?Date.parse(o):NaN}function yt(o,e,t){if(!o)return null;let i=e?.[o],r=["active","paused","idle"].includes(i?.state)?i.state:"unavailable",n=r==="active"?he(i.attributes?.finishes_at):NaN,s=Number.isFinite(n)?n:null,a=null;return s!==null&&(a=Math.max(0,s-t)),r==="paused"&&(a=vt(i.attributes?.remaining)),r==="idle"&&(a=0),{entity:o,state:r,deadlineMs:s,remainingMs:a}}function _t(o,e,t,i,r){let n={},s=(l,h)=>{n[l]={id:l,requiresConfirmation:!1,...h}},a=()=>{s("turn_on"),s("turn_off")},d=(l,h,v)=>{if(!Array.isArray(h))return;let _=[...new Set(h.filter(w=>typeof w=="string"&&w.length>0&&(!v||v.includes(w))))];_.length&&s(l,{options:_})},c=o.timed;if(t&&s("more_info"),!F(t))return n;let u=t.attributes??{},g=Number.isSafeInteger(u.supported_features)&&u.supported_features>=0?u.supported_features:0,m=l=>(g&l)===l,p=l=>{let{min_temp:h,max_temp:v,target_temp_step:_}=u;if(!Number.isFinite(h)||!Number.isFinite(v)||h>v)return;let w=Number.isFinite(_)&&_>0?_:null;s(l,{min:h,max:v,step:w})};switch(o.domain){case"switch":a();break;case"light":a(),(Array.isArray(u.supported_color_modes)&&u.supported_color_modes.some(l=>["brightness","color_temp","hs","xy","rgb","rgbw","rgbww","white"].includes(l))||Number.isFinite(u.brightness))&&s("set_brightness",{min:0,max:100,step:1});break;case"cover":m(ie.open)&&s("open"),m(ie.close)&&s("close"),m(ie.stop)&&s("stop"),m(ie.position)&&s("set_position",{min:0,max:100,step:1});break;case"fan":m(oe.on)&&s("turn_on"),m(oe.off)&&s("turn_off"),m(oe.speed)&&s("set_percentage",{min:0,max:100,step:1}),m(oe.preset)&&d("set_preset_mode",u.preset_modes);break;case"climate":m(U.on)&&s("turn_on"),m(U.off)&&s("turn_off"),d("set_hvac_mode",u.hvac_modes,ft),m(U.temperature)&&p("set_temperature"),m(U.range)&&p("set_temperature_range"),m(U.fan)&&d("set_fan_mode",u.fan_modes),m(U.preset)&&d("set_preset_mode",u.preset_modes);break;case"water_heater":m(ue.power)&&a(),m(ue.temperature)&&p("set_temperature"),m(ue.operation)&&d("set_operation_mode",u.operation_list);break;case"lock":{let l=typeof u.code_format=="string"&&u.code_format.length>0;s("lock",{requiresCode:l}),s("unlock",{requiresCode:l,requiresConfirmation:!0});break}}if(c?.start_script){n.turn_off||(n.set_hvac_mode?.options.includes("off")?s("turn_off",{service:"set_hvac_mode",fixedData:{hvac_mode:"off"}}):n.set_operation_mode?.options.includes("off")?s("turn_off",{service:"set_operation_mode",fixedData:{operation_mode:"off"}}):n.set_percentage&&s("turn_off",{service:"set_percentage",fixedData:{percentage:0}}));for(let l of["turn_on","set_hvac_mode","set_operation_mode","set_percentage","set_temperature","set_temperature_range","set_fan_mode","set_preset_mode"])delete n[l];F(e?.[c.start_script])&&s("start_timed",{min:c.min_minutes,max:c.max_minutes,step:c.step_minutes})}if(o.level_entity&&(!c?.start_script||i?.state==="active"&&i.deadlineMs>r)){let l=e?.[o.level_entity],{min:h,max:v,step:_}=l?.attributes??{};F(l)&&l.state.trim()&&Number.isFinite(Number(l.state))&&[h,v,_].every(Number.isFinite)&&v>=h&&_>0&&s("set_heating_level",{min:h,max:v,step:_})}return c?.stop_script&&F(e?.[c.stop_script])&&(s("stop_timed"),delete n.turn_off),n}function qe(o,e,t){let i=e?.[o.entity],r=i?.attributes??{},n=yt(o.timed?.timer_entity,e,t),s=e?.[o.level_entity];return{entity:o.entity,domain:o.domain,kind:o.kind,name:o.name||r.friendly_name||o.entity,icon:o.icon||r.icon||null,state:i?.state??"missing",available:F(i),attributes:r,actions:_t(o,e,i,n,t),level:F(s)&&s.state.trim()?Number(s.state):null,timer:n}}function Le(o,e,t=Date.now()){return qe(Me(o),e,t)}function me(o,{min:e,max:t,step:i}){if(!Number.isFinite(o)||o<e||o>t)return!1;if(!i)return!0;let r=(o-e)/i;return o===t||Math.abs(r-Math.round(r))<1e-7}function xt(o,e,t,i){let r=(s,a,d)=>({entity:o.entity,attributes:{[s]:a},tolerance:d}),n=s=>({entity:o.entity,state:s});switch(e){case"turn_on":return["light","switch","fan"].includes(o.domain)?n("on"):null;case"turn_off":return n("off");case"open":return n("open");case"close":return n("closed");case"stop":return["opening","closing"].includes(i?.[o.entity]?.state)?{entity:o.entity,anyState:["open","closed"]}:null;case"set_position":return r("current_position",t);case"set_brightness":return t===0?n("off"):{...r("brightness",Math.round(t*255/100),2),state:"on"};case"set_percentage":return t===0?n("off"):r("percentage",t);case"lock":return n("locked");case"unlock":return n("unlocked");case"set_hvac_mode":case"set_operation_mode":return n(t);case"set_fan_mode":case"set_preset_mode":case"set_temperature":return r(pe[e],t,1e-6);case"set_temperature_range":return{entity:o.entity,attributes:{target_temp_low:t.low,target_temp_high:t.high},tolerance:1e-6};case"start_timed":{let s=o.timed.timer_entity,a=["switch","fan"].includes(o.domain)?n("on"):null;if(!s)return a;let d=he(i?.[s]?.attributes?.finishes_at);return{all:[{entity:s,state:"active",requireNewDeadline:!0,formerDeadline:d},...a?[a]:[]]}}case"stop_timed":return o.timed.timer_entity?{all:[{entity:o.timed.timer_entity,state:"idle"},n("off")]}:n("off");default:return null}}function wt(o,e,t,i,{confirmed:r=!1,code:n}={}){o=Me(o);let s=qe(o,e,Date.now()),a=typeof t=="string"&&Object.hasOwn(s.actions,t)&&s.actions[t];if(!a)throw new R("action_unavailable","This entity does not currently support that action.");if(a.requiresConfirmation&&r!==!0)throw new R("confirmation_required","This action requires explicit confirmation.");if(a.requiresCode&&(typeof n!="string"||!n.trim()||n.length>64))throw new R("pin_required","Enter the lock code in Home Assistant.");if(t==="more_info")return{kind:"more_info",entity:o.entity};if(t==="set_temperature_range"){if(!i||!me(i.low,a)||!me(i.high,a)||i.low>i.high)throw new R("invalid_value","The selected temperature range is invalid.")}else if(a.options?!a.options.includes(i):a.min!==void 0&&!me(i,a))throw new R("invalid_value","The selected value is outside the published device options.");if(t==="set_heating_level")return{kind:"service",domain:"number",service:"set_value",target:{entity_id:o.level_entity},data:{value:i},expected:{entity:o.level_entity,numericState:i}};let d=xt(o,t,i,e);if(t==="start_timed"||t==="stop_timed"){let u=t==="start_timed";return{kind:"service",domain:"script",service:(u?o.timed.start_script:o.timed.stop_script).split(".")[1],target:null,data:u?{[o.timed.duration_field]:i}:{},expected:d}}let c=t==="set_temperature_range"?{target_temp_low:i.low,target_temp_high:i.high}:pe[t]?{[pe[t]]:i}:{...a.fixedData};return a.requiresCode&&(c.code=n),{kind:"service",domain:s.domain,service:a.service??gt[t]??t,target:{entity_id:o.entity},data:c,expected:d}}function ze(o,e){if(o.all)return o.all.every(i=>ze(i,e));let t=e?.[o.entity];if(!F(t)||o.state!==void 0&&o.state!==t.state||o.anyState&&!o.anyState.includes(t.state)||o.numericState!==void 0&&(!t.state.trim()||!(Math.abs(Number(t.state)-o.numericState)<=1e-7)))return!1;if(o.requireNewDeadline){let i=he(t.attributes?.finishes_at);if(!Number.isFinite(i)||i===o.formerDeadline)return!1}return Object.entries(o.attributes??{}).every(([i,r])=>{let n=t.attributes?.[i];return typeof r=="number"?Number.isFinite(n)&&Math.abs(n-r)<=(o.tolerance??0):n===r})}var kt=o=>new Promise(e=>setTimeout(e,o)),St=()=>globalThis.performance.now();function At(o,e){let t,i=new Promise(r=>{t=setTimeout(()=>r(De),e)});return Promise.race([o,i]).finally(()=>clearTimeout(t))}function Ie({getHass:o,confirmationTimeoutMs:e,requestTimeoutMs:t=1e4,pollIntervalMs:i=100,sleep:r=kt,now:n=St}={}){if(typeof o!="function"||typeof r!="function"||typeof n!="function"||!Number.isSafeInteger(t)||t<1||t>2147483647||!Number.isSafeInteger(i)||i<1||e!==void 0&&(!Number.isSafeInteger(e)||e<0))throw new R("invalid_config","The dashboard connection or timeout setting is invalid.");let s=new Map;return{async execute(a,d,c,u){let g=o(),m=wt(a,g?.states,d,c,u);if(m.kind==="more_info")return{status:"more_info",entity:m.entity};if(typeof g?.callWS!="function")throw new R("service_unavailable","The Home Assistant connection is unavailable.");let p=a.entity,l=Symbol(p);s.set(p,l);let h=(v,_)=>({status:v,entity:p,action:d,..._?{reason:_}:{}});try{let v={type:"call_service",domain:m.domain,service:m.service,service_data:m.data};m.target&&(v.target=m.target);let _;try{_=await At(Promise.resolve(g.callWS(v)),t)}catch(b){if(s.get(p)!==l)return h("unconfirmed","superseded");throw new R("service_failed","Home Assistant rejected or could not deliver the command.",{cause:b})}if(s.get(p)!==l)return h("unconfirmed","superseded");if(_===De)return h("unconfirmed","request_timeout");let w=a.confirmation_ms??e??(m.domain==="cover"?45e3:8e3);if(!m.expected||!w)return h("sent");let A=n()+w;for(;;){if(s.get(p)!==l)return h("unconfirmed","superseded");if(ze(m.expected,o()?.states))return h("confirmed");let b=A-n();if(b<=0)return h("unconfirmed","state_timeout");await r(Math.min(i,b))}}finally{s.get(p)===l&&s.delete(p)}}}}var Ct="custom:bayit-dashboard",D="bayit-9",V=6,ve="bayit_room_",ye={aurora:{en:"Aurora",he:"זוהר צפוני"},lagoon:{en:"Lagoon",he:"לגונה"},dunes:{en:"Dunes",he:"דיונות"},graphite:{en:"Graphite",he:"גרפיט"}},_e=ne,Nt=["light","switch","cover","climate","fan","lock","water_heater","vacuum","humidifier","alarm_control_panel","camera","media_player","binary_sensor","sensor","weather","person","calendar"],xe=/^[a-z0-9_]+\.[a-z0-9_]+$/,Rt=/^bayit_room_[a-z0-9][a-z0-9_-]{0,63}$/,je=/^mdi:[a-z0-9-]+$/,Et=new Set(["light","switch","cover","climate","fan","lock","water_heater"]),Ot=new Set(["door","window","garage_door","opening"]),Tt=new Set(["heater","boiler"]),fe=new Map(Nt.map((o,e)=>[o,e])),Pe="script",se={en:{title:"Bayit 9",home:"Home",unassigned:"Unassigned"},he:{title:"בית 9",home:"בית",unassigned:"ללא חדר"}};function ae(o,e={}){if(o==="en"||o==="he")return o;let t=e.locale?.language??e.language;return typeof t=="string"&&/^he(?:[-_]|$)/i.test(t)?"he":"en"}function z(o){return Array.isArray(o)?[...new Set(o.filter(e=>typeof e=="string"&&e.trim()))]:[]}function G(o){return o.split(".")[0]}function re(o,e){return typeof o=="string"&&xe.test(o)&&G(o)===e?o:void 0}function ge(o,e){return Number.isInteger(o)&&o>0&&o<=360?o:e}function we(o){if(!o||typeof o.entity!="string"||!xe.test(o.entity)||!_e.includes(G(o.entity))||!Tt.has(o.kind))return null;let e={entity:o.entity,kind:o.kind};typeof o.name=="string"&&o.name.trim()&&(e.name=o.name.trim().slice(0,80));let t=re(o.level_entity,"number");t&&(e.level_entity=t);let i=o.timed;if(!i||typeof i!="object")return e;let r=re(i.start_script,Pe),n=re(i.stop_script,Pe),s=re(i.timer_entity,"timer");if(!r&&!s&&!n)return e;let a=ge(i.min_minutes,15),d=Math.max(a,ge(i.max_minutes,60)),c=Math.min(d-a||1,ge(i.step_minutes,15));return e.timed={...r&&{start_script:r},...n&&{stop_script:n},...s&&{timer_entity:s},duration_field:typeof i.duration_field=="string"&&/^[a-z][a-z0-9_]{0,39}$/.test(i.duration_field)?i.duration_field:"duration",min_minutes:a,max_minutes:d,step_minutes:c},e}function Dt(o){let e=new Map;for(let t of Array.isArray(o)?o:[]){let i=we(t);i&&!e.has(i.entity)&&e.set(i.entity,i)}return e}function Fe(o,e){let t=new Map(Object.entries(e.areas??{}).map(([i,r])=>[r.area_id??i,{name:r.name??i,icon:r.icon||"mdi:home-outline"}]));for(let[i,r]of Object.entries(o.room_overrides??{})){if(!r||typeof r!="object"||Array.isArray(r))continue;let n=t.get(i),s=typeof r.name=="string"?r.name.trim().slice(0,80):"";if(!n&&(!Rt.test(i)||!s))continue;let a=typeof r.icon=="string"?r.icon.trim():"",d=r.entity_icons;t.set(i,{name:s||n?.name,icon:je.test(a)?a:n?.icon??"mdi:home-outline",entityIds:Array.isArray(r.entities)?z(r.entities):n?void 0:[],entityIcons:d&&typeof d=="object"&&!Array.isArray(d)?d:null,custom:!n})}return t}function He(o={},e={}){return[...Fe(o,e)].map(([t,i])=>({id:t,name:i.name,icon:i.icon,custom:i.custom===!0}))}function be(o,e,t){return o.localeCompare(e,t,{numeric:!0,sensitivity:"base"})}function Mt(o){let e="bayit9_unassigned";for(let t=1;o.has(e);t++)e="bayit9_unassigned_"+t;return e}function ke(o,e,t,i){let r=i?.name??e.attributes?.friendly_name??t?.name??t?.en,n=t?.icon??t?.ic??e.attributes?.icon;return{entity:o,...typeof r=="string"&&r&&{name:r},...typeof n=="string"&&n&&{icon:n},...i&&{kind:i.kind},...i?.level_entity&&{level_entity:i.level_entity},...i?.timed&&{timed:i.timed}}}function Se(o,e,t,i){if(!xe.test(o)||i.has(o)||!Object.hasOwn(e,o)||e[o]==null)return!1;let r=t?.[o];return r?.hidden!==!0&&!r?.hidden_by&&!r?.disabled_by}function Be(o={},e={}){let t=e.states??{},i=e.entities,r=new Set(z(o.hidden_entities));return Object.keys(t).filter(n=>Se(n,t,i,r)).map(n=>ke(n,t[n],i?.[n]))}function $(o,e,t){let i=Fe(o,e),r=Mt(i),n=new Map(z(o.area_ids).map((f,x)=>[f,x])),s=f=>n.size===0||n.has(f),a=new Set(z(o.hidden_entities)),d=new Set(z(o.included_entities)),c=Dt(o.profiles),u=new Set([...c.values()].flatMap(f=>{let x=f.timed;return[f.level_entity,x?.start_script,x?.stop_script,x?.timer_entity].filter(Boolean)})),g=e.states??{},m=e.entities??null,p=new Map,l=o.discovery_mode==="controls"?Et:fe,h=f=>Se(f,g,m,a),v=f=>ke(f,g[f],m?.[f],c.get(f)),_=new Set;for(let[f,x]of i){if(!x.entityIds||!s(f))continue;let N=x.entityIds.filter(h);p.set(f,N.map(v));for(let L of N)_.add(L)}let w=new Set(Object.keys(m||g));for(let f of[...d,...c.keys()])w.add(f);for(let f of w){if(_.has(f)||!h(f))continue;let x=m?.[f],N=d.has(f)||c.has(f),L=x?.entity_category!=null||x?.ec!=null;if(!N&&(!l.has(G(f))||L||u.has(f)))continue;let j=x?.device_id??x?.di,T=j&&e.devices?.[j],E=x?.area_id??x?.ai??T?.area_id,te=i.get(E),W=te&&!te.custom?E:r;(W===r?o.show_unassigned===!1:!s(W)||te.entityIds)||(p.has(W)||p.set(W,[]),p.get(W).push(v(f)))}let A=f=>i.get(f)??{name:se[t].unassigned,icon:"mdi:map-marker-outline"};return[...p.keys()].sort((f,x)=>f===r||x===r?f===r?1:-1:(n.get(f)??1/0)-(n.get(x)??1/0)||be(A(f).name,A(x).name,t)).map(f=>{let x=A(f),N=p.get(f);if(x.entityIds||N.sort((T,E)=>(fe.get(G(T.entity))??100)-(fe.get(G(E.entity))??100)||be(T.name??T.entity,E.name??E.entity,t)),x.entityIcons)for(let T of N){if(!Object.hasOwn(x.entityIcons,T.entity))continue;let E=x.entityIcons[T.entity];typeof E=="string"&&je.test(E.trim())&&(T.icon=E.trim())}let L={id:f,name:x.name,icon:x.icon,entities:N},j=Object.hasOwn(o.room_shortcuts??{},f)?o.room_shortcuts[f]:null;if(Array.isArray(j)){let T=new Set(N.map(E=>E.entity));L.shortcuts=z(j).filter(E=>T.has(E)).slice(0,V)}return L})}function qt(o,e,t){let i=e.states??{},r=e.entities,n=new Set(z(o.hidden_entities)),s=new Set(z(o.overview_entities)),a={};for(let[d,c]of Object.entries(i)){let u=G(d),g=c?.attributes?.device_class,m;u==="lock"||u==="alarm_control_panel"||u==="binary_sensor"&&Ot.has(g)?m="security":u==="person"?m="presence":u==="weather"?m="weather":u==="sensor"&&s.has(d)&&["energy","power"].includes(g)&&(m="energy"),!(!m||!Se(d,i,r,n))&&(a[m]??=[]).push(ke(d,c,r?.[d]))}for(let d of Object.values(a))d.sort((c,u)=>be(c.name??c.entity,u.name??u.entity,t));return a}function Ue(o){return{title:se[ae("auto",o)].title,icon:"mdi:home-variant-outline"}}function Ge(o={},e={}){let t=ae(o.locale,e),i=typeof o.title=="string"&&o.title.trim()?o.title.trim():se[t].title,r={type:Ct,locale:t,title:i,rooms:$(o,e,t)},n=new Set(r.rooms.flatMap(d=>d.entities.map(c=>c.entity))),s=z(o.overview_entities).filter(d=>n.has(d));s.length&&(r.overview=s);let a=qt(o,e,t);return Object.keys(a).length&&(r.context=a),Object.hasOwn(ye,o.background)&&(r.background=o.background),["soft","circle","square"].includes(o.shape)&&(r.shape=o.shape),["classic","header"].includes(o.layout)&&(r.layout=o.layout),typeof o.preference_key=="string"&&o.preference_key.trim()&&(r.preference_key=o.preference_key.trim()),{title:i,views:[{title:se[t].home,path:"home",type:"panel",cards:[r]}]}}var Ve="custom:"+D;function X(o){let e=new Error(o);return e.code=o,e}function Lt(o){let e=o.split("/")[1];return/^[a-z0-9][a-z0-9_-]*$/i.test(e??"")&&e.includes("-")?e:null}function $e(o){if(!o?.user?.is_admin||typeof o.callWS!="function")throw X("setup_storage")}async function Ke(o,e){let t=await o.callWS({type:"lovelace/config",url_path:e,force:!0});if(t?.strategy?.type!==Ve)throw X("setup_storage");return t}async function Ye(o,e){$e(o);let t=Lt(e);if(!t||!(await o.callWS({type:"lovelace/dashboards/list"})).some(n=>n.url_path===t&&n.mode==="storage"))throw X("setup_storage");let r=await Ke(o,t);return{urlPath:t,strategy:r.strategy}}async function We(o,e,t){$e(o);let i=await Ke(o,e.urlPath);if(JSON.stringify(i.strategy)!==JSON.stringify(e.strategy))throw X("setup_conflict");let r={...i,strategy:{...t,type:Ve}};await o.callWS({type:"lovelace/config/save",url_path:e.urlPath,config:r})}var ot=Object.freeze(["aurora","lagoon","dunes","graphite"]),Q={background:ot,shape:["soft","circle","square"],layout:["classic","header"]},zt={aurora:"#63928a",lagoon:"#37728c",dunes:"#aa7356",graphite:"#596169"},nt=/^mdi:[a-z0-9-]+$/,Je=/^[a-z0-9_]+\.[a-z0-9_]+$/,It={turn_on:"mdi:power-on",turn_off:"mdi:power-off",open:"mdi:arrow-up",close:"mdi:arrow-down",stop:"mdi:stop",lock:"mdi:lock-outline",unlock:"mdi:lock-open-variant-outline",start_timed:"mdi:timer-play-outline",stop_timed:"mdi:timer-stop-outline"},Pt={light:"mdi:lightbulb-outline",switch:"mdi:toggle-switch-outline",fan:"mdi:fan",cover:"mdi:blinds",climate:"mdi:thermostat",lock:"mdi:lock-outline",heater:"mdi:radiator",boiler:"mdi:water-boiler",water_heater:"mdi:water-boiler",sensor:"mdi:gauge",binary_sensor:"mdi:motion-sensor",calendar:"mdi:calendar-outline",alarm_control_panel:"mdi:shield-home-outline",weather:"mdi:weather-partly-cloudy",person:"mdi:account-outline",vacuum:"mdi:robot-vacuum",camera:"mdi:cctv",media_player:"mdi:speaker"},H=["security","presence","weather","energy"],jt=new Set(["light","switch","fan","cover","lock","climate","water_heater"]),Ft={light:"room_lights",cover:"room_covers",climate:"room_climate",fan:"room_climate",water_heater:"room_climate",lock:"room_security",alarm_control_panel:"room_security",camera:"room_security",sensor:"room_sensors",binary_sensor:"room_sensors",weather:"room_sensors"},Xe=o=>o.entity.split(".")[0],Ht=new Set(["open","close","set_position"]),Ze=new Set(["set_position","set_brightness","set_percentage"]),Qe={set_position:"current_position",set_percentage:"percentage",set_brightness:"brightness",set_temperature:"temperature",set_fan_mode:"fan_mode",set_preset_mode:"preset_mode",set_operation_mode:"operation_mode"},et=["turn_on","turn_off","open","stop","close","lock","unlock","set_position","set_brightness","set_percentage","set_hvac_mode","set_temperature","set_temperature_range","set_fan_mode","set_preset_mode","set_operation_mode","set_heating_level","start_timed","stop_timed"],tt=new Set(["on","off","open","closed","opening","closing","locked","unlocked","locking","unlocking","jammed","cool","heat","heat_cool","dry","fan_only","auto","idle","active","paused","playing","cleaning","docked","unavailable","unknown"]),Bt=0;function k(o,e,t){let i=document.createElement(o);return e&&(i.className=e),t!=null&&(i.textContent=t),i}function ee(o,e="mdi:information-outline"){return typeof o=="string"&&nt.test(o)?o:e}function Y(o){let e=k("ha-icon");return e.setAttribute("icon",ee(o)),e.setAttribute("aria-hidden","true"),e}function M(o,e){o.getAttribute("aria-label")!==e&&(o.title=e,o.setAttribute("aria-label",e))}function I(o,e,t,i=!1){let r=k("button",o);return r.type="button",t&&r.append(Y(t)),i?M(r,e):e&&r.append(e),r}function q(o){return typeof o=="string"?o.trim():""}function K(o){if(o==null||o==="")return null;let e=Number(o);return Number.isFinite(e)?e:null}function Z(o){return"⁦"+o+"⁩"}function C(o,e){o.textContent!==String(e)&&(o.textContent=e)}function Ae(o,e){let t=ee(e);o.getAttribute("icon")!==t&&o.setAttribute("icon",t)}function it(o){let e=q(typeof o=="string"?o:o?.entity);if(!Je.test(e))throw new Error("Invalid Home Assistant entity in Bayit 9.");let t={entity:e};return q(o.name)&&(t.name=q(o.name)),nt.test(q(o.icon))&&(t.icon=o.icon),["heater","boiler"].includes(o.kind)&&(t.kind=o.kind),Je.test(q(o.level_entity))&&o.level_entity.startsWith("number.")&&(t.level_entity=o.level_entity),o.timed&&typeof o.timed=="object"&&!Array.isArray(o.timed)&&(t.timed={...o.timed}),t}function Ut(o={}){if(!o||typeof o!="object"||Array.isArray(o))throw new Error("Invalid Bayit 9 configuration.");let e=/^he(?:-|$)/i.test(q(o.locale))?"he":"en",t=new Set,i=o.rooms??[];if(!Array.isArray(i))throw new Error("Bayit 9 rooms must be a list.");let r=i.map(d=>{let c=q(d?.id),u=q(d?.name);if(!/^[a-z0-9][a-z0-9_-]*$/i.test(c)||!u||t.has(c))throw new Error("Each Bayit 9 room needs a unique id and name.");t.add(c);let g=d.entities??[],m=new Map;if(!Array.isArray(g))throw new Error("Bayit 9 room entities must be a list.");for(let l of g){let h=it(l);m.has(h.entity)||m.set(h.entity,h)}let p={id:c,name:u,icon:ee(d.icon,"mdi:door-open"),entities:[...m.values()]};return Array.isArray(d.shortcuts)&&(p.shortcuts=[...new Set(d.shortcuts)].filter(l=>m.has(l)).slice(0,V)),p}),n=new Map(r.flatMap(d=>d.entities.map(c=>[c.entity,c]))),s=Array.isArray(o.overview)?[...new Set(o.overview)].filter(d=>n.has(d)).map(d=>n.get(d)):[],a=Object.fromEntries(H.map(d=>{let c=Array.isArray(o.context?.[d])?o.context[d].map(it):[],u=new Map(c.map(g=>[g.entity,n.get(g.entity)??g]));return[d,[...u.values()]]}));return{locale:e,rooms:r,overview:s,context:a,title:q(o.title)||le[e].home,background:ot.includes(o.background)?o.background:"aurora",layout:Q.layout.includes(o.layout)?o.layout:"classic",shape:Q.shape.includes(o.shape)?o.shape:"soft",storageKey:"bayit-9.preferences.v1:"+(q(o.preference_key)||location.pathname)}}var Gt=`
  <main class="shell">
    <header class="toolbar">
      <div class="brand"><ha-icon icon="mdi:home-variant-outline" aria-hidden="true"></ha-icon><h1></h1></div>
      <div class="toolbar-actions">
        <button type="button" class="chrome-button" data-role="activity" aria-haspopup="dialog">
          <ha-icon icon="mdi:home-automation" aria-hidden="true"></ha-icon>
          <span class="badge" hidden aria-hidden="true"></span>
        </button>
        <button type="button" class="chrome-button" data-role="security" aria-haspopup="dialog" hidden>
          <ha-icon icon="mdi:shield-home-outline" aria-hidden="true"></ha-icon>
        </button>
        <button type="button" class="chrome-button" data-role="presence" aria-haspopup="dialog" hidden>
          <ha-icon icon="mdi:account-group-outline" aria-hidden="true"></ha-icon>
          <span class="badge" hidden aria-hidden="true"></span>
        </button>
        <button type="button" class="chrome-button" data-role="weather" aria-haspopup="dialog" hidden>
          <ha-icon icon="mdi:weather-partly-cloudy" aria-hidden="true"></ha-icon>
        </button>
        <button type="button" class="chrome-button" data-role="energy" aria-haspopup="dialog" hidden>
          <ha-icon icon="mdi:meter-electric-outline" aria-hidden="true"></ha-icon>
        </button>
        <button type="button" class="chrome-button" data-role="overview" aria-haspopup="dialog" hidden>
          <ha-icon icon="mdi:view-dashboard-outline" aria-hidden="true"></ha-icon>
        </button>
        <button type="button" class="chrome-button" data-role="settings" aria-haspopup="dialog">
          <ha-icon icon="mdi:cog-outline" aria-hidden="true"></ha-icon>
        </button>
      </div>
    </header>
    <div class="rooms" role="region"></div>
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
`,Ce=class extends HTMLElement{constructor(){super(),this.attachShadow({mode:"open"}).innerHTML="<style>"+Te+"</style>"+Gt;let e=n=>this.shadowRoot.querySelector(n),t=n=>e('[data-role="'+n+'"]');this.nodes={shell:e(".shell"),rooms:e(".rooms"),empty:e(".empty"),title:e("h1"),overview:t("overview"),activity:t("activity"),badge:t("activity").querySelector(".badge"),settings:t("settings"),close:t("close"),context:Object.fromEntries(H.map(n=>[n,t(n)])),peopleBadge:t("presence").querySelector(".badge"),modal:e("dialog:not(.confirm)"),modalTitle:e("dialog:not(.confirm) h2"),modalBody:e("dialog:not(.confirm) .modal-body"),content:t("content"),confirm:e(".confirm"),confirmTitle:e(".confirm h2"),confirmText:e(".confirmation-text"),accept:t("accept"),abort:t("abort"),pageNotice:t("page-notice"),modalNotice:t("modal-notice")};let i=this.nodes,r="bayit-9-"+ ++Bt;i.modalTitle.id=r+"-title",i.modal.setAttribute("aria-labelledby",i.modalTitle.id),i.confirmTitle.id=r+"-confirm",i.confirmText.id=r+"-message",i.confirm.setAttribute("aria-labelledby",i.confirmTitle.id),i.confirm.setAttribute("aria-describedby",i.confirmText.id),i.overview.onclick=()=>this.openPanel("overview",i.overview),i.settings.onclick=()=>this.openPanel("settings",i.settings),i.activity.onclick=()=>this.openPanel("activity",i.activity);for(let n of H)i.context[n].onclick=()=>this.openPanel(n,i.context[n]);i.close.onclick=()=>i.modal.close(),i.abort.onclick=()=>i.confirm.close(),i.accept.onclick=()=>this.acceptAction(),i.modal.addEventListener("close",()=>this.closePanel()),i.confirm.addEventListener("close",()=>{let n=this.confirming?.source;this.confirming=null,n?.isConnected&&!n.disabled&&n.focus({preventScroll:!0})});for(let n of[i.modal,i.confirm])n.addEventListener("click",s=>{let a=n.getBoundingClientRect();s.target===n&&(s.clientX<a.left||s.clientX>a.right||s.clientY<a.top||s.clientY>a.bottom)&&n.close()});this.roomViews=new Map,this.deviceViews=new Map,this.pending=new Map,this.roomScroll=new Map,this.preferences={},this.controller=Ie({getHass:()=>this._hass}),this.storageChange=n=>{n.key===this.config?.storageKey&&(this.readPreferences(),this.applyPreferences())}}static getStubConfig(){return{locale:"en",rooms:[]}}getCardSize(){return Math.max(2,Math.ceil((this.config?.rooms.length||0)/2)*3+1)}getGridOptions(){return{columns:12,min_columns:6,rows:"auto"}}setConfig(e){let t=Ut(e);this.config?.storageKey!==t.storageKey&&(this.preferences={}),this.nodes.confirm.open&&this.nodes.confirm.close(),this.nodes.modal.open&&this.nodes.modal.close(),this.config=t,this.words=le[t.locale];let i=this.nodes;i.shell.lang=t.locale,i.shell.dir=t.locale==="he"?"rtl":"ltr",C(i.title,t.title),C(i.empty,this.t("empty")),M(i.settings,this.t("settings")),M(i.activity,this.t("activity")),M(i.overview,this.t("overview")),i.overview.hidden=!t.overview.length;for(let r of H)M(i.context[r],this.t(r));M(i.close,this.t("close")),i.rooms.setAttribute("aria-label",this.t("rooms")),C(i.confirmTitle,this.t("confirm_title")),C(i.abort,this.t("cancel")),C(i.accept,this.t("confirm")),this.readPreferences(),this.buildRooms(),this.applyPreferences(),this.update()}set hass(e){this._hass=e,this.setup?.editor&&(this.setup.editor.hass=e),!(!this.isConnected||this.frame||!this.config)&&(this.frame=requestAnimationFrame(()=>{this.frame=0,this.update()}))}connectedCallback(){window.addEventListener("storage",this.storageChange),this.update()}disconnectedCallback(){window.removeEventListener("storage",this.storageChange),cancelAnimationFrame(this.frame),clearInterval(this.ticker),clearTimeout(this.noticeTimer),this.frame=this.ticker=0,this.nodes.confirm.open&&this.nodes.confirm.close(),this.nodes.modal.open&&this.nodes.modal.close()}t(e){return this.words?.[e]||e}readPreferences(){let e;try{e=JSON.parse(localStorage.getItem(this.config.storageKey)||"{}")}catch{return}this.preferences={};for(let[t,i]of Object.entries(Q))i.includes(e?.[t])&&(this.preferences[t]=e[t])}applyPreferences(){for(let e of Object.keys(Q))this.nodes.shell.dataset[e]=this.preferences[e]||this.config[e];for(let{article:e,heading:t}of this.roomViews.values())this.nodes.shell.dataset.layout==="header"&&e.firstElementChild!==t&&e.prepend(t),this.nodes.shell.dataset.layout!=="header"&&e.lastElementChild!==t&&e.append(t);if(this.panel?.type==="settings")for(let e of this.nodes.content.querySelectorAll("[data-preference]"))e.setAttribute("aria-pressed",String(e.value===this.nodes.shell.dataset[e.dataset.preference]))}setPreference(e,t){this.preferences[e]=t;try{localStorage.setItem(this.config.storageKey,JSON.stringify(this.preferences))}catch{}this.applyPreferences()}model(e){try{let t=Le(e,this._hass?.states??{});return{...t,icon:ee(t.icon,Pt[t.kind||t.domain])}}catch{return{...e,name:e.name||e.entity,icon:ee(e.icon),actions:{},attributes:{},state:"unavailable",available:!1}}}buildRooms(){let e=this.nodes;this.roomViews.clear(),e.rooms.replaceChildren();for(let t of this.config.rooms){let i=k("article","room");i.dataset.room=t.id;let r=I("room-title");M(r,t.name),r.setAttribute("aria-haspopup","dialog");let n=Y(this.config.locale==="he"?"mdi:chevron-left":"mdi:chevron-right");n.className="chevron";let s=k("span","room-count");s.setAttribute("aria-hidden","true"),r.append(Y(t.icon),k("span","room-name",t.name),s,n),r.onclick=()=>this.openPanel("room",r,t);let a=k("div","room-status"),d=Y("mdi:power-standby"),c=k("span");a.append(d,c);let u=k("div","quick"),g=new Map,m=new Map(t.entities.map(l=>[l.entity,l])),p=t.shortcuts?t.shortcuts.map(l=>m.get(l)):t.entities.filter(l=>jt.has(Xe(l))).slice(0,V);for(let l of p){let h=I("quick-button",l.name||l.entity,l.icon||"mdi:information-outline",!0);h.dataset.entity=l.entity,h.onclick=()=>{let v=this.model(l);if(this.pending.has(l.entity)&&v.domain!=="cover")return;let _=["light","switch","fan"].includes(v.domain)&&!l.kind&&!l.timed,w=v.state==="on"?"turn_off":"turn_on";_&&v.actions[w]&&!v.actions[w].requiresConfirmation?this.requestAction(l,w,void 0,h):this.openPanel("room",h,t,l.entity)},g.set(l.entity,h),u.append(h)}i.append(a,u,r),e.rooms.append(i),this.roomViews.set(t.id,{room:t,article:i,heading:r,count:s,status:a,statusIcon:d,statusText:c,shortcut:g})}e.empty.hidden=this.roomViews.size>0}tone(e){return e.available?e.domain==="cover"&&["open","opening","closing"].includes(e.state)?"moving":e.domain==="lock"&&["unlocked","unlocking","jammed"].includes(e.state)?"critical":e.timer?.state==="active"||["on","playing","cleaning"].includes(e.state)||["heating","cooling","drying","fan"].includes(e.attributes?.hvac_action)?"warm":"quiet":"quiet"}stateLabel(e){if(!e.available)return this.t("unavailable");let t=e.attributes||{},i=e.state,r=s=>tt.has(s)?this.t(s):String(s||this.t("unknown"));if(e.domain==="cover"){let s=K(t.current_position);return(i==="open"?this.t("opened"):r(i))+(s===null?"":" · "+Z(s+"%"))}if(e.domain==="sensor"&&t.unit_of_measurement)return Z(i+" "+t.unit_of_measurement);if(e.domain==="climate"){let s=K(t.current_temperature),a=this._hass?.config?.unit_system?.temperature||"°";return r(i)+(s===null?"":" · "+Z(s+" "+a))}if(tt.has(i))return r(i);let n=this._hass?.states?.[e.entity];return String(n&&this._hass?.formatEntityState?.(n)||i||this.t("unknown"))}update(){if(!this.config)return;let e=this.nodes,t=new Map;for(let[n,s]of this.roomViews){let a=0,d=!1,c,u;for(let m of s.room.entities){let p=this.model(m),l=this.tone(p);if(d||=!p.available,p.domain==="light"&&p.state==="on"&&a++,l!=="quiet"&&!t.has(m.entity)&&t.set(m.entity,{config:m,model:p,room:s.room}),!c&&p.available&&p.attributes?.device_class==="temperature"&&(c=this.stateLabel(p)),!u&&p.available&&p.domain==="climate"){let _=K(p.attributes.current_temperature);_!==null&&(u=Z(_+(this._hass?.config?.unit_system?.temperature||"°")))}let h=s.shortcut.get(m.entity);if(!h)continue;Ae(h.firstElementChild,p.icon),M(h,p.name+" · "+this.stateLabel(p)),h.dataset.tone=l,h.dataset.transition=["opening","closing"].includes(p.state)?p.state:"";let v=this.pending.has(m.entity);h.disabled=v&&p.domain!=="cover",h.setAttribute("aria-busy",String(v))}let g=c||u;s.status.hidden=!g&&!d,C(s.statusText,g||this.t("unavailable")),Ae(s.statusIcon,g?"mdi:thermometer":"mdi:alert-circle-outline"),C(s.count,a||this.t("off")),s.count.dataset.tone=a?"warm":"quiet",s.article.toggleAttribute("data-current",this.panel?.room?.id===n)}this.activeDevices=t,e.badge.hidden=!t.size,C(e.badge,t.size);let i=this.panel?.type;(i==="room"||i==="overview"||H.includes(i))&&this.updateDevices(),i==="activity"&&this.paintActivity();for(let n of H)e.context[n].hidden=!this.config.context[n].length&&(n!=="energy"||!this._hass?.panels?.energy);let r=this.config.context.presence.filter(n=>this._hass?.states?.[n.entity]?.state==="home").length;e.peopleBadge.hidden=!r,C(e.peopleBadge,r)}openPanel(e,t,i,r){if(!this.config)return;let n=this.nodes,s=t.getBoundingClientRect();n.modal.open||(this.restoreFocus=t),this.panel={type:e,room:i},this.setup=null,this.deviceViews.clear(),this.activitySignature=null,C(n.modalNotice,"");let a=i?.icon||t.querySelector("ha-icon")?.getAttribute("icon");n.modalTitle.replaceChildren(Y(a),e==="room"?i.name:this.t(e)),e==="room"&&this.buildDevices(i.entities,!0),e==="overview"&&this.buildDevices(this.config.overview),H.includes(e)&&this.buildDevices(this.config.context[e]),e==="energy"&&this._hass?.panels?.energy&&this.appendEnergyLink(),e==="settings"&&this.paintSettings(),e==="setup"&&this.paintSetup(),e==="activity"&&this.paintActivity(),n.modal.open||n.modal.showModal();let d=n.modal.getBoundingClientRect(),c=(g,m)=>Math.max(0,Math.min(m,g))+"px";n.modal.style.setProperty("--motion-x",c(s.left+s.width/2-d.left,d.width)),n.modal.style.setProperty("--motion-y",c(s.top+s.height/2-d.top,d.height)),n.close.focus({preventScroll:!0}),n.modalBody.scrollTop=i&&this.roomScroll.get(i.id)||0;let u=this.deviceViews.get(r)?.item;u&&(n.modalBody.scrollTop+=u.getBoundingClientRect().top-n.modalBody.getBoundingClientRect().top-12),this.update()}closePanel(){let e=this.nodes;if(e.modal.open)return;this.panel?.room&&this.roomScroll.set(this.panel.room.id,e.modalBody.scrollTop),this.panel=null,this.setup=null,this.deviceViews.clear(),clearInterval(this.ticker),this.ticker=0,this.update();let t=this.restoreFocus;this.restoreFocus=null,t?.isConnected&&t.focus({preventScroll:!0})}buildDevices(e,t=!1){let i=this.nodes.content;i.className="devices",t?i.dataset.room="true":delete i.dataset.room,i.replaceChildren(),e.length||i.append(k("p","empty",this.t("empty_room")));let r=new Map;for(let n of e){let s=i,a;if(t){let v=Xe(n);if(a=n.kind==="heater"||n.kind==="boiler"?"room_climate":Ft[v]||"room_devices",!r.has(a)){let _=k("section","device-group");_.dataset.group=a,_.append(k("h3","device-group-title",this.t(a))),i.append(_),r.set(a,_)}s=r.get(a)}let d=k("section","device");d.dataset.entity=n.entity;let c=k("header","device-head"),u=Y(n.icon||"mdi:information-outline");u.className="device-icon";let g=k("div","device-detail"),m=k(t?"h4":"h3","device-name"),p=k("span","current");g.append(m,p);let l=I("round-action",this.t("more_info"),"mdi:information-outline",!0);l.onclick=()=>this.moreInfo(n),c.append(u,g,l);let h=k("div","action-list");d.append(c,h),s.append(d),this.deviceViews.set(n.entity,{config:n,item:d,glyph:u,name:m,state:p,more:l,group:h,groupKey:a,fields:[]})}this.updateDevices()}appendEnergyLink(){let e=this.nodes.content;this.config.context.energy.length||e.replaceChildren();let t=k("a","control-button",this.t("open_energy"));t.href="/energy",e.prepend(t)}moreInfo(e){this.model(e).actions.more_info&&(this.nodes.modal.open&&(this.restoreFocus=null,this.nodes.modal.close()),this.dispatchEvent(new CustomEvent("hass-more-info",{detail:{entityId:e.entity},bubbles:!0,composed:!0})))}timerLabel(e){if(!e||["idle","unavailable"].includes(e.state))return"";if(e.remainingMs===null)return this.t(e.state);let t=Math.max(0,Math.ceil(e.remainingMs/1e3));return this.t("timed")+" · "+Z(Math.floor(t/60)+":"+String(t%60).padStart(2,"0"))}updateDevices(){let e=!1;for(let t of this.deviceViews.values()){let i=this.model(t.config);t.groupKey==="room_lights"&&(t.item.dataset.compact=String(!i.actions.set_brightness)),C(t.name,i.name),Ae(t.glyph,i.icon);let r=this.timerLabel(i.timer);i.timer?.state==="active"&&(e=!0),C(t.state,this.stateLabel(i)+(r?" · "+r:"")),t.state.dataset.tone=this.tone(i),t.more.hidden=!i.actions.more_info;let n=JSON.stringify(et.map(a=>i.actions[a]||null));n!==t.signature&&(t.signature=n,this.buildActions(t,i));let s=this.pending.has(t.config.entity);t.item.setAttribute("aria-busy",String(s));for(let a of t.group.querySelectorAll("button,input,select"))a.disabled=!this.canRequest(t.config.entity,a.dataset.action);for(let a of t.fields)this.syncField(a,i)}e&&!this.ticker&&this.isConnected&&(this.ticker=setInterval(()=>this.updateDevices(),1e3)),!e&&this.ticker&&(clearInterval(this.ticker),this.ticker=0)}paintSettings(){let e=this.nodes.content;if(e.className="settings",e.replaceChildren(),this._hass?.user?.is_admin){let t=I("control-button setup-entry",this.t("setup"),"mdi:tune-variant");t.onclick=()=>this.openPanel("setup",t),e.append(t)}for(let[t,i]of Object.entries(Q)){let r=k("fieldset","prefs-group");r.append(k("legend","",this.t(t)));let n=k("div","prefs-options");for(let s of i){let a=I("control-button",this.t(s));if(t==="background"){let d=k("span","swatch");d.style.background=zt[s],d.setAttribute("aria-hidden","true"),a.prepend(d)}a.value=s,a.dataset.preference=t,a.onclick=()=>this.setPreference(t,s),n.append(a)}r.append(n),e.append(r)}this.applyPreferences()}async paintSetup(){let e=this.panel,t=this.nodes.content,i=k("p","setup-status",this.t("setup_loading"));i.setAttribute("role","status"),t.className="setup-page",t.replaceChildren(i);let r=n=>this.t(["setup_storage","setup_conflict"].includes(n.code)?n.code:"setup_error");try{let n=await Ye(this._hass,location.pathname);if(this.panel!==e)return;let s=customElements.get("ll-strategy-dashboard-"+D).getConfigElement();s.classList.add("setup-editor"),s.setConfig(structuredClone(n.strategy)),s.hass=this._hass,this.setup={editor:s};let a=n.strategy,d=I("control-button",this.t("setup_save"),"mdi:content-save-outline");d.disabled=!0,s.addEventListener("config-changed",u=>{a=u.detail.config,d.disabled=JSON.stringify(a)===JSON.stringify(n.strategy)}),d.onclick=async()=>{d.disabled=!0,s.inert=!0,i.textContent=this.t("setup_saving");try{await We(this._hass,n,a),location.reload()}catch(u){if(this.panel!==e)return;i.textContent=r(u),s.inert=!1,d.disabled=u.code==="setup_conflict"}};let c=k("div","setup-footer");i.textContent="",c.append(i,d),t.replaceChildren(s,c)}catch(n){this.panel===e&&(i.textContent=r(n))}}paintActivity(){let e=[...(this.activeDevices||new Map).values()],t=JSON.stringify(e.map(({model:n,room:s})=>[n.entity,n.name,this.stateLabel(n),s.id]));if(t===this.activitySignature)return;this.activitySignature=t;let i=this.nodes.content;i.className="";let r=k("ul","activity-list");for(let{model:n,room:s,config:a}of e){let d=k("li"),c=I("control-button");c.append(k("span","",n.name+" · "+s.name),k("span","",this.stateLabel(n))),c.onclick=()=>this.openPanel("room",c,s,a.entity),d.append(c),r.append(d)}i.replaceChildren(e.length?r:k("p","empty",this.t("quiet")))}actionLabel(e){return this.t(e==="close"?"close_device":e)}buildActions(e,t){let i=this.shadowRoot.activeElement,r=i&&e.group.contains(i)?i.dataset.action:void 0;e.fields=[];let n=k("div","basic-actions"),s=[];for(let a of et){let d=t.actions[a];if(!d)continue;if(Ze.has(a)||d.options||typeof d.min=="number"||["set_temperature_range","start_timed"].includes(a)){s.push(this.buildField(e,d,a,t));continue}let c=this.actionLabel(a),u=I("control-button",c,It[a]);M(u,c),u.dataset.action=a,u.onclick=()=>this.requestAction(e.config,a,void 0,u),n.append(u)}e.group.replaceChildren(...n.childElementCount?[n]:[],...s),r&&([...e.group.querySelectorAll("[data-action]")].find(d=>d.dataset.action===r)||e.more).focus({preventScroll:!0})}numberInput(e,t){let i=k("input");i.type=t;for(let r of["min","max","step"])typeof e[r]=="number"&&(i[r]=String(e[r]));return t==="number"&&e.step==null&&(i.step="any"),i}buildField(e,t,i,r){let n=k("div","field-row"),s=i==="start_timed"?this.t("duration"):this.actionLabel(i),a=k("label","",s),d=Ze.has(i),c={action:t,id:i};if(t.options){c.input=k("select");for(let m of t.options){let p=k("option","",this.t(m));p.value=m,c.input.append(p)}}else c.input=this.numberInput(t,d?"range":"number");c.input.dataset.action=i,a.append(c.input),i==="set_temperature_range"&&(c.input.setAttribute("aria-label",s+" · "+this.t("min")),c.second=this.numberInput(t,"number"),c.second.dataset.action=i,c.second.setAttribute("aria-label",s+" · "+this.t("max")),a.append(c.second)),d&&(c.output=k("output","duration-label"),a.append(c.output));let u=()=>{c.dirty=!0,c.output&&C(c.output,c.input.value+"%")};c.input.addEventListener("input",u),c.second?.addEventListener("input",u);let g=I("control-button",i==="start_timed"?this.actionLabel(i):this.t("apply"));return g.dataset.action=i,M(g,i==="start_timed"?this.actionLabel(i):this.t("apply")+" · "+s),g.onclick=()=>{let m=c.input.localName==="select"?c.input.value:c.input.valueAsNumber,p=c.second?{low:c.input.valueAsNumber,high:c.second.valueAsNumber}:m;this.requestAction(e.config,i,p,g)},e.fields.push(c),this.syncField(c,r),n.append(a,g),n}syncField(e,t){let{id:i,input:r,second:n,action:s}=e,a=this.shadowRoot.activeElement;if(e.dirty||a===r||n&&a===n)return;let d=t.attributes;if(n)r.value=String(d.target_temp_low??s.min??18),n.value=String(d.target_temp_high??s.max??25);else if(i==="set_hvac_mode")r.value=t.state;else if(i==="start_timed")r.value=String(s.min??15);else if(i==="set_heating_level")r.value=String(K(t.level)??s.min);else if(i==="set_brightness"){let c=K(d.brightness);r.value=String(c===null?s.min??0:Math.round(c/255*100))}else r.localName==="select"?r.value=d[Qe[i]]??r.options[0]?.value??"":r.value=String(K(d[Qe[i]])??s.min??0);r.localName==="select"&&r.selectedIndex===-1&&(r.selectedIndex=0),e.output&&C(e.output,r.value+"%")}canRequest(e,t){let i=this.pending.get(e);return!i||t==="stop"&&Ht.has(i.id)}requestAction(e,t,i,r){if(!this.canRequest(e.entity,t))return;let n=this.model(e),s=n.actions[t];if(!s)return;if(s.requiresCode)return this.moreInfo(e);if(!s.requiresConfirmation)return this.send(e,t,i);this.confirming={config:e,id:t,value:i,source:r};let a=this.nodes;C(a.confirmText,this.t("confirm_action").replace("{name}",n.name).replace("{action}",this.actionLabel(t))),a.confirm.open||a.confirm.showModal(),a.abort.focus({preventScroll:!0})}acceptAction(){let e=this.confirming;if(!(!e||!this.nodes.confirm.open))return this.nodes.confirm.close(),this.send(e.config,e.id,e.value,!0)}async send(e,t,i,r=!1){if(!this.canRequest(e.entity,t))return;let n=this.model(e);if(!n.actions[t])return;let s={id:t};this.pending.set(e.entity,s),this.announce(this.t("sending").replace("{name}",n.name)),this.update();try{let a=await this.controller.execute(e,t,i,{confirmed:r});if(this.pending.get(e.entity)!==s)return;let d=["confirmed","sent","unconfirmed"].includes(a?.status)?a.status:"sent";if(this.announce(this.t(d).replace("{name}",n.name)),a?.status==="confirmed")for(let c of this.deviceViews.get(e.entity)?.fields||[])c.id===t&&(c.dirty=!1)}catch{this.pending.get(e.entity)===s&&this.announce(this.t("send_error"))}finally{this.pending.get(e.entity)===s&&(this.pending.delete(e.entity),this.isConnected&&this.update())}}announce(e){if(!this.isConnected)return;clearTimeout(this.noticeTimer);let t=this.nodes;C(t.pageNotice,""),C(t.modalNotice,"");let i=t.modal.open?t.modalNotice:t.pageNotice;C(i,e),this.noticeTimer=setTimeout(()=>C(i,""),5200)}};customElements.get("bayit-dashboard")||(customElements.define("bayit-dashboard",Ce),window.customCards||=[],window.customCards.push({type:"bayit-dashboard",name:"Bayit 9",description:"A room-based Home Assistant dashboard.",preview:!1}));var Vt={en:{title:"Dashboard title",language:"Language",automatic:"Home Assistant language",areas:"Rooms",unassigned:"Include devices without a room",roomSelection:"Rooms on the dashboard",allRooms:"Automatic",selectedRooms:"Choose rooms and order",roomToAdd:"Available rooms",addRoom:"Show room",createRoom:"New dashboard-only room",newRoomName:"New room name",newRoomHint:"This room exists only on this dashboard.",roomName:"Room display name",roomToEdit:"Room to customize",roomIcon:"Room icon",defaultRoomIcon:"Default icon",newRoom:"Create room",customRoom:"Dashboard room",deleteRoom:"Delete dashboard room",noRooms:"No rooms to customize yet.",moveUp:"Move up",moveDown:"Move down",hideRoom:"Hide room",automaticDevices:"Automatic",manualDevices:"Choose devices and order",roomDevices:"Devices in this room",deviceToAdd:"Available devices",addDevice:"Add device",noDevices:"No devices selected.",noMatches:"No matching devices",missing:"Unavailable",atLeastOneRoom:"Keep one room selected, or switch back to automatic.",discovery:"Automatic device selection",controls:"Controls only",allDevices:"All supported devices",appearance:"Appearance",background:"Wallpaper",layout:"Room titles",shape:"Button shape",classic:"Alongside the controls",header:"At the top",soft:"Rounded",circle:"Circle",square:"Square",devices:"Device visibility",hidden:"Hide devices",included:"Add other entities",overview:"Home overview",overviewDevices:"Devices and sensors to show",overviewHint:"Choose devices for the overview button, such as a lock, people, a calendar or an energy sensor.",shortcuts:"Room shortcuts",shortcutRoom:"Room",automaticShortcuts:"Choose shortcuts automatically",shortcut:"Shortcut",shortcutHint:"Pick up to six devices in display order. All devices remain available inside the room.",noShortcutRooms:"Add a device to a visible room to set its shortcuts.",profiles:"Boiler and heater controls",entity:"Heating device",kind:"Control profile",heater:"Room heater",boiler:"Water heater or boiler",displayName:"Display name",start:"Scheduled start script",stop:"Stop script",timer:"Timer",none:"None",level:"Heating level entity",durationField:"Duration field",min:"Shortest run in minutes",max:"Longest run in minutes",step:"Step in minutes",add:"Add profile",save:"Save profile",edit:"Edit",remove:"Remove",clear:"Cancel",choose:"Select a device",invalid:"Select a heating device to save the profile.",hint:"Select the Home Assistant entities that already control this device. Use a server-side start script for timed heating.",units:"minutes",searchable:"Filter entities"},he:{title:"שם הדשבורד",language:"שפה",automatic:"שפת Home Assistant",areas:"חדרים",unassigned:"הצגת מכשירים ללא חדר",roomSelection:"חדרים בדשבורד",allRooms:"בחירה אוטומטית",selectedRooms:"בחירת חדרים וסדר",roomToAdd:"חדרים זמינים",addRoom:"הצגת חדר",createRoom:"חדר חדש לדשבורד",newRoomName:"שם החדר החדש",newRoomHint:"החדר יופיע בדשבורד הזה בלבד.",roomName:"שם החדר לתצוגה",roomToEdit:"חדר להתאמה אישית",roomIcon:"סמל החדר",defaultRoomIcon:"סמל ברירת המחדל",newRoom:"יצירת חדר",customRoom:"חדר בדשבורד",deleteRoom:"מחיקת חדר מהדשבורד",noRooms:"עדיין אין חדרים להתאמה.",moveUp:"העברה למעלה",moveDown:"העברה למטה",hideRoom:"הסתרת חדר",automaticDevices:"בחירה אוטומטית",manualDevices:"בחירת מכשירים וסדר",roomDevices:"מכשירים בחדר",deviceToAdd:"מכשירים זמינים",addDevice:"הוספת מכשיר",noDevices:"לא נבחרו מכשירים.",noMatches:"לא נמצאו מכשירים מתאימים",missing:"לא זמין",atLeastOneRoom:"השאירו חדר אחד לפחות, או חזרו לבחירה אוטומטית.",discovery:"בחירת מכשירים אוטומטית",controls:"מכשירים נשלטים בלבד",allDevices:"כל המכשירים הנתמכים",appearance:"מראה",background:"רקע",layout:"שמות חדרים",shape:"צורת כפתורים",classic:"לצד הכפתורים",header:"בראש הכרטיס",soft:"מעוגל",circle:"עיגול",square:"ריבוע",devices:"הצגת מכשירים",hidden:"הסתרת מכשירים",included:"הוספת ישויות נוספות",overview:"מבט על הבית",overviewDevices:"מכשירים וחיישנים לתצוגה",overviewHint:"בחרו מה יוצג במבט על הבית, למשל מנעול, אנשים, יומן או חיישן צריכת חשמל.",shortcuts:"קיצורים בחדרים",shortcutRoom:"חדר",automaticShortcuts:"בחירת קיצורים אוטומטית",shortcut:"קיצור",shortcutHint:"אפשר לבחור עד שישה מכשירים לפי סדר התצוגה. כל המכשירים נשארים זמינים בתוך החדר.",noShortcutRooms:"הוסיפו מכשיר לחדר שמוצג בדשבורד כדי לבחור קיצורים.",profiles:"שליטה בדוד ובתנורים",entity:"מכשיר חימום",kind:"סוג בקר",heater:"תנור חימום",boiler:"דוד או מחמם מים",displayName:"שם לתצוגה",start:"סקריפט הפעלה עם זמן",stop:"סקריפט כיבוי",timer:"טיימר",none:"ללא",level:"ישות עוצמת חימום",durationField:"שדה משך",min:"זמן מינימלי בדקות",max:"זמן מקסימלי בדקות",step:"מרווח בחירה בדקות",add:"הוספת בקר",save:"שמירת בקר",edit:"עריכה",remove:"הסרה",clear:"ביטול",choose:"בחירת מכשיר",invalid:"בחרו מכשיר חימום לפני השמירה.",hint:"בחרו את הישויות שכבר שולטות במכשיר ב־Home Assistant. לחימום מתוזמן, השתמשו בסקריפט שפועל בשרת.",units:"דקות",searchable:"סינון ישויות"}},rt={"mdi:home-outline":{en:"Home",he:"בית"},"mdi:sofa-outline":{en:"Living room",he:"סלון"},"mdi:stove":{en:"Kitchen",he:"מטבח"},"mdi:bed-outline":{en:"Bedroom",he:"חדר שינה"},"mdi:shower":{en:"Bathroom",he:"מקלחת"},"mdi:desk":{en:"Office",he:"משרד"},"mdi:toy-brick-outline":{en:"Playroom",he:"חדר משחקים"},"mdi:washing-machine":{en:"Laundry",he:"כביסה"},"mdi:garage-variant":{en:"Garage",he:"חניה"},"mdi:tree-outline":{en:"Garden",he:"גינה"},"mdi:floor-plan":{en:"Hallway",he:"מסדרון"},"mdi:door-open":{en:"Entrance",he:"כניסה"}},$t=":host { display: block; color: var(--primary-text-color); }form { display: grid; gap: 14px; padding-block: 8px; }label.field { display: grid; gap: 6px; min-width: 0; font-weight: 600; }input:not([type=checkbox]),select { width: 100%; box-sizing: border-box; min-height: 44px; border: 1px solid var(--divider-color,#999); border-radius: 8px; padding: 8px 10px; font: inherit; color: inherit; background: var(--card-background-color,#fff); }input[type=checkbox] { inline-size: 18px; block-size: 18px; flex: none; margin-inline: 0 9px; }input,select,button,summary { accent-color: var(--primary-color,#03a9f4); }select[multiple] { min-height: 106px; }label.check { min-block-size: 42px; display: flex; align-items: center; }details,fieldset { border: 1px solid var(--divider-color,#999); border-radius: 10px; padding: 8px 12px 12px; min-inline-size: 0; }summary { padding-block: 8px; min-block-size: 24px; font-weight: 650; cursor: pointer; }.stack { display: grid; gap: 12px; margin-block-start: 8px; }.grid { display: grid; gap: 10px; grid-template-columns: repeat(2,minmax(0,1fr)); }.actions,.record { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }.record { padding-block: 5px; border-block-end: 1px solid var(--divider-color,#999); }.record span { flex: 1; overflow-wrap: anywhere; }button { min-height: 42px; border-radius: 8px; border: 1px solid var(--primary-color,#0277bd); color: var(--primary-text-color); background: var(--card-background-color,#fff); cursor: pointer; padding: 6px 10px; font: inherit; }[hidden] { display: none !important; }p { margin: 0; color: var(--secondary-text-color); font-size: .95em; }.error { color: var(--error-color,#b00020); }:focus-visible { outline: 2px solid var(--primary-color,#03a9f4); outline-offset: 2px; }@media (max-width: 340px) { .grid { grid-template-columns: minmax(0,1fr); } }",Kt=`
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
`;function st(o){for(let e in o??{})if(Object.hasOwn(o,e))return!0;return!1}function Ne(o){return Array.isArray(o)?[...new Set(o.filter(e=>typeof e=="string"&&e.trim()))]:[]}function at(o,e,t){let i=[...o],r=e+t;return[i[e],i[r]]=[i[r],i[e]],i}function ct(o,e,t,i,r=!1,n=""){return y("ul",{className:"room-list"},o.map((s,a)=>{let d=(c,u,g,m,p)=>{let l=P(c,p);return l.setAttribute("aria-label",u+" · "+s.name),l.title=u,l.disabled=g,l.dataset.roomFocus=n+":"+s.id+":"+m,l};return y("li",{className:"room-entry"},[y("span",{className:"room-entry-name"},[s.name,...s.secondary?[y("small",{textContent:s.secondary})]:[]]),y("span",{className:"room-entry-buttons"},[d("↑",t.moveUp,a===0,"up",()=>e(at(o,a,-1),n+":"+s.id+":up")),d("↓",t.moveDown,a===o.length-1,"down",()=>e(at(o,a,1),n+":"+s.id+":down")),d("×",i,r&&o.length===1,"remove",()=>e(o.filter(c=>c.id!==s.id)))])])}))}function dt(o,e,t,i,r){let n=O([["",i],...e],""),s=P(t,()=>{n.value&&r(n.value)});return s.disabled=!0,n.addEventListener("change",()=>{s.disabled=!n.value}),{input:n,action:s,wrapper:y("div",{className:"room-add"},[S(o,n),s])}}function Yt(o,e){let t=o.entities?.[e],i=o.devices?.[t?.device_id??t?.di];return t?.area_id??t?.ai??i?.area_id??i?.ai}function y(o,e={},t=[]){let i=Object.assign(document.createElement(o),e);return i.append(...t),i}function lt(o,e,t){let i=y("input",{type:"checkbox",checked:e});return i.addEventListener("change",()=>t(i.checked)),y("label",{className:"check"},[i,o])}function ce(o,e){return y("option",{value:o,textContent:e})}function O(o,e){let t=y("select",{},o.map(([i,r])=>ce(i,r)));return t.value=e,t}var Wt=0;function S(o,e){let t=y("span",{id:"bayit9-editor-label-"+ ++Wt,textContent:o});return e.setAttribute("aria-labelledby",t.id),y("label",{className:"field"},[t,e])}function P(o,e){let t=y("button",{type:"button",textContent:o});return t.addEventListener("click",e),t}function Re(o,e){return Object.entries(o.states??{}).filter(([t])=>!e||e.has(t.split(".")[0])).map(([t,i])=>{let r=i.attributes?.friendly_name;return[t,r&&r!==t?r+" · "+t:t]}).sort((t,i)=>t[1].localeCompare(i[1]))}function B(o,e,t,i){let r=y("summary",{textContent:o}),n=y("details",{open:e},[r,...i]);return r.addEventListener("click",()=>t(!n.open)),n.addEventListener("toggle",()=>{n.isConnected&&t(n.open)}),n}var de=class extends HTMLElement{#t={};#e={type:"custom:"+D};#i={};#r;#p;#c;#s="";#l="";#a=!1;#u;constructor(){super(),this.attachShadow({mode:"open"})}set hass(e){let t=this.#t;this.#t=e??{},(t.areas!==this.#t.areas||t.entities!==this.#t.entities||t.devices!==this.#t.devices||!st(t.states)&&st(this.#t.states)||(t.locale?.language??t.language)!==(e?.locale?.language??e?.language))&&this.render()}setConfig(e){this.#e={type:"custom:"+D,...e};let t=JSON.stringify(this.#e);t!==this.#u&&(this.#u=t,this.render())}connectedCallback(){this.render()}#o(e){this.#e={...this.#e,...e},this.#u=JSON.stringify(this.#e),this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:this.#e},bubbles:!0,composed:!0}))}#n(e,t){if(this.#o(e),this.render(),!t)return;let i=[...this.shadowRoot.querySelectorAll("[data-room-focus]")];(i.find(n=>n.dataset.roomFocus===t&&!n.disabled)??i.find(n=>!n.disabled&&n.dataset.roomFocus===t.replace(/:(up|down)$/,(s,a)=>a==="up"?":down":":up")))?.focus({preventScroll:!0})}#h(e){let t=this.#e.room_overrides??{};return Object.hasOwn(t,e)&&t[e]&&typeof t[e]=="object"?t[e]:{}}#d(e,t,i){let r={...this.#e.room_overrides};Object.keys(t).length?r[e]=t:delete r[e],this.#n({room_overrides:r},i)}#f(e,t,i,r){let n=[["",i.defaultRoomIcon],...Object.entries(rt).map(([c,u])=>[c,u[r]])],s=typeof t.icon=="string"?t.icon:"";s&&!Object.hasOwn(rt,s)&&n.push([s,s]);let a=O(n,s);a.dataset.roomFocus="room-icon",a.addEventListener("change",()=>{let c={...t};a.value?c.icon=a.value:delete c.icon,this.#d(e.id,c,"room-icon")});let d=y("ha-icon");return d.setAttribute("icon",e.icon||"mdi:home-outline"),d.setAttribute("aria-hidden","true"),y("div",{className:"room-icon-field"},[S(i.roomIcon,a),y("span",{className:"room-icon-preview"},[d])])}#g(e,t,i,r){let n=this.#h(e.id),s=e.custom||Array.isArray(n.entities),a=O([["auto",t.automaticDevices],["manual",t.manualDevices]],s?"manual":"auto");a.dataset.roomFocus="room-device-mode",a.addEventListener("change",()=>{let b={...n};a.value==="auto"?delete b.entities:b.entities=$({...this.#e,area_ids:[e.id]},this.#t,i).find(f=>f.id===e.id)?.entities.map(f=>f.entity)??[],this.#d(e.id,b,"room-device-mode")});let d=e.custom?[y("h4",{className:"room-choice-heading",textContent:t.roomDevices})]:[S(t.roomDevices,a)];if(!s)return d;let c=new Map(r.map(b=>[b.id,b.name])),u=new Map(Be(this.#e,this.#t).map(b=>[b.entity,b])),g=Ne(n.entities),m=g.map(b=>{let f=u.get(b),x=this.#t.states?.[b]?.attributes?.friendly_name;return{id:b,name:f?.name||x||b,secondary:f?"":t.missing}}),p=(b,f)=>this.#d(e.id,{...n,entities:b.map(x=>x.id)},f);d.push(m.length?ct(m,p,t,t.remove,!1,"devices"):y("p",{textContent:t.noDevices}));let l=new Set(g),h=[...u.values()].filter(b=>!l.has(b.entity)).map(b=>({id:b.entity,name:b.name||b.entity,area:Yt(this.#t,b.entity)}));h.sort((b,f)=>+(f.area===e.id)-+(b.area===e.id)||b.name.localeCompare(f.name,i));let v=new Map;for(let b of h)v.set(b.name,(v.get(b.name)??0)+1);let _=dt(t.deviceToAdd,[],t.addDevice,t.choose,b=>{this.#d(e.id,{...n,entities:[...g,b]},"room-device-picker")});_.input.dataset.roomFocus="room-device-picker";let w=y("input",{type:"search",placeholder:t.searchable,value:this.#s});w.dataset.roomFocus="room-device-search";let A=()=>{let b=w.value.trim().toLocaleLowerCase(i),f=h.filter(x=>{let N=c.get(x.area)??"";return(x.name+" "+N+" "+x.id).toLocaleLowerCase(i).includes(b)});_.input.replaceChildren(ce("",f.length?t.choose:t.noMatches),...f.map(x=>{let N=x.name,L=x.area!==e.id&&c.get(x.area),j=v.get(N)>1?[L,x.id].filter(Boolean).join(" · "):L;return ce(x.id,j?N+" · "+j:N)})),_.input.disabled=!f.length,_.action.disabled=!0};return w.addEventListener("input",()=>{this.#s=w.value,A()}),A(),d.push(S(t.searchable,w),_.wrapper),d}#b(e,t,i){let r=y("input",{maxLength:80,value:this.#l});r.dataset.roomFocus="new-room-name";let n=P(i.newRoom,()=>{let s=r.value.trim();if(!s)return;let a=new Set([...e.map(g=>g.id),...Ne(this.#e.area_ids),...Object.keys(this.#e.room_overrides??{})]),d=1;for(;a.has(ve+d);)d++;let c=ve+d,u={room_overrides:{...this.#e.room_overrides,[c]:{name:s,entities:[]}}};(t.length||this.#a)&&(u.area_ids=[...t,c]),this.#a=!1,this.#l="",this.#i.newRoom=!1,this.#c=c,this.#s="",this.#n(u,"room-edit")});return n.disabled=!this.#l.trim(),r.addEventListener("input",()=>{this.#l=r.value,n.disabled=!r.value.trim()}),r.addEventListener("keydown",s=>{s.key==="Enter"&&!s.isComposing&&(s.preventDefault(),n.disabled||n.click())}),B(i.createRoom,this.#i.newRoom,s=>{this.#i.newRoom=s},[y("div",{className:"stack"},[y("p",{textContent:i.newRoomHint}),y("div",{className:"room-add"},[S(i.newRoomName,r),n])])])}#v(e,t){let i=He(this.#e,this.#t).sort((p,l)=>p.name.localeCompare(l.name,t)),r=new Map(i.map(p=>[p.id,p])),n=Ne(this.#e.area_ids),s=n.length>0||this.#a,a=O([["auto",e.allRooms],["custom",e.selectedRooms]],s?"custom":"auto");a.dataset.roomFocus="room-mode",a.addEventListener("change",()=>{if(a.value==="auto"){this.#a=!1,this.#n({area_ids:[]},"room-mode");return}let p=$(this.#e,this.#t,t).map(l=>l.id).filter(l=>r.has(l));p.length?this.#n({area_ids:p},"room-mode"):(this.#a=!0,this.render(),this.shadowRoot.querySelector('[data-room-focus="room-mode"]')?.focus({preventScroll:!0}))});let d=O([["all",e.allDevices],["controls",e.controls]],this.#e.discovery_mode==="controls"?"controls":"all");d.dataset.roomFocus="room-discovery",d.addEventListener("change",()=>this.#n({discovery_mode:d.value},"room-discovery"));let c=lt(e.unassigned,this.#e.show_unassigned!==!1,p=>this.#n({show_unassigned:p},"room-unassigned"));c.firstElementChild.dataset.roomFocus="room-unassigned";let u=[S(e.roomSelection,a),S(e.discovery,d),c];if(s){let p=n.map(v=>({id:v,name:r.get(v)?.name??v,secondary:r.get(v)?.custom?e.customRoom:r.has(v)?"":e.missing}));p.length&&u.push(ct(p,(v,_)=>this.#n({area_ids:v.map(w=>w.id)},_),e,e.hideRoom,!0,"rooms")),p.length<=1&&u.push(y("p",{className:"room-picker-hint",textContent:e.atLeastOneRoom}));let l=new Set(n),h=i.filter(v=>!l.has(v.id));if(h.length){let v=dt(e.roomToAdd,h.map(_=>[_.id,_.name]),e.addRoom,e.none,_=>{this.#a=!1,this.#c=_,this.#s="",this.#n({area_ids:[...n,_]},"room-edit")});u.push(v.wrapper)}}let g=s?n.map(p=>r.get(p)).filter(Boolean):i,m=g.find(p=>p.id===this.#c)??g[0];if(m){let p=O(g.map(w=>[w.id,w.name]),m.id);p.dataset.roomFocus="room-edit",p.addEventListener("change",()=>{this.#c=p.value,this.#s="",this.render(),this.shadowRoot.querySelector('[data-room-focus="room-edit"]')?.focus({preventScroll:!0})});let l=this.#h(m.id),h=y("input",{value:l.name??"",maxLength:80,placeholder:m.name,required:!!m.custom});h.dataset.roomFocus="room-name";let v=()=>{let w=h.value.trim();if(!w&&m.custom){h.value=l.name??m.name;return}if(w===(l.name??""))return;let A={...l};w?A.name=w:delete A.name,this.#d(m.id,A,"room-name")};h.addEventListener("change",v),h.addEventListener("keydown",w=>{w.key==="Enter"&&!w.isComposing&&(w.preventDefault(),v())});let _=[S(e.roomToEdit,p),S(e.roomName,h),this.#f(m,l,e,t),...this.#g(m,e,t,i)];if(m.custom){let w=P(e.deleteRoom,()=>{let A={...this.#e.room_overrides};delete A[m.id];let b={...this.#e.room_shortcuts};delete b[m.id],this.#c=void 0,this.#s="",this.#n({room_overrides:A,area_ids:n.filter(f=>f!==m.id),room_shortcuts:b},"room-mode")});w.className="room-danger",_.push(w)}u.push(..._)}else u.push(y("p",{textContent:e.noRooms}));return u.push(this.#b(i,n,e)),[y("div",{className:"stack"},u)]}#m(e,t,i,r=Re(this.#t)){let n=y("input",{type:"search",placeholder:i.searchable}),s=y("select",{multiple:!0,size:4});n.setAttribute("aria-label",i.searchable+" · "+e);let a=()=>{let d=n.value.trim().toLocaleLowerCase(),c=new Set(this.#e[t]??[]);s.replaceChildren(...r.filter(u=>c.has(u[0])||!d||u[1].toLocaleLowerCase().includes(d)).map(([u,g])=>y("option",{value:u,textContent:g,selected:c.has(u)})))};return n.addEventListener("input",a),s.addEventListener("change",()=>this.#o({[t]:[...s.selectedOptions].map(d=>d.value)})),a(),y("div",{className:"stack"},[n,S(e,s)])}#y(e,t){let i=$(this.#e,this.#t,t);if(!i.length)return[y("p",{textContent:e.noShortcutRooms})];let r=i.find(l=>l.id===this.#p)??i[0],n=this.#e.room_shortcuts??{},s=Object.hasOwn(n,r.id)&&Array.isArray(n[r.id])?n[r.id]:null,a=O(i.map(l=>[l.id,l.name]),r.id),d=new Map(r.entities.map(l=>[l.entity,l.name||l.entity]));for(let l of s??[])typeof l=="string"&&!d.has(l)&&d.set(l,l);let c=Array.from({length:V},(l,h)=>{let v=s?.[h]??"";return O([["",e.none],...d],v)}),u=y("div",{className:"grid",hidden:s==null},c.map((l,h)=>S(e.shortcut+" "+(h+1),l))),g=()=>{let l=new Set(c.map(h=>h.value).filter(Boolean));for(let h of c)for(let v of h.options)v.disabled=v.value!==h.value&&l.has(v.value)},m=()=>{this.#o({room_shortcuts:{...this.#e.room_shortcuts,[r.id]:c.map(l=>l.value).filter(Boolean)}})};g();for(let l of c)l.addEventListener("change",()=>{g(),m()});a.addEventListener("change",()=>{this.#p=a.value,this.render()});let p=lt(e.automaticShortcuts,s==null,l=>{if(u.hidden=l,l){let h={...this.#e.room_shortcuts};delete h[r.id],this.#o({room_shortcuts:h})}else m()});return[y("p",{textContent:e.shortcutHint}),S(e.shortcutRoom,a),p,u]}#_(e){let t=Array.isArray(this.#e.profiles)?this.#e.profiles:[],i=[y("p",{textContent:e.hint})];for(let b of t)b?.entity&&i.push(y("div",{className:"record"},[y("span",{textContent:b.name||this.#t.states?.[b.entity]?.attributes?.friendly_name||b.entity}),P(e.edit,()=>{this.#r=b,this.render()}),P(e.remove,()=>{this.#r?.entity===b.entity&&(this.#r=void 0),this.#o({profiles:t.filter(f=>f.entity!==b.entity)}),this.render()})]));if(this.#r==null)return i.push(y("div",{className:"actions"},[P(e.add,()=>{this.#r={},this.render()})])),i;let r=this.#r,n=r.timed??{},s=O([["",e.choose],...Re(this.#t,new Set(_e))],r.entity||"");r.entity&&!s.value&&(s.append(ce(r.entity,r.entity)),s.value=r.entity);let a=O([["heater",e.heater],["boiler",e.boiler]],r.kind||"heater"),d=y("input",{value:r.name??"",maxLength:80}),c=(b,f)=>{let x=Re(this.#t,new Set([b]));return f&&!x.some(([N])=>N===f)&&x.unshift([f,f]),O([["",e.none],...x],f||"")},u=c("number",r.level_entity),g=c("script",n.start_script),m=c("script",n.stop_script),p=c("timer",n.timer_entity),l=y("input",{value:n.duration_field||"duration",maxLength:40}),h=b=>y("input",{type:"number",min:"1",max:"360",value:String(b)}),v=h(n.min_minutes??15),_=h(n.max_minutes??60),w=h(n.step_minutes??15),A=y("p",{className:"error",hidden:!0,textContent:e.invalid});return A.setAttribute("role","alert"),i.push(S(e.entity,s),S(e.kind,a),S(e.displayName,d),S(e.level,u),S(e.start,g),S(e.stop,m),S(e.timer,p),S(e.durationField,l),y("div",{className:"grid"},[S(e.min,v),S(e.max,_),S(e.step,w)]),A,y("div",{className:"actions"},[P(e.save,()=>{let b=we({entity:s.value,kind:a.value,name:d.value,level_entity:u.value,timed:{start_script:g.value,stop_script:m.value,timer_entity:p.value,duration_field:l.value,min_minutes:v.valueAsNumber,max_minutes:_.valueAsNumber,step_minutes:w.valueAsNumber}});if(!b){A.hidden=!1,s.focus();return}this.#r=void 0,this.#o({profiles:[...t.filter(f=>f.entity!==r.entity&&f.entity!==b.entity),b]}),this.render()}),P(e.clear,()=>{this.#r=void 0,this.render()})])),i}render(){if(!this.isConnected)return;let e=ae(this.#e.locale,this.#t),t=Vt[e],i=y("input",{value:this.#e.title??"",maxLength:80});i.addEventListener("change",()=>this.#o({title:i.value.trim()}));let r=O([["auto",t.automatic],["en","English"],["he","עברית"]],this.#e.locale??"auto");r.addEventListener("change",()=>{this.#o({locale:r.value}),this.render()});let n=(c,u,g,m)=>{let p=O(g,this.#e[u]??m);return p.addEventListener("change",()=>this.#o({[u]:p.value})),S(c,p)},s=Object.entries(ye).map(([c,u])=>[c,u[e]]),a=$(this.#e,this.#t,e).flatMap(c=>c.entities.map(u=>[u.entity,(u.name||u.entity)+" · "+c.name])),d=y("form",{dir:e==="he"?"rtl":"ltr"},[S(t.title,i),S(t.language,r),B(t.areas,this.#i.rooms,c=>{this.#i.rooms=c},this.#v(t,e)),B(t.appearance,this.#i.appearance,c=>{this.#i.appearance=c},[y("div",{className:"stack"},[n(t.background,"background",s,"aurora"),n(t.layout,"layout",[["classic",t.classic],["header",t.header]],"classic"),n(t.shape,"shape",[["soft",t.soft],["circle",t.circle],["square",t.square]],"soft")])]),B(t.devices,this.#i.devices,c=>{this.#i.devices=c},[this.#m(t.hidden,"hidden_entities",t),this.#m(t.included,"included_entities",t)]),B(t.overview,this.#i.overview,c=>{this.#i.overview=c},[y("p",{textContent:t.overviewHint}),this.#m(t.overviewDevices,"overview_entities",t,a)]),B(t.shortcuts,this.#i.shortcuts,c=>{this.#i.shortcuts=c},[y("div",{className:"stack"},this.#y(t,e))]),B(t.profiles,this.#i.profiles,c=>{this.#i.profiles=c},[y("div",{className:"stack"},this.#_(t))])]);d.addEventListener("submit",c=>c.preventDefault()),this.shadowRoot.replaceChildren(y("style",{textContent:$t+Kt}),d)}};var ut="ll-strategy-dashboard-"+D,Ee="bayit-9-strategy-editor",Oe=class extends HTMLElement{static registryDependencies=["areas","devices","entities"];static generate(e,t){return Ge(e,t)}static getCreateSuggestions(e){return Ue(e)}static getConfigElement(){return document.createElement(Ee)}};function mt(){customElements.get(ut)||customElements.define(ut,Oe),customElements.get(Ee)||customElements.define(Ee,de),window.customStrategies??=[],window.customStrategies.some(o=>o.type===D&&o.strategyType==="dashboard")||window.customStrategies.push({type:D,strategyType:"dashboard",name:"Bayit 9",description:"A room-based Liquid Glass dashboard for Home Assistant.",documentationURL:"https://github.com/yahavzarfati/bayit-9"})}mt();
