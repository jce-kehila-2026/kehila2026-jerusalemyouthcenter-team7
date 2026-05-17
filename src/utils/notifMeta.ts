import { AppColors } from '@/constants/theme';
import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];
type NotifType = 'event' | 'message' | 'form' | 'general';

const META: Record<NotifType, { icon: IoniconsName; color: string }> = {
  event:   { icon: 'calendar',       color: AppColors.primary },
  form:    { icon: 'document-text',  color: AppColors.success },
  message: { icon: 'chatbubble',     color: AppColors.purple },
  general: { icon: 'notifications',  color: AppColors.warning },
};

export function notifIcon(type: NotifType): IoniconsName {
  return META[type]?.icon ?? 'notifications';
}

export function notifColor(type: NotifType): string {
  return META[type]?.color ?? AppColors.warning;
}
