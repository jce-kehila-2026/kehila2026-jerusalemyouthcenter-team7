import { useRouter } from "expo-router";
import StudentCalendarScreen from "../../src/screens/Studentcalenderscreen";
export default function StudentCalendarPage() {
  const router = useRouter();
  return (
    <StudentCalendarScreen
      studentYear={1}
      studentName="Ali"
      onEventPress={(event) =>
        router.push({
          pathname: "/event-detail",
          params: { event: JSON.stringify(event) },
        })
      }
    />
  );
}
