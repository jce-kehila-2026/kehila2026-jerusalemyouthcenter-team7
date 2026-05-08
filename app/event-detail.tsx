import { useLocalSearchParams } from "expo-router";
import EventDetailScreen from "../src/screens/EventDetailScreen";

export default function EventDetail() {
  const { event } = useLocalSearchParams();
  return <EventDetailScreen event={JSON.parse(event as string)} />;
}
