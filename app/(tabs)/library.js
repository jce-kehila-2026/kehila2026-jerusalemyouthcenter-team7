import { useLocalSearchParams } from "expo-router";
import LibraryScreen from "../../src/screens/LibaryScreen";

export default function Library() {
  const { action } = useLocalSearchParams();
  return <LibraryScreen autoUpload={action === "upload"} />;
}
