// Une seule interaction JavaScript : ouvrir/fermer le menu sur petit écran.
const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation-principale');

if (menuButton && navigation) {
  function closeMenu() {
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Ouvrir le menu de navigation');
    navigation.dataset.open = 'false';
    document.body.classList.remove('menu-open');
  }

  menuButton.addEventListener('click', () => {
    const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!isOpen));
    menuButton.setAttribute('aria-label', isOpen ? 'Ouvrir le menu de navigation' : 'Fermer le menu de navigation');
    navigation.dataset.open = String(!isOpen);
    document.body.classList.toggle('menu-open', !isOpen);
  });

  navigation.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeMenu);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && navigation.dataset.open === 'true') {
      closeMenu();
      menuButton.focus();
    }
  });

  document.addEventListener('click', (event) => {
    if (navigation.dataset.open === 'true' && !navigation.contains(event.target) && !menuButton.contains(event.target)) {
      closeMenu();
    }
  });

  window.matchMedia('(min-width: 901px)').addEventListener('change', (event) => {
    if (event.matches) closeMenu();
  });
}
