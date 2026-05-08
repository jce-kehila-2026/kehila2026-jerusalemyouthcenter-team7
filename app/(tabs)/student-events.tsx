import { useRouter } from "expo-router";
import EventStudentScreen from "../../src/screens/EventStudentScreen";

export default function StudentEventsPage() {
  const router = useRouter();

  return (
    <EventStudentScreen
      studentYear={1}
      studentName="Ameer"
      onEventPress={(event) =>
        router.push({
          pathname: "/event-detail",
          params: {
            event: JSON.stringify(event),
          },
        })
      }
    />
  );
}
