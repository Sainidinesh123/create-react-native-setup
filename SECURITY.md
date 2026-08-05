# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| 1.2.x   | Yes |
| < 1.2   | Best effort |

## Reporting a vulnerability

If you discover a security issue in **create-react-native-setup** (e.g. unsafe handling of paths, credential leakage into reports, or dependency RCE on install):

1. **Do not** open a public GitHub issue with exploit details.
2. Report privately via [GitHub Security Advisories](https://github.com/Sainidinesh123/create-react-native-setup/security/advisories/new) (preferred), or contact the repository owner.
3. Include the affected version, reproduction steps, and impact.

We aim to acknowledge reports within **7 days** and to ship a fix or mitigation as soon as practical.

## Scope notes

- This package is a **local CLI** that scaffolds React Native projects and may copy user-supplied Firebase config files into a new app.
- Never commit real `google-services.json` / `GoogleService-Info.plist` with production secrets into public examples.
- Third-party libraries installed into generated apps (Firebase, Notifee, BootSplash, etc.) have their own security policies.
