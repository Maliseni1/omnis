How to Build Omnis for Release

Prerequisites

Ensure all dependencies are installed:

cd apps/desktop
pnpm install


Building the App

To create a production-ready executable (AppImage/Deb), run:

pnpm dist


What this does:

Compiles the React code (Frontend) to dist/.

Compiles the Electron code (Backend) to dist-electron/.

Packages everything using electron-builder.

Output

You will find your installers in:
apps/desktop/release/0.1.0/

Omnis-0.1.0.AppImage: This is the portable executable. You can run it immediately (just enable "Execute" permissions).

Omnis_0.1.0_amd64.deb: This is the installer for Debian/Ubuntu.