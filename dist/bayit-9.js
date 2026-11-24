/*! Bayit 9 v0.1.0 */
var ge=`
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
    --glass: rgba(233,247,255,.075);
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
    padding: clamp(14px, 3vw, 34px);
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
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding-block-end: 15px;
  }
  .brand { display: flex; align-items: center; gap: 9px; min-width: 0; }
  .brand h1 {
    margin: 0;
    font-size: clamp(23px, 5vw, 35px);
    letter-spacing: -.035em;
    line-height: 1.07;
    overflow-wrap: anywhere;
  }
  .toolbar-actions { display: flex; flex: none; gap: 7px; }
  .chrome-button, .round-action, .quick-button {
    position: relative;
    display: inline-grid;
    place-items: center;
    padding: 0;
    min-width: 44px;
    min-height: 44px;
    background: var(--control);
    border: 1px solid var(--line);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.15);
    border-radius: var(--control-radius);
  }
  .chrome-button { -webkit-backdrop-filter: blur(5px) saturate(112%); backdrop-filter: blur(5px) saturate(112%); }
  .chrome-button:where(:hover, [aria-expanded=true]), .round-action:hover, .quick-button:hover {
    background: rgba(240,251,255,.18);
  }
  .badge {
    position: absolute;
    inset-block-end: -2px;
    inset-inline-end: -3px;
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
  .rooms { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: clamp(8px,2vw,16px); }
  .room {
    display: grid;
    grid-template-areas: "status" "quick" "title";
    grid-template-rows: 23px minmax(44px,1fr) auto;
    gap: 8px;
    min-width: 0;
    min-height: 148px;
    padding: 10px;
    border-radius: 20px;
    border: 1px solid var(--line);
    background: linear-gradient(152deg,rgba(247,253,255,.095),transparent 70%),var(--glass);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.13);
    -webkit-backdrop-filter: blur(11px) saturate(118%);
    backdrop-filter: blur(11px) saturate(118%);
  }
  .room[data-current] { outline: 2px solid var(--warm); outline-offset: -3px; }
  .shell[data-layout=header] .room {
    grid-template-areas: "title" "status" "quick";
    grid-template-rows: auto 23px minmax(44px,1fr);
  }
  .room-title {
    grid-area: title;
    display: grid;
    grid-template-columns: 20px minmax(0,1fr) 10px;
    gap: 6px;
    align-items: center;
    text-align: start;
    min-width: 0;
    min-height: 44px;
    padding: 3px 0;
    border: 0;
    border-radius: 8px;
    background: transparent;
    font-size: 15px;
    line-height: 1.15;
    font-weight: 760;
  }
  .room-title span { overflow-wrap: anywhere; }
  .shell[data-layout=header] .room-title span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .room-title .chevron { --mdc-icon-size: 13px; width: 13px; height: 13px; color: var(--secondary); }
  .room-status {
    grid-area: status;
    justify-self: start;
    max-width: 100%;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    border-radius: 999px;
    color: var(--secondary);
    font-size: 11px;
    font-weight: 700;
    padding: 2px 7px;
    border: 1px solid var(--soft-line);
    white-space: nowrap;
    overflow: hidden;
  }
  .room-status ha-icon { --mdc-icon-size: 13px; width: 13px; height: 13px; }
  .room-status span { overflow: hidden; text-overflow: ellipsis; }
  .room-status[data-tone=warm] { color: var(--warm); }
  .room-status[data-tone=moving] { color: var(--moving); }
  .quick { grid-area: quick; display: grid; grid-template-columns: repeat(2,minmax(44px,1fr)); gap: 7px; align-self: center; }
  .quick-button { min-width: 44px; min-height: 44px; }
  .shell[data-shape=circle] .quick-button { width: 44px; height: 44px; justify-self: center; }
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
    .room, .chrome-button { -webkit-backdrop-filter: none; backdrop-filter: none; }
    .shell { --line: rgba(255,255,255,.58); --soft-line: rgba(255,255,255,.31); }
  }
  @media (prefers-reduced-motion: reduce) {
    .modal[open], .quick-button[aria-busy=true]::after { animation: none; }
  }
  @container(max-width: 275px) {
    .rooms { grid-template-columns: 1fr; }
    .brand h1 { font-size: 20px; }
  }
  @container(min-width: 650px) {
    .room { padding: 14px; }
    .room-title { font-size: 18px; }
    .quick { grid-template-columns: repeat(2,minmax(44px,60px)); }
    .room-status { font-size: 12px; }
  }
`;var Q={en:{home:"Home",settings:"Appearance",close:"Close",activity:"Active devices",rooms:"Rooms",more_info:"More info",empty:"No rooms have been added.",empty_room:"No devices in this room.",quiet:"All quiet",active:"active",unavailable:"Unavailable",unknown:"Unknown state",apply:"Apply",cancel:"Cancel",confirm:"Confirm",confirm_title:"Confirm action",confirm_action:"Continue with {action} on {name}?",send_error:"Could not complete the action.",sending:"Sending {name}…",confirmed:"{name} updated.",sent:"Command sent to {name}.",unconfirmed:"No confirmation received for {name}.",background:"Background",shape:"Button shape",layout:"Room layout",aurora:"Aurora",lagoon:"Lagoon",dunes:"Dunes",graphite:"Graphite",soft:"Rounded",circle:"Round",square:"Square",classic:"Room name below",header:"Room name above",turn_on:"Turn on",turn_off:"Turn off",open:"Open",close_device:"Close",stop:"Stop",set_position:"Position",lock:"Lock",unlock:"Unlock",set_hvac_mode:"Mode",set_temperature:"Target temperature",set_temperature_range:"Temperature range",set_fan_mode:"Fan speed",set_preset_mode:"Preset",set_operation_mode:"Operating mode",set_percentage:"Speed",set_brightness:"Brightness",start_timed:"Start timer",stop_timed:"Stop timer",duration:"Minutes",min:"Minimum",max:"Maximum",timed:"Timer",on:"On",off:"Off",opening:"Opening",closing:"Closing",opened:"Open",closed:"Closed",locked:"Locked",unlocked:"Unlocked",locking:"Locking",unlocking:"Unlocking",jammed:"Jammed",cool:"Cooling",heat:"Heating",heat_cool:"Heat / cool",dry:"Dry",fan_only:"Fan",auto:"Auto",idle:"Idle",paused:"Paused",playing:"Playing",cleaning:"Cleaning",docked:"Docked",available_option:"Choose an option"},he:{home:"בית",settings:"מראה",close:"סגירה",activity:"מכשירים פעילים",rooms:"חדרים",more_info:"מידע נוסף",empty:"עדיין אין חדרים בדשבורד.",empty_room:"אין מכשירים בחדר הזה.",quiet:"הכול שקט",active:"פעיל",unavailable:"לא זמין",unknown:"מצב לא ידוע",apply:"החל",cancel:"ביטול",confirm:"אישור",confirm_title:"אישור פעולה",confirm_action:"להמשיך בפעולה ״{action}״ עבור {name}?",send_error:"הפעולה לא הושלמה.",sending:"שולח פקודה אל {name}…",confirmed:"המצב של {name} עודכן.",sent:"נשלחה פקודה אל {name}.",unconfirmed:"עדיין לא התקבל אישור מצב עבור {name}.",background:"רקע",shape:"צורת הכפתורים",layout:"פריסת החדרים",aurora:"זוהר צפוני",lagoon:"לגונה",dunes:"דיונות",graphite:"גרפיט",soft:"פינות מעוגלות",circle:"עגול",square:"מרובע",classic:"שם החדר למטה",header:"שם החדר למעלה",turn_on:"הדלקה",turn_off:"כיבוי",open:"פתיחה",close_device:"סגירה",stop:"עצירה",set_position:"מיקום",lock:"נעילה",unlock:"פתיחת מנעול",set_hvac_mode:"מצב עבודה",set_temperature:"טמפרטורת יעד",set_temperature_range:"טווח טמפרטורה",set_fan_mode:"מהירות מאוורר",set_preset_mode:"תוכנית",set_operation_mode:"מצב פעולה",set_percentage:"מהירות",set_brightness:"בהירות",start_timed:"הפעלת טיימר",stop_timed:"עצירת טיימר",duration:"דקות",min:"מינימום",max:"מקסימום",timed:"טיימר",on:"פועל",off:"כבוי",opening:"נפתח",closing:"נסגר",opened:"פתוח",closed:"סגור",locked:"נעול",unlocked:"לא נעול",locking:"ננעל",unlocking:"משתחרר",jammed:"תקוע",cool:"קירור",heat:"חימום",heat_cool:"חימום / קירור",dry:"ייבוש",fan_only:"אוורור",auto:"אוטומטי",idle:"בהמתנה",paused:"מושהה",playing:"מנגן",cleaning:"מנקה",docked:"בעמדה",available_option:"בחירת אפשרות"}};var Pe=/^[a-z][a-z0-9_]*\.[a-z0-9_]+$/,Fe=/^[A-Za-z_][A-Za-z0-9_]*$/,U=Object.freeze(["switch","climate","fan","water_heater"]),je=["off","heat","cool","heat_cool","auto","dry","fan_only"],B={open:1,close:2,position:4,stop:8},H={speed:1,preset:8,off:16,on:32},D={temperature:1,range:2,fan:8,preset:16,off:128,on:256},ee={temperature:1,operation:2,power:8},Be={open:"open_cover",close:"close_cover",stop:"stop_cover",set_position:"set_cover_position",set_brightness:"turn_on",set_temperature_range:"set_temperature"},ie={set_position:"position",set_brightness:"brightness_pct",set_percentage:"percentage",set_hvac_mode:"hvac_mode",set_fan_mode:"fan_mode",set_preset_mode:"preset_mode",set_operation_mode:"operation_mode",set_temperature:"temperature"},be=Symbol("request-timed-out"),A=class extends Error{constructor(e,t,i){super(t,i),this.name="DeviceControlError",this.code=e}};function V(n,e){return typeof n=="string"&&Pe.test(n)&&(!e||n.startsWith(e+"."))}function O(n){return typeof n?.state=="string"&&n.state!==""&&!["unavailable","unknown"].includes(n.state)}function He(n,e){if(n===void 0)return null;if(!n||typeof n!="object"||Array.isArray(n)||!U.includes(e))throw new A("invalid_config","A timed profile requires a heating-capable entity.");let{start_script:t,stop_script:i,timer_entity:o,duration_field:r="duration",min_minutes:s=1,max_minutes:a=60,step_minutes:c=1}=n;if(t!==void 0&&!V(t,"script")||i!==void 0&&!V(i,"script")||o!==void 0&&!V(o,"timer")||typeof r!="string"||!Fe.test(r)||![s,a,c].every(Number.isSafeInteger)||s<1||a<s||c<1)throw new A("invalid_config","The timed profile includes an invalid entity or duration setting.");return{start_script:t,stop_script:i,timer_entity:o,duration_field:r,min_minutes:s,max_minutes:a,step_minutes:c}}function ye(n){if(!n||!V(n.entity))throw new A("invalid_config","Configure a Home Assistant entity ID.");let e=n.entity.split(".")[0],t=n.kind??e;if(t!==e&&(!["heater","boiler"].includes(t)||!U.includes(e)))throw new A("invalid_config","The entity does not support the requested device profile.");if(n.confirmation_ms!==void 0&&(!Number.isSafeInteger(n.confirmation_ms)||n.confirmation_ms<0))throw new A("invalid_config","The confirmation time must be a nonnegative number of milliseconds.");return{...n,kind:t,domain:e,timed:He(n.timed,e)}}function Ve(n){if(typeof n!="string")return null;let e=/^(?:(\d+) days?, )?(\d+):([0-5]\d):([0-5]\d)(?:\.(\d{1,6}))?$/.exec(n);if(!e)return null;let[,t,i,o,r,s]=e,a=((Number(t??0)*24+Number(i))*3600+Number(o)*60+Number(r)+(s?+("0."+s):0))*1e3;return Number.isFinite(a)?a:null}function ne(n){return typeof n=="string"&&/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(n)?Date.parse(n):NaN}function Ue(n,e,t){if(!n)return null;let i=e?.[n],o=["active","paused","idle"].includes(i?.state)?i.state:"unavailable",r=o==="active"?ne(i.attributes?.finishes_at):NaN,s=Number.isFinite(r)?r:null,a=null;return s!==null&&(a=Math.max(0,s-t)),o==="paused"&&(a=Ve(i.attributes?.remaining)),o==="idle"&&(a=0),{entity:n,state:o,deadlineMs:s,remainingMs:a}}function Ge(n,e,t){let i={},o=(d,m)=>{i[d]={id:d,requiresConfirmation:!1,...m}},r=()=>{o("turn_on"),o("turn_off")},s=(d,m,b)=>{if(!Array.isArray(m))return;let _=[...new Set(m.filter(w=>typeof w=="string"&&w.length>0&&(!b||b.includes(w))))];_.length&&o(d,{options:_})},a=n.timed;if(t&&o("more_info"),!O(t))return i;let c=t.attributes??{},l=Number.isSafeInteger(c.supported_features)&&c.supported_features>=0?c.supported_features:0,u=d=>(l&d)===d,p=d=>{let{min_temp:m,max_temp:b,target_temp_step:_}=c;if(!Number.isFinite(m)||!Number.isFinite(b)||m>b)return;let w=Number.isFinite(_)&&_>0?_:null;o(d,{min:m,max:b,step:w})};switch(n.domain){case"switch":r();break;case"light":r(),(Array.isArray(c.supported_color_modes)&&c.supported_color_modes.some(d=>["brightness","color_temp","hs","xy","rgb","rgbw","rgbww","white"].includes(d))||Number.isFinite(c.brightness))&&o("set_brightness",{min:0,max:100,step:1});break;case"cover":u(B.open)&&o("open"),u(B.close)&&o("close"),u(B.stop)&&o("stop"),u(B.position)&&o("set_position",{min:0,max:100,step:1});break;case"fan":u(H.on)&&o("turn_on"),u(H.off)&&o("turn_off"),u(H.speed)&&o("set_percentage",{min:0,max:100,step:1}),u(H.preset)&&s("set_preset_mode",c.preset_modes);break;case"climate":u(D.on)&&o("turn_on"),u(D.off)&&o("turn_off"),s("set_hvac_mode",c.hvac_modes,je),u(D.temperature)&&p("set_temperature"),u(D.range)&&p("set_temperature_range"),u(D.fan)&&s("set_fan_mode",c.fan_modes),u(D.preset)&&s("set_preset_mode",c.preset_modes);break;case"water_heater":u(ee.power)&&r(),u(ee.temperature)&&p("set_temperature"),u(ee.operation)&&s("set_operation_mode",c.operation_list);break;case"lock":{let d=typeof c.code_format=="string"&&c.code_format.length>0;o("lock",{requiresCode:d}),o("unlock",{requiresCode:d,requiresConfirmation:!0});break}}if(a?.start_script){i.turn_off||(i.set_hvac_mode?.options.includes("off")?o("turn_off",{service:"set_hvac_mode",fixedData:{hvac_mode:"off"}}):i.set_operation_mode?.options.includes("off")?o("turn_off",{service:"set_operation_mode",fixedData:{operation_mode:"off"}}):i.set_percentage&&o("turn_off",{service:"set_percentage",fixedData:{percentage:0}}));for(let d of["turn_on","set_hvac_mode","set_operation_mode","set_percentage","set_temperature","set_temperature_range","set_fan_mode","set_preset_mode"])delete i[d];O(e?.[a.start_script])&&o("start_timed",{min:a.min_minutes,max:a.max_minutes,step:a.step_minutes})}return a?.stop_script&&O(e?.[a.stop_script])&&(o("stop_timed"),delete i.turn_off),i}function _e(n,e,t){let i=e?.[n.entity],o=i?.attributes??{};return{entity:n.entity,domain:n.domain,kind:n.kind,name:n.name||o.friendly_name||n.entity,icon:n.icon||o.icon||null,state:i?.state??"missing",available:O(i),attributes:o,actions:Ge(n,e,i),timer:Ue(n.timed?.timer_entity,e,t)}}function ve(n,e,t=Date.now()){return _e(ye(n),e,t)}function te(n,{min:e,max:t,step:i}){if(!Number.isFinite(n)||n<e||n>t)return!1;if(!i)return!0;let o=(n-e)/i;return n===t||Math.abs(o-Math.round(o))<1e-7}function Ke(n,e,t,i){let o=(s,a,c)=>({entity:n.entity,attributes:{[s]:a},tolerance:c}),r=s=>({entity:n.entity,state:s});switch(e){case"turn_on":return["light","switch","fan"].includes(n.domain)?r("on"):null;case"turn_off":return r("off");case"open":return r("open");case"close":return r("closed");case"stop":return["opening","closing"].includes(i?.[n.entity]?.state)?{entity:n.entity,anyState:["open","closed"]}:null;case"set_position":return o("current_position",t);case"set_brightness":return t===0?r("off"):{...o("brightness",Math.round(t*255/100),2),state:"on"};case"set_percentage":return t===0?r("off"):o("percentage",t);case"lock":return r("locked");case"unlock":return r("unlocked");case"set_hvac_mode":case"set_operation_mode":return r(t);case"set_fan_mode":case"set_preset_mode":case"set_temperature":return o(ie[e],t,1e-6);case"set_temperature_range":return{entity:n.entity,attributes:{target_temp_low:t.low,target_temp_high:t.high},tolerance:1e-6};case"start_timed":{let s=n.timed.timer_entity,a=["switch","fan"].includes(n.domain)?r("on"):null;if(!s)return a;let c=ne(i?.[s]?.attributes?.finishes_at);return{all:[{entity:s,state:"active",requireNewDeadline:!0,formerDeadline:c},...a?[a]:[]]}}case"stop_timed":return n.timed.timer_entity?{all:[{entity:n.timed.timer_entity,state:"idle"},r("off")]}:r("off");default:return null}}function $e(n,e,t,i,{confirmed:o=!1,code:r}={}){n=ye(n);let s=_e(n,e,Date.now()),a=typeof t=="string"&&Object.hasOwn(s.actions,t)&&s.actions[t];if(!a)throw new A("action_unavailable","This entity does not currently support that action.");if(a.requiresConfirmation&&o!==!0)throw new A("confirmation_required","This action requires explicit confirmation.");if(a.requiresCode&&(typeof r!="string"||!r.trim()||r.length>64))throw new A("pin_required","Enter the lock code in Home Assistant.");if(t==="more_info")return{kind:"more_info",entity:n.entity};if(t==="set_temperature_range"){if(!i||!te(i.low,a)||!te(i.high,a)||i.low>i.high)throw new A("invalid_value","The selected temperature range is invalid.")}else if(a.options?!a.options.includes(i):a.min!==void 0&&!te(i,a))throw new A("invalid_value","The selected value is outside the published device options.");let c=Ke(n,t,i,e);if(t==="start_timed"||t==="stop_timed"){let u=t==="start_timed";return{kind:"service",domain:"script",service:(u?n.timed.start_script:n.timed.stop_script).split(".")[1],target:null,data:u?{[n.timed.duration_field]:i}:{},expected:c}}let l=t==="set_temperature_range"?{target_temp_low:i.low,target_temp_high:i.high}:ie[t]?{[ie[t]]:i}:{...a.fixedData};return a.requiresCode&&(l.code=r),{kind:"service",domain:s.domain,service:a.service??Be[t]??t,target:{entity_id:n.entity},data:l,expected:c}}function xe(n,e){if(n.all)return n.all.every(i=>xe(i,e));let t=e?.[n.entity];if(!O(t)||n.state!==void 0&&n.state!==t.state||n.anyState&&!n.anyState.includes(t.state))return!1;if(n.requireNewDeadline){let i=ne(t.attributes?.finishes_at);if(!Number.isFinite(i)||i===n.formerDeadline)return!1}return Object.entries(n.attributes??{}).every(([i,o])=>{let r=t.attributes?.[i];return typeof o=="number"?Number.isFinite(r)&&Math.abs(r-o)<=(n.tolerance??0):r===o})}var Ye=n=>new Promise(e=>setTimeout(e,n)),Je=()=>globalThis.performance.now();function We(n,e){let t,i=new Promise(o=>{t=setTimeout(()=>o(be),e)});return Promise.race([n,i]).finally(()=>clearTimeout(t))}function we({getHass:n,confirmationTimeoutMs:e,requestTimeoutMs:t=1e4,pollIntervalMs:i=100,sleep:o=Ye,now:r=Je}={}){if(typeof n!="function"||typeof o!="function"||typeof r!="function"||!Number.isSafeInteger(t)||t<1||t>2147483647||!Number.isSafeInteger(i)||i<1||e!==void 0&&(!Number.isSafeInteger(e)||e<0))throw new A("invalid_config","The dashboard connection or timeout setting is invalid.");let s=new Map;return{async execute(a,c,l,u){let p=n(),d=$e(a,p?.states,c,l,u);if(d.kind==="more_info")return{status:"more_info",entity:d.entity};if(typeof p?.callWS!="function")throw new A("service_unavailable","The Home Assistant connection is unavailable.");let m=a.entity,b=Symbol(m);s.set(m,b);let _=(w,h)=>({status:w,entity:m,action:c,...h?{reason:h}:{}});try{let w={type:"call_service",domain:d.domain,service:d.service,service_data:d.data};d.target&&(w.target=d.target);let h;try{h=await We(Promise.resolve(p.callWS(w)),t)}catch(x){if(s.get(m)!==b)return _("unconfirmed","superseded");throw new A("service_failed","Home Assistant rejected or could not deliver the command.",{cause:x})}if(s.get(m)!==b)return _("unconfirmed","superseded");if(h===be)return _("unconfirmed","request_timeout");let f=a.confirmation_ms??e??(d.domain==="cover"?45e3:8e3);if(!d.expected||!f)return _("sent");let v=r()+f;for(;;){if(s.get(m)!==b)return _("unconfirmed","superseded");if(xe(d.expected,n()?.states))return _("confirmed");let x=v-r();if(x<=0)return _("unconfirmed","state_timeout");await o(Math.min(i,x))}}finally{s.get(m)===b&&s.delete(m)}}}}var Ne=Object.freeze(["aurora","lagoon","dunes","graphite"]),I={background:Ne,shape:["soft","circle","square"],layout:["classic","header"]},Ze={aurora:"#63928a",lagoon:"#37728c",dunes:"#aa7356",graphite:"#596169"},Ee=/^mdi:[a-z0-9-]+$/,Xe=/^[a-z0-9_]+\.[a-z0-9_]+$/,Qe={turn_on:"mdi:power",turn_off:"mdi:power",open:"mdi:arrow-up",close:"mdi:arrow-down",stop:"mdi:stop",lock:"mdi:lock-outline",unlock:"mdi:lock-open-variant-outline",start_timed:"mdi:timer-play-outline",stop_timed:"mdi:timer-stop-outline"},et={light:"mdi:lightbulb-outline",switch:"mdi:toggle-switch-outline",fan:"mdi:fan",cover:"mdi:blinds",climate:"mdi:thermostat",lock:"mdi:lock-outline",heater:"mdi:radiator",boiler:"mdi:water-boiler",water_heater:"mdi:water-boiler",sensor:"mdi:gauge",binary_sensor:"mdi:motion-sensor",calendar:"mdi:calendar-outline",person:"mdi:account-outline",vacuum:"mdi:robot-vacuum",camera:"mdi:cctv",media_player:"mdi:speaker"},tt=new Set(["open","close","set_position"]),ke=new Set(["set_position","set_brightness","set_percentage"]),Ae={set_position:"current_position",set_percentage:"percentage",set_brightness:"brightness",set_temperature:"temperature",set_fan_mode:"fan_mode",set_preset_mode:"preset_mode",set_operation_mode:"operation_mode"},Se=["turn_on","turn_off","open","stop","close","lock","unlock","set_position","set_brightness","set_percentage","set_hvac_mode","set_temperature","set_temperature_range","set_fan_mode","set_preset_mode","set_operation_mode","start_timed","stop_timed"],Ce=new Set(["on","off","open","closed","opening","closing","locked","unlocked","locking","unlocking","jammed","cool","heat","heat_cool","dry","fan_only","auto","idle","active","paused","playing","cleaning","docked","unavailable","unknown"]),it=0;function g(n,e,t){let i=document.createElement(n);return e&&(i.className=e),t!=null&&(i.textContent=t),i}function R(n,e="mdi:information-outline"){return typeof n=="string"&&Ee.test(n)?n:e}function L(n){let e=g("ha-icon");return e.setAttribute("icon",R(n)),e.setAttribute("aria-hidden","true"),e}function q(n,e){n.getAttribute("aria-label")!==e&&(n.title=e,n.setAttribute("aria-label",e))}function E(n,e,t,i=!1){let o=g("button",n);return o.type="button",t&&o.append(L(t)),i?q(o,e):e&&o.append(e),o}function C(n){return typeof n=="string"?n.trim():""}function G(n){if(n==null||n==="")return null;let e=Number(n);return Number.isFinite(e)?e:null}function K(n){return"⁦"+n+"⁩"}function k(n,e){n.textContent!==String(e)&&(n.textContent=e)}function oe(n,e){let t=R(e);n.getAttribute("icon")!==t&&n.setAttribute("icon",t)}function nt(n={}){if(!n||typeof n!="object"||Array.isArray(n))throw new Error("Invalid Bayit 9 configuration.");let e=/^he(?:-|$)/i.test(C(n.locale))?"he":"en",t=new Set,i=n.rooms??[];if(!Array.isArray(i))throw new Error("Bayit 9 rooms must be a list.");let o=i.map(r=>{let s=C(r?.id),a=C(r?.name);if(!/^[a-z0-9][a-z0-9_-]*$/i.test(s)||!a||t.has(s))throw new Error("Each Bayit 9 room needs a unique id and name.");t.add(s);let c=r.entities??[],l=new Map;if(!Array.isArray(c))throw new Error("Bayit 9 room entities must be a list.");for(let u of c){let p=C(typeof u=="string"?u:u?.entity);if(!Xe.test(C(p)))throw new Error("Invalid Home Assistant entity in Bayit 9.");if(l.has(p))continue;let d={entity:p};C(u.name)&&(d.name=C(u.name)),Ee.test(C(u.icon))&&(d.icon=u.icon),["heater","boiler"].includes(u.kind)&&(d.kind=u.kind),u.timed&&typeof u.timed=="object"&&!Array.isArray(u.timed)&&(d.timed={...u.timed}),l.set(p,d)}return{id:s,name:a,icon:R(r.icon,"mdi:door-open"),entities:[...l.values()]}});return{locale:e,rooms:o,title:C(n.title)||Q[e].home,background:Ne.includes(n.background)?n.background:"aurora",layout:I.layout.includes(n.layout)?n.layout:"classic",shape:I.shape.includes(n.shape)?n.shape:"soft",storageKey:"bayit-9.preferences.v1:"+(C(n.preference_key)||location.pathname)}}var ot=`
  <main class="shell">
    <header class="toolbar">
      <div class="brand"><ha-icon icon="mdi:home-variant-outline" aria-hidden="true"></ha-icon><h1></h1></div>
      <div class="toolbar-actions">
        <button type="button" class="chrome-button" data-role="activity" aria-haspopup="dialog">
          <ha-icon icon="mdi:chart-box-outline" aria-hidden="true"></ha-icon>
          <span class="badge" hidden aria-hidden="true"></span>
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
`,re=class extends HTMLElement{constructor(){super(),this.attachShadow({mode:"open"}).innerHTML="<style>"+ge+"</style>"+ot;let e=r=>this.shadowRoot.querySelector(r),t=r=>e('[data-role="'+r+'"]');this.nodes={shell:e(".shell"),rooms:e(".rooms"),empty:e(".empty"),title:e("h1"),activity:t("activity"),badge:e(".badge"),settings:t("settings"),close:t("close"),modal:e("dialog:not(.confirm)"),modalTitle:e("dialog:not(.confirm) h2"),modalBody:e("dialog:not(.confirm) .modal-body"),content:t("content"),confirm:e(".confirm"),confirmTitle:e(".confirm h2"),confirmText:e(".confirmation-text"),accept:t("accept"),abort:t("abort"),pageNotice:t("page-notice"),modalNotice:t("modal-notice")};let i=this.nodes,o="bayit-9-"+ ++it;i.modalTitle.id=o+"-title",i.modal.setAttribute("aria-labelledby",i.modalTitle.id),i.confirmTitle.id=o+"-confirm",i.confirmText.id=o+"-message",i.confirm.setAttribute("aria-labelledby",i.confirmTitle.id),i.confirm.setAttribute("aria-describedby",i.confirmText.id),i.settings.onclick=()=>this.openPanel("settings",i.settings),i.activity.onclick=()=>this.openPanel("activity",i.activity),i.close.onclick=()=>i.modal.close(),i.abort.onclick=()=>i.confirm.close(),i.accept.onclick=()=>this.acceptAction(),i.modal.addEventListener("close",()=>this.closePanel()),i.confirm.addEventListener("close",()=>{let r=this.confirming?.source;this.confirming=null,r?.isConnected&&!r.disabled&&r.focus({preventScroll:!0})});for(let r of[i.modal,i.confirm])r.addEventListener("click",s=>{let a=r.getBoundingClientRect();s.target===r&&(s.clientX<a.left||s.clientX>a.right||s.clientY<a.top||s.clientY>a.bottom)&&r.close()});this.roomViews=new Map,this.deviceViews=new Map,this.pending=new Map,this.roomScroll=new Map,this.preferences={},this.controller=we({getHass:()=>this._hass}),this.storageChange=r=>{r.key===this.config?.storageKey&&(this.readPreferences(),this.applyPreferences())}}static getStubConfig(){return{locale:"en",rooms:[]}}getCardSize(){return Math.max(2,Math.ceil((this.config?.rooms.length||0)/2)*3+1)}getGridOptions(){return{columns:12,min_columns:6,rows:"auto"}}setConfig(e){let t=nt(e);this.config?.storageKey!==t.storageKey&&(this.preferences={}),this.nodes.confirm.open&&this.nodes.confirm.close(),this.nodes.modal.open&&this.nodes.modal.close(),this.config=t,this.words=Q[t.locale];let i=this.nodes;i.shell.lang=t.locale,i.shell.dir=t.locale==="he"?"rtl":"ltr",k(i.title,t.title),k(i.empty,this.t("empty")),q(i.settings,this.t("settings")),q(i.activity,this.t("activity")),q(i.close,this.t("close")),i.rooms.setAttribute("aria-label",this.t("rooms")),k(i.confirmTitle,this.t("confirm_title")),k(i.abort,this.t("cancel")),k(i.accept,this.t("confirm")),this.readPreferences(),this.buildRooms(),this.applyPreferences(),this.update()}set hass(e){this._hass=e,!(!this.isConnected||this.frame||!this.config)&&(this.frame=requestAnimationFrame(()=>{this.frame=0,this.update()}))}connectedCallback(){window.addEventListener("storage",this.storageChange),this.update()}disconnectedCallback(){window.removeEventListener("storage",this.storageChange),cancelAnimationFrame(this.frame),clearInterval(this.ticker),clearTimeout(this.noticeTimer),this.frame=this.ticker=0,this.nodes.confirm.open&&this.nodes.confirm.close(),this.nodes.modal.open&&this.nodes.modal.close()}t(e){return this.words?.[e]||e}readPreferences(){let e;try{e=JSON.parse(localStorage.getItem(this.config.storageKey)||"{}")}catch{return}this.preferences={};for(let[t,i]of Object.entries(I))i.includes(e?.[t])&&(this.preferences[t]=e[t])}applyPreferences(){for(let e of Object.keys(I))this.nodes.shell.dataset[e]=this.preferences[e]||this.config[e];for(let{article:e,heading:t}of this.roomViews.values())this.nodes.shell.dataset.layout==="header"&&e.firstElementChild!==t&&e.prepend(t),this.nodes.shell.dataset.layout!=="header"&&e.lastElementChild!==t&&e.append(t);if(this.panel?.type==="settings")for(let e of this.nodes.content.querySelectorAll("[data-preference]"))e.setAttribute("aria-pressed",String(e.value===this.nodes.shell.dataset[e.dataset.preference]))}setPreference(e,t){this.preferences[e]=t;try{localStorage.setItem(this.config.storageKey,JSON.stringify(this.preferences))}catch{}this.applyPreferences()}model(e){try{let t=ve(e,this._hass?.states??{});return{...t,icon:R(t.icon,et[t.kind||t.domain])}}catch{return{...e,name:e.name||e.entity,icon:R(e.icon),actions:{},attributes:{},state:"unavailable",available:!1}}}buildRooms(){let e=this.nodes;this.roomViews.clear(),e.rooms.replaceChildren();for(let t of this.config.rooms){let i=g("article","room");i.dataset.room=t.id;let o=E("room-title");q(o,t.name),o.setAttribute("aria-haspopup","dialog");let r=L(this.config.locale==="he"?"mdi:chevron-left":"mdi:chevron-right");r.className="chevron",o.append(L(t.icon),g("span","",t.name),r),o.onclick=()=>this.openPanel("room",o,t);let s=g("div","room-status"),a=L("mdi:power-standby"),c=g("span");s.append(a,c);let l=g("div","quick"),u=new Map,p=d=>+!["light","switch","fan","cover","lock","climate","water_heater"].includes(d.entity.split(".")[0]);for(let d of[...t.entities].sort((m,b)=>p(m)-p(b)).slice(0,2)){let m=E("quick-button",d.name||d.entity,d.icon||"mdi:information-outline",!0);m.dataset.entity=d.entity,m.onclick=()=>{let b=this.model(d);if(this.pending.has(d.entity)&&b.domain!=="cover")return;let _=["light","switch","fan"].includes(b.domain)&&!d.timed?.start_script&&!d.timed?.stop_script,w=b.state==="on"?"turn_off":"turn_on";_&&b.actions[w]&&!b.actions[w].requiresConfirmation?this.requestAction(d,w,void 0,m):this.openPanel("room",m,t,d.entity)},u.set(d.entity,m),l.append(m)}i.append(s,l,o),e.rooms.append(i),this.roomViews.set(t.id,{room:t,article:i,heading:o,status:s,statusIcon:a,statusText:c,shortcut:u})}e.empty.hidden=this.roomViews.size>0}tone(e){return e.available?e.domain==="cover"&&["open","opening","closing"].includes(e.state)?"moving":e.domain==="lock"&&["unlocked","unlocking","jammed"].includes(e.state)?"critical":e.timer?.state==="active"||["on","playing","cleaning"].includes(e.state)||["heating","cooling","drying","fan"].includes(e.attributes?.hvac_action)?"warm":"quiet":"quiet"}stateLabel(e){if(!e.available)return this.t("unavailable");let t=e.attributes||{},i=e.state,o=s=>Ce.has(s)?this.t(s):String(s||this.t("unknown"));if(e.domain==="cover"){let s=G(t.current_position);return(i==="open"?this.t("opened"):o(i))+(s===null?"":" · "+K(s+"%"))}if(e.domain==="sensor"&&t.unit_of_measurement)return K(i+" "+t.unit_of_measurement);if(e.domain==="climate"){let s=G(t.current_temperature),a=this._hass?.config?.unit_system?.temperature||"°";return o(i)+(s===null?"":" · "+K(s+" "+a))}if(Ce.has(i))return o(i);let r=this._hass?.states?.[e.entity];return String(r&&this._hass?.formatEntityState?.(r)||i||this.t("unknown"))}update(){if(!this.config)return;let e=this.nodes,t=new Map;for(let[i,o]of this.roomViews){let r=0,s=!1,a;for(let c of o.room.entities){let l=this.model(c),u=this.tone(l);s||=!l.available,u!=="quiet"&&(r++,t.has(c.entity)||t.set(c.entity,{config:c,model:l,room:o.room})),!a&&l.available&&l.attributes?.device_class==="temperature"&&(a=l);let p=o.shortcut.get(c.entity);if(!p)continue;oe(p.firstElementChild,l.icon),q(p,l.name+" · "+this.stateLabel(l)),p.dataset.tone=u,p.dataset.transition=["opening","closing"].includes(l.state)?l.state:"";let d=this.pending.has(c.entity);p.disabled=d&&l.domain!=="cover",p.setAttribute("aria-busy",String(d))}k(o.statusText,r?r+" "+this.t("active"):a?this.stateLabel(a):this.t(s?"unavailable":"quiet")),oe(o.statusIcon,r?"mdi:lightning-bolt-outline":a?"mdi:thermometer":s?"mdi:alert-circle-outline":"mdi:power-standby"),o.status.dataset.tone=r?"warm":"quiet",o.article.toggleAttribute("data-current",this.panel?.room?.id===i)}this.activeDevices=t,e.badge.hidden=!t.size,k(e.badge,t.size),this.panel?.type==="room"&&this.updateDevices(),this.panel?.type==="activity"&&this.paintActivity()}openPanel(e,t,i,o){if(!this.config)return;let r=this.nodes,s=t.getBoundingClientRect();r.modal.open||(this.restoreFocus=t),this.panel={type:e,room:i},this.deviceViews.clear(),this.activitySignature=null,k(r.modalNotice,"");let a=e==="room"?i.icon:e==="settings"?"mdi:cog-outline":"mdi:chart-box-outline";r.modalTitle.replaceChildren(L(a),e==="room"?i.name:this.t(e)),e==="room"&&this.buildDevices(i),e==="settings"&&this.paintSettings(),e==="activity"&&this.paintActivity(),r.modal.open||r.modal.showModal();let c=r.modal.getBoundingClientRect(),l=(p,d)=>Math.max(0,Math.min(d,p))+"px";r.modal.style.setProperty("--motion-x",l(s.left+s.width/2-c.left,c.width)),r.modal.style.setProperty("--motion-y",l(s.top+s.height/2-c.top,c.height)),r.close.focus({preventScroll:!0}),r.modalBody.scrollTop=i&&this.roomScroll.get(i.id)||0;let u=this.deviceViews.get(o)?.item;u&&(r.modalBody.scrollTop+=u.getBoundingClientRect().top-r.modalBody.getBoundingClientRect().top-12),this.update()}closePanel(){let e=this.nodes;if(e.modal.open)return;this.panel?.room&&this.roomScroll.set(this.panel.room.id,e.modalBody.scrollTop),this.panel=null,this.deviceViews.clear(),clearInterval(this.ticker),this.ticker=0,this.update();let t=this.restoreFocus;this.restoreFocus=null,t?.isConnected&&t.focus({preventScroll:!0})}buildDevices(e){let t=this.nodes.content;t.className="devices",t.replaceChildren(),e.entities.length||t.append(g("p","empty",this.t("empty_room")));for(let i of e.entities){let o=g("section","device");o.dataset.entity=i.entity;let r=g("header","device-head"),s=L(i.icon||"mdi:information-outline");s.className="device-icon";let a=g("div","device-detail"),c=g("h3","device-name"),l=g("span","current");a.append(c,l);let u=E("round-action",this.t("more_info"),"mdi:information-outline",!0);u.onclick=()=>this.moreInfo(i),r.append(s,a,u);let p=g("div","action-list");o.append(r,p),t.append(o),this.deviceViews.set(i.entity,{config:i,item:o,glyph:s,name:c,state:l,more:u,group:p,fields:[]})}this.updateDevices()}moreInfo(e){this.model(e).actions.more_info&&(this.nodes.modal.open&&(this.restoreFocus=null,this.nodes.modal.close()),this.dispatchEvent(new CustomEvent("hass-more-info",{detail:{entityId:e.entity},bubbles:!0,composed:!0})))}timerLabel(e){if(!e||["idle","unavailable"].includes(e.state))return"";if(e.remainingMs===null)return this.t(e.state);let t=Math.max(0,Math.ceil(e.remainingMs/1e3));return this.t("timed")+" · "+K(Math.floor(t/60)+":"+String(t%60).padStart(2,"0"))}updateDevices(){let e=!1;for(let t of this.deviceViews.values()){let i=this.model(t.config);k(t.name,i.name),oe(t.glyph,i.icon);let o=this.timerLabel(i.timer);i.timer?.state==="active"&&(e=!0),k(t.state,this.stateLabel(i)+(o?" · "+o:"")),t.state.dataset.tone=this.tone(i),t.more.hidden=!i.actions.more_info;let r=JSON.stringify(Se.map(a=>i.actions[a]||null));r!==t.signature&&(t.signature=r,this.buildActions(t,i));let s=this.pending.has(t.config.entity);t.item.setAttribute("aria-busy",String(s));for(let a of t.group.querySelectorAll("button,input,select"))a.disabled=!this.canRequest(t.config.entity,a.dataset.action);for(let a of t.fields)this.syncField(a,i)}e&&!this.ticker&&this.isConnected&&(this.ticker=setInterval(()=>this.updateDevices(),1e3)),!e&&this.ticker&&(clearInterval(this.ticker),this.ticker=0)}paintSettings(){let e=this.nodes.content;e.className="settings",e.replaceChildren();for(let[t,i]of Object.entries(I)){let o=g("fieldset","prefs-group");o.append(g("legend","",this.t(t)));let r=g("div","prefs-options");for(let s of i){let a=E("control-button",this.t(s));if(t==="background"){let c=g("span","swatch");c.style.background=Ze[s],c.setAttribute("aria-hidden","true"),a.prepend(c)}a.value=s,a.dataset.preference=t,a.onclick=()=>this.setPreference(t,s),r.append(a)}o.append(r),e.append(o)}this.applyPreferences()}paintActivity(){let e=[...(this.activeDevices||new Map).values()],t=JSON.stringify(e.map(({model:r,room:s})=>[r.entity,r.name,this.stateLabel(r),s.id]));if(t===this.activitySignature)return;this.activitySignature=t;let i=this.nodes.content;i.className="";let o=g("ul","activity-list");for(let{model:r,room:s,config:a}of e){let c=g("li"),l=E("control-button");l.append(g("span","",r.name+" · "+s.name),g("span","",this.stateLabel(r))),l.onclick=()=>this.openPanel("room",l,s,a.entity),c.append(l),o.append(c)}i.replaceChildren(e.length?o:g("p","empty",this.t("quiet")))}actionLabel(e){return this.t(e==="close"?"close_device":e)}buildActions(e,t){let i=this.shadowRoot.activeElement,o=i&&e.group.contains(i)?i.dataset.action:void 0;e.fields=[];let r=g("div","basic-actions"),s=[];for(let a of Se){let c=t.actions[a];if(!c)continue;if(ke.has(a)||c.options||typeof c.min=="number"||["set_temperature_range","start_timed"].includes(a)){s.push(this.buildField(e,c,a,t));continue}let l=E("control-button",this.actionLabel(a),Qe[a]);l.dataset.action=a,l.onclick=()=>this.requestAction(e.config,a,void 0,l),r.append(l)}e.group.replaceChildren(...r.childElementCount?[r]:[],...s),o&&([...e.group.querySelectorAll("[data-action]")].find(c=>c.dataset.action===o)||e.more).focus({preventScroll:!0})}numberInput(e,t){let i=g("input");i.type=t;for(let o of["min","max","step"])typeof e[o]=="number"&&(i[o]=String(e[o]));return t==="number"&&e.step==null&&(i.step="any"),i}buildField(e,t,i,o){let r=g("div","field-row"),s=i==="start_timed"?this.t("duration"):this.actionLabel(i),a=g("label","",s),c=ke.has(i),l={action:t,id:i};if(t.options){l.input=g("select");for(let d of t.options){let m=g("option","",this.t(d));m.value=d,l.input.append(m)}}else l.input=this.numberInput(t,c?"range":"number");l.input.dataset.action=i,a.append(l.input),i==="set_temperature_range"&&(l.input.setAttribute("aria-label",s+" · "+this.t("min")),l.second=this.numberInput(t,"number"),l.second.dataset.action=i,l.second.setAttribute("aria-label",s+" · "+this.t("max")),a.append(l.second)),c&&(l.output=g("output","duration-label"),a.append(l.output));let u=()=>{l.dirty=!0,l.output&&k(l.output,l.input.value+"%")};l.input.addEventListener("input",u),l.second?.addEventListener("input",u);let p=E("control-button",i==="start_timed"?this.actionLabel(i):this.t("apply"));return p.dataset.action=i,q(p,i==="start_timed"?this.actionLabel(i):this.t("apply")+" · "+s),p.onclick=()=>{let d=l.input.localName==="select"?l.input.value:l.input.valueAsNumber,m=l.second?{low:l.input.valueAsNumber,high:l.second.valueAsNumber}:d;this.requestAction(e.config,i,m,p)},e.fields.push(l),this.syncField(l,o),r.append(a,p),r}syncField(e,t){let{id:i,input:o,second:r,action:s}=e,a=this.shadowRoot.activeElement;if(e.dirty||a===o||r&&a===r)return;let c=t.attributes;if(r)o.value=String(c.target_temp_low??s.min??18),r.value=String(c.target_temp_high??s.max??25);else if(i==="set_hvac_mode")o.value=t.state;else if(i==="start_timed")o.value=String(s.min??15);else if(i==="set_brightness"){let l=G(c.brightness);o.value=String(l===null?s.min??0:Math.round(l/255*100))}else o.localName==="select"?o.value=c[Ae[i]]??o.options[0]?.value??"":o.value=String(G(c[Ae[i]])??s.min??0);o.localName==="select"&&o.selectedIndex===-1&&(o.selectedIndex=0),e.output&&k(e.output,o.value+"%")}canRequest(e,t){let i=this.pending.get(e);return!i||t==="stop"&&tt.has(i.id)}requestAction(e,t,i,o){if(!this.canRequest(e.entity,t))return;let r=this.model(e),s=r.actions[t];if(!s)return;if(s.requiresCode)return this.moreInfo(e);if(!s.requiresConfirmation)return this.send(e,t,i);this.confirming={config:e,id:t,value:i,source:o};let a=this.nodes;k(a.confirmText,this.t("confirm_action").replace("{name}",r.name).replace("{action}",this.actionLabel(t))),a.confirm.open||a.confirm.showModal(),a.abort.focus({preventScroll:!0})}acceptAction(){let e=this.confirming;if(!(!e||!this.nodes.confirm.open))return this.nodes.confirm.close(),this.send(e.config,e.id,e.value,!0)}async send(e,t,i,o=!1){if(!this.canRequest(e.entity,t))return;let r=this.model(e);if(!r.actions[t])return;let s={id:t};this.pending.set(e.entity,s),this.announce(this.t("sending").replace("{name}",r.name)),this.update();try{let a=await this.controller.execute(e,t,i,{confirmed:o});if(this.pending.get(e.entity)!==s)return;let c=["confirmed","sent","unconfirmed"].includes(a?.status)?a.status:"sent";if(this.announce(this.t(c).replace("{name}",r.name)),a?.status==="confirmed")for(let l of this.deviceViews.get(e.entity)?.fields||[])l.id===t&&(l.dirty=!1)}catch{this.pending.get(e.entity)===s&&this.announce(this.t("send_error"))}finally{this.pending.get(e.entity)===s&&(this.pending.delete(e.entity),this.isConnected&&this.update())}}announce(e){if(!this.isConnected)return;clearTimeout(this.noticeTimer);let t=this.nodes;k(t.pageNotice,""),k(t.modalNotice,"");let i=t.modal.open?t.modalNotice:t.pageNotice;k(i,e),this.noticeTimer=setTimeout(()=>k(i,""),5200)}};customElements.get("bayit-dashboard")||(customElements.define("bayit-dashboard",re),window.customCards||=[],window.customCards.push({type:"bayit-dashboard",name:"Bayit 9",description:"A room-based Home Assistant dashboard.",preview:!1}));var rt="custom:bayit-dashboard",T="bayit-9",le={aurora:{en:"Aurora",he:"זוהר צפוני"},lagoon:{en:"Lagoon",he:"לגונה"},dunes:{en:"Dunes",he:"דיונות"},graphite:{en:"Graphite",he:"גרפיט"}},de=U,st=["light","switch","cover","climate","fan","lock","water_heater","vacuum","humidifier","alarm_control_panel","camera","media_player","binary_sensor","sensor","weather","person","calendar"],pe=/^[a-z0-9_]+\.[a-z0-9_]+$/,at=new Set(["heater","boiler"]),se=new Map(st.map((n,e)=>[n,e])),qe="script",Y={en:{title:"Bayit 9",home:"Home",unassigned:"Unassigned"},he:{title:"בית 9",home:"בית",unassigned:"ללא חדר"}};function J(n,e={}){if(n==="en"||n==="he")return n;let t=e.locale?.language??e.language;return typeof t=="string"&&/^he(?:[-_]|$)/i.test(t)?"he":"en"}function $(n){return Array.isArray(n)?[...new Set(n.filter(e=>typeof e=="string"&&e.trim()))]:[]}function P(n){return n.split(".")[0]}function ae(n,e){return typeof n=="string"&&pe.test(n)&&P(n)===e?n:void 0}function ce(n,e){return Number.isInteger(n)&&n>0&&n<=360?n:e}function ue(n){if(!n||typeof n.entity!="string"||!pe.test(n.entity)||!de.includes(P(n.entity))||!at.has(n.kind))return null;let e={entity:n.entity,kind:n.kind};typeof n.name=="string"&&n.name.trim()&&(e.name=n.name.trim().slice(0,80));let t=n.timed;if(!t||typeof t!="object")return e;let i=ae(t.start_script,qe),o=ae(t.stop_script,qe),r=ae(t.timer_entity,"timer");if(!i&&!r&&!o)return e;let s=ce(t.min_minutes,15),a=Math.max(s,ce(t.max_minutes,60)),c=Math.min(a-s||1,ce(t.step_minutes,15));return e.timed={...i&&{start_script:i},...o&&{stop_script:o},...r&&{timer_entity:r},duration_field:typeof t.duration_field=="string"&&/^[a-z][a-z0-9_]{0,39}$/.test(t.duration_field)?t.duration_field:"duration",min_minutes:s,max_minutes:a,step_minutes:c},e}function ct(n){let e=new Map;for(let t of Array.isArray(n)?n:[]){let i=ue(t);i&&!e.has(i.entity)&&e.set(i.entity,i)}return e}function lt(n){return new Map(Object.entries(n.areas??{}).map(([e,t])=>[t.area_id??e,{name:t.name??e,icon:t.icon||"mdi:home-outline"}]))}function Te(n,e,t){return n.localeCompare(e,t,{numeric:!0,sensitivity:"base"})}function dt(n){let e="bayit9_unassigned";for(let t=1;n.has(e);t++)e="bayit9_unassigned_"+t;return e}function pt(n,e,t,i){let o=i?.name??e.attributes?.friendly_name??t?.name??t?.en,r=t?.icon??t?.ic??e.attributes?.icon;return{entity:n,...typeof o=="string"&&o&&{name:o},...typeof r=="string"&&r&&{icon:r},...i&&{kind:i.kind},...i?.timed&&{timed:i.timed}}}function ut(n,e,t){let i=lt(e),o=dt(i),r=new Set($(n.area_ids)),s=new Map($(n.area_ids).map((h,f)=>[h,f])),a=new Set($(n.hidden_entities)),c=new Set($(n.included_entities)),l=ct(n.profiles),u=new Set([...l.values()].flatMap(h=>{let f=h.timed;return f?[f.start_script,f.stop_script,f.timer_entity].filter(Boolean):[]})),p=e.states??{},d=e.entities??null,m=new Map,b=new Set(Object.keys(d||p));for(let h of[...c,...l.keys()])b.add(h);for(let h of b){if(!pe.test(h)||a.has(h)||!Object.hasOwn(p,h))continue;let f=d?.[h];if(f?.hidden===!0||f?.hidden_by||f?.disabled_by)continue;let v=c.has(h)||l.has(h),x=P(h),N=f?.entity_category!=null||f?.ec!=null;if(!v&&(!se.has(x)||N||u.has(h)))continue;let z=f?.device_id??f?.di,Re=z&&e.devices?.[z],X=f?.area_id??f?.ai??Re?.area_id,M=X&&i.has(X)?X:o;(M===o?n.show_unassigned===!1:r.size&&!r.has(M))||(m.has(M)||m.set(M,[]),m.get(M).push(pt(h,p[h],f,l.get(h))))}let _=h=>i.get(h)??{name:Y[t].unassigned,icon:"mdi:map-marker-outline"};return[...m.keys()].sort((h,f)=>h===o||f===o?h===o?1:-1:(s.get(h)??1/0)-(s.get(f)??1/0)||Te(_(h).name,_(f).name,t)).map(h=>{let f=_(h),v=m.get(h).sort((x,N)=>(se.get(P(x.entity))??100)-(se.get(P(N.entity))??100)||Te(x.name??x.entity,N.name??N.entity,t));return{id:h,name:f.name,icon:f.icon,entities:v}})}function De(n){return{title:Y[J("auto",n)].title,icon:"mdi:home-variant-outline"}}function Le(n={},e={}){let t=J(n.locale,e),i=typeof n.title=="string"&&n.title.trim()?n.title.trim():Y[t].title,o={type:rt,locale:t,title:i,rooms:ut(n,e,t)};return Object.hasOwn(le,n.background)&&(o.background=n.background),["soft","circle","square"].includes(n.shape)&&(o.shape=n.shape),["classic","header"].includes(n.layout)&&(o.layout=n.layout),typeof n.preference_key=="string"&&n.preference_key.trim()&&(o.preference_key=n.preference_key.trim()),{title:i,views:[{title:Y[t].home,path:"home",type:"panel",cards:[o]}]}}var mt={en:{title:"Dashboard title",language:"Language",automatic:"Home Assistant language",areas:"Rooms",anyArea:"All rooms",unassigned:"Include devices without a room",appearance:"Appearance",background:"Wallpaper",layout:"Room titles",shape:"Button shape",classic:"Alongside the controls",header:"At the top",soft:"Rounded",circle:"Circle",square:"Square",devices:"Device visibility",hidden:"Hide devices",included:"Add other entities",profiles:"Boiler and heater controls",entity:"Heating device",kind:"Control profile",heater:"Room heater",boiler:"Water heater or boiler",displayName:"Display name",start:"Scheduled start script",stop:"Stop script",timer:"Timer",none:"None",durationField:"Duration field",min:"Shortest run in minutes",max:"Longest run in minutes",step:"Step in minutes",add:"Add profile",save:"Save profile",edit:"Edit",remove:"Remove",clear:"Cancel",choose:"Select a device",invalid:"Select a heating device to save the profile.",hint:"Select the Home Assistant entities that already control this device. Use a server-side start script for timed heating.",units:"minutes",searchable:"Filter entities"},he:{title:"שם הדשבורד",language:"שפה",automatic:"שפת Home Assistant",areas:"חדרים",anyArea:"כל החדרים",unassigned:"הצגת מכשירים ללא חדר",appearance:"מראה",background:"רקע",layout:"שמות חדרים",shape:"צורת כפתורים",classic:"לצד הכפתורים",header:"בראש הכרטיס",soft:"מעוגל",circle:"עיגול",square:"ריבוע",devices:"הצגת מכשירים",hidden:"הסתרת מכשירים",included:"הוספת ישויות נוספות",profiles:"שליטה בדוד ובתנורים",entity:"מכשיר חימום",kind:"סוג בקר",heater:"תנור חימום",boiler:"דוד או מחמם מים",displayName:"שם לתצוגה",start:"סקריפט הפעלה עם זמן",stop:"סקריפט כיבוי",timer:"טיימר",none:"ללא",durationField:"שדה משך",min:"זמן מינימלי בדקות",max:"זמן מקסימלי בדקות",step:"מרווח בחירה בדקות",add:"הוספת בקר",save:"שמירת בקר",edit:"עריכה",remove:"הסרה",clear:"ביטול",choose:"בחירת מכשיר",invalid:"בחרו מכשיר חימום לפני השמירה.",hint:"בחרו את הישויות שכבר שולטות במכשיר ב־Home Assistant. לחימום מתוזמן, השתמשו בסקריפט שפועל בשרת.",units:"דקות",searchable:"סינון ישויות"}},ht=":host { display: block; color: var(--primary-text-color); }form { display: grid; gap: 14px; padding-block: 8px; }label.field { display: grid; gap: 6px; min-width: 0; font-weight: 600; }input:not([type=checkbox]),select { width: 100%; box-sizing: border-box; min-height: 44px; border: 1px solid var(--divider-color,#999); border-radius: 8px; padding: 8px 10px; font: inherit; color: inherit; background: var(--card-background-color,#fff); }input[type=checkbox] { inline-size: 18px; block-size: 18px; flex: none; margin-inline: 0 9px; }input,select,button,summary { accent-color: var(--primary-color,#03a9f4); }select[multiple] { min-height: 106px; }label.check { min-block-size: 42px; display: flex; align-items: center; }details,fieldset { border: 1px solid var(--divider-color,#999); border-radius: 10px; padding: 8px 12px 12px; min-inline-size: 0; }summary { padding-block: 8px; min-block-size: 24px; font-weight: 650; cursor: pointer; }.stack { display: grid; gap: 12px; margin-block-start: 8px; }.grid { display: grid; gap: 10px; grid-template-columns: repeat(2,minmax(0,1fr)); }.actions,.record { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }.record { padding-block: 5px; border-block-end: 1px solid var(--divider-color,#999); }.record span { flex: 1; overflow-wrap: anywhere; }button { min-height: 42px; border-radius: 8px; border: 1px solid var(--primary-color,#0277bd); color: var(--primary-text-color); background: var(--card-background-color,#fff); cursor: pointer; padding: 6px 10px; font: inherit; }p { margin: 0; color: var(--secondary-text-color); font-size: .95em; }.error { color: var(--error-color,#b00020); }:focus-visible { outline: 2px solid var(--primary-color,#03a9f4); outline-offset: 2px; }@media (max-width: 340px) { .grid { grid-template-columns: minmax(0,1fr); } }";function y(n,e={},t=[]){let i=Object.assign(document.createElement(n),e);return i.append(...t),i}function ze(n,e,t){let i=y("input",{type:"checkbox",checked:e});return i.addEventListener("change",()=>t(i.checked)),y("label",{className:"check"},[i,n])}function Me(n,e){return y("option",{value:n,textContent:e})}function F(n,e){let t=y("select",{},n.map(([i,o])=>Me(i,o)));return t.value=e,t}var ft=0;function S(n,e){let t=y("span",{id:"bayit9-editor-label-"+ ++ft,textContent:n});return e.setAttribute("aria-labelledby",t.id),y("label",{className:"field"},[t,e])}function j(n,e){let t=y("button",{type:"button",textContent:n});return t.addEventListener("click",e),t}function me(n,e){return Object.entries(n.states??{}).filter(([t])=>!e||e.has(t.split(".")[0])).map(([t,i])=>{let o=i.attributes?.friendly_name;return[t,o&&o!==t?o+" · "+t:t]}).sort((t,i)=>t[1].localeCompare(i[1]))}function W(n,e,t,i){let o=y("details",{open:e},[y("summary",{textContent:n}),...i]);return o.addEventListener("toggle",()=>t(o.open)),o}var Z=class extends HTMLElement{#t={};#e={type:"custom:"+T};#i={};#n;#r;constructor(){super(),this.attachShadow({mode:"open"})}set hass(e){let t=this.#t;this.#t=e??{},(t.areas!==this.#t.areas||t.entities!==this.#t.entities||!this.#t.entities&&!Object.keys(t.states??{}).length&&Object.keys(this.#t.states??{}).length||(t.locale?.language??t.language)!==(e?.locale?.language??e?.language))&&this.render()}setConfig(e){this.#e={type:"custom:"+T,...e};let t=JSON.stringify(this.#e);t!==this.#r&&(this.#r=t,this.render())}connectedCallback(){this.render()}#o(e){this.#e={...this.#e,...e},this.#r=JSON.stringify(this.#e),this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:this.#e},bubbles:!0,composed:!0}))}#s(e,t,i){let o=me(this.#t),r=y("input",{type:"search",placeholder:i.searchable}),s=y("select",{multiple:!0,size:4});r.setAttribute("aria-label",i.searchable+" · "+e);let a=()=>{let c=r.value.trim().toLocaleLowerCase(),l=new Set(this.#e[t]??[]);s.replaceChildren(...o.filter(u=>l.has(u[0])||!c||u[1].toLocaleLowerCase().includes(c)).map(([u,p])=>y("option",{value:u,textContent:p,selected:l.has(u)})))};return r.addEventListener("input",a),s.addEventListener("change",()=>this.#o({[t]:[...s.selectedOptions].map(c=>c.value)})),a(),y("div",{className:"stack"},[r,S(e,s)])}#a(e){let t=Array.isArray(this.#e.profiles)?this.#e.profiles:[],i=[y("p",{textContent:e.hint})];for(let v of t)v?.entity&&i.push(y("div",{className:"record"},[y("span",{textContent:v.name||this.#t.states?.[v.entity]?.attributes?.friendly_name||v.entity}),j(e.edit,()=>{this.#n=v,this.render()}),j(e.remove,()=>{this.#n?.entity===v.entity&&(this.#n=void 0),this.#o({profiles:t.filter(x=>x.entity!==v.entity)}),this.render()})]));if(this.#n==null)return i.push(y("div",{className:"actions"},[j(e.add,()=>{this.#n={},this.render()})])),i;let o=this.#n,r=o.timed??{},s=F([["",e.choose],...me(this.#t,new Set(de))],o.entity||"");o.entity&&!s.value&&(s.append(Me(o.entity,o.entity)),s.value=o.entity);let a=F([["heater",e.heater],["boiler",e.boiler]],o.kind||"heater"),c=y("input",{value:o.name??"",maxLength:80}),l=(v,x)=>{let N=me(this.#t,new Set([v]));return x&&!N.some(([z])=>z===x)&&N.unshift([x,x]),F([["",e.none],...N],x||"")},u=l("script",r.start_script),p=l("script",r.stop_script),d=l("timer",r.timer_entity),m=y("input",{value:r.duration_field||"duration",maxLength:40}),b=v=>y("input",{type:"number",min:"1",max:"360",value:String(v)}),_=b(r.min_minutes??15),w=b(r.max_minutes??60),h=b(r.step_minutes??15),f=y("p",{className:"error",hidden:!0,textContent:e.invalid});return f.setAttribute("role","alert"),i.push(S(e.entity,s),S(e.kind,a),S(e.displayName,c),S(e.start,u),S(e.stop,p),S(e.timer,d),S(e.durationField,m),y("div",{className:"grid"},[S(e.min,_),S(e.max,w),S(e.step,h)]),f,y("div",{className:"actions"},[j(e.save,()=>{let v=ue({entity:s.value,kind:a.value,name:c.value,timed:{start_script:u.value,stop_script:p.value,timer_entity:d.value,duration_field:m.value,min_minutes:_.valueAsNumber,max_minutes:w.valueAsNumber,step_minutes:h.valueAsNumber}});if(!v){f.hidden=!1,s.focus();return}this.#n=void 0,this.#o({profiles:[...t.filter(x=>x.entity!==o.entity&&x.entity!==v.entity),v]}),this.render()}),j(e.clear,()=>{this.#n=void 0,this.render()})])),i}render(){if(!this.isConnected)return;let e=J(this.#e.locale,this.#t),t=mt[e],i=y("input",{value:this.#e.title??"",maxLength:80});i.addEventListener("change",()=>this.#o({title:i.value.trim()}));let o=F([["auto",t.automatic],["en","English"],["he","עברית"]],this.#e.locale??"auto");o.addEventListener("change",()=>{this.#o({locale:o.value}),this.render()});let r=(p,d,m,b)=>{let _=F(m,this.#e[d]??b);return _.addEventListener("change",()=>this.#o({[d]:_.value})),S(p,_)},s=Object.entries(le).map(([p,d])=>[p,d[e]]),a=Object.entries(this.#t.areas??{}).map(([p,d])=>({id:d.area_id??p,name:d.name??p})).sort((p,d)=>p.name.localeCompare(d.name,e)),c=new Set(this.#e.area_ids??[]),l=a.map(p=>ze(p.name,c.has(p.id),d=>{d?c.add(p.id):c.delete(p.id),this.#o({area_ids:[...c]})}));l.unshift(y("p",{textContent:t.anyArea+(e==="he"?" כשלא נבחר חדר":" when none are selected")}));let u=y("form",{dir:e==="he"?"rtl":"ltr"},[S(t.title,i),S(t.language,o),ze(t.unassigned,this.#e.show_unassigned!==!1,p=>this.#o({show_unassigned:p})),W(t.areas,this.#i.rooms,p=>{this.#i.rooms=p},l),W(t.appearance,this.#i.appearance,p=>{this.#i.appearance=p},[y("div",{className:"stack"},[r(t.background,"background",s,"aurora"),r(t.layout,"layout",[["classic",t.classic],["header",t.header]],"classic"),r(t.shape,"shape",[["soft",t.soft],["circle",t.circle],["square",t.square]],"soft")])]),W(t.devices,this.#i.devices,p=>{this.#i.devices=p},[this.#s(t.hidden,"hidden_entities",t),this.#s(t.included,"included_entities",t)]),W(t.profiles,this.#i.profiles,p=>{this.#i.profiles=p},[y("div",{className:"stack"},this.#a(t))])]);u.addEventListener("submit",p=>p.preventDefault()),this.shadowRoot.replaceChildren(y("style",{textContent:ht}),u)}};var Oe="ll-strategy-dashboard-"+T,he="bayit-9-strategy-editor",fe=class extends HTMLElement{static registryDependencies=["areas","devices","entities"];static generate(e,t){return Le(e,t)}static getCreateSuggestions(e){return De(e)}static getConfigElement(){return document.createElement(he)}};function Ie(){customElements.get(Oe)||customElements.define(Oe,fe),customElements.get(he)||customElements.define(he,Z),window.customStrategies??=[],window.customStrategies.some(n=>n.type===T&&n.strategyType==="dashboard")||window.customStrategies.push({type:T,strategyType:"dashboard",name:"Bayit 9",description:"A room-based Liquid Glass dashboard for Home Assistant.",documentationURL:"https://github.com/yahavzarfati/bayit-9"})}Ie();
