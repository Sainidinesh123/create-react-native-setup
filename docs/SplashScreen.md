# Splash screen

## Packages

| Id | Package / mode | Notes |
|----|----------------|-------|
| `bootsplash` | `react-native-bootsplash` | Recommended; CLI wires theme, Manifest, MainActivity, AppDelegate, JS hide |
| `splash-screen` | `react-native-splash-screen` | Classic alternative |
| `native` | Native assets only | No JS splash package |

## CLI

```bash
npx create-react-native-setup MyApp --yes \
  --splash ./brand/splash.png \
  --splash-package bootsplash
```

Interactive mode asks whether you want a splash, then package + path + background.

## BootSplash notes

- CLI ensures `BootTheme` exists and prefers parent `Theme.BootSplash`  
- Upgrade to **≥ 1.2.5** if you hit missing `BootTheme` or `EdgeToEdge` parent errors  

## Related

- [Icons.md](./Icons.md)
- [Troubleshooting.md](./Troubleshooting.md)
