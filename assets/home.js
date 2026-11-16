// Home page: the menu sits over the photo, then turns ivory once you scroll.
(function () {
  const nav = document.querySelector(".topnav");
  if (!nav) return;
  const set = () => nav.classList.toggle("scrolled", window.scrollY > window.innerHeight * 0.6);
  set(); window.addEventListener("scroll", set, { passive: true });
})();
