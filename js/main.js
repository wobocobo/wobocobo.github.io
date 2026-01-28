// AOS
AOS.init({
  once: true,
  duration: 800,
  easing: 'ease-out-cubic'
});

// Menu hamburguesa
const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');

if (toggle && nav) {
  toggle.addEventListener('click', () => {
    nav.classList.toggle('active');
  });
}

