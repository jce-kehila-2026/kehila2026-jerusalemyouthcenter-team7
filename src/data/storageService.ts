import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "../firebase/firebase";

export async function uploadToStorage(
  localUri: string,
  folder: "images" | "files" | "audio",
  fileName: string,
): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();
  const storageRef = ref(storage, `messages/${folder}/${Date.now()}_${fileName}`);
  await uploadBytes(storageRef, blob);
  return await getDownloadURL(storageRef);
}
