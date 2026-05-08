import { useRouter } from "expo-router";
import EventsScreen from "../../src/screens/EventsScreen";

export default function HomeScreen() {
  const router = useRouter();
  return (
    <EventsScreen
      studentYear={1}
      onEventPress={(event) =>
        router.push({
          pathname: "/event-detail",
          params: { event: JSON.stringify(event) },
        })
      }
    />
  );
}
