import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { sendAccountAccessEmail } from '@/lib/email/account-access';
import type { AppRole } from './profile';

export async function sendAccountCredentials({
  email,
  name,
  role,
  redirectTo,
  isRecovery,
}: {
  email: string;
  name: string;
  role: Extract<AppRole, 'parent' | 'teacher' | 'student'>;
  redirectTo: string;
  isRecovery: boolean;
}): Promise<{ error?: string }> {
  const directDelivery = process.env.SOULMAIS_EMAIL_DELIVERY_MODE === 'direct';
  if (!directDelivery && isRecovery) {
    const client = await createClient();
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
    return error ? { error: 'email_send_failed' } : {};
  }

  const admin = createAdminClient();
  if (directDelivery) {
    const generatedResult = isRecovery
      ? await admin.auth.admin.generateLink({ type: 'recovery', email, options: { redirectTo } })
      : await admin.auth.admin.generateLink({ type: 'invite', email, options: { data: { full_name: name }, redirectTo } });
    const { data, error } = generatedResult;
    if (error || !data.user || !data.properties?.action_link) {
      if (process.env.NODE_ENV === 'development') console.error('Account access link generation failed', error?.code);
      return { error: 'link_generation_failed' };
    }

    if (!isRecovery) {
      const { error: roleError } = await admin.auth.admin.updateUserById(data.user.id, {
        app_metadata: { ...data.user.app_metadata, role },
        user_metadata: { ...data.user.user_metadata, full_name: name },
      });
      if (roleError) {
        if (process.env.NODE_ENV === 'development') console.error('Account role provisioning failed', roleError.code);
        return { error: 'role_setup_failed' };
      }
    }

    try {
      await sendAccountAccessEmail({ email, name, actionLink: data.properties.action_link, isRecovery });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Account access email failed', error instanceof Error ? error.name : 'UnknownError');
      }
      return { error: 'email_send_failed' };
    }
    return {};
  }

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: name },
    redirectTo,
  });
  if (error || !data.user) {
    if (process.env.NODE_ENV === 'development') console.error('Account invitation failed', error?.code);
    return { error: error?.code === 'email_exists' ? 'account_exists' : 'email_send_failed' };
  }

  const { error: roleError } = await admin.auth.admin.updateUserById(data.user.id, {
    app_metadata: { ...data.user.app_metadata, role },
  });
  if (roleError) {
    if (process.env.NODE_ENV === 'development') console.error('Account role provisioning failed', roleError.code);
    return { error: 'role_setup_failed' };
  }
  return {};
}