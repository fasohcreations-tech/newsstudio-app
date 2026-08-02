import type {
  ManglishCandidate,
  ManglishConvertResult,
  ManglishService,
} from "@/features/smart-editor/services/interfaces/editor-services";

/**
 * Mozhi-style Manglish → Malayalam.
 * Case-aware: t=ത T=ട, d=ദ D=ഡ, n=ന N=ണ, l=ല L=ള, r=ര R=റ
 * Lowercase-only input uses soft/dental defaults (how people type Manglish).
 */

/** Exact + alternate Latin spellings → Malayalam forms (best first). */
const LEXICON: Record<string, string[]> = {
  daivam: ["ദൈവം"],
  malayalam: ["മലയാളം"],
  malayaalam: ["മലയാളം"],
  vartha: ["വാർത്ത"],
  varthakal: ["വാർത്തകൾ"],
  varthaakal: ["വാർത്തകൾ"],
  vaartha: ["വാർത്ത"],
  news: ["വാർത്ത", "ന്യൂസ്"],
  kerala: ["കേരളം"],
  keralam: ["കേരളം"],
  thiruvananthapuram: ["തിരുവനന്തപുരം"],
  thiruvanandapuram: ["തിരുവനന്തപുരം"],
  trivandrum: ["തിരുവനന്തപുരം"],
  tvm: ["തിരുവനന്തപുരം"],
  kochi: ["കൊച്ചി"],
  cochin: ["കൊച്ചി"],
  kozhikode: ["കോഴിക്കോട്"],
  kozhikkode: ["കോഴിക്കോട്"],
  calicut: ["കോഴിക്കോട്"],
  thrissur: ["തൃശ്ശൂർ"],
  trichur: ["തൃശ്ശൂർ"],
  kannur: ["കണ്ണൂർ"],
  alappuzha: ["ആലപ്പുഴ"],
  alleppey: ["ആലപ്പുഴ"],
  kollam: ["കൊല്ലം"],
  palakkad: ["പാലക്കാട്"],
  malappuram: ["മലപ്പുറം"],
  pathanamthitta: ["പത്തനംതിട്ട"],
  idukki: ["ഇടുക്കി"],
  kasaragod: ["കാസർഗോഡ്"],
  wayanad: ["വയനാട്"],
  india: ["ഇന്ത്യ"],
  bharatham: ["ഭാരതം"],
  bharatam: ["ഭാരതം"],
  today: ["ഇന്ന്"],
  innu: ["ഇന്ന്"],
  yesterday: ["ഇന്നലെ"],
  innale: ["ഇന്നലെ"],
  tomorrow: ["നാളെ"],
  naale: ["നാളെ"],
  government: ["സർക്കാർ"],
  sarkar: ["സർക്കാർ"],
  sarcar: ["സർക്കാർ"],
  minister: ["മന്ത്രി"],
  manthri: ["മന്ത്രി"],
  mantri: ["മന്ത്രി"],
  police: ["പൊലീസ്"],
  court: ["കോടതി"],
  kodathi: ["കോടതി"],
  hospital: ["ആശുപത്രി"],
  aashupathri: ["ആശുപത്രി"],
  asupathri: ["ആശുപത്രി"],
  school: ["സ്കൂൾ"],
  college: ["കോളേജ്"],
  university: ["സർവകലാശാല"],
  rain: ["മഴ"],
  mazha: ["മഴ"],
  flood: ["വെള്ളപ്പൊക്കം"],
  vellappokkam: ["വെള്ളപ്പൊക്കം"],
  accident: ["അപകടം"],
  apakadam: ["അപകടം"],
  election: ["തിരഞ്ഞെടുപ്പ്"],
  thiranjeduppu: ["തിരഞ്ഞെടുപ്പ്"],
  namaskaram: ["നമസ്കാരം"],
  nanni: ["നന്ദി"],
  nandi: ["നന്ദി"],
  swagatham: ["സ്വാഗതം"],
  snehithare: ["സ്നേഹിതരേ"],
  pradhani: ["പ്രധാനി"],
  pradhanamanthri: ["പ്രധാനമന്ത്രി"],
  pradhanamantri: ["പ്രധാനമന്ത്രി"],
  mukhyamantri: ["മുഖ്യമന്ത്രി"],
  mukhyamanthri: ["മുഖ്യമന്ത്രി"],
  janadhipathyam: ["ജനാധിപത്യം"],
  janaadhipathyam: ["ജനാധിപത്യം"],
  report: ["റിപ്പോർട്ട്"],
  reporter: ["റിപ്പോർട്ടർ"],
  people: ["ജനങ്ങൾ"],
  janangal: ["ജനങ്ങൾ"],
  aalukal: ["ആളുകൾ"],
  alukal: ["ആളുകൾ"],
  kutti: ["കുട്ടി"],
  kuttikal: ["കുട്ടികൾ"],
  sthri: ["സ്ത്രീ"],
  veedu: ["വീട്"],
  vazhi: ["വഴി"],
  yogam: ["യോഗം"],
  theerumanam: ["തീരുമാനം"],
  therumanam: ["തീരുമാനം"],
  prashnam: ["പ്രശ്നം"],
  prasnam: ["പ്രശ്നം"],
  sahayam: ["സഹായം"],
  pradhanam: ["പ്രധാനം"],
  mukhya: ["മുഖ്യ"],
  jilla: ["ജില്ല"],
  zilla: ["ജില്ല"],
  samsthanam: ["സംസ്ഥാനം"],
  rajyam: ["രാജ്യം"],
  lokam: ["ലോകം"],
  samayam: ["സമയം"],
  raavile: ["രാവിലെ"],
  ravile: ["രാവിലെ"],
  raathri: ["രാത്രി"],
  rathri: ["രാത്രി"],
  varsham: ["വർഷം"],
  maasam: ["മാസം"],
  divasam: ["ദിവസം"],
  aazhcha: ["ആഴ്ച"],
  azhcha: ["ആഴ്ച"],
  dayavayi: ["ദയവായി"],
  athe: ["അതെ"],
  alla: ["അല്ല"],
  illa: ["ഇല്ല"],
  koode: ["കൂടെ"],
  ninnu: ["നിന്ന്"],
  kurichu: ["കുറിച്ച്"],
  shesham: ["ശേഷം"],
  mumbu: ["മുമ്പ്"],
  ippol: ["ഇപ്പോൾ"],
  ippo: ["ഇപ്പോൾ"],
  koodathe: ["കൂടാതെ"],
  valare: ["വളരെ"],
  valiya: ["വലിയ"],
  cheriya: ["ചെറിയ"],
  puthiya: ["പുതിയ"],
  pazhaya: ["പഴയ"],
  nalla: ["നല്ല"],
  mosham: ["മോശം"],
  paranju: ["പറഞ്ഞു"],
  ariyichu: ["അറിയിച്ചു"],
  vannu: ["വന്നു"],
  poyi: ["പോയി"],
  sambhavichu: ["സംഭവിച്ചു"],
  thudangi: ["തുടങ്ങി"],
  avasanichu: ["അവസാനിച്ചു"],
  maranam: ["മരണം"],
  vellam: ["വെള്ളം"],
  kadal: ["കടൽ"],
  nadi: ["നദി"],
  kshetram: ["ക്ഷേത്രം"],
  kshethram: ["ക്ഷേത്രം"],
  palli: ["പള്ളി"],
  adhyapakan: ["അധ്യാപകൻ"],
  vidyarthi: ["വിദ്യാർത്ഥി"],
  vidyaarthi: ["വിദ്യാർത്ഥി"],
  rogi: ["രോഗി"],
  vila: ["വില"],
  uthsavam: ["ഉത്സവം"],
  onam: ["ഓണം"],
  vishu: ["വിഷു"],
  cinema: ["സിനിമ"],
  paattu: ["പാട്ട്"],
  pattu: ["പാട്ട്"],
  sangeetham: ["സംഗീതം"],
  sangeetam: ["സംഗീതം"],
  mathsaram: ["മത്സരം"],
  vijayi: ["വിജയി"],
  vijayam: ["വിജയം"],
  nashtam: ["നഷ്ടം"],
  prathishedham: ["പ്രതിഷേധം"],
  panimudakku: ["പണിമുടക്ക്"],
  avashyam: ["ആവശ്യം"],
  aavashyam: ["ആവശ്യം"],
  prasthavana: ["പ്രസ്താവന"],
  vivaram: ["വിവരം"],
  uravidam: ["ഉറവിടം"],
  adhikari: ["അധികാരി"],
  anveshanam: ["അന്വേഷണം"],
  moshanam: ["മോഷണം"],
  kolapathakam: ["കൊലപാതകം"],
  akramanam: ["ആക്രമണം"],
  aakramanam: ["ആക്രമണം"],
  suraksha: ["സുരക്ഷ"],
  kalavastha: ["കാലാവസ്ഥ"],
  kaalavastha: ["കാലാവസ്ഥ"],
  munnariyippu: ["മുന്നറിയിപ്പ്"],
  njaan: ["ഞാൻ"],
  njan: ["ഞാൻ"],
  nammal: ["നമ്മൾ"],
  ningal: ["നിങ്ങൾ"],
  avar: ["അവർ"],
  athu: ["അത്"],
  ithu: ["ഇത്"],
  evide: ["എവിടെ"],
  enthu: ["എന്ത്"],
  enthanu: ["എന്താണ്"],
  enthaanu: ["എന്താണ്"],
  eppol: ["എപ്പോൾ"],
  engane: ["എങ്ങനെ"],
  aanu: ["ആണ്"],
  undu: ["ഉണ്ട്"],
  venda: ["വേണ്ട"],
  venam: ["വേണം"],
  amma: ["അമ്മ"],
  achan: ["അച്ഛൻ"],
  acchan: ["അച്ഛൻ"],
  chettan: ["ചേട്ടൻ"],
  chechi: ["ചേച്ചി"],
  kochu: ["കൊച്ചു"],
  periya: ["പെരിയ"],
  oru: ["ഒരു"],
  randu: ["രണ്ട്"],
  moonu: ["മൂന്ന്"],
  naalu: ["നാല്"],
  anju: ["അഞ്ച്"],
  aaru: ["ആറ്"],
  eazhu: ["ഏഴ്"],
  ezhu: ["ഏഴ്"],
  ettu: ["എട്ട്"],
  onpathu: ["ഒൻപത്"],
  pathu: ["പത്ത്"],
  kayi: ["കയ്യി"],
  kai: ["കൈ"],
  thalayil: ["തലയിൽ"],
  thala: ["തല"],
  kannu: ["കണ്ണ്"],
  vaay: ["വായ"],
  vay: ["വായ"],
  bhakshanam: ["ഭക്ഷണം"],
  choru: ["ചോറ്"],
  meen: ["മീൻ"],
  pazham: ["പഴം"],
  thenga: ["തേങ്ങ"],
  thennga: ["തേങ്ങ"],
  coffee: ["കോഫി"],
  chaaya: ["ചായ"],
  chaya: ["ചായ"],
  newspaper: ["പത്രം"],
  pathram: ["പത്രം"],
  television: ["ടെലിവിഷൻ"],
  radio: ["റേഡിയോ"],
  phone: ["ഫോൺ"],
  mobile: ["മൊബൈൽ"],
  internet: ["ഇന്റർനെറ്റ്"],
  computer: ["കമ്പ്യൂട്ടർ"],
  message: ["സന്ദേശം"],
  sandesham: ["സന്ദേശം"],
  question: ["ചോദ്യം"],
  chodyam: ["ചോദ്യം"],
  answer: ["ഉത്തരം"],
  utharam: ["ഉത്തരം"],
  work: ["ജോലി"],
  joli: ["ജോലി"],
  job: ["ജോലി"],
  money: ["പണം"],
  panam: ["പണം"],
  bank: ["ബാങ്ക്"],
  shop: ["കട"],
  kada: ["കട"],
  market: ["ചന്ത", "മാർക്കറ്റ്"],
  chantha: ["ചന്ത"],
  bus: ["ബസ്"],
  train: ["ട്രെയിൻ"],
  car: ["കാർ"],
  auto: ["ഓട്ടോ"],
  airport: ["എയർപോർട്ട്"],
  station: ["സ്റ്റേഷൻ"],
  office: ["ഓഫീസ്"],
  doctor: ["ഡോക്ടർ"],
  hospitalu: ["ആശുപത്രി"],
  medicine: ["മരുന്ന്"],
  marunnu: ["മരുന്ന്"],
  pain: ["വേദന"],
  vedana: ["വേദന"],
  fever: ["പനി"],
  pani: ["പനി"],
  cold: ["ജലദോഷം"],
  jaladosham: ["ജലദോഷം"],
  happy: ["സന്തോഷം"],
  santhosham: ["സന്തോഷം"],
  sad: ["ദുഃഖം"],
  dukham: ["ദുഃഖം"],
  love: ["സ്നേഹം"],
  sneham: ["സ്നേഹം"],
  friend: ["സുഹൃത്ത്", "കൂട്ടുകാരൻ"],
  suhruthu: ["സുഹൃത്ത്"],
  koottukaaran: ["കൂട്ടുകാരൻ"],
  home: ["വീട്"],
  schoolu: ["സ്കൂൾ"],
  class: ["ക്ലാസ്"],
  exam: ["പരീക്ഷ"],
  pareeksha: ["പരീക്ഷ"],
  result: ["ഫലം"],
  phalam: ["ഫലം"],
  god: ["ദൈവം"],
  amme: ["അമ്മേ"],
  enthina: ["എന്തിനാ"],
  enthinu: ["എന്തിന്"],
  aano: ["ആണോ"],
  alle: ["അല്ലേ"],
  mathi: ["മതി"],
  kuri: ["കുറി"],
  pinne: ["പിന്നെ"],
  appuram: ["അപ്പുറം"],
  ivide: ["ഇവിടെ"],
  avide: ["അവിടെ"],
  ange: ["അങ്ങേ"],
  inge: ["ഇങ്ങേ"],
  enikku: ["എനിക്ക്"],
  eniku: ["എനിക്ക്"],
  ningalkku: ["നിങ്ങൾക്ക്"],
  avarkku: ["അവർക്ക്"],
  namukk: ["നമുക്ക്"],
  namukku: ["നമുക്ക്"],
  parayu: ["പറയൂ"],
  kelkku: ["കേൾക്കൂ"],
  kelku: ["കേൾക്കൂ"],
  nokku: ["നോക്കൂ"],
  varu: ["വരൂ"],
  poku: ["പോകൂ"],
  cheyyu: ["ചെയ്യൂ"],
  tharu: ["തരൂ"],
  edukku: ["എടുക്കൂ"],
  eduku: ["എടുക്കൂ"],
  vaa: ["വാ"],
  po: ["പോ"],
  iri: ["ഇരി"],
  nilku: ["നിൽക്കൂ"],
  nilkku: ["നിൽക്കൂ"],
};

/** Independent vowels (Mozhi). Longer keys first via matcher. */
const IND_VOWELS: [string, string][] = [
  ["ee", "ഈ"],
  ["ii", "ഈ"],
  ["oo", "ഊ"],
  ["uu", "ഊ"],
  ["aa", "ആ"],
  ["ai", "ഐ"],
  ["au", "ഔ"],
  ["a", "അ"],
  ["e", "എ"],
  ["E", "ഏ"],
  ["i", "ഇ"],
  ["o", "ഒ"],
  ["O", "ഓ"],
  ["u", "ഉ"],
];

/** Dependent vowel signs. Empty string = inherent അ (no sign). */
const DEP_VOWELS: [string, string][] = [
  ["ee", "ീ"],
  ["ii", "ീ"],
  ["oo", "ൂ"],
  ["uu", "ൂ"],
  ["aa", "ാ"],
  ["ai", "ൈ"],
  ["au", "ൗ"],
  ["e", "െ"],
  ["E", "േ"],
  ["i", "ി"],
  ["o", "ൊ"],
  ["O", "ോ"],
  ["u", "ു"],
  ["a", ""],
];

/**
 * Consonants — Mozhi case rules.
 * Lowercase soft/dental defaults for Manglish.
 */
const CONSONANTS: [string, string][] = [
  ["nch", "ഞ്ച"],
  ["nj", "ഞ"],
  ["ng", "ങ"],
  ["nt", "ന്ത"],
  ["nth", "ന്ത"],
  ["nd", "ന്ദ"],
  ["nk", "ങ്ക"],
  ["mp", "മ്പ"],
  ["zh", "ഴ"],
  ["rh", "ഴ"],
  ["chh", "ഛ"],
  ["Ch", "ഛ"],
  ["ch", "ച"],
  ["th", "ത"],
  ["Th", "ഥ"],
  ["dh", "ധ"],
  ["Dh", "ഢ"],
  ["ph", "ഫ"],
  ["bh", "ഭ"],
  ["shh", "ഷ"],
  ["Sh", "ഷ"],
  ["sh", "ശ"],
  ["kh", "ഖ"],
  ["gh", "ഘ"],
  ["jh", "ഝ"],
  ["lh", "ള"],
  ["ksh", "ക്ഷ"],
  ["Rth", "ർത്ത"],
  ["rth", "ർത്ത"],
  ["rr", "റ്റ"],
  ["tt", "ട്ട"],
  ["dd", "ഡ്ഡ"],
  ["nn", "ന്ന"],
  ["mm", "മ്മ"],
  ["ll", "ല്ല"],
  ["LL", "ള്ള"],
  ["kk", "ക്ക"],
  ["pp", "പ്പ"],
  ["bb", "ബ്ബ"],
  ["cc", "ച്ച"],
  ["ss", "സ്സ"],
  ["k", "ക"],
  ["g", "ഗ"],
  ["c", "ക"],
  ["j", "ജ"],
  ["T", "ട"],
  ["t", "ത"],
  ["D", "ഡ"],
  ["d", "ദ"],
  ["N", "ണ"],
  ["n", "ന"],
  ["p", "പ"],
  ["b", "ബ"],
  ["m", "മ"],
  ["y", "യ"],
  ["R", "റ"],
  ["r", "ര"],
  ["L", "ള"],
  ["l", "ല"],
  ["v", "വ"],
  ["w", "വ"],
  ["s", "സ"],
  ["h", "ഹ"],
  ["f", "ഫ"],
  ["z", "സ"],
  ["x", "ക്സ"],
  ["q", "ക"],
];

const CHILLU: Record<string, string> = {
  ന്: "ൻ",
  ര്: "ർ",
  ല്: "ൽ",
  ള്: "ൾ",
  ക്: "ൿ",
};

function matchLongest(
  table: [string, string][],
  input: string,
  from: number,
  caseSensitive: boolean,
): { match: string; value: string } | null {
  const slice = input.slice(from);
  for (const [latin, ml] of table) {
    if (caseSensitive) {
      if (slice.startsWith(latin)) return { match: latin, value: ml };
    } else {
      const len = latin.length;
      if (slice.slice(0, len).toLowerCase() === latin.toLowerCase()) {
        return { match: slice.slice(0, len), value: ml };
      }
    }
  }
  return null;
}

/**
 * Normalize casual Manglish into Mozhi-friendly form before phonetics.
 */
function prepareInput(raw: string): string {
  let s = raw.trim();

  // Newsroom / everyday Manglish spelling fixes before Mozhi
  s = s.replace(/rth/gi, "Rth");
  // -alam endings → ാളം (malayalam, keralam)
  s = s.replace(/alam$/i, "aaLam");
  // kerala (no final m): …ala → …aLa
  s = s.replace(/([^a])ala$/i, "$1aLa");
  // ke… at start often കേ (kerala, keralam)
  s = s.replace(/^ke/i, "kE");
  // kozh… often കോഴി
  s = s.replace(/^kozh/i, "kOzh");
  // ippol / eppol style O
  s = s.replace(/ppol$/i, "ppOL");
  s = s.replace(/ppO$/i, "ppO");
  // sarkar: double k + final r chillu
  s = s.replace(/rkar$/i, "Rkaar");
  s = s.replace(/skar$/i, "skaar");
  s = s.replace(/kar$/i, "kaar");

  return s;
}

function applyChilluAndAnusvara(text: string, originalKey: string): string {
  let out = text;

  // Final m after a vowel-ish ending → anusvara (daivam, keralam)
  if (/m$/i.test(originalKey) && out.endsWith("മ്")) {
    out = `${out.slice(0, -2)}ം`;
  }

  // Trailing virama chillu letters
  for (const [from, to] of Object.entries(CHILLU)) {
    if (out.endsWith(from)) {
      out = `${out.slice(0, -from.length)}${to}`;
    }
  }

  // Common: final n typed → ൻ already via chillu; final "nu" words like innu → ഇന്ന്
  return out;
}

/**
 * Core Mozhi transliteration for a single token.
 */
export function mozhiTransliterate(raw: string): string {
  const input = prepareInput(raw);
  if (!input) return raw;

  const hasCapitals = /[A-Z]/.test(input);
  let i = 0;
  let out = "";
  let pending: string | null = null;

  const flush = (sign: string) => {
    if (pending) {
      out += pending + sign;
      pending = null;
    }
  };

  while (i < input.length) {
    if (pending) {
      const dep = matchLongest(DEP_VOWELS, input, i, hasCapitals);
      if (dep) {
        flush(dep.value);
        i += dep.match.length;
        continue;
      }
      // consonant cluster: add virama between
      const nextCons = matchLongest(CONSONANTS, input, i, true);
      if (nextCons) {
        out += pending + "്";
        pending = nextCons.value;
        i += nextCons.match.length;
        continue;
      }
      // dead end — emit with virama
      flush("്");
      continue;
    }

    // Word-initial / after vowel: independent vowel
    const ind = matchLongest(IND_VOWELS, input, i, hasCapitals);
    const cons = matchLongest(CONSONANTS, input, i, true);

    // Prefer consonant if both could match (e.g. avoid eating 'a' from 'amma' wrongly when... actually a is vowel)
    // If consonant matches and is longer or equal priority: consonants don't start with vowel letters except none
    if (cons && (!ind || cons.match.length >= ind.match.length && !/^[aeiouAEIOU]/.test(cons.match))) {
      pending = cons.value;
      i += cons.match.length;
      continue;
    }

    if (ind) {
      out += ind.value;
      i += ind.match.length;
      continue;
    }

    if (cons) {
      pending = cons.value;
      i += cons.match.length;
      continue;
    }

    // skip unknown punctuation already stripped; keep char
    out += input[i];
    i += 1;
  }

  if (pending) {
    flush("്");
  }

  return applyChilluAndAnusvara(out, input);
}

function normalizeKey(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z]/g, "")
    .replace(/aa/g, "a")
    .replace(/ee|ii/g, "i")
    .replace(/oo|uu/g, "u");
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () =>
    Array.from({ length: n + 1 }, () => 0),
  );
  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1,
        dp[i]![j - 1]! + 1,
        dp[i - 1]![j - 1]! + cost,
      );
    }
  }
  return dp[m]![n]!;
}

function lexiconCandidates(raw: string): ManglishCandidate[] {
  const key = raw.toLowerCase().replace(/[^a-z]/g, "");
  if (!key) return [];
  const out: ManglishCandidate[] = [];
  const seen = new Set<string>();

  const push = (text: string, score: number, latin: string) => {
    if (!text || seen.has(text)) return;
    seen.add(text);
    out.push({ text, score, source: "lexicon", latin });
  };

  const exact = LEXICON[key];
  if (exact) {
    exact.forEach((t, i) => push(t, 1 - i * 0.01, key));
    // Prefix completions only (vartha → varthakal), not fuzzy neighbors
    for (const [latin, forms] of Object.entries(LEXICON)) {
      if (latin === key) continue;
      if (latin.startsWith(key) && latin.length > key.length) {
        forms.forEach((t, i) => push(t, 0.88 - i * 0.01, latin));
      }
    }
    out.sort((a, b) => b.score - a.score);
    return out.slice(0, 6);
  }

  // Prefix matches while typing (ker → kerala)
  for (const [latin, forms] of Object.entries(LEXICON)) {
    if (latin.startsWith(key) && key.length >= 2) {
      forms.forEach((t, i) => push(t, 0.92 - i * 0.01, latin));
    }
  }

  // Strict fuzzy: same first letter, distance 1, length within 1
  const norm = normalizeKey(key);
  for (const [latin, forms] of Object.entries(LEXICON)) {
    if (latin[0] !== key[0]) continue;
    if (Math.abs(latin.length - key.length) > 1) continue;
    const dist = levenshtein(normalizeKey(latin), norm);
    if (dist === 1 && key.length >= 4) {
      forms.forEach((t, i) => push(t, 0.78 - i * 0.01, latin));
    }
  }

  out.sort((a, b) => b.score - a.score);
  return out.slice(0, 6);
}

function phoneticCandidates(raw: string): ManglishCandidate[] {
  const primary = mozhiTransliterate(raw);
  if (!primary || primary === raw) return [];
  return [{ text: primary, score: 0.5, source: "phonetic" }];
}

export function buildManglishCandidates(raw: string): ManglishCandidate[] {
  const trimmed = raw.trim();
  if (!trimmed || !/[a-zA-Z]/.test(trimmed)) return [];

  const out: ManglishCandidate[] = [];
  const seen = new Set<string>();

  const push = (c: ManglishCandidate) => {
    if (!c.text || seen.has(c.text)) return;
    seen.add(c.text);
    out.push(c);
  };

  const lex = lexiconCandidates(trimmed);
  for (const c of lex) push(c);

  // Phonetic only when no strong lexicon hit (score < 0.9)
  const strongLex = lex.some((c) => c.score >= 0.9);
  if (!strongLex) {
    for (const c of phoneticCandidates(trimmed)) push(c);
  } else {
    // Still offer phonetic as secondary if different from top lex
    const phon = phoneticCandidates(trimmed)[0];
    if (phon && phon.text !== lex[0]?.text) {
      push({ ...phon, score: 0.45 });
    }
  }

  push({ text: trimmed, score: 0.05, source: "passthrough" });

  out.sort((a, b) => b.score - a.score);
  return out.slice(0, 6);
}

function convertPhrase(latin: string): string {
  return latin
    .split(/(\s+)/)
    .map((part) => {
      if (/^\s+$/.test(part)) return part;
      if (!/[a-zA-Z]/.test(part)) return part;
      return buildManglishCandidates(part)[0]?.text ?? part;
    })
    .join("");
}

export class RuleBasedManglishService implements ManglishService {
  readonly providerId = "rule_based_manglish";
  readonly displayName = "MediaOS Mozhi Manglish";

  async convert(latin: string): Promise<ManglishConvertResult> {
    const isPhrase = /\s/.test(latin);
    const candidates = isPhrase ? undefined : buildManglishCandidates(latin);
    const output = isPhrase
      ? convertPhrase(latin)
      : (candidates?.[0]?.text ?? latin);
    return {
      input: latin,
      output,
      changed: output !== latin,
      candidates,
    };
  }

  async suggest(latin: string): Promise<ManglishCandidate[]> {
    return buildManglishCandidates(latin);
  }

  async convertTrailingWord(buffer: string) {
    const match = buffer.match(/^(.*?)([A-Za-z]+)(\s+)$/);
    if (!match) return null;
    const [, before = "", word = "", after = ""] = match;
    const { output } = await this.convert(word);
    if (output === word) return null;
    return { before, converted: output, after };
  }
}

export const ruleBasedManglishService = new RuleBasedManglishService();
