# Changelog

All notable changes to the "THE MOST" Luxury Salon project.

## [Unreleased]

## [1.0.0] - 2026-02-06
### Added
- **Services Page Video Backgrounds**: Replaced static images with full-screen video backgrounds for Hair, Nails, Makeup, Facials, and Massage tabs.
- **New Lookbook Assets**: Generated and integrated 8+ high-quality AI portraits representing diverse Sri Lankan beauty (Men, Women, Teenagers).
- **Video Assets**: Migrated all video assets to `public/videos/` and mapped them correctly.

### Changed
- **Hero Section**:
    - Updated Headline to: "One Destination. Every Style. Every Generation."
    - Updated Feature Badge to: "⭐ Zero Waiting Time • Family Friendly • Premium Care"
- **Navigation**: Removed custom `HairCursor` to improve visibility and usability on the dark theme.
- **Styling**:
    - Fixed Z-Index layering on Services page to ensure readability over video backgrounds.
    - enhanced Tab styling with glassmorphism.

### Fixed
- Fixed missing `booking.mp4` reference by mapping `MOST client stories 2.mp4` to it.
- Fixed deployment build process for Cloudflare Pages.
