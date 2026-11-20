import Link from "next/link";
import { LegalList, LegalSection } from "@/components/LegalPageLayout";
import { companyInfo } from "@/lib/company";

export function TerminosLegalContent() {
  return (
    <>
      <LegalSection title="1. Identificación">
        <p>
          El presente sitio web es operado por{" "}
          <strong className="text-orange">{companyInfo.legalName}</strong>,
          marca comercial{" "}
          <strong className="text-orange">{companyInfo.brand}</strong>, con
          domicilio en {companyInfo.address} (en adelante, &quot;Fica
          Tostadores&quot; o &quot;nosotros&quot;).
        </p>
        <p>
          Contacto:{" "}
          <a
            href={`mailto:${companyInfo.emailVentas}`}
            className="text-orange hover:underline"
          >
            {companyInfo.emailVentas}
          </a>
          {" · "}
          {companyInfo.phones[0].value}
        </p>
      </LegalSection>

      <LegalSection title="2. Aceptación">
        <p>
          Al acceder, navegar o utilizar este sitio web, usted declara haber
          leído y aceptado estos Términos y Condiciones y nuestra{" "}
          <Link href="/privacidad" className="text-orange hover:underline">
            Política de Privacidad
          </Link>
          . Si no está de acuerdo,{" "}
          <strong className="text-orange">debe abstenerse de usar el sitio</strong>
          .
        </p>
      </LegalSection>

      <LegalSection title="3. Objeto del sitio">
        <p>
          El sitio tiene fines informativos y comerciales: presentar el catálogo
          de maquinaria para tostado y procesamiento (café, frutos secos, trigo,
          equipos industriales, etc.), permitir solicitar cotizaciones y
          facilitar el contacto con nuestro equipo de ventas.
        </p>
        <p>
          Salvo acuerdo escrito distinto, el sitio{" "}
          <strong className="text-orange">no constituye una tienda en línea</strong>{" "}
          ni implica la{" "}
          <strong className="text-orange">
            celebración automática de contratos de compraventa
          </strong>
          .
        </p>
      </LegalSection>

      <LegalSection title="4. Uso permitido">
        <p>
          El usuario se compromete a utilizar el sitio de forma lícita y
          adecuada. <strong className="text-orange">Queda prohibido:</strong>
        </p>
        <LegalList
          items={[
            "Usar el sitio para fines fraudulentos, ilícitos o que vulneren derechos de terceros.",
            "Intentar acceder sin autorización al panel administrativo, APIs restringidas o sistemas internos.",
            "Realizar scraping masivo, ataques de denegación de servicio, pruebas de penetración no autorizadas o cualquier actividad que afecte la disponibilidad del sitio.",
            "Subir, transmitir o introducir malware, código malicioso o contenido ilegal.",
            "Reproducir, modificar o explotar comercialmente contenidos del sitio sin autorización previa y por escrito de Fica Tostadores.",
          ]}
        />
      </LegalSection>

      <LegalSection title="5. Cotizaciones e información comercial">
        <p>
          Las capacidades, especificaciones, imágenes, precios (si se publicaran)
          y descripciones de productos tienen carácter referencial. Una solicitud
          de cotización mediante el formulario, WhatsApp, correo o teléfono{" "}
          <strong className="text-orange">no genera obligación de venta</strong>{" "}
          hasta que exista una propuesta formal aceptada por ambas partes.
        </p>
        <p>
          Nos reservamos el derecho de modificar fichas técnicas, disponibilidad,
          configuraciones y condiciones comerciales sin previo aviso en el sitio,
          informando al cliente durante el proceso de cotización cuando
          corresponda.
        </p>
      </LegalSection>

      <LegalSection title="6. Propiedad intelectual">
        <p>
          El diseño del sitio, textos, logotipos, marcas, fotografías, diagramas,
          catálogos y demás contenidos son propiedad de Fica Tostadores o de sus
          licenciantes, salvo indicación contraria.{" "}
          <strong className="text-orange">
            Queda prohibida su reproducción, distribución o transformación sin
            autorización expresa
          </strong>
          .
        </p>
        <p>
          Las marcas de terceros mencionadas en el sitio pertenecen a sus
          respectivos titulares.
        </p>
      </LegalSection>

      <LegalSection title="7. Cuentas y acceso administrativo">
        <p>
          El acceso al panel de administración{" "}
          <strong className="text-orange">
            está restringido a usuarios expresamente autorizados
          </strong>{" "}
          por Fica Tostadores. El usuario administrador
          es responsable de mantener la confidencialidad de su cuenta Google y de
          toda actividad realizada bajo su sesión.
        </p>
        <p>
          Podemos suspender o revocar accesos ante uso indebido, incumplimiento
          de estos términos o por razones de seguridad.
        </p>
      </LegalSection>

      <LegalSection title="8. Enlaces a terceros">
        <p>
          El sitio puede contener enlaces a WhatsApp, redes sociales, Google u
          otros servicios externos. Fica Tostadores no controla ni es responsable
          del contenido, políticas o prácticas de sitios de terceros. El acceso a
          ellos es bajo su propia responsabilidad.
        </p>
      </LegalSection>

      <LegalSection title="9. Disponibilidad y modificaciones">
        <p>
          Procuramos mantener el sitio disponible y actualizado, pero{" "}
          <strong className="text-orange">
            no garantizamos operación ininterrumpida ni libre de errores
          </strong>
          . Podemos
          modificar, suspender o discontinuar funciones, contenidos o el sitio
          completo, temporal o permanentemente, con o sin aviso previo.
        </p>
      </LegalSection>

      <LegalSection title="10. Limitación de responsabilidad">
        <p>
          En la medida permitida por la ley chilena, Fica Tostadores{" "}
          <strong className="text-orange">no será responsable</strong> por daños
          indirectos, lucro cesante, pérdida de datos o
          perjuicios derivados del uso o imposibilidad de uso del sitio, de
          enlaces externos, de interrupciones del servicio o de decisiones
          tomadas exclusivamente con base en información publicada en línea sin
          confirmación comercial.
        </p>
        <p>
          <strong className="text-orange">
            Nada en estos términos limita derechos irrenunciables del consumidor
          </strong>{" "}
          cuando la normativa aplicable así lo exija en una relación contractual
          específica.
        </p>
      </LegalSection>

      <LegalSection title="11. Indemnidad">
        <p>
          El usuario indemnizará y mantendrá indemne a Fica Tostadores frente a
          reclamos, daños o gastos (incluidos honorarios legales razonables)
          derivados de su uso indebido del sitio o incumplimiento de estos
          términos.
        </p>
      </LegalSection>

      <LegalSection title="12. Ley aplicable y jurisdicción">
        <p>
          Estos términos se rigen por las leyes de la República de Chile.
          Cualquier controversia será sometida a los{" "}
          <strong className="text-orange">
            tribunales ordinarios de justicia de la ciudad de Temuco
          </strong>
          , salvo norma imperativa en contrario.
        </p>
      </LegalSection>

      <LegalSection title="13. Modificaciones de los términos">
        <p>
          Podemos actualizar estos Términos y Condiciones en cualquier momento.
          La versión vigente estará publicada en esta página con su fecha de
          actualización.{" "}
          <strong className="text-orange">
            El uso continuado del sitio después de un cambio implica la
            aceptación de la nueva versión
          </strong>
          .
        </p>
      </LegalSection>

      <LegalSection title="14. Contacto">
        <p>
          Para consultas sobre estos términos, escriba a{" "}
          <a
            href={`mailto:${companyInfo.emailVentas}`}
            className="text-orange hover:underline"
          >
            {companyInfo.emailVentas}
          </a>{" "}
          o visite nuestra página de{" "}
          <Link href="/contacto" className="text-orange hover:underline">
            contacto
          </Link>
          .
        </p>
      </LegalSection>
    </>
  );
}

export function PrivacidadLegalContent() {
  return (
    <>
      <LegalSection title="1. Responsable del tratamiento">
        <p>
          El responsable del tratamiento de sus datos personales es{" "}
          <strong className="text-orange">{companyInfo.legalName}</strong>{" "}
          (en adelante, &quot;Fica Tostadores&quot; o &quot;nosotros&quot;), con
          domicilio en {companyInfo.address}.
        </p>
        <p>
          Para consultas sobre privacidad puede escribir a{" "}
          <a
            href={`mailto:${companyInfo.emailVentas}`}
            className="text-orange hover:underline"
          >
            {companyInfo.emailVentas}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="2. Ámbito de aplicación">
        <p>
          Esta política aplica al sitio web de Fica Tostadores (incluidas sus
          versiones en dominios propios y en plataformas de alojamiento como
          Vercel), al formulario de contacto/cotización, al inicio de sesión con
          Google para usuarios autorizados y a las interacciones relacionadas con
          nuestro catálogo de productos.
        </p>
      </LegalSection>

      <LegalSection title="3. Datos que recopilamos">
        <p>
          Según cómo utilice el sitio, podemos tratar las siguientes categorías
          de datos:
        </p>
        <LegalList
          items={[
            "Datos de contacto y cotización: nombre o razón social, tipo de cliente (particular o empresa), correo electrónico, número de teléfono/WhatsApp, RUT (opcional), dirección de despacho o entrega (calle, comuna, región y referencias), mensaje y productos seleccionados que usted ingresa en el formulario de contacto, almacenados en nuestra base de datos en la nube para que el equipo comercial pueda atender su solicitud.",
            "Datos de navegación y uso: dirección IP, tipo de navegador, páginas visitadas, fecha y hora de acceso, y datos técnicos similares recopilados por nuestros proveedores de hosting y seguridad.",
            "Datos de selección de productos: identificador, nombre y capacidad de productos que usted agrega a su lista de cotización, almacenados localmente en su navegador (localStorage) hasta que los elimine o limpie el almacenamiento del sitio.",
            "Datos de autenticación (solo usuarios autorizados): si inicia sesión con Google para acceder al panel de administración, tratamos nombre, correo electrónico, identificador de usuario, foto de perfil (si la provee Google) y rol de acceso (`cliente`, `editor` o `admin`) asignado en nuestros sistemas.",
            "Imágenes y contenido comercial: fotografías y fichas técnicas de productos cargadas por personal autorizado de Fica Tostadores.",
          ]}
        />
      </LegalSection>

      <LegalSection title="4. Finalidades del tratamiento">
        <p>Utilizamos sus datos para las siguientes finalidades:</p>
        <LegalList
          items={[
            "Atender solicitudes de cotización e información comercial sobre maquinaria de tostado y procesamiento.",
            "Comunicarnos con usted por WhatsApp, correo electrónico o teléfono en relación con su consulta.",
            "Operar, mantener y mejorar el sitio web, el catálogo de productos y la experiencia de usuario.",
            "Gestionar el acceso al panel administrativo y verificar permisos de usuarios autorizados.",
            "Proteger el sitio frente a abusos, fraudes, ataques y usos no autorizados (incluida la aplicación de límites de solicitudes y validación de entradas).",
            "Cumplir obligaciones legales aplicables en Chile.",
          ]}
        />
      </LegalSection>

      <LegalSection title="5. Base legal">
        <p>
          El tratamiento se fundamenta, según corresponda, en su consentimiento
          (por ejemplo, al completar el formulario de contacto o iniciar sesión
          con Google), en la ejecución de medidas precontractuales a su solicitud
          (cotizaciones), en el interés legítimo de Fica Tostadores para operar y
          asegurar el sitio, y en el cumplimiento de obligaciones legales.
        </p>
        <p>
          Esta política se elabora considerando la normativa chilena aplicable,
          incluida la Ley N° 19.628 sobre Protección de la Vida Privada.
        </p>
      </LegalSection>

      <LegalSection title="6. Formulario de contacto y cotizaciones">
        <p>
          Al enviar el formulario de cotización, sus datos se registran de forma
          segura en nuestros sistemas (Firebase/Firestore) para que el equipo
          comercial pueda revisar la solicitud, preparar un presupuesto y
          contactarlo por teléfono, correo o WhatsApp.
        </p>
        <p>
          Si nos contacta directamente por correo, teléfono o WhatsApp,
          conservaremos la información necesaria para dar seguimiento comercial a
          su consulta.
        </p>
      </LegalSection>

      <LegalSection title="7. Cookies, almacenamiento local y analítica">
        <p>El sitio puede utilizar:</p>
        <LegalList
          items={[
            "localStorage del navegador para recordar los productos seleccionados en su cotización.",
            "Cookies y almacenamiento asociados a Firebase/Google para mantener sesiones de usuarios que inician sesión con Google.",
            "Cookies técnicas o de medición propias de los servicios de hosting (Vercel) y de proveedores integrados.",
            "Cookies de analítica de Google Analytics 4 (`_ga` y `_ga_*`), que se activan únicamente después de aceptar el aviso de términos y condiciones.",
          ]}
        />
        <p>
          <strong className="text-orange">Analítica web:</strong> utilizamos
          Google Analytics 4 (Google LLC) para entender de forma agregada cómo se
          usa el sitio: páginas visitadas, eventos de navegación, dispositivo,
          navegador y ubicación aproximada. La herramienta se carga solo cuando
          usted acepta el aviso de términos y condiciones; no la usamos para
          identificarle personalmente ni para publicidad personalizada. Puede
          impedir su carga con bloqueadores de contenido o restringiendo cookies y
          JavaScript en su navegador.
        </p>
        <p>
          Puede eliminar o bloquear cookies y datos locales desde la configuración
          de su navegador. Tenga en cuenta que algunas funciones (como mantener su
          lista de cotización o la sesión de administrador) podrían dejar de
          funcionar correctamente.
        </p>
      </LegalSection>

      <LegalSection title="8. Encargados y transferencias a terceros">
        <p>
          Para operar el sitio compartimos datos con proveedores que actúan como
          encargados del tratamiento o plataformas independientes, entre ellos:
        </p>
        <LegalList
          items={[
            "Google / Firebase: autenticación, base de datos de usuarios autorizados y servicios relacionados.",
            "Google Analytics 4: medición agregada de uso del sitio, activada solo tras aceptar el aviso de términos.",
            "Vercel: alojamiento del sitio web, almacenamiento de archivos (Vercel Blob) y medidas de seguridad en el edge.",
            "Meta / WhatsApp: cuando usted elige cotizar o comunicarse por esa vía.",
            "OpenStreetMap / Nominatim: autocompletado de direcciones y vista previa del mapa cuando usted ingresa su dirección de despacho o entrega.",
          ]}
        />
        <p>
          Algunos de estos proveedores pueden procesar datos fuera de Chile. En
          esos casos adoptamos medidas contractuales y técnicas razonables para
          proteger la información conforme a la normativa aplicable.
        </p>
      </LegalSection>

      <LegalSection title="9. Plazo de conservación">
        <p>
          Conservamos los datos el tiempo necesario para las finalidades
          indicadas: mientras dure una gestión comercial activa, mientras mantenga
          una cuenta de usuario autorizada, o durante los plazos exigidos por ley.
          Los datos en localStorage{" "}
          <strong className="text-orange">
            permanecen en su dispositivo hasta que usted los elimine
          </strong>
          .
        </p>
      </LegalSection>

      <LegalSection title="10. Seguridad">
        <p>
          Aplicamos medidas técnicas y organizativas razonables, como control de
          acceso al panel administrativo, validación de entradas, limitación de
          solicitudes, uso de conexiones cifradas (HTTPS) y almacenamiento en
          infraestructura de proveedores reconocidos.{" "}
          <strong className="text-orange">
            Ningún sistema es completamente infalible
          </strong>
          ; le recomendamos no compartir credenciales y
          mantener actualizado su navegador.
        </p>
      </LegalSection>

      <LegalSection title="11. Sus derechos">
        <p>
          <strong className="text-orange">
            Usted puede solicitar acceso, rectificación, cancelación u oposición
            al tratamiento de sus datos personales
          </strong>
          , cuando corresponda según la ley
          chilena, escribiendo a{" "}
          <a
            href={`mailto:${companyInfo.emailVentas}`}
            className="text-orange hover:underline"
          >
            {companyInfo.emailVentas}
          </a>
          . Responderemos dentro de plazos razonables y podremos solicitar
          información para verificar su identidad.
        </p>
        <p>
          Si considera que sus derechos no han sido respetados, puede recurrir
          ante la autoridad competente en Chile.
        </p>
      </LegalSection>

      <LegalSection title="12. Menores de edad">
        <p>
          El sitio está dirigido a personas con capacidad para contratar con fines
          comerciales o industriales.{" "}
          <strong className="text-orange">
            No solicitamos deliberadamente datos de menores de 14 años
          </strong>
          . Si detectamos datos de un menor recopilados sin
          autorización parental, procederemos a eliminarlos cuando sea posible.
        </p>
      </LegalSection>

      <LegalSection title="13. Cambios a esta política">
        <p>
          Podemos actualizar esta política para reflejar cambios legales,
          técnicos o en nuestros servicios. Publicaremos la versión vigente en
          esta página e indicaremos la fecha de última actualización. Le
          recomendamos revisarla periódicamente.
        </p>
      </LegalSection>
    </>
  );
}
