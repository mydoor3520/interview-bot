interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail(options: EmailOptions): Promise<void> {
  if (process.env.NODE_ENV === 'production' && process.env.EMAIL_API_KEY) {
    // TODO: Implement production email sending (Resend, SendGrid, etc.)
    console.log(`[EMAIL] Would send email to ${options.to}: ${options.subject}`);
    return;
  }

  // Development: log to console
  console.log('━'.repeat(60));
  console.log(`📧 Email to: ${options.to}`);
  console.log(`📋 Subject: ${options.subject}`);
  console.log('─'.repeat(60));
  console.log(options.html);
  console.log('━'.repeat(60));
}

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const verifyUrl = `${baseUrl}/verify-email?token=${token}`;

  await sendEmail({
    to: email,
    subject: '[Interview Bot] 이메일 인증',
    html: `
      <h2>이메일 인증</h2>
      <p>아래 링크를 클릭하여 이메일을 인증해주세요:</p>
      <a href="${verifyUrl}">${verifyUrl}</a>
      <p>이 링크는 24시간 동안 유효합니다.</p>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  await sendEmail({
    to: email,
    subject: '[Interview Bot] 비밀번호 재설정',
    html: `
      <h2>비밀번호 재설정</h2>
      <p>아래 링크를 클릭하여 비밀번호를 재설정해주세요:</p>
      <a href="${resetUrl}">${resetUrl}</a>
      <p>이 링크는 1시간 동안 유효합니다.</p>
      <p>비밀번호 재설정을 요청하지 않았다면 이 이메일을 무시해주세요.</p>
    `,
  });
}
