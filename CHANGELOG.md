# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-10-15

First public release.

### Added

- "Phone (Wi-Fi)" row on every site's Overview tab, with an on/off switch.
- HTTP bridge on the local network with a fixed port per site (site port 10058 → 8058).
- Address with Copy, Open and QR code buttons.
- Rewriting of the `.local` domain in HTML, CSS, JS, JSON, XML and SVG responses and in the
  `Location` and `Link` headers (plain, JSON-escaped and URL-encoded forms).
- Cookie adjustments so wp-admin login works over http on an IP address.
- The bridge closes when the site stops and reopens when the site or Local starts again.
- English and Portuguese interface, following the system language. The error page shown on the
  phone follows the phone's language.

[1.0.0]: https://github.com/LabWebGroup/local-addon-view-on-phone/releases/tag/v1.0.0
