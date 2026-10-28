# UPPLIN workspace scope

For web tasks, preserve `android/`, `ios/` and every `capacitor.config.*` file. Do not run `cap sync`, native project generation, native builds or change application identifiers as part of web deployment.

The store applications use **com.despia.upplin** and are maintained by a separate native developer. Do not replace those identifiers with com.upplin.app. Native changes require an explicit native task; coordinate with the native development branch before integration.

Admin and organizer marketing are web-only surfaces. Preserve the native route guards that prevent access to them inside the Capacitor application.
