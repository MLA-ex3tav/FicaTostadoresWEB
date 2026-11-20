import { FieldValue, type Firestore } from "firebase-admin/firestore";
import nodemailer from "nodemailer";

const GMAIL_COLLECTION = "config";
const GMAIL_DOC = "gmail";

export interface GmailConfig {
  email: string;
  password: string;
}

/** Lee la configuración Gmail guardada en la nube (compartida entre apps). */
export async function obtenerGmailConfig(
  db: Firestore,
): Promise<GmailConfig | null> {
  const snapshot = await db.collection(GMAIL_COLLECTION).doc(GMAIL_DOC).get();
  const data = snapshot.data();

  if (!data) return null;

  const email = typeof data.email === "string" ? data.email.trim() : "";
  const password = typeof data.password === "string" ? data.password : "";

  if (!email || !password) return null;

  return { email, password };
}

/** Guarda la configuración Gmail en la nube (compartida entre apps). */
export async function guardarGmailConfig(
  db: Firestore,
  config: GmailConfig,
): Promise<void> {
  await db
    .collection(GMAIL_COLLECTION)
    .doc(GMAIL_DOC)
    .set(
      {
        email: config.email.trim(),
        password: config.password.trim().replace(/\s+/g, ""),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}

export interface EnviarCorreoOptions {
  to: string;
  subject: string;
  body: string;
  fileName?: string;
  fileBase64?: string;
}

/** Envía un correo vía SMTP Gmail con la configuración guardada. */
export async function enviarCorreoGmail(
  config: GmailConfig,
  options: EnviarCorreoOptions,
): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: config.email, pass: config.password },
  });

  const attachments =
    options.fileName && options.fileBase64
      ? [
          {
            filename: options.fileName,
            content: Buffer.from(options.fileBase64, "base64"),
          },
        ]
      : [];

  await transporter.sendMail({
    from: config.email,
    to: options.to,
    subject: options.subject,
    text: options.body,
    attachments,
  });
}
