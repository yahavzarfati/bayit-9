import { normalizeSharedWallpaperPath, normalizeSharedWallpapers } from './shared-wallpapers.js';
import {
  BACKGROUNDS, classicRoomTitle, CUSTOM_ROOM_PREFIX, dashboardRoomMemberships, dashboardRoomOptions, DEVICE_ICONS, discoverRooms,
  isVisibleEntity, languageFor, MAX_ROOM_SHORTCUTS, normalizeProfile,
  normalizeClimatePresetShortcut, normalizeRoomControlName, normalizeRoomIcon, normalizeShortcutDetailEntities, normalizeShortcutDetailRoutes,
  normalizeRoomVacuumSummary, normalizeUnreportedSwingMode,
  PROFILE_DOMAINS, ROOM_PANEL_KINDS, roomLightTilePlacement, roomPanelOptions, roomSections, roomShortcutDevices, roomVacuumPresentation, ROOM_VACUUM_SUMMARY_DOMAINS,
  selectableRoomEntities, selectedRoomIds,
  shortcutPanelOptions, STRATEGY_NAME, supportsNativeShortcutDetails, supportsShortcutWithoutDetails,
  supportsRoomTemperatureSource, usesAutomaticRoomDevices,
} from './strategy-model.js';
import { languages } from './bayit-dashboard-i18n.js';
import { climateOptionLabel } from './panel-controls.js';
import { buildToolbarEditor } from './toolbar-editor.js';
import { activityKinds, activitySources, normalizeRoomActivities } from './room-appliance.mjs';
import { getDeviceModel, supportsRoomShutdown } from './device-control.mjs';
import { normalizeLightEffectGroups } from './light-effects.js';

const WORDS = {
  en: {
    lightEffects: 'Light effect categories', effectLight: 'Light', effectGroup: 'Category',
    newEffectGroup: 'New category', effectGroupName: 'Category name', addEffectGroup: 'Add category',
    removeEffectGroup: 'Delete category', availableEffect: 'Available effect', chooseEffect: 'Select an effect',
    addEffect: 'Add effect', removeEffect: 'Remove effect',
    unavailableEffect: 'Currently unavailable', noEffectLights: 'No visible lights currently report effects.',
    noEffectOptions: 'This light is not reporting effects right now. Saved categories are kept.',
    title: 'Dashboard title', language: 'Language', automatic: 'Home Assistant language',
    areas: 'Rooms', unassigned: 'Include devices without a room',
    roomSelection: 'Rooms on the dashboard', allRooms: 'Automatic', selectedRooms: 'Choose rooms and order',
    roomToAdd: 'Available rooms', addRoom: 'Show room', createRoom: 'New dashboard-only room',
    newRoomName: 'New room name', newRoomHint: 'This room exists only on this dashboard.',
    roomName: 'Room display name', roomToEdit: 'Room to customize', roomIcon: 'Room icon', defaultRoomIcon: 'Default icon',
    roomTitleBreak: 'Room name line break in classic layout', roomTitleAuto: 'Wrap automatically',
    roomControlDisplay: 'Device display', roomControlDevice: 'Device to customize', roomControlName: 'Name in this room',
    roomControlShow: 'Show name in this room', roomDeviceIcon: 'Icon in this room', roomDeviceIconDefault: 'Use default icon',
    roomInlineLight: 'Show brightness and temperature in this room',
    roomNativeCoverHeader: 'Open Home Assistant details from the cover header',
    roomNativeLightHold: 'Open Home Assistant details with a long press on this light',
    climatePresetShortcut: 'Preset shortcut', climatePresetNone: 'No shortcut', climatePresetLabel: 'Shortcut label',
    climatePresetIcon: 'Shortcut icon', climatePresetHighlight: 'Highlight when this preset is reported',
    climatePresetHighlightDefault: 'When the shortcut preset is active', climatePresetUnavailable: 'Unavailable preset',
    roomPanelShow: 'Show device in room panel', roomPanelHint: 'For quick access from Home, add the device in Room shortcuts.',
    lightCount: 'Lights in the room count', lightCountHint: 'With no lights selected, the count includes every room light.',
    lightCountReset: 'Use automatic lighting count',
    roomShutdown: 'Devices turned off by the room icon',
    roomShutdownHint: 'Select the devices to turn off when you tap the room icon. Leave the list empty to open the room from the icon.',
    roomShutdownReset: 'Remove room icon action',
    newRoom: 'Create room', customRoom: 'Dashboard room', deleteRoom: 'Delete dashboard room',
    noRooms: 'No rooms to customize yet.',
    moveUp: 'Move up', moveDown: 'Move down', hideRoom: 'Hide room',
    automaticDevices: 'Automatic', manualDevices: 'Choose devices and order',
    roomDevices: 'Devices in this room', deviceToAdd: 'Available devices', addDevice: 'Add device',
    roomDeviceSearch: 'Find a device to add',
    roomDeviceMove: 'After saving, the device will move from {room} to this room on the dashboard.',
    roomDeviceKeep: 'After saving, the device will also appear here and stay in {rooms}.',
    roomDeviceEmpty: 'The previous room will be hidden while empty.',
    readOnlyRoom: 'Show status only for selected room devices',
    applianceBadges: 'Appliance activity badges', applianceKind: 'Appliance', saveAppliance: 'Save badge', removeAppliance: 'Remove badge',
    applianceMissing: 'Choose the required sources to save this badge.',
    applianceFields: { operation_entity: 'Operating state', finish_entity: 'Expected finish time',
      power_entity: 'Power state', done_entity: 'Completion sensor', progress_entity: 'Progress (%)',
      boiler_entity: 'Boiler in this room', started_at_entity: 'Boiler start date and time helper' },
    roomMediaLink: 'Open on media press and hold', roomMediaNone: 'No panel', roomMediaDefault: 'Media',
    roomTemperatureSource: 'Temperature on home card', roomTemperatureAuto: 'Automatic',
    roomTemperatureFallback: 'Fallback room temperature', roomTemperatureNoFallback: 'None',
    roomVacuumLink: 'Vacuum panel', roomVacuumDefault: 'Robot vacuum',
    roomVacuumGesture: 'Open the vacuum panel with', roomVacuumTap: 'Tap', roomVacuumHold: 'Press and hold',
    roomVacuumDisplay: 'Vacuum controls in the room', roomVacuumAll: 'All available controls',
    roomVacuumCleaning: 'Cleaning controls', roomVacuumTile: 'Status tile',
    roomVacuumSummary: 'Vacuum status readings', roomVacuumNoReading: 'None',
    roomVacuumReadings: {status_entity:'Status sensor', battery_entity:'Battery sensor',
      progress_entity:'Progress sensor', cleaning_entity:'Cleaning indicator'},
    sections: 'Room sections', sectionMode: 'Section arrangement', automaticSections: 'Automatic grouping',
    manualSections: 'Arrange sections manually',
    editSection: 'Section to customize', addSection: 'Add section', removeSection: 'Delete section',
    sectionType: 'Section type', sectionTitle: 'Section heading', sectionDevice: 'Room device',
    addToSection: 'Move to this section', removeFromSection: 'Remove from section', sectionEmpty: 'No devices in this section.',
    noDevices: 'No devices selected.', noMatches: 'No matching devices', missing: 'Unavailable',
    discovery: 'Automatic device selection', controls: 'Controls only', allDevices: 'All supported devices',
    appearance: 'Appearance', background: 'Wallpaper', layout: 'Room titles', shape: 'Button shape',
    sharedWallpaper: 'Shared photos', sharedWallpaperItem: 'Shared wallpaper', newWallpaper: 'New photo',
    wallpaperName: 'Photo name', wallpaperPath: 'Local image path', wallpaperPreview: 'Local thumbnail path (optional)',
    wallpaperHint: 'Use a photo served by this Home Assistant under /local/.',
    addWallpaper: 'Add photo', updateWallpaper: 'Update photo', removeWallpaper: 'Remove photo',
    invalidWallpaperPath: 'Enter a local JPG, PNG, WebP, or AVIF path starting with /local/.',
    toolbar: 'Toolbar and extra screens', fullscreen: 'Hide Home Assistant chrome on this dashboard',
    boilerTimerWithDetails: 'Show the boiler timer with schedule or history',
    scheduleSave: 'Boiler schedule save script (optional)', scheduleDelete: 'Boiler schedule delete script (optional)',
    classic: 'Alongside the controls', header: 'At the top', soft: 'Rounded', circle: 'Circle', square: 'Square',
    devices: 'Device visibility', hidden: 'Hide devices', included: 'Add other entities',
    overview: 'Home overview', overviewDevices: 'Devices and sensors to show',
    overviewHint: 'Choose devices for the overview button, such as a lock, people, a calendar or an energy sensor.',
    shortcuts: 'Room shortcuts', shortcutRoom: 'Room', automaticShortcuts: 'Choose shortcuts automatically',
    shortcut: 'Shortcut', shortcutHint: 'Pick up to six devices in display order.',
    shortcutDetails: 'Long-press gesture', shortcutDetailsDevice: 'Open details with a long press · {name}',
    shortcutDestination: 'Long-press destination · {name}', shortcutBayitDetails: 'Device details in Bayit 9',
    shortcutNativeDetails: 'Device details in Home Assistant', shortcutPanel: 'Screen · {name}',
    noShortcutRooms: 'Add a device to a visible room to set its shortcuts.',
    profiles: 'Boiler and heater controls', entity: 'Heating device', kind: 'Control profile',
    heater: 'Room heater', boiler: 'Water heater or boiler', displayName: 'Display name',
    climate: 'Air conditioner or thermostat', swingFallback: 'Display when vertical swing is unreported', timerSource: 'Timer source', serverTimer: 'Home Assistant timer or script',
    simpleTimer: 'Simple Timer', simpleTimerDevice: 'Simple Timer sensor', simpleTimerTarget: 'Device linked to Simple Timer',
    timerLinkError: 'Choose a Simple Timer sensor linked to this heating device or its supported proxy.',
    dailyUsage: 'Daily usage sensor', allowDailyUsageReset: 'Allow reset of this daily usage counter', presets: 'Preset minutes', presetError: 'Use preset minutes within the selected range and step.',
    levelSteps: 'Number of heating levels', levelRead: 'Heating level feedback', levelSelect: 'Level selection script',
    levelSelectError: 'Set 2–12 heating levels and choose the level feedback helper for this script.',
    levelPreselect: 'Next-start level helper',
    levelPreselectHint: 'Choose a helper that the heater reads at startup and whose changes never issue device commands.',
    levelPreselectError: 'Set 2–12 heating levels and choose a Simple Timer linked to the heater switch.',
    start: 'Scheduled start script', stop: 'Stop script', timer: 'Timer', none: 'None',
    level: 'Heating level entity', durationField: 'Duration field', min: 'Shortest run in minutes', max: 'Longest run in minutes',
    step: 'Step in minutes', add: 'Add profile', save: 'Save profile', edit: 'Edit',
    remove: 'Remove', clear: 'Cancel', choose: 'Select a device',
    invalid: 'Select a heating device to save the profile.',
    hint: 'Select the Home Assistant entities that already control this device. Use a server-side start script for timed heating.',
    units: 'minutes', searchable: 'Filter entities',
  },
  he: {
    lightEffects: 'קטגוריות אפקטים לתאורה', effectLight: 'תאורה', effectGroup: 'קטגוריה',
    newEffectGroup: 'קטגוריה חדשה', effectGroupName: 'שם קטגוריה', addEffectGroup: 'הוספת קטגוריה',
    removeEffectGroup: 'מחיקת קטגוריה', availableEffect: 'אפקט זמין', chooseEffect: 'בחירת אפקט',
    addEffect: 'הוספת אפקט', removeEffect: 'הסרת אפקט',
    unavailableEffect: 'לא זמין כרגע', noEffectLights: 'אין כרגע מנורות מוצגות שמדווחות על אפקטים.',
    noEffectOptions: 'המנורה אינה מדווחת כרגע על אפקטים. הקטגוריות הקיימות נשמרות.',
    title: 'שם הדשבורד', language: 'שפה', automatic: 'שפת Home Assistant',
    areas: 'חדרים', unassigned: 'הצגת מכשירים ללא חדר',
    roomSelection: 'חדרים בדשבורד', allRooms: 'בחירה אוטומטית', selectedRooms: 'בחירת חדרים וסדר',
    roomToAdd: 'חדרים זמינים', addRoom: 'הצגת חדר', createRoom: 'חדר חדש לדשבורד',
    newRoomName: 'שם החדר החדש', newRoomHint: 'החדר יופיע בדשבורד הזה בלבד.',
    roomName: 'שם החדר לתצוגה', roomToEdit: 'חדר להתאמה אישית', roomIcon: 'סמל החדר', defaultRoomIcon: 'סמל ברירת המחדל',
    roomTitleBreak: 'חלוקת שם החדר לשורות בפריסה הקלאסית', roomTitleAuto: 'גלישה לפי רוחב הכרטיס',
    roomControlDisplay: 'תצוגת מכשירים', roomControlDevice: 'מכשיר להתאמה אישית', roomControlName: 'שם המכשיר בחדר הזה',
    roomControlShow: 'הצגת שם המכשיר בחדר הזה', roomDeviceIcon: 'סמל המכשיר בחדר הזה', roomDeviceIconDefault: 'שימוש בסמל ברירת המחדל',
    roomInlineLight: 'הצגת בהירות וגוון אור בתוך החדר',
    roomNativeCoverHeader: 'פתיחת פרטי Home Assistant מכותרת התריס',
    roomNativeLightHold: 'פתיחת פרטי Home Assistant בלחיצה ארוכה על התאורה',
    climatePresetShortcut: 'קיצור לתוכנית מזגן', climatePresetNone: 'ללא קיצור', climatePresetLabel: 'שם הקיצור',
    climatePresetIcon: 'סמל הקיצור', climatePresetHighlight: 'הדגשה כשהמזגן מדווח על תוכנית זו',
    climatePresetHighlightDefault: 'כשתוכנית הקיצור פעילה', climatePresetUnavailable: 'תוכנית לא זמינה',
    roomPanelShow: 'הצגת המכשיר בחלונית החדר', roomPanelHint: 'לגישה מהירה ממסך הבית, הוסיפו את המכשיר בהגדרה קיצורים בחדרים.',
    lightCount: 'תאורה שנכללת במונה החדר', lightCountHint: 'כשלא מסומן אף פריט, המונה כולל את כל התאורה בחדר.',
    lightCountReset: 'חזרה לספירת תאורה אוטומטית',
    roomShutdown: 'מכשירים לכיבוי דרך סמל החדר',
    roomShutdownHint: 'בחרו אילו מכשירים יכבו בלחיצה על סמל החדר. כשהרשימה ריקה, לחיצה על הסמל פותחת את החדר.',
    roomShutdownReset: 'הסרת פעולת הכיבוי מהסמל',
    newRoom: 'יצירת חדר', customRoom: 'חדר בדשבורד', deleteRoom: 'מחיקת חדר מהדשבורד',
    noRooms: 'עדיין אין חדרים להתאמה.',
    moveUp: 'העברה למעלה', moveDown: 'העברה למטה', hideRoom: 'הסתרת חדר',
    automaticDevices: 'בחירה אוטומטית', manualDevices: 'בחירת מכשירים וסדר',
    roomDevices: 'מכשירים בחדר', deviceToAdd: 'מכשירים זמינים', addDevice: 'הוספת מכשיר',
    roomDeviceSearch: 'חיפוש מכשיר להוספה',
    roomDeviceMove: 'לאחר השמירה המכשיר יעבור בדשבורד מחדר {room} לחדר הזה.',
    roomDeviceKeep: 'לאחר השמירה המכשיר יישאר ב־{rooms} ויופיע גם בחדר הזה.',
    roomDeviceEmpty: 'החדר הקודם יוסתר כל עוד הוא ריק.',
    readOnlyRoom: 'הצגת מצב בלבד למכשירים שנבחרו',
    applianceBadges: 'חיווי פעילות מכשירים', applianceKind: 'מכשיר', saveAppliance: 'שמירת חיווי', removeAppliance: 'הסרת חיווי',
    applianceMissing: 'בחרו את מקורות הנתונים הנדרשים לשמירת החיווי.',
    applianceFields: { operation_entity: 'מצב פעולה', finish_entity: 'זמן סיום צפוי',
      power_entity: 'מצב הפעלה', done_entity: 'חיישן סיום', progress_entity: 'התקדמות (%)',
      boiler_entity: 'דוד בחדר הזה', started_at_entity: 'עזר תאריך ושעת הפעלת הדוד' },
    roomMediaLink: 'פתיחה בלחיצה ארוכה על מכשיר מדיה', roomMediaNone: 'ללא חלונית', roomMediaDefault: 'מדיה',
    roomTemperatureSource: 'טמפרטורה בכרטיס הבית', roomTemperatureAuto: 'אוטומטי',
    roomTemperatureFallback: 'מקור גיבוי לטמפרטורת החדר', roomTemperatureNoFallback: 'ללא גיבוי',
    roomVacuumLink: 'חלונית השואב', roomVacuumDefault: 'שואב',
    roomVacuumGesture: 'פתיחת חלונית השואב באמצעות', roomVacuumTap: 'לחיצה', roomVacuumHold: 'לחיצה ארוכה',
    roomVacuumDisplay: 'פקדי השואב בחדר', roomVacuumAll: 'כל הפקדים הזמינים',
    roomVacuumCleaning: 'פקדי ניקוי', roomVacuumTile: 'אריח מצב',
    roomVacuumSummary: 'נתוני מצב השואב', roomVacuumNoReading: 'ללא',
    roomVacuumReadings: {status_entity:'חיישן מצב', battery_entity:'חיישן סוללה',
      progress_entity:'חיישן התקדמות', cleaning_entity:'חיווי ניקוי פעיל'},
    sections: 'קבוצות בחדר', sectionMode: 'סידור הקבוצות', automaticSections: 'קיבוץ אוטומטי',
    manualSections: 'סידור ידני של הקבוצות',
    editSection: 'קבוצה לעריכה', addSection: 'הוספת קבוצה', removeSection: 'מחיקת קבוצה',
    sectionType: 'סוג הקבוצה', sectionTitle: 'כותרת הקבוצה', sectionDevice: 'מכשיר בחדר',
    addToSection: 'העברה לקבוצה זו', removeFromSection: 'הסרה מהקבוצה', sectionEmpty: 'אין מכשירים בקבוצה זו.',
    noDevices: 'לא נבחרו מכשירים.', noMatches: 'לא נמצאו מכשירים מתאימים', missing: 'לא זמין',
    discovery: 'בחירת מכשירים אוטומטית', controls: 'מכשירים נשלטים בלבד', allDevices: 'כל המכשירים הנתמכים',
    appearance: 'מראה', background: 'רקע', layout: 'שמות חדרים', shape: 'צורת כפתורים',
    sharedWallpaper: 'תמונות משותפות', sharedWallpaperItem: 'רקע משותף', newWallpaper: 'תמונה חדשה',
    wallpaperName: 'שם התמונה', wallpaperPath: 'נתיב התמונה המקומית', wallpaperPreview: 'נתיב תמונה ממוזערת (לא חובה)',
    wallpaperHint: 'בחרו תמונה ש־Home Assistant מגיש בנתיב שמתחיל ב־‎/local/‎.',
    addWallpaper: 'הוספת תמונה', updateWallpaper: 'עדכון תמונה', removeWallpaper: 'הסרת תמונה',
    invalidWallpaperPath: 'הזינו נתיב מקומי לקובץ JPG, PNG, WebP או AVIF שמתחיל ב־‎/local/‎.',
    toolbar: 'סרגל ומסכים נוספים', fullscreen: 'הסתרת סרגל Home Assistant בדשבורד הזה',
    boilerTimerWithDetails: 'הצגת טיימר הדוד לצד התזמון או ההיסטוריה',
    scheduleSave: 'סקריפט לשמירת תזמון הדוד (אופציונלי)', scheduleDelete: 'סקריפט למחיקת תזמון הדוד (אופציונלי)',
    classic: 'לצד הכפתורים', header: 'בראש הכרטיס', soft: 'מעוגל', circle: 'עיגול', square: 'ריבוע',
    devices: 'הצגת מכשירים', hidden: 'הסתרת מכשירים', included: 'הוספת ישויות נוספות',
    overview: 'מבט על הבית', overviewDevices: 'מכשירים וחיישנים לתצוגה',
    overviewHint: 'בחרו מה יוצג במבט על הבית, למשל מנעול, אנשים, יומן או חיישן צריכת חשמל.',
    shortcuts: 'קיצורים בחדרים', shortcutRoom: 'חדר', automaticShortcuts: 'בחירת קיצורים אוטומטית',
    shortcut: 'קיצור', shortcutHint: 'אפשר לבחור עד שישה מכשירים לפי סדר התצוגה.',
    shortcutDetails: 'פעולה בלחיצה ארוכה', shortcutDetailsDevice: 'פתיחת פרטי מכשיר בלחיצה ארוכה · {name}',
    shortcutDestination: 'יעד לחיצה ארוכה · {name}', shortcutBayitDetails: 'פרטי המכשיר בבית 9',
    shortcutNativeDetails: 'פרטי המכשיר ב־Home Assistant', shortcutPanel: 'מסך · {name}',
    noShortcutRooms: 'הוסיפו מכשיר לחדר שמוצג בדשבורד כדי לבחור קיצורים.',
    profiles: 'שליטה בדוד ובתנורים', entity: 'מכשיר חימום', kind: 'סוג בקר',
    heater: 'תנור חימום', boiler: 'דוד או מחמם מים', displayName: 'שם לתצוגה',
    climate: 'מזגן או תרמוסטט', swingFallback: 'תצוגה כשאין דיווח על נדנוד אנכי', timerSource: 'מקור הטיימר', serverTimer: 'טיימר או סקריפט של Home Assistant',
    simpleTimer: 'Simple Timer', simpleTimerDevice: 'חיישן Simple Timer', simpleTimerTarget: 'המכשיר שמקושר ל־Simple Timer',
    timerLinkError: 'בחרו חיישן Simple Timer שמקושר למכשיר החימום הזה או לפקד שמפעיל אותו.',
    dailyUsage: 'חיישן שימוש יומי', allowDailyUsageReset: 'אפשרות לאפס את מונה השימוש היומי הזה', presets: 'הגדרות דקות מהירות', presetError: 'בחרו דקות בטווח ובמרווח שנקבעו.',
    levelSteps: 'מספר דרגות החימום', levelRead: 'משוב על דרגת החימום', levelSelect: 'סקריפט לבחירת עוצמה',
    levelSelectError: 'הגדירו 2–12 דרגות חימום ובחרו את העזר שמדווח על העוצמה עבור הסקריפט.',
    levelPreselect: 'עזר לעוצמה בהפעלה הבאה',
    levelPreselectHint: 'בחרו עזר שהתנור קורא בהפעלה וששינוי הערך שלו אינו שולח פקודה למכשיר.',
    levelPreselectError: 'הגדירו 2–12 דרגות חימום ובחרו Simple Timer שמקושר למתג התנור.',
    start: 'סקריפט הפעלה עם זמן', stop: 'סקריפט כיבוי', timer: 'טיימר', none: 'ללא',
    level: 'ישות עוצמת חימום', durationField: 'שדה משך', min: 'זמן מינימלי בדקות', max: 'זמן מקסימלי בדקות',
    step: 'מרווח בחירה בדקות', add: 'הוספת בקר', save: 'שמירת בקר', edit: 'עריכה',
    remove: 'הסרה', clear: 'ביטול', choose: 'בחירת מכשיר',
    invalid: 'בחרו מכשיר חימום לפני השמירה.',
    hint: 'בחרו את הישויות שכבר שולטות במכשיר ב־Home Assistant. לחימום מתוזמן, השתמשו בסקריפט שפועל בשרת.',
    units: 'דקות', searchable: 'סינון ישויות',
  },
};

const ROOM_SECTION_TYPES = ['lights', 'covers', 'climate', 'heating', 'sensors', 'devices',
  'garage', 'weather', 'security', 'media', 'vacuum', 'laundry'];

const ROOM_ICONS = {
  'mdi:home-outline': { en: 'Home', he: 'בית' },
  'mdi:sofa-outline': { en: 'Living room', he: 'סלון' },
  'mdi:stove': { en: 'Kitchen', he: 'מטבח' },
  'mdi:bed-outline': { en: 'Bedroom', he: 'חדר שינה' },
  'mdi:shower': { en: 'Bathroom', he: 'מקלחת' },
  'mdi:desk': { en: 'Office', he: 'משרד' },
  'mdi:toy-brick-outline': { en: 'Playroom', he: 'חדר משחקים' },
  'mdi:washing-machine': { en: 'Laundry', he: 'כביסה' },
  'mdi:garage-variant': { en: 'Garage', he: 'חניה' },
  'mdi:tree-outline': { en: 'Garden', he: 'גינה' },
  'mdi:floor-plan': { en: 'Hallway', he: 'מסדרון' },
  'mdi:door-open': { en: 'Entrance', he: 'כניסה' },
};

const CSS = '\
:host { display: block; color: var(--primary-text-color); }\
form { display: grid; gap: 14px; padding-block: 8px; }\
label.field { display: grid; gap: 6px; min-width: 0; font-weight: 600; }\
input:not([type=checkbox]),select,textarea { width: 100%; box-sizing: border-box; min-height: 44px; border: 1px solid var(--divider-color,#999); border-radius: 8px; padding: 8px 10px; font: inherit; color: inherit; background: var(--card-background-color,#fff); }\
input[type=checkbox] { inline-size: 18px; block-size: 18px; flex: none; margin-inline: 0 9px; }\
input,select,button,summary { accent-color: var(--primary-color,#03a9f4); }\
select[multiple] { min-height: 106px; }\
label.check { min-block-size: 42px; display: flex; align-items: center; }\
details,fieldset { border: 1px solid var(--divider-color,#999); border-radius: 10px; padding: 8px 12px 12px; min-inline-size: 0; }\
summary { padding-block: 8px; min-block-size: 24px; font-weight: 650; cursor: pointer; }\
.stack { display: grid; gap: 12px; margin-block-start: 8px; }\
.grid { display: grid; gap: 10px; grid-template-columns: repeat(2,minmax(0,1fr)); }\
.actions,.record { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }\
.record { padding-block: 5px; border-block-end: 1px solid var(--divider-color,#999); }\
.record span { flex: 1; overflow-wrap: anywhere; }\
button { min-height: 42px; border-radius: 8px; border: 1px solid var(--primary-color,#0277bd); color: var(--primary-text-color); background: var(--card-background-color,#fff); cursor: pointer; padding: 6px 10px; font: inherit; }\
[hidden] { display: none !important; }\
p { margin: 0; color: var(--secondary-text-color); font-size: .95em; }\
.error { color: var(--error-color,#b00020); }\
:focus-visible { outline: 2px solid var(--primary-color,#03a9f4); outline-offset: 2px; }\
@media (max-width: 340px) { .grid { grid-template-columns: minmax(0,1fr); } }';

const ROOM_CSS = `
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
.room-add-hint { overflow-wrap: anywhere; }
.room-add-hint:not(:empty) { margin-block-start: 6px; }
.room-choice-heading { margin: 3px 0 0; font-size: 1em; }
.room-icon-field { display: grid; grid-template-columns: minmax(0,1fr) 44px; gap: 8px; align-items: end; }
.room-icon-field ha-icon-picker {
  --ha-color-on-surface-default: var(--primary-text-color, currentColor);
  --ha-color-text-secondary: var(--secondary-text-color, currentColor);
  --ha-color-fill-primary-quiet-resting: color-mix(in srgb, var(--primary-text-color, currentColor) 16%, transparent);
  /* Web Awesome's inherited tokens are resolved against the outer Home Assistant theme. */
  --wa-form-control-value-color: var(--ha-color-on-surface-default);
  --wa-form-control-placeholder-color: var(--ha-color-text-secondary);
  --ha-color-neutral-60: var(--ha-color-text-secondary);
  --wa-color-neutral-on-normal: var(--ha-color-text-secondary);
  --wa-color-neutral-on-quiet: var(--ha-color-text-secondary);
}
.room-icon-preview { box-sizing: border-box; inline-size: 44px; block-size: 44px; display: grid; place-items: center; border: 1px solid var(--divider-color,#999); border-radius: 8px; }
.room-danger { justify-self: start; color: var(--error-color,#b00020); border-color: currentColor; }
@media (max-width: 340px) {
  .room-add { grid-template-columns: minmax(0,1fr); }
  .room-add button { justify-self: start; }
}
`;

function hasStates(states) {
  for (const id in states ?? {}) {
    if (Object.hasOwn(states, id)) return true;
  }
  return false;
}

function configuredIds(value) {
  return Array.isArray(value) ? [...new Set(value.filter(id => typeof id === 'string' && id.trim()))] : [];
}

function moveItem(items, index, shift) {
  const copy = [...items];
  const next = index + shift;
  [copy[index], copy[next]] = [copy[next], copy[index]];
  return copy;
}

function orderedList(items, change, words, removeLabel, protectLast = false, key = '') {
  return node('ul', { className: 'room-list' }, items.map((item, index) => {
    const action = (symbol, actionLabel, disabled, actionKey, handler) => {
      const control = button(symbol, handler);
      control.setAttribute('aria-label', actionLabel + ' · ' + item.name);
      control.title = actionLabel;
      control.disabled = disabled;
      control.dataset.roomFocus = key + ':' + item.id + ':' + actionKey;
      return control;
    };
    return node('li', { className: 'room-entry' }, [
      node('span', { className: 'room-entry-name' }, [
        item.name,
        ...(item.secondary ? [node('small', { textContent: item.secondary })] : []),
      ]),
      node('span', { className: 'room-entry-buttons' }, [
        action('↑', words.moveUp, index === 0, 'up', () => change(moveItem(items, index, -1), key + ':' + item.id + ':up')),
        action('↓', words.moveDown, index === items.length - 1, 'down', () => change(moveItem(items, index, 1), key + ':' + item.id + ':down')),
        action('×', removeLabel, protectLast && items.length === 1, 'remove', () =>
          change(items.filter(entry => entry.id !== item.id))),
      ]),
    ]);
  }));
}

function addPicker(label, options, actionLabel, emptyLabel, add) {
  const input = select([['', emptyLabel], ...options], '');
  const action = button(actionLabel, () => { if (input.value) add(input.value); });
  action.disabled = true;
  input.addEventListener('change', () => { action.disabled = !input.value; });
  return { input, action, wrapper: node('div', { className: 'room-add' }, [field(label, input), action]) };
}

function entityArea(hass, id) {
  const entry = hass.entities?.[id];
  const device = hass.devices?.[entry?.device_id ?? entry?.di];
  return entry?.area_id ?? entry?.ai ?? device?.area_id ?? device?.ai;
}

function node(name, properties = {}, children = []) {
  const element = Object.assign(document.createElement(name), properties);
  element.append(...children);
  return element;
}

function checkbox(text, checked, change) {
  const input = node('input', { type: 'checkbox', checked });
  input.addEventListener('change', () => change(input.checked));
  return node('label', { className: 'check' }, [input, text]);
}

function option(id, name) {
  return node('option', { value: id, textContent: name });
}

function select(opts, value) {
  const input = node('select', {}, opts.map(([id, name]) => option(id, name)));
  input.value = value;
  return input;
}

let nextLabel = 0;
function field(text, input) {
  const label = node('span', { id: 'bayit9-editor-label-' + ++nextLabel, textContent: text });
  input.setAttribute('aria-labelledby', label.id);
  return node('label', { className: 'field' }, [label, input]);
}

function button(text, click) {
  const item = node('button', { type: 'button', textContent: text });
  item.addEventListener('click', click);
  return item;
}

function entityOptions(hass, domains) {
  return Object.entries(hass.states ?? {})
    .filter(([id]) => !domains || domains.has(id.split('.')[0]))
    .map(([id, state]) => {
      const name = state.attributes?.friendly_name;
      return [id, name && name !== id ? name + ' · ' + id : id];
    })
    .sort((a, b) => a[1].localeCompare(b[1]));
}

function disclosure(text, open, onToggle, children) {
  const summary = node('summary', { textContent: text });
  const lazy = typeof children === 'function';
  let contents = lazy ? (open ? children() : undefined) : children;
  const details = node('details', { open }, [summary, ...(contents ?? [])]);
  const sync = expanded => {
    onToggle(expanded);
    if (!lazy) return;
    if (expanded && details.childNodes.length === 1) {
      contents ??= children();
      details.append(...contents);
    } else if (!expanded && contents) {
      // Keep detached controls so their in-progress values survive reopening.
      for (const child of contents) child.remove();
    }
  };
  summary.addEventListener('click', () => sync(!details.open));
  details.addEventListener('toggle', () => { if (details.isConnected) sync(details.open); });
  return details;
}

function nativeLightEffects(device, states) {
  return [...new Set(getDeviceModel(device, states).actions.set_effect?.options)];
}

export class Bayit9StrategyEditor extends HTMLElement {
  #hass = {};
  #config = { type: 'custom:' + STRATEGY_NAME };
  #open = {};
  #toolbarView = {};
  #lightEffectEntity = '';
  #lightEffectGroup = 0;
  #refreshLightEffects;
  #profileEditing;
  #profileDraftBody;
  #shortcutRoom;
  #refreshShortcutRoutes;
  #roomEditing;
  #roomControlEditing = new Map();
  #sectionEditing;
  #applianceRooms = new Map();
  #roomDeviceQuery = '';
  #newRoomName = '';
  #lastConfig;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  set hass(value) {
    const previous = this.#hass;
    this.#hass = value ?? {};
    if (previous.areas !== this.#hass.areas || previous.entities !== this.#hass.entities || previous.devices !== this.#hass.devices
        || (!hasStates(previous.states) && hasStates(this.#hass.states))
        || (previous.locale?.language ?? previous.language) !== (value?.locale?.language ?? value?.language)) {
      this.render();
    } else this.#refreshLightEffects?.();
  }

  setConfig(config) {
    this.#config = { type: 'custom:' + STRATEGY_NAME, ...config };
    const serialized = JSON.stringify(this.#config);
    if (serialized !== this.#lastConfig) {
      this.#lastConfig = serialized;
      this.render();
    }
  }

  connectedCallback() {
    this.render();
  }

  #commit(change) {
    this.#config = { ...this.#config, ...change };
    this.#lastConfig = JSON.stringify(this.#config);
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: this.#config }, bubbles: true, composed: true,
    }));
    if (Object.hasOwn(change, 'hidden_entities')) this.#refreshLightEffects?.(true);
    if (Object.hasOwn(change, 'toolbar')) this.#refreshShortcutRoutes?.();
  }

  #commitRooms(change, focusKey) {
    this.#commit(change);
    this.#renderRoomChange(focusKey);
  }

  #renderRoomChange(focusKey) {
    // Replacing the form can reset scroll in the enclosing dashboard or Home Assistant dialog.
    const scrollPositions = [];
    for (let ancestor = this; ancestor; ancestor = ancestor.parentElement ?? ancestor.getRootNode().host) {
      if (ancestor.scrollTop) scrollPositions.push([ancestor, ancestor.scrollTop]);
    }
    this.render();
    for (const [ancestor, top] of scrollPositions) ancestor.scrollTop = top;
    if (!focusKey) return;
    const matches = [...this.shadowRoot.querySelectorAll('[data-room-focus]')];
    const focus = matches.find(item => item.dataset.roomFocus === focusKey && !item.disabled)
      ?? matches.find(item => !item.disabled && item.dataset.roomFocus === focusKey.replace(/:(up|down)$/, (_, direction) => direction === 'up' ? ':down' : ':up'));
    focus?.focus({ preventScroll: true });
    focus?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  #roomOverride(room) {
    const list = this.#config.room_overrides ?? {};
    return Object.hasOwn(list, room) && list[room] && typeof list[room] === 'object' ? list[room] : {};
  }

  #setRoomOverride(room, override, focusKey) {
    const next = { ...this.#config.room_overrides };
    if (Object.keys(override).length) next[room] = override;
    else delete next[room];
    this.#commitRooms({ room_overrides: next }, focusKey);
  }

  #roomIconPicker(room, override, words, language) {
    const options = [['', words.defaultRoomIcon], ...Object.entries(ROOM_ICONS).map(([icon, names]) => [icon, names[language]])];
    const current = typeof override.icon === 'string' ? override.icon : '';
    if (current && !Object.hasOwn(ROOM_ICONS, current)) options.push([current, current]);
    const input = select(options, current);
    input.dataset.roomFocus = 'room-icon';
    input.addEventListener('change', () => {
      const next = { ...override };
      if (input.value) next.icon = input.value;
      else delete next.icon;
      this.#setRoomOverride(room.id, next, 'room-icon');
    });
    const preview = node('ha-icon');
    preview.setAttribute('icon', room.icon || 'mdi:home-outline');
    preview.setAttribute('aria-hidden', 'true');
    return node('div', { className: 'room-icon-field' }, [
      field(words.roomIcon, input), node('span', { className: 'room-icon-preview' }, [preview]),
    ]);
  }

  #roomMembership(room, override, sections, language) {
    if (!usesAutomaticRoomDevices(override, sections, room.custom)) {
      return configuredIds(Array.isArray(override.entities) ? override.entities : sections?.flatMap(section => section.entities));
    }
    // Resolve the visible room with other rooms' explicit assignments in scope.
    const visible = discoverRooms(this.#config, this.#hass, language).find(item => item.id === room.id);
    return visible?.entities.map(item => item.entity) ?? [];
  }

  #roomSectionsPanel(room, override, words, language) {
    const sections = roomSections(override.sections);
    const autoDevices = usesAutomaticRoomDevices(override, sections, room.custom);
    const saveSections = (items, focusKey) => {
      const next = { ...override };
      if (items) next.sections = items;
      else delete next.sections;
      if (autoDevices) {
        delete next.entities;
        if (items) next.device_selection = 'auto';
        else delete next.device_selection;
      } else if (items || !Array.isArray(next.entities)) {
        next.entities = this.#roomMembership(room, override, sections, language);
      }
      this.#setRoomOverride(room.id, next, focusKey);
    };
    const mode = select([['auto', words.automaticSections], ['manual', words.manualSections]], sections ? 'manual' : 'auto');
    mode.dataset.roomFocus = 'room-section-mode';
    const children = [field(words.sectionMode, mode)];
    mode.addEventListener('change', () => saveSections(mode.value === 'auto' ? undefined : [], 'room-section-mode'));
    const body = () => disclosure(words.sections, this.#open.sections, open => { this.#open.sections = open; },
      [node('div', { className: 'stack' }, children)]);
    if (!sections) return body();

    const chosen = this.#roomMembership(room, override, sections, language);
    const dictionary = languages[language];
    const typeTitle = kind => dictionary['room_' + kind];
    const sectionName = section => section.title || typeTitle(section.kind);
    const sectionRecords = sections.map(section => ({
      id: section.id, name: sectionName(section),
      secondary: section.title ? typeTitle(section.kind) : '',
    }));
    const sectionById = new Map(sections.map(section => [section.id, section]));
    if (sections.length) {
      children.push(orderedList(sectionRecords, (items, focusKey) => saveSections(items.map(item => sectionById.get(item.id)), focusKey),
        words, words.removeSection, false, 'sections'));
    }

    const add = button(words.addSection, () => {
      let serial = 1;
      while (sectionById.has('section-' + serial)) serial++;
      const id = 'section-' + serial;
      this.#sectionEditing = { roomId: room.id, id };
      saveSections([...sections, { id, kind: 'devices', entities: [] }], 'room-section-title');
    });
    add.dataset.roomFocus = 'room-section-add';
    children.push(node('div', { className: 'actions' }, [add]));

    const active = (this.#sectionEditing?.roomId === room.id && sectionById.get(this.#sectionEditing.id)) || sections[0];
    if (!active) return body();
    const sectionPicker = select(sectionRecords.map(item => [item.id, item.name]), active.id);
    sectionPicker.dataset.roomFocus = 'room-section-edit';
    sectionPicker.addEventListener('change', () => {
      this.#sectionEditing = { roomId: room.id, id: sectionPicker.value };
      this.#renderRoomChange('room-section-edit');
    });
    const update = (section, focusKey) => saveSections(sections.map(item => item.id === active.id ? section : item), focusKey);
    const kind = select(ROOM_SECTION_TYPES.map(type => [type, typeTitle(type)]), active.kind);
    kind.dataset.roomFocus = 'room-section-kind';
    kind.addEventListener('change', () => update({ ...active, kind: kind.value }, 'room-section-kind'));
    const title = node('input', { value: active.title ?? '', placeholder: typeTitle(active.kind), maxLength: 80 });
    title.dataset.roomFocus = 'room-section-title';
    const saveTitle = () => {
      const text = title.value.trim();
      if (text === (active.title ?? '')) return;
      const next = { ...active };
      if (text) next.title = text;
      else delete next.title;
      update(next, 'room-section-title');
    };
    title.addEventListener('change', saveTitle);
    title.addEventListener('keydown', event => {
      if (event.key !== 'Enter' || event.isComposing) return;
      event.preventDefault();
      saveTitle();
    });
    children.push(field(words.editSection, sectionPicker), field(words.sectionType, kind), field(words.sectionTitle, title));

    const entityName = entity => this.#hass.states?.[entity]?.attributes?.friendly_name || entity;
    const members = active.entities.map(id => ({ id, name: entityName(id) }));
    children.push(members.length ? orderedList(members, (items, focusKey) =>
      update({ ...active, entities: items.map(item => item.id) }, focusKey),
      words, words.removeFromSection, false, 'section-devices') : node('p', { textContent: words.sectionEmpty }));

    const activeMembers = new Set(active.entities);
    const candidates = chosen.filter(entity => !activeMembers.has(entity));
    if (candidates.length) {
      const picker = addPicker(words.sectionDevice, candidates.map(entity => [entity, entityName(entity)]), words.addToSection, words.choose, entity => {
        saveSections(sections.map(section => section.id === active.id
          ? { ...section, entities: [...section.entities, entity] }
          : { ...section, entities: section.entities.filter(id => id !== entity) }), 'room-section-device');
      });
      picker.input.dataset.roomFocus = 'room-section-device';
      children.push(picker.wrapper);
    }
    return body();
  }

  #roomTargetList(room, selected, devices, { setting, focus, title, hint, reset }) {
    const input = node('select', { multiple:true, size:Math.min(5, Math.max(2, devices.length)), disabled:!devices.length });
    input.dataset.roomFocus = focus;
    const current = new Set(selected);
    for (const device of devices) {
      const item = option(device.entity, device.name || device.entity);
      item.selected = current.has(device.entity);
      input.append(item);
    }
    const save = entities => {
      const next = { ...this.#roomOverride(room.id) };
      if (entities.length) next[setting] = entities;
      else delete next[setting];
      const minimum = setting === 'lighting_count_entities' ? 2 : 1;
      this.#setRoomOverride(room.id, next, entities.length || devices.length >= minimum ? focus : 'room-edit');
    };
    input.addEventListener('change', () => save([...input.selectedOptions].map(item => item.value)));
    const resetButton = button(reset, () => save([]));
    resetButton.hidden = !selected.length;
    return node('div', { className:'stack' }, [field(title, input), node('small', { textContent:hint }), resetButton]);
  }

  #climatePresetFields(room, config, words) {
    const id = config.entity;
    const setting = 'climate_preset_shortcuts';
    const saved = normalizeClimatePresetShortcut(this.#roomOverride(room.id)[setting]?.[id]);
    const options = getDeviceModel(config, this.#hass.states).actions.set_preset_mode?.options ?? [];
    if (!saved && !options.length) return [];
    const save = (edits, focus) => {
      const next = { ...this.#roomOverride(room.id) };
      const shortcuts = { ...next[setting] };
      const value = normalizeClimatePresetShortcut({ ...saved, ...edits });
      if (value) shortcuts[id] = value;
      else delete shortcuts[id];
      if (Object.keys(shortcuts).length) next[setting] = shortcuts;
      else delete next[setting];
      this.#setRoomOverride(room.id, next, focus);
    };
    const pick = (key, title, none) => {
      const current = saved?.[key] ?? '';
      const choices = [['', none], ...options.map(value => [value, value])];
      if (current && !options.includes(current)) choices.push([current, current + ' · ' + words.climatePresetUnavailable]);
      const control = select(choices, current);
      control.dataset.roomFocus = 'climate-preset-' + key;
      control.addEventListener('change', () => save({ [key]: control.value }, control.dataset.roomFocus));
      return field(title, control);
    };
    const fields = [pick('preset', words.climatePresetShortcut, words.climatePresetNone)];
    if (saved) {
      for (const [key, title, settings] of [
        ['label', words.climatePresetLabel, { maxLength: 16 }],
        ['icon', words.climatePresetIcon, { maxLength: 80, pattern: 'mdi:[a-z0-9-]+', placeholder: 'mdi:tune-variant' }],
      ]) {
        const control = node('input', { ...settings, value: saved[key] ?? '' });
        control.dataset.roomFocus = 'climate-preset-' + key;
        control.addEventListener('change', () => {
          if (control.checkValidity()) save({ [key]: control.value }, control.dataset.roomFocus);
          else control.reportValidity();
        });
        fields.push(field(title, control));
      }
      fields.push(pick('highlight_when', words.climatePresetHighlight, words.climatePresetHighlightDefault));
    }
    return fields;
  }

  #roomControlIcon(room, device, words) {
    const { entity, icon, kind } = device;
    const override = this.#roomOverride(room.id);
    const icons = override.entity_icons;
    const saved = normalizeRoomIcon(icons?.[entity]);
    const fallback = normalizeRoomIcon(icon) ?? DEVICE_ICONS[kind || entity.split('.')[0]] ?? 'mdi:information-outline';
    const preview = node('ha-icon');
    preview.setAttribute('icon', saved ?? fallback);
    preview.setAttribute('aria-hidden', 'true');
    const save = raw => {
      if (typeof raw !== 'string') return;
      const chosen = normalizeRoomIcon(raw);
      if ((raw.trim() && !chosen) || chosen === saved) return;
      const next = { ...this.#roomOverride(room.id) };
      const previous = next.entity_icons;
      const updated = previous && typeof previous === 'object' && !Array.isArray(previous) ? { ...previous } : {};
      if (chosen) updated[entity] = chosen;
      else delete updated[entity];
      if (Object.keys(updated).length) next.entity_icons = updated;
      else delete next.entity_icons;
      this.#setRoomOverride(room.id, next, 'room-control-icon');
    };

    let input;
    let labelled;
    let suggestions;
    if (customElements.get('ha-icon-picker')) {
      input = node('ha-icon-picker', { hass: this.#hass, label: words.roomDeviceIcon, value: saved ?? '' });
      input.setAttribute('aria-label', words.roomDeviceIcon);
      input.addEventListener('value-changed', event => {
        if (event.target === input) save(event.detail?.value ?? '');
      });
      labelled = input;
    } else {
      input = node('input', { value: saved ?? '', placeholder: 'mdi:ceiling-light', dir: 'ltr',
        maxLength: 120, pattern: 'mdi:[a-z0-9\\-]+', spellcheck: false, autocapitalize: 'off' });
      labelled = field(words.roomDeviceIcon, input);
      const choices = new Set([fallback, ...Object.values(DEVICE_ICONS), ...Object.keys(ROOM_ICONS)]);
      suggestions = node('datalist', { id: 'bayit9-editor-icons-' + ++nextLabel },
        [...choices].map(value => option(value, value)));
      input.setAttribute('list', suggestions.id);
      input.addEventListener('input', () => preview.setAttribute('icon', normalizeRoomIcon(input.value) ?? saved ?? fallback));
      const commit = () => {
        if (input.value.trim() && !normalizeRoomIcon(input.value)) {
          input.reportValidity();
          return;
        }
        save(input.value);
      };
      input.addEventListener('change', commit);
      input.addEventListener('keydown', event => {
        if (event.key !== 'Enter' || event.isComposing) return;
        event.preventDefault();
        commit();
      });
    }
    input.dataset.roomFocus = 'room-control-icon';
    const fieldRow = node('div', { className: 'room-icon-field' }, [
      labelled, node('span', { className: 'room-icon-preview' }, [preview]),
      ...(suggestions ? [suggestions] : []),
    ]);
    return saved
      ? node('div', { className: 'stack' }, [fieldRow, node('div', { className: 'actions' }, [
        button(words.roomDeviceIconDefault, () => save('')),
      ])])
      : fieldRow;
  }

  #roomControlDisplay(room, chosen, words) {
    const body = node('div', { className: 'stack' });
    const paint = () => {
      if (body.childElementCount) return;
      const available = new Map(selectableRoomEntities(this.#config, this.#hass).map(item => [item.entity, item]));
      const entities = chosen.filter(id => available.has(id));
      if (!entities.length) {
        body.append(node('p', { textContent: words.noDevices }));
        return;
      }
      const profiles = Array.isArray(this.#config.profiles) ? this.#config.profiles.map(normalizeProfile).filter(Boolean) : [];
      const nameOf = id => profiles.find(profile => profile.entity === id)?.name || available.get(id)?.name || id;
      const chosenEntity = this.#roomControlEditing.get(room.id);
      const picker = select(entities.map(id => [id, nameOf(id)]), entities.includes(chosenEntity) ? chosenEntity : entities[0]);
      const fields = node('div', { className: 'stack' });
      const draw = () => {
        const id = picker.value;
        const override = this.#roomOverride(room.id);
        const shown = !configuredIds(override.panel_hidden_entities).includes(id);
        const showDevice = checkbox(words.roomPanelShow, shown, checked => {
          const next = { ...this.#roomOverride(room.id) };
          const hidden = new Set(configuredIds(next.panel_hidden_entities));
          if (checked) hidden.delete(id);
          else hidden.add(id);
          if (hidden.size) next.panel_hidden_entities = [...hidden];
          else delete next.panel_hidden_entities;
          this.#setRoomOverride(room.id, next, 'room-control-device-show');
        });
        showDevice.firstElementChild.dataset.roomFocus = 'room-control-device-show';
        const profile = profiles.find(item => item.entity === id);
        const deviceIcon = this.#roomControlIcon(room, { ...available.get(id), kind: profile?.kind }, words);
        if (!shown) {
          fields.replaceChildren(showDevice, deviceIcon, node('small', { textContent: words.roomPanelHint }));
          return;
        }
        const name = normalizeRoomControlName(override.entity_names?.[id]);
        const save = (value, focus) => {
          const latest = this.#roomOverride(room.id);
          const names = { ...latest.entity_names };
          if (value === undefined) delete names[id];
          else names[id] = value;
          const next = { ...latest };
          if (Object.keys(names).length) next.entity_names = names;
          else delete next.entity_names;
          this.#setRoomOverride(room.id, next, focus);
        };
        const show = checkbox(words.roomControlShow, name !== '',
          checked => save(checked ? undefined : '', 'room-control-show'));
        show.firstElementChild.dataset.roomFocus = 'room-control-show';
        const input = node('input', { value: name || '', maxLength: 80, placeholder: nameOf(id), disabled: name === '' });
        input.dataset.roomFocus = 'room-control-name';
        const saveText = () => {
          const value = normalizeRoomControlName(input.value) || undefined;
          if (value !== name) save(value, 'room-control-name');
        };
        input.addEventListener('change', saveText);
        input.addEventListener('keydown', event => {
          if (event.key !== 'Enter' || event.isComposing) return;
          event.preventDefault();
          saveText();
        });
        fields.replaceChildren(showDevice, show, field(words.roomControlName, input), deviceIcon);
        if (id.startsWith('climate.') && !configuredIds(override.read_only_entities).includes(id) &&
            !['heater', 'boiler'].includes(profile?.kind)) {
          fields.append(...this.#climatePresetFields(room, profile ?? { entity: id }, words));
        }
        if (id.startsWith('cover.') && !configuredIds(override.read_only_entities).includes(id)) {
          const native = checkbox(words.roomNativeCoverHeader,
            configuredIds(override.native_cover_header_entities).includes(id), checked => {
              const next = { ...this.#roomOverride(room.id) };
              const configured = new Set(configuredIds(next.native_cover_header_entities));
              if (checked) configured.add(id);
              else configured.delete(id);
              if (configured.size) next.native_cover_header_entities = [...configured];
              else delete next.native_cover_header_entities;
              this.#setRoomOverride(room.id, next, 'room-native-cover-header');
            });
          native.firstElementChild.dataset.roomFocus = 'room-native-cover-header';
          fields.append(native);
        }
        if (id.startsWith('light.') && !profile?.kind && !configuredIds(override.read_only_entities).includes(id) &&
            roomLightTilePlacement(id, roomSections(override.sections))) {
          const native = checkbox(words.roomNativeLightHold,
            configuredIds(override.native_light_hold_entities).includes(id), checked => {
              const next = { ...this.#roomOverride(room.id) };
              const configured = new Set(configuredIds(next.native_light_hold_entities));
              if (checked) configured.add(id);
              else configured.delete(id);
              if (configured.size) next.native_light_hold_entities = [...configured];
              else delete next.native_light_hold_entities;
              this.#setRoomOverride(room.id, next, 'room-native-light-hold');
            });
          native.firstElementChild.dataset.roomFocus = 'room-native-light-hold';
          fields.append(native);
        }
        const inlineLight = configuredIds(override.inline_light_entities).includes(id);
        const lightActions = id.startsWith('light.') && getDeviceModel({ entity: id }, this.#hass.states).actions;
        if (lightActions && !configuredIds(override.read_only_entities).includes(id) &&
            (inlineLight || lightActions.set_brightness || lightActions.set_color_temp_kelvin)) {
          const inline = checkbox(words.roomInlineLight, inlineLight, checked => {
            const next = { ...this.#roomOverride(room.id) };
            const inlineLights = new Set(configuredIds(next.inline_light_entities));
            if (checked) inlineLights.add(id);
            else inlineLights.delete(id);
            if (inlineLights.size) next.inline_light_entities = [...inlineLights];
            else delete next.inline_light_entities;
            this.#setRoomOverride(room.id, next, 'room-inline-light');
          });
          inline.firstElementChild.dataset.roomFocus = 'room-inline-light';
          fields.append(inline);
        }
      };
      picker.addEventListener('change', () => {
        this.#roomControlEditing.set(room.id, picker.value);
        draw();
      });
      draw();
      body.append(field(words.roomControlDevice, picker), fields);
    };
    if (this.#open.roomControlDisplay) paint();
    return disclosure(words.roomControlDisplay, this.#open.roomControlDisplay, open => {
      this.#open.roomControlDisplay = open;
      if (open) paint();
    }, [body]);
  }

  #roomDevicePanel(room, words, language, areas) {
    const override = this.#roomOverride(room.id);
    const sections = roomSections(override.sections);
    const manual = !usesAutomaticRoomDevices(override, sections, room.custom);
    const choice = select([['auto', words.automaticDevices], ['manual', words.manualDevices]], manual ? 'manual' : 'auto');
    choice.dataset.roomFocus = 'room-device-mode';
    choice.addEventListener('change', () => {
      const next = { ...override };
      if (choice.value === 'auto') {
        delete next.entities;
        if (sections) next.device_selection = 'auto';
        else delete next.device_selection;
      } else {
        delete next.device_selection;
        next.entities = this.#roomMembership(room, override, sections, language);
      }
      this.#setRoomOverride(room.id, next, 'room-device-mode');
    });
    const children = room.custom
      ? [node('h4', { className: 'room-choice-heading', textContent: words.roomDevices })]
      : [field(words.roomDevices, choice)];
    const options = [];
    const chosen = this.#roomMembership(room, override, sections, language);
    const states = this.#hass.states ?? {};
    const hidden = new Set(configuredIds(this.#config.hidden_entities));
    const temperatureSource = override.room_temperature_entity;
    const temperatures = chosen.filter(id => isVisibleEntity(id, states, this.#hass.entities, hidden) &&
      (supportsRoomTemperatureSource(id, states[id]?.attributes) ||
        id === temperatureSource && id.startsWith('sensor.') && ['unknown', 'unavailable'].includes(states[id]?.state)));
    if (temperatures.length || temperatureSource) {
      const input = select([['', words.roomTemperatureAuto], ...temperatures.map(id =>
        [id, states[id]?.attributes?.friendly_name ?? id])], temperatures.includes(temperatureSource) ? temperatureSource : '');
      input.dataset.roomFocus = 'room-temperature-source';
      input.addEventListener('change', () => {
        const next = { ...override };
        if (input.value) next.room_temperature_entity = input.value;
        else delete next.room_temperature_entity;
        if (!input.value.startsWith('sensor.')) delete next.room_temperature_fallback_entity;
        this.#setRoomOverride(room.id, next, input.dataset.roomFocus);
      });
      options.push(field(words.roomTemperatureSource, input));
      const climates = temperatures.filter(id => id.startsWith('climate.'));
      if (input.value.startsWith('sensor.') && climates.length) {
        const current = override.room_temperature_fallback_entity;
        const fallback = select([['', words.roomTemperatureNoFallback], ...climates.map(id =>
          [id, states[id]?.attributes?.friendly_name ?? id])], climates.includes(current) ? current : '');
        fallback.dataset.roomFocus = 'room-temperature-fallback';
        fallback.addEventListener('change', () => {
          const next = { ...override };
          if (fallback.value) next.room_temperature_fallback_entity = fallback.value;
          else delete next.room_temperature_fallback_entity;
          this.#setRoomOverride(room.id, next, fallback.dataset.roomFocus);
        });
        options.push(field(words.roomTemperatureFallback, fallback));
      }
    }
    const lights = chosen.filter(id => id.startsWith('light.'));
    const selectedCount = configuredIds(override.lighting_count_entities);
    const editCount = lights.length > 1 || selectedCount.length > 0;
    const readOnly = new Set(configuredIds(override.read_only_entities));
    const shutdown = chosen.filter(id => supportsRoomShutdown(id) && !readOnly.has(id));
    const selectedShutdown = configuredIds(override.turn_off_entities);
    const editShutdown = shutdown.length > 0 || selectedShutdown.length > 0;
    const available = manual || editCount || editShutdown
      ? new Map(selectableRoomEntities(this.#config, this.#hass).map(entry => [entry.entity, entry])) : undefined;
    if (chosen.length) {
      options.push(this.#roomControlDisplay(room, chosen, words));
      const selected = node('select', { multiple: true, size: Math.min(5, Math.max(2, chosen.length)) });
      for (const id of chosen) {
        const item = option(id, this.#hass.states?.[id]?.attributes?.friendly_name ?? id);
        item.selected = readOnly.has(id);
        selected.append(item);
      }
      selected.dataset.roomFocus = 'room-read-only';
      selected.addEventListener('change', () => {
        const next = { ...override };
        const entities = [...selected.selectedOptions].map(item => item.value);
        if (entities.length) next.read_only_entities = entities;
        else delete next.read_only_entities;
        this.#setRoomOverride(room.id, next, 'room-read-only');
      });
      options.push(field(words.readOnlyRoom, selected));
    }
    if (editCount) {
      options.push(this.#roomTargetList(room, selectedCount, lights.map(id => available.get(id)).filter(Boolean), {
        setting:'lighting_count_entities', focus:'room-light-count', title:words.lightCount,
        hint:words.lightCountHint, reset:words.lightCountReset,
      }));
    }
    if (editShutdown) {
      options.push(this.#roomTargetList(room, selectedShutdown, shutdown.map(id => available.get(id)).filter(Boolean), {
        setting:'turn_off_entities', focus:'room-turn-off', title:words.roomShutdown,
        hint:words.roomShutdownHint, reset:words.roomShutdownReset,
      }));
    }
    const linkedDevices = chosen.flatMap(id => {
      const kind = ROOM_PANEL_KINDS.get(id.split('.')[0]);
      return kind ? [{ id, kind }] : [];
    });
    const panels = linkedDevices.length ? roomPanelOptions(this.#config, this.#hass) : [];
    for (const { id, kind } of linkedDevices) {
      const targets = panels.filter(panel => panel.kind === kind);
      if (!targets.length) continue;
      const vacuum = kind === 'vacuum';
      const defaultName = vacuum ? words.roomVacuumDefault : words.roomMediaDefault;
      const panelOptions = [['', words.roomMediaNone], ...targets.map(({ id, label }) =>
        [id, label || (targets.length === 1 ? defaultName : id)])];
      const key = kind + '_panel_links';
      const chosenPanel = override[key]?.[id];
      const holdEntities = Array.isArray(override.vacuum_panel_hold_entities) ? override.vacuum_panel_hold_entities : [];
      const setHold = (next, hold) => {
        const selected = new Set(holdEntities);
        if (hold) selected.add(id);
        else selected.delete(id);
        if (selected.size) next.vacuum_panel_hold_entities = [...selected];
        else delete next.vacuum_panel_hold_entities;
      };
      const setDisplay = (next, display) => {
        const displays = { ...override.vacuum_panel_presentation };
        if (display) displays[id] = display;
        else delete displays[id];
        if (Object.keys(displays).length) next.vacuum_panel_presentation = displays;
        else delete next.vacuum_panel_presentation;
      };
      const setSummary = (next, summary) => {
        const summaries = { ...override.vacuum_panel_summary };
        if (summary) summaries[id] = summary;
        else delete summaries[id];
        if (Object.keys(summaries).length) next.vacuum_panel_summary = summaries;
        else delete next.vacuum_panel_summary;
      };
      const input = select(panelOptions, targets.some(target => target.id === chosenPanel) ? chosenPanel : '');
      const focusKey = 'room-panel-' + id;
      input.dataset.roomFocus = focusKey;
      input.addEventListener('change', () => {
        const next = { ...override };
        const links = { ...next[key] };
        if (input.value) links[id] = input.value;
        else delete links[id];
        if (Object.keys(links).length) next[key] = links;
        else delete next[key];
        if (vacuum && !input.value) {
          setHold(next, false);
          setDisplay(next);
          setSummary(next);
        }
        this.#setRoomOverride(room.id, next, focusKey);
      });
      const name = this.#hass.states?.[id]?.attributes?.friendly_name ?? id;
      options.push(field((vacuum ? words.roomVacuumLink : words.roomMediaLink) + ' · ' + name, input));
      if (vacuum && input.value) {
        const gesture = select([['tap', words.roomVacuumTap], ['hold', words.roomVacuumHold]],
          holdEntities.includes(id) ? 'hold' : 'tap');
        gesture.dataset.roomFocus = 'room-vacuum-gesture-' + id;
        gesture.addEventListener('change', () => {
          const next = { ...override };
          setHold(next, gesture.value === 'hold');
          this.#setRoomOverride(room.id, next, gesture.dataset.roomFocus);
        });
        options.push(field(words.roomVacuumGesture + ' · ' + name, gesture));
        const display = select([['', words.roomVacuumAll], ['cleaning-controls', words.roomVacuumCleaning], ['tile', words.roomVacuumTile]],
          roomVacuumPresentation(override.vacuum_panel_presentation?.[id]) ?? '');
        display.dataset.roomFocus = 'room-vacuum-display-' + id;
        display.addEventListener('change', () => {
          const next = { ...override };
          setDisplay(next, display.value);
          this.#setRoomOverride(room.id, next, display.dataset.roomFocus);
        });
        options.push(field(words.roomVacuumDisplay + ' · ' + name, display));
        if (display.value !== 'tile') {
          const summary = normalizeRoomVacuumSummary(override.vacuum_panel_summary?.[id]);
          const candidates = (available ? [...available.values()] : selectableRoomEntities(this.#config, this.#hass));
          const readings = Object.entries(ROOM_VACUUM_SUMMARY_DOMAINS).map(([key, domain]) => {
            const choices = candidates.filter(item => item.entity.startsWith(domain + '.'))
              .map(item => [item.entity, item.name || item.entity])
              .sort((a, b) => a[1].localeCompare(b[1], language));
            const selected = summary?.[key];
            if (selected && !choices.some(([entity]) => entity === selected)) choices.push([selected, selected + ' · ' + words.missing]);
            const source = select([['', words.roomVacuumNoReading], ...choices], selected || '');
            source.dataset.roomFocus = 'room-vacuum-reading-' + id + '-' + key;
            source.addEventListener('change', () => {
              const next = { ...override };
              setSummary(next, normalizeRoomVacuumSummary({ ...summary, [key]: source.value }));
              this.#setRoomOverride(room.id, next, source.dataset.roomFocus);
            });
            return field(words.roomVacuumReadings[key], source);
          });
          options.push(node('details', { open: !!summary }, [
            node('summary', { textContent: words.roomVacuumSummary + ' · ' + name }), ...readings,
          ]));
        }
      }
    }
    if (!manual) return [...children, ...options];

    const areaNames = new Map(areas.map(area => [area.id, area.name]));
    const records = chosen.map(id => {
      const device = available.get(id);
      const previousName = this.#hass.states?.[id]?.attributes?.friendly_name;
      return { id, name: device?.name || previousName || id, secondary: device ? '' : words.missing };
    });
    const change = (items, focusKey) => {
      const entities = items.map(item => item.id);
      const next = { ...override, entities };
      if (!entities.includes(next.room_temperature_entity)) delete next.room_temperature_entity;
      if (!next.room_temperature_entity || !entities.includes(next.room_temperature_fallback_entity)) {
        delete next.room_temperature_fallback_entity;
      }
      for (const key of ['read_only_entities', 'lighting_count_entities', 'turn_off_entities', 'panel_hidden_entities',
        'inline_light_entities', 'native_cover_header_entities', 'native_light_hold_entities', 'shortcut_no_details',
        'vacuum_panel_hold_entities']) {
        if (!Array.isArray(next[key])) continue;
        next[key] = next[key].filter(id => entities.includes(id));
        if (!next[key].length) delete next[key];
      }
      for (const key of ['climate_preset_shortcuts', 'shortcut_detail_routes', 'vacuum_panel_presentation', 'vacuum_panel_summary',
        ...[...ROOM_PANEL_KINDS.values()].map(kind => kind + '_panel_links')]) {
        if (!next[key]) continue;
        next[key] = Object.fromEntries(Object.entries(next[key]).filter(([id]) => entities.includes(id)));
        if (!Object.keys(next[key]).length) delete next[key];
      }
      if (next.shortcut_detail_entities) {
        const detailEntities = Object.fromEntries(Object.entries(next.shortcut_detail_entities).filter(([source, target]) =>
          entities.includes(source) && entities.includes(target) && source !== target));
        if (Object.keys(detailEntities).length) next.shortcut_detail_entities = detailEntities;
        else delete next.shortcut_detail_entities;
      }
      if (sections && entities.length < chosen.length) {
        const kept = new Set(entities);
        const removed = new Set(chosen.filter(entity => !kept.has(entity)));
        next.sections = sections.map(section => ({ ...section, entities: section.entities.filter(entity => !removed.has(entity)) }));
      }
      if (!focusKey) {
        const removedIndex = chosen.findIndex((id, index) => id !== entities[index]);
        const nextDevice = entities[Math.min(removedIndex, entities.length - 1)];
        focusKey = nextDevice ? 'devices:' + nextDevice + ':remove' : 'room-device-search';
      }
      this.#setRoomOverride(room.id, next, focusKey);
    };
    const membership = records.length ? orderedList(records, change, words, words.remove, false, 'devices')
      : node('p', { textContent: words.noDevices });

    const selected = new Set(chosen);
    const devices = [...available.values()].filter(device => !selected.has(device.entity)).map(device => ({
      id: device.entity, name: device.name || device.entity, area: entityArea(this.#hass, device.entity),
    }));
    devices.sort((a, b) => Number(b.area === room.id) - Number(a.area === room.id) || a.name.localeCompare(b.name, language));
    const nameCounts = new Map();
    for (const device of devices) nameCounts.set(device.name, (nameCounts.get(device.name) ?? 0) + 1);

    const addition = id => ({ ...override, entities: [...chosen, id] });
    const picker = addPicker(words.deviceToAdd, [], words.addDevice, words.choose,
      id => this.#setRoomOverride(room.id, addition(id), 'room-device-search'));
    const placement = node('p', { className: 'room-add-hint', id: picker.input.getAttribute('aria-labelledby') + '-placement' });
    placement.setAttribute('role', 'status');
    picker.action.setAttribute('aria-describedby', placement.id);
    picker.input.addEventListener('change', () => {
      placement.textContent = '';
      const id = picker.input.value;
      if (!id) return;
      const elsewhere = candidate => candidate.id !== room.id && candidate.entities.includes(id);
      const before = dashboardRoomMemberships(this.#config, this.#hass, language).find(elsewhere);
      if (!before) return;
      // Preview the same draft edit the Add button will make.
      const roomOverrides = { ...this.#config.room_overrides, [room.id]: addition(id) };
      const after = dashboardRoomMemberships({ ...this.#config, room_overrides: roomOverrides }, this.#hass, language);
      if (!after.some(candidate => candidate.id === room.id && candidate.entities.includes(id))) return;
      const others = after.filter(elsewhere);
      if (others.length) {
        const names = new Intl.ListFormat(language).format(others.map(candidate => candidate.name));
        placement.textContent = words.roomDeviceKeep.replace('{rooms}', () => names);
      } else {
        const move = words.roomDeviceMove.replace('{room}', () => before.name);
        placement.textContent = after.some(candidate => candidate.id === before.id) ? move : move + ' ' + words.roomDeviceEmpty;
      }
    });
    const filter = node('input', { type: 'search', value: this.#roomDeviceQuery });
    filter.dataset.roomFocus = 'room-device-search';
    const refresh = () => {
      const query = filter.value.trim().toLocaleLowerCase(language);
      const results = devices.filter(device => {
        const area = areaNames.get(device.area) ?? '';
        return (device.name + ' ' + area + ' ' + device.id).toLocaleLowerCase(language).includes(query);
      });
      picker.input.replaceChildren(option('', results.length ? words.choose : words.noMatches), ...results.map(device => {
        const name = device.name;
        const scope = device.area !== room.id && areaNames.get(device.area);
        const suffix = nameCounts.get(name) > 1 ? [scope, device.id].filter(Boolean).join(' · ') : scope;
        return option(device.id, suffix ? name + ' · ' + suffix : name);
      }));
      picker.input.disabled = !results.length;
      picker.action.disabled = true;
      placement.textContent = '';
    };
    filter.addEventListener('input', () => { this.#roomDeviceQuery = filter.value; refresh(); });
    refresh();
    return [...children, field(words.roomDeviceSearch, filter), node('div', {}, [picker.wrapper, placement]), membership, ...options];
  }

  #customRoomForm(rooms, selection, words) {
    const name = node('input', { maxLength: 80, value: this.#newRoomName });
    name.dataset.roomFocus = 'new-room-name';
    const add = button(words.newRoom, () => {
      const text = name.value.trim();
      if (!text) return;
      const used = new Set([...rooms.map(room => room.id), ...configuredIds(this.#config.area_ids),
        ...Object.keys(this.#config.room_overrides ?? {})]);
      let serial = 1;
      while (used.has(CUSTOM_ROOM_PREFIX + serial)) serial++;
      const id = CUSTOM_ROOM_PREFIX + serial;
      const change = { room_overrides: { ...this.#config.room_overrides, [id]: { name: text, entities: [] } } };
      if (selection !== null) {
        change.room_selection = 'manual';
        change.area_ids = [...selection, id];
      }
      this.#newRoomName = '';
      this.#open.newRoom = false;
      this.#roomEditing = id;
      this.#roomDeviceQuery = '';
      this.#commitRooms(change, 'room-edit');
    });
    add.disabled = !this.#newRoomName.trim();
    name.addEventListener('input', () => {
      this.#newRoomName = name.value;
      add.disabled = !name.value.trim();
    });
    name.addEventListener('keydown', event => {
      if (event.key === 'Enter' && !event.isComposing) {
        event.preventDefault();
        if (!add.disabled) add.click();
      }
    });
    return disclosure(words.createRoom, this.#open.newRoom, open => { this.#open.newRoom = open; },
      [node('div', { className: 'stack' }, [
        node('p', { textContent: words.newRoomHint }),
        node('div', { className: 'room-add' }, [field(words.newRoomName, name), add]),
      ])]);
  }

  #roomAppliancePanel(room, override, words, language) {
    const activities = normalizeRoomActivities(override.activities);
    const memory = this.#applianceRooms.get(room.id) ?? { open: false, kind: activities[0]?.kind ?? 'oven' };
    this.#applianceRooms.set(room.id, memory);
    const body = node('div', { className: 'stack' });
    const paint = () => {
      if (body.childElementCount) return;
      const titles = languages[language];
      const kind = select(Object.keys(activityKinds).map(key => [key, titles['activity_' + key]]), memory.kind);
      kind.dataset.roomFocus = 'appliance-kind';
      const form = node('div', { className: 'stack' });
      const options = selectableRoomEntities(this.#config, this.#hass);
      const save = next => {
        const updated = { ...override };
        if (next.length) updated.activities = next;
        else delete updated.activities;
        this.#setRoomOverride(room.id, updated, 'appliance-kind');
      };
      const choose = () => {
        memory.kind = kind.value;
        const current = activities.find(item => item.kind === kind.value);
        const { required, optional } = activityKinds[kind.value];
        const boilerDevices = kind.value === 'boiler'
          ? discoverRooms(this.#config, this.#hass, language).find(candidate => candidate.id === room.id)?.entities
          : undefined;
        const fields = [...required, ...(optional ?? [])].map(key => {
          const items = options.filter(item => {
            if (!activitySources[key].includes(item.entity.split('.')[0])) return false;
            if (key === 'boiler_entity') return boilerDevices?.some(device => device.entity === item.entity && device.kind === 'boiler');
            if (key !== 'started_at_entity') return true;
            const attributes = this.#hass.states?.[item.entity]?.attributes;
            return attributes?.has_date === true && attributes?.has_time === true;
          }).map(item => [item.entity, item.name && item.name !== item.entity ? item.name + ' · ' + item.entity : item.entity])
            .sort((a, b) => a[1].localeCompare(b[1], language));
          if (current?.[key] && !items.some(([id]) => id === current[key])) items.unshift([current[key], current[key]]);
          const input = select([['', words.none], ...items], current?.[key] ?? '');
          input.required = required.includes(key);
          return { key, input, label: field(words.applianceFields[key], input) };
        });
        const error = node('p', { className: 'error', textContent: words.applianceMissing, hidden: true });
        error.setAttribute('role', 'alert');
        const controls = node('div', { className: 'actions' }, [button(words.saveAppliance, () => {
          const [next] = normalizeRoomActivities([{ kind: kind.value,
            ...Object.fromEntries(fields.map(({ key, input }) => [key, input.value])) }]);
          if (!next) {
            error.hidden = false;
            fields.find(({ input }) => input.required && !input.value)?.input.focus();
            return;
          }
          save(current ? activities.map(item => item.kind === next.kind ? next : item) : [...activities, next]);
        })]);
        if (current) controls.append(button(words.removeAppliance, () => save(activities.filter(item => item.kind !== current.kind))));
        form.replaceChildren(...fields.map(item => item.label), error, controls);
      };
      kind.addEventListener('change', choose);
      choose();
      body.append(field(words.applianceKind, kind), form);
    };
    if (memory.open) paint();
    return disclosure(words.applianceBadges, memory.open, open => {
      memory.open = open;
      if (open) paint();
    }, [body]);
  }

  #roomsPanel(words, language) {
    const rooms = dashboardRoomOptions(this.#config, this.#hass).sort((a, b) => a.name.localeCompare(b.name, language));
    const byId = new Map(rooms.map(room => [room.id, room]));
    const selection = selectedRoomIds(this.#config);
    const selected = selection ?? [];
    const customSelection = selection !== null;
    const mode = select([['auto', words.allRooms], ['custom', words.selectedRooms]], customSelection ? 'custom' : 'auto');
    mode.dataset.roomFocus = 'room-mode';
    mode.addEventListener('change', () => {
      if (mode.value === 'auto') {
        this.#commitRooms({ room_selection: 'auto', area_ids: [] }, 'room-mode');
        return;
      }
      const visible = discoverRooms(this.#config, this.#hass, language).map(room => room.id).filter(id => byId.has(id));
      this.#commitRooms({ room_selection: 'manual', area_ids: visible }, 'room-mode');
    });
    const discovery = select([['all', words.allDevices], ['controls', words.controls]],
      this.#config.discovery_mode === 'controls' ? 'controls' : 'all');
    discovery.dataset.roomFocus = 'room-discovery';
    discovery.addEventListener('change', () => this.#commitRooms({ discovery_mode: discovery.value }, 'room-discovery'));
    const unassigned = checkbox(words.unassigned, this.#config.show_unassigned !== false,
      checked => this.#commitRooms({ show_unassigned: checked }, 'room-unassigned'));
    unassigned.firstElementChild.dataset.roomFocus = 'room-unassigned';
    const children = [field(words.roomSelection, mode), field(words.discovery, discovery), unassigned];

    if (customSelection) {
      const ordered = selected.map(id => ({
        id, name: byId.get(id)?.name ?? id,
        secondary: byId.get(id)?.custom ? words.customRoom : byId.has(id) ? '' : words.missing,
      }));
      if (ordered.length) children.push(
        orderedList(ordered, (items, focusKey) => this.#commitRooms({
          room_selection: 'manual', area_ids: items.map(item => item.id),
        }, focusKey ?? 'room-mode'), words, words.hideRoom, false, 'rooms'),
      );
      const shown = new Set(selected);
      const available = rooms.filter(room => !shown.has(room.id));
      if (available.length) {
        const picker = addPicker(words.roomToAdd, available.map(room => [room.id, room.name]), words.addRoom, words.none, id => {
          this.#roomEditing = id;
          this.#roomDeviceQuery = '';
          this.#commitRooms({ room_selection: 'manual', area_ids: [...selected, id] }, 'room-edit');
        });
        children.push(picker.wrapper);
      }
    }

    const editable = customSelection ? selected.map(id => byId.get(id)).filter(Boolean) : rooms;
    const active = editable.find(room => room.id === this.#roomEditing) ?? editable[0];
    if (active) {
      const picker = select(editable.map(room => [room.id, room.name]), active.id);
      picker.dataset.roomFocus = 'room-edit';
      picker.addEventListener('change', () => {
        this.#roomEditing = picker.value;
        this.#roomDeviceQuery = '';
        this.#renderRoomChange('room-edit');
      });
      const override = this.#roomOverride(active.id);
      const input = node('input', { value: override.name ?? '', maxLength: 80, placeholder: active.name, required: Boolean(active.custom) });
      input.dataset.roomFocus = 'room-name';
      const saveName = () => {
        const name = input.value.trim();
        if (!name && active.custom) {
          input.value = override.name ?? active.name;
          return;
        }
        if (name === (override.name ?? '')) return;
        const next = { ...override };
        if (name) next.name = name;
        else delete next.name;
        this.#setRoomOverride(active.id, next, 'room-name');
      };
      input.addEventListener('change', saveName);
      input.addEventListener('keydown', event => {
        if (event.key === 'Enter' && !event.isComposing) {
          event.preventDefault();
          saveName();
        }
      });
      const titleBreaks = active.name.trim().split(/\s+/u).slice(1).map((_, index) => {
        const at = index + 1;
        return [String(at), classicRoomTitle(active.name, at).replace('\n', ' ↵ ')];
      });
      const fields = [field(words.roomToEdit, picker), field(words.roomName, input)];
      if (titleBreaks.length) {
        const currentBreak = classicRoomTitle(active.name, override.classic_title_break) ? String(override.classic_title_break) : '';
        const titleBreak = select([['', words.roomTitleAuto], ...titleBreaks], currentBreak);
        titleBreak.dataset.roomFocus = 'room-title-break';
        titleBreak.addEventListener('change', () => {
          const updated = { ...override };
          if (titleBreak.value) updated.classic_title_break = Number(titleBreak.value);
          else delete updated.classic_title_break;
          this.#setRoomOverride(active.id, updated, 'room-title-break');
        });
        fields.push(field(words.roomTitleBreak, titleBreak));
      }
      fields.push(
        this.#roomIconPicker(active, override, words, language),
        ...this.#roomDevicePanel(active, words, language, rooms),
        this.#roomSectionsPanel(active, override, words, language),
        this.#roomAppliancePanel(active, override, words, language),
      );
      if (active.custom) {
        const remove = button(words.deleteRoom, () => {
          const after = { ...this.#config.room_overrides };
          delete after[active.id];
          const shortcuts = { ...this.#config.room_shortcuts };
          delete shortcuts[active.id];
          this.#roomEditing = undefined;
          this.#roomDeviceQuery = '';
          this.#commitRooms({
            room_overrides: after,
            ...(customSelection && { room_selection: 'manual', area_ids: selected.filter(id => id !== active.id) }),
            room_shortcuts: shortcuts,
          }, 'room-mode');
        });
        remove.className = 'room-danger';
        fields.push(remove);
      }
      children.push(...fields);
    } else children.push(node('p', { textContent: words.noRooms }));

    children.push(this.#customRoomForm(rooms, selection, words));
    return [node('div', { className: 'stack' }, children)];
  }

  #entityMulti(label, key, words, options = entityOptions(this.#hass)) {
    const filter = node('input', { type: 'search', placeholder: words.searchable });
    const picker = node('select', { multiple: true, size: 4 });
    filter.setAttribute('aria-label', words.searchable + ' · ' + label);
    const refresh = () => {
      const query = filter.value.trim().toLocaleLowerCase();
      const active = new Set(this.#config[key] ?? []);
      picker.replaceChildren(...options
        .filter(item => active.has(item[0]) || !query || item[1].toLocaleLowerCase().includes(query))
        .map(([id, title]) => node('option', { value: id, textContent: title, selected: active.has(id) })));
    };
    filter.addEventListener('input', refresh);
    picker.addEventListener('change', () => this.#commit({ [key]: [...picker.selectedOptions].map(item => item.value) }));
    refresh();
    return node('div', { className: 'stack' }, [filter, field(label, picker)]);
  }

  #shortcutPanel(words, language) {
    this.#refreshShortcutRoutes = undefined;
    const rooms = discoverRooms(this.#config, this.#hass, language);
    if (!rooms.length) return [node('p', { textContent: words.noShortcutRooms })];
    const room = rooms.find(item => item.id === this.#shortcutRoom) ?? rooms[0];
    const current = this.#config.room_shortcuts ?? {};
    const chosen = Object.hasOwn(current, room.id) && Array.isArray(current[room.id]) ? current[room.id] : null;
    const roomInput = select(rooms.map(item => [item.id, item.name]), room.id);
    roomInput.dataset.shortcutRoom = '';
    const list = node('div', { className: 'grid', hidden: true });
    const details = node('fieldset', { className: 'stack' });
    const nameCounts = new Map();
    for (const device of room.entities) {
      const name = device.name || device.entity;
      nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
    }
    const deviceName = device => {
      const name = device.name || device.entity;
      return nameCounts.get(name) > 1 ? name + ' (' + device.entity + ')' : name;
    };
    let inputs = [];
    let fields;
    const renderDetails = () => {
      const selected = list.hidden ? undefined : inputs.map(input => input.value).filter(Boolean);
      const scope = { ...room, shortcuts: selected };
      const override = this.#roomOverride(room.id);
      const excluded = new Set(configuredIds(override.shortcut_no_details));
      const targets = normalizeShortcutDetailEntities(scope, override.shortcut_detail_entities);
      const panels = shortcutPanelOptions(this.#config);
      const routes = normalizeShortcutDetailRoutes(scope, override.shortcut_detail_routes, panels);
      const panelChoices = panels.map(({ id, label, kind }) =>
        ['panel:' + id, words.shortcutPanel.replace('{name}', label || languages[language][kind] || id)]);
      const controls = [];
      const commit = next => {
        const overrides = { ...this.#config.room_overrides };
        if (Object.keys(next).length) overrides[room.id] = next;
        else delete overrides[room.id];
        this.#commit({ room_overrides: overrides });
      };
      for (const device of roomShortcutDevices(scope)) {
        const id = device.entity;
        const name = deviceName(device);
        const suppressible = supportsShortcutWithoutDetails(device);
        const options = [['', words.shortcutBayitDetails],
          ...(supportsNativeShortcutDetails(device) ? [['native', words.shortcutNativeDetails]] : []),
          ...panelChoices,
          ...room.entities.filter(item => item.entity !== id).map(item => [item.entity, deviceName(item)]),
        ];
        const input = options.length > 1 ? select(options, routes[id] ?? targets[id] ?? '') : undefined;
        if (suppressible) {
          controls.push(checkbox(words.shortcutDetailsDevice.replace('{name}', name), !excluded.has(id), enabled => {
            const next = { ...this.#roomOverride(room.id) };
            const ignored = new Set(configuredIds(next.shortcut_no_details));
            if (enabled) ignored.delete(id);
            else ignored.add(id);
            if (ignored.size) next.shortcut_no_details = [...ignored];
            else delete next.shortcut_no_details;
            if (input) input.disabled = !enabled;
            commit(next);
          }));
        }
        if (!input) continue;
        input.disabled = suppressible && excluded.has(id);
        input.addEventListener('change', () => {
          const next = { ...this.#roomOverride(room.id) };
          const routeMap = { ...next.shortcut_detail_routes };
          const targetMap = { ...next.shortcut_detail_entities };
          delete routeMap[id];
          delete targetMap[id];
          if (input.value === 'native' || panelChoices.some(([value]) => value === input.value)) routeMap[id] = input.value;
          else if (room.entities.some(item => item.entity === input.value && item.entity !== id)) targetMap[id] = input.value;
          if (Object.keys(routeMap).length) next.shortcut_detail_routes = routeMap;
          else delete next.shortcut_detail_routes;
          if (Object.keys(targetMap).length) next.shortcut_detail_entities = targetMap;
          else delete next.shortcut_detail_entities;
          commit(next);
        });
        controls.push(field(words.shortcutDestination.replace('{name}', name), input));
      }
      details.hidden = !controls.length;
      details.replaceChildren(node('legend', { textContent: words.shortcutDetails }), ...controls);
    };
    this.#refreshShortcutRoutes = renderDetails;
    const refresh = () => {
      const selected = new Set(inputs.map(input => input.value).filter(Boolean));
      for (const input of inputs) {
        for (const item of input.options) {
          item.disabled = item.value !== input.value && selected.has(item.value);
        }
      }
    };
    const save = () => {
      this.#commit({ room_shortcuts: {
        ...this.#config.room_shortcuts, [room.id]: inputs.map(input => input.value).filter(Boolean),
      } });
      renderDetails();
    };
    const showManual = () => {
      if (!fields) {
        const options = new Map(room.entities.map(item => [item.entity, item.name || item.entity]));
        for (const id of chosen ?? []) {
          if (typeof id === 'string' && !options.has(id)) options.set(id, id);
        }
        const choices = [['', words.none], ...options];
        inputs = Array.from({ length: MAX_ROOM_SHORTCUTS }, (_, index) => select(choices, chosen?.[index] ?? ''));
        for (const input of inputs) input.addEventListener('change', () => { refresh(); save(); });
        fields = inputs.map((input, index) => field(words.shortcut + ' ' + (index + 1), input));
        refresh();
      }
      list.append(...fields);
      list.hidden = false;
    };
    if (chosen != null) showManual();
    renderDetails();
    roomInput.addEventListener('change', () => {
      this.#shortcutRoom = roomInput.value;
      this.render();
      this.shadowRoot.querySelector('[data-shortcut-room]')?.focus({ preventScroll: true });
    });
    const automatic = checkbox(words.automaticShortcuts, chosen == null, enabled => {
      if (enabled) {
        list.hidden = true;
        list.replaceChildren();
        const next = { ...this.#config.room_shortcuts };
        delete next[room.id];
        this.#commit({ room_shortcuts: next });
        renderDetails();
      } else {
        showManual();
        save();
      }
    });
    return [node('p', { textContent: words.shortcutHint }), field(words.shortcutRoom, roomInput), automatic, list, details];
  }

  #profilePanel(words) {
    const profiles = Array.isArray(this.#config.profiles) ? this.#config.profiles : [];
    const children = [node('p', { textContent: words.hint })];
    for (const profile of profiles) {
      if (!profile?.entity) continue;
      children.push(node('div', { className: 'record' }, [
        node('span', { textContent: profile.name || this.#hass.states?.[profile.entity]?.attributes?.friendly_name || profile.entity }),
        button(words.edit, () => { this.#profileEditing = profile; this.render(); }),
        button(words.remove, () => {
          if (this.#profileEditing?.entity === profile.entity) this.#profileEditing = undefined;
          this.#commit({ profiles: profiles.filter(item => item.entity !== profile.entity) });
          this.render();
        }),
      ]));
    }

    if (this.#profileEditing == null) {
      children.push(node('div', { className: 'actions' }, [
        button(words.add, () => { this.#profileEditing = {}; this.render(); }),
      ]));
      return children;
    }

    const current = this.#profileEditing;
    const timed = current.timed ?? {};
    const entity = select([['', words.choose], ...entityOptions(this.#hass, new Set(PROFILE_DOMAINS))], current.entity || '');
    if (current.entity && !entity.value) {
      entity.append(option(current.entity, current.entity));
      entity.value = current.entity;
    }
    const kind = select([['heater', words.heater], ['boiler', words.boiler], ['climate', words.climate]], current.kind || 'heater');
    const title = node('input', { value: current.name ?? '', maxLength: 80 });
    const swingFallback = select([['', words.none]], '');
    const swingField = field(words.swingFallback, swingFallback);
    const swingLabels = languages[languageFor(this.#config.locale, this.#hass)];
    let swingEntity;
    let swingMode;
    swingFallback.addEventListener('change', () => { swingMode = swingFallback.value; });
    const syncSwing = id => {
      if (id !== swingEntity) {
        swingEntity = id;
        swingMode = id === current.entity ? normalizeUnreportedSwingMode(current.unreported_swing_mode) : undefined;
      }
      const options = id ? getDeviceModel({ entity: id }, this.#hass.states).actions.set_swing_mode?.options ?? [] : [];
      swingField.hidden = !options.length;
      swingFallback.replaceChildren(option('', words.none), ...options.map(value =>
        option(value, climateOptionLabel('set_swing_mode', value, options, key => swingLabels[key] ?? key))));
      swingFallback.value = options.includes(swingMode) ? swingMode : '';
    };
    const entityInput = (domain, value, filter = () => true) => {
      const choices = entityOptions(this.#hass, new Set([domain])).filter(([id]) => filter(id));
      if (value && !choices.some(([id]) => id === value)) choices.unshift([value, value]);
      return select([['', words.none], ...choices], value || '');
    };
    const level = entityInput('number', current.level_entity);
    const levelSteps = node('input', { type: 'number', min: '2', max: '12', value: String(current.level_steps ?? '') });
    const levelRead = entityInput('input_number', current.level_read_entity);
    const levelSelect = entityInput('script', current.level_select_script);
    const levelPreselect = entityInput('input_number', current.level_preselect_entity);
    const levelSelectField = field(words.levelSelect, levelSelect);
    const levelPreselectField = field(words.levelPreselect, levelPreselect);
    const levelPreselectHint = node('small', {
      id: levelPreselect.getAttribute('aria-labelledby') + '-hint', textContent: words.levelPreselectHint,
    });
    levelPreselectField.append(levelPreselectHint);
    levelPreselect.setAttribute('aria-describedby', levelPreselectHint.id);
    const fanLevels = node('div', { className: 'grid' }, [
      field(words.levelSteps, levelSteps), field(words.levelRead, levelRead), levelSelectField, levelPreselectField,
    ]);

    const timerSource = select([['server', words.serverTimer], ['simple', words.simpleTimer]], timed.simple_timer_entity ? 'simple' : 'server');
    const start = entityInput('script', timed.start_script);
    const stop = entityInput('script', timed.stop_script);
    const timer = entityInput('timer', timed.timer_entity);
    const durationField = node('input', { value: timed.duration_field || 'duration', maxLength: 40 });
    const serverFields = node('div', { className: 'stack' }, [
      field(words.start, start), field(words.stop, stop), field(words.timer, timer), field(words.durationField, durationField),
    ]);
    const scheduleSave = entityInput('script', current.schedule?.save_script);
    const scheduleDelete = entityInput('script', current.schedule?.delete_script);
    const schedule = node('div', { className:'stack' }, [field(words.scheduleSave,scheduleSave), field(words.scheduleDelete,scheduleDelete)]);
    const attributesFor = id => this.#hass.states?.[id]?.attributes;
    const simple = entityInput('sensor', timed.simple_timer_entity, id => {
      const attributes = attributesFor(id);
      return typeof attributes?.switch_entity_id === 'string' && typeof attributes.timer_state === 'string';
    });
    const target = select([['', words.none]], '');
    const targetField = field(words.simpleTimerTarget, target);
    const resetUsageInput = node('input', { type: 'checkbox', checked: timed.allow_daily_usage_reset === true });
    const resetUsage = node('label', { className: 'check' }, [resetUsageInput, words.allowDailyUsageReset]);
    const simpleFields = node('div', { className: 'stack' }, [field(words.simpleTimerDevice, simple), targetField, resetUsage]);
    const boilerDetailsInput = node('input', { type: 'checkbox', checked: current.boiler_timer_with_details === true });
    const boilerDetails = node('label', { className: 'check' }, [boilerDetailsInput, words.boilerTimerWithDetails]);
    const usage = entityInput('sensor', timed.daily_usage_entity);
    const presets = node('input', {
      value: Array.isArray(timed.presets) ? timed.presets.join(', ') : '',
      placeholder: '15, 30, 45', maxLength: 50,
    });
    const minutes = value => node('input', { type: 'number', min: '1', max: '360', value: String(value) });
    const min = minutes(timed.min_minutes ?? 15);
    const max = minutes(timed.max_minutes ?? 60);
    const step = minutes(timed.step_minutes ?? 15);
    const error = node('p', { className: 'error', hidden: true, textContent: words.invalid });
    error.setAttribute('role', 'alert');

    const sync = () => {
      const domain = entity.value.split('.')[0];
      kind.querySelector('[value="climate"]').disabled = domain !== 'climate';
      if (domain !== 'climate' && kind.value === 'climate') kind.value = 'heater';
      syncSwing(kind.value === 'climate' ? entity.value : '');
      const fanHeater = domain === 'fan' && kind.value === 'heater';
      fanLevels.hidden = !fanHeater || Boolean(level.value);
      const usingSimple = timerSource.value === 'simple';
      levelSelectField.hidden = !usingSimple;
      serverFields.hidden = usingSimple;
      simpleFields.hidden = !usingSimple;
      resetUsage.hidden = !simple.value || Boolean(usage.value && usage.value !== simple.value);
      schedule.hidden = kind.value !== 'boiler' || !usingSimple;
      boilerDetails.hidden = kind.value !== 'boiler' || !(usingSimple ? simple.value : timer.value);
      const prefix = kind.value === 'climate' && domain === 'climate' ? 'input_boolean.' : fanHeater ? 'switch.' : '';
      const linked = attributesFor(simple.value)?.switch_entity_id ?? (simple.value === timed.simple_timer_entity ? timed.simple_timer_target : undefined);
      const compatible = prefix && typeof linked === 'string' && linked.startsWith(prefix) && linked !== entity.value;
      levelPreselectField.hidden = !usingSimple || !compatible;
      const name = compatible ? this.#hass.states?.[linked]?.attributes?.friendly_name || linked : '';
      target.replaceChildren(option('', words.none), ...(compatible ? [option(linked, name)] : []));
      targetField.hidden = !compatible;
      if (compatible) target.value = linked;
    };
    entity.addEventListener('change', () => {
      if (entity.value.split('.')[0] === 'climate' && entity.value !== current.entity) kind.value = 'climate';
      sync();
    });
    for (const control of [kind, level, timerSource, simple, timer, usage]) control.addEventListener('change', sync);
    sync();

    children.push(
      field(words.entity, entity), field(words.kind, kind), field(words.displayName, title), swingField,
      field(words.level, level), fanLevels,
      field(words.timerSource, timerSource), serverFields, simpleFields, boilerDetails, schedule,
      field(words.dailyUsage, usage), field(words.presets, presets),
      node('div', { className: 'grid' }, [field(words.min, min), field(words.max, max), field(words.step, step)]),
      error,
      node('div', { className: 'actions' }, [
        button(words.save, () => {
          const usingSimple = timerSource.value === 'simple';
          const linked = attributesFor(simple.value)?.switch_entity_id;
          if (usingSimple && !simple.value || usingSimple && linked && linked !== (target.value || entity.value)) {
            error.textContent = words.timerLinkError;
            error.hidden = false;
            simple.focus();
            return;
          }
          const presetValues = presets.value.trim() ? presets.value.trim().split(/[,;\s]+/).map(Number)
            : Array.isArray(timed.presets) ? [] : undefined;
          const levelSelectId = !fanLevels.hidden && usingSimple ? levelSelect.value : '';
          const nextLevelId = !fanLevels.hidden && !levelPreselectField.hidden ? levelPreselect.value : '';
          const profile = normalizeProfile({
            entity: entity.value, kind: kind.value, name: title.value, level_entity: level.value,
            level_steps: levelSteps.valueAsNumber, level_read_entity: levelRead.value, level_select_script: levelSelectId,
            level_preselect_entity: nextLevelId, unreported_swing_mode: swingMode,
            boiler_timer_with_details: !boilerDetails.hidden && boilerDetailsInput.checked,
            schedule: {save_script:scheduleSave.value,delete_script:scheduleDelete.value},
            timed: {
              ...(usingSimple
                ? { simple_timer_entity: simple.value, simple_timer_target: target.value }
                : { start_script: start.value, stop_script: stop.value, timer_entity: timer.value }),
              daily_usage_entity: usage.value, presets: presetValues,
              allow_daily_usage_reset: usingSimple && !resetUsage.hidden && resetUsageInput.checked,
              duration_field: durationField.value, min_minutes: min.valueAsNumber,
              max_minutes: max.valueAsNumber, step_minutes: step.valueAsNumber,
            },
          });
          if (!profile) {
            error.textContent = words.invalid;
            error.hidden = false;
            entity.focus();
            return;
          }
          if (levelSelectId && profile.level_select_script !== levelSelectId) {
            error.textContent = words.levelSelectError;
            error.hidden = false;
            levelRead.focus();
            return;
          }
          if (nextLevelId && profile.level_preselect_entity !== nextLevelId) {
            error.textContent = words.levelPreselectError;
            error.hidden = false;
            levelSteps.focus();
            return;
          }
          if (presetValues?.length && profile.timed?.presets?.length !== new Set(presetValues).size) {
            error.textContent = words.presetError;
            error.hidden = false;
            presets.focus();
            return;
          }
          this.#profileEditing = undefined;
          this.#commit({ profiles: [...profiles.filter(item => item.entity !== current.entity && item.entity !== profile.entity), profile] });
          this.render();
        }),
        button(words.clear, () => { this.#profileEditing = undefined; this.render(); }),
      ]),
    );
    return children;
  }

  #profilePane(words) {
    const editing = this.#profileEditing;
    const profiles = this.#config.profiles;
    const previous = this.#profileDraftBody;
    if (editing && previous?.editing === editing && previous.words === words && previous.profiles === profiles) {
      return [previous.body];
    }
    const body = node('div', { className: 'stack' }, this.#profilePanel(words));
    this.#profileDraftBody = editing ? { editing, profiles, words, body } : undefined;
    return [body];
  }

  #lightEffectPanel(rooms, words) {
    const lights = new Map();
    for (const { entities } of rooms) {
      for (const device of entities) {
        if (device.entity.startsWith('light.') && device.role !== 'status') lights.set(device.entity, device);
      }
    }
    const panel = node('div', { className: 'stack' });
    const configured = () => this.#config.light_effect_groups ?? {};
    const hidden = id => Array.isArray(this.#config.hidden_entities) && this.#config.hidden_entities.includes(id);
    const optionsFor = id => lights.has(id) && !hidden(id) ? nativeLightEffects(lights.get(id), this.#hass.states) : [];
    const groupsFor = id => normalizeLightEffectGroups(Object.hasOwn(configured(), id) ? configured()[id] : []);
    const selectedLight = () => this.#lightEffectEntity;
    let signature;

    const setGroups = groups => {
      const next = { ...configured() };
      const normalized = normalizeLightEffectGroups(groups);
      if (normalized.length) next[selectedLight()] = normalized;
      else delete next[selectedLight()];
      this.#commit({ light_effect_groups: next });
    };
    const focus = key => {
      if (!key) return;
      const controls = [...panel.querySelectorAll('[data-effect-focus], [data-room-focus]')];
      const control = controls.find(item =>
        !item.disabled && (item.dataset.effectFocus === key || item.dataset.roomFocus === key));
      control?.focus({ preventScroll: true });
    };
    const mark = (control, key) => {
      control.dataset.effectFocus = key;
      return control;
    };

    const refresh = (force = false, focusKey) => {
      const eligible = [...lights.values()].flatMap(device => {
        if (hidden(device.entity)) return [];
        const options = optionsFor(device.entity);
        const hasGroups = groupsFor(device.entity).length > 0;
        return options.length || hasGroups ? [{ device, options }] : [];
      });
      const entity = selectedLight();
      const source = eligible.find(item => item.device.entity === entity);
      const nextSignature = JSON.stringify([eligible.map(({ device, options }) => [device.entity, !!options.length]), source?.options]);
      if (!force && (signature === nextSignature || panel.contains(this.shadowRoot.activeElement) &&
          this.shadowRoot.activeElement?.matches('input[type=text]'))) return;
      signature = nextSignature;
      if (!eligible.length) {
        panel.replaceChildren(node('p', { textContent: words.noEffectLights }));
        return;
      }
      const devicePicker = mark(select([['', words.choose], ...eligible.map(({ device, options }) => [
        device.entity, (device.name || device.entity) + (options.length ? '' : ' · ' + words.unavailableEffect),
      ])], source ? entity : ''), 'light');
      devicePicker.addEventListener('change', () => {
        this.#lightEffectEntity = devicePicker.value;
        this.#lightEffectGroup = 0;
        refresh(true, 'light');
      });
      const fields = [field(words.effectLight, devicePicker)];
      if (!source) {
        panel.replaceChildren(...fields);
        focus(focusKey);
        return;
      }

      const groups = groupsFor(entity);
      const index = this.#lightEffectGroup;
      const group = groups[index];
      const reported = new Set(source.options);
      const categoryPicker = mark(select([
        ...groups.map(({ title }, index) => [String(index), title]),
        ...(source.options.length ? [['new', words.newEffectGroup]] : []),
      ], group ? String(index) : 'new'), 'category');
      categoryPicker.addEventListener('change', () => {
        this.#lightEffectGroup = categoryPicker.value === 'new' ? groups.length : Number(categoryPicker.value);
        refresh(true, 'category');
      });
      if (groups.length) fields.push(field(words.effectGroup, categoryPicker));
      if (!source.options.length) fields.push(node('p', { textContent: words.noEffectOptions }));

      const name = mark(node('input', { type: 'text', value: group?.title ?? '', maxLength: 80 }), 'name');
      const remaining = source.options.filter(effect => !group?.effects.some(item => item.effect === effect));
      if (group || remaining.length) fields.push(field(words.effectGroupName, name));
      if (group) {
        const update = (next, target) => {
          setGroups(groups.map((entry, i) => i === index ? next : entry));
          if (target) refresh(true, target);
        };
        name.addEventListener('input', () => {
          const liveGroup = groupsFor(entity)[index];
          const title = name.value.trim();
          if (!title || title === liveGroup.title) return;
          update({ ...liveGroup, title });
          if (categoryPicker.selectedOptions[0]) categoryPicker.selectedOptions[0].textContent = title;
        });
        name.addEventListener('change', () => { name.value = groupsFor(entity)[index].title; });
        fields.push(orderedList(group.effects.map(item => ({
          id: item.effect, name: item.name || item.effect, item,
          secondary: [item.name && item.name !== item.effect ? item.effect : '', !reported.has(item.effect) ? words.unavailableEffect : '']
            .filter(Boolean).join(' · '),
        })), (items, target) => update({
          ...groupsFor(entity)[index], effects: items.map(({ item }) => item),
        }, target || 'category'), words, words.removeEffect, true, 'effect'));
        fields.push(node('div', { className: 'actions' }, [button(words.removeEffectGroup, () => {
          this.#lightEffectGroup = Math.max(0, index - 1);
          setGroups(groups.filter((_, i) => i !== index));
          refresh(true, groups.length > 1 ? 'category' : 'name');
        })]));
      }
      if (remaining.length) {
        const add = addPicker(words.availableEffect, remaining.map(effect => [effect, effect]),
          group ? words.addEffect : words.addEffectGroup, words.chooseEffect, effect => {
            if (!optionsFor(entity).includes(effect)) {
              refresh(true, 'category');
              return;
            }
            if (group) {
              const liveGroup = groupsFor(entity)[index];
              setGroups(groupsFor(entity).map((entry, i) => i === index
                ? { ...liveGroup, effects: [...liveGroup.effects, { effect }] } : entry));
            } else {
              const title = name.value.trim();
              if (!title) return name.focus();
              this.#lightEffectGroup = groups.length;
              setGroups([...groups, { title, effects: [{ effect }] }]);
            }
            refresh(true, 'add-effect');
          });
        mark(add.input, 'add-effect');
        fields.push(add.wrapper);
      }
      panel.replaceChildren(...fields);
      focus(focusKey);
    };
    this.#refreshLightEffects = refresh;
    refresh(true);
    return panel;
  }

  #wallpaperPanel(words, language) {
    const current = () => normalizeSharedWallpapers(this.#config.shared_wallpapers);
    const background = select([], '');
    const updateBackground = () => {
      const choices = [
        ...Object.entries(BACKGROUNDS).map(([id, names]) => [id, names[language]]),
        ...current().map(({ id, name }) => [id, name]),
      ];
      background.replaceChildren(...choices.map(([id, name]) => option(id, name)));
      const selected = this.#config.background;
      background.value = choices.some(([id]) => id === selected) ? selected : 'aurora';
    };
    updateBackground();
    background.addEventListener('change', () => this.#commit({ background: background.value }));

    const editList = () => {
      const panel = node('div', { className:'stack' });
      let selected = '';
      function focus(target) {
        requestAnimationFrame(() => target.isConnected && target.focus({ preventScroll:true }));
      }
      const render = (focusChoice = false) => {
        const photos = current();
        const record = photos.find(photo => photo.id === selected);
        const picker = select([['', words.newWallpaper], ...photos.map(({id, name}) => [id, name])], record?.id ?? '');
        picker.addEventListener('change', () => { selected = picker.value; render(true); });
        const name = node('input', { value:record?.name ?? '', maxLength:80, required:true });
        const path = node('input', { value:record?.path ?? '', placeholder:'/local/wallpapers/photo.webp',
          maxLength:512, dir:'ltr', required:true });
        const preview = node('input', { value:record?.preview ?? '', placeholder:'/local/wallpapers/preview.webp',
          maxLength:512, dir:'ltr' });
        for (const input of [name, path, preview]) input.addEventListener('input', () => input.setCustomValidity(''));
        const save = button(record ? words.updateWallpaper : words.addWallpaper, () => {
          for (const item of [path, preview]) {
            const value = item.value.trim();
            if ((item.required || value) && !normalizeSharedWallpaperPath(value)) item.setCustomValidity(words.invalidWallpaperPath);
          }
          if (!name.value.trim()) name.setCustomValidity(words.wallpaperName);
          if (![name, path, preview].every(input => input.reportValidity())) return;
          const random = record ? null : crypto.getRandomValues(new Uint32Array(2));
          const id = record?.id ?? 'shared-' + Array.from(random, value => value.toString(36)).join('-');
          const [photo] = normalizeSharedWallpapers([{ id, name:name.value, path:path.value.trim(), preview:preview.value.trim() }]);
          if (!photo) return;
          selected = id;
          this.#commit({ shared_wallpapers:record ? photos.map(item => item.id === id ? photo : item) : [...photos, photo] });
          updateBackground();
          render(true);
        });
        const actions = node('div', { className:'actions' }, [save]);
        if (record) actions.append(button(words.removeWallpaper, () => {
          selected = '';
          this.#commit({
            shared_wallpapers:photos.filter(photo => photo.id !== record.id),
            ...(this.#config.background === record.id && { background:'aurora' }),
          });
          updateBackground();
          render(true);
        }));
        panel.replaceChildren(field(words.sharedWallpaperItem, picker), field(words.wallpaperName, name),
          field(words.wallpaperPath, path), field(words.wallpaperPreview, preview), actions);
        if (focusChoice) focus(picker);
      };
      render();
      return [node('p', { textContent:words.wallpaperHint }), panel];
    };

    return [field(words.background, background),
      disclosure(words.sharedWallpaper, this.#open.sharedWallpapers, open => { this.#open.sharedWallpapers = open; }, editList)];
  }

  render() {
    if (!this.isConnected) return;
    const focused = this.shadowRoot.activeElement;
    const language = languageFor(this.#config.locale, this.#hass);
    const words = WORDS[language];
    const title = node('input', { value: this.#config.title ?? '', maxLength: 80 });
    title.addEventListener('change', () => this.#commit({ title: title.value.trim() }));

    const locale = select([['auto', words.automatic], ['en', 'English'], ['he', 'עברית']], this.#config.locale ?? 'auto');
    locale.addEventListener('change', () => { this.#commit({ locale: locale.value }); this.render(); });

    const appearance = (label, key, options, fallback) => {
      const input = select(options, this.#config[key] ?? fallback);
      input.addEventListener('change', () => this.#commit({ [key]: input.value }));
      return field(label, input);
    };
    const pane = (text, key, build) => disclosure(text, this.#open[key], open => { this.#open[key] = open; }, build);
    const lightEffects = node('div');
    this.#refreshLightEffects = undefined;
    const showLightEffects = () => {
      if (!lightEffects.childElementCount) {
        lightEffects.append(this.#lightEffectPanel(discoverRooms(this.#config, this.#hass, language), words));
      }
    };
    if (this.#open.lightEffects) showLightEffects();
    const form = node('form', { dir: language === 'he' ? 'rtl' : 'ltr' }, [
      field(words.title, title), field(words.language, locale),
      pane(words.areas, 'rooms', () => this.#roomsPanel(words, language)),
      pane(words.appearance, 'appearance', () =>
        [node('div', { className: 'stack' }, [
          ...this.#wallpaperPanel(words, language),
          appearance(words.layout, 'layout', [['classic', words.classic], ['header', words.header]], 'classic'),
          appearance(words.shape, 'shape', [['soft', words.soft], ['circle', words.circle], ['square', words.square]], 'soft'),
          checkbox(words.fullscreen, this.#config.fullscreen === true, value => this.#commit({fullscreen:value})),
        ])]),
      pane(words.toolbar, 'toolbar', () => [node('div', {}, [buildToolbarEditor({
        config:this.#config, hass:this.#hass, locale:language, viewState:this.#toolbarView,
        onChange:value=>this.#commit({toolbar:value}),
      })])]),
      pane(words.devices, 'devices', () => {
        const options = entityOptions(this.#hass);
        return [this.#entityMulti(words.hidden, 'hidden_entities', words, options),
          this.#entityMulti(words.included, 'included_entities', words, options)];
      }),
      pane(words.overview, 'overview', () => {
        const rooms = discoverRooms(this.#config, this.#hass, language);
        const options = rooms.flatMap(room =>
          room.entities.map(device => [device.entity, (device.name || device.entity) + ' · ' + room.name]));
        return [node('p', { textContent: words.overviewHint }), this.#entityMulti(words.overviewDevices, 'overview_entities', words, options)];
      }),
      pane(words.shortcuts, 'shortcuts', () =>
        [node('div', { className: 'stack' }, this.#shortcutPanel(words, language))]),
      disclosure(words.lightEffects, this.#open.lightEffects, open => {
        this.#open.lightEffects = open;
        if (open) showLightEffects();
        else {
          lightEffects.replaceChildren();
          this.#refreshLightEffects = undefined;
        }
      }, [lightEffects]),
      pane(words.profiles, 'profiles', () => this.#profilePane(words)),
    ]);
    form.addEventListener('submit', event => event.preventDefault());
    this.shadowRoot.replaceChildren(node('style', { textContent: CSS + ROOM_CSS }), form);
    if (focused && this.shadowRoot.contains(focused)) focused.focus({ preventScroll: true });
  }
}
