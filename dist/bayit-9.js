/*! Bayit 9 v0.1.0 */
var ve=`
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
`;var te={en:{home:"Home",settings:"Appearance",close:"Close",activity:"Active devices",rooms:"Rooms",more_info:"More info",empty:"No rooms have been added.",empty_room:"No devices in this room.",quiet:"All quiet",active:"active",unavailable:"Unavailable",unknown:"Unknown state",apply:"Apply",cancel:"Cancel",confirm:"Confirm",confirm_title:"Confirm action",confirm_action:"Continue with {action} on {name}?",send_error:"Could not complete the action.",sending:"Sending {name}…",confirmed:"{name} updated.",sent:"Command sent to {name}.",unconfirmed:"No confirmation received for {name}.",background:"Background",shape:"Button shape",layout:"Room layout",aurora:"Aurora",lagoon:"Lagoon",dunes:"Dunes",graphite:"Graphite",soft:"Rounded",circle:"Round",square:"Square",classic:"Room name below",header:"Room name above",turn_on:"Turn on",turn_off:"Turn off",open:"Open",close_device:"Close",stop:"Stop",set_position:"Position",lock:"Lock",unlock:"Unlock",set_hvac_mode:"Mode",set_temperature:"Target temperature",set_temperature_range:"Temperature range",set_fan_mode:"Fan speed",set_preset_mode:"Preset",set_operation_mode:"Operating mode",set_percentage:"Speed",set_brightness:"Brightness",start_timed:"Start timer",stop_timed:"Stop timer",duration:"Minutes",min:"Minimum",max:"Maximum",timed:"Timer",on:"On",off:"Off",opening:"Opening",closing:"Closing",opened:"Open",closed:"Closed",locked:"Locked",unlocked:"Unlocked",locking:"Locking",unlocking:"Unlocking",jammed:"Jammed",cool:"Cooling",heat:"Heating",heat_cool:"Heat / cool",dry:"Dry",fan_only:"Fan",auto:"Auto",idle:"Idle",paused:"Paused",playing:"Playing",cleaning:"Cleaning",docked:"Docked",available_option:"Choose an option"},he:{home:"בית",settings:"מראה",close:"סגירה",activity:"מכשירים פעילים",rooms:"חדרים",more_info:"מידע נוסף",empty:"עדיין אין חדרים בדשבורד.",empty_room:"אין מכשירים בחדר הזה.",quiet:"הכול שקט",active:"פעיל",unavailable:"לא זמין",unknown:"מצב לא ידוע",apply:"החל",cancel:"ביטול",confirm:"אישור",confirm_title:"אישור פעולה",confirm_action:"להמשיך בפעולה ״{action}״ עבור {name}?",send_error:"הפעולה לא הושלמה.",sending:"שולח פקודה אל {name}…",confirmed:"המצב של {name} עודכן.",sent:"נשלחה פקודה אל {name}.",unconfirmed:"עדיין לא התקבל אישור מצב עבור {name}.",background:"רקע",shape:"צורת הכפתורים",layout:"פריסת החדרים",aurora:"זוהר צפוני",lagoon:"לגונה",dunes:"דיונות",graphite:"גרפיט",soft:"פינות מעוגלות",circle:"עגול",square:"מרובע",classic:"שם החדר למטה",header:"שם החדר למעלה",turn_on:"הדלקה",turn_off:"כיבוי",open:"פתיחה",close_device:"סגירה",stop:"עצירה",set_position:"מיקום",lock:"נעילה",unlock:"פתיחת מנעול",set_hvac_mode:"מצב עבודה",set_temperature:"טמפרטורת יעד",set_temperature_range:"טווח טמפרטורה",set_fan_mode:"מהירות מאוורר",set_preset_mode:"תוכנית",set_operation_mode:"מצב פעולה",set_percentage:"מהירות",set_brightness:"בהירות",start_timed:"הפעלת טיימר",stop_timed:"עצירת טיימר",duration:"דקות",min:"מינימום",max:"מקסימום",timed:"טיימר",on:"פועל",off:"כבוי",opening:"נפתח",closing:"נסגר",opened:"פתוח",closed:"סגור",locked:"נעול",unlocked:"לא נעול",locking:"ננעל",unlocking:"משתחרר",jammed:"תקוע",cool:"קירור",heat:"חימום",heat_cool:"חימום / קירור",dry:"ייבוש",fan_only:"אוורור",auto:"אוטומטי",idle:"בהמתנה",paused:"מושהה",playing:"מנגן",cleaning:"מנקה",docked:"בעמדה",available_option:"בחירת אפשרות"}};var je=/^[a-z][a-z0-9_]*\.[a-z0-9_]+$/,He=/^[A-Za-z_][A-Za-z0-9_]*$/,J=Object.freeze(["switch","climate","fan","water_heater"]),Be=["off","heat","cool","heat_cool","auto","dry","fan_only"],K={open:1,close:2,position:4,stop:8},$={speed:1,preset:8,off:16,on:32},L={temperature:1,range:2,fan:8,preset:16,off:128,on:256},ie={temperature:1,operation:2,power:8},Ue={open:"open_cover",close:"close_cover",stop:"stop_cover",set_position:"set_cover_position",set_brightness:"turn_on",set_temperature_range:"set_temperature"},oe={set_position:"position",set_brightness:"brightness_pct",set_percentage:"percentage",set_hvac_mode:"hvac_mode",set_fan_mode:"fan_mode",set_preset_mode:"preset_mode",set_operation_mode:"operation_mode",set_temperature:"temperature"},xe=Symbol("request-timed-out"),S=class extends Error{constructor(e,t,i){super(t,i),this.name="DeviceControlError",this.code=e}};function Y(n,e){return typeof n=="string"&&je.test(n)&&(!e||n.startsWith(e+"."))}function I(n){return typeof n?.state=="string"&&n.state!==""&&!["unavailable","unknown"].includes(n.state)}function Ve(n,e){if(n===void 0)return null;if(!n||typeof n!="object"||Array.isArray(n)||!J.includes(e))throw new S("invalid_config","A timed profile requires a heating-capable entity.");let{start_script:t,stop_script:i,timer_entity:o,duration_field:s="duration",min_minutes:r=1,max_minutes:a=60,step_minutes:l=1}=n;if(t!==void 0&&!Y(t,"script")||i!==void 0&&!Y(i,"script")||o!==void 0&&!Y(o,"timer")||typeof s!="string"||!He.test(s)||![r,a,l].every(Number.isSafeInteger)||r<1||a<r||l<1)throw new S("invalid_config","The timed profile includes an invalid entity or duration setting.");return{start_script:t,stop_script:i,timer_entity:o,duration_field:s,min_minutes:r,max_minutes:a,step_minutes:l}}function we(n){if(!n||!Y(n.entity))throw new S("invalid_config","Configure a Home Assistant entity ID.");let e=n.entity.split(".")[0],t=n.kind??e;if(t!==e&&(!["heater","boiler"].includes(t)||!J.includes(e)))throw new S("invalid_config","The entity does not support the requested device profile.");if(n.confirmation_ms!==void 0&&(!Number.isSafeInteger(n.confirmation_ms)||n.confirmation_ms<0))throw new S("invalid_config","The confirmation time must be a nonnegative number of milliseconds.");return{...n,kind:t,domain:e,timed:Ve(n.timed,e)}}function Ge(n){if(typeof n!="string")return null;let e=/^(?:(\d+) days?, )?(\d+):([0-5]\d):([0-5]\d)(?:\.(\d{1,6}))?$/.exec(n);if(!e)return null;let[,t,i,o,s,r]=e,a=((Number(t??0)*24+Number(i))*3600+Number(o)*60+Number(s)+(r?+("0."+r):0))*1e3;return Number.isFinite(a)?a:null}function se(n){return typeof n=="string"&&/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(n)?Date.parse(n):NaN}function Ke(n,e,t){if(!n)return null;let i=e?.[n],o=["active","paused","idle"].includes(i?.state)?i.state:"unavailable",s=o==="active"?se(i.attributes?.finishes_at):NaN,r=Number.isFinite(s)?s:null,a=null;return r!==null&&(a=Math.max(0,r-t)),o==="paused"&&(a=Ge(i.attributes?.remaining)),o==="idle"&&(a=0),{entity:n,state:o,deadlineMs:r,remainingMs:a}}function $e(n,e,t){let i={},o=(p,f)=>{i[p]={id:p,requiresConfirmation:!1,...f}},s=()=>{o("turn_on"),o("turn_off")},r=(p,f,u)=>{if(!Array.isArray(f))return;let h=[...new Set(f.filter(v=>typeof v=="string"&&v.length>0&&(!u||u.includes(v))))];h.length&&o(p,{options:h})},a=n.timed;if(t&&o("more_info"),!I(t))return i;let l=t.attributes??{},c=Number.isSafeInteger(l.supported_features)&&l.supported_features>=0?l.supported_features:0,m=p=>(c&p)===p,d=p=>{let{min_temp:f,max_temp:u,target_temp_step:h}=l;if(!Number.isFinite(f)||!Number.isFinite(u)||f>u)return;let v=Number.isFinite(h)&&h>0?h:null;o(p,{min:f,max:u,step:v})};switch(n.domain){case"switch":s();break;case"light":s(),(Array.isArray(l.supported_color_modes)&&l.supported_color_modes.some(p=>["brightness","color_temp","hs","xy","rgb","rgbw","rgbww","white"].includes(p))||Number.isFinite(l.brightness))&&o("set_brightness",{min:0,max:100,step:1});break;case"cover":m(K.open)&&o("open"),m(K.close)&&o("close"),m(K.stop)&&o("stop"),m(K.position)&&o("set_position",{min:0,max:100,step:1});break;case"fan":m($.on)&&o("turn_on"),m($.off)&&o("turn_off"),m($.speed)&&o("set_percentage",{min:0,max:100,step:1}),m($.preset)&&r("set_preset_mode",l.preset_modes);break;case"climate":m(L.on)&&o("turn_on"),m(L.off)&&o("turn_off"),r("set_hvac_mode",l.hvac_modes,Be),m(L.temperature)&&d("set_temperature"),m(L.range)&&d("set_temperature_range"),m(L.fan)&&r("set_fan_mode",l.fan_modes),m(L.preset)&&r("set_preset_mode",l.preset_modes);break;case"water_heater":m(ie.power)&&s(),m(ie.temperature)&&d("set_temperature"),m(ie.operation)&&r("set_operation_mode",l.operation_list);break;case"lock":{let p=typeof l.code_format=="string"&&l.code_format.length>0;o("lock",{requiresCode:p}),o("unlock",{requiresCode:p,requiresConfirmation:!0});break}}if(a?.start_script){i.turn_off||(i.set_hvac_mode?.options.includes("off")?o("turn_off",{service:"set_hvac_mode",fixedData:{hvac_mode:"off"}}):i.set_operation_mode?.options.includes("off")?o("turn_off",{service:"set_operation_mode",fixedData:{operation_mode:"off"}}):i.set_percentage&&o("turn_off",{service:"set_percentage",fixedData:{percentage:0}}));for(let p of["turn_on","set_hvac_mode","set_operation_mode","set_percentage","set_temperature","set_temperature_range","set_fan_mode","set_preset_mode"])delete i[p];I(e?.[a.start_script])&&o("start_timed",{min:a.min_minutes,max:a.max_minutes,step:a.step_minutes})}return a?.stop_script&&I(e?.[a.stop_script])&&(o("stop_timed"),delete i.turn_off),i}function ke(n,e,t){let i=e?.[n.entity],o=i?.attributes??{};return{entity:n.entity,domain:n.domain,kind:n.kind,name:n.name||o.friendly_name||n.entity,icon:n.icon||o.icon||null,state:i?.state??"missing",available:I(i),attributes:o,actions:$e(n,e,i),timer:Ke(n.timed?.timer_entity,e,t)}}function Ae(n,e,t=Date.now()){return ke(we(n),e,t)}function ne(n,{min:e,max:t,step:i}){if(!Number.isFinite(n)||n<e||n>t)return!1;if(!i)return!0;let o=(n-e)/i;return n===t||Math.abs(o-Math.round(o))<1e-7}function Ye(n,e,t,i){let o=(r,a,l)=>({entity:n.entity,attributes:{[r]:a},tolerance:l}),s=r=>({entity:n.entity,state:r});switch(e){case"turn_on":return["light","switch","fan"].includes(n.domain)?s("on"):null;case"turn_off":return s("off");case"open":return s("open");case"close":return s("closed");case"stop":return["opening","closing"].includes(i?.[n.entity]?.state)?{entity:n.entity,anyState:["open","closed"]}:null;case"set_position":return o("current_position",t);case"set_brightness":return t===0?s("off"):{...o("brightness",Math.round(t*255/100),2),state:"on"};case"set_percentage":return t===0?s("off"):o("percentage",t);case"lock":return s("locked");case"unlock":return s("unlocked");case"set_hvac_mode":case"set_operation_mode":return s(t);case"set_fan_mode":case"set_preset_mode":case"set_temperature":return o(oe[e],t,1e-6);case"set_temperature_range":return{entity:n.entity,attributes:{target_temp_low:t.low,target_temp_high:t.high},tolerance:1e-6};case"start_timed":{let r=n.timed.timer_entity,a=["switch","fan"].includes(n.domain)?s("on"):null;if(!r)return a;let l=se(i?.[r]?.attributes?.finishes_at);return{all:[{entity:r,state:"active",requireNewDeadline:!0,formerDeadline:l},...a?[a]:[]]}}case"stop_timed":return n.timed.timer_entity?{all:[{entity:n.timed.timer_entity,state:"idle"},s("off")]}:s("off");default:return null}}function Je(n,e,t,i,{confirmed:o=!1,code:s}={}){n=we(n);let r=ke(n,e,Date.now()),a=typeof t=="string"&&Object.hasOwn(r.actions,t)&&r.actions[t];if(!a)throw new S("action_unavailable","This entity does not currently support that action.");if(a.requiresConfirmation&&o!==!0)throw new S("confirmation_required","This action requires explicit confirmation.");if(a.requiresCode&&(typeof s!="string"||!s.trim()||s.length>64))throw new S("pin_required","Enter the lock code in Home Assistant.");if(t==="more_info")return{kind:"more_info",entity:n.entity};if(t==="set_temperature_range"){if(!i||!ne(i.low,a)||!ne(i.high,a)||i.low>i.high)throw new S("invalid_value","The selected temperature range is invalid.")}else if(a.options?!a.options.includes(i):a.min!==void 0&&!ne(i,a))throw new S("invalid_value","The selected value is outside the published device options.");let l=Ye(n,t,i,e);if(t==="start_timed"||t==="stop_timed"){let m=t==="start_timed";return{kind:"service",domain:"script",service:(m?n.timed.start_script:n.timed.stop_script).split(".")[1],target:null,data:m?{[n.timed.duration_field]:i}:{},expected:l}}let c=t==="set_temperature_range"?{target_temp_low:i.low,target_temp_high:i.high}:oe[t]?{[oe[t]]:i}:{...a.fixedData};return a.requiresCode&&(c.code=s),{kind:"service",domain:r.domain,service:a.service??Ue[t]??t,target:{entity_id:n.entity},data:c,expected:l}}function Se(n,e){if(n.all)return n.all.every(i=>Se(i,e));let t=e?.[n.entity];if(!I(t)||n.state!==void 0&&n.state!==t.state||n.anyState&&!n.anyState.includes(t.state))return!1;if(n.requireNewDeadline){let i=se(t.attributes?.finishes_at);if(!Number.isFinite(i)||i===n.formerDeadline)return!1}return Object.entries(n.attributes??{}).every(([i,o])=>{let s=t.attributes?.[i];return typeof o=="number"?Number.isFinite(s)&&Math.abs(s-o)<=(n.tolerance??0):s===o})}var We=n=>new Promise(e=>setTimeout(e,n)),Xe=()=>globalThis.performance.now();function Ze(n,e){let t,i=new Promise(o=>{t=setTimeout(()=>o(xe),e)});return Promise.race([n,i]).finally(()=>clearTimeout(t))}function Ce({getHass:n,confirmationTimeoutMs:e,requestTimeoutMs:t=1e4,pollIntervalMs:i=100,sleep:o=We,now:s=Xe}={}){if(typeof n!="function"||typeof o!="function"||typeof s!="function"||!Number.isSafeInteger(t)||t<1||t>2147483647||!Number.isSafeInteger(i)||i<1||e!==void 0&&(!Number.isSafeInteger(e)||e<0))throw new S("invalid_config","The dashboard connection or timeout setting is invalid.");let r=new Map;return{async execute(a,l,c,m){let d=n(),p=Je(a,d?.states,l,c,m);if(p.kind==="more_info")return{status:"more_info",entity:p.entity};if(typeof d?.callWS!="function")throw new S("service_unavailable","The Home Assistant connection is unavailable.");let f=a.entity,u=Symbol(f);r.set(f,u);let h=(v,g)=>({status:v,entity:f,action:l,...g?{reason:g}:{}});try{let v={type:"call_service",domain:p.domain,service:p.service,service_data:p.data};p.target&&(v.target=p.target);let g;try{g=await Ze(Promise.resolve(d.callWS(v)),t)}catch(w){if(r.get(f)!==u)return h("unconfirmed","superseded");throw new S("service_failed","Home Assistant rejected or could not deliver the command.",{cause:w})}if(r.get(f)!==u)return h("unconfirmed","superseded");if(g===xe)return h("unconfirmed","request_timeout");let b=a.confirmation_ms??e??(p.domain==="cover"?45e3:8e3);if(!p.expected||!b)return h("sent");let x=s()+b;for(;;){if(r.get(f)!==u)return h("unconfirmed","superseded");if(Se(p.expected,n()?.states))return h("confirmed");let w=x-s();if(w<=0)return h("unconfirmed","state_timeout");await o(Math.min(i,w))}}finally{r.get(f)===u&&r.delete(f)}}}}var Qe="custom:bayit-dashboard",T="bayit-9",j=6,le={aurora:{en:"Aurora",he:"זוהר צפוני"},lagoon:{en:"Lagoon",he:"לגונה"},dunes:{en:"Dunes",he:"דיונות"},graphite:{en:"Graphite",he:"גרפיט"}},de=J,et=["light","switch","cover","climate","fan","lock","water_heater","vacuum","humidifier","alarm_control_panel","camera","media_player","binary_sensor","sensor","weather","person","calendar"],ue=/^[a-z0-9_]+\.[a-z0-9_]+$/,tt=new Set(["heater","boiler"]),re=new Map(et.map((n,e)=>[n,e])),Ne="script",W={en:{title:"Bayit 9",home:"Home",unassigned:"Unassigned"},he:{title:"בית 9",home:"בית",unassigned:"ללא חדר"}};function X(n,e={}){if(n==="en"||n==="he")return n;let t=e.locale?.language??e.language;return typeof t=="string"&&/^he(?:[-_]|$)/i.test(t)?"he":"en"}function P(n){return Array.isArray(n)?[...new Set(n.filter(e=>typeof e=="string"&&e.trim()))]:[]}function F(n){return n.split(".")[0]}function ae(n,e){return typeof n=="string"&&ue.test(n)&&F(n)===e?n:void 0}function ce(n,e){return Number.isInteger(n)&&n>0&&n<=360?n:e}function pe(n){if(!n||typeof n.entity!="string"||!ue.test(n.entity)||!de.includes(F(n.entity))||!tt.has(n.kind))return null;let e={entity:n.entity,kind:n.kind};typeof n.name=="string"&&n.name.trim()&&(e.name=n.name.trim().slice(0,80));let t=n.timed;if(!t||typeof t!="object")return e;let i=ae(t.start_script,Ne),o=ae(t.stop_script,Ne),s=ae(t.timer_entity,"timer");if(!i&&!s&&!o)return e;let r=ce(t.min_minutes,15),a=Math.max(r,ce(t.max_minutes,60)),l=Math.min(a-r||1,ce(t.step_minutes,15));return e.timed={...i&&{start_script:i},...o&&{stop_script:o},...s&&{timer_entity:s},duration_field:typeof t.duration_field=="string"&&/^[a-z][a-z0-9_]{0,39}$/.test(t.duration_field)?t.duration_field:"duration",min_minutes:r,max_minutes:a,step_minutes:l},e}function it(n){let e=new Map;for(let t of Array.isArray(n)?n:[]){let i=pe(t);i&&!e.has(i.entity)&&e.set(i.entity,i)}return e}function nt(n){return new Map(Object.entries(n.areas??{}).map(([e,t])=>[t.area_id??e,{name:t.name??e,icon:t.icon||"mdi:home-outline"}]))}function Ee(n,e,t){return n.localeCompare(e,t,{numeric:!0,sensitivity:"base"})}function ot(n){let e="bayit9_unassigned";for(let t=1;n.has(e);t++)e="bayit9_unassigned_"+t;return e}function st(n,e,t,i){let o=i?.name??e.attributes?.friendly_name??t?.name??t?.en,s=t?.icon??t?.ic??e.attributes?.icon;return{entity:n,...typeof o=="string"&&o&&{name:o},...typeof s=="string"&&s&&{icon:s},...i&&{kind:i.kind},...i?.timed&&{timed:i.timed}}}function me(n,e,t){let i=nt(e),o=ot(i),s=new Set(P(n.area_ids)),r=new Map(P(n.area_ids).map((g,b)=>[g,b])),a=new Set(P(n.hidden_entities)),l=new Set(P(n.included_entities)),c=it(n.profiles),m=new Set([...c.values()].flatMap(g=>{let b=g.timed;return b?[b.start_script,b.stop_script,b.timer_entity].filter(Boolean):[]})),d=e.states??{},p=e.entities??null,f=new Map,u=new Set(Object.keys(p||d));for(let g of[...l,...c.keys()])u.add(g);for(let g of u){if(!ue.test(g)||a.has(g)||!Object.hasOwn(d,g))continue;let b=p?.[g];if(b?.hidden===!0||b?.hidden_by||b?.disabled_by)continue;let x=l.has(g)||c.has(g),w=F(g),q=b?.entity_category!=null||b?.ec!=null;if(!x&&(!re.has(w)||q||m.has(g)))continue;let C=b?.device_id??b?.di,E=C&&e.devices?.[C],G=b?.area_id??b?.ai??E?.area_id,z=G&&i.has(G)?G:o;(z===o?n.show_unassigned===!1:s.size&&!s.has(z))||(f.has(z)||f.set(z,[]),f.get(z).push(st(g,d[g],b,c.get(g))))}let h=g=>i.get(g)??{name:W[t].unassigned,icon:"mdi:map-marker-outline"};return[...f.keys()].sort((g,b)=>g===o||b===o?g===o?1:-1:(r.get(g)??1/0)-(r.get(b)??1/0)||Ee(h(g).name,h(b).name,t)).map(g=>{let b=h(g),x=f.get(g).sort((C,E)=>(re.get(F(C.entity))??100)-(re.get(F(E.entity))??100)||Ee(C.name??C.entity,E.name??E.entity,t)),w={id:g,name:b.name,icon:b.icon,entities:x},q=Object.hasOwn(n.room_shortcuts??{},g)?n.room_shortcuts[g]:null;if(Array.isArray(q)){let C=new Set(x.map(E=>E.entity));w.shortcuts=P(q).filter(E=>C.has(E)).slice(0,j)}return w})}function qe(n){return{title:W[X("auto",n)].title,icon:"mdi:home-variant-outline"}}function Te(n={},e={}){let t=X(n.locale,e),i=typeof n.title=="string"&&n.title.trim()?n.title.trim():W[t].title,o={type:Qe,locale:t,title:i,rooms:me(n,e,t)};return Object.hasOwn(le,n.background)&&(o.background=n.background),["soft","circle","square"].includes(n.shape)&&(o.shape=n.shape),["classic","header"].includes(n.layout)&&(o.layout=n.layout),typeof n.preference_key=="string"&&n.preference_key.trim()&&(o.preference_key=n.preference_key.trim()),{title:i,views:[{title:W[t].home,path:"home",type:"panel",cards:[o]}]}}var De=Object.freeze(["aurora","lagoon","dunes","graphite"]),H={background:De,shape:["soft","circle","square"],layout:["classic","header"]},rt={aurora:"#63928a",lagoon:"#37728c",dunes:"#aa7356",graphite:"#596169"},ze=/^mdi:[a-z0-9-]+$/,at=/^[a-z0-9_]+\.[a-z0-9_]+$/,ct={turn_on:"mdi:power",turn_off:"mdi:power",open:"mdi:arrow-up",close:"mdi:arrow-down",stop:"mdi:stop",lock:"mdi:lock-outline",unlock:"mdi:lock-open-variant-outline",start_timed:"mdi:timer-play-outline",stop_timed:"mdi:timer-stop-outline"},lt={light:"mdi:lightbulb-outline",switch:"mdi:toggle-switch-outline",fan:"mdi:fan",cover:"mdi:blinds",climate:"mdi:thermostat",lock:"mdi:lock-outline",heater:"mdi:radiator",boiler:"mdi:water-boiler",water_heater:"mdi:water-boiler",sensor:"mdi:gauge",binary_sensor:"mdi:motion-sensor",calendar:"mdi:calendar-outline",person:"mdi:account-outline",vacuum:"mdi:robot-vacuum",camera:"mdi:cctv",media_player:"mdi:speaker"},dt=new Set(["open","close","set_position"]),Oe=new Set(["set_position","set_brightness","set_percentage"]),Re={set_position:"current_position",set_percentage:"percentage",set_brightness:"brightness",set_temperature:"temperature",set_fan_mode:"fan_mode",set_preset_mode:"preset_mode",set_operation_mode:"operation_mode"},Me=["turn_on","turn_off","open","stop","close","lock","unlock","set_position","set_brightness","set_percentage","set_hvac_mode","set_temperature","set_temperature_range","set_fan_mode","set_preset_mode","set_operation_mode","start_timed","stop_timed"],Le=new Set(["on","off","open","closed","opening","closing","locked","unlocked","locking","unlocking","jammed","cool","heat","heat_cool","dry","fan_only","auto","idle","active","paused","playing","cleaning","docked","unavailable","unknown"]),ut=0;function _(n,e,t){let i=document.createElement(n);return e&&(i.className=e),t!=null&&(i.textContent=t),i}function B(n,e="mdi:information-outline"){return typeof n=="string"&&ze.test(n)?n:e}function D(n){let e=_("ha-icon");return e.setAttribute("icon",B(n)),e.setAttribute("aria-hidden","true"),e}function R(n,e){n.getAttribute("aria-label")!==e&&(n.title=e,n.setAttribute("aria-label",e))}function O(n,e,t,i=!1){let o=_("button",n);return o.type="button",t&&o.append(D(t)),i?R(o,e):e&&o.append(e),o}function N(n){return typeof n=="string"?n.trim():""}function Z(n){if(n==null||n==="")return null;let e=Number(n);return Number.isFinite(e)?e:null}function Q(n){return"⁦"+n+"⁩"}function k(n,e){n.textContent!==String(e)&&(n.textContent=e)}function he(n,e){let t=B(e);n.getAttribute("icon")!==t&&n.setAttribute("icon",t)}function pt(n={}){if(!n||typeof n!="object"||Array.isArray(n))throw new Error("Invalid Bayit 9 configuration.");let e=/^he(?:-|$)/i.test(N(n.locale))?"he":"en",t=new Set,i=n.rooms??[];if(!Array.isArray(i))throw new Error("Bayit 9 rooms must be a list.");let o=i.map(s=>{let r=N(s?.id),a=N(s?.name);if(!/^[a-z0-9][a-z0-9_-]*$/i.test(r)||!a||t.has(r))throw new Error("Each Bayit 9 room needs a unique id and name.");t.add(r);let l=s.entities??[],c=new Map;if(!Array.isArray(l))throw new Error("Bayit 9 room entities must be a list.");for(let d of l){let p=N(typeof d=="string"?d:d?.entity);if(!at.test(N(p)))throw new Error("Invalid Home Assistant entity in Bayit 9.");if(c.has(p))continue;let f={entity:p};N(d.name)&&(f.name=N(d.name)),ze.test(N(d.icon))&&(f.icon=d.icon),["heater","boiler"].includes(d.kind)&&(f.kind=d.kind),d.timed&&typeof d.timed=="object"&&!Array.isArray(d.timed)&&(f.timed={...d.timed}),c.set(p,f)}let m={id:r,name:a,icon:B(s.icon,"mdi:door-open"),entities:[...c.values()]};return Array.isArray(s.shortcuts)&&(m.shortcuts=[...new Set(s.shortcuts)].filter(d=>c.has(d)).slice(0,j)),m});return{locale:e,rooms:o,title:N(n.title)||te[e].home,background:De.includes(n.background)?n.background:"aurora",layout:H.layout.includes(n.layout)?n.layout:"classic",shape:H.shape.includes(n.shape)?n.shape:"soft",storageKey:"bayit-9.preferences.v1:"+(N(n.preference_key)||location.pathname)}}var mt=`
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
`,fe=class extends HTMLElement{constructor(){super(),this.attachShadow({mode:"open"}).innerHTML="<style>"+ve+"</style>"+mt;let e=s=>this.shadowRoot.querySelector(s),t=s=>e('[data-role="'+s+'"]');this.nodes={shell:e(".shell"),rooms:e(".rooms"),empty:e(".empty"),title:e("h1"),activity:t("activity"),badge:e(".badge"),settings:t("settings"),close:t("close"),modal:e("dialog:not(.confirm)"),modalTitle:e("dialog:not(.confirm) h2"),modalBody:e("dialog:not(.confirm) .modal-body"),content:t("content"),confirm:e(".confirm"),confirmTitle:e(".confirm h2"),confirmText:e(".confirmation-text"),accept:t("accept"),abort:t("abort"),pageNotice:t("page-notice"),modalNotice:t("modal-notice")};let i=this.nodes,o="bayit-9-"+ ++ut;i.modalTitle.id=o+"-title",i.modal.setAttribute("aria-labelledby",i.modalTitle.id),i.confirmTitle.id=o+"-confirm",i.confirmText.id=o+"-message",i.confirm.setAttribute("aria-labelledby",i.confirmTitle.id),i.confirm.setAttribute("aria-describedby",i.confirmText.id),i.settings.onclick=()=>this.openPanel("settings",i.settings),i.activity.onclick=()=>this.openPanel("activity",i.activity),i.close.onclick=()=>i.modal.close(),i.abort.onclick=()=>i.confirm.close(),i.accept.onclick=()=>this.acceptAction(),i.modal.addEventListener("close",()=>this.closePanel()),i.confirm.addEventListener("close",()=>{let s=this.confirming?.source;this.confirming=null,s?.isConnected&&!s.disabled&&s.focus({preventScroll:!0})});for(let s of[i.modal,i.confirm])s.addEventListener("click",r=>{let a=s.getBoundingClientRect();r.target===s&&(r.clientX<a.left||r.clientX>a.right||r.clientY<a.top||r.clientY>a.bottom)&&s.close()});this.roomViews=new Map,this.deviceViews=new Map,this.pending=new Map,this.roomScroll=new Map,this.preferences={},this.controller=Ce({getHass:()=>this._hass}),this.storageChange=s=>{s.key===this.config?.storageKey&&(this.readPreferences(),this.applyPreferences())}}static getStubConfig(){return{locale:"en",rooms:[]}}getCardSize(){return Math.max(2,Math.ceil((this.config?.rooms.length||0)/2)*3+1)}getGridOptions(){return{columns:12,min_columns:6,rows:"auto"}}setConfig(e){let t=pt(e);this.config?.storageKey!==t.storageKey&&(this.preferences={}),this.nodes.confirm.open&&this.nodes.confirm.close(),this.nodes.modal.open&&this.nodes.modal.close(),this.config=t,this.words=te[t.locale];let i=this.nodes;i.shell.lang=t.locale,i.shell.dir=t.locale==="he"?"rtl":"ltr",k(i.title,t.title),k(i.empty,this.t("empty")),R(i.settings,this.t("settings")),R(i.activity,this.t("activity")),R(i.close,this.t("close")),i.rooms.setAttribute("aria-label",this.t("rooms")),k(i.confirmTitle,this.t("confirm_title")),k(i.abort,this.t("cancel")),k(i.accept,this.t("confirm")),this.readPreferences(),this.buildRooms(),this.applyPreferences(),this.update()}set hass(e){this._hass=e,!(!this.isConnected||this.frame||!this.config)&&(this.frame=requestAnimationFrame(()=>{this.frame=0,this.update()}))}connectedCallback(){window.addEventListener("storage",this.storageChange),this.update()}disconnectedCallback(){window.removeEventListener("storage",this.storageChange),cancelAnimationFrame(this.frame),clearInterval(this.ticker),clearTimeout(this.noticeTimer),this.frame=this.ticker=0,this.nodes.confirm.open&&this.nodes.confirm.close(),this.nodes.modal.open&&this.nodes.modal.close()}t(e){return this.words?.[e]||e}readPreferences(){let e;try{e=JSON.parse(localStorage.getItem(this.config.storageKey)||"{}")}catch{return}this.preferences={};for(let[t,i]of Object.entries(H))i.includes(e?.[t])&&(this.preferences[t]=e[t])}applyPreferences(){for(let e of Object.keys(H))this.nodes.shell.dataset[e]=this.preferences[e]||this.config[e];for(let{article:e,heading:t}of this.roomViews.values())this.nodes.shell.dataset.layout==="header"&&e.firstElementChild!==t&&e.prepend(t),this.nodes.shell.dataset.layout!=="header"&&e.lastElementChild!==t&&e.append(t);if(this.panel?.type==="settings")for(let e of this.nodes.content.querySelectorAll("[data-preference]"))e.setAttribute("aria-pressed",String(e.value===this.nodes.shell.dataset[e.dataset.preference]))}setPreference(e,t){this.preferences[e]=t;try{localStorage.setItem(this.config.storageKey,JSON.stringify(this.preferences))}catch{}this.applyPreferences()}model(e){try{let t=Ae(e,this._hass?.states??{});return{...t,icon:B(t.icon,lt[t.kind||t.domain])}}catch{return{...e,name:e.name||e.entity,icon:B(e.icon),actions:{},attributes:{},state:"unavailable",available:!1}}}buildRooms(){let e=this.nodes;this.roomViews.clear(),e.rooms.replaceChildren();for(let t of this.config.rooms){let i=_("article","room");i.dataset.room=t.id;let o=O("room-title");R(o,t.name),o.setAttribute("aria-haspopup","dialog");let s=D(this.config.locale==="he"?"mdi:chevron-left":"mdi:chevron-right");s.className="chevron",o.append(D(t.icon),_("span","",t.name),s),o.onclick=()=>this.openPanel("room",o,t);let r=_("div","room-status"),a=D("mdi:power-standby"),l=_("span");r.append(a,l);let c=_("div","quick"),m=new Map,d=u=>+!["light","switch","fan","cover","lock","climate","water_heater"].includes(u.entity.split(".")[0]),p=new Map(t.entities.map(u=>[u.entity,u])),f=t.shortcuts?t.shortcuts.map(u=>p.get(u)):[...t.entities].sort((u,h)=>d(u)-d(h)).slice(0,2);for(let u of f){let h=O("quick-button",u.name||u.entity,u.icon||"mdi:information-outline",!0);h.dataset.entity=u.entity,h.onclick=()=>{let v=this.model(u);if(this.pending.has(u.entity)&&v.domain!=="cover")return;let g=["light","switch","fan"].includes(v.domain)&&!u.timed?.start_script&&!u.timed?.stop_script,b=v.state==="on"?"turn_off":"turn_on";g&&v.actions[b]&&!v.actions[b].requiresConfirmation?this.requestAction(u,b,void 0,h):this.openPanel("room",h,t,u.entity)},m.set(u.entity,h),c.append(h)}i.append(r,c,o),e.rooms.append(i),this.roomViews.set(t.id,{room:t,article:i,heading:o,status:r,statusIcon:a,statusText:l,shortcut:m})}e.empty.hidden=this.roomViews.size>0}tone(e){return e.available?e.domain==="cover"&&["open","opening","closing"].includes(e.state)?"moving":e.domain==="lock"&&["unlocked","unlocking","jammed"].includes(e.state)?"critical":e.timer?.state==="active"||["on","playing","cleaning"].includes(e.state)||["heating","cooling","drying","fan"].includes(e.attributes?.hvac_action)?"warm":"quiet":"quiet"}stateLabel(e){if(!e.available)return this.t("unavailable");let t=e.attributes||{},i=e.state,o=r=>Le.has(r)?this.t(r):String(r||this.t("unknown"));if(e.domain==="cover"){let r=Z(t.current_position);return(i==="open"?this.t("opened"):o(i))+(r===null?"":" · "+Q(r+"%"))}if(e.domain==="sensor"&&t.unit_of_measurement)return Q(i+" "+t.unit_of_measurement);if(e.domain==="climate"){let r=Z(t.current_temperature),a=this._hass?.config?.unit_system?.temperature||"°";return o(i)+(r===null?"":" · "+Q(r+" "+a))}if(Le.has(i))return o(i);let s=this._hass?.states?.[e.entity];return String(s&&this._hass?.formatEntityState?.(s)||i||this.t("unknown"))}update(){if(!this.config)return;let e=this.nodes,t=new Map;for(let[i,o]of this.roomViews){let s=0,r=!1,a;for(let l of o.room.entities){let c=this.model(l),m=this.tone(c);r||=!c.available,m!=="quiet"&&(s++,t.has(l.entity)||t.set(l.entity,{config:l,model:c,room:o.room})),!a&&c.available&&c.attributes?.device_class==="temperature"&&(a=c);let d=o.shortcut.get(l.entity);if(!d)continue;he(d.firstElementChild,c.icon),R(d,c.name+" · "+this.stateLabel(c)),d.dataset.tone=m,d.dataset.transition=["opening","closing"].includes(c.state)?c.state:"";let p=this.pending.has(l.entity);d.disabled=p&&c.domain!=="cover",d.setAttribute("aria-busy",String(p))}k(o.statusText,s?s+" "+this.t("active"):a?this.stateLabel(a):this.t(r?"unavailable":"quiet")),he(o.statusIcon,s?"mdi:lightning-bolt-outline":a?"mdi:thermometer":r?"mdi:alert-circle-outline":"mdi:power-standby"),o.status.dataset.tone=s?"warm":"quiet",o.article.toggleAttribute("data-current",this.panel?.room?.id===i)}this.activeDevices=t,e.badge.hidden=!t.size,k(e.badge,t.size),this.panel?.type==="room"&&this.updateDevices(),this.panel?.type==="activity"&&this.paintActivity()}openPanel(e,t,i,o){if(!this.config)return;let s=this.nodes,r=t.getBoundingClientRect();s.modal.open||(this.restoreFocus=t),this.panel={type:e,room:i},this.deviceViews.clear(),this.activitySignature=null,k(s.modalNotice,"");let a=e==="room"?i.icon:e==="settings"?"mdi:cog-outline":"mdi:chart-box-outline";s.modalTitle.replaceChildren(D(a),e==="room"?i.name:this.t(e)),e==="room"&&this.buildDevices(i),e==="settings"&&this.paintSettings(),e==="activity"&&this.paintActivity(),s.modal.open||s.modal.showModal();let l=s.modal.getBoundingClientRect(),c=(d,p)=>Math.max(0,Math.min(p,d))+"px";s.modal.style.setProperty("--motion-x",c(r.left+r.width/2-l.left,l.width)),s.modal.style.setProperty("--motion-y",c(r.top+r.height/2-l.top,l.height)),s.close.focus({preventScroll:!0}),s.modalBody.scrollTop=i&&this.roomScroll.get(i.id)||0;let m=this.deviceViews.get(o)?.item;m&&(s.modalBody.scrollTop+=m.getBoundingClientRect().top-s.modalBody.getBoundingClientRect().top-12),this.update()}closePanel(){let e=this.nodes;if(e.modal.open)return;this.panel?.room&&this.roomScroll.set(this.panel.room.id,e.modalBody.scrollTop),this.panel=null,this.deviceViews.clear(),clearInterval(this.ticker),this.ticker=0,this.update();let t=this.restoreFocus;this.restoreFocus=null,t?.isConnected&&t.focus({preventScroll:!0})}buildDevices(e){let t=this.nodes.content;t.className="devices",t.replaceChildren(),e.entities.length||t.append(_("p","empty",this.t("empty_room")));for(let i of e.entities){let o=_("section","device");o.dataset.entity=i.entity;let s=_("header","device-head"),r=D(i.icon||"mdi:information-outline");r.className="device-icon";let a=_("div","device-detail"),l=_("h3","device-name"),c=_("span","current");a.append(l,c);let m=O("round-action",this.t("more_info"),"mdi:information-outline",!0);m.onclick=()=>this.moreInfo(i),s.append(r,a,m);let d=_("div","action-list");o.append(s,d),t.append(o),this.deviceViews.set(i.entity,{config:i,item:o,glyph:r,name:l,state:c,more:m,group:d,fields:[]})}this.updateDevices()}moreInfo(e){this.model(e).actions.more_info&&(this.nodes.modal.open&&(this.restoreFocus=null,this.nodes.modal.close()),this.dispatchEvent(new CustomEvent("hass-more-info",{detail:{entityId:e.entity},bubbles:!0,composed:!0})))}timerLabel(e){if(!e||["idle","unavailable"].includes(e.state))return"";if(e.remainingMs===null)return this.t(e.state);let t=Math.max(0,Math.ceil(e.remainingMs/1e3));return this.t("timed")+" · "+Q(Math.floor(t/60)+":"+String(t%60).padStart(2,"0"))}updateDevices(){let e=!1;for(let t of this.deviceViews.values()){let i=this.model(t.config);k(t.name,i.name),he(t.glyph,i.icon);let o=this.timerLabel(i.timer);i.timer?.state==="active"&&(e=!0),k(t.state,this.stateLabel(i)+(o?" · "+o:"")),t.state.dataset.tone=this.tone(i),t.more.hidden=!i.actions.more_info;let s=JSON.stringify(Me.map(a=>i.actions[a]||null));s!==t.signature&&(t.signature=s,this.buildActions(t,i));let r=this.pending.has(t.config.entity);t.item.setAttribute("aria-busy",String(r));for(let a of t.group.querySelectorAll("button,input,select"))a.disabled=!this.canRequest(t.config.entity,a.dataset.action);for(let a of t.fields)this.syncField(a,i)}e&&!this.ticker&&this.isConnected&&(this.ticker=setInterval(()=>this.updateDevices(),1e3)),!e&&this.ticker&&(clearInterval(this.ticker),this.ticker=0)}paintSettings(){let e=this.nodes.content;e.className="settings",e.replaceChildren();for(let[t,i]of Object.entries(H)){let o=_("fieldset","prefs-group");o.append(_("legend","",this.t(t)));let s=_("div","prefs-options");for(let r of i){let a=O("control-button",this.t(r));if(t==="background"){let l=_("span","swatch");l.style.background=rt[r],l.setAttribute("aria-hidden","true"),a.prepend(l)}a.value=r,a.dataset.preference=t,a.onclick=()=>this.setPreference(t,r),s.append(a)}o.append(s),e.append(o)}this.applyPreferences()}paintActivity(){let e=[...(this.activeDevices||new Map).values()],t=JSON.stringify(e.map(({model:s,room:r})=>[s.entity,s.name,this.stateLabel(s),r.id]));if(t===this.activitySignature)return;this.activitySignature=t;let i=this.nodes.content;i.className="";let o=_("ul","activity-list");for(let{model:s,room:r,config:a}of e){let l=_("li"),c=O("control-button");c.append(_("span","",s.name+" · "+r.name),_("span","",this.stateLabel(s))),c.onclick=()=>this.openPanel("room",c,r,a.entity),l.append(c),o.append(l)}i.replaceChildren(e.length?o:_("p","empty",this.t("quiet")))}actionLabel(e){return this.t(e==="close"?"close_device":e)}buildActions(e,t){let i=this.shadowRoot.activeElement,o=i&&e.group.contains(i)?i.dataset.action:void 0;e.fields=[];let s=_("div","basic-actions"),r=[];for(let a of Me){let l=t.actions[a];if(!l)continue;if(Oe.has(a)||l.options||typeof l.min=="number"||["set_temperature_range","start_timed"].includes(a)){r.push(this.buildField(e,l,a,t));continue}let c=O("control-button",this.actionLabel(a),ct[a]);c.dataset.action=a,c.onclick=()=>this.requestAction(e.config,a,void 0,c),s.append(c)}e.group.replaceChildren(...s.childElementCount?[s]:[],...r),o&&([...e.group.querySelectorAll("[data-action]")].find(l=>l.dataset.action===o)||e.more).focus({preventScroll:!0})}numberInput(e,t){let i=_("input");i.type=t;for(let o of["min","max","step"])typeof e[o]=="number"&&(i[o]=String(e[o]));return t==="number"&&e.step==null&&(i.step="any"),i}buildField(e,t,i,o){let s=_("div","field-row"),r=i==="start_timed"?this.t("duration"):this.actionLabel(i),a=_("label","",r),l=Oe.has(i),c={action:t,id:i};if(t.options){c.input=_("select");for(let p of t.options){let f=_("option","",this.t(p));f.value=p,c.input.append(f)}}else c.input=this.numberInput(t,l?"range":"number");c.input.dataset.action=i,a.append(c.input),i==="set_temperature_range"&&(c.input.setAttribute("aria-label",r+" · "+this.t("min")),c.second=this.numberInput(t,"number"),c.second.dataset.action=i,c.second.setAttribute("aria-label",r+" · "+this.t("max")),a.append(c.second)),l&&(c.output=_("output","duration-label"),a.append(c.output));let m=()=>{c.dirty=!0,c.output&&k(c.output,c.input.value+"%")};c.input.addEventListener("input",m),c.second?.addEventListener("input",m);let d=O("control-button",i==="start_timed"?this.actionLabel(i):this.t("apply"));return d.dataset.action=i,R(d,i==="start_timed"?this.actionLabel(i):this.t("apply")+" · "+r),d.onclick=()=>{let p=c.input.localName==="select"?c.input.value:c.input.valueAsNumber,f=c.second?{low:c.input.valueAsNumber,high:c.second.valueAsNumber}:p;this.requestAction(e.config,i,f,d)},e.fields.push(c),this.syncField(c,o),s.append(a,d),s}syncField(e,t){let{id:i,input:o,second:s,action:r}=e,a=this.shadowRoot.activeElement;if(e.dirty||a===o||s&&a===s)return;let l=t.attributes;if(s)o.value=String(l.target_temp_low??r.min??18),s.value=String(l.target_temp_high??r.max??25);else if(i==="set_hvac_mode")o.value=t.state;else if(i==="start_timed")o.value=String(r.min??15);else if(i==="set_brightness"){let c=Z(l.brightness);o.value=String(c===null?r.min??0:Math.round(c/255*100))}else o.localName==="select"?o.value=l[Re[i]]??o.options[0]?.value??"":o.value=String(Z(l[Re[i]])??r.min??0);o.localName==="select"&&o.selectedIndex===-1&&(o.selectedIndex=0),e.output&&k(e.output,o.value+"%")}canRequest(e,t){let i=this.pending.get(e);return!i||t==="stop"&&dt.has(i.id)}requestAction(e,t,i,o){if(!this.canRequest(e.entity,t))return;let s=this.model(e),r=s.actions[t];if(!r)return;if(r.requiresCode)return this.moreInfo(e);if(!r.requiresConfirmation)return this.send(e,t,i);this.confirming={config:e,id:t,value:i,source:o};let a=this.nodes;k(a.confirmText,this.t("confirm_action").replace("{name}",s.name).replace("{action}",this.actionLabel(t))),a.confirm.open||a.confirm.showModal(),a.abort.focus({preventScroll:!0})}acceptAction(){let e=this.confirming;if(!(!e||!this.nodes.confirm.open))return this.nodes.confirm.close(),this.send(e.config,e.id,e.value,!0)}async send(e,t,i,o=!1){if(!this.canRequest(e.entity,t))return;let s=this.model(e);if(!s.actions[t])return;let r={id:t};this.pending.set(e.entity,r),this.announce(this.t("sending").replace("{name}",s.name)),this.update();try{let a=await this.controller.execute(e,t,i,{confirmed:o});if(this.pending.get(e.entity)!==r)return;let l=["confirmed","sent","unconfirmed"].includes(a?.status)?a.status:"sent";if(this.announce(this.t(l).replace("{name}",s.name)),a?.status==="confirmed")for(let c of this.deviceViews.get(e.entity)?.fields||[])c.id===t&&(c.dirty=!1)}catch{this.pending.get(e.entity)===r&&this.announce(this.t("send_error"))}finally{this.pending.get(e.entity)===r&&(this.pending.delete(e.entity),this.isConnected&&this.update())}}announce(e){if(!this.isConnected)return;clearTimeout(this.noticeTimer);let t=this.nodes;k(t.pageNotice,""),k(t.modalNotice,"");let i=t.modal.open?t.modalNotice:t.pageNotice;k(i,e),this.noticeTimer=setTimeout(()=>k(i,""),5200)}};customElements.get("bayit-dashboard")||(customElements.define("bayit-dashboard",fe),window.customCards||=[],window.customCards.push({type:"bayit-dashboard",name:"Bayit 9",description:"A room-based Home Assistant dashboard.",preview:!1}));var ht={en:{title:"Dashboard title",language:"Language",automatic:"Home Assistant language",areas:"Rooms",anyArea:"All rooms",unassigned:"Include devices without a room",appearance:"Appearance",background:"Wallpaper",layout:"Room titles",shape:"Button shape",classic:"Alongside the controls",header:"At the top",soft:"Rounded",circle:"Circle",square:"Square",devices:"Device visibility",hidden:"Hide devices",included:"Add other entities",shortcuts:"Room shortcuts",shortcutRoom:"Room",automaticShortcuts:"Choose shortcuts automatically",shortcut:"Shortcut",shortcutHint:"Pick up to six devices in display order. All devices remain available inside the room.",noShortcutRooms:"Add a device to a visible room to set its shortcuts.",profiles:"Boiler and heater controls",entity:"Heating device",kind:"Control profile",heater:"Room heater",boiler:"Water heater or boiler",displayName:"Display name",start:"Scheduled start script",stop:"Stop script",timer:"Timer",none:"None",durationField:"Duration field",min:"Shortest run in minutes",max:"Longest run in minutes",step:"Step in minutes",add:"Add profile",save:"Save profile",edit:"Edit",remove:"Remove",clear:"Cancel",choose:"Select a device",invalid:"Select a heating device to save the profile.",hint:"Select the Home Assistant entities that already control this device. Use a server-side start script for timed heating.",units:"minutes",searchable:"Filter entities"},he:{title:"שם הדשבורד",language:"שפה",automatic:"שפת Home Assistant",areas:"חדרים",anyArea:"כל החדרים",unassigned:"הצגת מכשירים ללא חדר",appearance:"מראה",background:"רקע",layout:"שמות חדרים",shape:"צורת כפתורים",classic:"לצד הכפתורים",header:"בראש הכרטיס",soft:"מעוגל",circle:"עיגול",square:"ריבוע",devices:"הצגת מכשירים",hidden:"הסתרת מכשירים",included:"הוספת ישויות נוספות",shortcuts:"קיצורים בחדרים",shortcutRoom:"חדר",automaticShortcuts:"בחירת קיצורים אוטומטית",shortcut:"קיצור",shortcutHint:"אפשר לבחור עד שישה מכשירים לפי סדר התצוגה. כל המכשירים נשארים זמינים בתוך החדר.",noShortcutRooms:"הוסיפו מכשיר לחדר שמוצג בדשבורד כדי לבחור קיצורים.",profiles:"שליטה בדוד ובתנורים",entity:"מכשיר חימום",kind:"סוג בקר",heater:"תנור חימום",boiler:"דוד או מחמם מים",displayName:"שם לתצוגה",start:"סקריפט הפעלה עם זמן",stop:"סקריפט כיבוי",timer:"טיימר",none:"ללא",durationField:"שדה משך",min:"זמן מינימלי בדקות",max:"זמן מקסימלי בדקות",step:"מרווח בחירה בדקות",add:"הוספת בקר",save:"שמירת בקר",edit:"עריכה",remove:"הסרה",clear:"ביטול",choose:"בחירת מכשיר",invalid:"בחרו מכשיר חימום לפני השמירה.",hint:"בחרו את הישויות שכבר שולטות במכשיר ב־Home Assistant. לחימום מתוזמן, השתמשו בסקריפט שפועל בשרת.",units:"דקות",searchable:"סינון ישויות"}},ft=":host { display: block; color: var(--primary-text-color); }form { display: grid; gap: 14px; padding-block: 8px; }label.field { display: grid; gap: 6px; min-width: 0; font-weight: 600; }input:not([type=checkbox]),select { width: 100%; box-sizing: border-box; min-height: 44px; border: 1px solid var(--divider-color,#999); border-radius: 8px; padding: 8px 10px; font: inherit; color: inherit; background: var(--card-background-color,#fff); }input[type=checkbox] { inline-size: 18px; block-size: 18px; flex: none; margin-inline: 0 9px; }input,select,button,summary { accent-color: var(--primary-color,#03a9f4); }select[multiple] { min-height: 106px; }label.check { min-block-size: 42px; display: flex; align-items: center; }details,fieldset { border: 1px solid var(--divider-color,#999); border-radius: 10px; padding: 8px 12px 12px; min-inline-size: 0; }summary { padding-block: 8px; min-block-size: 24px; font-weight: 650; cursor: pointer; }.stack { display: grid; gap: 12px; margin-block-start: 8px; }.grid { display: grid; gap: 10px; grid-template-columns: repeat(2,minmax(0,1fr)); }.actions,.record { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }.record { padding-block: 5px; border-block-end: 1px solid var(--divider-color,#999); }.record span { flex: 1; overflow-wrap: anywhere; }button { min-height: 42px; border-radius: 8px; border: 1px solid var(--primary-color,#0277bd); color: var(--primary-text-color); background: var(--card-background-color,#fff); cursor: pointer; padding: 6px 10px; font: inherit; }[hidden] { display: none !important; }p { margin: 0; color: var(--secondary-text-color); font-size: .95em; }.error { color: var(--error-color,#b00020); }:focus-visible { outline: 2px solid var(--primary-color,#03a9f4); outline-offset: 2px; }@media (max-width: 340px) { .grid { grid-template-columns: minmax(0,1fr); } }";function y(n,e={},t=[]){let i=Object.assign(document.createElement(n),e);return i.append(...t),i}function ge(n,e,t){let i=y("input",{type:"checkbox",checked:e});return i.addEventListener("change",()=>t(i.checked)),y("label",{className:"check"},[i,n])}function Ie(n,e){return y("option",{value:n,textContent:e})}function M(n,e){let t=y("select",{},n.map(([i,o])=>Ie(i,o)));return t.value=e,t}var gt=0;function A(n,e){let t=y("span",{id:"bayit9-editor-label-"+ ++gt,textContent:n});return e.setAttribute("aria-labelledby",t.id),y("label",{className:"field"},[t,e])}function U(n,e){let t=y("button",{type:"button",textContent:n});return t.addEventListener("click",e),t}function be(n,e){return Object.entries(n.states??{}).filter(([t])=>!e||e.has(t.split(".")[0])).map(([t,i])=>{let o=i.attributes?.friendly_name;return[t,o&&o!==t?o+" · "+t:t]}).sort((t,i)=>t[1].localeCompare(i[1]))}function V(n,e,t,i){let o=y("details",{open:e},[y("summary",{textContent:n}),...i]);return o.addEventListener("toggle",()=>t(o.open)),o}var ee=class extends HTMLElement{#t={};#e={type:"custom:"+T};#i={};#o;#r;#s;constructor(){super(),this.attachShadow({mode:"open"})}set hass(e){let t=this.#t;this.#t=e??{},(t.areas!==this.#t.areas||t.entities!==this.#t.entities||!this.#t.entities&&!Object.keys(t.states??{}).length&&Object.keys(this.#t.states??{}).length||(t.locale?.language??t.language)!==(e?.locale?.language??e?.language))&&this.render()}setConfig(e){this.#e={type:"custom:"+T,...e};let t=JSON.stringify(this.#e);t!==this.#s&&(this.#s=t,this.render())}connectedCallback(){this.render()}#n(e){this.#e={...this.#e,...e},this.#s=JSON.stringify(this.#e),this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:this.#e},bubbles:!0,composed:!0}))}#a(e,t,i){let o=be(this.#t),s=y("input",{type:"search",placeholder:i.searchable}),r=y("select",{multiple:!0,size:4});s.setAttribute("aria-label",i.searchable+" · "+e);let a=()=>{let l=s.value.trim().toLocaleLowerCase(),c=new Set(this.#e[t]??[]);r.replaceChildren(...o.filter(m=>c.has(m[0])||!l||m[1].toLocaleLowerCase().includes(l)).map(([m,d])=>y("option",{value:m,textContent:d,selected:c.has(m)})))};return s.addEventListener("input",a),r.addEventListener("change",()=>this.#n({[t]:[...r.selectedOptions].map(l=>l.value)})),a(),y("div",{className:"stack"},[s,A(e,r)])}#c(e,t){let i=me(this.#e,this.#t,t);if(!i.length)return[y("p",{textContent:e.noShortcutRooms})];let o=i.find(u=>u.id===this.#r)??i[0],s=this.#e.room_shortcuts??{},r=Object.hasOwn(s,o.id)&&Array.isArray(s[o.id])?s[o.id]:null,a=M(i.map(u=>[u.id,u.name]),o.id),l=new Map(o.entities.map(u=>[u.entity,u.name||u.entity]));for(let u of r??[])typeof u=="string"&&!l.has(u)&&l.set(u,u);let c=Array.from({length:j},(u,h)=>{let v=r?.[h]??"";return M([["",e.none],...l],v)}),m=y("div",{className:"grid",hidden:r==null},c.map((u,h)=>A(e.shortcut+" "+(h+1),u))),d=()=>{let u=new Set(c.map(h=>h.value).filter(Boolean));for(let h of c)for(let v of h.options)v.disabled=v.value!==h.value&&u.has(v.value)},p=()=>{this.#n({room_shortcuts:{...this.#e.room_shortcuts,[o.id]:c.map(u=>u.value).filter(Boolean)}})};d();for(let u of c)u.addEventListener("change",()=>{d(),p()});a.addEventListener("change",()=>{this.#r=a.value,this.render()});let f=ge(e.automaticShortcuts,r==null,u=>{if(m.hidden=u,u){let h={...this.#e.room_shortcuts};delete h[o.id],this.#n({room_shortcuts:h})}else p()});return[y("p",{textContent:e.shortcutHint}),A(e.shortcutRoom,a),f,m]}#l(e){let t=Array.isArray(this.#e.profiles)?this.#e.profiles:[],i=[y("p",{textContent:e.hint})];for(let x of t)x?.entity&&i.push(y("div",{className:"record"},[y("span",{textContent:x.name||this.#t.states?.[x.entity]?.attributes?.friendly_name||x.entity}),U(e.edit,()=>{this.#o=x,this.render()}),U(e.remove,()=>{this.#o?.entity===x.entity&&(this.#o=void 0),this.#n({profiles:t.filter(w=>w.entity!==x.entity)}),this.render()})]));if(this.#o==null)return i.push(y("div",{className:"actions"},[U(e.add,()=>{this.#o={},this.render()})])),i;let o=this.#o,s=o.timed??{},r=M([["",e.choose],...be(this.#t,new Set(de))],o.entity||"");o.entity&&!r.value&&(r.append(Ie(o.entity,o.entity)),r.value=o.entity);let a=M([["heater",e.heater],["boiler",e.boiler]],o.kind||"heater"),l=y("input",{value:o.name??"",maxLength:80}),c=(x,w)=>{let q=be(this.#t,new Set([x]));return w&&!q.some(([C])=>C===w)&&q.unshift([w,w]),M([["",e.none],...q],w||"")},m=c("script",s.start_script),d=c("script",s.stop_script),p=c("timer",s.timer_entity),f=y("input",{value:s.duration_field||"duration",maxLength:40}),u=x=>y("input",{type:"number",min:"1",max:"360",value:String(x)}),h=u(s.min_minutes??15),v=u(s.max_minutes??60),g=u(s.step_minutes??15),b=y("p",{className:"error",hidden:!0,textContent:e.invalid});return b.setAttribute("role","alert"),i.push(A(e.entity,r),A(e.kind,a),A(e.displayName,l),A(e.start,m),A(e.stop,d),A(e.timer,p),A(e.durationField,f),y("div",{className:"grid"},[A(e.min,h),A(e.max,v),A(e.step,g)]),b,y("div",{className:"actions"},[U(e.save,()=>{let x=pe({entity:r.value,kind:a.value,name:l.value,timed:{start_script:m.value,stop_script:d.value,timer_entity:p.value,duration_field:f.value,min_minutes:h.valueAsNumber,max_minutes:v.valueAsNumber,step_minutes:g.valueAsNumber}});if(!x){b.hidden=!1,r.focus();return}this.#o=void 0,this.#n({profiles:[...t.filter(w=>w.entity!==o.entity&&w.entity!==x.entity),x]}),this.render()}),U(e.clear,()=>{this.#o=void 0,this.render()})])),i}render(){if(!this.isConnected)return;let e=X(this.#e.locale,this.#t),t=ht[e],i=y("input",{value:this.#e.title??"",maxLength:80});i.addEventListener("change",()=>this.#n({title:i.value.trim()}));let o=M([["auto",t.automatic],["en","English"],["he","עברית"]],this.#e.locale??"auto");o.addEventListener("change",()=>{this.#n({locale:o.value}),this.render()});let s=(d,p,f,u)=>{let h=M(f,this.#e[p]??u);return h.addEventListener("change",()=>this.#n({[p]:h.value})),A(d,h)},r=Object.entries(le).map(([d,p])=>[d,p[e]]),a=Object.entries(this.#t.areas??{}).map(([d,p])=>({id:p.area_id??d,name:p.name??d})).sort((d,p)=>d.name.localeCompare(p.name,e)),l=new Set(this.#e.area_ids??[]),c=a.map(d=>ge(d.name,l.has(d.id),p=>{p?l.add(d.id):l.delete(d.id),this.#n({area_ids:[...l]})}));c.unshift(y("p",{textContent:t.anyArea+(e==="he"?" כשלא נבחר חדר":" when none are selected")}));let m=y("form",{dir:e==="he"?"rtl":"ltr"},[A(t.title,i),A(t.language,o),ge(t.unassigned,this.#e.show_unassigned!==!1,d=>this.#n({show_unassigned:d})),V(t.areas,this.#i.rooms,d=>{this.#i.rooms=d},c),V(t.appearance,this.#i.appearance,d=>{this.#i.appearance=d},[y("div",{className:"stack"},[s(t.background,"background",r,"aurora"),s(t.layout,"layout",[["classic",t.classic],["header",t.header]],"classic"),s(t.shape,"shape",[["soft",t.soft],["circle",t.circle],["square",t.square]],"soft")])]),V(t.devices,this.#i.devices,d=>{this.#i.devices=d},[this.#a(t.hidden,"hidden_entities",t),this.#a(t.included,"included_entities",t)]),V(t.shortcuts,this.#i.shortcuts,d=>{this.#i.shortcuts=d},[y("div",{className:"stack"},this.#c(t,e))]),V(t.profiles,this.#i.profiles,d=>{this.#i.profiles=d},[y("div",{className:"stack"},this.#l(t))])]);m.addEventListener("submit",d=>d.preventDefault()),this.shadowRoot.replaceChildren(y("style",{textContent:ft}),m)}};var Pe="ll-strategy-dashboard-"+T,ye="bayit-9-strategy-editor",_e=class extends HTMLElement{static registryDependencies=["areas","devices","entities"];static generate(e,t){return Te(e,t)}static getCreateSuggestions(e){return qe(e)}static getConfigElement(){return document.createElement(ye)}};function Fe(){customElements.get(Pe)||customElements.define(Pe,_e),customElements.get(ye)||customElements.define(ye,ee),window.customStrategies??=[],window.customStrategies.some(n=>n.type===T&&n.strategyType==="dashboard")||window.customStrategies.push({type:T,strategyType:"dashboard",name:"Bayit 9",description:"A room-based Liquid Glass dashboard for Home Assistant.",documentationURL:"https://github.com/yahavzarfati/bayit-9"})}Fe();
