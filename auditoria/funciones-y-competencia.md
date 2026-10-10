# Hereda+ · Auditoría de funciones frente al ciclo real de una herencia y frente a la competencia

Fecha: 10-10-2026. Producto auditado: aplicación publicada en `docs/app/` (versión 1.7 según la portada) y código fuente legible en `fuente/` (1.6, con `src/motor.mjs`, `src/tramites.mjs`, `src/app/*.js` y los informes `docs-r4/`, `docs-r5/`, `docs-juridico/`, `docs-diseno/`, `venta/` y `supabase/`). No se ha modificado nada de la aplicación ni de `fuente/`.

**Método.**

1. **Inventario.** Lectura del código: identificadores de `app.js` y `motor.js`, catálogo `CATALOGO` de 183 trámites, `LEC_TIPOS` y `lecRegistrar` del lector, `DOCS` y `DOC_TIT` de los escritos, `TC_TIPOS` de terceros, y artículos «Qué no hace» de `ayuda.js`.
2. **Recorrido de la aplicación.** Despacho de demostración con Playwright: vistas Mi día, Expedientes, Agenda, Panel del despacho, Rentabilidad y Normativa, y las 13 secciones del expediente EXP-2026-033. El texto volcado está en el scratchpad (`share/audit-producto/out/`).
3. **Contraste.** Con el ciclo completo de una herencia en España, desde la primera visita hasta el archivo.
4. **Competencia.** Búsqueda web. Limitación: desde esta sesión, WebFetch y curl están bloqueados (DNS o 403 del proxy). Las afirmaciones sobre competidores salen de los resultados de búsqueda y llevan su fuente en el § 11. Ningún proveedor de suites publica precios.

**Escalas.**

- **Prioridad:**
  - **P0**: sin ello el producto no cubre una herencia ordinaria de principio a fin, o deja un riesgo jurídico o económico.
  - **P1**: diferencial frente a la competencia.
  - **P2**: deseable.
- **Esfuerzo**, en personas-semana de desarrollo más la revisión jurídica:
  - **S**: una semana o menos.
  - **M**: de dos a cuatro semanas.
  - **L**: de uno a tres meses.
  - **XL**: más de tres meses.
- **Ahorro de tiempo**: el modelo y sus supuestos están en el § 6. Son estimaciones del auditor, no mediciones.

---

## 1. Resumen ejecutivo

**Veredicto.** Hereda+ ya es, con diferencia, la herramienta más profunda del mercado español para la parte **civil y fiscal del núcleo de una herencia**:

- reparto común y foral;
- legítimas;
- ISD de 22 territorios;
- plusvalía de 8.132 municipios;
- partición con excesos;
- estrategia fiscal y «dos herencias»;
- lector de 28 tipos de documento;
- 183 trámites con plazo;
- Mi día;
- terceros con escalado;
- escritura, cuaderno y renuncia.

Ningún competidor localizado combina cálculo, partición, trámites y gestión del despacho para herencias. El más cercano es **a3ASESOR | her** (Wolters Kluwer), que según el fabricante calcula el ISD y la plusvalía y genera un borrador de declaración, pero es software de asesoría fiscal y no gestiona el expediente.

Para que «no quede nada por hacer», faltan cinco bloques:

1. **Lo que pasa después de presentar**: notificaciones, comprobación de valores, recursos, rectificación, aplazamiento.
2. **Los datos que la escritura necesita y el programa no guarda**: los registrales y los del causante para el 790. Hoy salen como huecos ⟦…⟧, según `docs-r4/escritos.md` § 4.
3. **La liquidación real del régimen económico matrimonial**. Hoy es «50 % del bien ganancial» (`motor.mjs`, l. 369 y 1156-1165).
4. **El modelo 650/660 autonómico casilla a casilla**. NO LOCALIZADO en `docs-r4/fiscal.md` § 2.
5. **Las automatizaciones que ahorran horas**: subida de documentos por la familia, «pedir todo», cadena posterior a la firma, correo integrado y reglas.

### Las 15 carencias principales (por prioridad y, dentro de ella, por horas ahorradas)

Las horas al año son para un despacho de 5 abogados con 60 herencias al año (supuestos en el § 6).

| # | ID | Carencia | P | Esfuerzo | h/año ahorradas |
|---|---|---|---|---|---|
| 1 | G11 | Recogida de documentos de la familia: enlace de subida cifrado, clasificación automática y conciliación con «Lo que hace falta» | P0 | L | 81 |
| 2 | G02 | Modelo 650/660 por territorio casilla a casilla, relación de bienes del 660 y exportación al programa de ayuda | P0 | L | 43 |
| 3 | G01 | Datos registrales de cada finca (Registro, tomo, libro, folio, finca, IDUFIR/CRU, descripción) y datos del causante para el 790, leídos de la nota simple y de la defunción | P0 | M | 36 |
| 4 | G04 | Liquidación del régimen económico matrimonial: gananciales con reintegros y reembolsos, deudas, separación, participación y regímenes forales | P0 | L | 33 |
| 5 | G06 | Después de presentar: registro de presentación y pago, y notificaciones con sus plazos (requerimiento, propuesta, comprobación de valores, liquidación, sanción) | P0 | M | 24 |
| 6 | G07 | Escritos de defensa tributaria: alegaciones, reposición, reclamación económico-administrativa, tasación pericial contradictoria, rectificación, impugnación del valor de referencia y recursos de plusvalía | P0 | M | 23 |
| 7 | G03 | Inventario y avalúo completos: tipos de bien que faltan (cripto, arte y joyas, créditos, derechos reales, rentas, explotaciones, bienes en el extranjero) con su regla de valoración | P0 | M | 18 |
| 8 | G05 | Declaración de herederos abintestato: requerimiento del acta, notaría competente, testigos, y vía del Estado o de la comunidad autónoma | P0 | S | 12 |
| 9 | G09 | Inhábiles autonómicos y locales en el cómputo de plazos. Hoy solo cuentan los nacionales (`INHABILES_NACIONALES`) | P0 | S | 10 + riesgo |
| 10 | G08 | Aplazamiento y fraccionamiento del ISD: cálculo de intereses y garantía, y escrito de solicitud | P0 | S | 6 + liquidez |
| 11 | G12 | Motor de automatizaciones: «Pedir todo», cadena posterior a la firma, recordatorios programados y reglas configurables | P1 | L | 60 |
| 12 | G15 | IRPF: hoja de la renta del fallecido y simulador de venta del inmueble heredado (ganancia, plusvalía, exenciones, retención a no residentes) | P1 | M | 50 |
| 13 | G13 | Correo integrado desde la cuenta del despacho (Microsoft Graph o Gmail en el navegador), con registro e ingesta de respuestas | P1 | M | 30 |
| 14 | G14 | Cuenta de la comunidad hereditaria: rentas y gastos tras el fallecimiento, atribución de rentas, modelo 184 y liquidación en la partición | P1 | M | 30 |
| 15 | G20 | Firma electrónica: AutoFirma/PAdES del abogado y firma del cliente en la hoja de encargo y los escritos | P1 | M | 20 |

**Techo de ahorro estimado.** Las carencias del modelo del § 6 (P0, P1 y algunas P2) suman unas 600 h/año brutas en el despacho tipo. Con un 30 % de descuento por solapes, quedan **~420 h/año, unas 7 h por herencia** (≈ 50.000 € al año a 120 €/h). Como referencia, el despacho de demostración registra entre 14 y 26 h por expediente.

### La competencia en cinco líneas

1. **Suites genéricas de despacho** (Kleos y Kmaleon de Wolters Kluwer, Aranzadi Fusión, Lex-ON de Lefebvre, Sudespacho): expedientes, agenda, horas, facturación con VeriFactu, LexNET y portal del cliente. No calculan ni ISD ni plusvalía ni partición. Precio solo bajo presupuesto.
2. **a3ASESOR | her** es el único software profesional de sucesiones localizado: ISD y plusvalía en tiempo real, ajuar, legados, seguros, adición, acumulación de donaciones, consolidación, aviso de excesos, borrador de la declaración e integración con a3ASESOR | ren. Está orientado a asesorías y no tiene trámites, lector, partición documental ni gestión del encargo.
3. **Servicios online de herencias**, que no son software y compiten por el cliente final:
   - Heritae: tarifa plana; la prensa de 2021 cita 5.500 € con IVA.
   - Gestorías online como Billeo: de 300 a 1.500 €.
   - Legálitas: 29,90 € al mes de suscripción de asesoramiento.
   - reclamador.es.
   - Testamentaría digital de los bancos (CaixaBank).
4. **Herramientas públicas y calculadoras gratuitas**:
   - simulador de la Comunidad de Madrid;
   - programas de ayuda del 650 (AEAT y comunidades);
   - Madrid genera el XML del 650 en su oficina virtual;
   - calculadoras de Taxdown y guiafiscal.

   Todas cubren el cálculo, no el expediente.
5. **El riesgo competitivo real** son dos combinaciones:
   - una suite que integre un cálculo de ISD (Wolters Kluwer ya tiene her y Kleos en la misma casa);
   - la IA generativa jurídica de las editoriales (GenIA-L de Lefebvre, con convenios con la Abogacía) redactando escritos.

   Hereda+ se defiende con cálculo verificable, dato local, profundidad sucesoria y, si cierra estas carencias, con el ciclo completo y las automatizaciones.

---

## 2. Inventario verificado de funciones

Verificado en el código (`fuente/src` y `docs/app`) y en la interfaz del despacho de demostración. «✔» indica que está, «◐» que está en parte. Las referencias son a `fuente/src/`.

### 2.1 Vistas y navegación
- ✔ **Mi día** (`app/radar.js`):
  - lo vencido, la semana, lo bloqueado por terceros (familia, bancos y notaría, con los días que llevan) y lo parado más de 30 días;
  - euros en juego (recargos y bonificaciones);
  - carga por persona y actividad reciente;
  - acción a un clic en cada línea.
- ✔ **Expedientes** (`app/despacho.js`, `ui.js`):
  - tabla con orden por columnas;
  - vistas por fase, plazos y mapa;
  - vigilancia normativa (cambios que afectan a la cartera);
  - «Plazos al calendario» (ICS).
- ◐ Acciones masivas (`app/masivo.js`): solo cambian el responsable o la fase.
- ✔ **Agenda**: lista y mes, y «Añadir a mi calendario» (exportación ICS, `archivo.js`).
- ✔ **Panel del despacho** (`app/socio.js`):
  - expedientes al día, carga por persona, riesgo, dinero (presupuestado, facturado, cobrado, provisiones) y motivos de bloqueo;
  - perfiles socio, abogado y administrativo, que **ordenan lo que ve cada uno pero no impiden nada**, como reconoce el propio código en la l. 8.
- ✔ **Rentabilidad** (`app/tiempos.js`): horas, €/hora frente al objetivo, minutas pendientes, provisiones sin aplicar, duración media y serie de 12 meses.
- ✔ **Normativa** (`app/normativa.js`, `biblioteca.json`): novedades fechadas con los expedientes afectados y biblioteca estatal, autonómica y municipal.
- ✔ **Paleta Ctrl K** (`app/paleta.js`, `buscar.js`): expedientes, personas por nombre o NIF, referencias catastrales, IBAN, documentos y tareas, más una calculadora. Hay pocos atajos de teclado (§ 5).
- ✔ Bienvenida, guías interactivas, centro de ayuda y manual en PDF, y modo demostración con guion (`bienvenida.js`, `guia.js`, `ayuda.js`, `demo.js`).

### 2.2 Expediente (13 secciones)
Las secciones son Resumen, Herederos y bienes, Impuestos, Partición, Trámites, Documentos, Diagnóstico, Estrategia fiscal, Dos herencias, Bancos y notaría, Listo para firmar, Normativa, y Encargo y honorarios (`SECCIONES` en `ui.js`).

- ✔ **Resumen**: caudal, impuestos, herederos, deudas y trámites; «Qué hacer en este expediente»; siguiente paso; mapa con la plusvalía de cada inmueble; notas del cálculo.
- ✔ **Herederos y bienes**:
  - árbol familiar con derecho, lo que recibe y lo que paga cada uno;
  - vecindad civil (común y siete forales);
  - control de legítimas común y foral (`legitimas.js`);
  - bienes troncales (`foral.js`);
  - legados (`lgCaso`);
  - donaciones colacionables.
- ✔ **Impuestos**:
  - ISD paso a paso por heredero con su norma y su estado (VERIFICADO o PENDIENTE);
  - plusvalía por los dos métodos con la ordenanza y la bonificación por adjudicatario;
  - recargo del art. 27 LGT y escalas forales;
  - simulador de escenarios;
  - informe de cálculo en PDF.
- ✔ **Motor** (`motor.mjs`):
  - reparto intestado común y foral, incluida la troncalidad;
  - usufructo vitalicio y temporal;
  - ajuar con cuatro criterios;
  - seguros;
  - vivienda habitual y empresa familiar (estatal y algunas autonómicas);
  - discapacidad;
  - acumulación de donaciones de los cuatro años anteriores (art. 30 LISD, `donacionesPreviasBL`);
  - coeficiente por patrimonio preexistente;
  - tipo medio del nudo propietario y consolidación;
  - no residentes (EST con la normativa de la comunidad de los bienes);
  - plazos con prórroga.
- ✔ **Partición** (`particion.js`): seis pasos (inventario, masa, cuotas, cuadro, impuestos, liquidación); excesos inevitables y evitables con su coste (TPO o AJD); compensaciones; alternativas (arts. 1056, 1062 y 400 CC).
- ✔ **Trámites** (`tramites.mjs`): 183 trámites en 7 fases y 56 situaciones que los activan, con plazo, organismo, documentos, norma y enlace a la sede; responsables; tareas propias (`tareas.js`); cronograma Gantt.
- ✔ **Documentos**:
  - archivo por tipo y estado;
  - lista de lo que hace falta según el caso;
  - escáner con cámara (`escaner.js`);
  - lector de PDF, Word, Excel, ODF, RTF, HTML, EML, ZIP, HEIC y TIFF, con OCR local (tesseract);
  - 28 tipos de documento (`LEC_TIPOS` más `lector-tipos.js`);
  - propuesta de datos con su origen y revisión antes de cargar.
- ✔ **Escritos** (17 en `DOCS`, Word con estilos y PDF):
  - propuesta de liquidación, nota para la notaría, borrador de escritura de herencia, cuaderno particional, liquidación final y recibí;
  - informe para el cliente, carta a la familia, carta al banco;
  - solicitud 790 de últimas voluntades y seguros, guía de certificados;
  - acuerdo entre herederos, prórroga, escritura de renuncia, instancia de heredero único;
  - declaración de plusvalía, 900D del Catastro, hoja de encargo.
  - En terceros, además: carta, reiteración, queja al servicio de atención al cliente y reclamación al supervisor (Banco de España o DGSFP).
- ✔ **Diagnóstico** (`diagnostico.js`): nota de 0 a 100; riesgos, oportunidades y datos por completar, con su norma.
- ✔ **Estrategia fiscal** (`estrategia.js`): palancas con el ahorro en euros, el riesgo y la norma; «Probar como escenario».
- ✔ **Dos herencias** (`segunda.js`): proyección de la herencia del viudo con cuatro escenarios.
- ✔ **Bancos y notaría** (`terceros.js`): solicitudes sugeridas por entidad (directorio de 60 bancos y aseguradoras), estados (por enviar, enviada, reclamada, escalada, recibida), recordatorios a la familia por WhatsApp o correo y escalado al supervisor con sus plazos.
- ✔ **Listo para firmar** (`firma.js`):
  - 32 comprobaciones bloqueantes o de aviso;
  - paquete para la notaría en PDF y texto del correo;
  - hoja del 650 por heredero con «Copiar» (sin casillas autonómicas);
  - datos de identificación de los otorgantes.
- ✔ **Encargo y honorarios**:
  - cliente;
  - lista de cumplimiento (identificación, hoja de encargo, conflicto de intereses, Ley 10/2010 y RGPD, solo como casillas);
  - comprobación de nombres en la cartera;
  - honorarios (cerrado o % del caudal), suplidos, presupuesto e IVA;
  - libro de fondos (provisión, suplido, honorarios, devolución y «minuta emitida» como movimiento, **no como factura**);
  - tiempos y cronómetro;
  - cifras 650/660;
  - bitácora.

### 2.3 Familia y cliente
- ✔ **Modo reunión** (pantallas para la familia) y **carpeta para la familia**: un HTML de una página (`reunion.js`, `carpeta.html`).
- ◐ **Cuestionario de la familia** (`familia.html`): la familia rellena datos y devuelve un archivo `.hereda.json` por correo o WhatsApp, que se importa (`compartir.js`, l. 184). **No admite documentos.**
- ✔ **Calculadora para la web del despacho** (`widget.js`), con su marca.

### 2.4 Plataforma
- ✔ PWA local: IndexedDB, sin servidor ni analítica, y archivo HTML sin conexión.
- ✔ Copias automáticas en una carpeta, cifrado AES-GCM con clave derivada por PBKDF2 (`seguridad.js`) y bloqueo por inactividad.
- ✔ **Despacho en red** (`red.js`, `red-motor.js`): carpeta compartida (OneDrive, Dropbox, Drive o servidor), cifrada, con fusión, presencia y conflictos a elegir. Solo Chrome y Edge de escritorio, y no es en tiempo real.
- ✔ Registro de cambios con valor anterior y nuevo, exportable a CSV (`auditoria.js`).
- ✔ Importación de la cartera desde CSV; exportar e importar expedientes; reparación de datos dañados (`robustez.js`).
- ✔ Licencia firmada (ECDSA) con modo de solo lectura al caducar (`licencia.js`).
- ◐ Esquema de nube multidespacho **planificado y sin desplegar** (`supabase/migrations/0001_esquema_despachos.sql`, con RLS).

### 2.5 Hallazgos de coherencia (no son carencias de función)
1. **Comparativa de la portada (`docs/index.html`)**: la fila «Varios ordenadores con los mismos expedientes» dice «Próximamente, como opción. Hoy, cada equipo con sus datos», mientras que la FAQ y la aplicación ya ofrecen «Despacho en red». Hay que corregirla.
2. **Código de IA latente.** `iaEnviar`, `iaAuditar` y `REGLAS_IA` (`app.js`, l. 321 y siguientes) se activan solo si existe `window.claude` (`SAMPLE`). En la web publicada no se ejecutan, pero contradicen la afirmación auditable «Sin IA». Conviene excluirlos del build.
3. **«28 tipos de documento»**: son 27 tipos internos más el valor de referencia (`docs-r4/web.md` § 6).
4. **Pendiente de su propia auditoría.** I9 (`docs-r5/auditoria.md`): «Si alguien usa el coche antes del reparto» sale como crítico en todo expediente con vehículo.

---

## 3. Ciclo completo de una herencia y cobertura

Leyenda:
- ✔ completo;
- ◐ parcial (lo hay, pero falta una pieza que el abogado necesita);
- ✖ ausente.

La columna «Carencia» remite al § 8.

### Fase 0 · Primera visita y encargo
| Paso | Cobertura | Evidencia | Carencia |
|---|---|---|---|
| Ficha del cliente y del expediente; alta desde documentos | ✔ | Nuevo expediente, «Desde documentos» | — |
| Comprobación de conflicto de intereses | ◐ | Solo coincidencia de nombres en la cartera | G35 |
| Identificación del cliente y prevención de blanqueo (Ley 10/2010) | ◐ | Casilla de cumplimiento, sin titular real, PEP ni riesgo | G31 |
| Hoja de encargo y presupuesto (honorarios, suplidos, impuestos previstos) | ✔ | Escrito «encargo» y presupuesto | — |
| Firma de la hoja de encargo | ✖ | Se imprime y se firma a mano | G20 |
| Información de protección de datos al cliente y a los herederos no clientes (art. 14 RGPD) | ◐ | Casilla | G25 |
| Provisión de fondos | ✔ | Libro de fondos | — |

### Fase 1 · Primeros días
| Paso | Cobertura | Evidencia | Carencia |
|---|---|---|---|
| Defunción, custodia, poderes que se extinguen, sepelio, INSS, autónomo, trabajadores, armas, personas a cargo | ✔ | 14 trámites «urgente» | — |
| Defunción en el extranjero y persona desaparecida | ✔ | `defuncion_extranjero`, `desaparecido` | — |

### Fase 2 · Conocer la herencia
| Paso | Cobertura | Evidencia | Carencia |
|---|---|---|---|
| Últimas voluntades y seguros (790), con la fecha desde la que se pueden pedir | ✔ | Escrito 790 y trámite | — |
| Datos del causante que exige el 790 (nacimiento, padres, lugar de defunción) | ✖ | Quedan como huecos (`docs-r4/escritos.md` § 4) | G01 |
| Copia del testamento, ológrafo, cerrado, ante testigos, albacea, fiducia | ✔ | Trámites | — |
| Interpretación del testamento: institución, legados, usufructo, cautela socini, sustitución vulgar, desheredación | ✔ | `lecTestamento`, legítimas | — |
| Fideicomiso, sustitución fideicomisaria o de residuo, reservas | ◐ | El lector avisa: «el reparto automático no la modela» | G17 |
| Declaración de herederos abintestato (acta notarial) | ◐ | Trámite y cita en la escritura; **no hay escrito de requerimiento** | G05 |
| Heredero el Estado o la comunidad autónoma | ◐ | Trámite `herencia_estado` | G05 |
| Ley aplicable, vecindad civil y Reglamento (UE) 650/2012 | ◐ | Vecindad en la ficha; ley aplicable solo como trámite | G18 |
| Seguros de vida, planes, viudedad y orfandad, auxilio, clases pasivas, mutualidades | ✔ | Trámites y reclamación a aseguradoras | — |

### Fase 3 · Inventario y avalúo
| Paso | Cobertura | Evidencia | Carencia |
|---|---|---|---|
| Inmuebles: nota simple, catastro, valor de referencia, IBI | ✔ | Lector y ficha del bien | — |
| Datos registrales (Registro, tomo, libro, folio, finca, IDUFIR/CRU, descripción y linderos) | ✖ | Huecos en la escritura y el cuaderno | G01 |
| Cuentas, valores y fondos, planes, participaciones | ◐ | Tipos «cuenta», «valores», «empresa»; lectura de certificados | G03 |
| Vehículos con las tablas de precios medios | ◐ | El lector pone el % de depreciación y deja el valor vacío | G03 |
| Criptoactivos, arte y joyas, créditos, derechos reales, rentas, explotaciones agrarias, bienes en el extranjero | ✖ | Solo como trámites; no hay tipo de bien | G03 |
| Deudas y gastos deducibles; bienes adicionables del último año | ✔ / ◐ | Deudas y gastos; adicionables solo como trámite | G03 |
| Liquidación de gananciales con reintegros y reembolsos | ◐ | Bien ganancial al 50 % y deuda ganancial al 50 % | G04 |
| Donaciones previas: colación y acumulación | ✔ | `COLACION_ES`, art. 30 LISD | — |

### Fase 4 · Decidir
| Paso | Cobertura | Evidencia | Carencia |
|---|---|---|---|
| Aceptar o renunciar; renuncia pura y traslativa; escritura de renuncia | ✔ | Escrito de renuncia y estrategia | — |
| Derecho a deliberar, interpelación, beneficio de inventario, concurso de la herencia | ◐ | Trámites y avisos; sin escritos ni inventario formal | G19 |
| Legítimas, conmutación del usufructo, cautela socini, pago en metálico | ✔ | Legítimas y trámites | — |
| Menores y medidas de apoyo (defensor judicial, aprobación de la partición) | ◐ | Trámites y avisos en la escritura; sin escrito | G28 |
| Estrategia fiscal y dos herencias | ✔ | — | — |

### Fase 5 · Partición
| Paso | Cobertura | Evidencia | Carencia |
|---|---|---|---|
| Cuadro de partición, lotes, excesos y compensaciones | ✔ | `particion.js` | — |
| Cuaderno particional y escritura de aceptación y adjudicación | ✔ | `escritos.js` | — |
| Redacción foral (CCCat, CDFA…) | ◐ | Remite a sustituir las referencias del CC (`docs-r4/escritos.md` § 4) | G21 |
| Contador-partidor dativo, partición judicial, división de cosa común, intervención del caudal | ◐ | Trámites; sin escritos ni plazos procesales | G28 |
| Paquete para la notaría y comprobación previa a la firma | ✔ | `firma.js` | — |

### Fase 6 · Impuestos
| Paso | Cobertura | Evidencia | Carencia |
|---|---|---|---|
| Cálculo del ISD de 22 territorios, recargo y prórroga | ✔ | `motor.mjs` | — |
| Reducciones pendientes (explotación agraria; empresa familiar de Asturias, La Rioja y Bizkaia; menores de Aragón; sobrinos de Extremadura; reducción única de Galicia) | ◐ | `docs-r4/fiscal.md` § 3 y 6; en `motor.mjs` no aparece «agrari» | G16 |
| Hoja del 650 por heredero | ◐ | Sin casillas autonómicas; sin 660 en el orden del formulario | G02 |
| Presentación telemática (colaborador social) | ✖ | Fuera de alcance; requiere convenio | G02 |
| Aplazamiento y fraccionamiento | ◐ | Solo trámite | G08 |
| Plusvalía: cálculo, declaración y método real | ✔ | — | — |
| Doble imposición internacional (art. 23 LISD) | ✖ | Trámite; el motor no la descuenta | G18 |
| Modelos 720/721 y 210 (no residentes) | ◐ | Trámites | G18 |

### Fase 7 · Después de presentar
| Paso | Cobertura | Evidencia | Carencia |
|---|---|---|---|
| Registro de la presentación y el pago (fecha, justificante, NRC) | ◐ | Interruptor «presentado» | G06 |
| Requerimientos, propuestas de liquidación, comprobación de valores, sanciones | ✖ | Solo trámites genéricos | G06, G07 |
| Tasación pericial contradictoria, reposición, reclamación económico-administrativa, rectificación | ✖ | Trámites sin escrito ni plazo calculado | G07 |
| Prescripción y conservación de justificantes | ✔ | Trámite con fecha | — |

### Fase 8 · Cambios de titularidad
| Paso | Cobertura | Evidencia | Carencia |
|---|---|---|---|
| Registro de la Propiedad e instancia de heredero único | ✔ | — | — |
| Catastro (900D) | ✔ | — | — |
| Bancos (certificados, desbloqueo, cambio de titularidad) | ◐ | Solicitud inicial; falta la carta posterior a la escritura | G12 |
| DGT, embarcaciones, aeronaves, licencias, PAC, REGA, propiedad industrial, alquileres, suministros, comunidad | ✔ | Trámites con enlace a la sede | G29 (formularios) |
| Empresas y participaciones (libro registro de socios, Registro Mercantil) | ◐ | Trámite | — |

### Fase 9 · Rentas, IRPF y cierre
| Paso | Cobertura | Evidencia | Carencia |
|---|---|---|---|
| Renta del fallecido y rentas pendientes de imputar | ◐ | Trámites; sin hoja de datos | G15 |
| Herencia yacente o comunidad hereditaria con rentas: NIF, modelo 184, atribución | ◐ | Trámites | G14 |
| Venta de un inmueble heredado: IRPF, plusvalía, no residentes | ◐ | Trámite; la estrategia compara valor declarado e IRPF con la escala del ahorro | G15 |
| Rendición de cuentas entre herederos, del albacea y del curador | ◐ | Trámites; recibí con la cuenta de fondos del despacho | G14 |
| Liquidación final, recibí y entrega de documentos | ✔ | — | — |
| Facturación de la minuta | ◐ | Movimiento «minuta emitida»; sin factura | G24 |
| Archivo, conservación y supresión (RGPD) | ◐ | Archivado; sin política de conservación ni anonimización | G25 |

---

## 4. Competencia en España

### 4.1 Mapa por categorías
| Categoría | Producto | Qué hace en herencias (según su fuente) | Precio publicado | Frente a Hereda+ |
|---|---|---|---|---|
| Software sucesorio profesional | **a3ASESOR \| her** (Wolters Kluwer) | ISD y plusvalía en tiempo real, adaptados a cada comunidad; ajuar, legados, seguros, adición, acumulación de donaciones, consolidación; aviso de exceso de adjudicación; borrador de la declaración en un clic; informes de reparto por heredero; importa el patrimonio del donante desde a3ASESOR \| ren; ficha de cliente única en la línea a3 [1][2][3] | No publicado | Competidor directo en el **cálculo**. Sin trámites ni plazos, sin lector de documentos, sin terceros, escritura ni cuaderno documentados, y sin gestión del encargo. Su fuerza es el ecosistema a3 de asesorías y la renta |
| Suites de gestión de despacho | **Kleos** (Wolters Kluwer) | Expedientes, horas, facturación, informes, Office; adaptación a VeriFactu; más de 35.000 usuarios y 12.000 despachos [4][5] | SaaS, bajo presupuesto [5] | Sin cálculo sucesorio. Convive con Hereda+ o lo sustituye si WK integra her |
| | **Kmaleon** (Wolters Kluwer) | Gestión masiva de asuntos, licencias por usuario [6] | No publicado | Igual |
| | **Aranzadi Fusión** (Thomson Reuters) | Nube; LexNET homologado (presentar escritos, recibir notificaciones); agenda, asuntos, tiempos, facturación [7] | No publicado | Igual. LexNET es su ventaja procesal |
| | **Lex-ON** (Lefebvre) | Clientes, contabilidad, expedientes, facturación; factura electrónica con TicketBAI y VeriFactu [8][9] | No publicado | Igual. Lefebvre añade el Memento Sucesiones (contenido) [10] y GenIA-L (IA) [11] |
| | **Sudespacho.net** | Expedientes, documentos, facturación, calendario, **portal de clientes** con intercambio seguro de documentos, correo, LexNET [12][13] | Antiguo: versión Lite gratuita [13] | Su portal del cliente es lo que le falta a Hereda+ (G11) |
| Servicios online | **Heritae** | Gestión integral (certificados, valoración, fiscalidad, escritura, liquidación, registros) y planificación, a tarifa plana [14][15] | 5.500 € con IVA según prensa de 2021 [15] | Compite por el cliente final; es un posible comprador (despacho «automatizado») |
| | **Billeo** (gestoría online) | Herencias a precio cerrado [16] | 300 a 1.500 € [16] | Igual |
| | **Legálitas** | Asesoramiento en herencias por suscripción [17] | 29,90 € al mes [17] | Igual |
| | **reclamador.es** | Tramitación online con abogados, correo y videollamada [18] | No publicado | Igual |
| | **Bancos** (CaixaBank) | Testamentaría con entrega de documentos en línea y gestor asignado [19] | — | Los bancos digitalizan su lado; Hereda+ debería integrarse con sus canales (G12, G13) |
| Herramientas públicas | **Comunidad de Madrid** | Simulador del ahorro en el ISD [20]; oficina virtual que **genera e importa el XML del 650** y presentación telemática obligatoria de los modelos 650 y 651 [21][22] | Gratis | Referencia para G02 |
| | **AEAT** | Programa de ayuda del 650 de no residentes, con guía de presentación telemática [23] | Gratis | Igual |
| | **Agencia Tributaria de Andalucía** | Colaboración social: los colegios de abogados se adhieren y los colegiados presentan en representación (art. 46 LGT); convenios con los modelos 650, 651 y 660 [24][25][26] | Gratis | Hereda+ no presenta: la vía es exportar al programa y guiar al colaborador social (G02) |
| | **Murcia** | Recomienda su programa de ayuda y permite expedir el modelo a profesionales adheridos a convenios [27] | Gratis | Igual |
| Calculadoras privadas | Taxdown (Madrid y Cataluña), guiafiscal (17 comunidades), calculadora de código abierto [28][29][30] | Orientativas, sin expediente | Gratis | Captación; Hereda+ tiene su widget |
| Notariado | Ancert y SIGNO | Infraestructura notarial (partes testamentarios telemáticos, pago de impuestos desde las notarías) [31] | — | Sin API pública para despachos; la integración viable es documental (G29) |

**Lo que no se encontró.** No hay programa comercial específico de cuaderno particional [32], ni módulo de ISD en Sage Despachos [33], ni calculadora profesional de Sepin, Iberley o Tirant [28]. Esto sostiene el posicionamiento: Hereda+ no tiene un competidor que cubra el ciclo.

### 4.2 Matriz de funciones

Leyenda: ✔ sí; ◐ parcial; ✖ no; «?» sin dato público. Solo se marca ✔ lo que dice la fuente del competidor.

| Función | Hereda+ | a3ASESOR \| her | Suites (Kleos, Fusión, Lex-ON, Sudespacho) | Servicios online |
|---|---|---|---|---|
| ISD de todos los territorios con su norma | ✔ (22, paso a paso) | ✔ | ✖ | Servicio |
| Plusvalía municipal con ordenanza | ✔ (322 ordenanzas; el resto, al máximo legal) | ✔ | ✖ | Servicio |
| Reparto intestado y legítimas forales | ✔ | ? | ✖ | Servicio |
| Partición con excesos y su coste | ✔ | ◐ (aviso de exceso) | ✖ | Servicio |
| Borrador de la declaración 650 | ◐ (cifras sin casillas) | ✔ (borrador) | ✖ | Servicio |
| Escritura, cuaderno, renuncia | ✔ | ? | ◐ (plantillas genéricas) | Servicio |
| Trámites con plazo (183) y Mi día | ✔ | ✖ | ◐ (agenda genérica) | — |
| Lector de documentos | ✔ (local, sin IA) | ✖ | ◐ (archivo; Lido y similares hacen OCR) | — |
| Terceros: solicitudes, reiteración y escalado | ✔ | ✖ | ✖ | Servicio |
| Portal o subida de documentos del cliente | ◐ (cuestionario JSON) | ✖ | ✔ (Sudespacho) | ✔ |
| Correo integrado | ✖ (mailto) | ? | ✔ | — |
| Facturación con VeriFactu o TicketBAI | ✖ | (a3 sí, en otros productos) | ✔ (Lex-ON, Kleos) | — |
| LexNET | ✖ | ✖ | ✔ (Fusión y otras) | — |
| Firma electrónica | ✖ | ? | ◐ (firma biométrica en Sudespacho) | — |
| IA generativa | ✖ (decisión de producto) | ✖ | ✔ (GenIA-L de Lefebvre) | ? |
| Datos solo en los equipos del despacho | ✔ | ? (escritorio o nube) | ✖ (nube del proveedor) | ✖ |
| Precio público | ✔ (59, 129 y 249 € al mes) | ✖ | ✖ | ◐ |

### 4.3 Posicionamiento recomendado
1. **No competir con las suites**: convivir e integrarse con ellas mediante exportación de honorarios (G24), API o exportación abierta (G36) y correo (G13).
2. **Ganar a a3ASESOR | her** en lo que un abogado hace y una asesoría no: trámites, terceros, partición documental, escrituras, Mi día y lector. Igualarlo en la **declaración casilla a casilla** (G02), que es su argumento comercial («borrador en un clic»).
3. **Ofrecer al despacho lo que venden los servicios online**: precio cerrado, rapidez y portal para la familia (G11, G12). El despacho que use Hereda+ podrá competir con Heritae o Billeo en tiempo por expediente.
4. **Mantener «sin IA» como garantía de explicabilidad** frente a GenIA-L, pero ofrecer automatización determinista de igual o mayor impacto (§ 7).

---

## 5. Experiencia de usuario frente a SaaS empresarial (Salesforce y Microsoft Dynamics)

| Patrón empresarial | Lo esperado | Hereda+ hoy | Carencia y especificación |
|---|---|---|---|
| Vistas de lista guardadas | Filtros combinables, columnas a elegir, vistas guardadas y compartidas, contadores | Tabla con orden por columnas y tres vistas fijas | G22: «Vistas»: filtros (fase, responsable, comunidad, vencimiento < N días, bloqueado por, impuesto > X, sin presupuesto), columnas configurables y guardar o compartir la vista en la red |
| Acciones masivas | Actualización, correo, documentos, exportación y tareas en bloque | Solo responsable y fase (`masivo.js`) | G22: ampliar `maBarraHTML` con generar un escrito para los marcados, recordatorio a las familias, marcar un trámite como hecho, exportar CSV o ZIP y crear tarea |
| Automatización sin código | Reglas «cuando… si… entonces…», flujos y aprobaciones | Alertas calculadas; nada se ejecuta solo | G12: motor de reglas con plantillas de serie (§ 7) |
| Plantillas con campos combinados | El administrador edita plantillas, campos y cláusulas reutilizables | Escritos fijos en el código; se edita el Word después | G21 |
| Correo integrado | Enviar desde la cuenta del usuario, registrar en la ficha y asociar respuestas | `mailto:` y WhatsApp; los .eml se pueden arrastrar y leer | G13 |
| Calendario sincronizado | Bidireccional con Outlook o Google | Exportación ICS puntual | G32 |
| Notificaciones | Resumen diario por correo o push; menciones | Solo Mi día al abrir | G32 y G35 |
| Atajos de teclado | Navegación (g+i, j/k), acciones (n, e), ayuda con «?» | Ctrl K, Esc, flechas, Enter y «?» en la paleta | G22: capa de atajos globales (§ 8) |
| Valores por defecto inteligentes | Reglas de autocompletado y valores sugeridos | Buenos: usufructo según el testamento, ajuar por territorio, plazos, notaría competente sugerida | Mantener; ampliar con G01 y G03 |
| Listas guiadas | Guías de proceso por etapa con criterios de salida | Trámites por fase, «Listo para firmar», guías interactivas | Muy bien. Añadir criterios de salida de fase (no pasar a «Firma» con bloqueos rojos) |
| Papelera y deshacer | Papelera 30 días, deshacer y restaurar campos desde el historial | El registro de cambios guarda el valor anterior, pero no restaura; el borrado es definitivo salvo copia | G35 |
| Permisos y roles | Perfiles, visibilidad por registro, inicio de sesión único, doble factor | Perfiles que no restringen (honesto en `socio.js`) | G23 |
| Portal del cliente | Autoservicio, subida, estado y mensajes | Carpeta HTML y cuestionario JSON | G11 |
| Integraciones y API | API REST, webhooks, conectores | Ninguna (CSV de entrada, JSON de salida) | G36 |
| Paneles | Configurables | Panel del socio y Rentabilidad, buenos y fijos | P2: tarjetas configurables |
| Móvil | Aplicación con las funciones clave | Vista «móvil» y cámara; la red no funciona en el móvil | G33 |

---

## 6. Modelo de ahorro de tiempo

**Supuestos del auditor** (no son estadísticas oficiales; se escalan linealmente):

- despacho de **5 abogados** con **60 herencias al año**;
- tarifa interna de **120 €/h** (el objetivo que usa la demostración);
- proporción de expedientes por tipo de caso:
  - causante casado en gananciales: 55 %;
  - intestada: 30 %;
  - con valores o fondos: 40 %;
  - con vehículos: 50 %;
  - con rentas tras el fallecimiento (alquileres): 20 %;
  - comprobación de valores u otra actuación posterior de Hacienda: 15 %;
  - venta posterior de un inmueble: 40 %;
  - internacional: 5 %;
  - con deudas relevantes: 10 %;
  - con renta del fallecido a cargo del despacho: 80 %.

Con 60 casos, **horas al año = minutos por caso × proporción de casos afectados**.

| ID | Carencia | Min/caso cuando aplica | Casos afectados | h/año | €/año |
|---|---|---|---|---|---|
| G11 | Subida de documentos por la familia y conciliación | 90 | 90 % | 81 | 9.720 |
| G12 | Automatizaciones: «Pedir todo», cadena posterior a la firma, recordatorios y reglas | 60 | 100 % | 60 | 7.200 |
| G15 | Renta del fallecido (40 min en el 80 %) y venta del inmueble (45 min en el 40 %) | — | — | 50 | 6.000 |
| G02 | 650/660 casilla a casilla | 45 | 95 % | 43 | 5.160 |
| G01 | Datos registrales y del causante | 40 | 90 % | 36 | 4.320 |
| G04 | Liquidación del régimen económico | 60 | 55 % | 33 | 3.960 |
| G13 | Correo integrado | 30 | 100 % | 30 | 3.600 |
| G14 | Cuenta de la comunidad hereditaria y 184 | 150 | 20 % | 30 | 3.600 |
| G06 | Después de presentar (15 min siempre, más 60 si hay notificación) | — | — | 24 | 2.880 |
| G07 | Escritos de defensa tributaria | 150 | 15 % | 23 | 2.700 |
| G20 | Firma electrónica | 20 | 100 % | 20 | 2.400 |
| G21 | Plantillas propias del despacho | 20 | 100 % | 20 | 2.400 |
| G03 | Inventario y avalúo completos | 30 | 60 % | 18 | 2.160 |
| G22 | Vistas, acciones masivas y atajos | 15 | 100 % | 15 | 1.800 |
| G24 | Exportación a facturación | 15 | 100 % | 15 | 1.800 |
| G05 | Declaración de herederos | 40 | 30 % | 12 | 1.440 |
| G19 | Beneficio de inventario y deudas | 120 | 10 % | 12 | 1.440 |
| G09 | Inhábiles autonómicos y locales | 10 | 100 % | 10 | 1.200 |
| G32 | Calendario sincronizado y resumen diario | 10 | 100 % | 10 | 1.200 |
| G29 | Formularios de DGT, Registradores y Catastro | 10 | 100 % | 10 | 1.200 |
| G18 | Internacional | 180 | 5 % | 9 | 1.080 |
| G28 | Contencioso sucesorio | 180 | 5 % | 9 | 1.080 |
| G08 | Aplazamiento y fraccionamiento | 60 | 10 % | 6 | 720 |
| G31 | Prevención de blanqueo completa | 20 | 30 % | 6 | 720 |
| G16 | Reducciones pendientes | 5 | 100 % | 5 | 600 (más el error evitado, que puede ser de miles de euros por caso) |
| G25 | Kit RGPD | 5 | 100 % | 5 | 600 |
| G26 | Ordenanzas que faltan | 15 | 30 % | 4,5 | 540 |
| G17 | Fideicomisos y reservas | 60 | 5 % | 3 | 360 |
| **Total bruto** | | | | **≈ 600 h** | **≈ 72.000 €** |
| **Total con un 30 % menos por solapes** | | | | **≈ 420 h (7 h por herencia)** | **≈ 50.000 €** |

**Lectura.** Las mayores palancas de tiempo son la entrada de documentos (G11), la automatización de envíos y seguimientos (G12, G13) y el «último kilómetro» fiscal (G02, G15). Las carencias P0 de defensa tributaria (G06-G08) ahorran menos horas, pero evitan pérdidas económicas (recargos, valores comprobados al alza, plazos de recurso vencidos) y completan el producto.

---

## 7. Automatizaciones que ahorran más tiempo (las 10 primeras)

Principio común: **determinista, revisable y sin servidor propio**. Cada automatización deja borradores y propuestas; nada sale sin que el abogado lo confirme, salvo que active el envío automático por regla. Cada acción se anota en la bitácora y en la auditoría (`auditoria.js`).

### A1 · Enlace de subida para la familia con clasificación automática (G11) · 81 h/año
- **Entradas**: expediente; lista de «Lo que hace falta» (`docsNecesarios` en `logic.js`); contacto de la familia.
- **Flujo**:
  1. El abogado pulsa «Pedir documentos a la familia».
  2. Se genera un enlace con caducidad (14 días por defecto) a una página de subida.
  3. La familia ve la lista en lenguaje llano (la misma de `esrCartaFamilia`) y sube fotos o PDF por documento.
  4. Los archivos se **cifran en el navegador de la familia** con una clave que va en el fragmento `#` del enlace y nunca llega al servidor. Se guardan en un buzón temporal y se borran a los 30 días o al descargarlos.
  5. La app del despacho los descarga, los descifra, los pasa por el lector (`lecAnalizar`) y los concilia con la lista: marca «recibido», archiva por tipo y propone datos.
- **Reglas**:
  - Si el tipo leído no coincide con el pedido, avisa.
  - Si llega una foto del DNI, actualiza el NIF del heredero.
  - Recordatorio automático a los 7 y 14 días de lo que falte (A7).
- **Interfaz**:
  - Documentos › «Pedir a la familia»;
  - franja en el Resumen («La familia ha subido 4 documentos: revisar»);
  - en Mi día, la categoría «La familia» pasa a mostrar entregas.
- **Base**: RGPD art. 28 (exige contrato de encargo aunque el contenido vaya cifrado: los datos cifrados siguen siendo datos personales); art. 32 RGPD (cifrado).
- **Alternativa sin servidor**: la familia sube a una carpeta compartida de OneDrive o Drive del despacho por enlace de «solicitar archivos» (Microsoft Graph «createUploadSession» o Drive). Es la vía coherente con «Nada sale del despacho».
- **Esfuerzo**: L. Archivos: `terceros.js` (`tcFamilia`), `lector.js`, un módulo nuevo `portal.js` y la página `familia/subir.html`. Opcionalmente, el esquema `supabase/` como buzón.

### A2 · Rellenado del 650/660 en el orden del formulario (G02) · 43 h/año
Hoja por heredero y relación de bienes con las casillas de cada territorio, «copiar todo en orden» y, donde exista importación (XML de Madrid [21]), exportación del fichero. Especificación en G02.

### A3 · Datos de la nota simple a los escritos (G01) · 36 h/año
El lector ya lee la finca (`lecNotaFinca`). Se guardan los datos registrales y la escritura, el cuaderno y la instancia se rellenan sin huecos. Especificación en G01.

### A4 · Cadena posterior a la firma · 25 h/año
- **Disparador**: el abogado marca «Escritura firmada» (fecha, notario, protocolo) en Listo para firmar.
- **Acciones**, todas como borradores:
  1. Hoja del 650 cerrada y fijada (versión «presentable») y tarea «Presentar ISD» con la fecha límite.
  2. Una declaración o autoliquidación de plusvalía por ayuntamiento, con la tarea y su plazo (art. 110 TRLRHL).
  3. 900D si la escritura no lleva la referencia catastral.
  4. Tareas «Presentar en el Registro» y «Comprobar la inscripción» (15 días hábiles, art. 18 LH).
  5. **Cartas a cada banco para el cambio de titularidad o la transferencia**, con copia de la escritura y del justificante del ISD (plantilla nueva en `terceros.js`, tipo «titularidad»).
  6. Solicitudes a la DGT para cada vehículo adjudicado.
  7. Tarea de liquidación final y recibí.
- **Reglas**: no se crea lo que ya existe (clave por bien y organismo, como `tcSugerencias`). Sin fecha de firma no se dispara.
- **Interfaz**: un botón y una hoja de confirmación con casillas («Crear 9 elementos»).
- **Esfuerzo**: M. Archivos: `firma.js`, `terceros.js`, `tareas.js`, `escritos.js`.

### A5 · «Pedir todo»: lote de solicitudes iniciales · 25 h/año
- **Disparador**: botón en Bancos y notaría, o regla «al pasar a Documentación».
- **Acciones**:
  1. Genera de una vez el 790 de últimas voluntades y de seguros (con la fecha desde la que se puede pedir).
  2. Una carta por entidad, agrupando cuentas, valores y deudas (ya lo hace `tcSugerencias`).
  3. Nota simple de cada finca.
  4. Valor de referencia de cada inmueble.
  5. Padrón histórico, datos fiscales de la AEAT y certificado del INSS.
- **Salida**: un ZIP con los PDF y Word, más borradores de correo (con G13, envío directo) y las solicitudes creadas en estado «Enviada» con su plazo esperado.
- **Esfuerzo**: S, sobre lo que ya existe, más M con el correo.

### A6 · Ingesta del correo y conciliación de respuestas · 20 h/año
- **Entradas**:
  - archivos .eml o .msg arrastrados (el lector ya lee .eml con `lecEml`);
  - con G13, una carpeta del buzón vinculada («Hereda+/EXP-…») o búsqueda por la referencia del expediente en el asunto.
- **Reglas**:
  - Asunto o cuerpo con la referencia «EXP-AAAA-NNN» asocia el correo al expediente.
  - Remitente con dominio de una entidad de `TC_ENTIDADES` asocia el correo a la solicitud abierta de esa entidad.
  - Los adjuntos pasan al lector; si el tipo es «bancario», la solicitud se marca «Recibida» y se proponen los saldos.
- **Interfaz**: bandeja «Correo por asignar» en Mi día.
- **Esfuerzo**: M.

### A7 · Recordatorios y reclamaciones programados · 15 h/año
- **Hoy**: el escalado está calculado (`tcEscalado`), pero cada recordatorio es un clic, y WhatsApp o mailto se abren a mano.
- **Especificación**:
  - Cada solicitud tiene su «cadencia»:
    - familia: 7, 14 y 21 días;
    - banco: reiteración a los 30 días, queja al servicio de atención al cliente a los 45 y reclamación al supervisor tras su plazo legal (`TC_REFS`).
  - Al vencer, o se envía solo (con G13 y la regla en «automático») o entra en Mi día como «Listo para enviar» con un botón.
  - Los fines de semana y los inhábiles (G09) se respetan.
- **Esfuerzo**: S-M.

### A8 · Notificación tributaria → procedimiento, plazos y borrador (G06, G07) · ≈ 15 h/año
Al subir el PDF de una notificación, el lector reconoce el tipo de acto: requerimiento, propuesta de liquidación con trámite de alegaciones, liquidación, acuerdo de comprobación de valores o sanción. Con la fecha de notificación crea el procedimiento con sus plazos y propone el escrito. Especificación en G06 y G07.

### A9 · Motor de reglas configurable · 10 h/año propias (y habilita A4, A5 y A7)
- **Modelo**: `{ cuando: evento, si: condiciones, entonces: [acciones], modo: "proponer" | "automático" }`.
  - **Eventos**: cambio de fase; trámite hecho; documento recibido de un tipo; fecha relativa (fallecimiento + 150 días); solicitud vencida; firma.
  - **Condiciones**: comunidad, presencia de vehículos o inmuebles, sin prórroga, sin escritura.
  - **Acciones**: crear una tarea o solicitud, generar un escrito, enviar un recordatorio, asignar un responsable, cambiar la fase.
- **Reglas de serie**:
  - Día 150 sin escritura → borrador de prórroga (659 en Andalucía) y tarea crítica (art. 68 RISD).
  - Documento «defunción» recibido → 790 listo.
  - Fase «Firma» con bloqueos rojos → no se permite.
  - Expediente archivado → aplicar o devolver la provisión.
- **Interfaz**: Ajustes › Automatizaciones (lista, activar o desactivar, historial de ejecuciones).
- **Esfuerzo**: L. Archivos: un módulo nuevo `reglas.js` que engancha `anotar`, `guardar` y el radar.

### A10 · Generación por lotes con las plantillas del despacho (G21, G22) · 15 h/año
Se seleccionan expedientes o herederos y una plantilla («carta de seguimiento trimestral», «informe al cliente») y sale un ZIP de Word o PDF, o los correos. Requiere plantillas editables (G21) y acciones masivas (G22).

---

## 8. Carencias priorizadas con especificación

Formato de cada carencia:
- **Qué falta**: incluye el estado de hoy con su evidencia.
- **Por qué**: lo que necesita el abogado.
- **Base legal**.
- **Ahorro**.
- **Esfuerzo**.
- **Especificación**: entradas, salidas, reglas, interfaz, archivos y criterios de aceptación.

No hay G10 ni G27: se integraron en G12 (envíos automáticos) y en G07 (simulador de tasación pericial contradictoria).

### P0 · Imprescindible para estar completo

#### G01 · Datos registrales de las fincas y datos completos del causante · P0 · M · 36 h/año
- **Qué falta.** La escritura, el cuaderno y la instancia dejan huecos en Registro, tomo, libro, folio, finca, descripción y linderos. El 790 deja huecos en la fecha y el lugar de nacimiento, los nombres de los padres y el lugar de la defunción (`docs-r4/escritos.md` § 4). El lector ya analiza la nota simple y la defunción.
- **Por qué.** La escritura de manifestación y adjudicación debe describir e identificar cada finca para inscribirse. El 790 los exige.
- **Base legal.**
  - Inscripción y descripción de la finca: arts. 9 LH y 51 RH.
  - CRU/IDUFIR: art. 9 LH tras la Ley 13/2015.
  - Referencia catastral: art. 38 TRLCI.
  - Certificado de últimas voluntades: anexo II del Reglamento Notarial.
- **Especificación.**
  - **Modelo de datos.** En el bien inmueble:
    - `registro { nombre, numero, municipio }`, `tomo`, `libro`, `folio`, `finca` (número y sección), `inscripcion`;
    - `cru`, `descripcionRegistral`, `linderos`, `superficieRegistral`, `superficieCatastral`;
    - `titulo { tipo, notario, fecha, protocolo }`, `cargasDetalle[]`.

    En el causante: `fechaNacimiento`, `lugarNacimiento`, `padre`, `madre`, `lugarDefuncion`, `inscripcionDefuncion { registroCivil, tomo, folio }`, `estadoCivil`, `regimenEconomico`, `ultimoDomicilio`.
  - **Lector.** Ampliar `lecNotaFinca` (`app/lector.js`) para capturar «Finca de X n.º», «Tomo/Libro/Folio», «IDUFIR/CRU», «Descripción», «Linderos» y «Titularidad»; `lecDefuncion`, para nacimiento, padres y lugar. Cada dato con su confianza y su origen, como hoy.
  - **Comprobación.** En Listo para firmar (`firma.js`), una comprobación nueva: «Finca sin datos registrales» (aviso; bloqueo si no hay ni CRU ni finca y tomo).
  - **Salida.** `esrEscritura`, `esrCuaderno`, instancia de heredero único y 790 sin huecos cuando consta el dato. Comprobación de aspecto en el estilo notarial: «Urbana: [descripción]. Inscrita en el Registro de la Propiedad n.º X de Y, al tomo T, libro L, folio F, finca n.º N. CRU: … Referencia catastral: …».
  - **Aceptación.** `tools/qa/escritos.mjs`: con el caso completo, 0 huecos en las descripciones de las fincas. Prueba del lector con tres notas simples reales anonimizadas.

#### G02 · Modelo 650/660 por territorio, relación de bienes y exportación · P0 · L · 43 h/año
- **Qué falta.** Hoy hay una «Hoja del 650» por heredero con «Copiar», pero sin casillas autonómicas (NO LOCALIZADO, `docs-r4/fiscal.md` § 2). No hay salida del 660 en el orden del formulario ni importación.
- **Por qué.** Presentar es el paso de más volumen y de más riesgo de error al transcribir: una autoliquidación por heredero, más la relación de bienes. Es el argumento comercial de a3ASESOR | her [1].
- **Base legal.**
  - Arts. 31-32 LISD, 64-66 RISD y las órdenes de cada comunidad que aprueban los modelos.
  - Madrid: presentación y pago telemáticos obligatorios de los modelos 650 y 651 [22].
  - Colaboración social en la gestión de los tributos: art. 92 LGT.
- **Especificación.**
  - **Datos.** En `motor.mjs`, `MODELO650_AUT[ccaa] = { version, fuente, estado, casillas: [{ id, etiqueta, origen: "R.isd.porHeredero[i].baseImponible" … }], m660: [{ bloque: "inmuebles", campos: [...] }] }`.
  - **Orden de trabajo:**
    1. AEAT (no residentes, con su guía pública [23]);
    2. Andalucía;
    3. Madrid;
    4. Cataluña;
    5. Comunitat Valenciana;
    6. Galicia;
    7. Castilla y León;
    8. el resto.

    Se obtiene el PDF de instrucciones o capturas del programa de ayuda, como piden los propios informes de la ronda 4.
  - **Interfaz.** En Firma › Hoja del 650, una ficha por heredero y modelo, con casillas numeradas y copiar casilla a casilla o «copiar todo en orden» (texto tabulado para pegar). Pestaña «660» con la relación de bienes por bloques: inmuebles con su referencia catastral y valores, cuentas con IBAN y saldo, valores con ISIN y número, vehículos, seguros, deudas y gastos.
  - **Exportación.** Donde el programa autonómico importe un fichero (Madrid genera e importa el XML [21]), estudiar el esquema y exportarlo. Si el esquema no es público, no se genera (sin ingeniería inversa no documentada).
  - **Colaborador social.** Texto guía y modelo de representación (art. 46 LGT) para que el abogado adherido por su colegio presente [24][25]. Casilla «presentado por colaborador social» con el número de justificante (enlaza con G06).
  - **Reglas.** Cada casilla con estado VERIFICADO o PENDIENTE. Si el territorio no está cotejado, se mantiene el aviso actual.
  - **Aceptación.** Para cada territorio, 3 casos de `src/test.mjs` cuyas casillas cuadran con un borrador real del programa de ayuda.

#### G03 · Inventario y avalúo completos · P0 · M · 18 h/año
- **Qué falta.** Hay 7 tipos de bien (`TIPO_BIEN`: vivienda, inmueble, cuenta, valores, vehículo, empresa, otro). Faltan cripto, arte y joyas, créditos a favor, derechos reales que tenía el causante, rentas, concesiones, explotación agraria, embarcaciones y aeronaves (como bien), propiedad intelectual, seguros como bien (cuando el tomador es el causante y no ha vencido) y bienes en el extranjero (país, moneda, impuesto pagado). Los vehículos se quedan sin valor aunque se conozca el % de depreciación (`lector.js`, l. 1271-1292).
- **Por qué.** La relación de bienes (660), la escritura y la ganancia futura necesitan cada clase con su regla de valoración. Lo que no está en el inventario se hereda mal o se omite (art. 1079 CC, adición).
- **Base legal.**
  - Art. 9 LISD (valor real o de referencia).
  - Remisión de la LISD a las reglas del Impuesto sobre el Patrimonio para valores: Ley 19/1991, arts. 15 y 16.
  - Art. 26 LISD para usufructos y derechos.
  - Orden de precios medios de vehículos (la vigente, Orden HAC/1501/2025, ya citada en el motor).
  - Modelo 721 para cripto en el extranjero.
- **Especificación.**
  - **Tipos nuevos**: `cripto`, `arte` (incluye joyas y colecciones), `credito`, `derechoReal`, `renta`, `explotacion`, `embarcacion`, `aeronave`, `intelectual`, `seguroAhorro`, más la marca `extranjero { pais, moneda, impuestoPagado, fechaPago }` en cualquier tipo.
  - **Asistente de valoración** por tipo:
    - valores cotizados: cotización a la fecha del devengo, introducida por el abogado con su fuente;
    - no cotizados: valor teórico del último balance, que ya está en `lecSociedad`;
    - IIC: valor liquidativo a la fecha;
    - vehículos: precio medio de la tabla × % de depreciación por años, con la tabla de la Orden del año del devengo incorporada como dato y la fuente;
    - cripto: unidades × precio a la fecha, con la fuente;
    - derechos reales: art. 26 LISD con la edad o el plazo.
  - **Reglas.**
    - El ajuar no se calcula sobre el arte ni las joyas (art. 15 LISD; ya se avisa).
    - Los tipos `extranjero` alimentan G18.
    - `cripto` y `extranjero` alimentan los trámites 720 y 721.
  - **Interfaz**: ficha del bien en Herederos y bienes con «Cómo se valora», como hace la plusvalía.
  - **Archivos**: `ui.js` (`TIPO_BIEN`, formulario), `motor.mjs` (`valorBien`), `escritos.js` (descripción en la escritura), `firma.js` (comprobaciones).

#### G04 · Liquidación del régimen económico matrimonial · P0 · L · 33 h/año
- **Qué falta.** `titularidad === "ganancial"` cuenta el 50 % y las deudas gananciales, el 50 % (`motor.mjs`, l. 369 y 1162-1165). No hay inventario de la sociedad (activo y pasivo), reintegros y reembolsos entre masas, bienes privativos por subrogación, cargas, régimen de participación ni regímenes forales (consorcio conyugal aragonés, conquistas navarras, comunicación foral vizcaína, separación catalana con compensación económica por razón de trabajo).
- **Por qué.** Antes de repartir la herencia hay que liquidar la sociedad conyugal. El error desplaza valor entre el viudo y los hijos y cambia el ISD. Además, la escritura debe incorporar esa liquidación.
- **Base legal.**
  - Código Civil: arts. 1344-1410, en especial 1358 (reembolsos), 1396-1398 (inventario), 1404-1407 (adjudicación y preferencias).
  - Participación: arts. 1411-1434 CC.
  - Cataluña: art. 232-5 CCCat (compensación económica, también por muerte).
  - Aragón: CDFA, consorcio conyugal y viudedad.
  - Navarra: Fuero Nuevo (conquistas).
  - País Vasco: Ley 5/2015 (comunicación foral).
  - Las referencias forales concretas deben cotejarse, como se hizo en la ronda 4.
- **Especificación.**
  - **Pantalla nueva** «Régimen económico» en Partición, paso 0:
    1. Régimen (gananciales, separación, participación, consorcio aragonés, conquistas navarras, comunicación foral, separación catalana, otro).
    2. Inventario del activo común (bienes marcados como gananciales o consorciales).
    3. Pasivo común (deudas con la marca de ganancial).
    4. Reintegros y reembolsos: tabla de «dinero privativo invertido en bien ganancial» y «dinero ganancial en bien privativo», con importe y actualización a valor de la liquidación (art. 1358 CC).
    5. Resultado: haber de cada cónyuge.
    6. Adjudicaciones al viudo, con preferencias del art. 1406 (vivienda y explotación).
  - **Salidas**:
    - `R.masa.gananciales` sustituida por el resultado de la liquidación;
    - cuaderno con la «liquidación previa» detallada (ya prevista en `esrCuaderno`);
    - aviso si hay reembolsos sin justificar.
  - **Reglas**:
    - Valores a la fecha de la liquidación (art. 1397 CC).
    - Separación de bienes: copropiedad por cuotas (`porcentaje`).
    - Participación: crédito de participación (art. 1427 CC) como deuda o crédito de la herencia.
    - Foral: los cálculos no cotejados se marcan PENDIENTE y bloquean el «cerrar» sin confirmación del abogado.
  - **Archivos**: `motor.mjs` (función nueva `liquidarRegimen(caso)` con pruebas en `test.mjs`), `particion.js`, `escritos.js`.

#### G05 · Declaración de herederos abintestato · P0 · S · 12 h/año
- **Qué falta.** La sucesión intestada se calcula bien, pero no hay escrito para pedir el acta ni guía de testigos. La notaría competente ya se razona en «Documentos necesarios» (`docs-r4/escritos.md` § 2.2).
- **Por qué.** Es el primer paso sin el cual no hay título sucesorio en el 30 % de los casos supuestos.
- **Base legal.**
  - Arts. 55 y 56 LN (redacción de la Ley 15/2015): notaría del último domicilio y alternativas, testigos y requerimiento.
  - Arts. 912-958 CC.
  - Heredero el Estado: art. 958 CC y su desarrollo reglamentario (RD 1373/2009).
  - Herederos la comunidad autónoma: sus normas propias.
- **Especificación.**
  - **Escrito nuevo** «Requerimiento para el acta de declaración de herederos» (`escritos.js`):
    - requirente;
    - causante con los datos de G01;
    - notaría competente con su razón (art. 55.1);
    - árbol con los posibles herederos y su grado;
    - documentos que se aportan (defunción, últimas voluntades, libro de familia, empadronamiento);
    - dos testigos (nombre, DNI, relación), con el aviso de que no pueden ser parientes interesados (comprobación del abogado).
  - Variante «Estado o comunidad autónoma heredera» con la comunicación a la Delegación de Economía y Hacienda.
  - Tarea en Trámites al pedirlo y estado «Acta autorizada» con notario, fecha y protocolo, que alimenta la escritura.
  - **Interfaz**: Documentos › Escritos, visible solo si `x.testamento === "no"`.

#### G06 · Después de presentar: presentaciones, pagos y notificaciones · P0 · M · 24 h/año
- **Qué falta.** Hay un interruptor «presentado», pero no un registro estructurado ni procedimientos con plazos a partir de una notificación. Los trámites `comprobacion`, `recursos` y `rectificacion` son genéricos.
- **Por qué.** Hacienda comprueba valores con frecuencia. Los plazos corren desde la notificación, y perder el de recurso o el de tasación pericial contradictoria es irreversible.
- **Base legal.**
  - Arts. 57 (comprobación), 99-102 (procedimiento y notificaciones), 120.3 (rectificación), 134-135 (comprobación de valores y TPC), 222-236 (revisión) LGT.
  - Art. 14.2 TRLRHL (reposición previa obligatoria en tributos locales).
  - Art. 27 LGT (recargos).
- **Especificación.**
  - **Modelo.** `x.presentaciones[] = { tributo: "ISD" | "IIVTNU", modelo, sujeto (heredero), fecha, justificante, nrc, importe, medio (colaborador social, oficina…), documentos[] }`.

    `x.procedimientos[] = { tipo: requerimiento | propuestaLiquidacion | liquidacion | comprobacionValores | sancion | providenciaApremio, organo, fechaNotificacion, plazo, actuaciones[], estado }`.
  - **Plazos** (en `motor.mjs`, `plazosProcedimiento(tipo, fechaNot, ccaa)`):
    - Alegaciones: los días que fije el acto.
    - Recurso de reposición: un mes desde el día siguiente a la notificación (art. 223 LGT).
    - Reclamación económico-administrativa: un mes (art. 235 LGT).
    - Tasación pericial contradictoria: dentro del plazo del primer recurso contra la liquidación (art. 135 LGT).
    - Pago en periodo voluntario de una liquidación: el día 20 o el 5 según la quincena de notificación (art. 62.2 LGT).
    - Todo con inhábiles (G09) y el cómputo de meses «de fecha a fecha».
  - **Lector.** Tipo nuevo «notificación tributaria», que reconoce el acto, el órgano, la fecha y el importe (mismas reglas que `lecModelo650`).
  - **Salidas**: entradas en Mi día y la Agenda con su gravedad; enlace al escrito correspondiente (G07).
  - **Interfaz**: Impuestos › «Presentaciones y notificaciones» (nueva subpestaña).

#### G07 · Escritos de defensa tributaria · P0 · M · 23 h/año
- **Qué falta.** No existe ningún escrito de esta fase.
- **Base legal.**
  - Arts. 134-135, 222-236 LGT; art. 120.3 LGT y arts. 126-129 RGAT (rectificación).
  - Art. 9 LISD (valor de referencia).
  - Art. 14.2 TRLRHL.
  - Art. 46 LJCA.
- **Especificación.** Siete plantillas en `escritos.js`, con los datos de la presentación y del procedimiento (G06):
  1. Alegaciones a la propuesta de liquidación o de valoración: motivación insuficiente, valoración sin visita, métodos del art. 57.
  2. Recurso de reposición.
  3. Reclamación económico-administrativa (tribunal regional o autonómico según la comunidad).
  4. Solicitud de tasación pericial contradictoria, con la designación del perito y su aviso de costes.
  5. Solicitud de rectificación de autoliquidación y devolución de ingresos indebidos (por ejemplo, un valor de referencia superior al de mercado o una bonificación no aplicada).
  6. Impugnación del valor de referencia mediante la rectificación o el recurso contra la liquidación, con petición del informe del Catastro.
  7. Reposición contra la liquidación de plusvalía y solicitud de devolución por el método real.
- **Simulador de TPC**: diferencia entre el valor comprobado y el declarado, cuota adicional, intereses y coste estimado del perito, con una recomendación de «compensa» o «no compensa» (riesgo y norma, al estilo de `estrategia.js`).
- **Aceptación**: cada escrito sin huecos con los datos completos; plazos mostrados iguales a los de G06.

#### G08 · Aplazamiento y fraccionamiento del ISD · P0 · S · 6 h/año más liquidez
- **Qué falta.** Trámite `aplazamiento` (art. 38 LISD; arts. 79-86 RISD; art. 65 LGT) sin cálculo ni escrito. La partición ya detecta «Su dinero disponible no cubre…».
- **Por qué.** Herencias con inmuebles y sin liquidez. Evita recargos y ventas precipitadas.
- **Especificación.**
  - **Calculadora**: cuota por heredero, liquidez disponible (cuentas adjudicadas más el pago con cargo a las cuentas del causante, trámite `pago_cuentas`), importe a aplazar, plazos propuestos, interés de demora vigente (`EP.I_DEMORA`) y cuadro de vencimientos.
  - **Garantías**: aviso de garantía y de su dispensa según el importe y la administración, como dato por comunidad con su estado PENDIENTE hasta cotejarlo.
  - **Supuestos especiales** de la LISD y del RISD (arts. 38 LISD y 79-86 RISD) como opciones con su norma.
  - **Escrito** «Solicitud de aplazamiento o fraccionamiento» con motivación (falta de liquidez transitoria), propuesta de plazos y garantía ofrecida.
  - **Interfaz**: Impuestos › palanca nueva en Estrategia «Aplazar en vez de vender» y botón en Firma cuando la liquidez es insuficiente.

#### G09 · Inhábiles autonómicos y locales · P0 · S · 10 h/año más riesgo
- **Qué falta.** `esInhabil` solo descuenta fines de semana y festivos nacionales (`motor.mjs`, l. 2500-2508), y el aviso pide revisar el resto.
- **Base legal.**
  - Art. 30 Ley 39/2015, en especial el 30.7: el calendario oficial de días inhábiles se publica cada año.
  - LGT para los plazos tributarios.
  - Art. 182 LOPJ (agosto) para los procesales (G28).
- **Especificación.**
  - **Datos**: `INHABILES_CCAA[año][ccaa]` y `INHABILES_LOCALES[año][ine]` para las capitales y los municipios con ordenanza, con su fuente (calendario oficial del BOE y los boletines autonómicos) y su estado.
  - **Regla**: el cómputo usa la comunidad y el municipio del órgano ante el que se presenta (la Hacienda autonómica o el ayuntamiento del inmueble), no los del despacho.
  - **Interfaz**: el aviso actual se sustituye por «Contados los festivos de Andalucía y de Marbella»; si falta el local, se mantiene el aviso.
  - **Aceptación**: casos de prueba con un plazo que vence en festivo autonómico y otro en festivo local.

#### G11 · Recogida de documentos de la familia · P0 · L · 81 h/año
Especificación en A1. Es P0 porque el propio código identifica la documentación de la familia como el cuello de botella (`terceros.js`, l. 2-3) y la competencia de las suites lo ofrece (portal de Sudespacho [12]). Hoy el cuestionario devuelve solo datos (`familia.html`, sin campo de archivo).

### P1 · Diferenciales

#### G12 · Motor de automatizaciones · P1 · L · 60 h/año
Especificación en A4, A5, A7 y A9. Es el mayor ahorro tras G11.

#### G13 · Correo integrado desde la cuenta del despacho · P1 · M · 30 h/año
- **Qué falta.** `mailto:` sin registro de lo enviado ni de lo recibido.
- **Especificación.**
  - **Conexión** OAuth 2.0 con PKCE **en el navegador** con Microsoft Graph (`Mail.Send`, `Mail.ReadWrite`) o la API de Gmail. Los datos van del navegador al buzón del propio despacho, **sin pasar por servidores de Hereda+**: compatible con el posicionamiento.
  - **Envío** desde Terceros, Familia y Escritos, con adjuntos PDF o Word.
  - **Registro** en la bitácora y en la solicitud (fecha, destinatario y asunto con «[EXP-2026-033]»).
  - **Ingesta** de respuestas (A6).
  - **Plantillas** de asunto y cuerpo (G21).
- **Reglas**:
  - sin conexión, se cae a `mailto:`;
  - nunca se envía sin la confirmación del usuario, salvo las reglas en «automático» (A9).
- **Archivos**: módulo nuevo `correo.js`; `terceros.js` (`tcRegistrar`), `escritos.js`.

#### G14 · Cuenta de la comunidad hereditaria y modelo 184 · P1 · M · 30 h/año
- **Qué falta.** Solo los trámites `herencia_yacente` y `modelo184`. El libro de fondos actual es el del cliente frente al despacho, no el de la herencia.
- **Base legal.**
  - Arts. 8.3 y 86-90 LIRPF y art. 70 RIRPF (atribución de rentas, modelo 184).
  - Arts. 1063-1064 CC (frutos y gastos).
  - Art. 35.4 LGT (herencia yacente como obligado tributario).
- **Especificación.**
  - **Libro** `x.cuentaHerencia[] = { fecha, tipo: renta | gasto | cobro | pago, concepto, bienId, importe, retencion, justificante }`.
  - **Atribución** por cuotas a la fecha (con renuncias y usufructos: el usufructuario se lleva los frutos).
  - **Salidas**:
    - resumen anual por comunero (rendimientos, retenciones);
    - datos para el 184 con la lista de comuneros y sus rentas;
    - NIF de la herencia (036);
    - en la partición, saldo a repartir o compensar;
    - en el recibí, «cuenta de la herencia».
  - **Interfaz**: Encargo › «Cuenta de la herencia»; aviso en enero en Mi día para los expedientes con rentas (plazo del 184).

#### G15 · IRPF del fallecido y venta del inmueble heredado · P1 · M · 50 h/año
- **Base legal.**
  - Arts. 12-14.4 LIRPF (periodo impositivo e imputación de rentas pendientes) y art. 97 LIRPF.
  - Art. 39 LGT (sucesores).
  - Art. 33.3.b LIRPF (no hay ganancia por transmisión mortis causa).
  - Art. 36 LIRPF (valor de adquisición del heredero: el del ISD más los gastos).
  - Art. 33.4.b LIRPF (exención de los mayores de 65 en la vivienda habitual).
  - Art. 25.2 TRLIRNR (retención del 3 % al no residente que vende).
  - Arts. 104-110 TRLRHL (plusvalía de la venta).
- **Especificación.**
  - **Hoja de la renta del fallecido**:
    - periodo del 1 de enero a la fecha del fallecimiento;
    - rentas leídas de «Datos fiscales» (`lecDatosFiscales`);
    - rentas pendientes de imputar;
    - opción por la conjunta;
    - resultado estimado como crédito o deuda de la herencia (deducible en el ISD según el art. 13 LISD);
    - quién la firma;
    - plazo (campaña del año siguiente; ya en el trámite `irpf`).

    No calcula la cuota completa: es una hoja de datos con el resultado introducido o importado del borrador.
  - **Simulador de venta** por inmueble: precio, gastos, fecha y vendedores con sus cuotas. Da la ganancia de cada heredero con la escala del ahorro (la `ESCALA_AHORRO` ya existe), la plusvalía de la venta con la ordenanza, la exención por edad o reinversión, la retención del 3 % a los no residentes y el modelo 210.

    También compara **vender antes o después de partir** y el efecto del valor declarado en el ISD (completa la palanca de `estrategia.js`).
  - **Interfaz**: Estrategia › «Si se vende» y Trámites › `venta_inmueble` con el botón «Simular».

#### G16 · Reducciones y supuestos fiscales pendientes · P1 · M · 5 h/año (riesgo alto en euros)
- **Qué falta** (según los propios informes `docs-r4/fiscal.md` § 3 y § 6, y la ausencia de «agrari» en `motor.mjs`):
  - reducciones por explotación agraria (Ley 19/1995, arts. 9-11 y 20);
  - empresa familiar de Asturias, La Rioja y Bizkaia;
  - hijos menores de Aragón (hasta 3.000.000 €);
  - sobrinos de Extremadura (art. 20 ter);
  - reducción única de Galicia descontando lo consumido;
  - plazos y recargos forales de Navarra, Álava y Bizkaia;
  - tablas forales de plusvalía.
- **Especificación**: modelarlos en `motor.mjs` con su estado y sus pruebas, y pasar los avisos a cálculo cuando haya fuente literal. Es trabajo de la «mesa jurídica», no de interfaz.

#### G17 · Fideicomisos, sustituciones, reservas y derecho de transmisión · P1 · L · 3 h/año (casos de alto valor)
- **Base legal.**
  - Arts. 781-789 CC (sustitución fideicomisaria) y fideicomiso de residuo (jurisprudencia).
  - Arts. 811 y 968-980 CC (reservas).
  - Art. 1006 CC (ius transmissionis; STS de 5-6-2018 sobre su tributación).
  - Art. 26 LISD y art. 53 RISD (tributación de las sustituciones), que deben cotejarse antes de modelar.
- **Especificación**: tipo de llamamiento «fiduciario» y «fideicomisario» (este con condición o término) en la persona.
  - El fiduciario tributa según el régimen de usufructo o de pleno dominio que fije la norma cotejada, con estado PENDIENTE hasta entonces.
  - Al fideicomisario se le crea un evento futuro de la herencia, con una tarea de seguimiento.
  - Las reservas se marcan sobre el bien con la consecuencia en la partición (indisponibilidad) y un aviso.
  - Hoy el lector avisa y no calcula: el paso mínimo es un **bloqueo explicativo** en el reparto, como el foral.

#### G18 · Herencias internacionales · P1 · M · 9 h/año
- **Base legal.**
  - Reglamento (UE) 650/2012: arts. 21-22 (ley aplicable y elección), 62-73 (certificado sucesorio europeo).
  - Reglamento de Ejecución 1329/2014 (formularios).
  - Art. 23 LISD (doble imposición).
  - Disposición adicional segunda de la LISD (no residentes).
  - Modelos 720 y 721 de la AEAT.
- **Especificación.**
  1. Asistente de ley aplicable: residencia habitual, nacionalidad, *professio iuris* en el testamento, reenvío. Resultado razonado y aviso.
  2. **Deducción por doble imposición** en `calcularISD`: el menor entre el impuesto extranjero sobre esos bienes y la cuota media española × el valor de los bienes en el extranjero, por heredero.
  3. Prerrelleno del formulario de solicitud del certificado sucesorio europeo con los datos del expediente.
  4. Trámites 720/721 y 210 activados por los bienes marcados como `extranjero` y por los herederos no residentes.

#### G19 · Herencia con deudas: beneficio de inventario y deliberar · P1 · M · 12 h/año
- **Base legal.**
  - Arts. 1004-1005 (interpelación) y 1010-1034 CC (beneficio de inventario, deliberar, pago a acreedores y legatarios).
  - Arts. 567-571 TRLC (concurso de la herencia).
- **Especificación.**
  - **Escritos**:
    - aceptación a beneficio de inventario;
    - solicitud de formación de inventario ante notario con citación de acreedores y legatarios;
    - manifestación del derecho a deliberar;
    - requerimiento de interpelación al heredero indeciso.
  - **Panel «Solvencia de la herencia»**: activo frente a pasivo conocido y contingente (avales, `situ.avalista`), orden de pago a acreedores y aviso de concurso cuando el pasivo supera el activo.
  - **Plazos**: los del art. 1014 CC y el de 30 días naturales para manifestar la aceptación o la repudiación (art. 1019 CC), en la Agenda.

#### G20 · Firma electrónica · P1 · M · 20 h/año
- **Especificación.**
  1. **Firma del abogado** con su certificado mediante AutoFirma: protocolo `afirma://` invocable desde la web, firma PAdES sobre los PDF que genera `pdf.js`, sin servidor.
  2. **Firma del cliente** (hoja de encargo, acuerdo entre herederos, recibí) por dos vías:
     - firma avanzada mediante un proveedor de servicios de confianza (el proveedor debe estar cualificado o reconocido según eIDAS), que exige contrato de encargo con ese proveedor;
     - flujo «imprimir, firmar y escanear» con el escáner existente, que lo archiva como «firmado».
- **Base legal.** Reglamento (UE) 910/2014 (eIDAS), en especial su art. 25; Ley 6/2020.

#### G21 · Plantillas y cláusulas del despacho · P1 · M · 20 h/año
- **Especificación.**
  - Editor de plantillas con campos combinados (`{{causante.nombre}}`, `{{heredero[i].nif}}`, `{{isd.total}}`…) y bloques condicionales (`{{#si testamento}}`).
  - Biblioteca de cláusulas propias (honorarios, protección de datos, advertencias).
  - Versiones forales de la escritura y el cuaderno (CCCat, CDFA, Fuero Nuevo, Ley 5/2015), revisadas jurídicamente.
  - Idiomas: catalán, gallego y euskera para los escritos, e inglés para el informe al cliente extranjero (cubre G37).
  - Las plantillas de serie siguen siendo la referencia: la del despacho «hereda» de ella y se avisa cuando la de serie cambia por normativa.
- **Archivos**: `escritos.js` (`esrDocx` acepta una plantilla), una sección nueva en Ajustes y almacenamiento en la red (G23).

#### G22 · Vistas guardadas, acciones masivas y atajos · P1 · M · 15 h/año
Especificación en el § 5.

**Atajos** (`paleta.js`, con `pkAtajosHTML` como ayuda):

| Atajo | Acción |
|---|---|
| g + d | Mi día |
| g + e | Expedientes |
| g + a | Agenda |
| j / k | Moverse por las filas |
| Intro | Abrir |
| n | Nuevo expediente |
| / | Buscar |
| 1 a 9 | Secciones del expediente |
| e | Escritos |
| t | Nueva tarea |
| r | Registrar tiempo |

**Acciones masivas nuevas**: generar un escrito o un informe trimestral al cliente, recordatorio a las familias, marcar trámites, exportar y cambiar el responsable.

#### G23 · Control de acceso real · P1 · M · riesgo
- **Qué falta.** Los perfiles no restringen (`socio.js`, l. 8). En la red, cualquiera con la contraseña del despacho ve todo.
- **Especificación.**
  - Clave personal por usuario, que envuelve la clave del despacho (el formato de `red.js` ya re-envuelve claves).
  - Visibilidad por expediente («solo el equipo asignado»), cifrando cada expediente con la clave de su equipo.
  - Permisos por perfil (el administrativo no ve los honorarios ni modifica impuestos).
  - Aprobación del socio antes de enviar una escritura o de marcar «presentado».
- **Límite honesto**: sin servidor, la restricción es criptográfica, no de interfaz.

#### G24 · Facturación sin convertirse en sistema de facturación · P1 · S · 15 h/año
- **Contexto.** Los fabricantes de software de facturación están obligados al RD 1007/2023 (VeriFactu) sin prórroga, según [34]. Para los obligados, el sistema es exigible el 1-1-2027 (sociedades) y el 1-7-2027 (resto) [34][35].
- **Recomendación**: **no** emitir facturas en Hereda+.
- **Especificación**:
  - minuta proforma (no factura) con el desglose de honorarios, IVA, retención de IRPF si el cliente es empresario (cálculo informativo) y suplidos;
  - exportación CSV o JSON por minuta para importarla en el programa de facturación del despacho (Kleos, Lex-ON, a3, Holded…);
  - campo «número de factura emitida» para conciliar el cobro.

#### G25 · Kit RGPD · P1 · S · 5 h/año más riesgo
- **Base legal.** RGPD arts. 13, 14, 15, 17, 30 y 32; LOPDGDD arts. 3 (datos de personas fallecidas) y 32 (bloqueo).
- **Especificación.**
  - Cláusula informativa del art. 14 para los herederos que no son clientes, generada con los datos del despacho.
  - Ficha del registro de actividades «Gestión de herencias».
  - Política de conservación por expediente archivado: aviso a los 5 años desde el cierre, bloqueo y anonimización (sustituye nombres y NIF, conserva las cifras para la estadística).
  - Exportación del acceso de un interesado.
  - Casillas de la Fase 0 enlazadas a esos documentos.

#### G26 · Ordenanzas de plusvalía: cobertura y actualización · P1 · M (continuo) · 4,5 h/año
- **Qué falta.** Hay 322 ordenanzas incorporadas de 8.132 municipios. Hay 106 no localizadas (`docs-r4/ordenanzas.md`), y el resto va al máximo legal con aviso.
- **Especificación.**
  - Cuando un abogado introduce a mano el tipo y la bonificación con su fuente, se le ofrece **«Compartir con Hereda+»**: solo los datos públicos de la ordenanza, sin datos del expediente.
  - Revisión editorial y publicación en la siguiente versión normativa (`NORMA_V`).
  - Prioridad por la demanda real: los municipios más buscados.

### P2 · Deseables

| ID | Carencia | Especificación breve | Esfuerzo |
|---|---|---|---|
| G28 | Contencioso sucesorio | Plazos procesales (días hábiles; agosto inhábil, art. 182 LOPJ); escritos de solicitud de contador-partidor dativo (art. 1057.2 CC; notarial o ante el letrado de la Administración de Justicia), demanda de división judicial (arts. 782-789 LEC), intervención del caudal (arts. 790-805 LEC), defensor judicial (art. 163 CC) y aprobación de la partición con menores (art. 1060 CC); exportación en PDF/A con el nombre listo para LexNET (sin integración directa, que exige homologación) | L |
| G29 | Formularios de organismos | Prerrelleno de la solicitud de cambio de titularidad por herencia de la DGT, la petición de nota simple a Registradores y la consulta del valor de referencia con la referencia catastral preparada: enlaces profundos más una hoja de datos para copiar. Exportación estructurada (JSON y PDF) de otorgantes y fincas para la notaría (SIGNO no tiene API pública [31]) | M |
| G30 | Planificación sucesoria y donaciones | Expediente tipo «planificación»: simulación de testamentos (usufructo universal, mejora, legados), donaciones en vida (modelo 651 y bonificaciones de donaciones por comunidad), pactos sucesorios gallegos, vascos y catalanes. Reutiliza `segunda.js` y el motor. Es una línea de ingresos nueva | XL |
| G31 | Prevención de blanqueo completa | Cuestionario de diligencia debida (titular real, PEP, origen de fondos, riesgo), conservación 10 años y aviso de que el abogado es sujeto obligado si gestiona fondos o inmuebles (art. 2.1.ñ Ley 10/2010) | S |
| G32 | Calendario y notificaciones | Sincronización bidireccional con Outlook o Google (Graph o Calendar API en el navegador), resumen diario de Mi día a las 8:00 y notificaciones del navegador | M |
| G33 | Móvil | Red en el móvil con un servidor relé opcional; captura de documentos y Mi día en modo compañero | L |
| G34 | Prestaciones y herencia digital | Estimación orientativa de la pensión de viudedad; lista de cuentas digitales por plataforma (art. 96 LOPDGDD) | S |
| G35 | Colaboración y seguridad de uso | Comentarios con @menciones por expediente, papelera de 30 días, restaurar un campo desde el registro de cambios y comprobación de conflictos por NIF y por todos los intervinientes (herederos, contrarios, deudores) | M |
| G36 | API y exportación abierta | Esquema JSON publicado del expediente, exportación completa e importación desde otras suites; «webhook» local (archivo en la carpeta de red) para integradores | M |
| G37 | Idiomas | Escritos en lenguas cooficiales e informe en inglés (incluido en G21) | M |

---

## 9. Lo que ya es diferencial (no tocar o reforzar)
1. **Cálculo explicable**: cada cifra con su artículo y su estado VERIFICADO o PENDIENTE, y 1.677 pruebas. Ningún competidor localizado lo muestra.
2. **Mi día con euros en juego** (recargos y bonificaciones rogadas) y **terceros con escalado regulatorio**: Banco de España y DGSFP, con sus plazos.
3. **Lector local sin IA** con la procedencia de cada dato.
4. **Derecho foral real**: intestada, legítimas y troncalidad.
5. **Dos herencias** y **estrategia con riesgo**: el asesoramiento de mayor valor.
6. **Privacidad sin encargo del tratamiento**. Toda carencia que añada nube (G11, G13, G20) debe diseñarse con la vía local primero, o con E2E y contrato del art. 28, para no perder este argumento.

---

## 10. Hoja de ruta propuesta

| Trimestre | Entregas | Por qué en ese orden |
|---|---|---|
| T4 2026 (rápidas, S) | G01 (datos registrales y del causante), G05 (requerimiento de declaración de herederos), G09 (inhábiles), G08 (aplazamiento), A5 («Pedir todo» sin correo), corrección de la comparativa de la portada y retirada del código de IA latente | Quitan huecos visibles en los escritos y riesgos de plazo con poco código |
| T1 2027 | G06 y G07 (después de presentar y defensa tributaria), G02 para AEAT, Andalucía y Madrid, G24 (proforma y exportación de honorarios) y A4 (cadena posterior a la firma) | Cierra el ciclo fiscal en los territorios con más volumen; coincide con la entrada de VeriFactu |
| T2 2027 | G11 en su vía local (subida a la carpeta del despacho mediante Graph o Drive), G13 (correo), A6 y A7 | Las mayores horas ahorradas, sin servidor propio |
| T3 2027 | G04 (régimen económico), G03 (inventario), G14 (cuenta de la herencia y 184), G15 (IRPF) y G12 completo (motor de reglas) | Profundidad que no tiene a3ASESOR \| her |
| T4 2027 | G02 para el resto de territorios, G16, G18, G19, G20, G21, G22 y G23 | Diferenciación y despachos medianos |
| 2028 | P2 y, si se decide la nube, G11 con buzón E2E y el esquema `supabase/` | Decisión estratégica |

**Decisiones que debe tomar la dirección antes de ejecutar:**
1. **Nube, sí o no**, y con qué contrato (afecta a G11, G13, G20, G23 y G33). La vía «carpeta y cuenta propia del despacho» (Graph o Drive) mantiene el argumento «no recibimos tus datos».
2. **Facturación**: exportar e integrar (recomendado) frente a convertirse en sistema de facturación con VeriFactu.
3. **IA**: mantener «sin IA» (recomendado como garantía) y retirar el código latente, o ofrecerla opcional y local. Hay que decidirlo antes de que la competencia (GenIA-L) fije la expectativa del mercado.
4. **Colaborador social**: el producto guía y exporta; la presentación la hace el abogado adherido por su colegio [24][25].

---

## 11. Fuentes (competencia y referencias externas)

Consultadas por búsqueda web el 10-10-2026. Las páginas no se pudieron abrir enteras desde esta sesión: el proxy bloquea WebFetch y curl. Las afirmaciones salen de los extractos indexados y de las páginas de los propios fabricantes o de prensa.

1. Wolters Kluwer, ficha de a3ASESOR | her: https://assets.contenthub.wolterskluwer.com/api/public/content/2411616-ficha-producto-a3asesor-her-2b39a3ffed?v=144ab336
2. iunis, «a3asesor Her: software para gestionar el Impuesto de Sucesiones» (24-03-2024): https://www.iunis.es/2024/03/22/a3asesor-her-software-sucesiones/
3. Link Soluciones, a3ASESOR her: https://www.linksoluciones.com/software-asesorias/a3asesor-her/
4. Wolters Kluwer, Kleos: https://www.wolterskluwer.com/es-es/solutions/kleos
5. Capterra, Kleos: https://www.capterra.es/software/1011070/kleos; Softwaredoit, Kleos: https://www.softwaredoit.es/wolters-kluwer-kleos/wolters-kluwer-kleos.html
6. Wolters Kluwer, Kmaleon: https://www.wolterskluwer.com/es-es/solutions/kmaleon
7. LegalToday, «Aranzadi Fusión nos aporta inmediatez…» (2015): https://www.legaltoday.com/actualidad-juridica/entrevistas/aranzadi-fusion-nos-aporta-inmediatez-precision-eficacia-2015-10-19/
8. El Derecho (Lefebvre), Lex-ON: https://elderecho.com/lexon-el-control-total-de-tu-despacho-de-abogados-con-una-sola-herramienta
9. El Derecho, integración de B2Brouter en Lex-ON (VeriFactu y TicketBAI): https://elderecho.com/b2brouter-impulsa-la-digitalizacion-del-sector-legal-con-su-integracion-en-lex-on-el-software-de-gestion-de-lefebvre
10. Memento Sucesiones 2025 (Lefebvre, oferta del ICAL): https://www.ical.es/wp-content/uploads/2025/06/Memento-Sucesiones-2025.pdf
11. El Derecho, GenIA-L para 16.000 abogados del programa de competencias digitales: https://elderecho.com/mas-de-16-000-abogados-y-abogadas-del-programa-de-competencias-digitales-accederan-de-manera-gratuita-a-genia-l-de-lefebvre
12. Stanford CodeX Techindex, Sudespacho.net: https://techindex.law.stanford.edu/companies/16375
13. Comparasoftware, Sudespacho.net: https://www.comparasoftware.com/sudespacho-net; Microjuris (2018), versión Lite: https://aldiaargentina.microjuris.com/2018/10/04/app-recomendada-sudespacho/
14. El Referente, «Nace Heritae…»: https://elreferente.es/inversiones/nace-heritae-startup-espanola-gestiona-manera-integral-herencias/
15. Atalayar, «Arrival of legaltech online inheritance» (2021): https://www.atalayar.com/en/articulo/new-technologies-innovation/arrival-legaltech-online-inheritance/20210319082921150416.html
16. Billeo, gestorías de herencias: https://www.billeo.es/blog/gestorias-herencias-opiniones
17. Legálitas, abogados de herencias: https://www.legalitas.com/servicios/abogados-herencias
18. reclamador.es, herencias: https://www.reclamador.es/blog/?p=25691
19. CaixaBank, testamentaría: https://www.caixabank.es/particular/general/testamentaria.html
20. Comunidad de Madrid, herramienta de cálculo del ahorro en Sucesiones: https://www.comunidad.madrid/node/65461
21. Comunidad de Madrid, guía «Gestión de herencias» (generación e importación del XML del 650): https://www.comunidad.madrid/sites/default/files/gestion_de_herencias.pdf; infografía: https://comunidad.madrid/sites/default/files/infografia_m650_contribuyente_v2.0.pdf
22. Comunidad de Madrid, orden de presentación telemática: https://www.comunidad.madrid/transparencia/sites/default/files/regulation/documents/2018_10_11_ordenpresentaciontelematica_1112581.pdf
23. AEAT, guía del programa de ayuda del 650: https://www3.agenciatributaria.gob.es/static_files/common/internet/dep/aduanas/autoliqsuc/GUIA%20PROGRAMA%20DE%20AYUDA%20650.pdf
24. Agencia Tributaria de Andalucía, guía de colaboración social: https://www.juntadeandalucia.es/sites/default/files/inline-files/2024/07/Guia%20colaboraci%C3%B3n%20social%20con%20ATRIAN.pdf
25. Convenio de la ATRIAN con el ICA de Sevilla: https://www.juntadeandalucia.es/sites/default/files/2020-10/Convenio%20CS%20ATRIAN%20e%20Ilustre%20Colegio%20de%20Abogados%20Sevilla.pdf
26. Convenio de la ATRIAN con ASOCIAE (modelos 650, 651 y 660): https://cdn.juntadeandalucia.es/sites/default/files/2020-10/Convenio%20ASOCIAE.pdf
27. Región de Murcia, instrucciones del 650: https://etributos.carm.es/etributos/public/preimpresos/doc/INS650-2017.pdf
28. Taxdown, calculadora de Sucesiones de Madrid: https://taxdown.es/herramientas/calculadora-impuesto-sucesiones-madrid
29. guiafiscal, calculadora de Sucesiones: https://guiafiscal.es/calculadoras/sucesiones/
30. Calculadora de herencias de España (código abierto): https://hunted.space/product/calculadora-herencias-espana
31. Notariado, modernización y Ancert: https://notariado.org/portal/en/modernization-of-the-notary-public
32. Búsqueda «software cuaderno particional»: sin producto específico (resultados de vLex y asesor.legal).
33. Búsqueda de un módulo de ISD en Sage Despachos: sin resultado (materiales de formación de Sage sin ISD).
34. LegalToday, «Nueva prórroga Verifactu…» (04-12-2025): https://www.legaltoday.com/actualidad-juridica/noticias-de-derecho/nueva-prorroga-verifactu-no-sera-obligatorio-hasta-2027-para-sociedades-y-otros-contribuyentes-2025-12-04/
35. Billin, «Hacienda retrasa Verifactu a 2027»: https://www.billin.net/blog/hacienda-retrasa-verifactu-a-2027/
36. Ley 11/2023 y art. 17 ter de la Ley del Notariado (actos por videoconferencia; las herencias no figuran en la lista localizada): https://www.osborneclarke.com/es/insights/tramites-notariales-online; https://www.iberley.es/legislacion/articulo-17-ter-ley-notariado

**Referencias internas** (en `fuente/`): `docs-r5/auditoria.md`, `docs-r4/escritos.md`, `docs-r4/fiscal.md`, `docs-r4/civil.md`, `docs-r4/red.md`, `docs-r4/web.md`, `docs-r4/ordenanzas.md`, `venta/objeciones.md`, `supabase/migrations/0001_esquema_despachos.sql`, `src/motor.mjs`, `src/tramites.mjs`, `src/app/*.js`.
