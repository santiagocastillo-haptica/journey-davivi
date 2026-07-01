import { useState, useEffect } from "react";
import { db } from "./firebase";
import {
  doc,
  setDoc,
  getDocs,
  collection,
} from "firebase/firestore";

// Código de acceso para escritura en Firestore.
// No es una contraseña de usuario ni se le pide a nadie en la interfaz —
// va embebido en el código, igual que el firebaseConfig. Su único propósito
// es que las reglas de seguridad de Firestore (rules) rechacen escrituras
// que no vengan de esta app, ya que el repositorio de GitHub es público y
// cualquiera podría copiar el projectId y escribir directamente a la base
// de datos usando el SDK de Firebase sin pasar por esta aplicación.
// Si necesitas rotarlo, cámbialo aquí Y en las reglas de Firestore (deben coincidir).
const ACCESS_PIN = "025afadaf6d649969e344adc0b22acbf";

// ─── PALETA ──────────────────────────────────────────────────────────────────
const C = {
  rojo: "#A41E34",
  rojoBg: "#FBEAEC",
  grisOscuro: "#4D4D4D",
  grisClaro: "#F1F1F1",
  fondoPanel: "#F6F5F3",
  blanco: "#FFFFFF",
  negro: "#1A1A1A",
  borde: "#E3DDD3",
};

// ─── SEGMENTOS ───────────────────────────────────────────────────────────────
const SEGMENTOS = [
  {
    id: "jovenes",
    label: "Adultos Jóvenes",
    rango: "29-44 años",
    color: "#3DA35D",
    tint: "#E8F5EC",
    subsegmentos: [
      "Solteros en construcción patrimonial",
      "Trabajadores con inestabilidad laboral",
      "Proveedores tempranos de adultos mayores",
      "Jefes de familia",
    ],
    hallazgos: {
      motivaciones:
        "Desarrollo personal: enfocan su energía en viajes y estudios, postergando metas tradicionales. Solo el 9,8% de los adultos jóvenes cuenta con vivienda propia. Independencia y autonomía: tendencia en mujeres a posponer la maternidad. Educación financiera: identifican la necesidad de aprender a invertir y gestionar la deuda.",
      problematicas:
        "Inestabilidad laboral: contratos temporales generan periodos de meses sin ingresos. Barreras de acceso a créditos: falta de vida crediticia y empleo fijo. Carga de cuidado y Burnout: jefatura femenina alcanza el 45,4%. Migración por falta de oportunidades: en 2022 salieron 547.000 colombianos.",
      inversiones:
        "Vivienda como ingreso pasivo: la adquisición de vivienda ya no es para habitar, sino como vehículo de inversión. Acciones pero con miedo: interés en acciones frenado por falta de conocimiento técnico. Emprendimientos y educación superior.",
    },
  },
  {
    id: "maduros",
    label: "Adultos Maduros",
    rango: "45-60 años",
    color: "#E8932F",
    tint: "#FDF1E2",
    subsegmentos: [
      "Generación Sándwich Crítica",
      "Solteros Independientes sin Dependientes",
      "Sobrevivientes en Recuperación Financiera",
    ],
    hallazgos: {
      motivaciones:
        "Jubilación libre de pasivos: prioridad alcanzar el retiro sin compromisos financieros. Educación completa de sus hijos: meta de vida prioritaria. Dejar la ciudad a mediano plazo: buscan entornos más tranquilos. Reorganización familiar: 20,2% de hogares en Colombia son unipersonales.",
      problematicas:
        "Generación Sándwich: 1 de cada 3 hogares incluye un adulto mayor; 71% de cuidadores no remunerados. Vulnerabilidad frente a la deuda: imprevistos generan acumulación de deuda. Brecha de género en trayectorias laborales. Incertidumbre pensional. Reducción de las redes de apoyo: 21,2% ya sufre dependencia funcional.",
      inversiones:
        "Finca raíz para generar renta adicional. Calidad de vida, experiencias y viajes. El surgimiento de la salud como necesidad de inversión (4 de cada 10 adultos tiene hipertensión arterial —60% no lo sabe—, 1 de cada 10 sufre diabetes; estas condiciones se gestan en la adultez joven explicando por qué los planes médicos se vuelven impagables más adelante).",
    },
  },
  {
    id: "mayores",
    label: "Adultos Mayores",
    rango: "60 años+",
    color: "#9B8FD9",
    tint: "#EFECFA",
    subsegmentos: [
      "Dependientes (sin pensión)",
      "Pensionados Activos y Emprendedores",
      "Retirados Tradicionales",
    ],
    hallazgos: {
      motivaciones:
        "Tranquilidad en el flujo de ingresos: recibir la pensión es un hito crítico. Productividad autónoma: trabajar bajo sus propios términos. Longevidad saludable: gozar de los próximos años con excelente salud. Vínculos familiares más estrechos.",
      problematicas:
        "Baja cobertura pensional: solo 1 de 4 recibe pensión; 43,8% entre 60-69 sigue trabajando; informalidad 84%. El costo de la salud: Colombia Mayor entrega $223.000/mes. Exclusión digital. Invisibilización comercial y publicitaria. Temor generalizado por fraudes.",
      inversiones:
        "Productos financieros conservadores a corto plazo (CDTs y Fiducias). Proyectos personales, hobbies y legado.",
    },
  },
];

// ─── PROYECTOS ───────────────────────────────────────────────────────────────
const PROYECTOS = [
  { id: "independencia", nombre: "Proyecto Independencia", segmentos: ["jovenes"] },
  { id: "adultez", nombre: "Proyecto Adultez", segmentos: ["jovenes", "maduros"] },
  { id: "metas", nombre: "Proyecto Metas Propias", segmentos: ["maduros"] },
  { id: "apoyo", nombre: "Proyecto Apoyo Bilateral", segmentos: ["maduros"] },
  { id: "rutina", nombre: "Proyecto Nueva Rutina", segmentos: ["maduros", "mayores"] },
  { id: "autonomia", nombre: "Proyecto Autonomía", segmentos: ["mayores"] },
];

// ─── ESTADOS ─────────────────────────────────────────────────────────────────
const ESTADOS = {
  "No abordado": { color: "#9C9690", bg: "#F3F2F0" },
  "En exploración": { color: "#BA7517", bg: "#FDF3E3" },
  "En diseño": { color: "#2F5FA8", bg: "#E8EEF8" },
  Implementado: { color: "#3B7A4C", bg: "#E6F2EA" },
};

// ─── CATEGORÍAS ──────────────────────────────────────────────────────────────
const CATEGORIAS = {
  "Formalización mediante el registro": "#A41E34",
  "Asesor experto": "#2F5FA8",
  "Ahorros preventivos": "#0F6E56",
  "Movilizador de hitos": "#6B4FA0",
  "Metas financieras para momento de vida": "#BA7517",
  Otro: "#6B655F",
};

const CATEGORIAS_DESC = {
  "Formalización mediante el registro":
    "Agrupa iniciativas que buscan hacer visibles y reconocibles dinámicas financieras que hoy ocurren fuera del sistema formal, como apoyos familiares, ingresos informales o responsabilidades compartidas. Su objetivo común es convertir realidades financieras existentes en información útil para fortalecer la relación del cliente con el banco.",
  "Asesor experto":
    "Agrupa iniciativas que incorporan acompañamiento humano especializado para orientar decisiones financieras relevantes, especialmente en momentos de incertidumbre o cambio. Su objetivo común es construir confianza, entregar claridad y guiar al usuario sin que la interacción esté centrada en la venta de productos.",
  "Ahorros preventivos":
    "Agrupa iniciativas orientadas a anticipar eventos que pueden afectar la estabilidad financiera, creando mecanismos de preparación frente a gastos futuros o cambios inesperados. Su objetivo común es anticipar situaciones como salud, cuidado de familiares, retiro, pérdida de ingresos o nuevas responsabilidades económicas.",
  "Movilizador de hitos":
    "Agrupa iniciativas que conectan la oferta del banco con transiciones importantes de la vida del cliente y lo acompañan antes, durante y después de esos momentos. Su objetivo común es activar decisiones financieras asociadas a hitos como vivienda, jubilación, independencia o cambios familiares.",
  "Metas financieras para momento de vida":
    "Agrupa iniciativas que transforman aspiraciones personales del cliente en objetivos financieros concretos, medibles y acompañables dentro del banco. Su objetivo común es ayudar a las personas a planear, organizar y avanzar hacia lo que quieren construir o proteger en una etapa específica de vida.",
  Otro:
    "Agrupa iniciativas que no corresponden a ninguna de las categorías anteriores o que combinan diferentes tipos de intervención. Aplica como espacio flexible para registrar propuestas emergentes que requieran una clasificación posterior.",
};

// ─── INSIGHTS ────────────────────────────────────────────────────────────────
const INSIGHTS_DATA = [
  {
    id: 1,
    nombre: "La inestabilidad contractual no es solo un problema económico, es una crisis de proyecto de vida",
    proyecto: "independencia",
    segmento: "jovenes",
    estado: "No abordado",
    momento: "Solicitud de crédito de consumo",
    descripcion:
      "Para los Adultos Jóvenes que trabajan por prestación de servicios, la inestabilidad contractual no es solo un problema de flujo de caja: erosiona su sentido de progreso y los obliga a depender de ahorros o préstamos familiares durante los meses sin ingresos. El banco aún no distingue entre 'sin ingresos temporalmente' y 'alto riesgo permanente'.",
    evidencias: [
      {
        codigo: "JOV-07",
        cita: "Yo creo que inestabilidad en el sentido laboral... uno tiene meses que no entra nada y eso frena todo lo que uno tiene planeado.",
      },
      {
        codigo: "JOV-03",
        cita: "Yo he saltado de trabajos y eso no ha sido tan bueno, porque también me ha limitado en poder crecer en otras áreas.",
      },
    ],
    oportunidades: [
      "Diseñar un producto de crédito que evalúe ingresos promedio anuales, no ingreso mensual fijo.",
      "Crear un mecanismo de ahorro buffer para contratistas que separe automáticamente un porcentaje durante los meses activos.",
    ],
    iniciativas: [
      {
        nombre: "Crédito para ingresos variables",
        registro:
          "Diseñar un producto crediticio que evalúe el ingreso promedio anual del contratista en lugar del ingreso mensual fijo, reconociendo la naturaleza intermitente de su flujo de caja.",
        equipo: "",
        dueno: "",
        fecha: "",
        objetivo: "",
        metrica: "",
        categoria: "Otro",
      },
    ],
  },
  {
    id: 2,
    nombre: "Los jóvenes están cargando en silencio con una condición que no es la suya",
    proyecto: "independencia",
    segmento: "jovenes",
    estado: "No abordado",
    momento: "Gestión del presupuesto mensual",
    descripcion:
      "Un segmento de adultos jóvenes asume costos del hogar de sus padres (planes complementarios, transporte, mercado) sin que esto sea visible para el banco ni reconocido como obligación financiera real. Este gasto invisible limita su capacidad de ahorro e inversión.",
    evidencias: [
      {
        codigo: "JOV-06",
        cita: "Yo asumo el pago del plan complementario de mis papás. De alguna manera eso también es una ayuda que ellos reciben de mi parte.",
      },
      {
        codigo: "JOV-01",
        cita: "Ellos son las personas de confianza... sí puede llegar algún momento en donde voy a ser ese apoyo ahí.",
      },
    ],
    oportunidades: [
      "Permitir al cliente declarar responsabilidades familiares informales para ajustar el scoring crediticio.",
      "Crear productos de protección familiar que reconozcan el rol de proveedor temprano.",
    ],
    iniciativas: [
      {
        nombre: "Scoring con carga familiar real",
        registro:
          "Permitir al cliente declarar responsabilidades financieras hacia familiares (no declarados como dependientes legales) para que el banco ajuste su evaluación de capacidad de pago de manera más precisa.",
        equipo: "",
        dueno: "",
        fecha: "",
        objetivo: "",
        metrica: "",
        categoria: "Ahorros preventivos",
      },
    ],
  },
  {
    id: 3,
    nombre: "Cuando buscan un aliado financiero, encuentran un vendedor",
    proyecto: "independencia",
    segmento: "jovenes",
    estado: "No abordado",
    momento: "Visita o contacto con el banco",
    descripcion:
      "Los adultos jóvenes llegan al banco buscando orientación estratégica para sus decisiones financieras, pero la interacción termina siendo transaccional: les ofrecen productos sin conocer su contexto. Esto genera desconfianza y sensación de que el banco no los entiende.",
    evidencias: [
      {
        codigo: "JOV-03",
        cita: "Un poquito menos de publicidad y un poquito más de asesoría. El asesoramiento financiero es super importante y sobre todo en nuestro país.",
      },
      {
        codigo: "JOV-04",
        cita: "Más que asesorarnos nos terminaron vendiendo una póliza. Nunca resolvió el tema de la asesoría financiera.",
      },
    ],
    oportunidades: [
      "Diseñar un servicio de asesoría financiera personalizada sin agenda de venta explícita.",
      "Crear un perfil financiero de vida que el asesor consulte antes de cada interacción.",
    ],
    iniciativas: [
      {
        nombre: "Asesor de vida financiera",
        registro:
          "Servicio de asesoría periódica (trimestral o semestral) donde el banco ayuda al cliente a revisar sus metas, ajustar su plan financiero y explorar productos relevantes, sin presión de venta inmediata.",
        equipo: "",
        dueno: "",
        fecha: "",
        objetivo: "",
        metrica: "",
        categoria: "Asesor experto",
      },
    ],
  },
  {
    id: 4,
    nombre: "El temor a incurrir en deudas propias juega en contra de la meta de independencia",
    proyecto: "independencia",
    segmento: "jovenes",
    estado: "No abordado",
    momento: "Evaluación de opciones para vivienda o crédito",
    descripcion:
      "Muchos adultos jóvenes tienen claro que quieren vivienda propia pero el miedo a comprometerse con una deuda a largo plazo los paraliza. Este miedo no es irracional: viene de haber visto imprevistos que destruyen planes financieros en su entorno cercano.",
    evidencias: [
      {
        codigo: "JOV-03",
        cita: "El tiempo es lo más valioso. A veces digo, ¿será que meterme en un apartamento o con ese dinero me dedico a viajar y simplemente vivo?",
      },
      {
        codigo: "JOV-02",
        cita: "Contemplar factores como que el trabajo de un momento a otro se puede acabar. Hay que tener una base, uno no sabe.",
      },
    ],
    oportunidades: [
      "Crear simuladores interactivos que proyecten escenarios de cuota vs. arriendo vs. inversión alternativa.",
      "Diseñar opciones de crédito con períodos de gracia ante pérdida de empleo.",
    ],
    iniciativas: [
      {
        nombre: "Simulador de decisión patrimonial",
        registro:
          "Herramienta digital que permita al cliente comparar escenarios de compra de vivienda, arriendo e inversión alternativa, mostrando el impacto a 5, 10 y 20 años según sus ingresos actuales y proyecciones de vida.",
        equipo: "",
        dueno: "",
        fecha: "",
        objetivo: "",
        metrica: "",
        categoria: "Formalización mediante el registro",
      },
    ],
  },
  {
    id: 5,
    nombre: "La independencia de adultos jóvenes aún es sostenida por las infraestructuras familiares",
    proyecto: "independencia",
    segmento: "jovenes",
    estado: "No abordado",
    momento: "Construcción del patrimonio personal",
    descripcion:
      "La independencia económica declarada de los adultos jóvenes convive con una dependencia silenciosa de redes familiares: heredan vivienda, reciben ayudas en momentos de quiebre, o delegan decisiones financieras complejas a padres o hermanos con más experiencia.",
    evidencias: [
      {
        codigo: "JOV-01",
        cita: "Este apartamento le pertenece a mi mamá. Fue una herencia de mi abuela. Eso también alivia el tema financiero porque no tengo que pagar arriendo.",
      },
      {
        codigo: "JOV-02",
        cita: "Mi mamá me dijo: mire su aplicación y suba los topes para hacer transferencias. Eso no se me había pasado por la cabeza.",
      },
    ],
    oportunidades: [
      "Crear productos de ahorro que funcionen como puentes hacia la independencia real (sin depender de la herencia o el apoyo familiar).",
      "Reconocer la red familiar como contexto válido de decisión financiera del cliente.",
    ],
    iniciativas: [
      {
        nombre: "Producto puente hacia independencia",
        registro:
          "Producto de ahorro con meta programada para la primera cuota inicial de vivienda, que reconoce el aporte de la red familiar como variable dentro del plan, sin presuponer que el cliente está completamente solo.",
        equipo: "",
        dueno: "",
        fecha: "",
        objetivo: "",
        metrica: "",
        categoria: "Movilizador de hitos",
      },
    ],
  },
  {
    id: 6,
    nombre: "Están atrapados entre sostener lo que ya tienen y cuidar lo que todavía no llegó",
    proyecto: "adultez",
    segmento: "maduros",
    estado: "No abordado",
    momento: "Planificación financiera a mediano plazo",
    descripcion:
      "Los adultos maduros sienten que sus recursos están siempre al límite: tienen compromisos con sus hijos, con sus padres mayores y con su propia jubilación. La sensación de que nunca es suficiente genera una parálisis de decisión que les impide avanzar en su patrimonio propio.",
    evidencias: [
      {
        codigo: "MAD-01",
        cita: "Nosotros hicimos un porcentaje de nuestro sueldo que se va destinado a ella [mamá]. Dentro de eso se incluye transporte, todo. Es como un pequeño sueldo.",
      },
    ],
    oportunidades: [
      "Diseñar productos que integren en un solo plan el cuidado de padres mayores y el ahorro pensional propio.",
      "Crear un dashboard financiero de generación sándwich que visualice flujos de entrada y salida de los diferentes frentes.",
    ],
    iniciativas: [
      {
        nombre: "Plan financiero generación sándwich",
        registro:
          "Producto o servicio de asesoría que ayude al cliente maduro a distribuir sus ingresos entre las obligaciones de cuidado familiar (padres mayores), las metas propias (pensión, patrimonio) y la vida cotidiana, con alertas cuando algún frente se desequilibra.",
        equipo: "",
        dueno: "",
        fecha: "",
        objetivo: "",
        metrica: "",
        categoria: "Ahorros preventivos",
      },
    ],
  },
  {
    id: 7,
    nombre: "La incertidumbre pensional no solo preocupa el futuro, paraliza el presente",
    proyecto: "adultez",
    segmento: "maduros",
    estado: "No abordado",
    momento: "Toma de decisiones de inversión",
    descripcion:
      "La incertidumbre sobre la reforma pensional en Colombia no solo genera ansiedad sobre el futuro: bloquea decisiones de inversión presentes porque los adultos maduros no saben con qué base van a contar al jubilarse. El banco podría ser el actor que les da claridad.",
    evidencias: [
      {
        codigo: "MAD-03",
        cita: "Yo me cambié de mi caja de pensión a Skandia únicamente por los asesores. Ellos te asesoran financieramente, te dicen qué existe más allá del banco.",
      },
    ],
    oportunidades: [
      "Crear una herramienta de proyección pensional personalizada integrada al perfil del cliente.",
      "Ofrecer productos de ahorro voluntario pensional con asesoría sobre el impacto de la reforma.",
    ],
    iniciativas: [
      {
        nombre: "Proyector pensional personalizado",
        registro:
          "Herramienta integrada al perfil del cliente que proyecta cuánto recibirá de pensión bajo distintos escenarios (reforma aprobada, no aprobada, jubilación anticipada), y sugiere montos de ahorro voluntario para cubrir la brecha.",
        equipo: "",
        dueno: "",
        fecha: "",
        objetivo: "",
        metrica: "",
        categoria: "Ahorros preventivos",
      },
      {
        nombre: "Asesoría pensional sin agenda de venta",
        registro:
          "Servicio de orientación personalizada sobre el panorama pensional del cliente, que explica opciones disponibles (fondos voluntarios, cesantías, ahorro programado) sin vincular la conversación a la venta de un producto específico.",
        equipo: "",
        dueno: "",
        fecha: "",
        objetivo: "",
        metrica: "",
        categoria: "Asesor experto",
      },
    ],
  },
  {
    id: 8,
    nombre: "Deseo de inversión vs. temor al endeudamiento",
    proyecto: "adultez",
    segmento: "jovenes",
    estado: "No abordado",
    momento: "Evaluación de inversiones",
    descripcion:
      "Los adultos jóvenes tienen interés genuino en invertir (acciones, finca raíz, emprendimiento), pero el temor a endeudarse o a perder el control de sus finanzas los detiene. No es falta de ambición: es falta de criterio para evaluar riesgo sin caer en el casino.",
    evidencias: [
      {
        codigo: "JOV-04",
        cita: "Me parece práctico pero es como un punto intermedio. Yo digo: necesito un criterio, no solo la forma de hacerlo. La asesoría o acompañamiento sería chévere.",
      },
      {
        codigo: "JOV-01",
        cita: "Yo sé que tengo la plata para poder pedir un préstamo y no sea un dolor de cabeza con tasas que me hagan vender un riñón para pagar.",
      },
    ],
    oportunidades: [
      "Crear una ruta de inversión escalonada que empiece con montos pequeños y complejidad baja.",
      "Desarrollar contenido educativo sobre tipos de riesgo antes de ofrecer productos de inversión.",
    ],
    iniciativas: [
      {
        nombre: "Ruta de primera inversión",
        registro:
          "Itinerario progresivo de inversión que inicia con montos mínimos (CDT, fondo de bajo riesgo) y escala gradualmente según el perfil del cliente, acompañado de educación financiera en cada etapa sin presión de venta.",
        equipo: "",
        dueno: "",
        fecha: "",
        objetivo: "",
        metrica: "",
        categoria: "Otro",
      },
    ],
  },
  {
    id: 9,
    nombre: "Una nueva organización financiera surge con hijos que se mantienen con sus padres",
    proyecto: "adultez",
    segmento: "maduros",
    estado: "No abordado",
    momento: "Reorganización del presupuesto familiar",
    descripcion:
      "Cada vez más familias maduras conviven con hijos adultos que aportan al gasto del hogar, generando dinámicas financieras mixtas que el banco no reconoce ni acompaña. Los productos siguen siendo individuales mientras las decisiones son colectivas.",
    evidencias: [
      {
        codigo: "MAD-01",
        cita: "Entre todos los siete nos pagan una mensualidad tanto a mi esposo ya viejos porque no tenemos pensión. Ellos nos pagan en el mes.",
      },
    ],
    oportunidades: [
      "Diseñar cuentas o productos de gestión financiera familiar compartida.",
      "Crear vistas de presupuesto familiar que incluyan aportes de hijos adultos.",
    ],
    iniciativas: [
      {
        nombre: "Cuenta de economía doméstica compartida",
        registro:
          "Producto que permita a varios miembros del hogar (padres e hijos adultos) contribuir a un fondo compartido para gastos del hogar, con visibilidad de quién aporta qué y trazabilidad de los gastos cubiertos.",
        equipo: "",
        dueno: "",
        fecha: "",
        objetivo: "",
        metrica: "",
        categoria: "Formalización mediante el registro",
      },
    ],
  },
  {
    id: 10,
    nombre: "Negar apoyo frente a una necesidad financiera no frenará al cliente, lo desplazará",
    proyecto: "metas",
    segmento: "maduros",
    estado: "No abordado",
    momento: "Solicitud de crédito rechazada o insuficiente",
    descripcion:
      "Cuando el banco le dice que no a un adulto maduro con una necesidad real y concreta (pagar una emergencia médica, apoyar a un familiar, ampliar el negocio), el cliente no se queda quieto: busca por otro lado. Cada rechazo es una invitación implícita a la competencia.",
    evidencias: [
      {
        codigo: "MAD-01",
        cita: "Si necesita un crédito que se lo hagan sin tanto inconveniente. A veces piden muchas cosas y uno no los tiene. Digo yo, sí, porque es que a veces piden muchas cosas.",
      },
      {
        codigo: "JOV-02",
        cita: "Si acá me dicen que no, me busco por otro lado o hago lo imposible por tenerlo. Yo soy de las personas que no me quedo quieto.",
      },
    ],
    oportunidades: [
      "Diseñar alternativas de crédito escalonadas o puente cuando el perfil no cumple el estándar.",
      "Crear un protocolo de rechazo que proponga una ruta de mejora de perfil y un seguimiento activo.",
    ],
    iniciativas: [
      {
        nombre: "Plan de puente al crédito",
        registro:
          "Cuando un cliente no cumple el perfil para un crédito solicitado, en lugar de solo rechazar, el banco propone un plan de 3 o 6 meses con acciones concretas (ahorro mínimo, mejora de historial) y hace seguimiento activo hasta que el cliente esté listo.",
        equipo: "",
        dueno: "",
        fecha: "",
        objetivo: "",
        metrica: "",
        categoria: "Asesor experto",
      },
    ],
  },
  {
    id: 11,
    nombre: "El sueño ya no es acumular, es liberarse",
    proyecto: "metas",
    segmento: "maduros",
    estado: "No abordado",
    momento: "Revisión del plan financiero personal",
    descripcion:
      "Para los adultos maduros, la aspiración financiera dominante ya no es tener más, sino tener menos compromisos. La libertad de deuda, no el patrimonio adicional, es lo que define el éxito en esta etapa. Los productos del banco aún hablan el idioma de la acumulación.",
    evidencias: [
      {
        codigo: "MAD-04",
        cita: "Quiero dejar esta lista pendiente y no tener tanta cosa para hacer. De verdad quiero estar más tranquilo.",
      },
    ],
    oportunidades: [
      "Crear productos de consolidación de deuda orientados a la libertad financiera y no a nueva financiación.",
      "Diseñar comunicaciones que hablen de metas de vida en lugar de metas financieras abstractas.",
    ],
    iniciativas: [
      {
        nombre: "Cuenta de liberación de deuda",
        registro:
          "Producto de ahorro programado con meta específica de pago anticipado de deudas existentes, con proyección visual del 'día cero deudas' y seguimiento mensual del avance.",
        equipo: "",
        dueno: "",
        fecha: "",
        objetivo: "",
        metrica: "",
        categoria: "Metas financieras para momento de vida",
      },
    ],
  },
  {
    id: 12,
    nombre: "El costo de la salud en adultos mayores desestabiliza cualquier planeación financiera previa",
    proyecto: "apoyo",
    segmento: "maduros",
    estado: "No abordado",
    momento: "Cobertura de gastos de salud propios o de familiar mayor",
    descripcion:
      "Los adultos maduros empiezan a enfrentar costos de salud propios (planes complementarios, medicamentos no cubiertos) y de sus padres mayores. Estos gastos no estaban en ningún plan financiero previo y pueden desestabilizar una economía que parecía controlada.",
    evidencias: [
      {
        codigo: "MAD-04",
        cita: "Sería la salud. Mensualmente se nos va una plata pagando la complementaria y muchas veces toca comprar los medicamentos porque no los hay.",
      },
      {
        codigo: "JOV-06",
        cita: "Mi mamá en este momento pues está en manejo de sus quimioterapias. Eso implicó un montón de cosas. Pues hay inversión en tiempo, física, económica.",
      },
    ],
    oportunidades: [
      "Crear un producto de ahorro preventivo para gastos de salud no cubiertos por EPS/póliza.",
      "Integrar al perfil del cliente la carga de salud familiar para ajustar recomendaciones financieras.",
    ],
    iniciativas: [
      {
        nombre: "Fondo de reserva salud familiar",
        registro:
          "Cuenta de ahorro de emergencia específicamente diseñada para gastos de salud no programados (medicamentos, copagos, traslados médicos), con liquidez inmediata y rendimiento moderado.",
        equipo: "",
        dueno: "",
        fecha: "",
        objetivo: "",
        metrica: "",
        categoria: "Ahorros preventivos",
      },
    ],
  },
  {
    id: 13,
    nombre: "Depender de una pensión pequeña o falta de pensión es un quiebre en las finanzas del adulto mayor",
    proyecto: "rutina",
    segmento: "mayores",
    estado: "No abordado",
    momento: "Transición a la jubilación o vida post-laboral",
    descripcion:
      "Muchos adultos mayores llegan a la jubilación sin pensión o con una muy pequeña. Su única red de seguridad son los hijos, quienes tampoco estaban preparados para asumir esta responsabilidad. El sistema financiero los trata como un segmento de bajo valor cuando en realidad son el primer domino de una cadena.",
    evidencias: [
      {
        codigo: "MAYR-03",
        cita: "Ni yo ni mi esposo tenemos pensión. Lo que nos ayudan son mis hijos. Entre todos los siete nos colaboran mensualmente.",
      },
      {
        codigo: "JOV-03",
        cita: "Mis papás no tienen ni pensión ni ahorros. Mi mamá a mí me pide mensualmente ahí se me va una plata. Afortunadamente tengo tres hermanos.",
      },
    ],
    oportunidades: [
      "Crear productos de renta mensual complementaria para adultos mayores sin pensión.",
      "Diseñar productos de ahorro dirigidos a hijos adultos que quieran construir un fondo de cuidado para sus padres.",
    ],
    iniciativas: [
      {
        nombre: "Renta mensual complementaria",
        registro:
          "Producto financiero que permita al adulto mayor o a sus hijos construir un fondo que genere una renta mensual fija, complementando o sustituyendo la pensión ausente.",
        equipo: "",
        dueno: "",
        fecha: "",
        objetivo: "",
        metrica: "",
        categoria: "Movilizador de hitos",
      },
    ],
  },
  {
    id: 14,
    nombre: "La jubilación es una crisis de identidad que nadie anticipa ni acompaña",
    proyecto: "rutina",
    segmento: "mayores",
    estado: "No abordado",
    momento: "Primeros meses post-jubilación",
    descripcion:
      "El retiro laboral no solo cambia el flujo de ingresos: borra la estructura del día, el sentido de propósito y la red social construida en décadas de trabajo. El banco podría ser un actor de acompañamiento en esta transición, pero no lo es.",
    evidencias: [
      {
        codigo: "MAYR-04",
        cita: "Ahora estoy organizando proyectos para iniciar la obra. Me mantengo muy ocupado. Hay un momento en que ya quedó sembrado y listo. Quiero trabajar haciendo esculturas.",
      },
    ],
    oportunidades: [
      "Diseñar un programa de acompañamiento a la transición de jubilación que incluya orientación financiera y de propósito.",
      "Crear productos financieros vinculados a proyectos de vida post-laboral (hobbies, emprendimiento liviano, legado).",
    ],
    iniciativas: [
      {
        nombre: "Programa transición activa",
        registro:
          "Servicio de acompañamiento para clientes en transición a la jubilación que combina asesoría financiera (qué hacer con los ahorros, cómo generar renta) con recursos para definir un proyecto de vida activo en esta etapa.",
        equipo: "",
        dueno: "",
        fecha: "",
        objetivo: "",
        metrica: "",
        categoria: "Movilizador de hitos",
      },
    ],
  },
  {
    id: 15,
    nombre: "Su mayor aspiración ya no es financiera, es trascender",
    proyecto: "rutina",
    segmento: "maduros",
    estado: "No abordado",
    momento: "Planificación de legado",
    descripcion:
      "En la etapa madura avanzada, la motivación ya no es acumular ni incluso liberarse de deudas: es dejar algo que importe. Un bosque para los nietos, una casa familiar, un negocio que continúe. El banco raramente habla el idioma del legado.",
    evidencias: [
      {
        codigo: "MAYR-04",
        cita: "La finca seguirá y estoy haciendo un bosque nativo que la idea es dejarle eso a los nietos. Estoy arreglando un tractor antiguo también para los nietos.",
      },
    ],
    oportunidades: [
      "Crear productos de planificación de legado: fondos para herencia, seguros de vida con enfoque en traspaso de patrimonio.",
      "Diseñar comunicaciones que hablen de trascendencia y legado, no solo de rentabilidad.",
    ],
    iniciativas: [
      {
        nombre: "Plan de legado familiar",
        registro:
          "Producto o servicio de planificación patrimonial que ayude al cliente maduro a organizar qué quiere dejar, a quién y cuándo, combinando herramientas de ahorro, seguros y asesoría legal básica.",
        equipo: "",
        dueno: "",
        fecha: "",
        objetivo: "",
        metrica: "",
        categoria: "Metas financieras para momento de vida",
      },
    ],
  },
  {
    id: 16,
    nombre: "No quieren que los cuiden, quieren que los incluyan",
    proyecto: "autonomia",
    segmento: "mayores",
    estado: "No abordado",
    momento: "Interacción con canales del banco",
    descripcion:
      "Los adultos mayores no quieren ser tratados como vulnerables que necesitan protección especial: quieren ser incluidos en el mundo digital y financiero de manera digna. La condescendencia en la experiencia bancaria es tan excluyente como la barrera digital.",
    evidencias: [
      {
        codigo: "MAYR-03",
        cita: "A nivel bancario deberían ser más amigables con la tercera edad. La app tiene un proceso que no es amigable. Para personas de tercera edad debería ser mucho más sencillo.",
      },
      {
        codigo: "MAYR-03",
        cita: "Yo quisiera que el banco pueda hacer convenio con esas empresas para poder uno no cargar efectivo. Pues no es mucho, pero sí, para pagarlo con la tarjeta.",
      },
    ],
    oportunidades: [
      "Rediseñar la experiencia digital con modo de accesibilidad para adultos mayores (sin infantilizar).",
      "Crear canales de onboarding presencial o por videollamada específicos para este segmento.",
    ],
    iniciativas: [
      {
        nombre: "Experiencia bancaria accesible",
        registro:
          "Rediseño de la app y los canales digitales con modo de accesibilidad para adultos mayores que simplifique flujos sin reducir funcionalidad, más un servicio de banca asistida por videollamada para trámites complejos.",
        equipo: "",
        dueno: "",
        fecha: "",
        objetivo: "",
        metrica: "",
        categoria: "Otro",
      },
    ],
  },
  {
    id: 17,
    nombre: "Más que falta de voluntad, es miedo a equivocarse a solas",
    proyecto: "autonomia",
    segmento: "mayores",
    estado: "No abordado",
    momento: "Uso de canales digitales",
    descripcion:
      "Los adultos mayores no rechazan la tecnología por incapacidad: la evitan porque el costo de equivocarse parece muy alto (fraude, pérdida de dinero, no entender cómo revertir). Necesitan acompañamiento, no solo instrucciones.",
    evidencias: [
      {
        codigo: "MAD-05",
        cita: "El tema de la inseguridad es tan mal como la estamos viviendo... uno quiere hacer una transacción y tiene miedo. Hay que tener mucho cuidado con eso.",
      },
      {
        codigo: "MAYR-03",
        cita: "Hay veces me explican y no entiendo, entonces yo sé, bueno, mami, yo lo hago y ya después me explican ya con más calma.",
      },
      {
        codigo: "MAYR-04",
        cita: "Me da duro siempre al principio. Prefiero hacerlo en el computador porque mirar ahí eso chiquito y para escribir es chinche. Pero hoy en día ya la app me ha salvado varias veces.",
      },
    ],
    oportunidades: [
      "Diseñar tutoriales contextuales dentro de la app que aparezcan justo cuando el usuario lo necesita.",
      "Crear un servicio de acompañamiento digital personalizado para la primera experiencia con cada función.",
    ],
    iniciativas: [
      {
        nombre: "Modo acompañado en la app",
        registro:
          "Funcionalidad de la app que permite activar un modo de tutoriales paso a paso con mensajes de confirmación explícitos antes de ejecutar cualquier transacción, reduciendo el miedo a equivocarse sin quitar la autonomía.",
        equipo: "",
        dueno: "",
        fecha: "",
        objetivo: "",
        metrica: "",
        categoria: "Otro",
      },
    ],
  },
  {
    id: 18,
    nombre: "El minimalismo en las deudas no significa falta de interés en productos",
    proyecto: "autonomia",
    segmento: "mayores",
    estado: "No abordado",
    momento: "Exploración de productos financieros",
    descripcion:
      "Los adultos mayores evitan activamente las deudas, pero esto no significa que no quieran productos financieros: buscan opciones de bajo riesgo, alta liquidez y fácil comprensión. El banco tiende a no ofrecerles nada nuevo asumiendo que ya no son un segmento activo.",
    evidencias: [
      {
        codigo: "MAYR-04",
        cita: "Pues uno pensaría en créditos, pero es que las tasas son muy altas. También sería chévere tener una inducción más personalizada para toda la parte de la app y el portal.",
      },
      {
        codigo: "MAYR-05",
        cita: "El banco ha logrado detener cualquier intento de fraude. Cada vez que hay una transacción me llega correo y mensaje. Eso me ha parecido buenísimo.",
      },
    ],
    oportunidades: [
      "Crear un portafolio de productos simples y seguros específicamente comunicado para adultos mayores.",
      "Diseñar campañas que visibilicen a adultos mayores como clientes activos e interesados, no solo como receptores de pensión.",
    ],
    iniciativas: [
      {
        nombre: "Portafolio simple para mayores",
        registro:
          "Catálogo de 3-4 productos financieros de bajo riesgo (CDT, fiducia, cuenta de ahorro con rendimiento) presentados con lenguaje claro, sin tecnicismos, con ejemplos de cuánto rinde $1.000.000 en cada opción.",
        equipo: "",
        dueno: "",
        fecha: "",
        objetivo: "",
        metrica: "",
        categoria: "Movilizador de hitos",
      },
    ],
  },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function categoriasDeInsight(insight) {
  return [...new Set(insight.iniciativas.map((i) => i.categoria).filter(Boolean))];
}

function proyectoDeInsight(id) {
  return PROYECTOS.find((p) => p.id === id);
}

function segmentoDeInsight(id) {
  return SEGMENTOS.find((s) => s.id === id);
}

// Devuelve todos los segmentos a los que pertenece un insight.
// Si su proyecto es transversal (múltiples segmentos), hereda todos ellos.
// Si no, devuelve el segmento propio del insight.
function segmentosDeInsight(insight) {
  const proy = proyectoDeInsight(insight.proyecto);
  if (!proy) return [segmentoDeInsight(insight.segmento)].filter(Boolean);
  if (proy.segmentos.length > 1) {
    return proy.segmentos.map((sid) => SEGMENTOS.find((s) => s.id === sid)).filter(Boolean);
  }
  return [SEGMENTOS.find((s) => s.id === insight.segmento)].filter(Boolean);
}

// ─── COMPONENTES REUTILIZABLES ───────────────────────────────────────────────
function Pill({ label, color = C.rojo, bg, small }) {
  const s = small ? { fontSize: 10, padding: "2px 8px" } : { fontSize: 11, padding: "3px 10px" };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 99,
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        backgroundColor: bg || (color + "18"),
        color: color,
        ...s,
      }}
    >
      {label}
    </span>
  );
}

function StatCard({ value, label, color = C.rojo }) {
  return (
    <div
      style={{
        background: C.blanco,
        border: `1px solid ${C.borde}`,
        borderRadius: 16,
        padding: "20px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <span style={{ fontSize: 36, fontWeight: 800, color, lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: 13, color: C.grisOscuro, fontWeight: 500 }}>{label}</span>
    </div>
  );
}

function EstadoBadge({ estado, onChange }) {
  const cfg = ESTADOS[estado] || ESTADOS["No abordado"];
  if (onChange) {
    return (
      <select
        value={estado}
        onChange={(e) => onChange(e.target.value)}
        style={{
          border: `1.5px solid ${cfg.color}`,
          borderRadius: 99,
          padding: "4px 12px",
          fontSize: 12,
          fontWeight: 700,
          color: cfg.color,
          background: cfg.bg,
          cursor: "pointer",
          outline: "none",
          fontFamily: "Inter, sans-serif",
        }}
      >
        {Object.keys(ESTADOS).map((e) => (
          <option key={e} value={e}>{e}</option>
        ))}
      </select>
    );
  }
  return (
    <span
      style={{
        borderRadius: 99,
        padding: "4px 12px",
        fontSize: 12,
        fontWeight: 700,
        color: cfg.color,
        background: cfg.bg,
        border: `1.5px solid ${cfg.color}`,
      }}
    >
      {estado}
    </span>
  );
}

// ─── CONTADORES ──────────────────────────────────────────────────────────────
function Contadores({ insights }) {
  const total = insights.length;
  const sinAbordar = insights.filter((i) => i.estado === "No abordado").length;
  const enCurso = insights.filter(
    (i) => i.estado === "En exploración" || i.estado === "En diseño"
  ).length;
  const implementados = insights.filter((i) => i.estado === "Implementado").length;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 32 }}>
      <StatCard value={total} label="Total insights documentados" color={C.rojo} />
      <StatCard value={sinAbordar} label="Sin abordar" color={ESTADOS["No abordado"].color} />
      <StatCard value={enCurso} label="En curso" color={ESTADOS["En exploración"].color} />
      <StatCard value={implementados} label="Implementados" color={ESTADOS["Implementado"].color} />
    </div>
  );
}

// ─── ESTADOS DE INICIATIVA ───────────────────────────────────────────────────
const ESTADOS_INICIATIVA = {
  Pendiente: { color: "#9C9690", bg: "#F3F2F0" },
  "En desarrollo": { color: "#BA7517", bg: "#FDF3E3" },
  Implementado: { color: "#3B7A4C", bg: "#E6F2EA" },
};

// ─── TARJETA PLAN DE ACCIÓN (con edición / eliminación / hilo de comentarios) ─
function TarjetaIniciativa({ ini, idx, onUpdate, onDelete }) {
  const [editando, setEditando] = useState(false);
  const [draft, setDraft] = useState({ ...ini });
  const [comentando, setComentando] = useState(false);
  const [nuevoComentario, setNuevoComentario] = useState("");

  function guardarEdicion() {
    onUpdate(idx, draft);
    setEditando(false);
  }

  function agregarComentario() {
    if (!nuevoComentario.trim()) return;
    const comentarios = [...(ini.comentarios || []), { texto: nuevoComentario.trim(), fecha: new Date().toLocaleDateString("es-CO") }];
    onUpdate(idx, { ...ini, comentarios });
    setNuevoComentario("");
    setComentando(false);
  }

  const catColor = CATEGORIAS[ini.categoria];
  const estIni = ESTADOS_INICIATIVA[ini.estadoIniciativa || "Pendiente"];

  if (editando) {
    return (
      <div style={{ background: C.blanco, border: `2px solid ${C.rojo}`, borderRadius: 12, padding: 16 }}>
        <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, color: C.rojo, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Editando iniciativa
        </p>
        {[
          { key: "nombre", label: "Título *" },
          { key: "descripcion", label: "Descripción" },
          { key: "equipo", label: "Equipo responsable" },
          { key: "dueno", label: "Dueño" },
          { key: "fecha", label: "Fecha objetivo" },
          { key: "metrica", label: "Métrica de éxito" },
        ].map(({ key, label }) => (
          <div key={key} style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 11, color: C.grisOscuro, fontWeight: 600, display: "block", marginBottom: 3 }}>{label}</label>
            <input
              value={draft[key] || ""}
              onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
              style={{ width: "100%", border: `1px solid ${C.borde}`, borderRadius: 8, padding: "6px 10px", fontSize: 13, fontFamily: "Inter, sans-serif", outline: "none", boxSizing: "border-box" }}
            />
          </div>
        ))}
        <div style={{ marginBottom: 8 }}>
          <label style={{ fontSize: 11, color: C.grisOscuro, fontWeight: 600, display: "block", marginBottom: 3 }}>Categoría</label>
          <select value={draft.categoria || ""} onChange={(e) => setDraft({ ...draft, categoria: e.target.value })}
            style={{ width: "100%", border: `1px solid ${C.borde}`, borderRadius: 8, padding: "6px 10px", fontSize: 13, fontFamily: "Inter, sans-serif", outline: "none", background: C.blanco }}>
            <option value="">Sin categoría</option>
            {Object.keys(CATEGORIAS).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: C.grisOscuro, fontWeight: 600, display: "block", marginBottom: 3 }}>Estado</label>
          <select value={draft.estadoIniciativa || "Pendiente"} onChange={(e) => setDraft({ ...draft, estadoIniciativa: e.target.value })}
            style={{ width: "100%", border: `1px solid ${C.borde}`, borderRadius: 8, padding: "6px 10px", fontSize: 13, fontFamily: "Inter, sans-serif", outline: "none", background: C.blanco }}>
            {Object.keys(ESTADOS_INICIATIVA).map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={guardarEdicion} style={{ background: C.rojo, color: C.blanco, border: "none", borderRadius: 99, padding: "7px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
            Guardar
          </button>
          <button onClick={() => { setDraft({ ...ini }); setEditando(false); }} style={{ background: "none", border: `1px solid ${C.borde}`, borderRadius: 99, padding: "7px 16px", fontSize: 12, cursor: "pointer", fontFamily: "Inter, sans-serif", color: C.grisOscuro }}>
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: C.blanco, border: `1px solid ${C.borde}`, borderRadius: 12, padding: 16 }}>
      {/* Header pills */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
        <Pill label="Plan de acción" color={C.negro} bg="#EBEBEB" small />
        {catColor && <Pill label={ini.categoria} color={catColor} bg={catColor + "15"} small />}
        <span style={{
          marginLeft: "auto",
          borderRadius: 99,
          padding: "2px 10px",
          fontSize: 11,
          fontWeight: 700,
          color: estIni.color,
          background: estIni.bg,
          border: `1.5px solid ${estIni.color}`,
          whiteSpace: "nowrap",
        }}>
          {ini.estadoIniciativa || "Pendiente"}
        </span>
      </div>

      {/* Nombre */}
      <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: C.negro }}>{ini.nombre}</p>

      {/* Descripción */}
      {ini.descripcion && (
        <p style={{ margin: "0 0 8px", fontSize: 13, color: C.grisOscuro, lineHeight: 1.5 }}>{ini.descripcion}</p>
      )}
      {/* Registro (idea original) si existe y es diferente al nombre */}
      {ini.registro && ini.registro !== ini.nombre && (
        <p style={{ margin: "0 0 8px", fontSize: 12, color: C.grisOscuro, fontStyle: "italic", lineHeight: 1.5 }}>{ini.registro}</p>
      )}

      {/* Metadata */}
      {(ini.equipo || ini.dueno || ini.fecha) && (
        <div style={{ fontSize: 12, color: "#999", display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
          {ini.equipo && <span>Equipo: {ini.equipo}</span>}
          {ini.dueno && <span>Dueño: {ini.dueno}</span>}
          {ini.fecha && <span>Fecha: {ini.fecha}</span>}
        </div>
      )}

      {/* Hilo de comentarios */}
      {ini.comentarios && ini.comentarios.length > 0 && (
        <div style={{ borderTop: `1px solid ${C.borde}`, paddingTop: 10, marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
          {ini.comentarios.map((c, ci) => (
            <div key={ci} style={{ background: C.fondoPanel, borderRadius: 8, padding: "8px 12px" }}>
              <p style={{ margin: 0, fontSize: 13, color: "#333", lineHeight: 1.5 }}>{c.texto}</p>
              <span style={{ fontSize: 10, color: "#aaa" }}>{c.fecha}</span>
            </div>
          ))}
        </div>
      )}

      {/* Agregar comentario inline */}
      {comentando && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
          <textarea
            value={nuevoComentario}
            onChange={(e) => setNuevoComentario(e.target.value)}
            placeholder="Escribe una actualización..."
            rows={2}
            style={{ width: "100%", border: `1px solid ${C.borde}`, borderRadius: 8, padding: "7px 10px", fontSize: 13, fontFamily: "Inter, sans-serif", resize: "none", outline: "none", boxSizing: "border-box" }}
          />
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={agregarComentario} style={{ background: C.rojo, color: C.blanco, border: "none", borderRadius: 99, padding: "5px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
              Publicar
            </button>
            <button onClick={() => { setComentando(false); setNuevoComentario(""); }} style={{ background: "none", border: `1px solid ${C.borde}`, borderRadius: 99, padding: "5px 12px", fontSize: 12, cursor: "pointer", fontFamily: "Inter, sans-serif", color: C.grisOscuro }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Acciones */}
      <div style={{ display: "flex", gap: 10, marginTop: 10, borderTop: `1px solid ${C.borde}`, paddingTop: 10 }}>
        <button onClick={() => setEditando(true)} style={{ background: "none", border: "none", fontSize: 12, color: C.grisOscuro, cursor: "pointer", fontFamily: "Inter, sans-serif", padding: 0, fontWeight: 600 }}>
          ✏️ Editar
        </button>
        <button onClick={() => setComentando(true)} style={{ background: "none", border: "none", fontSize: 12, color: C.grisOscuro, cursor: "pointer", fontFamily: "Inter, sans-serif", padding: 0, fontWeight: 600 }}>
          💬 Comentar
        </button>
        <button onClick={() => onDelete(idx)} style={{ background: "none", border: "none", fontSize: 12, color: "#cc3333", cursor: "pointer", fontFamily: "Inter, sans-serif", padding: 0, fontWeight: 600, marginLeft: "auto" }}>
          🗑 Eliminar
        </button>
      </div>
    </div>
  );
}

// ─── FICHA DE INSIGHT ─────────────────────────────────────────────────────────
function FichaInsight({ insight, origen, onVolver, onUpdate }) {
  const [iniciativas, setIniciativas] = useState(
    insight.iniciativas.map((i) => ({ estadoIniciativa: "Pendiente", comentarios: [], ...i }))
  );
  const [estado, setEstado] = useState(insight.estado);
  const [form, setForm] = useState({
    nombre: "",
    descripcion: "",
    categoria: "",
    equipo: "",
    dueno: "",
    fecha: "",
    metrica: "",
    estadoIniciativa: "Pendiente",
  });

  const proyecto = proyectoDeInsight(insight.proyecto);
  const segmento = segmentoDeInsight(insight.segmento);
  const segmentosIns = segmentosDeInsight(insight);

  function handleEstado(nuevoEstado) {
    setEstado(nuevoEstado);
    onUpdate && onUpdate(insight.id, { estado: nuevoEstado });
  }

  function handleUpdateIniciativa(idx, cambios) {
    const nuevas = iniciativas.map((ini, i) => (i === idx ? { ...ini, ...cambios } : ini));
    setIniciativas(nuevas);
    onUpdate && onUpdate(insight.id, { iniciativas: nuevas });
  }

  function handleDeleteIniciativa(idx) {
    const nuevas = iniciativas.filter((_, i) => i !== idx);
    setIniciativas(nuevas);
    onUpdate && onUpdate(insight.id, { iniciativas: nuevas });
  }

  function handleGuardar() {
    if (!form.nombre.trim()) return;
    const nueva = { ...form, registro: form.nombre, comentarios: [] };
    const nuevas = [...iniciativas, nueva];
    setIniciativas(nuevas);
    onUpdate && onUpdate(insight.id, { iniciativas: nuevas });
    const nuevoEstado = estado === "No abordado" ? "En exploración" : estado;
    setEstado(nuevoEstado);
    setForm({ nombre: "", descripcion: "", categoria: "", equipo: "", dueno: "", fecha: "", metrica: "", estadoIniciativa: "Pendiente" });
  }

  return (
    <div style={{ padding: "0 48px 48px" }}>
      <button
        onClick={onVolver}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: C.rojo,
          fontSize: 14,
          fontWeight: 600,
          padding: "16px 0",
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontFamily: "Inter, sans-serif",
        }}
      >
        ← Volver {origen === "dashboard" ? "al Dashboard" : "al Journey"}
      </button>

      <div
        style={{
          border: `3px solid ${C.rojo}`,
          borderRadius: 24,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 32px",
            borderBottom: `1px solid ${C.borde}`,
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: C.blanco,
          }}
        >
          <Pill label="Insight" color={C.rojo} bg={C.rojoBg} />
          <span style={{ color: C.grisOscuro, fontSize: 13 }}>·</span>
          {proyecto && (
            <span style={{ color: C.grisOscuro, fontSize: 13, fontWeight: 500 }}>
              {proyecto.nombre}
            </span>
          )}
          <div style={{ marginLeft: "auto" }}>
            <EstadoBadge estado={estado} onChange={handleEstado} />
          </div>
        </div>

        {/* Body */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            minHeight: 400,
          }}
        >
          {/* Columna izquierda */}
          <div
            style={{
              padding: "32px",
              borderRight: `1px solid ${C.borde}`,
              display: "flex",
              flexDirection: "column",
              gap: 32,
              background: C.blanco,
            }}
          >
            {/* Insight */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                {segmentosIns.map((sg) => (
                  <Pill
                    key={sg.id}
                    label={sg.label}
                    color={sg.color}
                    bg={sg.tint}
                    small
                  />
                ))}
              </div>
              <h2
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: C.negro,
                  lineHeight: 1.35,
                  margin: "0 0 16px",
                }}
              >
                {insight.nombre}
              </h2>
              <p style={{ fontSize: 15, color: "#333", lineHeight: 1.7, margin: 0 }}>
                {insight.descripcion}
              </p>
            </div>

            {/* Evidencias */}
            {insight.evidencias && insight.evidencias.length > 0 && (
              <div>
                <h4
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: C.grisOscuro,
                    margin: "0 0 12px",
                  }}
                >
                  Evidencia de campo
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {insight.evidencias.map((ev, i) => (
                    <div
                      key={i}
                      style={{
                        background: C.fondoPanel,
                        borderRadius: 12,
                        padding: "14px 16px",
                        borderLeft: `3px solid ${C.rojo}`,
                      }}
                    >
                      <p
                        style={{
                          margin: "0 0 6px",
                          fontSize: 14,
                          color: "#333",
                          fontStyle: "italic",
                          lineHeight: 1.6,
                        }}
                      >
                        "{ev.cita}"
                      </p>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: C.grisOscuro,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        — {ev.codigo}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Oportunidades */}
            {insight.oportunidades && insight.oportunidades.length > 0 && (
              <div>
                <h4
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: C.grisOscuro,
                    margin: "0 0 12px",
                  }}
                >
                  Oportunidades
                </h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {insight.oportunidades.map((op, i) => (
                    <div
                      key={i}
                      style={{
                        background: C.rojoBg,
                        border: `1px solid ${C.rojo}30`,
                        borderRadius: 10,
                        padding: "10px 14px",
                        fontSize: 13,
                        color: C.rojo,
                        lineHeight: 1.5,
                        width: "100%",
                      }}
                    >
                      {op}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Columna derecha */}
          <div
            style={{
              padding: "32px 24px",
              background: C.fondoPanel,
              display: "flex",
              flexDirection: "column",
              gap: 24,
            }}
          >
            {/* Planes de acción existentes */}
            <div>
              <h4
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: C.grisOscuro,
                  margin: "0 0 12px",
                }}
              >
                Plan de acción
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {iniciativas.map((ini, i) => (
                  <TarjetaIniciativa
                    key={i}
                    ini={ini}
                    idx={i}
                    onUpdate={handleUpdateIniciativa}
                    onDelete={handleDeleteIniciativa}
                  />
                ))}
              </div>
            </div>

            {/* Formulario nueva iniciativa */}
            <div>
              <h4
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: C.grisOscuro,
                  margin: "0 0 12px",
                }}
              >
                Nueva iniciativa
              </h4>
              <div
                style={{
                  background: C.blanco,
                  border: `1px solid ${C.borde}`,
                  borderRadius: 12,
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                {[
                  { key: "nombre", label: "Iniciativa *" },
                  { key: "descripcion", label: "Descripción" },
                  { key: "equipo", label: "Equipo responsable" },
                  { key: "dueno", label: "Dueño" },
                  { key: "fecha", label: "Fecha objetivo", placeholder: "ej. Q3 2025" },
                  { key: "metrica", label: "Métrica de éxito" },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label
                      style={{
                        fontSize: 11,
                        color: C.grisOscuro,
                        fontWeight: 600,
                        display: "block",
                        marginBottom: 3,
                      }}
                    >
                      {label}
                    </label>
                    <input
                      value={form[key]}
                      placeholder={placeholder || ""}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      style={{
                        width: "100%",
                        border: `1px solid ${C.borde}`,
                        borderRadius: 8,
                        padding: "7px 10px",
                        fontSize: 13,
                        fontFamily: "Inter, sans-serif",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                ))}
                <div>
                  <label
                    style={{
                      fontSize: 11,
                      color: C.grisOscuro,
                      fontWeight: 600,
                      display: "block",
                      marginBottom: 3,
                    }}
                  >
                    Categoría
                  </label>
                  <select
                    value={form.categoria}
                    onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                    style={{
                      width: "100%",
                      border: `1px solid ${C.borde}`,
                      borderRadius: 8,
                      padding: "7px 10px",
                      fontSize: 13,
                      fontFamily: "Inter, sans-serif",
                      outline: "none",
                      background: C.blanco,
                    }}
                  >
                    <option value="">Sin categoría</option>
                    {Object.keys(CATEGORIAS).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: C.grisOscuro, fontWeight: 600, display: "block", marginBottom: 3 }}>
                    Estado
                  </label>
                  <select
                    value={form.estadoIniciativa}
                    onChange={(e) => setForm({ ...form, estadoIniciativa: e.target.value })}
                    style={{ width: "100%", border: `1px solid ${C.borde}`, borderRadius: 8, padding: "7px 10px", fontSize: 13, fontFamily: "Inter, sans-serif", outline: "none", background: C.blanco }}
                  >
                    {Object.keys(ESTADOS_INICIATIVA).map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
                <button
                  onClick={handleGuardar}
                  style={{
                    background: form.nombre.trim() ? C.rojo : "#ccc",
                    color: C.blanco,
                    border: "none",
                    borderRadius: 99,
                    padding: "9px 20px",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: form.nombre.trim() ? "pointer" : "default",
                    fontFamily: "Inter, sans-serif",
                    marginTop: 4,
                  }}
                >
                  Guardar iniciativa
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── VISTA: HOME ─────────────────────────────────────────────────────────────
function ViewHome({ insights, onNav }) {
  return (
    <div style={{ padding: "40px 48px" }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, color: C.negro, margin: "0 0 8px" }}>
        Te damos la bienvenida
      </h1>
      <p style={{ fontSize: 16, color: C.grisOscuro, maxWidth: 640, lineHeight: 1.7, margin: "0 0 40px" }}>
        En esta herramienta encontrarás el Journey del ciclo de vida del colombiano, los principales
        insights identificados, oportunidades de intervención y un asistente de IA entrenado con la
        investigación realizada.
      </p>

      <Contadores insights={insights} />

      {/* Guía */}
      <div style={{ marginTop: 8 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: C.grisOscuro, letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 20px" }}>
          Guía de la herramienta
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 32 }}>
          {[
            {
              tab: "journey",
              titulo: "Journey Ciclo de Vida",
              desc: "Explora el mapa de vida de los clientes persona natural en tres segmentos etarios. Activa capas de hallazgos e insights por proyecto.",
              color: "#3DA35D",
            },
            {
              tab: "dashboard",
              titulo: "Dashboard de insights",
              desc: "Filtra y explora los 18 insights identificados por segmento, categoría y estado. Abre cada ficha para ver evidencias y planes de acción.",
              color: "#2F5FA8",
            },
            {
              tab: "asistente",
              titulo: "Asistente IA",
              desc: "Entrenado con las entrevistas del estudio. Responde preguntas específicas sobre hallazgos, segmentos y contextos de vida.",
              color: "#6B4FA0",
            },
          ].map((s) => (
            <div
              key={s.tab}
              onClick={() => onNav(s.tab)}
              style={{
                background: C.blanco,
                border: `1px solid ${C.borde}`,
                borderRadius: 16,
                padding: 24,
                cursor: "pointer",
                transition: "box-shadow 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)")}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
            >
              <div
                style={{
                  width: 32,
                  height: 4,
                  borderRadius: 2,
                  background: s.color,
                  marginBottom: 14,
                }}
              />
              <h3 style={{ fontSize: 15, fontWeight: 700, color: C.negro, margin: "0 0 8px" }}>
                {s.titulo}
              </h3>
              <p style={{ fontSize: 13, color: C.grisOscuro, lineHeight: 1.6, margin: 0 }}>
                {s.desc}
              </p>
            </div>
          ))}
        </div>


      </div>
    </div>
  );
}

// ─── TARJETA PROYECTO (colapsable, todos los insights del proyecto) ───────────
function TarjetaProyecto({ proy, insights, mostrarInsights, onOpenFicha }) {
  const [abierto, setAbierto] = useState(false);

  // Todos los insights del proyecto, sin filtrar por segmento
  const insightsProy = insights.filter((i) => i.proyecto === proy.id);

  // Si el proyecto cruza más de un segmento, mostrar badges de todos sus segmentos
  const esTransversal = proy.segmentos.length > 1;

  // Los insights solo se despliegan si el toggle "Insights y oportunidades" está activo
  const mostrandoInsights = abierto && mostrarInsights;

  return (
    <div style={{ marginBottom: 10 }}>
      {/* Botón proyecto + badge transversal */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <button
          onClick={() => setAbierto(!abierto)}
          style={{
            background: C.negro,
            color: C.blanco,
            border: "none",
            borderRadius: 99,
            padding: "7px 16px",
            fontSize: 13,
            fontWeight: 700,
            cursor: mostrarInsights ? "pointer" : "default",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "Inter, sans-serif",
            opacity: mostrarInsights ? 1 : 0.85,
          }}
        >
          {proy.nombre}
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.18)",
            fontSize: 12,
            transform: mostrandoInsights ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}>
            ↓
          </span>
        </button>

        {/* Badges de segmentos cruzados */}
        {esTransversal && proy.segmentos.map((sid) => {
          const seg = SEGMENTOS.find((s) => s.id === sid);
          if (!seg) return null;
          return (
            <span
              key={sid}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11,
                fontWeight: 700,
                borderRadius: 99,
                padding: "3px 10px",
                border: `1.5px dashed ${seg.color}`,
                color: seg.color,
                background: seg.color + "12",
              }}
            >
              <span style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: seg.color,
                display: "inline-block",
                flexShrink: 0,
              }} />
              {seg.label}
            </span>
          );
        })}
      </div>

      {/* Insights desplegados — solo si "Insights y oportunidades" está activo */}
      {mostrandoInsights && insightsProy.length > 0 && (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
          {insightsProy.map((ins) => {
            const segsIns = segmentosDeInsight(ins);
            return (
              <div
                key={ins.id}
                style={{
                  background: C.blanco,
                  border: `1px solid ${C.borde}`,
                  borderRadius: 12,
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                }}
              >
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
                  {/* Pills de segmento */}
                  {segsIns.length > 0 && (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {segsIns.map((sg) => (
                        <span key={sg.id} style={{
                          display: "inline-flex",
                          alignSelf: "flex-start",
                          fontSize: 10,
                          fontWeight: 700,
                          borderRadius: 99,
                          padding: "2px 8px",
                          background: sg.color + "18",
                          color: sg.color,
                        }}>
                          {sg.label}
                        </span>
                      ))}
                    </div>
                  )}
                  <span style={{ fontSize: 13, color: C.negro, lineHeight: 1.4 }}>
                    {ins.nombre}
                  </span>
                </div>
                <button
                  onClick={() => onOpenFicha(ins, "journey")}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: C.grisOscuro,
                    fontSize: 16,
                    padding: "0 4px",
                    lineHeight: 1,
                    flexShrink: 0,
                    fontFamily: "Inter, sans-serif",
                    marginTop: 2,
                  }}
                >
                  →
                </button>
              </div>
            );
          })}
        </div>
      )}
      {mostrandoInsights && insightsProy.length === 0 && (
        <div style={{ marginTop: 8, padding: "8px 12px", fontSize: 12, color: C.grisOscuro, fontStyle: "italic" }}>
          Sin insights registrados para este proyecto.
        </div>
      )}
    </div>
  );
}

// ─── VISTA: JOURNEY ───────────────────────────────────────────────────────────
function ViewJourney({ insights, onOpenFicha }) {
  const [segFiltro, setSegFiltro] = useState([]);
  const [mostrarHallazgos, setMostrarHallazgos] = useState(true);
  const [mostrarInsights, setMostrarInsights] = useState(false);

  const toggleSeg = (id) =>
    setSegFiltro((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const segActivos =
    segFiltro.length === 0 ? SEGMENTOS : SEGMENTOS.filter((s) => segFiltro.includes(s.id));

  return (
    <div style={{ padding: "40px 48px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: C.negro, margin: "0 0 6px" }}>
        Journey Ciclo de Vida
      </h1>
      <p style={{ fontSize: 14, color: C.grisOscuro, maxWidth: 680, lineHeight: 1.6, margin: "0 0 32px" }}>
        Mapa del panorama de vida de los clientes persona natural del banco Davivienda en tres
        diferentes segmentos etarios que afectan sus decisiones financieras.
      </p>

      {/* Controles */}
      <div
        style={{
          background: C.fondoPanel,
          border: `1px solid ${C.borde}`,
          borderRadius: 14,
          padding: "14px 24px",
          display: "flex",
          gap: 24,
          alignItems: "center",
          marginBottom: 32,
          flexWrap: "wrap",
        }}
      >
        {/* Segmentos */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: C.grisOscuro, marginRight: 2 }}>
            Segmentos
          </span>
          {SEGMENTOS.map((seg) => {
            const activo = segFiltro.includes(seg.id);
            return (
              <button
                key={seg.id}
                onClick={() => toggleSeg(seg.id)}
                style={{
                  background: activo ? seg.color : C.blanco,
                  color: activo ? C.blanco : seg.color,
                  border: `1.5px solid ${seg.color}`,
                  borderRadius: 99,
                  padding: "5px 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                {seg.label}
              </button>
            );
          })}
        </div>

        {/* Separador */}
        <div style={{ width: 1, height: 28, background: C.borde, flexShrink: 0 }} />

        {/* Diagnóstico */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: C.grisOscuro, marginRight: 2 }}>
            Diagnóstico
          </span>
          {[
            { label: "Hallazgos generales", state: mostrarHallazgos, set: setMostrarHallazgos },
            { label: "Insights y oportunidades", state: mostrarInsights, set: setMostrarInsights },
          ].map(({ label, state, set }) => (
            <button
              key={label}
              onClick={() => set(!state)}
              style={{
                background: state ? C.negro : C.blanco,
                color: state ? C.blanco : C.grisOscuro,
                border: `1.5px solid ${state ? C.negro : C.borde}`,
                borderRadius: 99,
                padding: "5px 14px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "Inter, sans-serif",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Etiqueta sección */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: C.grisOscuro,
          marginBottom: 16,
        }}
      >
        Segmentos de edad
      </div>

      {/* Grid de segmentos */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
        {segActivos.map((seg) => {
          // Todos los proyectos del segmento — sin deduplicar, los transversales
          // aparecen en cada columna que les corresponde (comportamiento intencional).
          const proyectosSeg = PROYECTOS.filter((p) => p.segmentos.includes(seg.id));
          return (
            <div
              key={seg.id}
              style={{
                border: `1.5px solid ${seg.color}30`,
                borderRadius: 18,
                overflow: "hidden",
                background: C.blanco,
              }}
            >
              {/* ── Header segmento ── */}
              <div
                style={{
                  background: seg.tint,
                  padding: "18px 20px 16px",
                  borderBottom: `1px solid ${seg.color}20`,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: seg.color,
                    marginBottom: 4,
                  }}
                >
                  {seg.rango}
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: C.negro, margin: "0 0 12px" }}>
                  {seg.label}
                </h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {seg.subsegmentos.map((sub, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: 11,
                        background: seg.color + "18",
                        color: seg.color,
                        borderRadius: 99,
                        padding: "3px 10px",
                        fontWeight: 600,
                      }}
                    >
                      {sub}
                    </span>
                  ))}
                </div>
              </div>

              {/* ── Hallazgos generales (condicional al toggle) ── */}
              {mostrarHallazgos && (
                <div
                  style={{
                    padding: "16px 20px",
                    borderBottom: `1px solid ${C.borde}`,
                    background: C.blanco,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.07em",
                      textTransform: "uppercase",
                      color: "#555",
                      marginBottom: 14,
                    }}
                  >
                    Hallazgos generales
                  </div>
                  {[
                    { key: "motivaciones", label: "Motivaciones" },
                    { key: "problematicas", label: "Problemáticas" },
                    { key: "inversiones", label: "Inversiones" },
                  ].map(({ key, label }) => (
                    <div key={key} style={{ marginBottom: 12 }}>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          color: seg.color,
                          letterSpacing: "0.06em",
                          marginBottom: 4,
                        }}
                      >
                        {label}
                      </div>
                      <p
                        style={{
                          fontSize: 12,
                          color: "#444",
                          lineHeight: 1.65,
                          margin: 0,
                        }}
                      >
                        {seg.hallazgos[key]}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Proyectos colapsables ── */}
              {/* Los proyectos transversales aparecen en cada columna que les corresponde. */}
              {/* Al desplegar, los insights solo son clickeables cuando Insights está activo. */}
              <div style={{ padding: "16px 20px" }}>
                {proyectosSeg.map((proy) => (
                  <TarjetaProyecto
                    key={proy.id}
                    proy={proy}
                    insights={insights}
                    mostrarInsights={mostrarInsights}
                    onOpenFicha={onOpenFicha}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── VISTA: DASHBOARD ─────────────────────────────────────────────────────────
function ViewDashboard({ insights, onOpenFicha, onUpdate }) {
  const [segFiltro, setSegFiltro] = useState([]);
  const [catFiltro, setCatFiltro] = useState([]);
  const [estFiltro, setEstFiltro] = useState([]);

  const toggleArr = (arr, setArr, val) =>
    setArr(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);

  const filtrados = insights.filter((ins) => {
    const okSeg = segFiltro.length === 0 || segFiltro.includes(ins.segmento);
    const cats = categoriasDeInsight(ins);
    const okCat =
      catFiltro.length === 0 ||
      catFiltro.some((c) => cats.includes(c)) ||
      (catFiltro.includes("_sin") && cats.length === 0);
    const okEst = estFiltro.length === 0 || estFiltro.includes(ins.estado);
    return okSeg && okCat && okEst;
  });

  return (
    <div style={{ padding: "40px 48px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: C.negro, margin: "0 0 6px" }}>
        Dashboard de insights
      </h1>
      <p style={{ fontSize: 14, color: C.grisOscuro, margin: "0 0 32px" }}>
        Resumen del estado de los insights y sus iniciativas asociadas.
      </p>

      <Contadores insights={insights} />

      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 28 }}>
        {/* Filtros */}
        <div
          style={{
            background: C.fondoPanel,
            border: `1px solid ${C.borde}`,
            borderRadius: 16,
            padding: "20px",
            alignSelf: "start",
          }}
        >
          <FilterGroup
            title="Segmentos"
            items={SEGMENTOS.map((s) => ({ value: s.id, label: s.label.split(" | ")[0], color: s.color }))}
            active={segFiltro}
            onToggle={(v) => toggleArr(segFiltro, setSegFiltro, v)}
          />
          <FilterGroup
            title="Estado insights"
            items={Object.entries(ESTADOS).map(([k, v]) => ({ value: k, label: k, color: v.color }))}
            active={estFiltro}
            onToggle={(v) => toggleArr(estFiltro, setEstFiltro, v)}
            mt
          />
          <FilterGroupCategorias
            active={catFiltro}
            onToggle={(v) => toggleArr(catFiltro, setCatFiltro, v)}
          />
          {(segFiltro.length > 0 || catFiltro.length > 0 || estFiltro.length > 0) && (
            <button
              onClick={() => { setSegFiltro([]); setCatFiltro([]); setEstFiltro([]); }}
              style={{
                background: "none",
                border: "none",
                color: C.rojo,
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "Inter, sans-serif",
                fontWeight: 600,
                padding: "8px 0 0",
              }}
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Grid insights */}
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
            {filtrados.map((ins) => {
              const segs = segmentosDeInsight(ins);
              const proy = proyectoDeInsight(ins.proyecto);
              const cats = categoriasDeInsight(ins);
              return (
                <div
                  key={ins.id}
                  style={{
                    background: C.blanco,
                    border: `1px solid ${C.borde}`,
                    borderRadius: 14,
                    padding: 20,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {segs.map((sg) => (
                      <Pill key={sg.id} label={sg.label} color={sg.color} bg={sg.tint} small />
                    ))}
                    {cats.map((c) => (
                      <Pill key={c} label={c} color={CATEGORIAS[c]} bg={CATEGORIAS[c] + "15"} small />
                    ))}
                  </div>
                  {proy && (
                    <span style={{ fontSize: 11, color: C.grisOscuro, fontWeight: 600 }}>
                      {proy.nombre}
                    </span>
                  )}
                  <p style={{ fontSize: 14, fontWeight: 700, color: C.negro, margin: 0, lineHeight: 1.4 }}>
                    {ins.nombre}
                  </p>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                    <EstadoBadge estado={ins.estado} />
                    <button
                      onClick={() => onOpenFicha(ins, "dashboard")}
                      style={{
                        background: "none",
                        border: "none",
                        color: C.rojo,
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: "Inter, sans-serif",
                      }}
                    >
                      Ver ficha →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── FILTRO CATEGORÍAS CON ACORDEÓN ──────────────────────────────────────────
function FilterGroupCategorias({ active, onToggle }) {
  const [abiertos, setAbiertos] = useState({});

  const toggleDesc = (key) =>
    setAbiertos((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div style={{ marginTop: 20 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: C.grisOscuro,
          marginBottom: 8,
        }}
      >
        Categoría de iniciativa
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {Object.entries(CATEGORIAS).map(([nombre, color]) => {
          const isActive = active.includes(nombre);
          const isOpen = !!abiertos[nombre];
          const desc = CATEGORIAS_DESC[nombre];
          return (
            <div
              key={nombre}
              style={{
                border: `1.5px solid ${isActive ? color : C.borde}`,
                borderRadius: 10,
                overflow: "hidden",
                transition: "border-color 0.1s",
              }}
            >
              {/* Fila principal: botón filtro + toggle descripción */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: isActive ? color + "12" : "none",
                }}
              >
                {/* Botón de filtro (clic activa/desactiva el filtro Y abre/cierra descripción) */}
                <button
                  onClick={() => { onToggle(nombre); toggleDesc(nombre); }}
                  style={{
                    flex: 1,
                    background: "none",
                    border: "none",
                    padding: "7px 10px",
                    fontSize: 12,
                    color: isActive ? color : C.grisOscuro,
                    fontWeight: isActive ? 700 : 500,
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "Inter, sans-serif",
                    lineHeight: 1.35,
                  }}
                >
                  {nombre}
                </button>
                {/* Botón expandir descripción (solo expande, no afecta filtro) */}
                <button
                  onClick={() => toggleDesc(nombre)}
                  aria-label={isOpen ? "Cerrar descripción" : "Ver descripción"}
                  style={{
                    background: "none",
                    border: "none",
                    borderLeft: `1px solid ${isActive ? color + "30" : C.borde}`,
                    padding: "7px 10px",
                    cursor: "pointer",
                    color: isActive ? color : C.grisOscuro,
                    fontSize: 13,
                    lineHeight: 1,
                    flexShrink: 0,
                    transition: "transform 0.15s",
                    transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  ›
                </button>
              </div>
              {/* Descripción expandible */}
              {isOpen && desc && (
                <div
                  style={{
                    padding: "8px 12px 10px 10px",
                    borderTop: `1px solid ${isActive ? color + "25" : C.borde}`,
                    background: isActive ? color + "08" : C.fondoPanel,
                  }}
                >
                  <p
                    style={{
                      fontSize: 12,
                      color: C.grisOscuro,
                      lineHeight: 1.6,
                      margin: 0,
                    }}
                  >
                    {desc}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FilterGroup({ title, items, active, onToggle, mt }) {
  return (
    <div style={{ marginTop: mt ? 20 : 0 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: C.grisOscuro,
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {items.map((item) => {
          const isActive = active.includes(item.value);
          return (
            <button
              key={item.value}
              onClick={() => onToggle(item.value)}
              style={{
                background: isActive ? item.color + "18" : "none",
                border: `1.5px solid ${isActive ? item.color : C.borde}`,
                borderRadius: 8,
                padding: "5px 10px",
                fontSize: 12,
                color: isActive ? item.color : C.grisOscuro,
                fontWeight: isActive ? 700 : 500,
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "Inter, sans-serif",
                transition: "all 0.1s",
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── SYSTEM PROMPT para el Asistente IA ─────────────────────────────────────
const SYSTEM_PROMPT = `Eres un asistente de investigación para el proyecto Journey Experience Intelligence de Háptica × Davivienda. Tienes acceso completo a la investigación cualitativa realizada con usuarios del banco Davivienda en Colombia, segmento Persona Natural.

La investigación cubre tres segmentos de edad:
- Adultos Jóvenes (29-44 años): Solteros en construcción patrimonial, Trabajadores con inestabilidad laboral, Proveedores tempranos de adultos mayores, Jefes de familia
- Adultos Maduros (45-60 años): Generación Sándwich Crítica, Solteros Independientes sin Dependientes, Sobrevivientes en Recuperación Financiera
- Adultos Mayores (60+): Dependientes (sin pensión), Pensionados Activos y Emprendedores, Retirados Tradicionales

Los 18 insights identificados cubren temas como inestabilidad laboral, carga de cuidado familiar, incertidumbre pensional, acceso a crédito, desconfianza digital, independencia financiera, legado y trascendencia.

Los proyectos de vida son: Proyecto Independencia (Jóvenes), Proyecto Adultez (Jóvenes + Maduros), Proyecto Metas Propias (Maduros), Proyecto Apoyo Bilateral (Maduros), Proyecto Nueva Rutina (Maduros + Mayores), Proyecto Autonomía (Mayores).

Evidencias reales de entrevistados incluyen voces de: JOV-01, JOV-02, JOV-03, JOV-04, JOV-06, JOV-07, MAD-01, MAD-03, MAD-04, MAD-05, MAYR-03, MAYR-04, MAYR-05.

Puedes responder preguntas sobre la investigación, ayudar a diseñar soluciones financieras, comparar segmentos, analizar insights, y también responder preguntas generales. Responde siempre en español, de manera clara y concisa. Cuando cites evidencias de entrevistados, usa su código (ej. JOV-03).`;

// ─── VISTA: ASISTENTE IA (con Claude API real) ───────────────────────────────
function ViewAsistente({ preguntaInicial }) {
  const [mensajes, setMensajes] = useState([]);
  const [input, setInput] = useState("");
  const [cargando, setCargando] = useState(false);

  const SUGERIDAS = [
    "¿Qué dijeron los usuarios sobre la inestabilidad laboral?",
    "¿Qué diferencias existen entre Adultos Jóvenes y Adultos Mayores?",
    "Quiero diseñar una solución para la incertidumbre pensional. ¿Qué debería considerar?",
    "¿Qué tanto desconfían los usuarios de los canales digitales por miedo a fraudes?",
  ];

  async function enviar(pregunta) {
    if (!pregunta.trim() || cargando) return;
    const nuevos = [...mensajes, { tipo: "usuario", texto: pregunta }];
    setMensajes(nuevos);
    setInput("");
    setCargando(true);

    try {
      const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error("API key no configurada");

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5",
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          messages: [
            ...nuevos
              .filter((m) => m.tipo === "usuario")
              .map((m) => ({ role: "user", content: m.texto })),
          ],
        }),
      });

      if (!response.ok) throw new Error(`Error ${response.status}`);
      const data = await response.json();
      const respuesta = data.content?.[0]?.text || "No se pudo obtener respuesta.";
      setMensajes([...nuevos, { tipo: "bot", texto: respuesta }]);
    } catch (err) {
      setMensajes([
        ...nuevos,
        {
          tipo: "bot",
          texto: `No se pudo conectar con el asistente. ${err.message === "API key no configurada" ? "La clave de API no está disponible en este entorno." : "Verifica tu conexión e inténtalo de nuevo."}`,
        },
      ]);
    } finally {
      setCargando(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviar(input);
    }
  }

  return (
    <div style={{ padding: "40px 48px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: C.negro, margin: "0 0 6px" }}>
        Asistente IA
      </h1>
      <p style={{ fontSize: 14, color: C.grisOscuro, maxWidth: 560, lineHeight: 1.6, margin: "0 0 32px" }}>
        Asistente entrenado con la investigación realizada para construir el journey del ciclo de
        vida. Basado en 17 entrevistas realizadas con usuarios de diferentes segmentos.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 24, alignItems: "start" }}>
        {/* Panel izquierdo */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              background: C.fondoPanel,
              border: `1px solid ${C.borde}`,
              borderRadius: 16,
              padding: 20,
            }}
          >
            <p style={{ fontSize: 12, fontWeight: 700, color: C.grisOscuro, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 12px" }}>
              Preguntas sugeridas
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {SUGERIDAS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => enviar(p)}
                  disabled={cargando}
                  style={{
                    background: C.blanco,
                    border: `1px solid ${C.borde}`,
                    borderRadius: 10,
                    padding: "10px 14px",
                    fontSize: 13,
                    color: C.negro,
                    cursor: cargando ? "default" : "pointer",
                    textAlign: "left",
                    lineHeight: 1.4,
                    fontFamily: "Inter, sans-serif",
                    opacity: cargando ? 0.5 : 1,
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Área de chat */}
        <div
          style={{
            background: C.fondoPanel,
            border: `1px solid ${C.borde}`,
            borderRadius: 16,
            padding: 24,
            minHeight: 400,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {mensajes.length === 0 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: C.grisOscuro, fontSize: 14, textAlign: "center" }}>
              Selecciona una pregunta sugerida o escribe la tuya.
            </div>
          )}
          {mensajes.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.tipo === "usuario" ? "flex-end" : "flex-start" }}>
              <div
                style={{
                  maxWidth: "85%",
                  background: m.tipo === "usuario" ? C.negro : C.blanco,
                  color: m.tipo === "usuario" ? C.blanco : C.negro,
                  borderRadius: m.tipo === "usuario" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  padding: "14px 18px",
                  fontSize: 14,
                  lineHeight: 1.6,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                  whiteSpace: "pre-wrap",
                }}
              >
                {m.texto}
              </div>
            </div>
          ))}
          {cargando && (
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div style={{ background: C.blanco, borderRadius: "16px 16px 16px 4px", padding: "14px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  {[0, 1, 2].map((i) => (
                    <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: C.grisOscuro, opacity: 0.4, animation: `pulse 1s ease-in-out ${i * 0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Input area */}
          <div style={{ marginTop: "auto", display: "flex", gap: 8, paddingTop: 8, borderTop: `1px solid ${C.borde}` }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu pregunta... (Enter para enviar)"
              rows={2}
              disabled={cargando}
              style={{
                flex: 1,
                border: `1px solid ${C.borde}`,
                borderRadius: 10,
                padding: "10px 12px",
                fontSize: 13,
                fontFamily: "Inter, sans-serif",
                resize: "none",
                outline: "none",
                background: cargando ? C.fondoPanel : C.blanco,
              }}
            />
            <button
              onClick={() => enviar(input)}
              disabled={cargando || !input.trim()}
              style={{
                background: cargando || !input.trim() ? "#ccc" : C.rojo,
                color: C.blanco,
                border: "none",
                borderRadius: 10,
                padding: "10px 20px",
                fontSize: 13,
                fontWeight: 700,
                cursor: cargando || !input.trim() ? "default" : "pointer",
                fontFamily: "Inter, sans-serif",
                alignSelf: "flex-end",
              }}
            >
              Enviar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}



export default function JourneyExperienceApp() {
  const [tab, setTab] = useState("home");
  const [insights, setInsights] = useState(INSIGHTS_DATA);
  const [ficha, setFicha] = useState(null);
  const [fichaOrigen, setFichaOrigen] = useState(null);
  const [preguntaAsistente, setPreguntaAsistente] = useState(null);
  const [cargandoFirestore, setCargandoFirestore] = useState(true);

  // Al montar: traer de Firestore el estado y las iniciativas guardadas
  // (si existen) y fusionarlas sobre los datos base del JSX.
  // Los datos fijos de investigación (nombre, descripción, evidencias, oportunidades)
  // siempre vienen de INSIGHTS_DATA; solo "estado" e "iniciativas" pueden venir de Firestore.
  useEffect(() => {
    let cancelado = false;

    async function cargarDesdeFirestore() {
      try {
        const snapshot = await getDocs(collection(db, "insights"));
        if (cancelado) return;

        const guardados = {};
        snapshot.forEach((docSnap) => {
          guardados[docSnap.id] = docSnap.data();
        });

        setInsights((prev) =>
          prev.map((ins) => {
            const remoto = guardados[String(ins.id)];
            if (!remoto) return ins;
            return {
              ...ins,
              estado: remoto.estado ?? ins.estado,
              iniciativas: remoto.iniciativas ?? ins.iniciativas,
            };
          })
        );
      } catch (err) {
        // Si Firestore no responde (sin internet, reglas mal configuradas, etc.)
        // la app sigue funcionando con los datos base del JSX, solo en modo local.
        console.error("No se pudo cargar desde Firestore:", err);
      } finally {
        if (!cancelado) setCargandoFirestore(false);
      }
    }

    cargarDesdeFirestore();
    return () => {
      cancelado = true;
    };
  }, []);

  function handleOpenFicha(ins, origen) {
    setFicha(ins);
    setFichaOrigen(origen);
  }

  function handleVolver() {
    setFicha(null);
    setFichaOrigen(null);
  }

  function handleUpdate(id, cambios) {
    setInsights((prev) =>
      prev.map((ins) => (ins.id === id ? { ...ins, ...cambios } : ins))
    );
    setFicha((prev) => (prev && prev.id === id ? { ...prev, ...cambios } : prev));

    // Persistir en Firestore: guardamos siempre el documento completo
    // de estado + iniciativas para ese insight, fusionando con lo que cambió.
    const insightActual = insights.find((i) => i.id === id);
    const estadoFinal = cambios.estado ?? insightActual?.estado;
    const iniciativasFinal = cambios.iniciativas ?? insightActual?.iniciativas;

    setDoc(doc(db, "insights", String(id)), {
      estado: estadoFinal,
      iniciativas: iniciativasFinal,
      actualizadoEn: new Date().toISOString(),
      pin: ACCESS_PIN,
    }).catch((err) => {
      console.error(`No se pudo guardar el insight ${id} en Firestore:`, err);
    });
  }

  function handleNavFromHome(t, pregunta) {
    if (pregunta) setPreguntaAsistente(pregunta);
    setTab(t);
  }

  const TABS = [
    { id: "journey", label: "Journey Ciclo de Vida" },
    { id: "dashboard", label: "Dashboard de insights" },
    { id: "asistente", label: "Asistente IA" },
  ];

  return (
    <div
      style={{
        fontFamily: "'Inter', sans-serif",
        minHeight: "100vh",
        background: "#FAFAF8",
        color: C.negro,
      }}
    >
      {/* Google Fonts */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'); * { box-sizing: border-box; } @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>

      {/* NAV */}
      <nav
        style={{
          background: C.blanco,
          borderBottom: `1px solid ${C.borde}`,
          padding: "0 48px",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: C.grisOscuro,
            paddingTop: 12,
            marginBottom: 4,
          }}
        >
          Persona natural, ciclo de vida del colombiano
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <button
            onClick={() => { setFicha(null); setTab("home"); }}
            style={{
              padding: "10px 18px",
              borderRadius: "8px 8px 0 0",
              border: "none",
              cursor: "pointer",
              fontFamily: "Inter, sans-serif",
              fontSize: 13,
              fontWeight: 700,
              background: tab === "home" && !ficha ? C.negro : "none",
              color: tab === "home" && !ficha ? C.blanco : C.grisOscuro,
              marginRight: 4,
            }}
          >
            Home
          </button>
          {TABS.map((t) => {
            const activo = tab === t.id && !ficha;
            return (
              <button
                key={t.id}
                onClick={() => { setFicha(null); setTab(t.id); }}
                style={{
                  padding: "10px 18px",
                  borderRadius: "8px 8px 0 0",
                  border: activo ? `1.5px solid ${C.borde}` : "none",
                  borderBottom: activo ? `2px solid ${C.blanco}` : "none",
                  cursor: "pointer",
                  fontFamily: "Inter, sans-serif",
                  fontSize: 13,
                  fontWeight: activo ? 700 : 500,
                  background: activo ? C.blanco : "none",
                  color: activo ? C.negro : C.grisOscuro,
                  marginBottom: activo ? -1 : 0,
                }}
              >
                {t.label}
              </button>
            );
          })}
          <span style={{
            marginLeft: "auto",
            fontSize: 10,
            color: C.grisOscuro,
            fontWeight: 500,
            letterSpacing: "0.04em",
            paddingBottom: 4,
            opacity: 0.7,
          }}>
            Desarrollado por Háptica
          </span>
        </div>
        {cargandoFirestore && (
          <div style={{
            fontSize: 11,
            color: C.grisOscuro,
            padding: "4px 0 8px",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: C.rojo, display: "inline-block",
              animation: "pulse 1s ease-in-out infinite",
            }} />
            Sincronizando con la base de datos compartida…
          </div>
        )}
      </nav>

      {/* CONTENIDO */}
      <main>
        {ficha ? (
          <FichaInsight
            insight={ficha}
            origen={fichaOrigen}
            onVolver={handleVolver}
            onUpdate={handleUpdate}
          />
        ) : tab === "home" ? (
          <ViewHome insights={insights} onNav={handleNavFromHome} />
        ) : tab === "journey" ? (
          <ViewJourney insights={insights} onOpenFicha={handleOpenFicha} />
        ) : tab === "dashboard" ? (
          <ViewDashboard insights={insights} onOpenFicha={handleOpenFicha} onUpdate={handleUpdate} />
        ) : tab === "asistente" ? (
          <ViewAsistente preguntaInicial={preguntaAsistente} />
        ) : null}
      </main>
    </div>
  );
}
