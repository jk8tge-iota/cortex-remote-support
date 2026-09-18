// Progressive enhancement only; content, language links and menus work without JS.
for (const link of document.querySelectorAll('.language-link')) {
  const target = new URL(link.href);
  if (location.hash) target.hash = location.hash;
  link.href = target.href;
}
window.addEventListener('hashchange', () => {
  for (const link of document.querySelectorAll('.language-link')) {
    const target = new URL(link.href); target.hash = location.hash; link.href = target.href;
  }
});
for (const menu of document.querySelectorAll('.mobile-menu')) {
  menu.addEventListener('click', event => { if (event.target.closest('a')) menu.open = false; });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.open) { menu.open = false; menu.querySelector('summary').focus(); }
  });
}
