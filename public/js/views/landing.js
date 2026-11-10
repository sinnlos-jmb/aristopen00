import { esc } from '../ui.js';
import { renderSiteFooter } from './shared.js';
// public/js/views/landing.js

export function createLandingView(App) {
  const el = document.createElement('div');
  el.className = 'landing-view scrollable has-scroll'; 
  
  // Obtenemos las métricas reales a través de tu capa de repositorio
  const repo = typeof App.S.repo !== 'undefined' ? App.S.repo : App.S; 
  const stats = (repo.getStats && repo.getStats()) || { 
    ultimoPasaje: 'I.1', ultimoBekker: '1094a1', totalConceptos: 0, totalFaqs: 0, trayectosPublicados: 0 
  };

  el.innerHTML = `
    <!-- HERO SECTION -->
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero__content">
        <p class="hero__eyebrow">Curso introductorio interactivo</p>
        <h1 id="hero-title" class="hero__title">Conoce a <em>Aristóteles</em> y su mundo</h1>
        <p class="hero__lead">
          Un recorrido por la virtud, el conocimiento y el sentido de una vida bien vivida. 
          Dialogá con el filósofo, explorá los grafos conceptuales o experimentá en el laboratorio.
        </p>
        <div class="hero__actions">
          <a href="#/chat" class="btn btn--primary btn--lg">Entrar al diálogo</a>
          <a href="#/lab" class="btn btn--secondary btn--lg">Ir al laboratorio</a>
          <a href="#/reading" class="btn btn--ghost btn--lg">Leer la Ética</a>
        </div>
      </div>
    </section>

    <!-- MÉTRICAS DE AVANCE (NUEVO) -->
    <section class="section landing-section landing-section--metrics">
      <header class="section__header">
        <div>
          <p class="section__eyebrow">Estado del Proyecto</p>
          <h2 class="section__title">Métricas del Corpus Digital</h2>
          <p class="section__description">Avance de la digitalización, estructuración y curaduría de la Ética Nicomaquea proveniente de la base de datos.</p>
        </div>
      </header>
      
      <div class="card-grid card-grid--catalog" role="list">
        
        <!-- Último pasaje procesado -->
        <article class="card card--proyecto" role="listitem">
          <div class="card__media"><div class="card__icon" aria-hidden="true">📖</div></div>
          <div class="card__body">
            <p class="card__eyebrow">Lectura Avanzada</p>
            <h3 class="card__title">Límite Bekker</h3>
            <p class="card__text">El tagueo manual y la validación semántica han alcanzado el pasaje: <strong>${esc(stats.ultimoPasaje)}</strong>.</p>
          </div>
          <div class="card__footer">
            <span class="card__meta">Ancla actual: <strong>${esc(stats.ultimoBekker)}</strong></span>
          </div>
        </article>

        <!-- Densidad Semántica (Conceptos) -->
        <article class="card card--concepto" role="listitem">
          <div class="card__media"><div class="card__icon" aria-hidden="true">🕸</div></div>
          <div class="card__body">
            <p class="card__eyebrow">Red Conceptual</p>
            <h3 class="card__title">${esc(stats.totalConceptos)} Conceptos</h3>
            <p class="card__text">Términos filosóficos catalogados con sus jerarquías, roles sintácticos y esferas correspondientes.</p>
          </div>
          <div class="card__footer">
            <span class="card__meta">Grafo estático activo</span>
          </div>
        </article>

        <!-- Capacidad Dialógica (FAQs y Trayectos) -->
        <article class="card card--funcionalidad" role="listitem">
          <div class="card__media"><div class="card__icon" aria-hidden="true">💬</div></div>
          <div class="card__body">
            <p class="card__eyebrow">Base Dialógica</p>
            <h3 class="card__title">${esc(stats.totalFaqs)} FAQs detectables</h3>
            <p class="card__text">Preguntas mapeadas al motor de intenciones. Actualmente existen <strong>${esc(stats.trayectosPublicados)} trayectorias publicadas</strong> para guiar las respuestas.</p>
          </div>
          <div class="card__footer">
            <span class="card__meta">Motor dialógico online</span>
          </div>
        </article>

      </div>
    </section>

        <!-- FUNCIONALIDADES -->
        <section class="section landing-section" aria-labelledby="func-title">
          <header class="section__header">
            <div>
              <p class="section__eyebrow">Funcionalidades</p>
              <h2 id="func-title" class="section__title">Herramientas para explorar</h2>
              <p class="section__description">Cada módulo está diseñado para un tipo de investigación: desde el diálogo guiado hasta el análisis estructural.</p>
            </div>
          </header>
          <div class="card-grid card-grid--catalog" role="list" aria-label="Funcionalidades disponibles">
            <article class="card card--funcionalidad" role="listitem">
              <div class="card__media"><div class="card__icon" aria-hidden="true">💬</div></div>
              <div class="card__body">
                <p class="card__eyebrow">Interacción</p>
                <h3 class="card__title">Diálogo socrático</h3>
                <p class="card__text">Conversá con Aristóteles. El bot arma recorridos breves por los conceptos clave de la <em>Ética</em> y te deja elegir en cada paso: seguir, explorar desvíos o cerrar.</p>
              </div>
              <div class="card__footer"><span class="card__meta">Modo: <strong>Dummy</strong> (FAQ) / <strong>Smart</strong> (texto)</span><a href="#/chat" class="btn btn--primary btn--sm">Probar</a></div>
            </article>
            <article class="card card--funcionalidad" role="listitem">
              <div class="card__media"><div class="card__icon" aria-hidden="true">🔬</div></div>
              <div class="card__body">
                <p class="card__eyebrow">Experimentación</p>
                <h3 class="card__title">Laboratorio de trayectorias</h3>
                <p class="card__text">Probá una pregunta e inspeccioná la interpretación del motor: conceptos detectados, intención, selección de FAQ, alternativas descartadas y el recorrido que produciría el diálogo.</p>
              </div>
              <div class="card__footer"><span class="card__meta">Motor · Trayectorias · Corpus · Edición</span><a href="#/lab" class="btn btn--primary btn--sm">Abrir Lab</a></div>
            </article>
            <article class="card card--funcionalidad" role="listitem">
              <div class="card__media"><div class="card__icon" aria-hidden="true">🕸</div></div>
              <div class="card__body">
                <p class="card__eyebrow">Visualización</p>
                <h3 class="card__title">Grafos conceptuales</h3>
                <p class="card__text">Navegá la estructura de la <em>Ética</em> mediante grafos interactivos: esferas del conocimiento, el bien y los bienes, la felicidad, la función (érgon), el alma y la política.</p>
              </div>
              <div class="card__footer"><span class="card__meta">Catálogo · Detalle · Exportar SVG</span><a href="#/grafos" class="btn btn--primary btn--sm">Explorar</a></div>
            </article>
            <article class="card card--funcionalidad" role="listitem">
              <div class="card__media"><div class="card__icon" aria-hidden="true">📖</div></div>
              <div class="card__body">
                <p class="card__eyebrow">Texto original</p>
                <h3 class="card__title">Lectura Bekker</h3>
                <p class="card__text">Leé el texto griego y su traducción en columnas paralelas con anclas Bekker precisas. Abrí citas desde el chat o el lab directamente en el pasaje correspondiente.</p>
              </div>
              <div class="card__footer"><span class="card__meta">Libro I · Paralelo GR/ES · Anclas exactas</span><a href="#/reading" class="btn btn--primary btn--sm">Leer</a></div>
            </article>
            <article class="card card--funcionalidad" role="listitem">
              <div class="card__media"><div class="card__icon" aria-hidden="true">✎</div></div>
              <div class="card__body">
                <p class="card__eyebrow">Curación</p>
                <h3 class="card__title">Editor de trayectorias</h3>
                <p class="card__text">Curá el contenido que reproduce el chat: definí pasos, transiciones, exposiciones, ejemplos y citas. Previsualizá en tiempo real y publicá cuando esté listo.</p>
              </div>
              <div class="card__footer"><span class="card__meta">Borrador → Validación → Publicado</span><a href="#/lab" class="btn btn--primary btn--sm">Editar</a></div>
            </article>
            <article class="card card--funcionalidad" role="listitem">
              <div class="card__media"><div class="card__icon" aria-hidden="true">📋</div></div>
              <div class="card__body">
                <p class="card__eyebrow">Calidad</p>
                <h3 class="card__title">Auditoría del corpus</h3>
                <p class="card__text">Verificá integridad referencial, consistencia de etiquetas, cobertura de conceptos y revisión editorial de trayectorias. Exportá diagnósticos completos.</p>
              </div>
              <div class="card__footer"><span class="card__meta">Errores · Advertencias · Revisiones</span><a href="#/lab" class="btn btn--primary btn--sm">Auditar</a></div>
            </article>
          </div>
        </section>


        <!-- PROYECTO -->
        <section class="section landing-section" aria-labelledby="proyecto-title">
          <header class="section__header">
            <div>
              <p class="section__eyebrow">El proyecto</p>
              <h2 id="proyecto-title" class="section__title">Una interpretación digital de la <em>Ética Nicomaquea</em></h2>
              <p class="section__description">No es una enciclopedia ni un chatbot genérico: es un modelo interpretativo explícito, auditable y extensible.</p>
            </div>
          </header>
          <div class="card-grid card-grid--catalog" role="list" aria-label="Pilares del proyecto">
            <article class="card card--proyecto" role="listitem">
              <div class="card__media"><div class="card__icon" aria-hidden="true">🏛</div></div>
              <div class="card__body"><p class="card__eyebrow">Filosofía primera</p><h3 class="card__title">Metodología aristotélica</h3><p class="card__text">Partimos de los <em>endoxa</em> (opiniones recibidas), subimos a los principios por inducción y bajamos por deducción. El motor no «alucina»: sigue reglas interpretativas declaradas.</p></div>
              <div class="card__footer"><span class="card__meta">Phusis → Areté → Theion</span></div>
            </article>
            <article class="card card--proyecto" role="listitem">
              <div class="card__media"><div class="card__icon" aria-hidden="true">📚</div></div>
              <div class="card__body"><p class="card__eyebrow">Corpus tagueado</p><h3 class="card__title">Texto estructurado</h3><p class="card__text">La <em>Ética</em> está segmentada en unidades, sub-unidades, momentos y conceptos con referencias Bekker precisas. Cada pasaje tiene rol (contexto, responde, matiza) y relaciones argumentativas.</p></div>
              <div class="card__footer"><span class="card__meta">1094a–1181b · Libro I–X</span></div>
            </article>
            <article class="card card--proyecto" role="listitem">
              <div class="card__media"><div class="card__icon" aria-hidden="true">🧭</div></div>
              <div class="card__body"><p class="card__eyebrow">Arquitectura</p><h3 class="card__title">Grafo funcional + estático</h3><p class="card__text">Dos capas: el grafo funcional (relaciones causales: impulsa, genera, perfecciona) y el estático (jerarquía temática). El planificador navega ambos con pesos interpretativos.</p></div>
              <div class="card__footer"><span class="card__meta">Ascendentes · Mediadoras · Pivotes</span></div>
            </article>
            <article class="card card--proyecto" role="listitem">
              <div class="card__media"><div class="card__icon" aria-hidden="true">🗺</div></div>
              <div class="card__body"><p class="card__eyebrow">Regla editorial</p><h3 class="card__title">Trayectorias como regla explícita</h3><p class="card__text">Cada FAQ puede tener un trayecto curado (publicado) que el chat reproduce fielmente. Sin trayecto, el planificador propone uno marcado como «generado». El humano decide; la máquina propone.</p></div>
              <div class="card__footer"><span class="card__meta">Borrador → Validación → Publicado</span></div>
            </article>
            <article class="card card--proyecto" role="listitem">
              <div class="card__media"><div class="card__icon" aria-hidden="true">🔍</div></div>
              <div class="card__body"><p class="card__eyebrow">Caja de cristal</p><h3 class="card__title">Inspección total en el Lab</h3><p class="card__text">El Laboratorio expone todo: detección de conceptos, firmas, ranking de FAQs, alternativas descartadas, scoring de trayectorias, cobertura, inversiones de momento. Nada oculto.</p></div>
              <div class="card__footer"><span class="card__meta">Motor · Trayectorias · Diagnóstico</span></div>
            </article>
            <article class="card card--proyecto" role="listitem">
              <div class="card__media"><div class="card__icon" aria-hidden="true">🧩</div></div>
              <div class="card__body"><p class="card__eyebrow">Abierto</p><h3 class="card__title">Diseñado para crecer</h3><p class="card__text">Nuevos conceptos, relaciones, argumentos, definiciones y trayectorias se añaden al corpus sin tocar código. El manual pedagógico (exposiciones, ejemplos, citas) vive separado del texto original.</p></div>
              <div class="card__footer"><span class="card__meta">JSON · SQL · API REST</span></div>
            </article>
          </div>
        </section>


        <!-- CONCEPTOS -->
        <section class="section landing-section" aria-labelledby="conceptos-title">
          <header class="section__header">
            <div>
              <p class="section__eyebrow">Extensibilidad</p>
              <h2 id="conceptos-title" class="section__title">Conceptos clave del corpus</h2>
              <p class="section__description">El sistema de cards soporta variantes temáticas ilimitadas. Cada concepto tiene su ficha con definiciones, pasajes y relaciones.</p>
            </div>
          </header>
          <div class="card-grid card-grid--catalog" role="list" aria-label="Conceptos clave">
            <article class="card card--concepto" role="listitem"><div class="card__media"><div class="card__icon" aria-hidden="true">🎯</div></div><div class="card__body"><p class="card__eyebrow">Concepto central</p><h3 class="card__title">Eudaimonía</h3><p class="card__text">La felicidad como <em>actividad del alma conforme a la virtud perfecta</em>. Fin último, autosuficiente, elegida por sí misma.</p></div><div class="card__footer"><span class="card__meta">I.4–5, 7 · X.6–8 · Def. por etapas</span></div></article>
            <article class="card card--concepto" role="listitem"><div class="card__media"><div class="card__icon" aria-hidden="true">⚡</div></div><div class="card__body"><p class="card__eyebrow">Concepto central</p><h3 class="card__title">Areté</h3><p class="card__text">La virtud o excelencia: disposición que hace bueno al que la tiene y le permite realizar bien su función. Ética (carácter) y dianoética (intelecto).</p></div><div class="card__footer"><span class="card__meta">II.1–6 · VI.1–2 · 12 virtudes</span></div></article>
            <article class="card card--concepto" role="listitem"><div class="card__media"><div class="card__icon" aria-hidden="true">⚙</div></div><div class="card__body"><p class="card__eyebrow">Concepto central</p><h3 class="card__title">Érgon</h3><p class="card__text">La función propia del ser humano: <em>actividad del alma conforme a razón</em>. Base del argumento de la felicidad en I.7.</p></div><div class="card__footer"><span class="card__meta">I.7 · 1097b22–1098a20</span></div></article>
            <article class="card card--concepto" role="listitem"><div class="card__media"><div class="card__icon" aria-hidden="true">🧠</div></div><div class="card__body"><p class="card__eyebrow">Concepto central</p><h3 class="card__title">Psuché</h3><p class="card__text">El alma como forma del cuerpo vivo. Partes racionales (científico, deliberativo) y no racionales (vegetativo, apetitivo).</p></div><div class="card__footer"><span class="card__meta">I.13 · VI.1 · Partes y virtudes</span></div></article>
            <article class="card card--concepto" role="listitem"><div class="card__media"><div class="card__icon" aria-hidden="true">🤝</div></div><div class="card__body"><p class="card__eyebrow">Concepto central</p><h3 class="card__title">Philía</h3><p class="card__text">La amistad como virtud o con virtud. Tres especies: por utilidad, por placer, por lo bueno. Esencial para la vida feliz.</p></div><div class="card__footer"><span class="card__meta">VIII–IX · 3 especies · Autorreflexividad</span></div></article>
            <article class="card card--concepto" role="listitem"><div class="card__media"><div class="card__icon" aria-hidden="true">🏛</div></div><div class="card__body"><p class="card__eyebrow">Concepto central</p><h3 class="card__title">Polis</h3><p class="card__text">La comunidad política como asociación suprema que busca el bien supremo. El hombre es <em>zoon politikon</em>; la ética culmina en la política.</p></div><div class="card__footer"><span class="card__meta">I.1–2 · X.9 · Puente a la Política</span></div></article>
          </div>
        </section>
        

    ${renderSiteFooter()}

  `;

  return { el };
}