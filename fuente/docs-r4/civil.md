# Ronda 4 · Derecho civil foral: sucesión legal de Aragón, Navarra y País Vasco (`civil`, 07-10-2026)

Rama `r4-civil`. Hasta la 1.5, sin testamento y con viudo, pareja, nietos o renuncias, el reparto de Aragón, Navarra y País Vasco se bloqueaba. Ahora se calcula con el derecho propio de cada vecindad, con bienes troncales que marca el abogado. Solo se bloquea cuando falta un dato que decide el reparto, o cuando una regla no se ha podido leer.

## Cómo se ha leído cada fuente

- **BOE desde esta sesión.** curl a `www.boe.es` está bloqueado por el proxy (403). WebFetch sí entra, pero corta cada documento en unos 100.000 caracteres.
  - La Ley 5/2015 vasca (BOE-A-2015-8273, PDF del BOE del 24-07-2015) se lee hasta el art. 121, así que está cubierta.
  - El texto consolidado del CDFA (`BOA-d-2011-90007`) y el del Fuero Nuevo solo se leen hasta el preámbulo o el índice. La API de datos abiertos del BOE devuelve 400.
- **Estados.**
  - **VERIFICADO**: leído en el BOE.
  - **PENDIENTE**: fuentes secundarias concordantes, sin cotejo literal.
  - **NO LEÍDO**: no localizado.

## País Vasco · Ley 5/2015, de 25 de junio, de Derecho Civil Vasco

Fuente: https://www.boe.es/boe/dias/2015/07/24/pdfs/BOE-A-2015-8273.pdf (y https://www.boe.es/buscar/act.php?id=BOE-A-2015-8273, consolidado a 03-07-2015, sin cambios posteriores en estos artículos).

| Regla | Artículo | Estado |
|---|---|---|
| Hay sucesión legal si no se ha dispuesto válidamente de toda la herencia o de parte de ella | 110 | VERIFICADO |
| Bienes no troncales: 1.º descendientes; 2.º cónyuge no separado legalmente o por mutuo acuerdo fehaciente, o pareja de hecho; 3.º ascendientes; 4.º colaterales hasta el 4.º grado | 112 | VERIFICADO |
| Hijos por partes iguales; nietos por representación | 113 | VERIFICADO |
| Sin descendientes hereda el cónyuge o la pareja, antes que ascendientes y colaterales; «en todo caso» conserva su usufructo legitimario | 114 | VERIFICADO |
| Padres por mitad; si falta uno, el otro; después, los demás ascendientes por mitad entre líneas | 115 | VERIFICADO |
| Hermanos e hijos de hermanos; representación solo si concurren con hermanos; doble vínculo, doble porción; después, los más próximos hasta el 4.º grado | 116 | VERIFICADO |
| Administración General del País Vasco: un tercio para ella, otro para la diputación foral y otro para el municipio, a beneficio de inventario | 117 | VERIFICADO |
| Bienes troncales por el orden del art. 66; los derechos del viudo recaen en ellos solo si faltan o no bastan los no troncales; sin tronqueros, todo es no troncal | 111 | VERIFICADO |
| Troncalidad: solo bienes raíces del infanzonado o tierra llana de Bizkaia, Aramaio y Llodio; son troncales solo si hay tronqueros; líneas descendente, ascendente y colateral de procedencia hasta el 4.º grado; el más próximo excluye al más remoto | 61-68, 73 | VERIFICADO |
| La troncalidad prevalece sobre la legítima; la del viudo se paga primero con bienes no troncales; los tronqueros pueden conmutar el usufructo | 70 | VERIFICADO |
| Legítima de los descendientes: un tercio, colectiva; legitimarios: descendientes y cónyuge o pareja (no los ascendientes) | 47-49 | VERIFICADO |
| Viudo o pareja: usufructo de la mitad con descendientes y de dos tercios sin ellos; habitación en la vivienda; la pierde el separado por sentencia o por acuerdo fehaciente | 52-55 | VERIFICADO |
| Ayala: libertad de disponer apartando «con poco o mucho»; sin reglas propias de sucesión legal | 88-95 | VERIFICADO |
| La pareja de hecho debe estar inscrita (Ley 2/2003) | DA Ley 5/2015 | PENDIENTE |

**Cómo calcula el motor:**

- **Con descendientes:** reparto del CC (las reglas coinciden) más el usufructo de la mitad para el viudo o la pareja.
- **Sin descendientes:** el viudo o la pareja reciben todos los bienes no troncales. Los troncales van a los tronqueros de la línea: padre o madre, después abuelos, después hermanos y sobrinos, después tíos y primos.
- **Si los no troncales no cubren la legítima del viudo:** si valen menos de 2/3 del caudal, el usufructo que falta (2/3 − no troncales) recae sobre los troncales. Es mi lectura de los arts. 70.3 y 111.1, y se avisa.

## Navarra · Fuero Nuevo (Compilación, Ley 1/1973) tras la Ley Foral 21/2019

**Fuentes:**

- El consolidado del BOE (BOE-A-1973-337) no se puede leer entero.
- Transcripción de las leyes 304 a 307 en papelea.com:
  - https://papelea.com/es/leyes/compilacion-del-derecho-civil-foral-de-navarra/libro-ii_titulo-xiv_capitulo-ii
  - https://papelea.com/es/leyes/compilacion-del-derecho-civil-foral-de-navarra/libro-ii_titulo-xiv_capitulo-iii
- Dos estudios de la reforma:
  - notariosyregistradores.com: https://www.notariosyregistradores.com/web/normas/concretas/resumen-de-la-reforma-2019-de-la-compilacion-de-navarra/
  - Iura Vasconiae: https://ojs.ehu.eus/index.php/iura_vasconiae/article/download/26429/24061/106915

| Regla | Ley | Estado |
|---|---|---|
| Bienes no troncales: 1.º descendientes; 2.º cónyuge no excluido del usufructo de viudedad; 3.º ascendientes de grado más próximo, por mitad entre líneas; 4.º hermanos de doble o sencillo vínculo por partes iguales, con representación; 5.º colaterales hasta el 4.º grado, sin representación; 6.º Comunidad Foral (fines de interés social) | 304 | PENDIENTE |
| El cónyuge pasó del 5.º al 2.º lugar y se suprimió la preferencia del doble vínculo (Iura Vasconiae) | 304 | PENDIENTE |
| La separación legal o de hecho excluye del usufructo y de la sucesión | 254, 304.2 | PENDIENTE |
| Troncal solo sin descendientes | 305 | PENDIENTE |
| Troncales: inmuebles adquiridos a título lucrativo de parientes hasta el 4.º grado, por permuta de troncales o por retracto gentilicio | 306 | PENDIENTE |
| Tronqueros de la familia de procedencia: 2.º hermanos de doble o sencillo vínculo con representación; 3.º colaterales hasta el 4.º grado; usufructo para los ascendientes no troncales que concurran | 307.2-3 | PENDIENTE |
| **Primer llamamiento de la ley 307** | 307.1 | **NO LEÍDO** (la transcripción lo omite). Si viven ascendientes y hay troncales, se bloquea |
| Usufructo de viudedad (antes, de fidelidad) sobre todos los bienes del premuerto | 253 | PENDIENTE (alcance literal) |
| La pareja estable no tiene derechos legales; solo los que se le atribuyan (STC 93/2013) | 113 | PENDIENTE |
| Legítima formal | 267 | VERIFICADO en la 1.5 |

## Aragón · Código del Derecho Foral de Aragón (D. Leg. 1/2011)

**Fuentes:**

- Solo los arts. 535-536 se han leído en el BOE: Ley 3/2016 (https://www.BOE.es/boe/dias/2016/03/10/pdfs/BOE-A-2016-2409.pdf).
- El resto, con fuentes secundarias concordantes:
  - Economist & Jurist: https://www.economistjurist.es/articulos-juridicos-destacados/el-regimen-de-la-sucesion-intestada-en-aragon/
  - mundojuridico.info: https://mundojuridico.info/la-sucesion-intestada-en-aragon/
  - Tema 118 de notariosyregistradores.com: https://www.notariosyregistradores.com/web/?p=21962
  - vLex (arts. 516-523 y 336): https://vlex.es/vid/sucesion-legal-aragon-227027
- Texto oficial que no se pudo leer entero: https://www.boe.es/buscar/act.php?id=BOA-d-2011-90007 y https://www.boe.es/ccaa/boa/2011/067/d06490-06616.pdf.

| Regla | Artículo | Estado |
|---|---|---|
| Sucesión legal cuando falta, en todo o en parte, la ordenación voluntaria | 516 | PENDIENTE |
| 1.º descendientes, a salvo el usufructo de viudedad; sin ellos, recobro y troncales a sus titulares, y el resto a ascendientes, cónyuge, colaterales hasta el 4.º grado y Comunidad Autónoma | 517 | PENDIENTE |
| Declaración de herederos por masas (troncal, no troncal) | 518 | PENDIENTE |
| El más próximo excluye al más remoto; si renuncian, heredan los del grado siguiente por derecho propio | 519-520 | PENDIENTE |
| Hijos por partes iguales; nietos por sustitución legal (para los descendientes de hermanos, hasta el 4.º grado) | 521-523, 336 | PENDIENTE |
| Recobro de liberalidades por ascendientes o hermanos donantes, a salvo la viudedad | 524-525 | PENDIENTE (aviso, sin cálculo) |
| Troncales: 1.º hermanos e hijos y nietos de hermanos de la línea; 2.º el padre o la madre de esa línea; 3.º colaterales hasta el 4.º grado (6.º en los de abolorio) | 526 | PENDIENTE |
| Abolorio: dos generaciones en la familia; simples: recibidos gratis de ascendientes o colaterales hasta el 6.º grado | 527-528 | PENDIENTE |
| Ascendientes: padres por partes iguales; después, los más próximos por líneas | 529-530 | PENDIENTE |
| Cónyuge no separado legalmente o de hecho por mutuo acuerdo fehaciente, sin demanda en trámite | 531 | PENDIENTE |
| Colaterales: hermanos y sus descendientes (doble vínculo, doble porción); después, hasta el 4.º grado | 532-534 | PENDIENTE |
| Comunidad Autónoma (asistencia social); Hospital de Nuestra Señora de Gracia | 535-536 | **VERIFICADO** |
| Usufructo de viudedad sobre todos los bienes del premuerto | 283 | VERIFICADO en la 1.5 |
| Legítima colectiva de la mitad, solo a descendientes | 486, 489 | VERIFICADO en la 1.5 |
| La pareja estable no casada no hereda sin testamento (ajuar y un año de vivienda) | régimen de parejas del CDFA | PENDIENTE (número de artículo) |

**Cómo calcula el motor:**

- **Con descendientes:** reparto por estirpes, con el usufructo universal de viudedad.
- **Sin descendientes:** ascendientes, después viudo, después colaterales. El viudo conserva el usufructo de viudedad universal, también sobre los troncales.
- **Avisos:**
  - recobro;
  - viudedad según la ley de los efectos del matrimonio (art. 9.8 CC);
  - bienes que pasan a los parientes del causante si el viudo heredero muere sin disponer de ellos;
  - abolorio hasta el 6.º grado.

## Bienes troncales en el programa

- **Ficha del bien.** Solo con vecindad aragonesa, navarra o vasca y sin testamento aparecen:
  - el interruptor «Bien troncal», para cualquier bien en Aragón y solo para inmuebles en Navarra y el País Vasco;
  - el selector «Procede de la familia», paterna o materna.
- **Ficha de la persona.** Si hay troncales, también se pide la línea de:
  - padre o madre;
  - medio hermanos y sus hijos;
  - tíos y primos.
- **Cálculo** (`repartoIntestadoForal` en `src/motor.mjs`).
  - Cada línea se reparte aparte: fracción = valor de los troncales de esa línea / (bienes de la herencia − legados). Las deudas se imputan en proporción, y se avisa.
  - Los hermanos de doble vínculo están en las dos líneas.
  - Si un pariente del llamamiento que decide no tiene línea indicada, o un bien no tiene línea y hace falta, el reparto se bloquea. El aviso dice a quién falta el dato.
  - Sin tronqueros, el bien pasa a la masa no troncal.
- **Combinación.** `combinarDerechos` suma los repartos parciales (pleno, nuda y usufructo por persona).

## Legítimas revisadas

| Régimen | Qué se comprobó | Resultado |
|---|---|---|
| País Vasco | 1/3 colectiva; viudo o pareja con usufructo de 1/2 o 2/3; ascendientes no legitimarios | Correcto. Añadido: habitación (art. 54), extinción (art. 55), troncalidad (art. 70) y Ayala (art. 89). Arts. 47-55 y 70 pasan a VERIFICADO; 56-60, PENDIENTES |
| Navarra | Legítima formal | Correcto. «Usufructo de fidelidad» pasa a «usufructo de viudedad» (LF 21/2019), ahora valorado sobre todo el caudal con la regla fiscal (PENDIENTE) |
| Aragón | Colectiva de 1/2 a descendientes; viudedad universal | Correcto, sin cambios |
| Cataluña, Galicia y Baleares | Fracciones (1/4; 1/4 con usufructo del viudo de 1/4 o 1/2; 1/3 o 1/2, usufructo de 1/2, 2/3 o universal) | Coinciden con lo verificado el 29-09-2026. No se han releído en esta ronda; hay pruebas de regresión |

El aviso de legítimas «la sucesión intestada tiene reglas propias que el programa no modela» se sustituye por la remisión a las notas del reparto.

## Interfaz

- **Herederos y bienes, partición e informe PDF:** primera línea «Ley aplicable sin testamento: Derecho civil aragonés (Código del Derecho Foral de Aragón)…» (`R.isd.leyReparto`). La partición ya no cita «arts. 930-958 CC» en derecho foral.
- **Tarjeta de vecindad civil:** texto propio para Aragón, Navarra y País Vasco.
- **Calculadora web:**
  - dice la ley aplicable;
  - en los forales sin hijos, avisa de que puede haber bienes troncales;
  - quitado «en el Código Civil» para los no herederos forales.
- **Ayuda:** nuevo artículo «Vecindad civil y herencias sin testamento» (`vecindad`); actualizado «Qué no hace» del Impuesto.
- **Código:** módulo nuevo `src/app/foral.js` (registrado en `build.py`). En `ui.js`, tres enganches de una línea.

## Pruebas

- `node src/test.mjs`: **1096 correctas, 0 fallidas** (antes 1036).
  - La sección 24 tiene 60 comprobaciones nuevas sobre 43 casos, cada uno razonado artículo por artículo: viudo e hijos, sin hijos con padres, solo hermanos, troncales, parejas, separados, sin parientes, legítimas.
  - Los 5 casos de la sección 23 que esperaban bloqueo ahora esperan el reparto foral.
- `tools/qa/foral.mjs`, prueba de navegador nueva: **26/26**, a 1440 y 390.
  - Recorre la ley en claro, el interruptor troncal, la línea, el bloqueo con instrucción y el reparto recalculado.
  - Pasa axe sin infracciones en las hojas nuevas.
- Batería del brief:
  - `test-lector` 436.
  - `producto` 45/45.
  - `experiencia` 47/47. «I9 · la cartera ofrece retomarlo» falla a veces también en la rama base: es intermitente.
  - `robustez --rapido` 53/53.
  - a11y 304/304 sin infracciones.
  - Lector de extremo a extremo: ver el informe final.

**Hallazgo ajeno:** el buscador de municipios vacío (`#b-mres`, `role="listbox"` sin nombre ni opciones) da dos infracciones de axe (`aria-input-field-name`, `aria-required-children`) en la ficha de cualquier inmueble sin municipio. La suite a11y no lo ve porque la demo siempre trae municipio.

## Pendiente

- Cotejo literal en el BOE (o en el BOA/BON) de:
  - CDFA arts. 516-534;
  - Fuero Nuevo leyes 253-254 y 304-307, sobre todo la **ley 307.1**;
  - la disposición de la Ley 5/2015 sobre la inscripción de la pareja.
- Recobro aragonés: solo se avisa. Podría añadirse un indicador por bien «donado por» (ascendiente o hermano).
- Abolorio hasta el 6.º grado: el programa solo distingue parientes hasta primos.
- Eivissa y Formentera siguen bloqueadas, igual que la pareja estable balear y el viudo separado de hecho en Baleares: no estaban en el alcance de esta ronda.
