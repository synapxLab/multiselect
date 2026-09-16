// Page de démo (non publiée) : les cas de la spec §6 — multiple de référence,
// simple, préselection, désactivé, overflow:hidden, fausse modale, thème sombre.
import { MultiSelect } from './index';

function log(id: string, msg: string): void {
  const box = document.getElementById(id);
  if (!box) return;
  box.textContent = `${new Date().toLocaleTimeString()}  ${msg}\n${box.textContent ?? ''}`.slice(0, 2000);
}

function byId<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

// 1. Multiple de référence, via init() sur data-multiselect
const main = byId<HTMLSelectElement>('attentes');
let ms1: MultiSelect | null = MultiSelect.init('[data-multiselect]', {
  onChange: (values) => log('log-main', `onChange [${values.join(', ')}]`),
  onOpen: () => log('log-main', 'open'),
  onClose: () => log('log-main', 'close'),
})[0] ?? null;
main.addEventListener('change', () => log('log-main', `change natif → ${Array.from(main.selectedOptions).map((o) => o.value).join(',')}`));

document.querySelectorAll<HTMLButtonElement>('[data-api]').forEach((b) => {
  b.addEventListener('click', () => {
    const method = b.dataset['api'] as 'open' | 'close' | 'disable' | 'enable' | 'destroy';
    if (!ms1) {
      ms1 = new MultiSelect(main, { onChange: (values) => log('log-main', `onChange [${values.join(', ')}]`) });
      log('log-main', 'réinstancié');
      if (method === 'destroy') return;
    }
    ms1[method]();
    if (method === 'destroy') {
      ms1 = null;
      log('log-main', 'destroy() — le select natif est visible ; cliquer une action pour réinstancier');
    }
  });
});
byId('api-set').addEventListener('click', () => ms1?.setValue(['jeune', 'startup']));
byId('api-clear').addEventListener('click', () => ms1?.setValue([]));

// 2. Simple
const single = byId<HTMLSelectElement>('pays');
new MultiSelect(single, { onChange: (v) => log('log-single', `onChange [${v.join(', ')}]`) });
single.addEventListener('change', () => log('log-single', `change natif → ${single.value}`));

// 3. Préselection + maxItems, sans recherche
new MultiSelect(byId<HTMLSelectElement>('presel'), { searchable: false, maxItems: 3 });

// 4. Désactivé
new MultiSelect(byId<HTMLSelectElement>('off'));

// 5. overflow:hidden, 6. width anchor, 7. coin bas-droit
new MultiSelect(byId<HTMLSelectElement>('clip'));
new MultiSelect(byId<HTMLSelectElement>('anchor'), { width: 'anchor', locale: 'en' });
new MultiSelect(byId<HTMLSelectElement>('corner'));

// 8. Fausse modale fixed + transform
const modal = byId('fake-modal');
byId('open-modal').addEventListener('click', () => modal.classList.add('open'));
byId('close-modal').addEventListener('click', () => modal.classList.remove('open'));
new MultiSelect(byId<HTMLSelectElement>('modal'), { zIndex: 1070 });

// Thème
byId('theme-toggle').addEventListener('click', () => {
  const root = document.documentElement;
  root.setAttribute('data-bs-theme', root.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark');
});
