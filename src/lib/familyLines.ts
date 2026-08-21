import type { Lang } from "@/lib/i18n";
import type { SceneFamily } from "@/lib/scenes";

/**
 * Commentator lines per family of scene (punches, kicks, rope work, throws,
 * mat work, clinch, feeling-out). Every family exists in all five broadcast
 * languages, so the call always matches the `?lang=` of the link.
 *
 * `action` lines run on a confirmed impact (attacker/defender names supplied);
 * `ambient` lines run when a scene of that family starts without a gift, so the
 * feeling-out phases are commented too.
 */
export type FamilyLine = (attacker: string, defender: string) => string;

type Pack = Record<SceneFamily, { action: FamilyLine[]; ambient: string[] }>;

const en: Pack = {
  punch: {
    action: [
      (a, d) => `${a} snaps the punch straight through ${d}'s guard!`,
      (a, d) => `Clean hands from ${a} — ${d} felt every knuckle of that one.`,
    ],
    ambient: ["Both men working behind the jab now.", "Hands high, short punches in the pocket."],
  },
  kick: {
    action: [
      (a, d) => `And there's the leg! ${a} whips it into ${d}!`,
      (a, d) => `${a} swings the boot up and ${d} eats it flush.`,
    ],
    ambient: ["Kicks measuring the distance out there.", "Long range now, feet doing the talking."],
  },
  rope: {
    action: [
      (a, d) => `${a} is up on the ropes — and comes flying down onto ${d}!`,
      (a, d) => `Off the top rope! ${a} takes to the air and lands on ${d}!`,
    ],
    ambient: ["He's climbing the turnbuckle, the crowd is up!", "Running the ropes, building speed."],
  },
  throw: {
    action: [
      (a, d) => `${a} scoops him up and slams ${d} into the canvas!`,
      (a, d) => `What a throw! ${d} is dumped flat by ${a}!`,
    ],
    ambient: ["Looking for the body lock, looking for the throw.", "Hips in, he wants to lift him."],
  },
  mat: {
    action: [
      (a, d) => `${a} keeps working on the mat, ${d} can't get off the canvas!`,
      (a, d) => `Ground and pound from ${a} — ${d} is covering up down there.`,
    ],
    ambient: ["Scrambling on the canvas.", "Down on the mat, fighting for position."],
  },
  clinch: {
    action: [
      (a, d) => `${a} locks him up and drives the knees into ${d}!`,
      (a, d) => `Tight clinch — ${a} is grinding ${d} down.`,
    ],
    ambient: ["Tied up in the clinch, referee watching closely.", "Collar tie, nobody giving ground."],
  },
  taunt: {
    action: [(a, d) => `${a} plays to the crowd right in front of ${d}!`],
    ambient: ["Feeling each other out, circling.", "A quiet moment — both men breathing.", "Eyes locked, no punches yet."],
  },
  other: {
    action: [(a, d) => `${a} lands it and ${d} is rocked!`],
    ambient: ["The pace settles for a second."],
  },
};

const de: Pack = {
  punch: {
    action: [
      (a, d) => `${a} schlägt die Gerade durch die Deckung von ${d}!`,
      (a, d) => `Saubere Faust von ${a} — ${d} hat das gespürt!`,
    ],
    ambient: ["Beide arbeiten jetzt hinter der Führhand.", "Kurze Schläge auf engem Raum."],
  },
  kick: {
    action: [
      (a, d) => `Und da ist das Bein! ${a} tritt ${d} voll!`,
      (a, d) => `${a} zieht den Fuß hoch und trifft ${d} sauber.`,
    ],
    ambient: ["Tritte messen die Distanz aus.", "Weite Distanz, die Beine sprechen."],
  },
  rope: {
    action: [
      (a, d) => `${a} ist oben an den Seilen — und fliegt auf ${d} herab!`,
      (a, d) => `Vom obersten Seil! ${a} segelt auf ${d}!`,
    ],
    ambient: ["Er klettert aufs Eckpolster, die Halle steht!", "Er läuft in die Seile, nimmt Fahrt auf."],
  },
  throw: {
    action: [
      (a, d) => `${a} hebt ihn hoch und schmettert ${d} auf die Matte!`,
      (a, d) => `Was für ein Wurf! ${d} liegt flach nach dem Angriff von ${a}!`,
    ],
    ambient: ["Er sucht den Körperklammergriff, er will werfen.", "Hüfte rein — er will ihn heben."],
  },
  mat: {
    action: [
      (a, d) => `${a} arbeitet am Boden weiter, ${d} kommt nicht hoch!`,
      (a, d) => `Schläge von oben durch ${a} — ${d} deckt sich ab.`,
    ],
    ambient: ["Gerangel auf der Matte.", "Am Boden, Kampf um die Position."],
  },
  clinch: {
    action: [
      (a, d) => `${a} klammert und rammt die Knie in ${d}!`,
      (a, d) => `Enger Clinch — ${a} zermürbt ${d}.`,
    ],
    ambient: ["Im Clinch verkeilt, der Ringrichter schaut genau hin.", "Nackenclinch, keiner weicht."],
  },
  taunt: {
    action: [(a, d) => `${a} spielt mit dem Publikum, direkt vor ${d}!`],
    ambient: ["Sie tasten sich ab, umkreisen sich.", "Ein ruhiger Moment, beide holen Luft.", "Blickduell, noch keine Schläge."],
  },
  other: {
    action: [(a, d) => `${a} trifft und ${d} wankt!`],
    ambient: ["Das Tempo beruhigt sich kurz."],
  },
};

const sr: Pack = {
  punch: {
    action: [
      (a, d) => `${a} probija gard i pogađa ${d} direktom!`,
      (a, d) => `Čist udarac ruke od ${a} — ${d} je to osetio!`,
    ],
    ambient: ["Obojica rade iza vodeće ruke.", "Kratki udarci iz blizine."],
  },
  kick: {
    action: [
      (a, d) => `Evo noge! ${a} šutira ${d} punom snagom!`,
      (a, d) => `${a} diže nogu i pogađa ${d} čisto.`,
    ],
    ambient: ["Šutevi mere distancu.", "Velika distanca, noge govore."],
  },
  rope: {
    action: [
      (a, d) => `${a} je na konopcima — i sleće pravo na ${d}!`,
      (a, d) => `Sa najvišeg konopca! ${a} leti na ${d}!`,
    ],
    ambient: ["Penje se na ugao, publika je na nogama!", "Trči na konopce, hvata zalet."],
  },
  throw: {
    action: [
      (a, d) => `${a} ga podiže i baca ${d} na strunjaču!`,
      (a, d) => `Kakvo bacanje! ${d} je tresnuo posle napada ${a}!`,
    ],
    ambient: ["Traži zahvat oko tela, sprema bacanje.", "Kuk unutra — hoće da ga digne."],
  },
  mat: {
    action: [
      (a, d) => `${a} nastavlja na podu, ${d} ne može da ustane!`,
      (a, d) => `Udarci odozgo od ${a} — ${d} se pokriva.`,
    ],
    ambient: ["Komešanje na strunjači.", "Na podu, borba za poziciju."],
  },
  clinch: {
    action: [
      (a, d) => `${a} ga hvata u klinč i zabija kolena u ${d}!`,
      (a, d) => `Tesan klinč — ${a} lomi ${d}.`,
    ],
    ambient: ["Zaglavljeni u klinču, sudija pažljivo gleda.", "Hvat za vrat, niko ne popušta."],
  },
  taunt: {
    action: [(a, d) => `${a} se igra sa publikom ispred ${d}!`],
    ambient: ["Tapkaju, kruže jedan oko drugog.", "Miran trenutak, obojica hvataju dah.", "Pogledi se ukrstili, još bez udaraca."],
  },
  other: {
    action: [(a, d) => `${a} pogađa i ${d} je uzdrman!`],
    ambient: ["Tempo se na tren smiruje."],
  },
};

const ro: Pack = {
  punch: {
    action: [
      (a, d) => `${a} trece direct prin garda lui ${d}!`,
      (a, d) => `Lovitură curată de pumn de la ${a} — ${d} a simțit-o din plin!`,
    ],
    ambient: ["Amândoi lucrează în spatele directei de stânga.", "Lovituri scurte, de aproape."],
  },
  kick: {
    action: [
      (a, d) => `Și iată piciorul! ${a} îl lovește pe ${d} cu putere!`,
      (a, d) => `${a} ridică piciorul și îl prinde curat pe ${d}.`,
    ],
    ambient: ["Loviturile de picior măsoară distanța.", "Distanță lungă, vorbesc picioarele."],
  },
  rope: {
    action: [
      (a, d) => `${a} e sus pe corzi — și zboară peste ${d}!`,
      (a, d) => `De pe coarda de sus! ${a} sare și aterizează pe ${d}!`,
    ],
    ambient: ["Urcă pe colțarul ringului, sala e în picioare!", "Aleargă la corzi, prinde viteză."],
  },
  throw: {
    action: [
      (a, d) => `${a} îl ridică și îl trântește pe ${d} la saltea!`,
      (a, d) => `Ce aruncare! ${d} a fost izbit de ${a}!`,
    ],
    ambient: ["Caută priza la corp, pregătește aruncarea.", "Șold înăuntru — vrea să-l ridice."],
  },
  mat: {
    action: [
      (a, d) => `${a} continuă la sol, ${d} nu se poate ridica!`,
      (a, d) => `Lovituri de sus de la ${a} — ${d} se acoperă acolo jos.`,
    ],
    ambient: ["Învălmășeală pe saltea.", "La sol, luptă pentru poziție."],
  },
  clinch: {
    action: [
      (a, d) => `${a} îl prinde în clinci și îi bagă genunchii lui ${d}!`,
      (a, d) => `Clinci strâns — ${a} îl macină pe ${d}.`,
    ],
    ambient: ["Blocați în clinci, arbitrul urmărește atent.", "Priză la ceafă, nimeni nu cedează."],
  },
  taunt: {
    action: [(a, d) => `${a} se joacă cu publicul chiar în fața lui ${d}!`],
    ambient: ["Se tatonează, se rotesc unul în jurul celuilalt.", "Moment de liniște, amândoi își trag sufletul.", "Priviri încrucișate, încă fără lovituri."],
  },
  other: {
    action: [(a, d) => `${a} lovește și ${d} este zguduit!`],
    ambient: ["Ritmul se liniștește o clipă."],
  },
};

const ru: Pack = {
  punch: {
    action: [
      (a, d) => `${a} пробивает прямой сквозь защиту ${d}!`,
      (a, d) => `Чистый удар рукой от ${a} — ${d} это почувствовал!`,
    ],
    ambient: ["Оба работают за джебом.", "Короткие удары на ближней дистанции."],
  },
  kick: {
    action: [
      (a, d) => `И вот нога! ${a} бьёт ${d} со всей силы!`,
      (a, d) => `${a} поднимает ногу и точно попадает в ${d}.`,
    ],
    ambient: ["Удары ногами меряют дистанцию.", "Дальняя дистанция, говорят ноги."],
  },
  rope: {
    action: [
      (a, d) => `${a} на канатах — и обрушивается сверху на ${d}!`,
      (a, d) => `С верхнего каната! ${a} летит на ${d}!`,
    ],
    ambient: ["Он лезет на угол, зал встаёт!", "Разбег по канатам, набирает скорость."],
  },
  throw: {
    action: [
      (a, d) => `${a} поднимает его и швыряет ${d} на настил!`,
      (a, d) => `Какой бросок! ${d} впечатан в ринг после атаки ${a}!`,
    ],
    ambient: ["Ищет захват корпуса, готовит бросок.", "Подсел под бедро — хочет поднять."],
  },
  mat: {
    action: [
      (a, d) => `${a} продолжает работать в партере, ${d} не может встать!`,
      (a, d) => `Удары сверху от ${a} — ${d} закрывается внизу.`,
    ],
    ambient: ["Возня на настиле.", "В партере, борьба за позицию."],
  },
  clinch: {
    action: [
      (a, d) => `${a} берёт в клинч и вбивает колени в ${d}!`,
      (a, d) => `Плотный клинч — ${a} перемалывает ${d}.`,
    ],
    ambient: ["Сцепились в клинче, рефери смотрит внимательно.", "Захват за шею, никто не уступает."],
  },
  taunt: {
    action: [(a, d) => `${a} играет на публику прямо перед ${d}!`],
    ambient: ["Прощупывают друг друга, кружат по рингу.", "Спокойный момент, оба переводят дух.", "Взгляды скрестились, ударов пока нет."],
  },
  other: {
    action: [(a, d) => `${a} попадает, и ${d} потрясён!`],
    ambient: ["Темп на секунду успокаивается."],
  },
};

export const FAMILY_LINES: Record<Lang, Pack> = { en, de, sr, ro, ru };
