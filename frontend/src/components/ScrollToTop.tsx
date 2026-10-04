import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const TITLES: [RegExp, string][] = [
  [/^\/$/, 'Today'],
  [/^\/tenders\/\d+/, 'Tender'],
  [/^\/tenders/, 'Tenders'],
  [/^\/ask/, 'Ask a question'],
  [/^\/check\/message/, 'Check a message'],
  [/^\/check/, 'Check a tender'],
  [/^\/documents\/\d+/, 'Document'],
  [/^\/documents/, 'Documents'],
  [/^\/map\/.+/, 'Type of work'],
  [/^\/map/, 'Map'],
  [/^\/bids/, 'My bids'],
  [/^\/alerts/, 'Alerts'],
  [/^\/meetings/, 'Meetings and visits'],
  [/^\/profile/, 'Profile and settings'],
];

/** On every new page: start at the top and name the page in the browser tab. */
export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    const title = TITLES.find(([re]) => re.test(pathname))?.[1];
    document.title = title ? `${title} · TenderReady` : 'TenderReady';
  }, [pathname]);
  return null;
}
