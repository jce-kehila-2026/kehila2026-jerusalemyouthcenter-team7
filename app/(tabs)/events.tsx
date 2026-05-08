import EventsScreen from "@/src/screens/EventsScreen";
import { useRouter } from "expo-router";

export default function Events() {
  const router = useRouter();

  return (
    <EventsScreen
      onEventPress={(event) =>
        router.push({
          pathname: "/event-detail",
          params: {
            title: event.title,
            description: event.description,
            date: event.date,
            location: event.location,
            group: event.group,
          },
        })
      }
    />
  );
}
