const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let lightboxActual = null;
let lightboxItems = [];
let lightboxIndice = 0;
let elementoConFocoPrevio = null;

function normalizarIndice(indice, total) {
    return (indice + total) % total;
}

function crearLightbox() {
    const lightboxExistente = document.querySelector("[data-lightbox]");
    if (lightboxExistente) return lightboxExistente;

    const lightbox = document.createElement("div");
    lightbox.className = "lightbox";
    lightbox.setAttribute("data-lightbox", "");
    lightbox.setAttribute("role", "dialog");
    lightbox.setAttribute("aria-modal", "true");
    lightbox.setAttribute("aria-hidden", "true");
    lightbox.innerHTML = `
        <button class="lightbox-cerrar" type="button" data-lightbox-cerrar aria-label="Cerrar imagen">&times;</button>
        <button class="lightbox-control lightbox-control--anterior" type="button" data-lightbox-anterior aria-label="Imagen anterior">&#10094;</button>
        <figure class="lightbox-figura">
            <img class="lightbox-imagen" src="" alt="">
            <figcaption class="lightbox-titulo"></figcaption>
        </figure>
        <button class="lightbox-control lightbox-control--siguiente" type="button" data-lightbox-siguiente aria-label="Imagen siguiente">&#10095;</button>
    `;

    document.body.appendChild(lightbox);

    lightbox.querySelector("[data-lightbox-cerrar]").addEventListener("click", cerrarLightbox);
    lightbox.querySelector("[data-lightbox-anterior]").addEventListener("click", () => cambiarImagenLightbox(-1));
    lightbox.querySelector("[data-lightbox-siguiente]").addEventListener("click", () => cambiarImagenLightbox(1));

    lightbox.addEventListener("click", (event) => {
        if (event.target === lightbox) cerrarLightbox();
    });

    return lightbox;
}

function actualizarLightbox() {
    if (!lightboxActual || lightboxItems.length === 0) return;

    const item = lightboxItems[lightboxIndice];
    const imagen = lightboxActual.querySelector(".lightbox-imagen");
    const titulo = lightboxActual.querySelector(".lightbox-titulo");
    const controles = lightboxActual.querySelectorAll(".lightbox-control");

    imagen.src = item.src;
    imagen.alt = item.alt || item.titulo || "Imagen ampliada";
    titulo.textContent = item.titulo || item.alt || "";
    controles.forEach((control) => {
        control.hidden = lightboxItems.length <= 1;
    });
}

function abrirLightbox(items, indiceInicial) {
    lightboxItems = items;
    lightboxIndice = normalizarIndice(indiceInicial, lightboxItems.length);
    lightboxActual = crearLightbox();
    elementoConFocoPrevio = document.activeElement;

    actualizarLightbox();
    lightboxActual.classList.add("is-open");
    lightboxActual.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    lightboxActual.querySelector("[data-lightbox-cerrar]").focus();
}

function cerrarLightbox() {
    if (!lightboxActual) return;

    lightboxActual.classList.remove("is-open");
    lightboxActual.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";

    const imagen = lightboxActual.querySelector(".lightbox-imagen");
    if (imagen) imagen.src = "";

    if (elementoConFocoPrevio && typeof elementoConFocoPrevio.focus === "function") {
        elementoConFocoPrevio.focus();
    }
}

function cambiarImagenLightbox(direccion) {
    if (!lightboxActual || lightboxItems.length <= 1) return;

    lightboxIndice = normalizarIndice(lightboxIndice + direccion, lightboxItems.length);
    actualizarLightbox();
}

function prepararCarrusel(carrusel) {
    const pista = carrusel.querySelector(".carrusel-pista");
    const slides = Array.from(carrusel.querySelectorAll(".carrusel-slide"));
    const botonAnterior = carrusel.querySelector("[data-carrusel-anterior]");
    const botonSiguiente = carrusel.querySelector("[data-carrusel-siguiente]");
    const contenedorIndicadores = carrusel.querySelector("[data-carrusel-indicadores]");

    if (!pista || slides.length === 0) return;

    let indiceActual = 0;
    let temporizador = null;
    let toqueInicialX = 0;

    const usarAutoplay = carrusel.dataset.autoplay !== "false";
    const intervalo = Number(carrusel.dataset.intervalo) || 9000;

    const slideLightboxItems = slides.map((slide) => {
        const botonImagen = slide.querySelector("[data-lightbox-src]");
        const imagen = slide.querySelector("img");
        let lista = [];

        const dataList = (botonImagen && (botonImagen.dataset.images || botonImagen.dataset.innerImages)) || slide.dataset.images || "";
        if (dataList) {
            lista = dataList.split(',').map(s => s.trim()).filter(Boolean);
        } else {
            const imgs = slide.querySelectorAll("img");
            lista = Array.from(imgs).map(i => i.currentSrc || i.src).filter(Boolean);
        }

        if (lista.length === 0) {
            const src = botonImagen?.dataset.lightboxSrc || imagen?.currentSrc || imagen?.src || "";
            if (src) lista.push(src);
        }

        return lista.map((src) => ({
            src,
            alt: botonImagen?.dataset.lightboxAlt || imagen?.alt || "",
            titulo: botonImagen?.dataset.lightboxTitle || ""
        }));
    });

    function prepararGaleriaInterna(slide, slideIndex) {
        const botonImagen = slide.querySelector("[data-lightbox-src]");
        const img = slide.querySelector('img');
        const items = slideLightboxItems[slideIndex] || [];
        if (!img) return;

        slide._innerIndex = 0;
        slide._innerItems = items;

        if (img.complete) {
            img.style.opacity = '1';
        }
        img.addEventListener('load', () => { img.style.opacity = '1'; });

        if (items.length <= 1) return;

        const prev = document.createElement('button');
        prev.type = 'button';
        prev.className = 'carrusel-inner-control carrusel-inner-control--prev';
        prev.setAttribute('aria-label', 'Imagen anterior dentro de la sección');
        prev.innerHTML = '&#10094;';

        const next = document.createElement('button');
        next.type = 'button';
        next.className = 'carrusel-inner-control carrusel-inner-control--next';
        next.setAttribute('aria-label', 'Imagen siguiente dentro de la sección');
        next.innerHTML = '&#10095;';

        const container = botonImagen || img.parentElement;
        if (container) container.style.position = container.style.position || 'relative';
        container.appendChild(prev);
        container.appendChild(next);

        function actualizarImagenInterna(nuevoIndex) {
            slide._innerIndex = (nuevoIndex + items.length) % items.length;
            const nuevo = items[slide._innerIndex];
            if (!nuevo) return;
            img.style.transition = 'opacity 220ms ease';
            img.style.opacity = '0';
            setTimeout(() => { img.src = nuevo.src; }, 160);
        }

        prev.addEventListener('click', (e) => { e.stopPropagation(); detenerAutoplay(); actualizarImagenInterna(slide._innerIndex - 1); setTimeout(() => iniciarAutoplay(), Math.max(900, intervalo)); });
        next.addEventListener('click', (e) => { e.stopPropagation(); detenerAutoplay(); actualizarImagenInterna(slide._innerIndex + 1); setTimeout(() => iniciarAutoplay(), Math.max(900, intervalo)); });
    }

    function actualizarCarrusel(nuevoIndice) {
        indiceActual = normalizarIndice(nuevoIndice, slides.length);
        pista.style.transform = `translateX(-${indiceActual * 100}%)`;

        slides.forEach((slide, indice) => {
            const activo = indice === indiceActual;
            slide.classList.toggle("is-active", activo);
            slide.setAttribute("aria-hidden", String(!activo));

            if (activo) {
                slide.querySelectorAll(".reveal").forEach((elemento) => {
                    elemento.classList.add("is-visible");
                });
            }
        });

        carrusel.querySelectorAll(".carrusel-indicador").forEach((indicador, indice) => {
            const activo = indice === indiceActual;
            indicador.classList.toggle("is-active", activo);
            indicador.setAttribute("aria-pressed", String(activo));
        });
    }

    function detenerAutoplay() {
        window.clearInterval(temporizador);
        temporizador = null;
    }

    function iniciarAutoplay() {
        detenerAutoplay();
        if (!usarAutoplay || prefersReducedMotion || slides.length <= 1) return;
        temporizador = window.setInterval(() => actualizarCarrusel(indiceActual + 1), intervalo);
    }

    if (contenedorIndicadores) {
        contenedorIndicadores.innerHTML = "";
        slides.forEach((_, indice) => {
            const indicador = document.createElement("button");
            indicador.className = "carrusel-indicador";
            indicador.type = "button";
            indicador.setAttribute("aria-label", `Ver imagen ${indice + 1}`);
            indicador.addEventListener("click", () => {
                actualizarCarrusel(indice);
                iniciarAutoplay();
            });
            contenedorIndicadores.appendChild(indicador);
        });
    }

    botonAnterior?.addEventListener("click", () => {
        actualizarCarrusel(indiceActual - 1);
        iniciarAutoplay();
    });

    botonSiguiente?.addEventListener("click", () => {
        actualizarCarrusel(indiceActual + 1);
        iniciarAutoplay();
    });

    slides.forEach((slide, indice) => {
        prepararGaleriaInterna(slide, indice);
        const botonImagen = slide.querySelector("[data-lightbox-src]");
        if (!botonImagen) return;

        botonImagen.addEventListener("click", (event) => {
            detenerAutoplay();
            const items = (slide._innerItems && slide._innerItems.length) ? slide._innerItems : (slideLightboxItems[indice] || []);
            const startIndex = slide._innerIndex || 0;
            abrirLightbox(items, startIndex);
        });
    });

    carrusel.addEventListener("mouseenter", detenerAutoplay);
    carrusel.addEventListener("mouseleave", iniciarAutoplay);
    carrusel.addEventListener("focusin", detenerAutoplay);
    carrusel.addEventListener("focusout", iniciarAutoplay);

    carrusel.addEventListener("touchstart", (event) => {
        toqueInicialX = event.changedTouches[0].screenX;
    }, { passive: true });

    carrusel.addEventListener("touchend", (event) => {
        const toqueFinalX = event.changedTouches[0].screenX;
        const distancia = toqueInicialX - toqueFinalX;

        if (Math.abs(distancia) < 48) return;

        actualizarCarrusel(distancia > 0 ? indiceActual + 1 : indiceActual - 1);
        iniciarAutoplay();
    }, { passive: true });

    carrusel.setAttribute("tabindex", "0");
    carrusel.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;

        event.preventDefault();
        actualizarCarrusel(event.key === "ArrowRight" ? indiceActual + 1 : indiceActual - 1);
        iniciarAutoplay();
    });

    actualizarCarrusel(0);
    iniciarAutoplay();
}

function prepararCarruseles() {
    document.querySelectorAll("[data-carrusel]").forEach(prepararCarrusel);
}

function cerrarDropdowns(excepto = null) {
    document.querySelectorAll(".dropdown").forEach((dropdown) => {
        if (dropdown === excepto) return;

        dropdown.classList.remove("is-open");
        const contenido = dropdown.querySelector(".dropdown-content");
        const toggle = dropdown.querySelector(".dropdown-toggle");

        if (contenido) contenido.classList.remove("show");
        if (toggle) toggle.setAttribute("aria-expanded", "false");
    });
}

function toggleDropdown(event) {
    const dropdown = event.currentTarget?.classList?.contains("dropdown")
        ? event.currentTarget
        : event.target.closest(".dropdown");

    if (!dropdown) return;

    const linkInterno = event.target.closest(".dropdown-content a");
    if (linkInterno) {
        cerrarDropdowns();
        return;
    }

    const toggle = event.target.closest(".dropdown-toggle");
    if (!toggle) return;

    event.preventDefault();
    event.stopPropagation();

    const contenido = dropdown.querySelector(".dropdown-content");
    const abierto = !dropdown.classList.contains("is-open");

    cerrarDropdowns(dropdown);
    dropdown.classList.toggle("is-open", abierto);
    if (contenido) contenido.classList.toggle("show", abierto);
    toggle.setAttribute("aria-expanded", String(abierto));
}

function prepararDropdowns() {
    document.querySelectorAll(".dropdown").forEach((dropdown) => {
        dropdown.addEventListener("click", toggleDropdown);
    });

    document.addEventListener("click", (event) => {
        if (!event.target.closest(".dropdown")) cerrarDropdowns();
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") cerrarDropdowns();
    });
}

function toggleWhatsAppMenu(event) {
    if (event) event.stopPropagation();

    const menu = document.getElementById("waMenu");
    const boton = document.querySelector(".whatsapp-container .btn-whatsapp-flotante");
    if (!menu) return;

    const abierto = !menu.classList.contains("open");
    menu.classList.toggle("open", abierto);
    menu.setAttribute("aria-hidden", String(!abierto));
    if (boton) boton.setAttribute("aria-expanded", String(abierto));
}

function prepararWhatsApp() {
    document.addEventListener("click", (event) => {
        const menu = document.getElementById("waMenu");
        const container = document.querySelector(".whatsapp-container");

        if (menu && menu.classList.contains("open") && container && !container.contains(event.target)) {
            menu.classList.remove("open");
            menu.setAttribute("aria-hidden", "true");
            const boton = container.querySelector(".btn-whatsapp-flotante");
            if (boton) boton.setAttribute("aria-expanded", "false");
        }
    });

    document.querySelectorAll(".wa-option").forEach((option) => {
        option.addEventListener("click", () => {
            const menu = document.getElementById("waMenu");
            const boton = document.querySelector(".whatsapp-container .btn-whatsapp-flotante");
            if (menu) {
                menu.classList.remove("open");
                menu.setAttribute("aria-hidden", "true");
            }
            if (boton) boton.setAttribute("aria-expanded", "false");
        });
    });
}

function prepararRevelados() {
    const elementos = document.querySelectorAll(".reveal");
    if (elementos.length === 0) return;

    if (!("IntersectionObserver" in window) || prefersReducedMotion) {
        elementos.forEach((elemento) => elemento.classList.add("is-visible"));
        return;
    }

    const observador = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-visible");
            observador.unobserve(entry.target);
        });
    }, { threshold: 0.16, rootMargin: "0px 0px -40px 0px" });

    elementos.forEach((elemento) => observador.observe(elemento));
}

function prepararImagenes() {
    document.querySelectorAll("img").forEach((img) => {
        img.loading = img.closest(".carrusel-principal") ? "eager" : "lazy";
        img.decoding = "async";

        img.addEventListener("error", () => {
            const contenedor = img.parentElement;
            if (contenedor) contenedor.classList.add("image-fallback");
            img.setAttribute("aria-hidden", "true");
        }, { once: true });
    });
}

document.addEventListener("keydown", (event) => {
    if (!lightboxActual || !lightboxActual.classList.contains("is-open")) return;

    if (event.key === "Escape") cerrarLightbox();
    if (event.key === "ArrowLeft") cambiarImagenLightbox(-1);
    if (event.key === "ArrowRight") cambiarImagenLightbox(1);
});

prepararImagenes();
prepararCarruseles();
prepararDropdowns();
prepararWhatsApp();
prepararRevelados();

window.toggleDropdown = toggleDropdown;
window.toggleWhatsAppMenu = toggleWhatsAppMenu;