// Easy read summary of a tender: short sentences, one idea each, no jargon.
// Built from the tender's data and the AGPO rules, never made up.
// TODO(review): Kiswahili wording to be checked by a native speaker before launch.
import { canBid, agpoCategories } from '../config/agpo';
import type { AgpoCategory, Lang, Reservation } from './types';

export interface EasyReadInput {
  entity: string;
  purpose: string;
  purposeSw: string;
  reservation: Reservation;
  closingDate: string;
  requiredDocs: string[];
  missingDocs: string[];
}

export interface EasyReadSection {
  heading: string;
  sentences: string[];
}

export interface EasyRead {
  lang: Lang;
  sections: EasyReadSection[];
  /** Every sentence in reading order. The player highlights by index into this list. */
  sentences: string[];
}

const HEADINGS: Record<Lang, string[]> = {
  en: ['What it is for', 'Who can apply', 'Deadline', 'What you need', 'Do you qualify?'],
  sw: ['Inahusu nini', 'Nani anaweza kuomba', 'Mwisho wa kuomba', 'Unachohitaji', 'Je, unastahili?'],
};

function youthAges(): [number, number] {
  const youth = agpoCategories.find((c) => c.id === 'youth');
  return [youth?.age_min ?? 18, youth?.age_max ?? 34];
}

/** "Tax compliance" becomes "tax compliance"; acronyms such as "CR12" and "AGPO" stay. */
function lowerFirst(text: string): string {
  const second = text.charAt(1);
  if (!text || second !== second.toLowerCase()) return text;
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function whoCanApply(reservation: Reservation, lang: Lang): string {
  const [min, max] = youthAges();
  const en: Record<Reservation, string> = {
    open: 'Any business can apply.',
    agpo: 'Only businesses owned by women, youth or persons with disabilities can apply.',
    women: 'Only businesses owned by women can apply.',
    youth: `Only businesses owned by young people aged ${min} to ${max} can apply.`,
    pwd: 'Only businesses owned by persons with disabilities can apply.',
  };
  const sw: Record<Reservation, string> = {
    open: 'Biashara yoyote inaweza kuomba.',
    agpo: 'Biashara za wanawake, vijana au watu wenye ulemavu pekee ndizo zinaweza kuomba.',
    women: 'Biashara za wanawake pekee ndizo zinaweza kuomba.',
    youth: `Biashara za vijana wa miaka ${min} hadi ${max} pekee ndizo zinaweza kuomba.`,
    pwd: 'Biashara za watu wenye ulemavu pekee ndizo zinaweza kuomba.',
  };
  return (lang === 'sw' ? sw : en)[reservation];
}

function deadline(closingDate: string, lang: Lang, now: Date): string[] {
  const date = new Date(closingDate);
  const locale = lang === 'sw' ? 'sw-KE' : 'en-KE';
  const day = date.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
  const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const days = Math.ceil((date.getTime() - now.getTime()) / 86_400_000);
  if (lang === 'sw') {
    const left =
      days < 0 ? 'Muda wa kuomba umekwisha.' : days === 0 ? 'Hiyo ni leo.' : `Hiyo ni baada ya siku ${days}.`;
    return [`Mwisho wa kuomba ni ${day}, saa ${time}.`, left];
  }
  const left =
    days < 0 ? 'The deadline has passed.' : days === 0 ? 'That is today.' : `That is in ${days} day${days === 1 ? '' : 's'}.`;
  return [`The deadline is ${day}, at ${time}.`, left];
}

function qualify(input: EasyReadInput, category: AgpoCategory, lang: Lang): string[] {
  const sw = lang === 'sw';
  if (!canBid(category, input.reservation)) {
    return sw
      ? ['Biashara yako haiwezi kuomba zabuni hii.', 'Zabuni hii ni ya kundi lingine.']
      : ['Your business cannot apply for this tender.', 'It is for a different group.'];
  }
  if (input.missingDocs.length === 0) {
    return sw
      ? ['Unastahili kuomba.', 'Nyaraka zako ziko tayari.']
      : ['You can apply.', 'Your documents are ready.'];
  }
  const count = input.missingDocs.length;
  const first = sw
    ? `Unaweza kuomba, lakini unakosa nyaraka ${count}.`
    : `You can apply, but ${count} document${count === 1 ? ' is' : 's are'} missing.`;
  return [first, ...input.missingDocs.map((doc) => (sw ? `Pakia ${doc}.` : `Upload your ${lowerFirst(doc)}.`))];
}

export function buildEasyRead(
  input: EasyReadInput,
  category: AgpoCategory,
  lang: Lang,
  now: Date = new Date(),
): EasyRead {
  const sw = lang === 'sw';
  const purpose = sw ? input.purposeSw : input.purpose;
  const groups = [
    [
      sw ? `Zabuni hii inatoka kwa ${input.entity}.` : `This tender is from ${input.entity}.`,
      sw ? `Inahusu ${lowerFirst(purpose)}` : `It is for ${lowerFirst(purpose)}`,
    ],
    [whoCanApply(input.reservation, lang)],
    deadline(input.closingDate, lang, now),
    input.requiredDocs.map((doc) => (sw ? `Unahitaji ${doc}.` : `You need your ${lowerFirst(doc)}.`)),
    qualify(input, category, lang),
  ];
  const sections = groups.map((sentences, i) => ({ heading: HEADINGS[lang][i], sentences }));
  return { lang, sections, sentences: sections.flatMap((s) => s.sentences) };
}
