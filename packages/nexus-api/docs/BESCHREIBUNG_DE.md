# Nexus Pro — Projektbeschreibung

## Über das Projekt

**Nexus Pro** ist ein vollständiges IT-Monitoring-Dashboard für den operativen Einsatz in IT-Infrastrukturumgebungen. Es bietet Echtzeitüberwachung von Servern, Diensten, Netzwerkschnittstellen und Systemlogs — mit einem professionellen Admin-Interface, wie es in echten IT-Betriebsumgebungen eingesetzt wird.

## Funktionsumfang

- Echtzeitüberwachung von CPU, RAM, Festplatte, Temperatur und Netzwerk
- Dienste-Monitoring mit Statusanzeige, Latenz und Verfügbarkeit (NGINX, PostgreSQL, Redis u.a.)
- Vorfallsverwaltung mit Schweregrad-Levels, Bestätigung und Auflösung
- Live-Logstream mit Filter nach Quelle und Schweregrad
- Host-Inventar mit Betriebssystem, IP, Rolle und SSL-Ablaufdatum
- Netzwerkübersicht mit Bandbreite, Latenz und Schnittstellenstatus
- Konfigurierbare Alarmgrenzen und Benachrichtigungseinstellungen
- WebSocket-basierte Echtzeit-Updates vom Backend
- Remote-Agent-Architektur für verteiltes Monitoring

## Technologien

| Schicht | Technologie |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Recharts |
| Backend | Node.js, Express, WebSocket (ws) |
| Metriken | systeminformation |
| Scheduling | node-cron |

## Relevanz

Das Projekt deckt zentrale Themen des IT-Betriebs ab:

- Systemadministration und Infrastrukturüberwachung
- Diensteverfügbarkeit und Fehleranalyse
- Netzwerktransparenz und Schnittstellenmanagement
- Incident-Management und Alarmierung
- Kapazitätsplanung und Ressourcenoptimierung
