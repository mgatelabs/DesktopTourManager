# DesktopTourManager
Desktop app to create &amp; edit Mobile VR Station's *.tour files.

This is still under development, so things may not always work.

# Running

1. Install Node JS (https://nodejs.org/en/download/)
2. Download source code
3. From the source directory, run "npm install"
4. If the previous line worked, run "npm start" to run the project

# Releasing

## Windows

1. From the source directory, run "npm run prerelease"
1. From the app directory, run "npm run package-win"

## Mac

1. From the source directory, run "npm run prerelease"
2. From the app directory, run "npm run package-mac"
3. From the app directory, run "npm run package-mac2"
4. From the app directory, run "npm run package-mac3"

# Issues

## Build

1. This uses a image modification library to process images.  The process to install this module was messy and not fun.  The process on the mac was not painful at all, but I have all development tools installed.

# Tips

To change the mac icon, edit the images in ./build/icon.iconset.  From the build folder run the following command:
iconutil -c icns icon.iconset
