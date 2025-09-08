document.addEventListener('DOMContentLoaded', function () {
    const mainContentArea = document.getElementById('mainContentArea');
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
    const sectionTemplates = document.getElementById('section-templates');

    // Función para cargar el contenido de una sección
    function loadSection(sectionId) {
        // Ocultar todas las "páginas" si estuvieran en #mainContentArea (enfoque alternativo)
        // Aquí simplemente reemplazamos el contenido
        
        const template = document.getElementById(sectionId + "-content");
        if (template) {
            mainContentArea.innerHTML = template.innerHTML;
        } else {
            mainContentArea.innerHTML = '<p>Contenido no disponible.</p>';
        }

        // Lógica específica después de cargar una sección
        if (sectionId === 'admin-nodos') {
            // Asegurarse de que listarNodos se llame para poblar la tabla
            if (typeof listarNodos === 'function') {
                listarNodos();
            }

            // El botón "Agregar Nodo" ahora es parte del contenido cargado.
            // Si api.js usa un event listener directo, necesita ser re-asociado o, mejor,
            // usar delegación de eventos en api.js sobre un contenedor estático.
            // Por ahora, si `agregarBtn` existe, y `agregarNodo` existe, se puede intentar re-asociar.
            const agregarBtn = document.getElementById('agregarBtn');
            if (agregarBtn && typeof agregarNodo === 'function') {
                 // Evitar múltiples listeners si se recarga la sección
                if (!agregarBtn.dataset.listenerAttached) {
                    agregarBtn.addEventListener('click', agregarNodo);
                    agregarBtn.dataset.listenerAttached = 'true';
                }
            }
        }
        
        // Cargar dashboard en tiempo real
        if (sectionId === 'dashboard-rt') {
            if (typeof cargarDashboardRT === 'function') {
                cargarDashboardRT();
            }
        }
        // Para otras secciones, podrías tener funciones de inicialización similares
    }

    // Manejar clics en los enlaces de navegación
    navLinks.forEach(link => {
        link.addEventListener('click', function (event) {
            event.preventDefault();
            const sectionId = this.getAttribute('data-section');

            // Actualizar la clase 'active' en los enlaces de navegación
            navLinks.forEach(nav => nav.classList.remove('active', 'fw-bold'));
            this.classList.add('active', 'fw-bold');
            if (this.closest('.navbar-brand')) { // Si se hizo clic en el brand
                document.querySelector('.navbar-nav .nav-link[data-section="home"]').classList.add('active', 'fw-bold');
            }


            loadSection(sectionId);

            // Si estás usando el historial del navegador para URLs (más avanzado)
            // history.pushState({section: sectionId}, "", `#${sectionId}`);
        });
    });

    // Cargar la sección "home" por defecto al iniciar
    const initialSectionLink = document.querySelector('.navbar-nav .nav-link[data-section="home"]');
    if (initialSectionLink) {
        initialSectionLink.classList.add('active', 'fw-bold');
        loadSection('home');
    } else {
        mainContentArea.innerHTML = "<p>Bienvenido. Selecciona una sección del menú.</p>";
    }

    // (Opcional) Manejar el historial del navegador para atrás/adelante si usas pushState
    // window.addEventListener('popstate', function(event) {
    //     if (event.state && event.state.section) {
    //         loadSection(event.state.section);
    //         navLinks.forEach(nav => {
    //             nav.classList.toggle('active', nav.getAttribute('data-section') === event.state.section);
    //             nav.classList.toggle('fw-bold', nav.getAttribute('data-section') === event.state.section);
    //         });
    //     }
    // });
});