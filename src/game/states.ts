import type { Posting, Role } from './types'
import { PPA_NAMES, pickPpaKind } from './people'

/** All 36 states plus the FCT, with each orientation camp and a few LGAs for PPA posting. */
export const STATES: { state: string; camp: string; lgas: [string, string][] }[] = [
  { state: 'Abia', camp: 'Umunna, Bende', lgas: [['Umuahia North', 'Umuahia'], ['Aba South', 'Aba']] },
  { state: 'Adamawa', camp: 'Damare, Girei', lgas: [['Yola North', 'Jimeta'], ['Mubi North', 'Mubi']] },
  { state: 'Akwa Ibom', camp: 'Ikot Itie Udung, Nsit Atai', lgas: [['Uyo', 'Uyo'], ['Ikot Ekpene', 'Ikot Ekpene']] },
  { state: 'Anambra', camp: 'Umuawulu-Mbaukwu, Awka South', lgas: [['Awka South', 'Awka'], ['Onitsha North', 'Onitsha']] },
  { state: 'Bauchi', camp: 'Wailo, Ganjuwa', lgas: [['Bauchi', 'Bauchi'], ['Katagum', 'Azare']] },
  { state: 'Bayelsa', camp: 'Kaiama, Kolokuma/Opokuma', lgas: [['Yenagoa', 'Yenagoa'], ['Sagbama', 'Sagbama']] },
  { state: 'Benue', camp: 'Wannune, Tarka', lgas: [['Makurdi', 'Makurdi'], ['Gboko', 'Gboko']] },
  { state: 'Borno', camp: 'Maimalari Barracks, Maiduguri', lgas: [['Maiduguri', 'Maiduguri'], ['Biu', 'Biu']] },
  { state: 'Cross River', camp: 'Obubra', lgas: [['Calabar Municipal', 'Calabar'], ['Ikom', 'Ikom']] },
  { state: 'Delta', camp: 'Issele-Uku', lgas: [['Oshimili South', 'Asaba'], ['Warri South', 'Warri']] },
  { state: 'Ebonyi', camp: 'Afikpo', lgas: [['Abakaliki', 'Abakaliki'], ['Afikpo North', 'Afikpo']] },
  { state: 'Edo', camp: 'Okada', lgas: [['Oredo', 'Benin City'], ['Etsako West', 'Auchi']] },
  { state: 'Ekiti', camp: 'Ise/Emure', lgas: [['Ado-Ekiti', 'Ado-Ekiti'], ['Ikere', 'Ikere']] },
  { state: 'Enugu', camp: 'Awgu', lgas: [['Enugu North', 'Enugu'], ['Nsukka', 'Nsukka']] },
  { state: 'FCT Abuja', camp: 'Kubwa', lgas: [['AMAC', 'Garki'], ['Bwari', 'Bwari']] },
  { state: 'Gombe', camp: 'Amada, Akko', lgas: [['Gombe', 'Gombe'], ['Billiri', 'Billiri']] },
  { state: 'Imo', camp: 'Eziama Obaire, Nkwerre', lgas: [['Owerri Municipal', 'Owerri'], ['Orlu', 'Orlu']] },
  { state: 'Jigawa', camp: 'Fanisau, Dutse', lgas: [['Dutse', 'Dutse'], ['Hadejia', 'Hadejia']] },
  { state: 'Kaduna', camp: 'Kurmin Mashi, Kaduna', lgas: [['Kaduna North', 'Kaduna'], ['Zaria', 'Zaria']] },
  { state: 'Kano', camp: 'Karaye', lgas: [['Nassarawa', 'Kano'], ['Fagge', 'Fagge']] },
  { state: 'Katsina', camp: 'Mopol Base, Katsina', lgas: [['Katsina', 'Katsina'], ['Funtua', 'Funtua']] },
  { state: 'Kebbi', camp: 'Dakingari', lgas: [['Birnin Kebbi', 'Birnin Kebbi'], ['Argungu', 'Argungu']] },
  { state: 'Kogi', camp: 'Asaya, Kabba', lgas: [['Lokoja', 'Lokoja'], ['Okene', 'Okene']] },
  { state: 'Kwara', camp: 'Yikpata, Edu', lgas: [['Ilorin West', 'Ilorin'], ['Offa', 'Offa']] },
  { state: 'Lagos', camp: 'Iyana Ipaja', lgas: [['Ikeja', 'Ikeja'], ['Surulere', 'Surulere'], ['Eti-Osa', 'Lekki']] },
  { state: 'Nasarawa', camp: 'Keffi', lgas: [['Lafia', 'Lafia'], ['Keffi', 'Keffi']] },
  { state: 'Niger', camp: 'Paiko', lgas: [['Chanchaga', 'Minna'], ['Bida', 'Bida']] },
  { state: 'Ogun', camp: 'Sagamu', lgas: [['Abeokuta South', 'Abeokuta'], ['Ijebu Ode', 'Ijebu Ode']] },
  { state: 'Ondo', camp: 'Ikare-Akoko', lgas: [['Akure South', 'Akure'], ['Owo', 'Owo']] },
  { state: 'Osun', camp: 'Ede', lgas: [['Osogbo', 'Osogbo'], ['Ife Central', 'Ile-Ife']] },
  { state: 'Oyo', camp: 'Iseyin', lgas: [['Ibadan North', 'Ibadan'], ['Ogbomosho North', 'Ogbomosho']] },
  { state: 'Plateau', camp: 'Mangu', lgas: [['Jos North', 'Jos'], ['Pankshin', 'Pankshin']] },
  { state: 'Rivers', camp: 'Nonwa-Tai', lgas: [['Port Harcourt', 'Port Harcourt'], ['Obio/Akpor', 'Rumuokoro']] },
  { state: 'Sokoto', camp: 'Wamakko', lgas: [['Sokoto North', 'Sokoto'], ['Tambuwal', 'Tambuwal']] },
  { state: 'Taraba', camp: 'Sibre, Jalingo', lgas: [['Jalingo', 'Jalingo'], ['Wukari', 'Wukari']] },
  { state: 'Yobe', camp: 'Damaturu', lgas: [['Damaturu', 'Damaturu'], ['Potiskum', 'Potiskum']] },
  { state: 'Zamfara', camp: 'Tsafe', lgas: [['Gusau', 'Gusau'], ['Kaura Namoda', 'Kaura Namoda']] },
]

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]

/** Call-up: a random state and its orientation camp. LGA and PPA come later with the posting letter. */
export function randomCallUp(exclude = ''): Posting {
  const s = pick(STATES.filter((x) => x.state !== exclude))
  return { state: s.state, camp: s.camp, lga: '', ppa: '' }
}

/** Posting letter: an LGA and PPA inside the state you were called up to. A strong camp record makes an office posting likelier. */
export function assignPPA(p: Posting | null, rating = 50, role: Role = ''): Posting {
  const base = p?.state ? p : randomCallUp()
  const st = STATES.find((s) => s.state === base.state) ?? pick(STATES)
  const [lga, town] = pick(st.lgas)
  const kind = pickPpaKind(rating, role)
  return { ...base, camp: base.camp || st.camp, lga, ppa: PPA_NAMES[kind](town), kind }
}
