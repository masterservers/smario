import { WRESTLING_MOVES, WRESTLING_FOLLOW_UPS } from "../src/lib/wrestlingMoves";
const all=[...WRESTLING_MOVES,...WRESTLING_FOLLOW_UPS];
const names=`Collar-and-Elbow Tie-Up,Waist Lock,Side Headlock,Front Facelock,Hammerlock,Wrist Lock,Full Nelson,Half Nelson,Bear Hug,Cobra Clutch,Arm Drag,Hip Toss,Monkey Flip,Snapmare,Biel Throw,Headscissors Takedown,Hurricanrana,Frankensteiner,Body Slam,Scoop Slam,Powerslam,Running Powerslam,Scoop Powerslam,Side Slam,Spinebuster,Double-A Spinebuster,Alabama Slam,Fallaway Slam,Military Press Slam,Gorilla Press Slam,Chokeslam,Uranage,Rock Bottom,Sidewalk Slam,Samoan Drop,Fireman's Carry Slam,Death Valley Driver,Olympic Slam,Angle Slam,Cobra Clutch Slam,Full Nelson Slam,Backbreaker,Pendulum Backbreaker,Tilt-a-Whirl Backbreaker,Argentine Backbreaker,Neckbreaker,Swinging Neckbreaker,Snap Neckbreaker,Hangman's Neckbreaker,Reverse Neckbreaker,DDT,Snap DDT,Implant DDT,Tornado DDT,Jumping DDT,Double-Arm DDT,Hammerlock DDT,Reverse DDT,Even Flow DDT,Suplex,Vertical Suplex,Snap Suplex,Delayed Vertical Suplex,Superplex,German Suplex,Release German Suplex,Belly-to-Belly Suplex,Overhead Belly-to-Belly Suplex,Belly-to-Back Suplex,Exploder Suplex,Northern Lights Suplex,Dragon Suplex,Tiger Suplex,Half-Nelson Suplex,Saito Suplex,Fisherman Suplex,Butterfly Suplex,Gutwrench Suplex,Deadlift Suplex,Brainbuster,Falcon Arrow,Jackhammer`.split(",");
const slug=(n:string)=>`w-${n.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}`;
const byId=new Map(all.map(m=>[m.id,m]));
const missing=names.filter(n=>!byId.has(slug(n)));
console.log("MISSING",missing);
const key=(m:any)=>`${m.src}|${m.start}|${m.end}`;
const groups=new Map<string,string[]>();
for(const n of names){const m=byId.get(slug(n)); if(!m)continue; const k=key(m); groups.set(k,[...(groups.get(k)??[]),m.id]);}
console.log("DUPS",[...groups.values()].filter(v=>v.length>1));
// also dup against already migrated phase1/2? check global dup within requested vs all
console.log("IDS",names.map(slug).filter(i=>byId.has(i)).join(" "));
