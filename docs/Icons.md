# App icons

## Overview

Pass one source image; the CLI generates Android launcher mipmaps and iOS `AppIcon.appiconset` assets using `sharp`.

## CLI

```bash
npx create-react-native-setup MyApp --yes --icon ./brand/icon.png
```

Interactive mode asks: **Set a custom app icon?** then the path.

## Tips

- Prefer a square **PNG** with transparent or solid background  
- High resolution (e.g. 1024×1024) yields cleaner downscales  
- After generation, verify in Android Studio / Xcode if you customize further  

## Related

- [SplashScreen.md](./SplashScreen.md)
- [Configuration.md](./Configuration.md)
