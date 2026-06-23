import LZString from 'lz-string';
import type { Positions } from '../model/types';

export interface SharedState {
  dbml: string;
  positions?: Positions;
}

const PREFIX = '#d=';

export function encodeState(state: SharedState): string {
  const json = JSON.stringify(state);
  return PREFIX + LZString.compressToEncodedURIComponent(json);
}

export function decodeState(hash: string): SharedState | null {
  if (!hash || !hash.startsWith(PREFIX)) return null;
  const raw = hash.slice(PREFIX.length);
  try {
    const json = LZString.decompressFromEncodedURIComponent(raw);
    if (!json) return null;
    const parsed = JSON.parse(json);
    if (typeof parsed?.dbml !== 'string') return null;
    return parsed as SharedState;
  } catch {
    return null;
  }
}

export function readHash(): SharedState | null {
  return decodeState(window.location.hash);
}

/** Update the URL hash without adding a history entry. */
export function writeHash(state: SharedState): void {
  const encoded = encodeState(state);
  history.replaceState(null, '', encoded);
}

export function buildShareUrl(state: SharedState): string {
  return window.location.origin + window.location.pathname + encodeState(state);
}
