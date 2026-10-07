import 'server-only';

import nodemailer from 'nodemailer';

export async function sendAccountAccessEmail({
  email,
  name,
  actionLink,
  isRecovery,
}: {
  email: string;
  name?: string;
  actionLink: string;
  isRecovery: boolean;
}) {
  const user = process.env.SOULMAIS_SMTP_USER ?? 'soulmaisespacoalpha@gmail.com';
  const password = process.env.SOULMAIS_GMAIL_APP_PASSWORD;
  if (!password) throw new Error('Local Gmail SMTP password is not configured.');

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass: password },
    tls: { rejectUnauthorized: true },
  });

  try {
    await transporter.sendMail({
      from: { name: 'Soul+', address: user },
      to: email,
      subject: isRecovery ? 'Crie ou atualize sua senha do Soul+' : 'Convite para acessar o Soul+',
      text: [
        name ? `Olá, ${name}.` : 'Olá.',
        '',
        isRecovery
          ? 'Use o link abaixo para criar ou atualizar sua senha de acesso ao Soul+.'
          : 'Você recebeu um convite para acessar o Soul+. Use o link abaixo para criar sua senha.',
        '',
        actionLink,
        '',
        'Se você não esperava esta mensagem, ignore-a.',
      ].join('\n'),
    });
  } finally {
    transporter.close();
  }
}