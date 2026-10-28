/* eslint-disable @typescript-eslint/no-require-imports */
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => {}),
  deleteItemAsync: jest.fn(async () => {}),
}));
jest.mock("expo-localization", () => ({
  getCalendars: () => [{ timeZone: "America/Bogota" }],
}));
jest.mock("@sentry/react-native", () => ({
  init: jest.fn(),
  setUser: jest.fn(),
  captureException: jest.fn(),
  wrap: (c: unknown) => c,
}));
jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => {}),
  getPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  getExpoPushTokenAsync: jest.fn(async () => ({ data: "ExponentPushToken[test]" })),
  scheduleNotificationAsync: jest.fn(async () => "id"),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {}),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  useLastNotificationResponse: jest.fn(() => null),
  AndroidImportance: { HIGH: 4 },
  SchedulableTriggerInputTypes: { DATE: "date" },
}));
jest.mock("expo-haptics", () => ({
  notificationAsync: jest.fn(async () => {}),
  NotificationFeedbackType: { Success: "success" },
}));
jest.mock("expo-device", () => ({ isDevice: true }));
jest.mock("@expo/vector-icons", () => {
  const { Text } = require("react-native");
  const React = require("react");
  return { Ionicons: ({ name }: { name: string }) => React.createElement(Text, null, name) };
});
