import { supabase } from '../supabaseClient';

export type ActivityEventType = 'login' | 'exercise_analysis';

export interface LogActivityParams {
  eventType: ActivityEventType;
  exerciseAnalyzed?: string | null;
  aiResponse?: string | null;
  eventDatetime?: string;
}

function resolveUsername(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): string {
  const metaUsername =
    typeof user.user_metadata?.username === 'string' && user.user_metadata.username.trim()
      ? user.user_metadata.username.trim()
      : null;

  const metaFullName =
    typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name.trim()
      : null;

  if (metaUsername) return metaUsername;
  if (metaFullName) return metaFullName;
  if (user.email) return user.email.split('@')[0];
  return 'utente';
}

export async function logUserActivity({
  eventType,
  exerciseAnalyzed = null,
  aiResponse = null,
  eventDatetime = new Date().toISOString(),
}: LogActivityParams): Promise<void> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return;
    }

    const username = resolveUsername(user);

    const { error } = await supabase.from('activity_logs').insert({
      user_id: user.id,
      username,
      event_datetime: eventDatetime,
      event_type: eventType,
      exercise_analyzed: exerciseAnalyzed,
      ai_response: aiResponse,
    });

    if (error) {
      console.error('Errore salvataggio log attività:', error.message);
    }
  } catch (err) {
    console.error('Errore imprevisto nel logger attività:', err);
  }
}