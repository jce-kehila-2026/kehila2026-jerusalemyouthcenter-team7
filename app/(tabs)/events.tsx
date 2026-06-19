import { useAuth } from "@/src/context/AuthContext";
import EventsScreen from "@/src/screens/EventsScreen";
import EventStudentScreen from "@/src/screens/EventStudentScreen";
import { useRouter } from "expo-router";

export default function EventsTab() {
  const { user } = useAuth();
  const router = useRouter();

  if (user?.role === "admin") {
    return <EventsScreen />;
  }

  return (
    <EventStudentScreen
      studentYear={user?.current_year_id ?? 1}
      studentName={user?.full_name ?? "Student"}
      onEventPress={(event: any) =>
        router.push({
          pathname: "/event-detail",
          params: {
            eventId: event.id,
            title: event.title,
            description: event.description,
            date: event.date,
            time: event.time,
            location: event.location,
            group: event.groupLabel || event.group_name,
            studentName: user?.full_name ?? "Student",
            studentId: (user as any)?.uid ?? (user as any)?.id ?? "",
          },
        })
      }
    />
  );
}
