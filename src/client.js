document.documentElement.classList.add('js');

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  });
}, { rootMargin: '120px 0px', threshold: 0.04 });
document.querySelectorAll('[data-reveal]').forEach((element) => observer.observe(element));

const archiveButtons = [...document.querySelectorAll('[data-filter]')];
const archiveItems = [...document.querySelectorAll('[data-archive-item]')];
const archiveEmpty = document.querySelector('.archive-empty');
archiveButtons.forEach((button) => button.addEventListener('click', () => {
  const filter = button.dataset.filter;
  let visible = 0;
  archiveButtons.forEach((item) => item.classList.toggle('is-active', item === button));
  archiveItems.forEach((item) => {
    const matches = filter === 'all' || item.dataset.categories.split(' ').includes(filter) || item.dataset.year === filter || item.dataset.location === filter || item.dataset.project === filter;
    item.hidden = !matches;
    if (matches) visible += 1;
  });
  if (archiveEmpty) archiveEmpty.hidden = visible !== 0;
}));

const dialog = document.querySelector('.lightbox');
const triggers = [...document.querySelectorAll('[data-lightbox]')];
if (dialog && triggers.length) {
  const dialogImage = dialog.querySelector('img');
  const caption = dialog.querySelector('figcaption');
  let activeIndex = 0;
  const show = (index) => {
    activeIndex = (index + triggers.length) % triggers.length;
    const source = triggers[activeIndex].querySelector('img');
    dialogImage.src = source.currentSrc || source.src;
    dialogImage.alt = source.alt;
    caption.textContent = source.alt;
  };
  triggers.forEach((trigger, index) => trigger.addEventListener('click', () => {
    show(index);
    dialog.showModal();
  }));
  dialog.querySelector('.lightbox-close').addEventListener('click', () => dialog.close());
  dialog.querySelector('.lightbox-prev').addEventListener('click', () => show(activeIndex - 1));
  dialog.querySelector('.lightbox-next').addEventListener('click', () => show(activeIndex + 1));
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') show(activeIndex - 1);
    if (event.key === 'ArrowRight') show(activeIndex + 1);
  });
  let touchStart = 0;
  dialog.addEventListener('touchstart', (event) => { touchStart = event.changedTouches[0].clientX; }, { passive:true });
  dialog.addEventListener('touchend', (event) => {
    const distance = event.changedTouches[0].clientX - touchStart;
    if (Math.abs(distance) > 45) show(activeIndex + (distance < 0 ? 1 : -1));
  }, { passive:true });
}
