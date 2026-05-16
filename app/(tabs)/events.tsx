import { useAuth } from "@/src/context/AuthContext";
import EventStudentScreen from "@/src/screens/EventStudentScreen";
import EventsScreen from "@/src/screens/EventsScreen";

export default function EventsTab() {
  const { user } = useAuth();

  if (user?.role === "admin") {
    return <EventsScreen />;
  }

  return (
    <EventStudentScreen
      studentYear={user?.year_id ?? 1}
      studentName={user?.full_name ?? "Student"}
      isAdmin={false}
    />
  );
}
