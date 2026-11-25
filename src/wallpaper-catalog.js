export const catalog = Object.freeze({
  design_default: {
    en: 'Design default', he: 'ברירת מחדל', group: 'basic',
    background: `
      radial-gradient(ellipse at 85% 0%, #454545 0%, transparent 55%),
      linear-gradient(155deg,#1B1B1B,#090909)`,
  },
  solid: {
    en: 'Solid', he: 'אחיד', group: 'basic',
    background: '#141414',
  },
  blue_glow: {
    en: 'Blue glow', he: 'אור כחול', group: 'basic',
    background: `
      radial-gradient(ellipse at 85% 0%, #294A76 0%, transparent 55%),
      linear-gradient(155deg,#101E35,#080D1C)`,
  },
  warm_glow: {
    en: 'Warm glow', he: 'אור חם', group: 'basic',
    background: `
      radial-gradient(ellipse at 15% 0%, #604333 0%, transparent 55%),
      linear-gradient(155deg,#211A20,#100F19)`,
  },
  nature_tones: {
    en: 'Nature tones', he: 'טבע', group: 'basic',
    background: `
      radial-gradient(ellipse at 85% 4%, #244D3C 0%, transparent 55%),
      linear-gradient(155deg,#10251F,#080F10)`,
  },
  deep_dark: {
    en: 'Deep dark', he: 'כהה עמוק', group: 'basic',
    background: 'linear-gradient(155deg,#151A28,#030407)',
  },
  aurora: {
    en: 'Aurora', he: 'זוהר צפוני', group: 'nature',
    background: `
      radial-gradient(ellipse at 78% -5%, rgba(145,250,199,.55) 0%, transparent 46%),
      radial-gradient(ellipse at 5% 40%, rgba(76,207,178,.37) 0%, transparent 47%),
      radial-gradient(ellipse at 80% 75%, rgba(125,103,230,.34) 0%, transparent 50%),
      linear-gradient(148deg, #092328 0%, #102c35 38%, #1a1738 68%, #080e1d 100%)`,
  },
  desert_sunset: {
    en: 'Desert sunset', he: 'שקיעה במדבר', group: 'nature',
    background: `
      radial-gradient(circle at 72% 20%, rgba(255,197,135,.88) 0%, rgba(245,129,104,.45) 12%, transparent 28%),
      linear-gradient(163deg, transparent 0% 50%, rgba(104,53,80,.72) 50.2% 61%, transparent 61.2%),
      linear-gradient(198deg, transparent 0% 57%, rgba(123,66,74,.78) 57.2% 72%, #31202c 72.2%),
      linear-gradient(170deg, #aa6272 0%, #e39279 34%, #653a52 66%, #211a2c 100%)`,
  },
  ocean_waves: {
    en: 'Ocean waves', he: 'גלי אוקיינוס', group: 'nature',
    background: `
      repeating-linear-gradient(165deg, transparent 0px, transparent 55px, rgba(122,222,229,.16) 57px, transparent 60px, transparent 112px),
      radial-gradient(ellipse at 80% 5%, rgba(81,209,224,.51), transparent 50%),
      linear-gradient(148deg, #0a5260 0%, #123b52 43%, #0a1c37 100%)`,
  },
  jade: {
    en: 'Misty forest', he: 'יער ערפילי', group: 'nature',
    background: `
      repeating-linear-gradient(90deg, transparent 0px, transparent 39px, rgba(6,27,25,.30) 40px, rgba(6,27,25,.30) 45px, transparent 46px, transparent 87px),
      radial-gradient(ellipse at 50% 32%, rgba(157,211,174,.30), transparent 58%),
      linear-gradient(180deg,#355b4c 0%,#193c35 47%,#0b211e 100%)`,
  },
  starlight: {
    en: 'Starlight', he: 'שמיים זרועי כוכבים', group: 'light',
    background: `
      radial-gradient(circle at 15% 16%, #fff 0 1px, transparent 2px),
      radial-gradient(circle at 76% 12%, #eef4ff 0 1.4px, transparent 2.2px),
      radial-gradient(circle at 37% 49%, #dbe7ff 0 1px, transparent 2px),
      radial-gradient(circle at 85% 62%, #fff 0 1px, transparent 2px),
      radial-gradient(ellipse at 70% 5%, #324b87 0%, transparent 55%),
      linear-gradient(155deg,#121f41,#070a1b 75%)`,
  },
  architecture: {
    en: 'Soft architecture', he: 'אדריכלות רכה', group: 'materials',
    background: `
      linear-gradient(125deg, transparent 0% 46%, rgba(204,184,169,.16) 46.1% 46.5%, transparent 46.6%),
      linear-gradient(55deg, transparent 0% 61%, rgba(238,224,210,.12) 61.1% 61.5%, transparent 61.6%),
      linear-gradient(125deg, #514948 0% 46%, #30343b 46.1% 71%, #1b222c 71.1% 100%)`,
  },
  modern_marble: {
    en: 'Modern marble', he: 'שיש מודרני', group: 'materials',
    background: `
      repeating-linear-gradient(130deg, transparent 0px, transparent 48px, rgba(217,204,181,.18) 49px, transparent 51px, transparent 93px, rgba(212,195,167,.09) 94px, transparent 96px),
      radial-gradient(ellipse at 10% 15%, #4f5456, transparent 60%),
      linear-gradient(135deg,#353a3c,#151c21)`,
  },
  clouds: {
    en: 'Cloud colors', he: 'ענני צבע', group: 'light',
    background: `
      radial-gradient(ellipse at 5% 8%, rgba(251,125,159,.59), transparent 47%),
      radial-gradient(ellipse at 100% 37%, rgba(125,148,255,.62), transparent 48%),
      radial-gradient(ellipse at 20% 90%, rgba(224,153,102,.38), transparent 46%),
      linear-gradient(160deg,#352337,#201f44 58%,#271a30)`,
  },
  urban_night: {
    en: 'Urban night', he: 'לילה אורבני', group: 'materials',
    background: `
      repeating-linear-gradient(90deg, transparent 0px, transparent 47px, rgba(133,166,201,.10) 48px, transparent 49px),
      repeating-linear-gradient(0deg, transparent 0px, transparent 47px, rgba(133,166,201,.10) 48px, transparent 49px),
      radial-gradient(ellipse at 75% 0%, #314760, transparent 60%),
      linear-gradient(150deg,#182532,#0a121b)`,
  },
  misty_lake: {
    en: 'Misty lake', he: 'אגם ערפילי', group: 'photos',
    background: 'linear-gradient(160deg,#364c5e,#142230 76%)',
    photo: {
      full: 'bayit9-wallpaper-misty-lake-full-8db692a7bdc7.webp',
      preview: 'bayit9-wallpaper-misty-lake-preview-b25f5a91b334.webp',
      overlay: { rgb: [5, 13, 20], start: .25, end: .55 },
    },
  },
  graphite_and_bronze: {
    en: 'Graphite and bronze', he: 'גרפיט וברונזה', group: 'photos',
    background: 'linear-gradient(145deg,#373940,#1c1818 78%)',
    photo: {
      full: 'bayit9-wallpaper-graphite-and-bronze-full-67ab0076cc1f.webp',
      preview: 'bayit9-wallpaper-graphite-and-bronze-preview-2b71cc9b0cca.webp',
      overlay: { rgb: [3, 5, 9], start: .10, end: .32 },
    },
  },
  mountain_lake: {
    en: 'Mountain lake', he: 'אגם בין הרים', group: 'nature',
    background: `
      radial-gradient(circle at 75% 16%,#a4bbcc 0 4%,transparent 4.3%),
      linear-gradient(158deg,transparent 0 43%,#3c5a65 43.2% 59%,transparent 59.2%),
      linear-gradient(202deg,transparent 0 52%,#233d4c 52.2% 70%,transparent 70.2%),
      linear-gradient(180deg,#273b50 0 63%,#1a5360 63.2%,#0a252e 100%)`,
  },
  tuscany: {
    en: 'Tuscany', he: 'טוסקנה', group: 'nature',
    background: `
      radial-gradient(circle at 24% 21%,#f3bf7c 0 5%,transparent 5.2%),
      linear-gradient(165deg,transparent 0 57%,#85624d 57.2% 68%,transparent 68.2%),
      linear-gradient(195deg,transparent 0 67%,#554537 67.2% 83%,#2b3029 83.2%),
      linear-gradient(180deg,#af796b,#d8a67f 48%,#735d4b 100%)`,
  },
  moonlit_night: {
    en: 'Moonlit night', he: 'ליל ירח', group: 'nature',
    background: `
      radial-gradient(circle at 70% 18%,#e3e9f3 0 6%,rgba(214,225,242,.16) 6.3%,transparent 15%),
      linear-gradient(155deg,transparent 0 62%,#202f51 62.2% 75%,transparent 75.2%),
      linear-gradient(205deg,transparent 0 68%,#14243d 68.2% 85%,#0a1529 85.2%),
      linear-gradient(180deg,#243c68,#101b38 80%)`,
  },
  tropical_shore: {
    en: 'Tropical shore', he: 'חוף טרופי', group: 'nature',
    background: `
      radial-gradient(ellipse at 76% 14%,rgba(238,206,153,.65),transparent 35%),
      linear-gradient(168deg,transparent 0 53%,rgba(75,170,168,.35) 53.2% 55%,transparent 55.2%),
      linear-gradient(158deg,transparent 0 67%,#88715e 67.2% 76%,#403a35 76.2%),
      linear-gradient(180deg,#32565d,#167e80 58%,#355d5d 100%)`,
  },
  dark_steel: {
    en: 'Dark steel', he: 'פלדה כהה', group: 'materials',
    background: `
      repeating-linear-gradient(102deg,rgba(255,255,255,.025) 0 1px,transparent 1px 4px),
      linear-gradient(135deg,#3a444d 0%,#1e2833 38%,#0c1219 73%,#26343e 100%)`,
  },
  limestone: {
    en: 'Limestone', he: 'אבן גיר', group: 'materials',
    background: `
      radial-gradient(ellipse at 18% 8%,rgba(214,192,164,.16),transparent 55%),
      repeating-linear-gradient(17deg,transparent 0 95px,rgba(237,223,200,.08) 96px,transparent 98px 180px),
      linear-gradient(140deg,#554e48,#292e30 74%)`,
  },
  architectural_arches: {
    en: 'Architectural arches', he: 'קשתות אדריכליות', group: 'materials',
    background: `
      radial-gradient(ellipse 50% 58% at 49% 82%,transparent 0 55%,rgba(223,195,162,.18) 55.4% 58%,transparent 58.4%),
      radial-gradient(ellipse 50% 58% at 49% 82%,transparent 0 72%,rgba(231,203,174,.10) 72.4% 75%,transparent 75.4%),
      linear-gradient(145deg,#675247,#322b30 72%,#1d222a)`,
  },
  minimal_concrete: {
    en: 'Minimal concrete', he: 'בטון מינימלי', group: 'materials',
    background: `
      linear-gradient(90deg,transparent 0 49.7%,rgba(245,245,245,.06) 49.8% 50.2%,transparent 50.3%),
      linear-gradient(180deg,transparent 0 39.7%,rgba(245,245,245,.05) 39.8% 40.2%,transparent 40.3%),
      linear-gradient(135deg,#363a3c,#23282c)`,
  },
  folded_silk: {
    en: 'Folded silk', he: 'משי מקופל', group: 'materials',
    background: `
      linear-gradient(152deg,transparent 0 31%,rgba(237,199,197,.14) 31.2%,transparent 40%),
      linear-gradient(28deg,transparent 0 47%,rgba(246,220,215,.12) 47.2%,transparent 60%),
      linear-gradient(145deg,#553e4b,#282538 78%)`,
  },
  neon_lights: {
    en: 'Neon lights', he: 'אורות ניאון', group: 'light',
    background: `
      linear-gradient(125deg,transparent 0 35%,rgba(28,219,220,.22) 35.2% 35.8%,transparent 36%),
      linear-gradient(55deg,transparent 0 60%,rgba(237,73,191,.22) 60.2% 60.8%,transparent 61%),
      radial-gradient(ellipse at 12% 10%,#244f67,transparent 55%),
      linear-gradient(155deg,#131c35,#21132d 80%)`,
  },
  deep_sapphire: {
    en: 'Deep sapphire', he: 'ספיר עמוק', group: 'light',
    background: `
      radial-gradient(ellipse at 12% 3%,rgba(53,136,216,.44),transparent 48%),
      linear-gradient(125deg,transparent 0 58%,rgba(121,181,234,.12) 58.2% 58.7%,transparent 59%),
      linear-gradient(160deg,#102c53,#080f22 78%)`,
  },
  violet_sunset: {
    en: 'Violet sunset', he: 'שקיעה סגולה', group: 'light',
    background: `
      radial-gradient(circle at 71% 26%,rgba(255,190,162,.82) 0 6%,rgba(245,144,160,.23) 6.3%,transparent 21%),
      linear-gradient(160deg,transparent 0 68%,#4d3054 68.2% 78%,#29243c 78.2%),
      linear-gradient(180deg,#6d4b70,#b87583 43%,#362c4c 90%)`,
  },
  glass_bubbles: {
    en: 'Glass bubbles', he: 'בועות זכוכית', group: 'light',
    background: `
      radial-gradient(circle at 83% 12%, transparent 0% 11%, rgba(192,220,255,.30) 11.4%, rgba(111,157,208,.10) 12%, transparent 24%),
      radial-gradient(circle at 17% 48%, transparent 0% 14%, rgba(237,196,255,.24) 14.3%, rgba(183,134,204,.08) 15%, transparent 29%),
      radial-gradient(circle at 86% 78%, rgba(157,225,226,.25), transparent 27%),
      linear-gradient(150deg,#283657,#151e37 65%,#182b3b)`,
  },
  mediterranean_coast: {
    en: 'Mediterranean coast', he: 'חוף ים תיכוני', group: 'photos',
    background: 'linear-gradient(165deg,#475f7c,#183754 76%)',
    photo: {
      full: 'bayit9-wallpaper-mediterranean-coast-full-6413808a3604.webp',
      preview: 'bayit9-wallpaper-mediterranean-coast-preview-43d7ffc5228c.webp',
    },
  },
  jade_stone: {
    en: 'Jade stone', he: 'אבן ירקן', group: 'materials',
    background: `
      linear-gradient(23deg,transparent 47%,rgba(173,203,159,.16) 47.5%,transparent 49%),
      linear-gradient(31deg,transparent 57%,rgba(149,180,162,.19) 57.5%,transparent 60%),
      radial-gradient(ellipse at 15% 9%,#5e8271,transparent 62%),
      linear-gradient(150deg,#315653 16%,#23403d 54%,#152323)`,
  },
  copper_dunes: {
    en: 'Copper dunes', he: 'דיונות נחושת', group: 'photos',
    background: 'linear-gradient(160deg,#784f43,#351e23 78%)',
    photo: {
      full: 'bayit9-wallpaper-copper-dunes-full-5ad08aa4f2d0.webp',
      preview: 'bayit9-wallpaper-copper-dunes-preview-13a5622d0d72.webp',
    },
  },
  light_through_blinds: {
    en: 'Light through blinds', he: 'אור דרך תריסים', group: 'light',
    background: `
      linear-gradient(133deg,transparent 0 24%,rgba(255,224,172,.24) 28% 30%,transparent 34% 38%,rgba(255,222,188,.12) 43% 45%,transparent 49% 54%,rgba(255,207,164,.12) 58% 60%,transparent 65%),
      radial-gradient(ellipse at 4% 6%,#b89e79,transparent 60%),
      linear-gradient(163deg,#81695a,#675957 53%,#3f3838)`,
  },
  frozen_horizon: {
    en: 'Frozen horizon', he: 'אופק קפוא', group: 'nature',
    background: `
      linear-gradient(167deg,transparent 0 55%,rgba(173,206,217,.20) 55.2%,transparent 69%),
      linear-gradient(187deg,transparent 0 64%,#3e677e 64.2%,#162d43 98%),
      radial-gradient(ellipse at 24% -8%,#b8cfda,transparent 58%),
      linear-gradient(165deg,#7897b0,#46718a 48%,#34495f 84%)`,
  },
  ink_on_paper: {
    en: 'Ink on paper', he: 'דיו על נייר', group: 'materials', darkInk: true,
    background: `
      radial-gradient(ellipse 57% 75% at 90% 84%,rgba(36,62,90,.84),rgba(60,104,130,.68) 46%,transparent 85%),
      radial-gradient(ellipse 90% 45% at 58% 105%,#4e6c7c,transparent 94%),
      linear-gradient(145deg,#cec7b2,#b1bcc0 51%,#879faf 89%)`,
  },
  lagoon: {
    en: 'Lagoon', he: 'לגונה', group: 'nature',
    background: `
      radial-gradient(ellipse at 98% 28%,#335c79,transparent 45%),
      radial-gradient(ellipse at 20% 72%,#11635d,transparent 58%),
      linear-gradient(138deg,#111e36 12%,#174152 75%,#142533)`,
  },
  dunes: {
    en: 'Dunes', he: 'דיונות', group: 'nature',
    background: `
      radial-gradient(ellipse at 86% 18%,#84543d,transparent 52%),
      radial-gradient(ellipse at 15% 85%,#59374a,transparent 55%),
      linear-gradient(146deg,#321f29 11%,#4c3334 66%,#241d32)`,
  },
  blue_hour: {
    en: 'Blue hour', he: 'השעה הכחולה', group: 'nature',
    background: `
      radial-gradient(circle at 72% 18%,#aec2da 0 4%,transparent 4.4%),
      linear-gradient(157deg,transparent 0 49%,#3c5967 49.3% 63%,transparent 63.3%),
      linear-gradient(203deg,transparent 0 56%,#223b50 56.3% 71%,transparent 71.3%),
      linear-gradient(180deg,#27384d 0 66%,#1c4c5c 66.3%,#102432)`,
  },
  graphite: {
    en: 'Graphite', he: 'גרפיט', group: 'materials',
    background: `
      radial-gradient(ellipse at 90% 16%,#464c52,transparent 50%),
      radial-gradient(ellipse at 20% 96%,#293c46,transparent 60%),
      linear-gradient(150deg,#1c2227,#16191d 78%)`,
  },
  bronze: {
    en: 'Brushed bronze', he: 'ברונזה מוברשת', group: 'materials',
    background: `
      repeating-linear-gradient(133deg,transparent 0 7px,#f4d5ad12 8px,transparent 9px 27px),
      linear-gradient(130deg,#251c1a 12%,#57504b 39%,#302724 53%,#4b3c35 76%,#1b1c22)`,
  },
  porcelain: {
    en: 'Porcelain', he: 'פורצלן', group: 'materials', darkInk: true,
    background: `
      repeating-linear-gradient(132deg,transparent 0 58px,#7e7d7a2a 59px,transparent 62px 98px),
      radial-gradient(ellipse at 12% 15%,#fff,transparent 60%),
      linear-gradient(135deg,#f6f5f0,#dedfdb)`,
  },
  evening: {
    en: 'Evening glow', he: 'זוהר ערב', group: 'light',
    background: `
      radial-gradient(ellipse at 5% 8%,#fb7d9f96,transparent 47%),
      radial-gradient(ellipse at 100% 37%,#7d94ff9e,transparent 48%),
      radial-gradient(ellipse at 20% 90%,#e0996661,transparent 46%),
      linear-gradient(160deg,#352337,#201f44 58%,#271a30)`,
  },
});

export const wallpaperGroups = Object.freeze({
  new: Object.freeze([
    'mediterranean_coast', 'jade_stone', 'copper_dunes',
    'light_through_blinds', 'frozen_horizon', 'ink_on_paper',
  ]),
  basic: Object.freeze([
    'design_default', 'solid', 'blue_glow', 'warm_glow', 'nature_tones',
    'deep_dark',
  ]),
  photos: Object.freeze([
    'misty_lake', 'graphite_and_bronze', 'mediterranean_coast', 'copper_dunes',
  ]),
  nature: Object.freeze([
    'mountain_lake', 'tuscany', 'moonlit_night', 'tropical_shore', 'desert_sunset',
    'ocean_waves', 'jade', 'starlight', 'frozen_horizon', 'aurora',
    'lagoon', 'dunes', 'blue_hour',
  ]),
  materials: Object.freeze([
    'dark_steel', 'limestone', 'architectural_arches', 'minimal_concrete', 'folded_silk',
    'architecture', 'modern_marble', 'urban_night', 'jade_stone', 'ink_on_paper',
    'graphite', 'bronze', 'porcelain',
  ]),
  light: Object.freeze([
    'neon_lights', 'deep_sapphire', 'violet_sunset', 'aurora', 'clouds',
    'glass_bubbles', 'light_through_blinds', 'starlight', 'evening',
  ]),
});

export const featuredWallpapers = Object.freeze([
  'mediterranean_coast', 'jade_stone', 'copper_dunes',
  'light_through_blinds', 'frozen_horizon', 'ink_on_paper',
  'aurora', 'desert_sunset', 'mountain_lake', 'ocean_waves',
  'architecture', 'clouds',
]);
