// The Esc screen: settings for this player, and the look of both characters.
import { Action, State } from './sim';

export interface Settings { scale: number; grass: number; shadows: boolean; volume: number; sens: number; invert: boolean; fps: boolean }
const KEY = 'beforeus:settings';
export function loadSettings(): Settings {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) ?? '{}'); } catch { /* defaults */ }
  return { scale: 0, grass: 1, shadows: true, volume: 1, sens: 1, invert: false, fps: true, ...saved };
}
export interface MenuApi { state(): State; myId(): string; act(a: Action): void; apply(s: Settings): void; settings: Settings; preview(n: number): void }

const STYLE_NAMES = [['Long', 'Buns', 'Short'], ['Parted + beard', 'Parted', 'Buzzed + beard', 'Buzzed']];
const hex = (n: number) => '#' + n.toString(16).padStart(6, '0');

export function initMenus(api: MenuApi) {
  const el = document.createElement('div'); el.id = 'menus'; el.style.display = 'none'; document.body.appendChild(el);
  let tab = 'settings', shown = 0;
  // Clicking anywhere in a character's column makes that character the one shown in the preview.
  const pick = (t: HTMLElement) => {
    const w = t.closest('.who') as HTMLElement | null;
    if (!w || Number(w.dataset.n) === shown) return;
    shown = Number(w.dataset.n); api.preview(shown);
    el.querySelectorAll('.who').forEach((x) => x.classList.toggle('on', x === w));
  };
  const who = (npc: boolean) => { const s = api.state(); return npc ? Object.values(s.players).find((p) => p.npc) : s.players[api.myId()]; };

  const draw = () => {
    const s = api.settings;
    const sel = (k: string, opts: [number, string][], v: number) => `<select data-k="${k}">${opts.map(([val, t]) => `<option value="${val}" ${val === v ? 'selected' : ''}>${t}</option>`).join('')}</select>`;
    const settings = `
      <h3>Graphics</h3>
      <label>Sharpness ${sel('scale', [[0, 'Automatic'], [1, 'Full'], [0.75, 'Medium'], [0.5, 'Low']], s.scale)}</label>
      <label>Grass ${sel('grass', [[1, 'High'], [0.6, 'Medium'], [0.3, 'Low'], [0, 'Off']], s.grass)}</label>
      <label>Shadows <input type="checkbox" data-k="shadows" ${s.shadows ? 'checked' : ''}></label>
      <label>Show frame rate <input type="checkbox" data-k="fps" ${s.fps ? 'checked' : ''}></label>
      <label>Full screen <button data-full>Toggle</button></label>
      <h3>Sound</h3>
      <label>Volume <input type="range" min="0" max="1" step="0.05" data-k="volume" value="${s.volume}"></label>
      <h3>Controls</h3>
      <label>Mouse sensitivity <input type="range" min="0.3" max="2.5" step="0.1" data-k="sens" value="${s.sens}"></label>
      <label>Invert up/down look <input type="checkbox" data-k="invert" ${s.invert ? 'checked' : ''}></label>`;
    const person = (npc: boolean) => {
      const p = who(npc); if (!p) return '';
      const names = STYLE_NAMES[p.ch], st = (p.style ?? 0) % names.length, n = npc ? 1 : 0;
      return `<div class="who ${n === shown ? 'on' : ''}" data-n="${n}"><h3>${p.name}</h3>
        <label>Hair <span><button data-style="${n}:-1">‹</button> <b>${names[st]}</b> <button data-style="${n}:1">›</button></span></label>
        <label>Hair colour <input type="color" data-hair="${n}" value="${hex(p.hair ?? (p.ch === 0 ? 0x7a4e30 : 0x46301f))}"></label>
        <label>${api.state().story < 5 ? 'Clothes (locked: hunt and eat first)' : 'Clothes'} <input type="checkbox" data-dress="${n}" ${p.dressed !== false ? 'checked' : ''} ${api.state().story < 5 && p.dressed === false ? 'disabled' : ''}></label>
        <label>Height <input type="range" min="0.9" max="1.1" step="0.01" data-height="${n}" value="${p.height ?? 1}"></label></div>`;
    };
    el.innerHTML = `<div class="box"><div class="tabs"><button data-tab="settings" class="${tab === 'settings' ? 'sel' : ''}">Settings</button><button data-tab="people" class="${tab === 'people' ? 'sel' : ''}">Characters</button><button data-close>Back to the valley</button></div>
      ${tab === 'settings' ? settings : `<div class="people">${person(false)}${person(true)}</div><p class="note">The character you are editing is shown on the right. Click the other one's options to switch.</p>`}</div>`;
    el.classList.toggle('side', tab === 'people'); api.preview(tab === 'people' ? shown : -1);
  };

  const toggle = (open?: boolean) => { const show = open ?? el.style.display === 'none'; el.style.display = show ? 'flex' : 'none'; document.body.classList.toggle('menu-open', show); if (show) { document.exitPointerLock?.(); draw(); } else api.preview(-1); };
  addEventListener('keydown', (e) => { if (e.code === 'Escape') toggle(); });

  el.addEventListener('click', (e) => {
    const t = e.target as HTMLElement, d = t.dataset;
    pick(t);
    if (d.tab) { tab = d.tab; draw(); }
    else if ('close' in d) toggle(false);
    else if ('full' in d) { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.(); }
    else if (d.style) {
      const [n, dir] = d.style.split(':').map(Number), p = who(n === 1); if (!p) return;
      const count = STYLE_NAMES[p.ch].length;
      api.act({ a: 'look', npc: n === 1, style: ((p.style ?? 0) + dir + count) % count }); setTimeout(draw, 150);
    }
  });
  el.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement, d = t.dataset;
    pick(t);
    if (d.k) {
      const s = api.settings as any;
      s[d.k] = t.type === 'checkbox' ? t.checked : Number(t.value);
      localStorage.setItem(KEY, JSON.stringify(s)); api.apply(s);
    } else if (d.hair) api.act({ a: 'look', npc: d.hair === '1', hair: parseInt(t.value.slice(1), 16) });
    else if (d.dress) api.act({ a: 'look', npc: d.dress === '1', dressed: t.checked });
    else if (d.height) api.act({ a: 'look', npc: d.height === '1', height: Number(t.value) });
  });
  return { toggle, isOpen: () => el.style.display !== 'none' };
}
