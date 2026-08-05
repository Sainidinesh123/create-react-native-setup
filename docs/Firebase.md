# Firebase

## Overview

When Firebase-related options are selected, **create-react-native-setup** can:

1. Install compatible `@react-native-firebase/*` packages for your RN version  
2. Copy `google-services.json` (Android) and/or `GoogleService-Info.plist` (iOS)  
3. Wire Google Services Gradle plugin and iOS `FirebaseApp.configure()`  

## CLI flags

```bash
npx create-react-native-setup MyApp --yes \
  --google-services ./google-services.json \
  --google-service-info ./GoogleService-Info.plist
```

Interactive mode asks for these paths when Firebase / messaging is in play.

## Manual follow-ups

- Create the Firebase project and download real config files from the Firebase console  
- Enable the products you need (Auth, Firestore, Analytics, …)  
- For iOS push: configure APNs in Apple Developer + Firebase  

## Related

- [PushNotifications.md](./PushNotifications.md)
- [Troubleshooting.md](./Troubleshooting.md)
