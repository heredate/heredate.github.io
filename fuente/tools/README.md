# Cobros, licencias y facturas

Hereda+ se cobra **por transferencia bancaria** a la cuenta del titular, por adelantado (trimestral, semestral o anual). No hay tarjeta ni domiciliación. El IBAN **no se publica nunca** en la web: solo va en el correo de confirmación que envías tú y en las facturas.

Los datos del titular (nombre, NIF, domicilio, correo, IBAN, titular de la cuenta) están en un solo sitio: `src/empresa.json`. `build.py` pone en la web los datos públicos y avisa si falta alguno; `emitir-factura.mjs` usa también el IBAN. Si el repositorio es público, deja el IBAN vacío en `src/empresa.json` y ponlo en `tools/emisor.json` (no se sube a GitHub): la herramienta de facturas lo toma de ahí.

Precios sin IVA (21 %): Individual 59 €/mes, Despacho 129 €/mes, Despacho+ 249 €/mes, Fundador 49 €/mes (oferta de lanzamiento: 10 despachos, hasta el 31-12-2026, hasta 5 usuarios, precio fijo). Trimestral = 3 meses, semestral = 6 meses, anual = 10 meses.

| Plan | Trimestral | Semestral | Anual |
|---|---|---|---|
| Individual | 177 € + IVA = 214,17 € | 354 € + IVA = 428,34 € | 590 € + IVA = 713,90 € |
| Despacho | 387 € + IVA = 468,27 € | 774 € + IVA = 936,54 € | 1.290 € + IVA = 1.560,90 € |
| Despacho+ | 747 € + IVA = 903,87 € | 1.494 € + IVA = 1.807,74 € | 2.490 € + IVA = 3.012,90 € |
| Fundador | 147 € + IVA = 177,87 € | 294 € + IVA = 355,74 € | 490 € + IVA = 592,90 € |

## 1. Llega una solicitud (correo desde contratar.html)

Comprueba que el NIF y los datos fiscales están completos y contesta en un día hábil con la **plantilla A**.

## 2. Me ha llegado una transferencia

1. **Comprueba el ingreso** en el banco: importe, ordenante y concepto (el despacho y el plan).
2. **Emite la factura** (marcada como pagada) desde una terminal en la carpeta del proyecto:

   ```
   node tools/emitir-factura.mjs --cliente "Ruiz Abogados, S.L.P." --nif B12345678 --domicilio "Calle Larios 3, 29005 Málaga" --plan despacho --periodo trimestral --desde 2026-10-05
   node tools/emitir-factura.mjs --pagada H-2026-0001 --fecha-cobro 2026-10-05
   ```

   `--periodo` admite `trimestral`, `semestral` o `anual`. Más ejemplos (rectificativas, borradores con `--prueba`) en la cabecera de `tools/emitir-factura.mjs`.

3. **Emite el código de licencia.** `--pagado-hasta` es el último día del periodo pagado; el código vale **7 días más de cortesía** (cláusula 11.5 de las condiciones):

   ```
   node tools/emitir-licencia.mjs --despacho "Ruiz Abogados" --plan despacho --pagado-hasta 2027-01-04
   ```

   - `--plan`: `individual` (1 usuario), `despacho` (hasta 5), `despacho+` (hasta 15) o `fundador` (hasta 5, como Despacho).
   - `--usuarios`: opcional; si no se pone, se usa el máximo del plan.
   - `--hasta AAAA-MM-DD`: en lugar de `--pagado-hasta`, fija el último día de validez exacto (sin cortesía).

4. **Copia la línea que empieza por `HRD1-`** y envíala con la **plantilla B**, con la factura adjunta. El despacho la pega en *Despacho y ajustes › Licencia* y pulsa *Activar*.

Cada código queda anotado en `tools/licencias-emitidas.csv` (identificador, despacho, plan, usuarios, fecha y código) y cada factura en `tools/facturas.csv`.

## 3. Renovación

- **30 días antes** del fin del periodo pagado: envía la **plantilla C** (la cláusula 11.2 promete el aviso con 30 días). La app también avisa al despacho.
- Al recibir la transferencia: repite el paso 2 con el nuevo `--pagado-hasta`. El despacho pega el código nuevo encima del anterior.
- Si no llega: al terminar los 7 días de cortesía la app pasa a solo lectura. No se pierde nada.

## Plantillas de correo

### A · Confirmación de la solicitud (con los datos de la transferencia)

> **Asunto:** Hereda+ · Confirmación de su plan {PLAN} y datos para la transferencia
>
> Hola, {NOMBRE}:
>
> Gracias por elegir Hereda+. Le confirmamos la contratación con estas condiciones:
>
> - Plan: {PLAN} ({USUARIOS} usuarios)
> - Periodo: {TRIMESTRAL / SEMESTRAL / ANUAL}, del {DESDE} al {HASTA}
> - Importe: {BASE} € + IVA 21 % ({IVA} €) = **{TOTAL} €**
>
> Para activarlo, haga una transferencia de {TOTAL} € a:
>
> - IBAN: {IBAN}
> - Titular: {TITULAR DE LA CUENTA}
> - Concepto: Hereda+ {PLAN} · {DESPACHO}
>
> En cuanto la recibamos (normalmente el mismo día) le enviaremos el código de licencia y la factura. El código se pega en Hereda+, en *Despacho y ajustes › Licencia*.
>
> La contratación se rige por las condiciones generales publicadas en {WEB}/condiciones.html (versión 1.0).
>
> Un saludo,
> {FIRMA} · {CORREO} · {TELÉFONO}

### B · Envío del código de licencia

> **Asunto:** Hereda+ · Su código de licencia
>
> Hola, {NOMBRE}:
>
> Hemos recibido su transferencia. Este es el código de licencia de {DESPACHO}, válido hasta el {HASTA + 7 DÍAS}:
>
> {CÓDIGO HRD1-…}
>
> Para activarlo: abra Hereda+ › *Despacho y ajustes* › *Licencia*, pegue el código y pulse *Activar*. Lo mismo en cada equipo del despacho (hasta {USUARIOS} usuarios). Los expedientes de la prueba siguen donde estaban.
>
> Le adjuntamos la factura {NÚMERO}. Para cualquier duda, responda a este correo: contestamos en un día hábil.
>
> Un saludo,
> {FIRMA}

### C · Recordatorio de renovación (30 días antes)

> **Asunto:** Hereda+ · Su licencia vence el {HASTA}
>
> Hola, {NOMBRE}:
>
> El periodo pagado de su licencia de Hereda+ ({PLAN}) termina el {FIN DEL PERIODO}. Para renovar el mismo plan por {PERIODO}, haga una transferencia de **{TOTAL} €** ({BASE} € + IVA) a:
>
> - IBAN: {IBAN}
> - Titular: {TITULAR DE LA CUENTA}
> - Concepto: Renovación Hereda+ {PLAN} · {DESPACHO}
>
> Al recibirla le enviamos el código nuevo y la factura. Si quiere cambiar de plan o de periodo, o darse de baja, responda a este correo antes del {FIN DEL PERIODO − 15 DÍAS}. Si la transferencia se retrasa, tiene 7 días de cortesía; después la app queda en solo lectura, sin perder nada.
>
> Un saludo,
> {FIRMA}

## Otras órdenes

- Comprobar un código que te envía un cliente: `node tools/emitir-licencia.mjs --verificar HRD1-...`
- Ver la clave pública que lleva la app: `node tools/emitir-licencia.mjs --clave-publica`
- Facturas pendientes de cobro: `node tools/emitir-factura.mjs --listar`

## La clave privada

- Se creó la primera vez que se ejecutó la herramienta. **Haz una copia en un lugar seguro** (un gestor de contraseñas o un USB guardado). Si se pierde, habrá que generar otra y publicar una versión de la app con la clave pública nueva; los códigos antiguos dejarían de valer.
- **No la subas nunca** a GitHub, a Netlify ni a ningún sitio. Está en `.gitignore`. Para publicar, arrastra a Netlify solo la carpeta `dist/publicar` (la genera `python3 src/build.py`), que no la contiene.
- Si la herramienta avisa de que la app lleva otra clave pública, los códigos no funcionarán: copia la clave que indica en `src/app/licencia.js` (`const LIC_CLAVE`).
