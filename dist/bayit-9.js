/*! Bayit 9 v0.2.0 */
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
`;var de={en:{home:"Home",overview:"Home overview",settings:"Appearance",close:"Close",activity:"Active devices",rooms:"Rooms",security:"Security",presence:"People at home",weather:"Weather",energy:"Energy",open_energy:"Open energy dashboard",setup:"Customize home",setup_save:"Save dashboard",setup_loading:"Loading dashboard settings…",setup_saving:"Saving dashboard…",setup_error:"Could not load or save dashboard settings.",setup_conflict:"The dashboard changed while you were editing. Reload it and try again.",setup_storage:"To save these settings, use a dashboard managed in the Home Assistant interface.",room_lights:"Lights",room_covers:"Covers",room_climate:"Heating and cooling",room_security:"Security",room_sensors:"Sensors",room_devices:"Other devices",more_info:"More info",empty:"No rooms have been added.",empty_room:"No devices in this room.",quiet:"All quiet",active:"active",unavailable:"Unavailable",unknown:"Unknown state",apply:"Apply",cancel:"Cancel",confirm:"Confirm",confirm_title:"Confirm action",confirm_action:"Continue with {action} on {name}?",send_error:"Could not complete the action.",sending:"Sending {name}…",confirmed:"{name} updated.",sent:"Command sent to {name}.",unconfirmed:"No confirmation received for {name}.",background:"Background",shape:"Button shape",layout:"Room layout",aurora:"Aurora",lagoon:"Lagoon",dunes:"Dunes",graphite:"Graphite",soft:"Rounded",circle:"Round",square:"Square",classic:"Room name below",header:"Room name above",turn_on:"Turn on",turn_off:"Turn off",open:"Open",close_device:"Close",stop:"Stop",set_position:"Position",lock:"Lock",unlock:"Unlock",set_hvac_mode:"Mode",set_temperature:"Target temperature",set_temperature_range:"Temperature range",set_fan_mode:"Fan speed",set_preset_mode:"Preset",set_operation_mode:"Operating mode",set_percentage:"Speed",set_heating_level:"Heating level",set_brightness:"Brightness",start_timed:"Start timer",stop_timed:"Stop timer",duration:"Minutes",min:"Minimum",max:"Maximum",timed:"Timer",on:"On",off:"Off",opening:"Opening",closing:"Closing",opened:"Open",closed:"Closed",locked:"Locked",unlocked:"Unlocked",locking:"Locking",unlocking:"Unlocking",jammed:"Jammed",cool:"Cooling",heat:"Heating",heat_cool:"Heat / cool",dry:"Dry",fan_only:"Fan",auto:"Auto",idle:"Idle",paused:"Paused",playing:"Playing",cleaning:"Cleaning",docked:"Docked",available_option:"Choose an option"},he:{home:"בית",overview:"מבט על הבית",settings:"מראה",close:"סגירה",activity:"מכשירים פעילים",rooms:"חדרים",security:"אבטחה",presence:"מי בבית",weather:"מזג אוויר",energy:"אנרגיה",open_energy:"פתיחת דשבורד האנרגיה",setup:"התאמת הבית",setup_save:"שמירת הדשבורד",setup_loading:"טוען את הגדרות הדשבורד…",setup_saving:"שומר את הדשבורד…",setup_error:"לא ניתן לטעון או לשמור את הגדרות הדשבורד.",setup_conflict:"הדשבורד השתנה בזמן העריכה. רעננו אותו ונסו שוב.",setup_storage:"כדי לשמור הגדרות אלה, השתמשו בדשבורד שמנוהל בממשק Home Assistant.",room_lights:"תאורה",room_covers:"תריסים ווילונות",room_climate:"חימום וקירור",room_security:"אבטחה",room_sensors:"חיישנים",room_devices:"מכשירים נוספים",more_info:"מידע נוסף",empty:"עדיין אין חדרים בדשבורד.",empty_room:"אין מכשירים בחדר הזה.",quiet:"הכול שקט",active:"פעיל",unavailable:"לא זמין",unknown:"מצב לא ידוע",apply:"החל",cancel:"ביטול",confirm:"אישור",confirm_title:"אישור פעולה",confirm_action:"להמשיך בפעולה ״{action}״ עבור {name}?",send_error:"הפעולה לא הושלמה.",sending:"שולח פקודה אל {name}…",confirmed:"המצב של {name} עודכן.",sent:"נשלחה פקודה אל {name}.",unconfirmed:"עדיין לא התקבל אישור מצב עבור {name}.",background:"רקע",shape:"צורת הכפתורים",layout:"פריסת החדרים",aurora:"זוהר צפוני",lagoon:"לגונה",dunes:"דיונות",graphite:"גרפיט",soft:"פינות מעוגלות",circle:"עגול",square:"מרובע",classic:"שם החדר למטה",header:"שם החדר למעלה",turn_on:"הדלקה",turn_off:"כיבוי",open:"פתיחה",close_device:"סגירה",stop:"עצירה",set_position:"מיקום",lock:"נעילה",unlock:"פתיחת מנעול",set_hvac_mode:"מצב עבודה",set_temperature:"טמפרטורת יעד",set_temperature_range:"טווח טמפרטורה",set_fan_mode:"מהירות מאוורר",set_preset_mode:"תוכנית",set_operation_mode:"מצב פעולה",set_percentage:"מהירות",set_heating_level:"עוצמת חימום",set_brightness:"בהירות",start_timed:"הפעלת טיימר",stop_timed:"עצירת טיימר",duration:"דקות",min:"מינימום",max:"מקסימום",timed:"טיימר",on:"פועל",off:"כבוי",opening:"נפתח",closing:"נסגר",opened:"פתוח",closed:"סגור",locked:"נעול",unlocked:"לא נעול",locking:"ננעל",unlocking:"משתחרר",jammed:"תקוע",cool:"קירור",heat:"חימום",heat_cool:"חימום / קירור",dry:"ייבוש",fan_only:"אוורור",auto:"אוטומטי",idle:"בהמתנה",paused:"מושהה",playing:"מנגן",cleaning:"מנקה",docked:"בעמדה",available_option:"בחירת אפשרות"}};var pt=/^[a-z][a-z0-9_]*\.[a-z0-9_]+$/,ht=/^[A-Za-z_][A-Za-z0-9_]*$/,oe=Object.freeze(["switch","climate","fan","water_heater"]),ft=["off","heat","cool","heat_cool","auto","dry","fan_only"],ie={open:1,close:2,position:4,stop:8},ne={speed:1,preset:8,off:16,on:32},U={temperature:1,range:2,fan:8,preset:16,off:128,on:256},ue={temperature:1,operation:2,power:8},gt={open:"open_cover",close:"close_cover",stop:"stop_cover",set_position:"set_cover_position",set_brightness:"turn_on",set_temperature_range:"set_temperature"},pe={set_position:"position",set_brightness:"brightness_pct",set_percentage:"percentage",set_hvac_mode:"hvac_mode",set_fan_mode:"fan_mode",set_preset_mode:"preset_mode",set_operation_mode:"operation_mode",set_temperature:"temperature"},De=Symbol("request-timed-out"),R=class extends Error{constructor(e,t,i){super(t,i),this.name="DeviceControlError",this.code=e}};function J(n,e){return typeof n=="string"&&pt.test(n)&&(!e||n.startsWith(e+"."))}function F(n){return typeof n?.state=="string"&&n.state!==""&&!["unavailable","unknown"].includes(n.state)}function bt(n,e){if(n===void 0)return null;if(!n||typeof n!="object"||Array.isArray(n)||!oe.includes(e))throw new R("invalid_config","A timed profile requires a heating-capable entity.");let{start_script:t,stop_script:i,timer_entity:s,duration_field:o="duration",min_minutes:r=1,max_minutes:a=60,step_minutes:l=1}=n;if(t!==void 0&&!J(t,"script")||i!==void 0&&!J(i,"script")||s!==void 0&&!J(s,"timer")||typeof o!="string"||!ht.test(o)||![r,a,l].every(Number.isSafeInteger)||r<1||a<r||l<1)throw new R("invalid_config","The timed profile includes an invalid entity or duration setting.");return{start_script:t,stop_script:i,timer_entity:s,duration_field:o,min_minutes:r,max_minutes:a,step_minutes:l}}function Me(n){if(!n||!J(n.entity))throw new R("invalid_config","Configure a Home Assistant entity ID.");let e=n.entity.split(".")[0],t=n.kind??e;if(t!==e&&(!["heater","boiler"].includes(t)||!oe.includes(e)))throw new R("invalid_config","The entity does not support the requested device profile.");if(n.level_entity!==void 0&&(!["heater","boiler"].includes(t)||!J(n.level_entity,"number")))throw new R("invalid_config","Heating level requires a number entity in a heating profile.");if(n.confirmation_ms!==void 0&&(!Number.isSafeInteger(n.confirmation_ms)||n.confirmation_ms<0))throw new R("invalid_config","The confirmation time must be a nonnegative number of milliseconds.");return{...n,kind:t,domain:e,timed:bt(n.timed,e)}}function yt(n){if(typeof n!="string")return null;let e=/^(?:(\d+) days?, )?(\d+):([0-5]\d):([0-5]\d)(?:\.(\d{1,6}))?$/.exec(n);if(!e)return null;let[,t,i,s,o,r]=e,a=((Number(t??0)*24+Number(i))*3600+Number(s)*60+Number(o)+(r?+("0."+r):0))*1e3;return Number.isFinite(a)?a:null}function he(n){return typeof n=="string"&&/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(n)?Date.parse(n):NaN}function vt(n,e,t){if(!n)return null;let i=e?.[n],s=["active","paused","idle"].includes(i?.state)?i.state:"unavailable",o=s==="active"?he(i.attributes?.finishes_at):NaN,r=Number.isFinite(o)?o:null,a=null;return r!==null&&(a=Math.max(0,r-t)),s==="paused"&&(a=yt(i.attributes?.remaining)),s==="idle"&&(a=0),{entity:n,state:s,deadlineMs:r,remainingMs:a}}function _t(n,e,t,i,s){let o={},r=(d,h)=>{o[d]={id:d,requiresConfirmation:!1,...h}},a=()=>{r("turn_on"),r("turn_off")},l=(d,h,b)=>{if(!Array.isArray(h))return;let _=[...new Set(h.filter(w=>typeof w=="string"&&w.length>0&&(!b||b.includes(w))))];_.length&&r(d,{options:_})},c=n.timed;if(t&&r("more_info"),!F(t))return o;let u=t.attributes??{},g=Number.isSafeInteger(u.supported_features)&&u.supported_features>=0?u.supported_features:0,m=d=>(g&d)===d,p=d=>{let{min_temp:h,max_temp:b,target_temp_step:_}=u;if(!Number.isFinite(h)||!Number.isFinite(b)||h>b)return;let w=Number.isFinite(_)&&_>0?_:null;r(d,{min:h,max:b,step:w})};switch(n.domain){case"switch":a();break;case"light":a(),(Array.isArray(u.supported_color_modes)&&u.supported_color_modes.some(d=>["brightness","color_temp","hs","xy","rgb","rgbw","rgbww","white"].includes(d))||Number.isFinite(u.brightness))&&r("set_brightness",{min:0,max:100,step:1});break;case"cover":m(ie.open)&&r("open"),m(ie.close)&&r("close"),m(ie.stop)&&r("stop"),m(ie.position)&&r("set_position",{min:0,max:100,step:1});break;case"fan":m(ne.on)&&r("turn_on"),m(ne.off)&&r("turn_off"),m(ne.speed)&&r("set_percentage",{min:0,max:100,step:1}),m(ne.preset)&&l("set_preset_mode",u.preset_modes);break;case"climate":m(U.on)&&r("turn_on"),m(U.off)&&r("turn_off"),l("set_hvac_mode",u.hvac_modes,ft),m(U.temperature)&&p("set_temperature"),m(U.range)&&p("set_temperature_range"),m(U.fan)&&l("set_fan_mode",u.fan_modes),m(U.preset)&&l("set_preset_mode",u.preset_modes);break;case"water_heater":m(ue.power)&&a(),m(ue.temperature)&&p("set_temperature"),m(ue.operation)&&l("set_operation_mode",u.operation_list);break;case"lock":{let d=typeof u.code_format=="string"&&u.code_format.length>0;r("lock",{requiresCode:d}),r("unlock",{requiresCode:d,requiresConfirmation:!0});break}}if(c?.start_script){o.turn_off||(o.set_hvac_mode?.options.includes("off")?r("turn_off",{service:"set_hvac_mode",fixedData:{hvac_mode:"off"}}):o.set_operation_mode?.options.includes("off")?r("turn_off",{service:"set_operation_mode",fixedData:{operation_mode:"off"}}):o.set_percentage&&r("turn_off",{service:"set_percentage",fixedData:{percentage:0}}));for(let d of["turn_on","set_hvac_mode","set_operation_mode","set_percentage","set_temperature","set_temperature_range","set_fan_mode","set_preset_mode"])delete o[d];F(e?.[c.start_script])&&r("start_timed",{min:c.min_minutes,max:c.max_minutes,step:c.step_minutes})}if(n.level_entity&&(!c?.start_script||i?.state==="active"&&i.deadlineMs>s)){let d=e?.[n.level_entity],{min:h,max:b,step:_}=d?.attributes??{};F(d)&&d.state.trim()&&Number.isFinite(Number(d.state))&&[h,b,_].every(Number.isFinite)&&b>=h&&_>0&&r("set_heating_level",{min:h,max:b,step:_})}return c?.stop_script&&F(e?.[c.stop_script])&&(r("stop_timed"),delete o.turn_off),o}function qe(n,e,t){let i=e?.[n.entity],s=i?.attributes??{},o=vt(n.timed?.timer_entity,e,t),r=e?.[n.level_entity];return{entity:n.entity,domain:n.domain,kind:n.kind,name:n.name||s.friendly_name||n.entity,icon:n.icon||s.icon||null,state:i?.state??"missing",available:F(i),attributes:s,actions:_t(n,e,i,o,t),level:F(r)&&r.state.trim()?Number(r.state):null,timer:o}}function Le(n,e,t=Date.now()){return qe(Me(n),e,t)}function me(n,{min:e,max:t,step:i}){if(!Number.isFinite(n)||n<e||n>t)return!1;if(!i)return!0;let s=(n-e)/i;return n===t||Math.abs(s-Math.round(s))<1e-7}function xt(n,e,t,i){let s=(r,a,l)=>({entity:n.entity,attributes:{[r]:a},tolerance:l}),o=r=>({entity:n.entity,state:r});switch(e){case"turn_on":return["light","switch","fan"].includes(n.domain)?o("on"):null;case"turn_off":return o("off");case"open":return o("open");case"close":return o("closed");case"stop":return["opening","closing"].includes(i?.[n.entity]?.state)?{entity:n.entity,anyState:["open","closed"]}:null;case"set_position":return s("current_position",t);case"set_brightness":return t===0?o("off"):{...s("brightness",Math.round(t*255/100),2),state:"on"};case"set_percentage":return t===0?o("off"):s("percentage",t);case"lock":return o("locked");case"unlock":return o("unlocked");case"set_hvac_mode":case"set_operation_mode":return o(t);case"set_fan_mode":case"set_preset_mode":case"set_temperature":return s(pe[e],t,1e-6);case"set_temperature_range":return{entity:n.entity,attributes:{target_temp_low:t.low,target_temp_high:t.high},tolerance:1e-6};case"start_timed":{let r=n.timed.timer_entity,a=["switch","fan"].includes(n.domain)?o("on"):null;if(!r)return a;let l=he(i?.[r]?.attributes?.finishes_at);return{all:[{entity:r,state:"active",requireNewDeadline:!0,formerDeadline:l},...a?[a]:[]]}}case"stop_timed":return n.timed.timer_entity?{all:[{entity:n.timed.timer_entity,state:"idle"},o("off")]}:o("off");default:return null}}function wt(n,e,t,i,{confirmed:s=!1,code:o}={}){n=Me(n);let r=qe(n,e,Date.now()),a=typeof t=="string"&&Object.hasOwn(r.actions,t)&&r.actions[t];if(!a)throw new R("action_unavailable","This entity does not currently support that action.");if(a.requiresConfirmation&&s!==!0)throw new R("confirmation_required","This action requires explicit confirmation.");if(a.requiresCode&&(typeof o!="string"||!o.trim()||o.length>64))throw new R("pin_required","Enter the lock code in Home Assistant.");if(t==="more_info")return{kind:"more_info",entity:n.entity};if(t==="set_temperature_range"){if(!i||!me(i.low,a)||!me(i.high,a)||i.low>i.high)throw new R("invalid_value","The selected temperature range is invalid.")}else if(a.options?!a.options.includes(i):a.min!==void 0&&!me(i,a))throw new R("invalid_value","The selected value is outside the published device options.");if(t==="set_heating_level")return{kind:"service",domain:"number",service:"set_value",target:{entity_id:n.level_entity},data:{value:i},expected:{entity:n.level_entity,numericState:i}};let l=xt(n,t,i,e);if(t==="start_timed"||t==="stop_timed"){let u=t==="start_timed";return{kind:"service",domain:"script",service:(u?n.timed.start_script:n.timed.stop_script).split(".")[1],target:null,data:u?{[n.timed.duration_field]:i}:{},expected:l}}let c=t==="set_temperature_range"?{target_temp_low:i.low,target_temp_high:i.high}:pe[t]?{[pe[t]]:i}:{...a.fixedData};return a.requiresCode&&(c.code=o),{kind:"service",domain:r.domain,service:a.service??gt[t]??t,target:{entity_id:n.entity},data:c,expected:l}}function ze(n,e){if(n.all)return n.all.every(i=>ze(i,e));let t=e?.[n.entity];if(!F(t)||n.state!==void 0&&n.state!==t.state||n.anyState&&!n.anyState.includes(t.state)||n.numericState!==void 0&&(!t.state.trim()||!(Math.abs(Number(t.state)-n.numericState)<=1e-7)))return!1;if(n.requireNewDeadline){let i=he(t.attributes?.finishes_at);if(!Number.isFinite(i)||i===n.formerDeadline)return!1}return Object.entries(n.attributes??{}).every(([i,s])=>{let o=t.attributes?.[i];return typeof s=="number"?Number.isFinite(o)&&Math.abs(o-s)<=(n.tolerance??0):o===s})}var kt=n=>new Promise(e=>setTimeout(e,n)),St=()=>globalThis.performance.now();function At(n,e){let t,i=new Promise(s=>{t=setTimeout(()=>s(De),e)});return Promise.race([n,i]).finally(()=>clearTimeout(t))}function Ie({getHass:n,confirmationTimeoutMs:e,requestTimeoutMs:t=1e4,pollIntervalMs:i=100,sleep:s=kt,now:o=St}={}){if(typeof n!="function"||typeof s!="function"||typeof o!="function"||!Number.isSafeInteger(t)||t<1||t>2147483647||!Number.isSafeInteger(i)||i<1||e!==void 0&&(!Number.isSafeInteger(e)||e<0))throw new R("invalid_config","The dashboard connection or timeout setting is invalid.");let r=new Map;return{async execute(a,l,c,u){let g=n(),m=wt(a,g?.states,l,c,u);if(m.kind==="more_info")return{status:"more_info",entity:m.entity};if(typeof g?.callWS!="function")throw new R("service_unavailable","The Home Assistant connection is unavailable.");let p=a.entity,d=Symbol(p);r.set(p,d);let h=(b,_)=>({status:b,entity:p,action:l,..._?{reason:_}:{}});try{let b={type:"call_service",domain:m.domain,service:m.service,service_data:m.data};m.target&&(b.target=m.target);let _;try{_=await At(Promise.resolve(g.callWS(b)),t)}catch(y){if(r.get(p)!==d)return h("unconfirmed","superseded");throw new R("service_failed","Home Assistant rejected or could not deliver the command.",{cause:y})}if(r.get(p)!==d)return h("unconfirmed","superseded");if(_===De)return h("unconfirmed","request_timeout");let w=a.confirmation_ms??e??(m.domain==="cover"?45e3:8e3);if(!m.expected||!w)return h("sent");let A=o()+w;for(;;){if(r.get(p)!==d)return h("unconfirmed","superseded");if(ze(m.expected,n()?.states))return h("confirmed");let y=A-o();if(y<=0)return h("unconfirmed","state_timeout");await s(Math.min(i,y))}}finally{r.get(p)===d&&r.delete(p)}}}}var Ct="custom:bayit-dashboard",D="bayit-9",V=6,ye="bayit_room_",ve={aurora:{en:"Aurora",he:"זוהר צפוני"},lagoon:{en:"Lagoon",he:"לגונה"},dunes:{en:"Dunes",he:"דיונות"},graphite:{en:"Graphite",he:"גרפיט"}},_e=oe,Nt=["light","switch","cover","climate","fan","lock","water_heater","vacuum","humidifier","alarm_control_panel","camera","media_player","binary_sensor","sensor","weather","person","calendar"],xe=/^[a-z0-9_]+\.[a-z0-9_]+$/,Rt=/^bayit_room_[a-z0-9][a-z0-9_-]{0,63}$/,je=/^mdi:[a-z0-9-]+$/,Et=new Set(["light","switch","cover","climate","fan","lock","water_heater"]),Ot=new Set(["door","window","garage_door","opening"]),Tt=new Set(["heater","boiler"]),fe=new Map(Nt.map((n,e)=>[n,e])),Pe="script",re={en:{title:"Bayit 9",home:"Home",unassigned:"Unassigned"},he:{title:"בית 9",home:"בית",unassigned:"ללא חדר"}};function ae(n,e={}){if(n==="en"||n==="he")return n;let t=e.locale?.language??e.language;return typeof t=="string"&&/^he(?:[-_]|$)/i.test(t)?"he":"en"}function L(n){return Array.isArray(n)?[...new Set(n.filter(e=>typeof e=="string"&&e.trim()))]:[]}function G(n){return n.split(".")[0]}function se(n,e){return typeof n=="string"&&xe.test(n)&&G(n)===e?n:void 0}function ge(n,e){return Number.isInteger(n)&&n>0&&n<=360?n:e}function we(n){if(!n||typeof n.entity!="string"||!xe.test(n.entity)||!_e.includes(G(n.entity))||!Tt.has(n.kind))return null;let e={entity:n.entity,kind:n.kind};typeof n.name=="string"&&n.name.trim()&&(e.name=n.name.trim().slice(0,80));let t=se(n.level_entity,"number");t&&(e.level_entity=t);let i=n.timed;if(!i||typeof i!="object")return e;let s=se(i.start_script,Pe),o=se(i.stop_script,Pe),r=se(i.timer_entity,"timer");if(!s&&!r&&!o)return e;let a=ge(i.min_minutes,15),l=Math.max(a,ge(i.max_minutes,60)),c=Math.min(l-a||1,ge(i.step_minutes,15));return e.timed={...s&&{start_script:s},...o&&{stop_script:o},...r&&{timer_entity:r},duration_field:typeof i.duration_field=="string"&&/^[a-z][a-z0-9_]{0,39}$/.test(i.duration_field)?i.duration_field:"duration",min_minutes:a,max_minutes:l,step_minutes:c},e}function Dt(n){let e=new Map;for(let t of Array.isArray(n)?n:[]){let i=we(t);i&&!e.has(i.entity)&&e.set(i.entity,i)}return e}function Fe(n,e){let t=new Map(Object.entries(e.areas??{}).map(([i,s])=>[s.area_id??i,{name:s.name??i,icon:s.icon||"mdi:home-outline"}]));for(let[i,s]of Object.entries(n.room_overrides??{})){if(!s||typeof s!="object"||Array.isArray(s))continue;let o=t.get(i),r=typeof s.name=="string"?s.name.trim().slice(0,80):"";if(!o&&(!Rt.test(i)||!r))continue;let a=typeof s.icon=="string"?s.icon.trim():"",l=s.entity_icons;t.set(i,{name:r||o?.name,icon:je.test(a)?a:o?.icon??"mdi:home-outline",entityIds:Array.isArray(s.entities)?L(s.entities):o?void 0:[],entityIcons:l&&typeof l=="object"&&!Array.isArray(l)?l:null,custom:!o})}return t}function He(n={},e={}){return[...Fe(n,e)].map(([t,i])=>({id:t,name:i.name,icon:i.icon,custom:i.custom===!0}))}function be(n,e,t){return n.localeCompare(e,t,{numeric:!0,sensitivity:"base"})}function Mt(n){let e="bayit9_unassigned";for(let t=1;n.has(e);t++)e="bayit9_unassigned_"+t;return e}function ke(n,e,t,i){let s=i?.name??e.attributes?.friendly_name??t?.name??t?.en,o=t?.icon??t?.ic??e.attributes?.icon;return{entity:n,...typeof s=="string"&&s&&{name:s},...typeof o=="string"&&o&&{icon:o},...i&&{kind:i.kind},...i?.level_entity&&{level_entity:i.level_entity},...i?.timed&&{timed:i.timed}}}function Se(n,e,t,i){if(!xe.test(n)||i.has(n)||!Object.hasOwn(e,n)||e[n]==null)return!1;let s=t?.[n];return s?.hidden!==!0&&!s?.hidden_by&&!s?.disabled_by}function Be(n={},e={}){let t=e.states??{},i=e.entities,s=new Set(L(n.hidden_entities));return Object.keys(t).filter(o=>Se(o,t,i,s)).map(o=>ke(o,t[o],i?.[o]))}function $(n,e,t){let i=Fe(n,e),s=Mt(i),o=new Map(L(n.area_ids).map((f,x)=>[f,x])),r=f=>o.size===0||o.has(f),a=new Set(L(n.hidden_entities)),l=new Set(L(n.included_entities)),c=Dt(n.profiles),u=new Set([...c.values()].flatMap(f=>{let x=f.timed;return[f.level_entity,x?.start_script,x?.stop_script,x?.timer_entity].filter(Boolean)})),g=e.states??{},m=e.entities??null,p=new Map,d=n.discovery_mode==="controls"?Et:fe,h=f=>Se(f,g,m,a),b=f=>ke(f,g[f],m?.[f],c.get(f)),_=new Set;for(let[f,x]of i){if(!x.entityIds||!r(f))continue;let N=x.entityIds.filter(h);p.set(f,N.map(b));for(let q of N)_.add(q)}let w=new Set(Object.keys(m||g));for(let f of[...l,...c.keys()])w.add(f);for(let f of w){if(_.has(f)||!h(f))continue;let x=m?.[f],N=l.has(f)||c.has(f),q=x?.entity_category!=null||x?.ec!=null;if(!N&&(!d.has(G(f))||q||u.has(f)))continue;let j=x?.device_id??x?.di,T=j&&e.devices?.[j],E=x?.area_id??x?.ai??T?.area_id,te=i.get(E),W=te&&!te.custom?E:s;(W===s?n.show_unassigned===!1:!r(W)||te.entityIds)||(p.has(W)||p.set(W,[]),p.get(W).push(b(f)))}let A=f=>i.get(f)??{name:re[t].unassigned,icon:"mdi:map-marker-outline"};return[...p.keys()].sort((f,x)=>f===s||x===s?f===s?1:-1:(o.get(f)??1/0)-(o.get(x)??1/0)||be(A(f).name,A(x).name,t)).map(f=>{let x=A(f),N=p.get(f);if(x.entityIds||N.sort((T,E)=>(fe.get(G(T.entity))??100)-(fe.get(G(E.entity))??100)||be(T.name??T.entity,E.name??E.entity,t)),x.entityIcons)for(let T of N){if(!Object.hasOwn(x.entityIcons,T.entity))continue;let E=x.entityIcons[T.entity];typeof E=="string"&&je.test(E.trim())&&(T.icon=E.trim())}let q={id:f,name:x.name,icon:x.icon,entities:N},j=Object.hasOwn(n.room_shortcuts??{},f)?n.room_shortcuts[f]:null;if(Array.isArray(j)){let T=new Set(N.map(E=>E.entity));q.shortcuts=L(j).filter(E=>T.has(E)).slice(0,V)}return q})}function qt(n,e,t){let i=e.states??{},s=e.entities,o=new Set(L(n.hidden_entities)),r=new Set(L(n.overview_entities)),a={};for(let[l,c]of Object.entries(i)){let u=G(l),g=c?.attributes?.device_class,m;u==="lock"||u==="alarm_control_panel"||u==="binary_sensor"&&Ot.has(g)?m="security":u==="person"?m="presence":u==="weather"?m="weather":u==="sensor"&&r.has(l)&&["energy","power"].includes(g)&&(m="energy"),!(!m||!Se(l,i,s,o))&&(a[m]??=[]).push(ke(l,c,s?.[l]))}for(let l of Object.values(a))l.sort((c,u)=>be(c.name??c.entity,u.name??u.entity,t));return a}function Ue(n){return{title:re[ae("auto",n)].title,icon:"mdi:home-variant-outline"}}function Ge(n={},e={}){let t=ae(n.locale,e),i=typeof n.title=="string"&&n.title.trim()?n.title.trim():re[t].title,s={type:Ct,locale:t,title:i,rooms:$(n,e,t)},o=new Set(s.rooms.flatMap(l=>l.entities.map(c=>c.entity))),r=L(n.overview_entities).filter(l=>o.has(l));r.length&&(s.overview=r);let a=qt(n,e,t);return Object.keys(a).length&&(s.context=a),Object.hasOwn(ve,n.background)&&(s.background=n.background),["soft","circle","square"].includes(n.shape)&&(s.shape=n.shape),["classic","header"].includes(n.layout)&&(s.layout=n.layout),typeof n.preference_key=="string"&&n.preference_key.trim()&&(s.preference_key=n.preference_key.trim()),{title:i,views:[{title:re[t].home,path:"home",type:"panel",cards:[s]}]}}var Ve="custom:"+D;function X(n){let e=new Error(n);return e.code=n,e}function Lt(n){let e=n.split("/")[1];return/^[a-z0-9][a-z0-9_-]*$/i.test(e??"")&&e.includes("-")?e:null}function $e(n){if(!n?.user?.is_admin||typeof n.callWS!="function")throw X("setup_storage")}async function Ye(n,e){let t=await n.callWS({type:"lovelace/config",url_path:e,force:!0});if(t?.strategy?.type!==Ve)throw X("setup_storage");return t}async function Ke(n,e){$e(n);let t=Lt(e);if(!t||!(await n.callWS({type:"lovelace/dashboards/list"})).some(o=>o.url_path===t&&o.mode==="storage"))throw X("setup_storage");let s=await Ye(n,t);return{urlPath:t,strategy:s.strategy}}async function We(n,e,t){$e(n);let i=await Ye(n,e.urlPath);if(JSON.stringify(i.strategy)!==JSON.stringify(e.strategy))throw X("setup_conflict");let s={...i,strategy:{...t,type:Ve}};await n.callWS({type:"lovelace/config/save",url_path:e.urlPath,config:s})}var nt=Object.freeze(["aurora","lagoon","dunes","graphite"]),Q={background:nt,shape:["soft","circle","square"],layout:["classic","header"]},zt={aurora:"#63928a",lagoon:"#37728c",dunes:"#aa7356",graphite:"#596169"},ot=/^mdi:[a-z0-9-]+$/,Je=/^[a-z0-9_]+\.[a-z0-9_]+$/,It={turn_on:"mdi:power",turn_off:"mdi:power",open:"mdi:arrow-up",close:"mdi:arrow-down",stop:"mdi:stop",lock:"mdi:lock-outline",unlock:"mdi:lock-open-variant-outline",start_timed:"mdi:timer-play-outline",stop_timed:"mdi:timer-stop-outline"},Pt={light:"mdi:lightbulb-outline",switch:"mdi:toggle-switch-outline",fan:"mdi:fan",cover:"mdi:blinds",climate:"mdi:thermostat",lock:"mdi:lock-outline",heater:"mdi:radiator",boiler:"mdi:water-boiler",water_heater:"mdi:water-boiler",sensor:"mdi:gauge",binary_sensor:"mdi:motion-sensor",calendar:"mdi:calendar-outline",alarm_control_panel:"mdi:shield-home-outline",weather:"mdi:weather-partly-cloudy",person:"mdi:account-outline",vacuum:"mdi:robot-vacuum",camera:"mdi:cctv",media_player:"mdi:speaker"},H=["security","presence","weather","energy"],jt=new Set(["light","switch","fan","cover","lock","climate","water_heater"]),Ft={light:"room_lights",cover:"room_covers",climate:"room_climate",fan:"room_climate",water_heater:"room_climate",lock:"room_security",alarm_control_panel:"room_security",camera:"room_security",sensor:"room_sensors",binary_sensor:"room_sensors",weather:"room_sensors"},Xe=n=>n.entity.split(".")[0],Ht=new Set(["open","close","set_position"]),Ze=new Set(["set_position","set_brightness","set_percentage"]),Qe={set_position:"current_position",set_percentage:"percentage",set_brightness:"brightness",set_temperature:"temperature",set_fan_mode:"fan_mode",set_preset_mode:"preset_mode",set_operation_mode:"operation_mode"},et=["turn_on","turn_off","open","stop","close","lock","unlock","set_position","set_brightness","set_percentage","set_hvac_mode","set_temperature","set_temperature_range","set_fan_mode","set_preset_mode","set_operation_mode","set_heating_level","start_timed","stop_timed"],tt=new Set(["on","off","open","closed","opening","closing","locked","unlocked","locking","unlocking","jammed","cool","heat","heat_cool","dry","fan_only","auto","idle","active","paused","playing","cleaning","docked","unavailable","unknown"]),Bt=0;function k(n,e,t){let i=document.createElement(n);return e&&(i.className=e),t!=null&&(i.textContent=t),i}function ee(n,e="mdi:information-outline"){return typeof n=="string"&&ot.test(n)?n:e}function K(n){let e=k("ha-icon");return e.setAttribute("icon",ee(n)),e.setAttribute("aria-hidden","true"),e}function I(n,e){n.getAttribute("aria-label")!==e&&(n.title=e,n.setAttribute("aria-label",e))}function z(n,e,t,i=!1){let s=k("button",n);return s.type="button",t&&s.append(K(t)),i?I(s,e):e&&s.append(e),s}function M(n){return typeof n=="string"?n.trim():""}function Y(n){if(n==null||n==="")return null;let e=Number(n);return Number.isFinite(e)?e:null}function Z(n){return"⁦"+n+"⁩"}function C(n,e){n.textContent!==String(e)&&(n.textContent=e)}function Ae(n,e){let t=ee(e);n.getAttribute("icon")!==t&&n.setAttribute("icon",t)}function it(n){let e=M(typeof n=="string"?n:n?.entity);if(!Je.test(e))throw new Error("Invalid Home Assistant entity in Bayit 9.");let t={entity:e};return M(n.name)&&(t.name=M(n.name)),ot.test(M(n.icon))&&(t.icon=n.icon),["heater","boiler"].includes(n.kind)&&(t.kind=n.kind),Je.test(M(n.level_entity))&&n.level_entity.startsWith("number.")&&(t.level_entity=n.level_entity),n.timed&&typeof n.timed=="object"&&!Array.isArray(n.timed)&&(t.timed={...n.timed}),t}function Ut(n={}){if(!n||typeof n!="object"||Array.isArray(n))throw new Error("Invalid Bayit 9 configuration.");let e=/^he(?:-|$)/i.test(M(n.locale))?"he":"en",t=new Set,i=n.rooms??[];if(!Array.isArray(i))throw new Error("Bayit 9 rooms must be a list.");let s=i.map(l=>{let c=M(l?.id),u=M(l?.name);if(!/^[a-z0-9][a-z0-9_-]*$/i.test(c)||!u||t.has(c))throw new Error("Each Bayit 9 room needs a unique id and name.");t.add(c);let g=l.entities??[],m=new Map;if(!Array.isArray(g))throw new Error("Bayit 9 room entities must be a list.");for(let d of g){let h=it(d);m.has(h.entity)||m.set(h.entity,h)}let p={id:c,name:u,icon:ee(l.icon,"mdi:door-open"),entities:[...m.values()]};return Array.isArray(l.shortcuts)&&(p.shortcuts=[...new Set(l.shortcuts)].filter(d=>m.has(d)).slice(0,V)),p}),o=new Map(s.flatMap(l=>l.entities.map(c=>[c.entity,c]))),r=Array.isArray(n.overview)?[...new Set(n.overview)].filter(l=>o.has(l)).map(l=>o.get(l)):[],a=Object.fromEntries(H.map(l=>{let c=Array.isArray(n.context?.[l])?n.context[l].map(it):[],u=new Map(c.map(g=>[g.entity,o.get(g.entity)??g]));return[l,[...u.values()]]}));return{locale:e,rooms:s,overview:r,context:a,title:M(n.title)||de[e].home,background:nt.includes(n.background)?n.background:"aurora",layout:Q.layout.includes(n.layout)?n.layout:"classic",shape:Q.shape.includes(n.shape)?n.shape:"soft",storageKey:"bayit-9.preferences.v1:"+(M(n.preference_key)||location.pathname)}}var Gt=`
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
`,Ce=class extends HTMLElement{constructor(){super(),this.attachShadow({mode:"open"}).innerHTML="<style>"+Te+"</style>"+Gt;let e=o=>this.shadowRoot.querySelector(o),t=o=>e('[data-role="'+o+'"]');this.nodes={shell:e(".shell"),rooms:e(".rooms"),empty:e(".empty"),title:e("h1"),overview:t("overview"),activity:t("activity"),badge:t("activity").querySelector(".badge"),settings:t("settings"),close:t("close"),context:Object.fromEntries(H.map(o=>[o,t(o)])),peopleBadge:t("presence").querySelector(".badge"),modal:e("dialog:not(.confirm)"),modalTitle:e("dialog:not(.confirm) h2"),modalBody:e("dialog:not(.confirm) .modal-body"),content:t("content"),confirm:e(".confirm"),confirmTitle:e(".confirm h2"),confirmText:e(".confirmation-text"),accept:t("accept"),abort:t("abort"),pageNotice:t("page-notice"),modalNotice:t("modal-notice")};let i=this.nodes,s="bayit-9-"+ ++Bt;i.modalTitle.id=s+"-title",i.modal.setAttribute("aria-labelledby",i.modalTitle.id),i.confirmTitle.id=s+"-confirm",i.confirmText.id=s+"-message",i.confirm.setAttribute("aria-labelledby",i.confirmTitle.id),i.confirm.setAttribute("aria-describedby",i.confirmText.id),i.overview.onclick=()=>this.openPanel("overview",i.overview),i.settings.onclick=()=>this.openPanel("settings",i.settings),i.activity.onclick=()=>this.openPanel("activity",i.activity);for(let o of H)i.context[o].onclick=()=>this.openPanel(o,i.context[o]);i.close.onclick=()=>i.modal.close(),i.abort.onclick=()=>i.confirm.close(),i.accept.onclick=()=>this.acceptAction(),i.modal.addEventListener("close",()=>this.closePanel()),i.confirm.addEventListener("close",()=>{let o=this.confirming?.source;this.confirming=null,o?.isConnected&&!o.disabled&&o.focus({preventScroll:!0})});for(let o of[i.modal,i.confirm])o.addEventListener("click",r=>{let a=o.getBoundingClientRect();r.target===o&&(r.clientX<a.left||r.clientX>a.right||r.clientY<a.top||r.clientY>a.bottom)&&o.close()});this.roomViews=new Map,this.deviceViews=new Map,this.pending=new Map,this.roomScroll=new Map,this.preferences={},this.controller=Ie({getHass:()=>this._hass}),this.storageChange=o=>{o.key===this.config?.storageKey&&(this.readPreferences(),this.applyPreferences())}}static getStubConfig(){return{locale:"en",rooms:[]}}getCardSize(){return Math.max(2,Math.ceil((this.config?.rooms.length||0)/2)*3+1)}getGridOptions(){return{columns:12,min_columns:6,rows:"auto"}}setConfig(e){let t=Ut(e);this.config?.storageKey!==t.storageKey&&(this.preferences={}),this.nodes.confirm.open&&this.nodes.confirm.close(),this.nodes.modal.open&&this.nodes.modal.close(),this.config=t,this.words=de[t.locale];let i=this.nodes;i.shell.lang=t.locale,i.shell.dir=t.locale==="he"?"rtl":"ltr",C(i.title,t.title),C(i.empty,this.t("empty")),I(i.settings,this.t("settings")),I(i.activity,this.t("activity")),I(i.overview,this.t("overview")),i.overview.hidden=!t.overview.length;for(let s of H)I(i.context[s],this.t(s));I(i.close,this.t("close")),i.rooms.setAttribute("aria-label",this.t("rooms")),C(i.confirmTitle,this.t("confirm_title")),C(i.abort,this.t("cancel")),C(i.accept,this.t("confirm")),this.readPreferences(),this.buildRooms(),this.applyPreferences(),this.update()}set hass(e){this._hass=e,this.setup?.editor&&(this.setup.editor.hass=e),!(!this.isConnected||this.frame||!this.config)&&(this.frame=requestAnimationFrame(()=>{this.frame=0,this.update()}))}connectedCallback(){window.addEventListener("storage",this.storageChange),this.update()}disconnectedCallback(){window.removeEventListener("storage",this.storageChange),cancelAnimationFrame(this.frame),clearInterval(this.ticker),clearTimeout(this.noticeTimer),this.frame=this.ticker=0,this.nodes.confirm.open&&this.nodes.confirm.close(),this.nodes.modal.open&&this.nodes.modal.close()}t(e){return this.words?.[e]||e}readPreferences(){let e;try{e=JSON.parse(localStorage.getItem(this.config.storageKey)||"{}")}catch{return}this.preferences={};for(let[t,i]of Object.entries(Q))i.includes(e?.[t])&&(this.preferences[t]=e[t])}applyPreferences(){for(let e of Object.keys(Q))this.nodes.shell.dataset[e]=this.preferences[e]||this.config[e];for(let{article:e,heading:t}of this.roomViews.values())this.nodes.shell.dataset.layout==="header"&&e.firstElementChild!==t&&e.prepend(t),this.nodes.shell.dataset.layout!=="header"&&e.lastElementChild!==t&&e.append(t);if(this.panel?.type==="settings")for(let e of this.nodes.content.querySelectorAll("[data-preference]"))e.setAttribute("aria-pressed",String(e.value===this.nodes.shell.dataset[e.dataset.preference]))}setPreference(e,t){this.preferences[e]=t;try{localStorage.setItem(this.config.storageKey,JSON.stringify(this.preferences))}catch{}this.applyPreferences()}model(e){try{let t=Le(e,this._hass?.states??{});return{...t,icon:ee(t.icon,Pt[t.kind||t.domain])}}catch{return{...e,name:e.name||e.entity,icon:ee(e.icon),actions:{},attributes:{},state:"unavailable",available:!1}}}buildRooms(){let e=this.nodes;this.roomViews.clear(),e.rooms.replaceChildren();for(let t of this.config.rooms){let i=k("article","room");i.dataset.room=t.id;let s=z("room-title");I(s,t.name),s.setAttribute("aria-haspopup","dialog");let o=K(this.config.locale==="he"?"mdi:chevron-left":"mdi:chevron-right");o.className="chevron";let r=k("span","room-count");r.setAttribute("aria-hidden","true"),s.append(K(t.icon),k("span","room-name",t.name),r,o),s.onclick=()=>this.openPanel("room",s,t);let a=k("div","room-status"),l=K("mdi:power-standby"),c=k("span");a.append(l,c);let u=k("div","quick"),g=new Map,m=new Map(t.entities.map(d=>[d.entity,d])),p=t.shortcuts?t.shortcuts.map(d=>m.get(d)):t.entities.filter(d=>jt.has(Xe(d))).slice(0,V);for(let d of p){let h=z("quick-button",d.name||d.entity,d.icon||"mdi:information-outline",!0);h.dataset.entity=d.entity,h.onclick=()=>{let b=this.model(d);if(this.pending.has(d.entity)&&b.domain!=="cover")return;let _=["light","switch","fan"].includes(b.domain)&&!d.kind&&!d.timed,w=b.state==="on"?"turn_off":"turn_on";_&&b.actions[w]&&!b.actions[w].requiresConfirmation?this.requestAction(d,w,void 0,h):this.openPanel("room",h,t,d.entity)},g.set(d.entity,h),u.append(h)}i.append(a,u,s),e.rooms.append(i),this.roomViews.set(t.id,{room:t,article:i,heading:s,count:r,status:a,statusIcon:l,statusText:c,shortcut:g})}e.empty.hidden=this.roomViews.size>0}tone(e){return e.available?e.domain==="cover"&&["open","opening","closing"].includes(e.state)?"moving":e.domain==="lock"&&["unlocked","unlocking","jammed"].includes(e.state)?"critical":e.timer?.state==="active"||["on","playing","cleaning"].includes(e.state)||["heating","cooling","drying","fan"].includes(e.attributes?.hvac_action)?"warm":"quiet":"quiet"}stateLabel(e){if(!e.available)return this.t("unavailable");let t=e.attributes||{},i=e.state,s=r=>tt.has(r)?this.t(r):String(r||this.t("unknown"));if(e.domain==="cover"){let r=Y(t.current_position);return(i==="open"?this.t("opened"):s(i))+(r===null?"":" · "+Z(r+"%"))}if(e.domain==="sensor"&&t.unit_of_measurement)return Z(i+" "+t.unit_of_measurement);if(e.domain==="climate"){let r=Y(t.current_temperature),a=this._hass?.config?.unit_system?.temperature||"°";return s(i)+(r===null?"":" · "+Z(r+" "+a))}if(tt.has(i))return s(i);let o=this._hass?.states?.[e.entity];return String(o&&this._hass?.formatEntityState?.(o)||i||this.t("unknown"))}update(){if(!this.config)return;let e=this.nodes,t=new Map;for(let[o,r]of this.roomViews){let a=0,l=!1,c,u;for(let m of r.room.entities){let p=this.model(m),d=this.tone(p);if(l||=!p.available,p.domain==="light"&&p.state==="on"&&a++,d!=="quiet"&&!t.has(m.entity)&&t.set(m.entity,{config:m,model:p,room:r.room}),!c&&p.available&&p.attributes?.device_class==="temperature"&&(c=this.stateLabel(p)),!u&&p.available&&p.domain==="climate"){let _=Y(p.attributes.current_temperature);_!==null&&(u=Z(_+(this._hass?.config?.unit_system?.temperature||"°")))}let h=r.shortcut.get(m.entity);if(!h)continue;Ae(h.firstElementChild,p.icon),I(h,p.name+" · "+this.stateLabel(p)),h.dataset.tone=d,h.dataset.transition=["opening","closing"].includes(p.state)?p.state:"";let b=this.pending.has(m.entity);h.disabled=b&&p.domain!=="cover",h.setAttribute("aria-busy",String(b))}let g=c||u;r.status.hidden=!g&&!l,C(r.statusText,g||this.t("unavailable")),Ae(r.statusIcon,g?"mdi:thermometer":"mdi:alert-circle-outline"),C(r.count,a||this.t("off")),r.count.dataset.tone=a?"warm":"quiet",r.article.toggleAttribute("data-current",this.panel?.room?.id===o)}this.activeDevices=t,e.badge.hidden=!t.size,C(e.badge,t.size);let i=this.panel?.type;(i==="room"||i==="overview"||H.includes(i))&&this.updateDevices(),i==="activity"&&this.paintActivity();for(let o of H)e.context[o].hidden=!this.config.context[o].length&&(o!=="energy"||!this._hass?.panels?.energy);let s=this.config.context.presence.filter(o=>this._hass?.states?.[o.entity]?.state==="home").length;e.peopleBadge.hidden=!s,C(e.peopleBadge,s)}openPanel(e,t,i,s){if(!this.config)return;let o=this.nodes,r=t.getBoundingClientRect();o.modal.open||(this.restoreFocus=t),this.panel={type:e,room:i},this.setup=null,this.deviceViews.clear(),this.activitySignature=null,C(o.modalNotice,"");let a=i?.icon||t.querySelector("ha-icon")?.getAttribute("icon");o.modalTitle.replaceChildren(K(a),e==="room"?i.name:this.t(e)),e==="room"&&this.buildDevices(i.entities,!0),e==="overview"&&this.buildDevices(this.config.overview),H.includes(e)&&this.buildDevices(this.config.context[e]),e==="energy"&&this._hass?.panels?.energy&&this.appendEnergyLink(),e==="settings"&&this.paintSettings(),e==="setup"&&this.paintSetup(),e==="activity"&&this.paintActivity(),o.modal.open||o.modal.showModal();let l=o.modal.getBoundingClientRect(),c=(g,m)=>Math.max(0,Math.min(m,g))+"px";o.modal.style.setProperty("--motion-x",c(r.left+r.width/2-l.left,l.width)),o.modal.style.setProperty("--motion-y",c(r.top+r.height/2-l.top,l.height)),o.close.focus({preventScroll:!0}),o.modalBody.scrollTop=i&&this.roomScroll.get(i.id)||0;let u=this.deviceViews.get(s)?.item;u&&(o.modalBody.scrollTop+=u.getBoundingClientRect().top-o.modalBody.getBoundingClientRect().top-12),this.update()}closePanel(){let e=this.nodes;if(e.modal.open)return;this.panel?.room&&this.roomScroll.set(this.panel.room.id,e.modalBody.scrollTop),this.panel=null,this.setup=null,this.deviceViews.clear(),clearInterval(this.ticker),this.ticker=0,this.update();let t=this.restoreFocus;this.restoreFocus=null,t?.isConnected&&t.focus({preventScroll:!0})}buildDevices(e,t=!1){let i=this.nodes.content;i.className="devices",i.replaceChildren(),e.length||i.append(k("p","empty",this.t("empty_room")));let s=new Map;for(let o of e){let r=i;if(t){let h=Xe(o),b=o.kind==="heater"||o.kind==="boiler"?"room_climate":Ft[h]||"room_devices";if(!s.has(b)){let _=k("section","device-group");_.append(k("p","device-group-title",this.t(b))),i.append(_),s.set(b,_)}r=s.get(b)}let a=k("section","device");a.dataset.entity=o.entity;let l=k("header","device-head"),c=K(o.icon||"mdi:information-outline");c.className="device-icon";let u=k("div","device-detail"),g=k("h3","device-name"),m=k("span","current");u.append(g,m);let p=z("round-action",this.t("more_info"),"mdi:information-outline",!0);p.onclick=()=>this.moreInfo(o),l.append(c,u,p);let d=k("div","action-list");a.append(l,d),r.append(a),this.deviceViews.set(o.entity,{config:o,item:a,glyph:c,name:g,state:m,more:p,group:d,fields:[]})}this.updateDevices()}appendEnergyLink(){let e=this.nodes.content;this.config.context.energy.length||e.replaceChildren();let t=k("a","control-button",this.t("open_energy"));t.href="/energy",e.prepend(t)}moreInfo(e){this.model(e).actions.more_info&&(this.nodes.modal.open&&(this.restoreFocus=null,this.nodes.modal.close()),this.dispatchEvent(new CustomEvent("hass-more-info",{detail:{entityId:e.entity},bubbles:!0,composed:!0})))}timerLabel(e){if(!e||["idle","unavailable"].includes(e.state))return"";if(e.remainingMs===null)return this.t(e.state);let t=Math.max(0,Math.ceil(e.remainingMs/1e3));return this.t("timed")+" · "+Z(Math.floor(t/60)+":"+String(t%60).padStart(2,"0"))}updateDevices(){let e=!1;for(let t of this.deviceViews.values()){let i=this.model(t.config);C(t.name,i.name),Ae(t.glyph,i.icon);let s=this.timerLabel(i.timer);i.timer?.state==="active"&&(e=!0),C(t.state,this.stateLabel(i)+(s?" · "+s:"")),t.state.dataset.tone=this.tone(i),t.more.hidden=!i.actions.more_info;let o=JSON.stringify(et.map(a=>i.actions[a]||null));o!==t.signature&&(t.signature=o,this.buildActions(t,i));let r=this.pending.has(t.config.entity);t.item.setAttribute("aria-busy",String(r));for(let a of t.group.querySelectorAll("button,input,select"))a.disabled=!this.canRequest(t.config.entity,a.dataset.action);for(let a of t.fields)this.syncField(a,i)}e&&!this.ticker&&this.isConnected&&(this.ticker=setInterval(()=>this.updateDevices(),1e3)),!e&&this.ticker&&(clearInterval(this.ticker),this.ticker=0)}paintSettings(){let e=this.nodes.content;if(e.className="settings",e.replaceChildren(),this._hass?.user?.is_admin){let t=z("control-button setup-entry",this.t("setup"),"mdi:tune-variant");t.onclick=()=>this.openPanel("setup",t),e.append(t)}for(let[t,i]of Object.entries(Q)){let s=k("fieldset","prefs-group");s.append(k("legend","",this.t(t)));let o=k("div","prefs-options");for(let r of i){let a=z("control-button",this.t(r));if(t==="background"){let l=k("span","swatch");l.style.background=zt[r],l.setAttribute("aria-hidden","true"),a.prepend(l)}a.value=r,a.dataset.preference=t,a.onclick=()=>this.setPreference(t,r),o.append(a)}s.append(o),e.append(s)}this.applyPreferences()}async paintSetup(){let e=this.panel,t=this.nodes.content,i=k("p","setup-status",this.t("setup_loading"));i.setAttribute("role","status"),t.className="setup-page",t.replaceChildren(i);let s=o=>this.t(["setup_storage","setup_conflict"].includes(o.code)?o.code:"setup_error");try{let o=await Ke(this._hass,location.pathname);if(this.panel!==e)return;let r=customElements.get("ll-strategy-dashboard-"+D).getConfigElement();r.classList.add("setup-editor"),r.setConfig(structuredClone(o.strategy)),r.hass=this._hass,this.setup={editor:r};let a=o.strategy,l=z("control-button",this.t("setup_save"),"mdi:content-save-outline");l.disabled=!0,r.addEventListener("config-changed",u=>{a=u.detail.config,l.disabled=JSON.stringify(a)===JSON.stringify(o.strategy)}),l.onclick=async()=>{l.disabled=!0,r.inert=!0,i.textContent=this.t("setup_saving");try{await We(this._hass,o,a),location.reload()}catch(u){if(this.panel!==e)return;i.textContent=s(u),r.inert=!1,l.disabled=u.code==="setup_conflict"}};let c=k("div","setup-footer");i.textContent="",c.append(i,l),t.replaceChildren(r,c)}catch(o){this.panel===e&&(i.textContent=s(o))}}paintActivity(){let e=[...(this.activeDevices||new Map).values()],t=JSON.stringify(e.map(({model:o,room:r})=>[o.entity,o.name,this.stateLabel(o),r.id]));if(t===this.activitySignature)return;this.activitySignature=t;let i=this.nodes.content;i.className="";let s=k("ul","activity-list");for(let{model:o,room:r,config:a}of e){let l=k("li"),c=z("control-button");c.append(k("span","",o.name+" · "+r.name),k("span","",this.stateLabel(o))),c.onclick=()=>this.openPanel("room",c,r,a.entity),l.append(c),s.append(l)}i.replaceChildren(e.length?s:k("p","empty",this.t("quiet")))}actionLabel(e){return this.t(e==="close"?"close_device":e)}buildActions(e,t){let i=this.shadowRoot.activeElement,s=i&&e.group.contains(i)?i.dataset.action:void 0;e.fields=[];let o=k("div","basic-actions"),r=[];for(let a of et){let l=t.actions[a];if(!l)continue;if(Ze.has(a)||l.options||typeof l.min=="number"||["set_temperature_range","start_timed"].includes(a)){r.push(this.buildField(e,l,a,t));continue}let c=z("control-button",this.actionLabel(a),It[a]);c.dataset.action=a,c.onclick=()=>this.requestAction(e.config,a,void 0,c),o.append(c)}e.group.replaceChildren(...o.childElementCount?[o]:[],...r),s&&([...e.group.querySelectorAll("[data-action]")].find(l=>l.dataset.action===s)||e.more).focus({preventScroll:!0})}numberInput(e,t){let i=k("input");i.type=t;for(let s of["min","max","step"])typeof e[s]=="number"&&(i[s]=String(e[s]));return t==="number"&&e.step==null&&(i.step="any"),i}buildField(e,t,i,s){let o=k("div","field-row"),r=i==="start_timed"?this.t("duration"):this.actionLabel(i),a=k("label","",r),l=Ze.has(i),c={action:t,id:i};if(t.options){c.input=k("select");for(let m of t.options){let p=k("option","",this.t(m));p.value=m,c.input.append(p)}}else c.input=this.numberInput(t,l?"range":"number");c.input.dataset.action=i,a.append(c.input),i==="set_temperature_range"&&(c.input.setAttribute("aria-label",r+" · "+this.t("min")),c.second=this.numberInput(t,"number"),c.second.dataset.action=i,c.second.setAttribute("aria-label",r+" · "+this.t("max")),a.append(c.second)),l&&(c.output=k("output","duration-label"),a.append(c.output));let u=()=>{c.dirty=!0,c.output&&C(c.output,c.input.value+"%")};c.input.addEventListener("input",u),c.second?.addEventListener("input",u);let g=z("control-button",i==="start_timed"?this.actionLabel(i):this.t("apply"));return g.dataset.action=i,I(g,i==="start_timed"?this.actionLabel(i):this.t("apply")+" · "+r),g.onclick=()=>{let m=c.input.localName==="select"?c.input.value:c.input.valueAsNumber,p=c.second?{low:c.input.valueAsNumber,high:c.second.valueAsNumber}:m;this.requestAction(e.config,i,p,g)},e.fields.push(c),this.syncField(c,s),o.append(a,g),o}syncField(e,t){let{id:i,input:s,second:o,action:r}=e,a=this.shadowRoot.activeElement;if(e.dirty||a===s||o&&a===o)return;let l=t.attributes;if(o)s.value=String(l.target_temp_low??r.min??18),o.value=String(l.target_temp_high??r.max??25);else if(i==="set_hvac_mode")s.value=t.state;else if(i==="start_timed")s.value=String(r.min??15);else if(i==="set_heating_level")s.value=String(Y(t.level)??r.min);else if(i==="set_brightness"){let c=Y(l.brightness);s.value=String(c===null?r.min??0:Math.round(c/255*100))}else s.localName==="select"?s.value=l[Qe[i]]??s.options[0]?.value??"":s.value=String(Y(l[Qe[i]])??r.min??0);s.localName==="select"&&s.selectedIndex===-1&&(s.selectedIndex=0),e.output&&C(e.output,s.value+"%")}canRequest(e,t){let i=this.pending.get(e);return!i||t==="stop"&&Ht.has(i.id)}requestAction(e,t,i,s){if(!this.canRequest(e.entity,t))return;let o=this.model(e),r=o.actions[t];if(!r)return;if(r.requiresCode)return this.moreInfo(e);if(!r.requiresConfirmation)return this.send(e,t,i);this.confirming={config:e,id:t,value:i,source:s};let a=this.nodes;C(a.confirmText,this.t("confirm_action").replace("{name}",o.name).replace("{action}",this.actionLabel(t))),a.confirm.open||a.confirm.showModal(),a.abort.focus({preventScroll:!0})}acceptAction(){let e=this.confirming;if(!(!e||!this.nodes.confirm.open))return this.nodes.confirm.close(),this.send(e.config,e.id,e.value,!0)}async send(e,t,i,s=!1){if(!this.canRequest(e.entity,t))return;let o=this.model(e);if(!o.actions[t])return;let r={id:t};this.pending.set(e.entity,r),this.announce(this.t("sending").replace("{name}",o.name)),this.update();try{let a=await this.controller.execute(e,t,i,{confirmed:s});if(this.pending.get(e.entity)!==r)return;let l=["confirmed","sent","unconfirmed"].includes(a?.status)?a.status:"sent";if(this.announce(this.t(l).replace("{name}",o.name)),a?.status==="confirmed")for(let c of this.deviceViews.get(e.entity)?.fields||[])c.id===t&&(c.dirty=!1)}catch{this.pending.get(e.entity)===r&&this.announce(this.t("send_error"))}finally{this.pending.get(e.entity)===r&&(this.pending.delete(e.entity),this.isConnected&&this.update())}}announce(e){if(!this.isConnected)return;clearTimeout(this.noticeTimer);let t=this.nodes;C(t.pageNotice,""),C(t.modalNotice,"");let i=t.modal.open?t.modalNotice:t.pageNotice;C(i,e),this.noticeTimer=setTimeout(()=>C(i,""),5200)}};customElements.get("bayit-dashboard")||(customElements.define("bayit-dashboard",Ce),window.customCards||=[],window.customCards.push({type:"bayit-dashboard",name:"Bayit 9",description:"A room-based Home Assistant dashboard.",preview:!1}));var Vt={en:{title:"Dashboard title",language:"Language",automatic:"Home Assistant language",areas:"Rooms",unassigned:"Include devices without a room",roomSelection:"Rooms on the dashboard",allRooms:"Automatic",selectedRooms:"Choose rooms and order",roomToAdd:"Available rooms",addRoom:"Show room",createRoom:"New dashboard-only room",newRoomName:"New room name",newRoomHint:"This room exists only on this dashboard.",roomName:"Room display name",roomToEdit:"Room to customize",roomIcon:"Room icon",defaultRoomIcon:"Default icon",newRoom:"Create room",customRoom:"Dashboard room",deleteRoom:"Delete dashboard room",noRooms:"No rooms to customize yet.",moveUp:"Move up",moveDown:"Move down",hideRoom:"Hide room",automaticDevices:"Automatic",manualDevices:"Choose devices and order",roomDevices:"Devices in this room",deviceToAdd:"Available devices",addDevice:"Add device",noDevices:"No devices selected.",noMatches:"No matching devices",missing:"Unavailable",atLeastOneRoom:"Keep one room selected, or switch back to automatic.",discovery:"Automatic device selection",controls:"Controls only",allDevices:"All supported devices",appearance:"Appearance",background:"Wallpaper",layout:"Room titles",shape:"Button shape",classic:"Alongside the controls",header:"At the top",soft:"Rounded",circle:"Circle",square:"Square",devices:"Device visibility",hidden:"Hide devices",included:"Add other entities",overview:"Home overview",overviewDevices:"Devices and sensors to show",overviewHint:"Choose devices for the overview button, such as a lock, people, a calendar or an energy sensor.",shortcuts:"Room shortcuts",shortcutRoom:"Room",automaticShortcuts:"Choose shortcuts automatically",shortcut:"Shortcut",shortcutHint:"Pick up to six devices in display order. All devices remain available inside the room.",noShortcutRooms:"Add a device to a visible room to set its shortcuts.",profiles:"Boiler and heater controls",entity:"Heating device",kind:"Control profile",heater:"Room heater",boiler:"Water heater or boiler",displayName:"Display name",start:"Scheduled start script",stop:"Stop script",timer:"Timer",none:"None",level:"Heating level entity",durationField:"Duration field",min:"Shortest run in minutes",max:"Longest run in minutes",step:"Step in minutes",add:"Add profile",save:"Save profile",edit:"Edit",remove:"Remove",clear:"Cancel",choose:"Select a device",invalid:"Select a heating device to save the profile.",hint:"Select the Home Assistant entities that already control this device. Use a server-side start script for timed heating.",units:"minutes",searchable:"Filter entities"},he:{title:"שם הדשבורד",language:"שפה",automatic:"שפת Home Assistant",areas:"חדרים",unassigned:"הצגת מכשירים ללא חדר",roomSelection:"חדרים בדשבורד",allRooms:"בחירה אוטומטית",selectedRooms:"בחירת חדרים וסדר",roomToAdd:"חדרים זמינים",addRoom:"הצגת חדר",createRoom:"חדר חדש לדשבורד",newRoomName:"שם החדר החדש",newRoomHint:"החדר יופיע בדשבורד הזה בלבד.",roomName:"שם החדר לתצוגה",roomToEdit:"חדר להתאמה אישית",roomIcon:"סמל החדר",defaultRoomIcon:"סמל ברירת המחדל",newRoom:"יצירת חדר",customRoom:"חדר בדשבורד",deleteRoom:"מחיקת חדר מהדשבורד",noRooms:"עדיין אין חדרים להתאמה.",moveUp:"העברה למעלה",moveDown:"העברה למטה",hideRoom:"הסתרת חדר",automaticDevices:"בחירה אוטומטית",manualDevices:"בחירת מכשירים וסדר",roomDevices:"מכשירים בחדר",deviceToAdd:"מכשירים זמינים",addDevice:"הוספת מכשיר",noDevices:"לא נבחרו מכשירים.",noMatches:"לא נמצאו מכשירים מתאימים",missing:"לא זמין",atLeastOneRoom:"השאירו חדר אחד לפחות, או חזרו לבחירה אוטומטית.",discovery:"בחירת מכשירים אוטומטית",controls:"מכשירים נשלטים בלבד",allDevices:"כל המכשירים הנתמכים",appearance:"מראה",background:"רקע",layout:"שמות חדרים",shape:"צורת כפתורים",classic:"לצד הכפתורים",header:"בראש הכרטיס",soft:"מעוגל",circle:"עיגול",square:"ריבוע",devices:"הצגת מכשירים",hidden:"הסתרת מכשירים",included:"הוספת ישויות נוספות",overview:"מבט על הבית",overviewDevices:"מכשירים וחיישנים לתצוגה",overviewHint:"בחרו מה יוצג במבט על הבית, למשל מנעול, אנשים, יומן או חיישן צריכת חשמל.",shortcuts:"קיצורים בחדרים",shortcutRoom:"חדר",automaticShortcuts:"בחירת קיצורים אוטומטית",shortcut:"קיצור",shortcutHint:"אפשר לבחור עד שישה מכשירים לפי סדר התצוגה. כל המכשירים נשארים זמינים בתוך החדר.",noShortcutRooms:"הוסיפו מכשיר לחדר שמוצג בדשבורד כדי לבחור קיצורים.",profiles:"שליטה בדוד ובתנורים",entity:"מכשיר חימום",kind:"סוג בקר",heater:"תנור חימום",boiler:"דוד או מחמם מים",displayName:"שם לתצוגה",start:"סקריפט הפעלה עם זמן",stop:"סקריפט כיבוי",timer:"טיימר",none:"ללא",level:"ישות עוצמת חימום",durationField:"שדה משך",min:"זמן מינימלי בדקות",max:"זמן מקסימלי בדקות",step:"מרווח בחירה בדקות",add:"הוספת בקר",save:"שמירת בקר",edit:"עריכה",remove:"הסרה",clear:"ביטול",choose:"בחירת מכשיר",invalid:"בחרו מכשיר חימום לפני השמירה.",hint:"בחרו את הישויות שכבר שולטות במכשיר ב־Home Assistant. לחימום מתוזמן, השתמשו בסקריפט שפועל בשרת.",units:"דקות",searchable:"סינון ישויות"}},st={"mdi:home-outline":{en:"Home",he:"בית"},"mdi:sofa-outline":{en:"Living room",he:"סלון"},"mdi:stove":{en:"Kitchen",he:"מטבח"},"mdi:bed-outline":{en:"Bedroom",he:"חדר שינה"},"mdi:shower":{en:"Bathroom",he:"מקלחת"},"mdi:desk":{en:"Office",he:"משרד"},"mdi:toy-brick-outline":{en:"Playroom",he:"חדר משחקים"},"mdi:washing-machine":{en:"Laundry",he:"כביסה"},"mdi:garage-variant":{en:"Garage",he:"חניה"},"mdi:tree-outline":{en:"Garden",he:"גינה"},"mdi:floor-plan":{en:"Hallway",he:"מסדרון"},"mdi:door-open":{en:"Entrance",he:"כניסה"}},$t=":host { display: block; color: var(--primary-text-color); }form { display: grid; gap: 14px; padding-block: 8px; }label.field { display: grid; gap: 6px; min-width: 0; font-weight: 600; }input:not([type=checkbox]),select { width: 100%; box-sizing: border-box; min-height: 44px; border: 1px solid var(--divider-color,#999); border-radius: 8px; padding: 8px 10px; font: inherit; color: inherit; background: var(--card-background-color,#fff); }input[type=checkbox] { inline-size: 18px; block-size: 18px; flex: none; margin-inline: 0 9px; }input,select,button,summary { accent-color: var(--primary-color,#03a9f4); }select[multiple] { min-height: 106px; }label.check { min-block-size: 42px; display: flex; align-items: center; }details,fieldset { border: 1px solid var(--divider-color,#999); border-radius: 10px; padding: 8px 12px 12px; min-inline-size: 0; }summary { padding-block: 8px; min-block-size: 24px; font-weight: 650; cursor: pointer; }.stack { display: grid; gap: 12px; margin-block-start: 8px; }.grid { display: grid; gap: 10px; grid-template-columns: repeat(2,minmax(0,1fr)); }.actions,.record { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }.record { padding-block: 5px; border-block-end: 1px solid var(--divider-color,#999); }.record span { flex: 1; overflow-wrap: anywhere; }button { min-height: 42px; border-radius: 8px; border: 1px solid var(--primary-color,#0277bd); color: var(--primary-text-color); background: var(--card-background-color,#fff); cursor: pointer; padding: 6px 10px; font: inherit; }[hidden] { display: none !important; }p { margin: 0; color: var(--secondary-text-color); font-size: .95em; }.error { color: var(--error-color,#b00020); }:focus-visible { outline: 2px solid var(--primary-color,#03a9f4); outline-offset: 2px; }@media (max-width: 340px) { .grid { grid-template-columns: minmax(0,1fr); } }",Yt=`
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
`;function rt(n){for(let e in n??{})if(Object.hasOwn(n,e))return!0;return!1}function Ne(n){return Array.isArray(n)?[...new Set(n.filter(e=>typeof e=="string"&&e.trim()))]:[]}function at(n,e,t){let i=[...n],s=e+t;return[i[e],i[s]]=[i[s],i[e]],i}function ct(n,e,t,i,s=!1,o=""){return v("ul",{className:"room-list"},n.map((r,a)=>{let l=(c,u,g,m,p)=>{let d=P(c,p);return d.setAttribute("aria-label",u+" · "+r.name),d.title=u,d.disabled=g,d.dataset.roomFocus=o+":"+r.id+":"+m,d};return v("li",{className:"room-entry"},[v("span",{className:"room-entry-name"},[r.name,...r.secondary?[v("small",{textContent:r.secondary})]:[]]),v("span",{className:"room-entry-buttons"},[l("↑",t.moveUp,a===0,"up",()=>e(at(n,a,-1),o+":"+r.id+":up")),l("↓",t.moveDown,a===n.length-1,"down",()=>e(at(n,a,1),o+":"+r.id+":down")),l("×",i,s&&n.length===1,"remove",()=>e(n.filter(c=>c.id!==r.id)))])])}))}function lt(n,e,t,i,s){let o=O([["",i],...e],""),r=P(t,()=>{o.value&&s(o.value)});return r.disabled=!0,o.addEventListener("change",()=>{r.disabled=!o.value}),{input:o,action:r,wrapper:v("div",{className:"room-add"},[S(n,o),r])}}function Kt(n,e){let t=n.entities?.[e],i=n.devices?.[t?.device_id??t?.di];return t?.area_id??t?.ai??i?.area_id??i?.ai}function v(n,e={},t=[]){let i=Object.assign(document.createElement(n),e);return i.append(...t),i}function dt(n,e,t){let i=v("input",{type:"checkbox",checked:e});return i.addEventListener("change",()=>t(i.checked)),v("label",{className:"check"},[i,n])}function ce(n,e){return v("option",{value:n,textContent:e})}function O(n,e){let t=v("select",{},n.map(([i,s])=>ce(i,s)));return t.value=e,t}var Wt=0;function S(n,e){let t=v("span",{id:"bayit9-editor-label-"+ ++Wt,textContent:n});return e.setAttribute("aria-labelledby",t.id),v("label",{className:"field"},[t,e])}function P(n,e){let t=v("button",{type:"button",textContent:n});return t.addEventListener("click",e),t}function Re(n,e){return Object.entries(n.states??{}).filter(([t])=>!e||e.has(t.split(".")[0])).map(([t,i])=>{let s=i.attributes?.friendly_name;return[t,s&&s!==t?s+" · "+t:t]}).sort((t,i)=>t[1].localeCompare(i[1]))}function B(n,e,t,i){let s=v("summary",{textContent:n}),o=v("details",{open:e},[s,...i]);return s.addEventListener("click",()=>t(!o.open)),o.addEventListener("toggle",()=>{o.isConnected&&t(o.open)}),o}var le=class extends HTMLElement{#t={};#e={type:"custom:"+D};#i={};#s;#p;#c;#r="";#d="";#a=!1;#u;constructor(){super(),this.attachShadow({mode:"open"})}set hass(e){let t=this.#t;this.#t=e??{},(t.areas!==this.#t.areas||t.entities!==this.#t.entities||t.devices!==this.#t.devices||!rt(t.states)&&rt(this.#t.states)||(t.locale?.language??t.language)!==(e?.locale?.language??e?.language))&&this.render()}setConfig(e){this.#e={type:"custom:"+D,...e};let t=JSON.stringify(this.#e);t!==this.#u&&(this.#u=t,this.render())}connectedCallback(){this.render()}#n(e){this.#e={...this.#e,...e},this.#u=JSON.stringify(this.#e),this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:this.#e},bubbles:!0,composed:!0}))}#o(e,t){if(this.#n(e),this.render(),!t)return;let i=[...this.shadowRoot.querySelectorAll("[data-room-focus]")];(i.find(o=>o.dataset.roomFocus===t&&!o.disabled)??i.find(o=>!o.disabled&&o.dataset.roomFocus===t.replace(/:(up|down)$/,(r,a)=>a==="up"?":down":":up")))?.focus({preventScroll:!0})}#h(e){let t=this.#e.room_overrides??{};return Object.hasOwn(t,e)&&t[e]&&typeof t[e]=="object"?t[e]:{}}#l(e,t,i){let s={...this.#e.room_overrides};Object.keys(t).length?s[e]=t:delete s[e],this.#o({room_overrides:s},i)}#f(e,t,i,s){let o=[["",i.defaultRoomIcon],...Object.entries(st).map(([c,u])=>[c,u[s]])],r=typeof t.icon=="string"?t.icon:"";r&&!Object.hasOwn(st,r)&&o.push([r,r]);let a=O(o,r);a.dataset.roomFocus="room-icon",a.addEventListener("change",()=>{let c={...t};a.value?c.icon=a.value:delete c.icon,this.#l(e.id,c,"room-icon")});let l=v("ha-icon");return l.setAttribute("icon",e.icon||"mdi:home-outline"),l.setAttribute("aria-hidden","true"),v("div",{className:"room-icon-field"},[S(i.roomIcon,a),v("span",{className:"room-icon-preview"},[l])])}#g(e,t,i,s){let o=this.#h(e.id),r=e.custom||Array.isArray(o.entities),a=O([["auto",t.automaticDevices],["manual",t.manualDevices]],r?"manual":"auto");a.dataset.roomFocus="room-device-mode",a.addEventListener("change",()=>{let y={...o};a.value==="auto"?delete y.entities:y.entities=$({...this.#e,area_ids:[e.id]},this.#t,i).find(f=>f.id===e.id)?.entities.map(f=>f.entity)??[],this.#l(e.id,y,"room-device-mode")});let l=e.custom?[v("h4",{className:"room-choice-heading",textContent:t.roomDevices})]:[S(t.roomDevices,a)];if(!r)return l;let c=new Map(s.map(y=>[y.id,y.name])),u=new Map(Be(this.#e,this.#t).map(y=>[y.entity,y])),g=Ne(o.entities),m=g.map(y=>{let f=u.get(y),x=this.#t.states?.[y]?.attributes?.friendly_name;return{id:y,name:f?.name||x||y,secondary:f?"":t.missing}}),p=(y,f)=>this.#l(e.id,{...o,entities:y.map(x=>x.id)},f);l.push(m.length?ct(m,p,t,t.remove,!1,"devices"):v("p",{textContent:t.noDevices}));let d=new Set(g),h=[...u.values()].filter(y=>!d.has(y.entity)).map(y=>({id:y.entity,name:y.name||y.entity,area:Kt(this.#t,y.entity)}));h.sort((y,f)=>+(f.area===e.id)-+(y.area===e.id)||y.name.localeCompare(f.name,i));let b=new Map;for(let y of h)b.set(y.name,(b.get(y.name)??0)+1);let _=lt(t.deviceToAdd,[],t.addDevice,t.choose,y=>{this.#l(e.id,{...o,entities:[...g,y]},"room-device-picker")});_.input.dataset.roomFocus="room-device-picker";let w=v("input",{type:"search",placeholder:t.searchable,value:this.#r});w.dataset.roomFocus="room-device-search";let A=()=>{let y=w.value.trim().toLocaleLowerCase(i),f=h.filter(x=>{let N=c.get(x.area)??"";return(x.name+" "+N+" "+x.id).toLocaleLowerCase(i).includes(y)});_.input.replaceChildren(ce("",f.length?t.choose:t.noMatches),...f.map(x=>{let N=x.name,q=x.area!==e.id&&c.get(x.area),j=b.get(N)>1?[q,x.id].filter(Boolean).join(" · "):q;return ce(x.id,j?N+" · "+j:N)})),_.input.disabled=!f.length,_.action.disabled=!0};return w.addEventListener("input",()=>{this.#r=w.value,A()}),A(),l.push(S(t.searchable,w),_.wrapper),l}#b(e,t,i){let s=v("input",{maxLength:80,value:this.#d});s.dataset.roomFocus="new-room-name";let o=P(i.newRoom,()=>{let r=s.value.trim();if(!r)return;let a=new Set([...e.map(g=>g.id),...Ne(this.#e.area_ids),...Object.keys(this.#e.room_overrides??{})]),l=1;for(;a.has(ye+l);)l++;let c=ye+l,u={room_overrides:{...this.#e.room_overrides,[c]:{name:r,entities:[]}}};(t.length||this.#a)&&(u.area_ids=[...t,c]),this.#a=!1,this.#d="",this.#i.newRoom=!1,this.#c=c,this.#r="",this.#o(u,"room-edit")});return o.disabled=!this.#d.trim(),s.addEventListener("input",()=>{this.#d=s.value,o.disabled=!s.value.trim()}),s.addEventListener("keydown",r=>{r.key==="Enter"&&!r.isComposing&&(r.preventDefault(),o.disabled||o.click())}),B(i.createRoom,this.#i.newRoom,r=>{this.#i.newRoom=r},[v("div",{className:"stack"},[v("p",{textContent:i.newRoomHint}),v("div",{className:"room-add"},[S(i.newRoomName,s),o])])])}#y(e,t){let i=He(this.#e,this.#t).sort((p,d)=>p.name.localeCompare(d.name,t)),s=new Map(i.map(p=>[p.id,p])),o=Ne(this.#e.area_ids),r=o.length>0||this.#a,a=O([["auto",e.allRooms],["custom",e.selectedRooms]],r?"custom":"auto");a.dataset.roomFocus="room-mode",a.addEventListener("change",()=>{if(a.value==="auto"){this.#a=!1,this.#o({area_ids:[]},"room-mode");return}let p=$(this.#e,this.#t,t).map(d=>d.id).filter(d=>s.has(d));p.length?this.#o({area_ids:p},"room-mode"):(this.#a=!0,this.render(),this.shadowRoot.querySelector('[data-room-focus="room-mode"]')?.focus({preventScroll:!0}))});let l=O([["all",e.allDevices],["controls",e.controls]],this.#e.discovery_mode==="controls"?"controls":"all");l.dataset.roomFocus="room-discovery",l.addEventListener("change",()=>this.#o({discovery_mode:l.value},"room-discovery"));let c=dt(e.unassigned,this.#e.show_unassigned!==!1,p=>this.#o({show_unassigned:p},"room-unassigned"));c.firstElementChild.dataset.roomFocus="room-unassigned";let u=[S(e.roomSelection,a),S(e.discovery,l),c];if(r){let p=o.map(b=>({id:b,name:s.get(b)?.name??b,secondary:s.get(b)?.custom?e.customRoom:s.has(b)?"":e.missing}));p.length&&u.push(ct(p,(b,_)=>this.#o({area_ids:b.map(w=>w.id)},_),e,e.hideRoom,!0,"rooms")),p.length<=1&&u.push(v("p",{className:"room-picker-hint",textContent:e.atLeastOneRoom}));let d=new Set(o),h=i.filter(b=>!d.has(b.id));if(h.length){let b=lt(e.roomToAdd,h.map(_=>[_.id,_.name]),e.addRoom,e.none,_=>{this.#a=!1,this.#c=_,this.#r="",this.#o({area_ids:[...o,_]},"room-edit")});u.push(b.wrapper)}}let g=r?o.map(p=>s.get(p)).filter(Boolean):i,m=g.find(p=>p.id===this.#c)??g[0];if(m){let p=O(g.map(w=>[w.id,w.name]),m.id);p.dataset.roomFocus="room-edit",p.addEventListener("change",()=>{this.#c=p.value,this.#r="",this.render(),this.shadowRoot.querySelector('[data-room-focus="room-edit"]')?.focus({preventScroll:!0})});let d=this.#h(m.id),h=v("input",{value:d.name??"",maxLength:80,placeholder:m.name,required:!!m.custom});h.dataset.roomFocus="room-name";let b=()=>{let w=h.value.trim();if(!w&&m.custom){h.value=d.name??m.name;return}if(w===(d.name??""))return;let A={...d};w?A.name=w:delete A.name,this.#l(m.id,A,"room-name")};h.addEventListener("change",b),h.addEventListener("keydown",w=>{w.key==="Enter"&&!w.isComposing&&(w.preventDefault(),b())});let _=[S(e.roomToEdit,p),S(e.roomName,h),this.#f(m,d,e,t),...this.#g(m,e,t,i)];if(m.custom){let w=P(e.deleteRoom,()=>{let A={...this.#e.room_overrides};delete A[m.id];let y={...this.#e.room_shortcuts};delete y[m.id],this.#c=void 0,this.#r="",this.#o({room_overrides:A,area_ids:o.filter(f=>f!==m.id),room_shortcuts:y},"room-mode")});w.className="room-danger",_.push(w)}u.push(..._)}else u.push(v("p",{textContent:e.noRooms}));return u.push(this.#b(i,o,e)),[v("div",{className:"stack"},u)]}#m(e,t,i,s=Re(this.#t)){let o=v("input",{type:"search",placeholder:i.searchable}),r=v("select",{multiple:!0,size:4});o.setAttribute("aria-label",i.searchable+" · "+e);let a=()=>{let l=o.value.trim().toLocaleLowerCase(),c=new Set(this.#e[t]??[]);r.replaceChildren(...s.filter(u=>c.has(u[0])||!l||u[1].toLocaleLowerCase().includes(l)).map(([u,g])=>v("option",{value:u,textContent:g,selected:c.has(u)})))};return o.addEventListener("input",a),r.addEventListener("change",()=>this.#n({[t]:[...r.selectedOptions].map(l=>l.value)})),a(),v("div",{className:"stack"},[o,S(e,r)])}#v(e,t){let i=$(this.#e,this.#t,t);if(!i.length)return[v("p",{textContent:e.noShortcutRooms})];let s=i.find(d=>d.id===this.#p)??i[0],o=this.#e.room_shortcuts??{},r=Object.hasOwn(o,s.id)&&Array.isArray(o[s.id])?o[s.id]:null,a=O(i.map(d=>[d.id,d.name]),s.id),l=new Map(s.entities.map(d=>[d.entity,d.name||d.entity]));for(let d of r??[])typeof d=="string"&&!l.has(d)&&l.set(d,d);let c=Array.from({length:V},(d,h)=>{let b=r?.[h]??"";return O([["",e.none],...l],b)}),u=v("div",{className:"grid",hidden:r==null},c.map((d,h)=>S(e.shortcut+" "+(h+1),d))),g=()=>{let d=new Set(c.map(h=>h.value).filter(Boolean));for(let h of c)for(let b of h.options)b.disabled=b.value!==h.value&&d.has(b.value)},m=()=>{this.#n({room_shortcuts:{...this.#e.room_shortcuts,[s.id]:c.map(d=>d.value).filter(Boolean)}})};g();for(let d of c)d.addEventListener("change",()=>{g(),m()});a.addEventListener("change",()=>{this.#p=a.value,this.render()});let p=dt(e.automaticShortcuts,r==null,d=>{if(u.hidden=d,d){let h={...this.#e.room_shortcuts};delete h[s.id],this.#n({room_shortcuts:h})}else m()});return[v("p",{textContent:e.shortcutHint}),S(e.shortcutRoom,a),p,u]}#_(e){let t=Array.isArray(this.#e.profiles)?this.#e.profiles:[],i=[v("p",{textContent:e.hint})];for(let y of t)y?.entity&&i.push(v("div",{className:"record"},[v("span",{textContent:y.name||this.#t.states?.[y.entity]?.attributes?.friendly_name||y.entity}),P(e.edit,()=>{this.#s=y,this.render()}),P(e.remove,()=>{this.#s?.entity===y.entity&&(this.#s=void 0),this.#n({profiles:t.filter(f=>f.entity!==y.entity)}),this.render()})]));if(this.#s==null)return i.push(v("div",{className:"actions"},[P(e.add,()=>{this.#s={},this.render()})])),i;let s=this.#s,o=s.timed??{},r=O([["",e.choose],...Re(this.#t,new Set(_e))],s.entity||"");s.entity&&!r.value&&(r.append(ce(s.entity,s.entity)),r.value=s.entity);let a=O([["heater",e.heater],["boiler",e.boiler]],s.kind||"heater"),l=v("input",{value:s.name??"",maxLength:80}),c=(y,f)=>{let x=Re(this.#t,new Set([y]));return f&&!x.some(([N])=>N===f)&&x.unshift([f,f]),O([["",e.none],...x],f||"")},u=c("number",s.level_entity),g=c("script",o.start_script),m=c("script",o.stop_script),p=c("timer",o.timer_entity),d=v("input",{value:o.duration_field||"duration",maxLength:40}),h=y=>v("input",{type:"number",min:"1",max:"360",value:String(y)}),b=h(o.min_minutes??15),_=h(o.max_minutes??60),w=h(o.step_minutes??15),A=v("p",{className:"error",hidden:!0,textContent:e.invalid});return A.setAttribute("role","alert"),i.push(S(e.entity,r),S(e.kind,a),S(e.displayName,l),S(e.level,u),S(e.start,g),S(e.stop,m),S(e.timer,p),S(e.durationField,d),v("div",{className:"grid"},[S(e.min,b),S(e.max,_),S(e.step,w)]),A,v("div",{className:"actions"},[P(e.save,()=>{let y=we({entity:r.value,kind:a.value,name:l.value,level_entity:u.value,timed:{start_script:g.value,stop_script:m.value,timer_entity:p.value,duration_field:d.value,min_minutes:b.valueAsNumber,max_minutes:_.valueAsNumber,step_minutes:w.valueAsNumber}});if(!y){A.hidden=!1,r.focus();return}this.#s=void 0,this.#n({profiles:[...t.filter(f=>f.entity!==s.entity&&f.entity!==y.entity),y]}),this.render()}),P(e.clear,()=>{this.#s=void 0,this.render()})])),i}render(){if(!this.isConnected)return;let e=ae(this.#e.locale,this.#t),t=Vt[e],i=v("input",{value:this.#e.title??"",maxLength:80});i.addEventListener("change",()=>this.#n({title:i.value.trim()}));let s=O([["auto",t.automatic],["en","English"],["he","עברית"]],this.#e.locale??"auto");s.addEventListener("change",()=>{this.#n({locale:s.value}),this.render()});let o=(c,u,g,m)=>{let p=O(g,this.#e[u]??m);return p.addEventListener("change",()=>this.#n({[u]:p.value})),S(c,p)},r=Object.entries(ve).map(([c,u])=>[c,u[e]]),a=$(this.#e,this.#t,e).flatMap(c=>c.entities.map(u=>[u.entity,(u.name||u.entity)+" · "+c.name])),l=v("form",{dir:e==="he"?"rtl":"ltr"},[S(t.title,i),S(t.language,s),B(t.areas,this.#i.rooms,c=>{this.#i.rooms=c},this.#y(t,e)),B(t.appearance,this.#i.appearance,c=>{this.#i.appearance=c},[v("div",{className:"stack"},[o(t.background,"background",r,"aurora"),o(t.layout,"layout",[["classic",t.classic],["header",t.header]],"classic"),o(t.shape,"shape",[["soft",t.soft],["circle",t.circle],["square",t.square]],"soft")])]),B(t.devices,this.#i.devices,c=>{this.#i.devices=c},[this.#m(t.hidden,"hidden_entities",t),this.#m(t.included,"included_entities",t)]),B(t.overview,this.#i.overview,c=>{this.#i.overview=c},[v("p",{textContent:t.overviewHint}),this.#m(t.overviewDevices,"overview_entities",t,a)]),B(t.shortcuts,this.#i.shortcuts,c=>{this.#i.shortcuts=c},[v("div",{className:"stack"},this.#v(t,e))]),B(t.profiles,this.#i.profiles,c=>{this.#i.profiles=c},[v("div",{className:"stack"},this.#_(t))])]);l.addEventListener("submit",c=>c.preventDefault()),this.shadowRoot.replaceChildren(v("style",{textContent:$t+Yt}),l)}};var ut="ll-strategy-dashboard-"+D,Ee="bayit-9-strategy-editor",Oe=class extends HTMLElement{static registryDependencies=["areas","devices","entities"];static generate(e,t){return Ge(e,t)}static getCreateSuggestions(e){return Ue(e)}static getConfigElement(){return document.createElement(Ee)}};function mt(){customElements.get(ut)||customElements.define(ut,Oe),customElements.get(Ee)||customElements.define(Ee,le),window.customStrategies??=[],window.customStrategies.some(n=>n.type===D&&n.strategyType==="dashboard")||window.customStrategies.push({type:D,strategyType:"dashboard",name:"Bayit 9",description:"A room-based Liquid Glass dashboard for Home Assistant.",documentationURL:"https://github.com/yahavzarfati/bayit-9"})}mt();
