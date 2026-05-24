# Changelog

All notable changes to Nexus Pro are documented here.

## [1.2.0] — 2026-05-22

### Added
- JWT authentication with role-based access (admin/viewer)
- Swagger UI at `/api/docs` for interactive API exploration
- Settings persistence — alert thresholds and preferences saved to disk
- Docker metrics collection via `systeminformation`

### Fixed
- WebSocket reconnection after network drop
- CPU history graph flickering on rapid updates
- Memory leak in rolling history buffer

## [1.1.0] — 2026-04-10

### Added
- Real-time alert engine with configurable thresholds
- AI diagnostics agent — explains anomalies in plain language
- Log streaming endpoint with WebSocket support
- Dark/light theme toggle

### Changed
- Migrated from polling to push-based WebSocket updates
- Reduced default metrics interval from 5s to 2s

## [1.0.0] — 2026-03-01

### Added
- Initial release — CPU, RAM, disk, and network monitoring
- Docker container status panel
- Real-time charts with 60-point rolling history
- Responsive dashboard layout
