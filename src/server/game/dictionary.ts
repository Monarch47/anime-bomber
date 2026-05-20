/*
 * Anime Bomber dictionary.
 *
 * Words are grouped into categories. Multi-category words (e.g. "naruto" is
 * both a title and a character) are merged automatically on load.
 * Every entry is normalized to A-Z uppercase before use.
 */

export type Category = "pokemon" | "characters" | "titles" | "places" | "terms";
export type WordPool = "all" | "pokemon" | "characters" | "places" | "terms";

const POKEMON = `
bulbasaur ivysaur venusaur charmander charmeleon charizard squirtle wartortle
blastoise caterpie metapod butterfree weedle kakuna beedrill pidgey pidgeotto
pidgeot rattata raticate spearow fearow ekans arbok pikachu raichu sandshrew
sandslash nidoran nidorina nidoqueen nidorino nidoking clefairy clefable vulpix
ninetales jigglypuff wigglytuff zubat golbat oddish gloom vileplume paras
parasect venonat venomoth diglett dugtrio meowth persian psyduck golduck mankey
primeape growlithe arcanine poliwag poliwhirl poliwrath abra kadabra alakazam
machop machoke machamp bellsprout weepinbell victreebel tentacool tentacruel
geodude graveler golem ponyta rapidash slowpoke slowbro magnemite magneton
farfetchd doduo dodrio seel dewgong grimer shellder cloyster gastly haunter
gengar onix drowzee hypno krabby kingler voltorb electrode exeggcute exeggutor
cubone marowak hitmonlee hitmonchan lickitung koffing weezing rhyhorn rhydon
chansey tangela kangaskhan horsea seadra goldeen seaking staryu starmie scyther
jynx electabuzz magmar pinsir tauros magikarp gyarados lapras ditto eevee
vaporeon jolteon flareon porygon omanyte omastar kabuto kabutops aerodactyl
snorlax articuno zapdos moltres dratini dragonair dragonite mewtwo chikorita
cyndaquil totodile togepi lugia celebi espeon umbreon ampharos steelix scizor
heracross houndoom kingdra tyranitar treecko grovyle sceptile torchic combusken
blaziken mudkip marshtomp swampert gardevoir sableye mawile aggron flygon
altaria milotic metagross rayquaza kyogre groudon deoxys turtwig chimchar
piplup luxray garchomp lucario riolu togekiss weavile mamoswine dialga palkia
giratina darkrai arceus snivy tepig oshawott zoroark zekrom reshiram kyurem
greninja talonflame aegislash sylveon goodra rowlet litten popplio decidueye
incineroar primarina lycanroc mimikyu toxapex grookey scorbunny sobble
corviknight dragapult zacian zamazenta eternatus glaceon leafeon
`;

const CHARACTERS = `
naruto sasuke sakura kakashi hinata itachi gaara jiraiya tsunade orochimaru
minato shikamaru rocklee neji kiba shino choji yamato konohamaru obito madara
hashirama nagato konan deidara sasori kisame zabuza haku boruto sarada mitsuki
kawaki luffy zoro nami usopp sanji chopper robin franky brook jinbe shanks
portgas sabo whitebeard blackbeard doflamingo crocodile mihawk buggy kaido
katakuri trafalgar eustass smoker rayleigh oden yamato carrot vivi nico ace law
goku vegeta gohan piccolo krillin bulma trunks goten frieza cell majinbuu beerus
whis broly bardock raditz nappa gotenks videl chichi yamcha tien roshi shenron
jiren hercule dende zarbon dodoria ginyu vegito gogeta cooler ichigo rukia renji
byakuya kenpachi aizen urahara yoruichi orihime ishida grimmjow ulquiorra
toshiro soifon ukitake kyoraku nelliel starrk eren mikasa armin levi erwin
historia ymir reiner bertholdt annie sasha connie jean hange zeke grisha pixis
kenny floch gabi falco tanjiro nezuko zenitsu inosuke giyu rengoku shinobu
tengen mitsuri muichiro sanemi gyomei obanai kanao muzan akaza douma kokushibo
kanae urokodaki tomioka kagaya gojo itadori megumi nobara sukuna geto nanami
toji yuta maki panda inumaki todo mahito jogo choso yuji utahime deku bakugo
todoroki uraraka iida tsuyu kirishima denki momo tokoyami aizawa endeavor dabi
shigaraki tomura mirio hawks mineta nighteye overhaul edward alphonse winry
mustang hawkeye scar envy lust gluttony greed hohenheim izumi ling riza pinako
bradley saitama genos fubuki tatsumaki garou metalbat king bang light lawliet
misa near mello watari soichiro asta yuno noelle yami mereoleona leopold magna
charmy gauche finral vanessa emma norman ray isabella krone senku taiju
yuzuriha chrome kohaku tsukasa suika ryusui thorfinn askeladd canute thors
einar reigen dimple ritsu teru mogami gon killua kurapika leorio hisoka chrollo
biscuit netero meruem komugi yusuke kuwabara hiei kurama koenma botan genkai
toguro spike faye vicious meliodas elizabeth diane gowther merlin escanor
zeldris guts griffith casca judeau schierke puck violet gilbert hodgins anya
loid yor becky damian denji makima himeno kishibe reze quanxi doraemon nobita
shizuka yugi kaiba pegasus marik ban hawk
`;

const TITLES = `
naruto bleach pokemon digimon inuyasha dragonball evangelion gintama hellsing
berserk trigun claymore nichijou clannad toradora haikyuu kuroko slamdunk
vinland overlord konosuba frieren chainsaw dandadan hyouka monster durarara
baccano steins erased parasyte drifters akira totoro ponyo mononoke nausicaa
bebop fairytail blackclover noragami fireforce dorohedoro mushoku spyfamily
jujutsu kaguya horimiya bocchi oshinoko
`;

const PLACES = `
tokyo kyoto osaka nagoya sapporo fukuoka kobe yokohama hiroshima sendai nara
nikko hakone kanazawa nagasaki okinawa hokkaido honshu kyushu shikoku shibuya
shinjuku harajuku akihabara ginza asakusa ueno ikebukuro odaiba roppongi
fujisan arashiyama gion dotonbori namba umeda chiba saitama kawasaki kamakura
yokosuka matsumoto takayama hakodate otaru beppu kagoshima kumamoto matsuyama
niigata kanto kansai tohoku chubu ryukyu aokigahara shinkansen yamanote
`;

const TERMS = `
anime manga otaku senpai kohai sensei kawaii sugoi baka nani chibi mecha isekai
shonen shojo seinen josei tsundere yandere kuudere dandere waifu husbando weeb
cosplay mangaka doujin filler nakama ninja samurai shinobi hokage jutsu chakra
sharingan byakugan rasengan chidori kamehameha bankai zanpakuto hollow
shinigami titan quirk hero villain sennin sage kunai shuriken katana dojo ramen
onigiri bento sakura kitsune yokai kami dragon demon spirit haki marine pirate
akatsuki uchiha hyuga senju namek saiyan kaioken genjutsu ninjutsu taijutsu
shippuden jinchuriki bijuu sannin susanoo amaterasu tsukuyomi rinnegan
mangekyou hashira slayer cursed domain expansion barrage alchemy homunculus
stand jojo nendoroid katsu wasabi matsuri kaiju shrine festival
`;

const RAW: Record<Category, string> = {
  pokemon: POKEMON,
  characters: CHARACTERS,
  titles: TITLES,
  places: PLACES,
  terms: TERMS,
};

export function normalize(s: unknown): string {
  return String(s ?? "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

interface Entry {
  display: string;
  cats: Set<Category>;
}

// Master map: normalized word -> { display, cats }
const ENTRIES = new Map<string, Entry>();
for (const cat of Object.keys(RAW) as Category[]) {
  for (const raw of RAW[cat].split(/\s+/)) {
    if (!raw) continue;
    const norm = normalize(raw);
    if (norm.length < 3) continue;
    let e = ENTRIES.get(norm);
    if (!e) {
      e = { display: raw.toLowerCase(), cats: new Set() };
      ENTRIES.set(norm, e);
    }
    e.cats.add(cat);
  }
}

export function has(norm: string): boolean {
  return ENTRIES.has(norm);
}

export function displayOf(norm: string): string {
  return ENTRIES.get(norm)?.display ?? String(norm).toLowerCase();
}

export function categoriesOf(norm: string): Category[] {
  const e = ENTRIES.get(norm);
  return e ? [...e.cats] : [];
}

/**
 * Returns the list of normalized words for a given pool.
 * The "terms" pool also includes anime titles.
 */
export function wordListForPool(pool: WordPool): string[] {
  if (!pool || pool === "all") return [...ENTRIES.keys()];
  const want: Set<Category> =
    pool === "terms" ? new Set(["terms", "titles"]) : new Set([pool]);
  const out: string[] = [];
  for (const [norm, e] of ENTRIES) {
    for (const c of e.cats) {
      if (want.has(c)) {
        out.push(norm);
        break;
      }
    }
  }
  return out;
}

/** Builds a map of 2-letter syllable -> normalized words containing it. */
export function buildSyllableIndex(words: string[]): Map<string, string[]> {
  const index = new Map<string, string[]>();
  for (const w of words) {
    const seen = new Set<string>();
    for (let i = 0; i + 2 <= w.length; i++) {
      const syl = w.slice(i, i + 2);
      if (seen.has(syl)) continue;
      seen.add(syl);
      let arr = index.get(syl);
      if (!arr) {
        arr = [];
        index.set(syl, arr);
      }
      arr.push(w);
    }
  }
  return index;
}

/** Summary used by the home screen / tRPC stats endpoint. */
export function dictionaryStats() {
  const categories: Record<Category, number> = {
    pokemon: 0,
    characters: 0,
    titles: 0,
    places: 0,
    terms: 0,
  };
  for (const e of ENTRIES.values()) {
    for (const c of e.cats) categories[c]++;
  }
  return { total: ENTRIES.size, categories };
}
