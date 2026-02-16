// AOS
AOS.init({
  once: true,
  duration: 800,
  easing: 'ease-out-cubic'
});

// Menu hamburguesa
const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');
const dropdown = document.querySelector('.dropdown');
const dropdownToggle = document.querySelector('.dropdown-toggle');

if (toggle && nav) {
  toggle.addEventListener('click', () => {

    const isActive = nav.classList.toggle('active');

    // Si cerramos el menú principal, cerramos también el dropdown
    if (!isActive && dropdown) {
      dropdown.classList.remove('active');
    }
  });
}

if (dropdown && dropdownToggle) {
  dropdownToggle.addEventListener('click', () => {
    if (window.innerWidth <= 768) {
      dropdown.classList.toggle('active');
    }
  });
}