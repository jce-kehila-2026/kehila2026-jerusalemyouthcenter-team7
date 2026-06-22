// Phone-OTP verification via @react-native-firebase/auth, which handles
// app verification natively (Play Integrity on Android, silent push on iOS)
// instead of a reCAPTCHA challenge. This runs on its own native auth
// instance, fully separate from the firebase/auth (JS SDK) session used for
// login elsewhere in the app, so proving phone ownership during signup never
// touches a logged-in admin's session. The resulting session is signed out
// immediately after, see confirmOtp() below.
import { getApp } from "@react-native-firebase/app";
import {
  getAuth,
  signInWithPhoneNumber,
  signOut,
  type FirebaseAuthTypes,
} from "@react-native-firebase/auth";

export async function sendOtp(
  phoneNumber: string,
): Promise<FirebaseAuthTypes.ConfirmationResult> {
  // phoneNumber must be in E.164 format, e.g. "+972501234567"
  return signInWithPhoneNumber(getAuth(getApp()), phoneNumber);
}

export async function confirmOtp(
  confirmation: FirebaseAuthTypes.ConfirmationResult,
  code: string,
): Promise<boolean> {
  await confirmation.confirm(code);
  await signOut(getAuth(getApp()));
  return true;
}
