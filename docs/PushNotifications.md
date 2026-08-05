# Push notifications

## Overview

Optional notification stacks:

| Option | Package | Role |
|--------|---------|------|
| `messaging` | `@react-native-firebase/messaging` | FCM |
| `notifee` | `@notifee/react-native` | Local / display notifications |
| `none` | — | Skip |

## CLI

```bash
npx create-react-native-setup MyApp --yes \
  --notifications messaging,notifee \
  --google-services ./google-services.json \
  --google-service-info ./GoogleService-Info.plist
```

Interactive mode offers a multi-select when notifications are available.

## What the CLI wires

- Permissions (e.g. Android `POST_NOTIFICATIONS`)  
- iOS background modes where applicable  
- A JS bootstrap helper under the generated app (see terminal report for exact path)  

## Manual follow-ups

- APNs keys / certificates for iOS  
- Firebase Cloud Messaging enabled in the console  
- Request notification permission at the right moment in your UX  

## Related

- [Firebase.md](./Firebase.md)
- [Examples.md](./Examples.md)
