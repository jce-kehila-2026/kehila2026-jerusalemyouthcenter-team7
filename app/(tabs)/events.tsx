import { useRouter } from 'expo-router';
import EventsScreen from '@/src/screens/EventsScreen';

export default function Events() {
  const router = useRouter();
  return (
    <EventsScreen
      onEventPress={(event) => router.push({
        pathname: '/event-detail',
        params: { event: JSON.stringify(event) }
      })}
    />
  );
}
