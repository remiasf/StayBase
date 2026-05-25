# 🏙️ StayBase API

[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-2CA5E0?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Mapbox](https://img.shields.io/badge/Mapbox-000000?style=for-the-badge&logo=mapbox&logoColor=white)](https://www.mapbox.com/)
[![Azure](https://img.shields.io/badge/Microsoft_Azure-0089D6?style=for-the-badge&logo=microsoft-azure&logoColor=white)](https://azure.microsoft.com/)

A robust, production-ready REST API for an apartment rental platform. Built with **NestJS** and **TypeScript**, featuring advanced image processing, secure payments, and geospatial data integration.

🌍 **Live Production (Swagger):** [https://staybase.software](https://staybase.software/api#)

## ✨ Core Features
* **Advanced Media Handling:** Multi-file image uploads streamed directly from memory to Cloudinary, with strict validation limits (max 15 images/apartment).
* **Geospatial Integration:** Mapbox API integration for location-based services and mapping.
* **Secure Payments:** Integrated LiqPay processing with automated webhook callbacks.
* **Cloud Database:** Relational data managed via Prisma ORM and hosted securely on NeonDB (PostgreSQL).
* **Continuous Integration:** Automated CI/CD pipeline using GitHub Actions deploying directly to Microsoft Azure.

## 🛠️ Tech Stack
* **Framework:** NestJS, Node.js (v22), TypeScript
* **Database & ORM:** PostgreSQL (NeonDB), Prisma
* **Storage & Media:** Cloudinary, Multer (Memory Storage)
* **DevOps & Architecture:** GitHub Actions (CI/CD), Microsoft Azure, Docker & Docker Compose
* **Security:** JWT Authentication

---

## 🚀 Local Setup (Dockerized)

For local development and testing, the application is fully containerized. You don't need to install Node.js or PostgreSQL locally—just Docker.

### 1. Clone the repository
```bash
git clone https://github.com/remiasf/StayBase
cd staybase-api
