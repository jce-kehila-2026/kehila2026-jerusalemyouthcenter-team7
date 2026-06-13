import { useAuth } from "@/src/context/AuthContext";
import EventsScreen from "@/src/screens/EventsScreen";
import EventStudentScreen from "@/src/screens/EventStudentScreen";

export default function EventsTab() {
  const { user } = useAuth();

  if (user?.role === "admin") {
    return <EventsScreen />;
  }

  return (
    <EventStudentScreen
      studentYear={user?.current_year_id ?? 1}
      studentName={user?.full_name ?? "Student"}
      isAdmin={false}
    />
  );
}
