import { Stack } from "expo-router";

export const unstable_settings = { initialRouteName: "compat" };

export default function OnboardingLayout() {
  return <Stack screenOptions={{ headerShown: false, gestureEnabled: false }} />;
}
