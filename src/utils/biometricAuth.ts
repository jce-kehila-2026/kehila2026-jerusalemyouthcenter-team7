import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import type { UserRole } from "@/src/context/AuthContext";

const CREDENTIAL_KEY = "biometric_credentials";
export const ENROLLMENT_FLAG_KEY = "biometric_enrolled";

export async function isBiometricAvailable(): Promise<boolean> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return false;
    return await LocalAuthentication.isEnrolledAsync();
  } catch {
    return false;
  }
}

export async function getBiometricType(): Promise<
  "face" | "fingerprint" | "none"
> {
  try {
    const types =
      await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (
      types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
    )
      return "face";
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT))
      return "fingerprint";
  } catch {
    // fall through
  }
  return "none";
}

// Verify identity with the OS biometric prompt. Returns true on success.
export async function authenticateWithBiometrics(
  promptMessage: string,
): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel: "Use Password",
      disableDeviceFallback: false,
    });
    return result.success;
  } catch {
    return false;
  }
}

// Store credentials in SecureStore (AES-encrypted on-device, no biometric gate
// on the storage itself — biometric verification is done separately via
// authenticateWithBiometrics before calling load/save).
export async function saveCredentials(
  identifier: string,
  password: string,
  role: UserRole,
): Promise<void> {
  await SecureStore.setItemAsync(
    CREDENTIAL_KEY,
    JSON.stringify({ identifier, password, role }),
  );
}

export async function loadCredentials(): Promise<{
  identifier: string;
  password: string;
  role: UserRole;
} | null> {
  try {
    const raw = await SecureStore.getItemAsync(CREDENTIAL_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function clearCredentials(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(CREDENTIAL_KEY);
  } catch {
    // ignore
  }
}
