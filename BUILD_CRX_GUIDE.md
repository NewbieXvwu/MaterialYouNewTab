# Build CRX Package Guide

## Overview

This project includes a GitHub Action workflow that allows you to build a CRX (Chrome Extension) package manually. The workflow creates both a CRX file and a ZIP file for easy distribution and installation.

## How to Trigger the Build

1. Navigate to your repository on GitHub
2. Click on the "Actions" tab
3. Select "Build CRX Package" from the workflows list
4. Click the "Run workflow" button
5. (Optional) Enter a version tag in the input field
6. Click the green "Run workflow" button to start the build

## What Gets Built

The workflow creates two artifacts:

1. **CRX Package** (`material-you-newtab-<version>.crx`)
   - A packaged Chrome extension file
   - Can be installed by dragging and dropping onto Chrome's extensions page
   - Includes a generated private key for signing

2. **ZIP Package** (`material-you-newtab-<version>.zip`)
   - A compressed folder containing all extension files
   - Suitable for manual installation via "Load unpacked"
   - Does not include the private key

## Installation Instructions

### Installing the CRX File

1. Download the CRX file from the workflow artifacts
2. Open your Chrome/Edge browser
3. Navigate to `chrome://extensions/` or `edge://extensions/`
4. Enable "Developer mode" (toggle in the top right)
5. Drag and drop the CRX file onto the extensions page
6. Confirm the installation

**Note**: Some browsers may show a warning about installing extensions from outside the Chrome Web Store. This is normal for developer builds.

### Installing the ZIP File (Unpacked)

1. Download and extract the ZIP file to a folder on your computer
2. Open your Chrome/Edge browser
3. Navigate to `chrome://extensions/` or `edge://extensions/`
4. Enable "Developer mode" (toggle in the top right)
5. Click "Load unpacked"
6. Select the extracted folder
7. The extension will be installed and activated

## Workflow Details

### Inputs
- **version** (optional): Custom version tag for the build
  - If not provided, uses the version from `manifest.json`

### Build Process

The workflow performs the following steps:

1. **Checkout**: Clones the repository
2. **Setup Node.js**: Installs Node.js v18
3. **Get Version**: Extracts version from `manifest.json`
4. **Install Dependencies**: Installs `crx3` package for building CRX files
5. **Copy Files**: Copies all necessary extension files to a build directory
6. **Generate Key**: Creates a private key for signing the CRX
7. **Build CRX**: Packages the extension as a CRX file
8. **Create ZIP**: Creates a ZIP archive of the extension files
9. **Upload Artifacts**: Uploads both CRX and ZIP files as artifacts

### Files Included

The following files and directories are included in the build:
- `docs/`
- `favicon/`
- `fonts/`
- `images/`
- `locales/`
- `scripts/`
- `svgs/`
- `tools/`
- `index.html`
- `manifest.json`
- `privacy-policy.html`
- `style.css`
- `LICENSE`
- `README.md`

### Artifacts Retention

- Artifacts are retained for 30 days
- After 30 days, they will be automatically deleted
- You can download them before the retention period expires

## Build Requirements

The workflow runs on Ubuntu and requires:
- Node.js 18
- npm package `crx3`
- OpenSSL (for key generation)

## Troubleshooting

### Build Fails
- Check the workflow logs in the Actions tab
- Ensure all required files are present in the repository
- Verify that `manifest.json` is valid JSON

### Cannot Install CRX
- Some browsers block CRX installation from unknown sources
- Use the ZIP file method as an alternative
- Check browser console for specific error messages

### Extension Not Working After Installation
- Verify that all files were included in the build
- Check the browser console for JavaScript errors
- Ensure the manifest version is correct for your browser

## Security Note

The private key generated during the build process is:
- Used only for signing the CRX file
- Not included in the ZIP package
- Generated fresh for each build
- Not stored or reused

For production releases, you should use a consistent private key to maintain the extension ID.

## Version Management

The extension version is automatically read from `manifest.json`:
```json
{
  "version": "3.2.4"
}
```

To release a new version:
1. Update the version in `manifest.json`
2. Commit the change
3. Run the workflow to build the new version

## Contributing

If you need to modify the build process:
1. Edit `.github/workflows/build-crx.yml`
2. Test changes on your fork
3. Submit a pull request with your improvements

## Additional Resources

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [CRX3 Package](https://www.npmjs.com/package/crx3)
- [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
